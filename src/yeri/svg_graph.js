let strftime = require("strftime");
let svg = require("./svg");
let util = require("util");
let utils = require("./utils");
let _ = require("lodash");

let PHI = (1 + Math.sqrt(5)) / 2;

let DEFAULT_OPTIONS = {
  colors: [ "red", "blue", "orange", "#3c3", "#c6c", "yellow" ],
  backgroundColor: "#f8f8ff",
  graphBackgroundColor: "#eef",
  gridColor: "#555",
  gridColor2: "#bbb",
  labelColor: "#555",
  titleColor: "#609",
  // width of image, in millimeters:
  viewWidth: 120,
  // width of image, in virtual pixels:
  pixelWidth: 800,
  // ratio of width to height (should be PHI or 16/9 or similar)
  aspectRatio: 16 / 9,
  // padding around svg content, in virtual pixels
  padding: 20,
  // padding between elements inside the svg
  innerPadding: 10,
  // thickness of line to use for drawing the data  
  lineWidth: 3,
  // should the graph be a solid shape filled down?
  fill: false,
  // should the Y axis be zero-based?
  scaleToZero: true,
  // font to use for labels, size (in virtual pixels), and baseline (vertical alignment)
  font: "Cousine",
  fontSize: 20,
  fontBaseline: 4,
  // font to use for the title
  titleFont: "Avenir Next",
  titleFontWeight: "bold",
  titleFontSize: 25,
  titleFontBaseline: 5,
  title: null,
  showLegend: true
};

class SvgGraph {
  constructor(dataTable, options = {}) {
    this.dataTable = dataTable;
    this.options = _.assign({}, DEFAULT_OPTIONS, options);
    this.width = options.width;
    this.height = options.height;
    if (!this.options.title) this.options.title = dataTable.sortedNames()[0];

    // calculate sizes of things:
    this.options.pixelHeight = Math.round(this.options.pixelWidth / this.options.aspectRatio);
    this.options.viewHeight = Math.round(this.options.viewWidth / this.options.aspectRatio);
    this.legendLines = Math.ceil(Object.keys(this.dataTable.datasets).length / 2);
    this.layout();

    // find a good bounding box for the graph itself
    this.top = this.options.top ? this.options.top : utils.roundToPrecision(this.dataTable.maximum(), 2, "ceil");
    this.bottom = this.options.bottom ? this.options.bottom : this.options.scaleToZero ? 0 : utils.roundToPrecision(this.dataTable.minimum(), 2, "floor");
    this.left = this.dataTable.timestamps[0];
    this.right = this.dataTable.timestamps[this.dataTable.last];

    // compute x/y guidelines
    this.yLines = this.computeYLines();
    [ this.xLines, this.xHelperLines ] = this.computeXLines();
  }

  layout() {
    // title at the top
    this.titleBox = {
      y: this.options.padding,
      height: this.options.titleFontSize
    };
    // y-axis labels need width for 6 characters.
    this.yLabelBox = {
      x: this.options.padding,
      y: this.titleBox.y + this.titleBox.height + this.options.padding,
      width: 4 * this.options.fontSize
    };
    // graph is right of y-axis labels, with padding on the right.
    this.graphBox = {
      x: this.yLabelBox.x + this.yLabelBox.width + this.options.innerPadding,
      y: this.yLabelBox.y
    };
    this.graphBox.width = this.options.pixelWidth - this.options.padding - this.graphBox.x;
    this.titleBox.x = this.graphBox.x;
    this.titleBox.width = this.graphBox.width;
    // legend is below the graph
    this.legendBox = {
      x: this.graphBox.x,
      width: this.graphBox.width,
      height: this.legendLines * this.options.fontSize + (this.options.innerPadding * (this.legendLines - 1))
    };
    this.legendBox.y = this.options.pixelHeight - this.options.padding - this.legendBox.height;
    if (!this.options.showLegend) this.legendBox.height = 0;
    // x-axis labels are above the legend box
    this.xLabelBox = {
      x: this.graphBox.x,
      width: this.graphBox.width,
      height: this.options.fontSize
    };
    this.xLabelBox.y = (this.options.showLegend ? this.legendBox.y : this.options.pixelHeight) - this.options.padding - this.xLabelBox.height;
    this.graphBox.height = this.xLabelBox.y - this.options.innerPadding - this.graphBox.y;
    this.yLabelBox.height = this.graphBox.height;
  }

