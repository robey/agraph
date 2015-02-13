let _ = require("lodash");

let HUMAN_LABELS = "afpnum KMGTPE";

function humanize(number) {
  let index = HUMAN_LABELS.indexOf(" ");
  let number = Math.abs(number);
  while (number > 1000.0 && index < HUMAN_LABELS.length - 1) {
    number /= 1000.0;
    index += 1;
  }
  while (number < 1.0 && number != 0.0 && index > 0) {
    number *= 1000.0;
    index -= 1;
  }
  number = roundToPrecision(number, 4).toString();

  let label = HUMAN_LABELS[index];
  let width = 5;
  if (label == " ") {
    label = "";
    width = 6;
  }
  if (number.indexOf(".") > 0) {
    // trickery to cope with javascript's "8.700000000000001"
    number = number.slice(0, width);
    while (number.length > 1 && number[number.length - 1] == "0") number = number.slice(0, number.length - 1);
  }
  return lpad(number.slice(0, width), width) + label;
}

function dehumanize(string) {
  if (string == null) return string;
  if (string.length == 0) return 0;
  let index = HUMAN_LABELS.indexOf(string[string.length - 1]);
  let zero = HUMAN_LABELS.indexOf(" ");
  if (index < 0) return parseFloat(string);
  return parseFloat(string) * Math.pow(1000, index - zero);
}

function roundToPrecision(number, digits, op = "round") {
  if (number == 0) return 0;
  let scale = digits - Math.floor(Math.log(number) / Math.log(10)) - 1;
  return Math[op](number * Math.pow(10, scale)) * Math.pow(10, -scale);
}

// find the closest (in a log-scale sense) currency-round number.
// currency rounded numbers follow the order: 1, 2, 5, 10, 20, ...
function roundToCurrency(number) {
  if (number == 0) return 0;
  let scale = Math.floor(Math.log(number) / Math.log(10));
  let flattened = Math.pow(10, -scale) * number;
  let closest = _.sortBy([ 1, 2, 5, 10 ], (n) => Math.abs(Math.log(n) - Math.log(flattened)))[0];
  return Math.pow(10, scale) * closest;
}

function lpad(s, n) {
  if (s.length >= n) return s;
  return lpad("          ".slice(0, n - s.length) + s, n);
}


exports.humanize = humanize;
exports.dehumanize = dehumanize;
exports.roundToPrecision = roundToPrecision;
exports.roundToCurrency = roundToCurrency;
