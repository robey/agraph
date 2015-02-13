let antsy = require("antsy");
let strftime = require("strftime");
let util = require("util");
let utils = require("./utils");
let _ = require("lodash");

let GridGraph = require("./grid_graph").GridGraph;

let DEFAULT_OPTIONS = {
  colors: [ "red", "blue", "orange", "#080", "#c6c", "yellow" ],
  backgroundColor: "335",
  graphBackgroundColor: "#000",
  backgroundHighlightColor: "333",
  gridColor: "555",
  labelColor: "077",
  titleColor: "c8f",
  showLegend: true
};

let X_MARGIN = 7;
let Y_MARGIN = 2;

// Paint a DataTable into an ansi canvas, with labels.
class AnsiGraph {
  constructor(dataTable, options = {}) {
    this.options = _.assign({}, DEFAULT_OPTIONS, options);
    let graphOptions = _.assign({}, this.options);
    graphOptions.width -= X_MARGIN;
    graphOptions.height -= Y_MARGIN;
    if (this.options.title) graphOptions.height -= 1;
    if (this.options.showLegend) graphOptions.height -= Math.ceil(Object.keys(dataTable.datasets).length / 2);
    this.graph = new GridGraph(dataTable, graphOptions);
  }

  draw() {
    this.graph.draw();
    let canvas = new antsy.Canvas(this.options.width, this.options.height);
    canvas.fillBackground(this.options.backgroundColor);

    // title?
    let yOffset = 0;
    if (this.options.title) {
      yOffset += 1;
      x = Math.round((X_MARGIN + this.options.width - this.options.title.length) / 2);
      canvas.color(this.options.titleColor).at(x, 0).write(this.options.title);
    }

    canvas.backgroundColor(this.options.graphBackgroundColor);
    _.range(this.graph.height).forEach((y) => {
      _.range(this.graph.width).forEach((x) => {
        canvas.at(x + X_MARGIN, y + yOffset).write(" ");
      });
    });

    this.computeYLabels();
    this.computeXLabels();
    this.drawGrid(canvas, yOffset);
    this.drawYLabels(canvas, yOffset);
    this.drawXLabels(canvas, yOffset);

    // draw the graph now.
    let names = this.graph.scaled.sortedNames();
    if (this.options.stacked) names = names.reverse();
    this.graph.map((x) => x ? this.options.colors[names.indexOf(x) % this.options.colors.length] : null);
    _.range(this.graph.height).forEach((y) => {
      _.range(this.graph.width).forEach((x) => {
        let color = this.graph.get(x, y);
        if (color) canvas.at(x + X_MARGIN, y + yOffset).backgroundColor(color).write(" ");
      });
    });

    // legend?
    if (this.options.showLegend) {
      let total = names.length;
      let leftColumn = Math.ceil(total / 2);
      names.forEach((name, i) => {
        let color = this.options.colors[names.indexOf(name) % this.options.colors.length];
        let x = Math.round(this.options.width / 2) * Math.floor(i / leftColumn) + 1;
        let y = this.graph.height + Y_MARGIN + yOffset + (i % leftColumn);
        let text = ` ${name}`.slice(0, Math.round(this.options.width / 2) - 4);
        canvas.at(x, y).backgroundColor(color).write(" ");
        canvas.color(this.options.labelColor).backgroundColor(this.options.backgroundColor).write(text);
      });
    }

    return canvas;
  }

  // ----- internals