  draw() {
    let content = [ this.drawTitleBox(), this.drawGraphBox(), new svg.Compound(this.drawYLabels()), new svg.Compound(this.drawXLabels()) ];
    let colorIndex = 0;
    let index = 0;
    this.dataTable.sortedNames().forEach((name) => {
      let dataset = this.dataTable.datasets[name];
      let color = this.options.colors[colorIndex];
      content.push(this.drawDataset(dataset, color));
      if (this.options.showLegend) content.push(this.drawLegend(index, name, color));
      colorIndex = (colorIndex + 1) % this.options.colors.length;
      index += 1;
    });
    return svg.build(this.options, content);
  }

  // ----- internals

  drawTitleBox() {
    let x = this.titleBox.x + (this.titleBox.width / 2);
    let y = this.titleBox.y + this.options.titleFontSize - this.options.titleFontBaseline;
    return new svg.Text(x, y, this.options.title, {
      fontFamily: this.options.titleFont,
      fontWeight: this.options.titleFontWeight,
      fontSize: this.options.titleFontSize,
      fill: this.options.titleColor,
      textAnchor: "middle"
    });
  }

  drawGraphBox() {
    let outline = new svg.Rect(this.graphBox, {
      stroke: this.options.gridColor,
      strokeWidth: 1,
      fill: this.options.graphBackgroundColor
    });
    let yLines = this.yLines.map((y) => {
      let points = [
        { x: this.graphBox.x, y: this.yToPixel(y) },
        { x: this.graphBox.x + this.graphBox.width, y: this.yToPixel(y) }
      ];
      return new svg.Line(points, { stroke: this.options.gridColor, strokeWidth: 1, fill: "none" });
    });
    let xLines = this.xLines.map((x) => {
      let points = [
        { x: this.xToPixel(x), y: this.graphBox.y },
        { x: this.xToPixel(x), y: this.graphBox.y + this.graphBox.height }
      ];
      return new svg.Line(points, { stroke: this.options.gridColor, strokeWidth: 1, fill: "none" });
    });
    let xHelperLines = this.xHelperLines.map((x) => {
      let points = [
        { x: this.xToPixel(x), y: this.graphBox.y },
        { x: this.xToPixel(x), y: this.graphBox.y + this.graphBox.height }
      ]
      return new svg.Line(points, { stroke: this.options.gridColor2, strokeWidth: 1, fill: "none" });
    });
    return new svg.Compound([ outline ].concat(yLines, xLines, xHelperLines));
  }

  drawYLabels() {
    let textOffset = Math.round(this.options.fontSize / 2) - this.options.fontBaseline;
    return this.yLines.map((y) => {
      let px = this.yLabelBox.x + this.yLabelBox.width;
      let py = this.yToPixel(y) + textOffset;
      return new svg.Text(px, py, utils.humanize(y), {
        fontFamily: this.options.font,
        fontSize: this.options.fontSize,
        fill: this.options.labelColor,
        textAnchor: "end"
      });
    });
  }

  drawXLabels() {
    let format = this.dataTable.totalInterval > (2 * 24 * 60 * 60) ? "%d.%m" : "%H:%M";
    let py = this.xLabelBox.y + this.options.fontSize - this.options.fontBaseline;
    return this.xLines.map((ts) => {
      let date = strftime.strftime(format, new Date(ts * 1000));
      return new svg.Text(this.xToPixel(ts), py, date, {
        fontFamily: this.options.font,
        fontSize: this.options.fontSize,
        fill: this.options.labelColor,
        textAnchor: "middle"
      });
    });
  }

