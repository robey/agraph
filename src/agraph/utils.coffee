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
  number = roundToPrecision(number, 4)
  lpad(number.toString()[...5], 5) + HUMAN_LABELS[index]

roundToPrecision = (number, digits, function = "round") ->
  if number == 0 then return 0
  scale = digits - Math.floor(Math.log(number) / Math.log(10)) - 1
  Math[function](number * Math.pow(10, scale)) * Math.pow(10, -scale)

lpad = (s, n) ->
  if s.length >= n then return s
  lpad("          "[0 ... n - s.length] + s, n)


exports.humanize = humanize
exports.roundToPrecision = roundToPrecision
