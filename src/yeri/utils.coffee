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
  number = roundToPrecision(number, 4).toString()
  label = HUMAN_LABELS[index]
  if label == " "
    label = ""
    width = 6
  else
    width = 5
  if number.indexOf(".") > 0
    # trickery to cope with javascript's "8.700000000000001"
    number = number[...width]
    while number.length > 1 and number[number.length - 1] == "0" then number = number[0 ... number.length - 1]
  lpad(number[...width], width) + label

dehumanize = (string) ->
  return null if not string?
  return 0 if string.length == 0
  index = HUMAN_LABELS.indexOf(string[string.length - 1])
  zero = HUMAN_LABELS.indexOf(" ")
  return parseFloat(string) if index < 0
  parseFloat(string) * Math.pow(1000, index - zero)

roundToPrecision = (number, digits, op = "round") ->
  if number == 0 then return 0
  scale = digits - Math.floor(Math.log(number) / Math.log(10)) - 1
  Math[op](number * Math.pow(10, scale)) * Math.pow(10, -scale)

# find the closest (in a log-scale sense) currency-round number.
# currency rounded numbers follow the order: 1, 2, 5, 10, 20, ...
roundToCurrency = (number) ->
  if number == 0 then return 0
  scale = Math.floor(Math.log(number) / Math.log(10))
  flattened = Math.pow(10, -scale) * number
  closest = maxByKey([ 1, 2, 5, 10 ], (n) -> 1 / Math.abs(Math.log(n) - Math.log(flattened)))
  Math.pow(10, scale) * closest

lpad = (s, n) ->
  if s.length >= n then return s
  lpad("          "[0 ... n - s.length] + s, n)

# given a set of keys, and a function for mapping a key to a value, find the
# key that maps to the maximum value.
maxByKey = (keys, f) ->
  max = null
  winner = null
  for key in keys
    v = f(key)
    if (not winner?) or (v > max)
      winner = key
      max = v
  winner


exports.humanize = humanize
exports.dehumanize = dehumanize
exports.roundToPrecision = roundToPrecision
exports.roundToCurrency = roundToCurrency
exports.maxByKey = maxByKey
