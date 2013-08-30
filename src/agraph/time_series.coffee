util = require 'util'

sort_ints = (list) ->
  list.map((n) -> parseInt(n)).sort((a, b) -> a - b)


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
      for p in points then @data[name][p.x] = p.y

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
  constructor: (@timestamps, @datasets) ->
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
    Math.min.apply(Math, (for name, dataset of @datasets then Math.min.apply(Math, dataset)))

  maximum: ->
    Math.max.apply(Math, (for name, dataset of @datasets then Math.max.apply(Math, dataset)))

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


DEFAULT_OPTIONS =
  width: 70
  height: 20
  scale_to_zero: false  # FIXME
  fill: true
  # for painting to canvas:
  colors: [ "red", "blue", "orange", "green", "purple", "cyan" ]
  backgroundColor: "555"
  legos: false
  xOffset: 7
  yOffset: 0

class GridGraph
  constructor: (@dataTable, options = {}) ->
    @options = {}
    for k, v of DEFAULT_OPTIONS then @options[k] = v
    for k, v of options then @options[k] = v
    @width = options.width
    @height = options.height
    # (y, x) containing the dataset name or null
    @grid = new Array(@width * @height)
    # force all elements to be there. js has weird "map" characteristics otherwise:
    for i in [0 ... @width * @height] then @grid[i] = null

  prepare: ->
    return if @scaled?
    @scaled = @dataTable.toDataPoints(@width)
    @bottom = if @options.scale_to_zero then 0 else @scaled.minimum()
    @top = @scaled.maximum()
    if @height > 8
      # leave a 1-unit gap at the top & bottom
      @interval = (@top - @bottom) / (@height - 3)
      @top += @interval
      @bottom -= @interval
    else
      @interval = (@top - @bottom) / (@height - 1)
    console.log "top=#{@top}, bottom=#{@bottom}, interval=#{@interval}"

  # run each grid element through a transformation function.
  map: (f) ->
    @grid = @grid.map(f)

  draw: ->
    @prepare()
    for name in @sortedNames()
      dataset = @scaled.datasets[name]
      console.log util.inspect(name)
      for x in [0 ... @width]
        y = Math.round((dataset[x] - @bottom) / @interval)
        console.log "x = #{x} / y = #{dataset[x]}, #{y}, #{y * @height + x}"
        @put(x, y, name)
        if @options.fill then for yy in [0 ... y] then @put(x, yy, name)

  put: (x, y, value) -> @grid[y * @width + x] = value

  # get uses y with 0 at the bottom left
  get: (x, y) -> @grid[(@height - y - 1) * @width + x]

  toString: ->
    lines = for y in [0 ... @height]
      (for x in [0 ... @width] then (if @get(x, y)? then "*" else "_")).join("")
    lines.join("\n") + "\n"

  sortedNames: ->
    # FIXME: do the ones with max values first, then so on.
    @prepare()
    Object.keys(@scaled.datasets).sort()


paintToCanvas = (canvas, dataTable, inOptions) ->
  options = {}
  for k, v of DEFAULT_OPTIONS then options[k] = v
  for k, v of inOptions then options[k] = v
  graph = new GridGraph(dataTable, options)
  graph.draw()
  names = graph.sortedNames()
  canvas.backgroundColor(options.backgroundColor)
  graph.map (x) -> if x? then options.colors[names.indexOf(x) % options.colors.length] else options.backgroundColor
  if options.legos or true
    for y in [0 ... graph.height] by 2 then for x in [0 ... graph.width]
      canvas.at(x + options.xOffset, (y / 2) + options.yOffset).color(graph.get(x, y + 1)).backgroundColor(graph.get(x, y)).write("\u2584")
  else
    for y in [0 ... graph.height] then for x in [0 ... graph.width]
      canvas.at(x + options.xOffset, y + options.yOffset).backgroundColor(graph.get(x, y)).write("\u2580")

exports.paintToCanvas = paintToCanvas

  

exports.DataCollection = DataCollection
exports.DataTable = DataTable
exports.GridGraph = GridGraph
