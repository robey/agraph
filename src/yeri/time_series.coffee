util = require 'util'

utils = require "./utils"

MINUTES = 60
HOURS = 60 * MINUTES
DAYS = 24 * HOURS

sort_ints = (list) ->
  list.map((n) -> parseInt(n)).sort((a, b) -> a - b)

# for a given total interval, find a good granularity to round timestamps to.
timeGranularityFor = (interval) ->
  if interval >= 24 * HOURS
    4 * HOURS
  else if interval > 8 * HOURS
    1 * HOURS
  else if interval > 2 * HOURS
    15 * MINUTES
  else if interval > 30 * MINUTES
    5 * MINUTES
  else
    1 * MINUTES


class DataCollection
  constructor: ->
    # name -> { timestamp: value }
    @data = {}

  # add data of the form [ [x, y]... ] or [ {x, y}... ]
  addPoints: (name, points) ->
    @data[name] or= {}
    if Object.prototype.toString.call(points[0]).match(/Array/)?
      for [ ts, y ] in points then @data[name][ts] = y
    else
      for p in points then @data[name][parseInt(p.x)] = parseInt(p.y)
    @

  # graphite: [ { target, datapoints: [ [ y, timestamp ], ... ] } ]
  loadFromGraphite: (data) ->
    for item in data then @addPoints(item.target, item.datapoints.map ([y, ts]) -> [ts, y])
    @

  # normalize all the intervals and fill in blanks ("undefined") for missing data.
  # end result should be a perfect rectangle of data.
  toTable: ->
    tset = {}
    for name, points of @data then for ts, v of points then tset[ts] = true
    timestamps = sort_ints(Object.keys(tset))
    if timestamps.length > 1
      # calculate smallest interval, and fill in gaps so all intervals are equal.
      deltas = [1 ... timestamps.length].map (i) -> timestamps[i] - timestamps[i - 1]
      interval = sort_ints(deltas)[0]
      i = 1
      while i < timestamps.length
        if timestamps[i] - timestamps[i - 1] > interval
          if timestamps[i] - timestamps[i - 1] > interval * 100 then throw new Error("Data points are too distant on the time scale")
          timestamps.push timestamps[i - 1] + interval
          timestamps = sort_ints(timestamps)
        else
          i += 1
    names = Object.keys(@data)
    datasets = {}
    for name in names then datasets[name] = []
    for ts in timestamps then for name in names then datasets[name].push @data[name][ts]
    new DataTable(timestamps, datasets)