  // draw labels along the Y axis.
  // build up a list of indices where we drew labels, so we can draw little highlight lines in the background.
  computeYLabels() {
    let yValues = this.graph.yValues();
    // top & bottom
    this.yLabels = [
      { y: this.graph.height - 1, label: utils.humanize(yValues[0]) },
      { y: 0, label: utils.humanize(yValues[yValues.length - 1]) }
    ];
    // show no more than height/3 or 10 labels, because it gets too cluttery.
    let count = Math.floor(Math.min(this.graph.height / 3, 10) - 1);
    if (count <= 0) return this.yLabels;

    let winner;
    if (count <= 3) {
      winner = { labels: this.computeYLabelIntermediates(count) };
    } else {
      // let's try to find the "most pleasing" set of labels.
      winner = _.range(3, count).map((i) => {
        let labels = this.computeYLabelIntermediates(i);
        let pleasingScore = labels.reduce((a, b) => a.pleasingScore + b.pleasingScore) / i;
        return { labels, pleasingScore };
      }).reduce((a, b) => a.pleasingScore > b.pleasingScore ? a : b);
    }
    this.yLabels = this.yLabels.concat(winner.labels);
    return this.yLabels;
  }

  computeYLabelIntermediates(count) {
    let interval = (this.graph.top - this.graph.bottom) / count;
    return _.range(1, count).map((i) => {
      let desired = this.graph.bottom + i * interval;
      let label = utils.humanize(desired);
      let pleasingScore = label.match(/^\s*/)[0].length;
      return { y: this.graph.height - this.graph.closestY(desired) - 1, label, pleasingScore };
    });
  }

  computeXLabels() {
    let dataTable = this.graph.scaled;
    let roundedTimes = dataTable.roundedTimes();
    this.xLabels = [];
    let format = dataTable.totalInterval > (2 * 24 * 60 * 60) ? "%d.%m" : "%H:%M"
    let x = 0;
    while (x < this.graph.width - 4) {
      let delta = roundedTimes[x];
      if (delta != null) {
        let date = new Date((dataTable.timestamps[x] + delta) * 1000);
        let label = strftime.strftime(format, date);
        this.xLabels.push({ x, label });
        x += label.length;
      }
      x += 1;
    }
    return this.xLabels;
  }

  drawYLabels(canvas, yOffset) {
    this.yLabels.forEach((label) => {
      canvas.backgroundColor(this.options.backgroundColor).color(this.options.labelColor);
      canvas.at(0, label.y + yOffset).write(label.label);
    });
  }

  drawXLabels(canvas, yOffset) {
    this.xLabels.forEach((label) => {
      canvas.backgroundColor(this.options.backgroundColor).color(this.options.labelColor);
      canvas.at(label.x + X_MARGIN - 2, this.graph.height + yOffset + 1).write(label.label);
    });
  }

  drawGrid(canvas, yOffset) {
    let xLines = {};
    let yLines = {};
    this.xLabels.forEach((label) => xLines[label.x] = true);
    this.yLabels.forEach((label) => yLines[label.y] = true);
    let font = {
      "|": "\u2502",
      "+": "\u253c",
      "-": "\u2500",
      upright: "\u2514",
      uprightdown: "\u251c",
      uprightleft: "\u2534"
    };

    canvas.backgroundColor(this.options.backgroundColor).color(this.options.gridColor);
    // left edge
    _.range(this.graph.height).forEach((y) => canvas.at(X_MARGIN - 1, y + yOffset).write(font["|"]));
    // bottom edge
    _.range(this.graph.width).forEach((x) => canvas.at(x + X_MARGIN, this.graph.height + yOffset).write(xLines[x] ? font.uprightleft : font["-"]));
    // lower left corner
    canvas.at(X_MARGIN - 1, this.graph.height + yOffset).write(font.upright);
    // horizontal highlight lines
    canvas.backgroundColor(this.options.backgroundHighlightColor);
    for (let y in yLines) {
      _.range(this.graph.width).forEach((x) => canvas.at(x + X_MARGIN, parseInt(y) + yOffset).write(" "));
    }
    for (let x in xLines) {
      _.range(this.graph.height).forEach((y) => {
        canvas.backgroundColor(yLines[y] ? this.options.backgroundHighlightColor : this.options.graphBackgroundColor);
        canvas.at(parseInt(x) + X_MARGIN, y + yOffset).write(font["|"]);
      });
    }
  }
}


exports.AnsiGraph = AnsiGraph;