  drawLegend(index, name, color) {
    let total = Object.keys(this.dataTable.datasets).length;
    let leftColumn = Math.ceil(total / 2);
    let y = this.legendBox.y + (this.options.fontSize + this.options.innerPadding) * (index % leftColumn);
    let x = this.legendBox.x + (this.legendBox.width / 2) * Math.floor(index / leftColumn);
    let colorBox = { x: x, y: y, width: this.options.fontSize, height: this.options.fontSize };
    let box = new svg.Rect(colorBox, { stroke: this.options.gridColor, strokeWidth: 1, fill: color });
    let textX = x + colorBox.width + this.options.innerPadding;
    let textY = y + this.options.fontSize - this.options.fontBaseline;
    let textWidth = (this.legendBox.width / 2) - this.options.innerPadding - this.options.padding - colorBox.width;
    let textHeight = this.options.fontSize;
    let text = new svg.Text(textX, textY, name, {
      fontFamily: this.options.font,
      fontSize: this.options.fontSize,
      fill: this.options.labelColor,
      clipPath: `cliptext${index}`
    });
    let clip = new svg.ClipPath(`cliptext${index}`, new svg.Rect({ x: textX, y: y, width: textWidth, height: textHeight }));
    return new svg.Compound([ box, text, clip ]);
  }

  drawDataset(dataset, color) {
    let points = _.range(0, dataset.length).map((i) => {
      return {
        x: this.xToPixel(this.dataTable.timestamps[i]),
        y: dataset[i] ? this.yToPixel(dataset[i]) : null
      };
    });
    let fillColor = "none";
    let closeLoop = false;
    if (this.options.fill) {
      points = [ { x: this.graphBox.x, y: this.graphBox.y + this.graphBox.height } ].concat(points);
      points.push({ x: this.graphBox.x + this.graphBox.width, y: this.graphBox.y + this.graphBox.height });
      fillColor = color;
      closeLoop = true;
    }
    return new svg.Line(points, {
      stroke: color,
      strokeWidth: this.options.lineWidth,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      fill: fillColor,
      closeLoop: closeLoop
    });
  }

  computeYLines() {
    let yInterval = utils.roundToCurrency((this.top - this.bottom) / 5);
    let yLines = [];
    let y = utils.roundToPrecision(this.bottom, 1, "floor");
    while (y <= this.bottom) y += yInterval;
    while (y < this.top) {
      yLines.push(y);
      y += yInterval;
    }
    yLines.push(this.top);
    yLines.push(this.bottom);
    return yLines;
  }

  computeXLines() {
    let roundedTimes = this.dataTable.roundedTimes();
    let labelWidth = 4 * this.options.fontSize;
    let rightEdge = this.graphBox.x + this.graphBox.width + (labelWidth / 1.5);
    let xLines = [];
    let helperLines = [];
    _.range(roundedTimes.length).reverse().forEach((i) => {
      let delta = roundedTimes[i];
      if (delta != null) {
        let ts = this.dataTable.timestamps[i] + delta;
        let px = this.xToPixel(ts);
        if (px > rightEdge - labelWidth) {
          helperLines.push(ts);
        } else {
          xLines.push(ts);
          rightEdge = px;
        }
      }
    });
    return [ xLines, helperLines ];
  }

  yToPixel(y) {
    let scale = 1 - ((y - this.bottom) / (this.top - this.bottom));
    return this.graphBox.y + scale * this.graphBox.height;
  }

  xToPixel(x) {
    return this.graphBox.x + ((x - this.left) / (this.right - this.left)) * this.graphBox.width;
  }
}


exports.PHI = PHI;
exports.SvgGraph = SvgGraph;
