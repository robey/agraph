
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
