strftime = require 'strftime'

HUMAN_LABELS = "afpnum KMGTPE"

MINUTES = 60
HOURS = 60 * MINUTES
DAYS = 24 * HOURS

drawYLabels = (canvas, x, yOffset, height, yValues) ->
  yLabels = yValues.map(humanize)
  lastIndex = -1
  lastLabel = ""
  for y in [0 ... height]
    label = yLabels[height - y - 1]
    if not (lastIndex == y - 1 or label == lastLabel)
      canvas.at(x, y + yOffset).write(label)
      lastIndex = y
      lastLabel = label

drawXLabels = (canvas, dataTable, xOffset, y, width) ->
  x = 0
  while x < width - 4
    label = roundedTime(dataTable.timestamps[x], dataTable.interval, dataTable.totalInterval)
    if label?
      leftEdge = x
      while roundedTime(dataTable.timestamps[x + 1], dataTable.interval, dataTable.totalInterval) == label
        x += 1
      rightEdge = x
      canvas.at(Math.round((rightEdge + leftEdge) / 2) + xOffset - 2, y).write(label)
      x += 6
    else
      x += 1

humanize = (number) ->
  index = HUMAN_LABELS.indexOf(" ")
  number = Math.abs(number)
  while number > 1000.0 and index < HUMAN_LABELS.length - 1
    number /= 1000.0
    index += 1
  while number < 1.0 and number != 0.0 and index > 0
    number *= 1000.0
    index -= 1
  precision = if number == 0 then 0 else 3 - Math.floor(Math.log(number) / Math.log(10))
  number = round_to_digits(number, precision)
  lpad(number.toString()[...5], 5) + HUMAN_LABELS[index]

round_to_digits = (number, digits) ->
  Math.pow(10, -digits) * Math.round(number * Math.pow(10, digits))

lpad = (s, n) ->
  if s.length >= n then return s
  lpad("          "[0 ... n - s.length] + s, n)

# for a given total interval, find a good granularity to round to.
granularity = (totalInterval) ->
  if totalInterval >= 24 * HOURS
    4 * HOURS
  else if totalInterval > 8 * HOURS
    1 * HOURS
  else if totalInterval > 2 * HOURS
    15 * MINUTES
  else if totalInterval > 30 * MINUTES
    5 * MINUTES
  else
    1 * MINUTES

# if the timestamp can be rounded to a nice rounded time, return it. otherwise, null.
roundedTime = (timestamp, interval, totalInterval) ->
  minTime = timestamp - (interval / 2)
  maxTime = timestamp + (interval / 2)
  g = granularity(totalInterval)
  lowTime = Math.round(timestamp / g) * g
  hiTime = lowTime + g
  ts = if lowTime >= minTime
    lowTime
  else if hiTime <= maxTime
    hiTime
  else
    null
  if not ts? then return null
  strftime.strftime((if totalInterval > 2 * DAYS then "%m/%d" else "%H:%M"), new Date(ts * 1000))


exports.drawYLabels = drawYLabels
exports.drawXLabels = drawXLabels
exports.humanize = humanize
exports.granularity = granularity
exports.roundedTime = roundedTime
