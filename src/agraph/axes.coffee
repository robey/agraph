strftime = require 'strftime'

HUMAN_LABELS = "afpnum KMGTPE"

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

exports.humanize = humanize



minutes = 60
hours = 60 * minutes

# for a given total interval, find a good granularity to round to.
workingGranularity = (totalInterval) ->
  if totalInterval >= 24 * hours
    4 * hours
  else if totalInterval > 8 * hours
    1 * hours
  else if totalInterval > 2 * hours
    15 * minutes
  else if totalInterval > 30 * minutes
    5 * minutes
  else
    1 * minutes

# if the timestamp can be rounded to a nice rounded time, return it. otherwise, null.
roundedTime = (timestamp, interval, totalInterval) ->
  minTime = timestamp - (interval / 2)
  maxTime = timestamp + (interval / 2)
  granularity = workingGranularity(totalInterval)
  lowTime = Math.round(timestamp / granularity) * granularity
  hiTime = lowTime + granularity
  ts = if lowTime >= minTime
    lowTime
  else if hiTime <= maxTime
    hiTime
  else
    null
  if not ts? then return null
  strftime.strftime((if totalInterval >= 48 * hours then "%m/%d" else "%H:%M"), new Date(ts * 1000))

exports.workingGranularity = workingGranularity
exports.roundedTime = roundedTime

