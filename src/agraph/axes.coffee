strftime = require 'strftime'

HUMAN_LABELS = "afpnum KMGTPE"

MINUTES = 60
HOURS = 60 * MINUTES
DAYS = 24 * HOURS

drawYLabels = (canvas, x, yOffset, height, yValues) ->
  yLabels = yValues.map(humanize)
  lastIndex = -1
  lastLabel = ""
  labelsAt = []
  for y in [0 ... height]
    label = yLabels[height - y - 1]
    if not (lastIndex == y - 1 or label == lastLabel)
      canvas.at(x, y + yOffset).write(label)
      lastIndex = y
      lastLabel = label
      labelsAt.push y
  labelsAt

drawXLabels = (canvas, dataTable, xOffset, y, width) ->
  x = 0
  roundedTimes = dataTable.roundedTimes()
  while x < width - 4
    delta = roundedTimes[x]
    if delta?
      date = new Date((dataTable.timestamps[x] + delta) * 1000)
      label = strftime.strftime((if dataTable.totalInterval > 2 * DAYS then "%m/%d" else "%H:%M"), date)
      canvas.at(x + xOffset - 2, y).write(label)
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


exports.drawYLabels = drawYLabels
exports.drawXLabels = drawXLabels
exports.humanize = humanize