class DataTable
  # timestamps is a sorted list of time values, at equal intervals.
  # datasets is { name -> [values...] }, where the values correspond 1-to-1 with the timestamps.
  constructor: (@timestamps, @datasets = {}) ->
    @last = @timestamps.length - 1
    @interval = @timestamps[1] - @timestamps[0]
    @totalInterval = @interval * @last

  # adjust our current timestamps into N new equally-spaced timestamps covering the same range. the new datasets will
  # be anchored on each end, but interpolated in the middle. if the datasets are being compressed by a factor of more
  # than 2, sets of points will be merged by average-area.
  # returns a new DataTable.
  toDataPoints: (n) ->
    new_interval = @totalInterval / (n - 1)
    new_timestamps = [0 ... n].map (i) => @timestamps[0] + new_interval * i
    if n * 2 <= @timestamps.length then return @toAveragedDataPoints(n, new_interval, new_timestamps)
    new_datasets = {}
    for name of @datasets
      new_datasets[name] = [ @datasets[name][0] ]
      for i in [1 ... n]
        new_datasets[name].push @interpolate(new_timestamps[i], @datasets[name])
    new DataTable(new_timestamps, new_datasets)

  toCsv: ->
    names = Object.keys(@datasets).sort()
    rv = [ "\# timestamp,#{names.join(',')}" ]
    for i in [0 ... @timestamps.length]
      rv.push "#{@timestamps[i]}," + names.map((name) => @datasets[name][i] or "null").join(",")
    rv.join("\n") + "\n"

  minimum: ->
    min(for name, dataset of @datasets then min(dataset.filter((n) -> n?)))

  maximum: ->
    max(for name, dataset of @datasets then max(dataset.filter((n) -> n?)))

  maximumStacked: ->
    max(for i in [0 ... @timestamps.length] then (for name, dataset of @datasets then dataset[i] or 0).reduce((a, b) -> a + b))

  # for each time interval, if it contains a timestamp that can be rounded to a "nice" granularity, return the amount
  # to add to the interval to make it nice. if it doesn't cover a good timestamp, return null.
  roundedTimes: ->
    @timestamps.map (ts) =>
      minTime = ts - (@interval / 2)
      maxTime = ts + (@interval / 2)
      g = timeGranularityFor(@totalInterval)
      lowTime = Math.floor(ts / g) * g
      hiTime = lowTime + g
      if lowTime >= minTime then lowTime - ts else (if hiTime <= maxTime then hiTime - ts else null)

  # list the dataset names in the order they should be drawn (with the highest-valued line first)
  sortedNames: ->
    names = []
    datasets = {}
    for k, v of @datasets then datasets[k] = v
    while Object.keys(datasets).length > 0
      # find the dataset that has the highest value most often.
      scores = {}
      for name of datasets then scores[name] = 0
      for i in [0 ... @timestamps.length]
        scores[utils.maxByKey(Object.keys(datasets), (name) -> datasets[name][i])] += 1
      winner = utils.maxByKey(Object.keys(scores), (name) -> scores[name])
      names.push winner
      delete datasets[winner]
    names

  toString: ->
    "<DataTable of #{@timestamps.length} [#{@timestamps[0]}..#{@timestamps[@last]}] #{Object.keys(@datasets).join(', ')}>"

  # ----- internals:

  # like interpolation, but if we are creating fewer points, we want to compute running averages.
  toAveragedDataPoints: (n, new_interval, new_timestamps) ->
    new_datasets = {}
    for name of @datasets
      new_datasets[name] = []
    for i in [0 ... n]
      # find left/right bounding timestamps, and the nearest existing data point on either side of each.
      constrain = (ts) => Math.min(Math.max(ts, @timestamps[0]), @timestamps[@last])
      ts_left = constrain(new_timestamps[i] - new_interval / 2)
      ts_right = constrain(new_timestamps[i] + new_interval / 2)
      [ left0, left1 ] = @fencepostsFor(ts_left)
      [ right0, right1 ] = @fencepostsFor(ts_right)
      for name, dataset of @datasets
        # first, interpolate Y as it would exist on the bounding timestamps.
        y_left = @interpolate(ts_left, dataset, left0, left1)
        y_right = @interpolate(ts_right, dataset, right0, right1)
        # sum the area under the points from y_left to y_right.
        # (another way to think of it: compute the weighted average of the points.)
        # first, the left and right edges:
        computeArea = (ts0, ts1, y0, y1) -> ((y0 or 0) + (y1 or 0)) / 2 * (ts1 - ts0)
        area = computeArea(ts_left, @timestamps[left1], y_left, dataset[left1]) +
          computeArea(@timestamps[right0], ts_right, dataset[right0], y_right)
        # then, all regular-width intervals in-between:
        any_exist = false
        for j in [left1 ... right0]
          if dataset[j]? or dataset[j + 1]? then any_exist = true
          area += computeArea(@timestamps[j], @timestamps[j + 1], dataset[j], dataset[j + 1])
        new_datasets[name].push(if any_exist then area / (ts_right - ts_left) else null)
    new DataTable(new_timestamps, new_datasets)

  # interpolate the data point for a new timestamp and an existing dataset
  interpolate: (ts, dataset, left = null, right = null) ->
    if not left? then [ left, right ] = @fencepostsFor(ts)
    if (not dataset[left]?) or (not dataset[right]?) then return null
    if left == right then return dataset[left]
    dataset[left] + (dataset[right] - dataset[left]) * (ts - @timestamps[left]) / @interval

  # figure out the left and right fenceposts for a timestamp
  fencepostsFor: (t) ->
    ratio = (t - @timestamps[0]) / @totalInterval
    left = Math.max(0, Math.min(@last, Math.floor(ratio * @last)))
    right = Math.max(0, Math.min(@last, Math.ceil(ratio * @last)))
    [ left, right ]


min = (a) -> Math.min.apply(Math, a)
max = (a) -> Math.max.apply(Math, a)

exports.DataCollection = DataCollection
exports.DataTable = DataTable
