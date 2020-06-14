import { floorToPrecision, ceilToPrecision, roundToCurrency } from "display-si";
import { range } from "./arrays";
import { Box, buildSvg, ClipPath, Rect, Text, ToXml } from "./svg";
import { TimeSeriesList } from "./time_series_list";

export interface SvgGraphOptions {
  title?: string;

  // in case you don't want the background to be transparent
  backgroundColor?: string;

  // add a legend of colors-to-metrics at the bottom?
  showLegend?: boolean;

  // force the graph to start at y = 0? (recommended)
  scaleToZero?: boolean;

  // width of image, in millimeters:
  viewWidth?: number;
  // width of image, in virtual pixels:
  pixelWidth?: number;

  // ratio of width to height (should be PHI or 16/9 or similar)
  aspectRatio?: number;

  // font to use for axis labels and legend
  font?: string;
  fontSize?: number;

  // bigger font for the title
  titleFont?: string;
  titleFontSize?: number;
  titleFontWeight?: string;
  titleColor?: string;

  // primary and secondary colors for drawing grid lines
  gridColor?: string;
  gridColor2?: string;
  // color for legend text
  legendColor?: string;
  // color for lines
  colors?: string[];

  // padding around the outside edge and between major boxes, in pixels
  padding?: number;
  // padding between the labels and graph, in pixels
  innerPadding?: number;
  // extra spacing between lines in the legend
  legendPadding?: number;
}

const DEFAULT_OPTIONS = {
  showLegend: true,
  scaleToZero: true,
  viewWidth: 120,
  pixelWidth: 800,
  aspectRatio: 16 / 9,
  font: "monospace",
  fontSize: 20,
  titleFont: "sans-serif",
  titleFontSize: 24,
  titleFontWeight: "bold",
  titleColor: "#000000",
  gridColor: "#555555",
  gridColor2: "#bbbbbb",
  legendColor: "#555555",
  colors: [ "red", "blue", "orange", "#3c3", "#c6c", "yellow" ],
  padding: 20,
  innerPadding: 10,
  legendPadding: 5,
};


export class SvgGraph {
  showLegend: boolean;
  pixelWidth: number;
  pixelHeight: number;
  viewWidth: number;
  viewHeight: number;
  font: string;
  fontSize: number;
  titleFont: string;
  titleFontSize: number;
  titleFontWeight: string;
  titleColor: string;
  gridColor: string;
  gridColor2: string;
  legendColor: string;
  colors: string[];
  padding: number;
  innerPadding: number;
  legendPadding: number;

  top: number;
  bottom: number;
  left: number;
  right: number;

  constructor(public lines: TimeSeriesList, public options: SvgGraphOptions = {}) {
    this.options = Object.assign({}, this.options, DEFAULT_OPTIONS);

    this.showLegend = this.options.showLegend ?? DEFAULT_OPTIONS.showLegend;
    const aspectRatio = this.options.aspectRatio ?? DEFAULT_OPTIONS.aspectRatio;
    this.pixelWidth = this.options.pixelWidth ?? DEFAULT_OPTIONS.pixelWidth;
    this.pixelHeight = Math.round(this.pixelWidth / aspectRatio);
    this.viewWidth = this.options.viewWidth ?? DEFAULT_OPTIONS.viewWidth;
    this.viewHeight = Math.round(this.viewWidth / aspectRatio);
    this.font = this.options.font ?? DEFAULT_OPTIONS.font;
    this.fontSize = this.options.fontSize ?? DEFAULT_OPTIONS.fontSize;
    this.titleFont = this.options.titleFont ?? DEFAULT_OPTIONS.titleFont;
    this.titleFontSize = this.options.titleFontSize ?? DEFAULT_OPTIONS.titleFontSize;
    this.titleFontWeight = this.options.titleFontWeight ?? DEFAULT_OPTIONS.titleFontWeight;
    this.titleColor = this.options.titleColor ?? DEFAULT_OPTIONS.titleColor;
    this.gridColor = this.options.gridColor ?? DEFAULT_OPTIONS.gridColor;
    this.gridColor2 = this.options.gridColor2 ?? DEFAULT_OPTIONS.gridColor2;
    this.legendColor = this.options.legendColor ?? DEFAULT_OPTIONS.legendColor;
    this.colors = this.options.colors ?? DEFAULT_OPTIONS.colors;
    this.padding = this.options.padding ?? DEFAULT_OPTIONS.padding;
    this.innerPadding = this.options.innerPadding ?? DEFAULT_OPTIONS.innerPadding;
    this.legendPadding = this.options.legendPadding ?? DEFAULT_OPTIONS.legendPadding;

    // find a good bounding box for the graph itself
    this.top = ceilToPrecision(this.lines.maxY, 2);
    this.bottom = this.options.scaleToZero ? 0 : floorToPrecision(this.lines.minY, 2);
    this.left = this.lines.minX;
    this.right = this.lines.maxX;
  }

  draw(): string {
    /*
     * the graph is in the center
     *   - above it: the title
     *   - left of it: the Y axis labels
     *   - below it: the X axis labels, and optionally a legend
     * around everything is padding. the labels are only separated by "inner
     * padding".
     */
    const legendLines = Math.ceil(this.lines.list.length / 2);
    const titleHeight = 1.25 * this.titleFontSize;
    const yLabelWidth = 4 * this.fontSize;  // enough for 6 chars
    const xLabelHeight = 1.25 * this.fontSize;
    const legendHeight = (legendLines + 0.25) * this.fontSize + (legendLines - 1) * this.legendPadding;

    const graphX = this.padding + yLabelWidth + this.innerPadding;
    let graphY = this.padding;
    if (this.options.title !== undefined) graphY += titleHeight + this.innerPadding;
    const graphBox: Box = {
      x: graphX,
      y: graphY,
      width: this.pixelWidth - this.padding - graphX,
      height: this.pixelHeight - this.padding - xLabelHeight - this.innerPadding - graphY,
    };
    if (this.showLegend) graphBox.height -= this.padding + legendHeight;

    const titleBox: Box = { x: graphBox.x, y: this.padding, width: graphBox.width, height: titleHeight };
    const yLabelBox: Box = { x: this.padding, y: graphBox.y, width: yLabelWidth, height: graphBox.height };
    const xLabelBox: Box = {
      x: graphBox.x, y: graphBox.y + graphBox.height + this.innerPadding, width: graphBox.width, height: xLabelHeight
    };
    const legendBox: Box = {
      x: graphBox.x, y: this.pixelHeight - this.padding - legendHeight, width: graphBox.width, height: legendHeight
    };

    // ----- build the elements

    const elements: ToXml[] = [];

    if (this.options.title !== undefined) {
      elements.push(this.drawTitle(titleBox, this.options.title));
    }

    if (this.showLegend) {
      this.lines.list.forEach((ts, i) => {
        const color = this.colors[i % this.colors.length];
        for (const elem of this.drawLegend(legendBox, i, ts.name, color, this.legendPadding)) {
          elements.push(elem);
        }
      });
    }

    // build the actual SVG
    return buildSvg(([
      // new Rect(titleBox, { fill: "#00ffff" }),
      new Rect(yLabelBox, { fill: "#00ffff" }),
      new Rect(graphBox, { fill: "#0000ff" }),
      new Rect(xLabelBox, { fill: "#00ffff" }),
      new Rect(legendBox, { fill: "#00ff00" }),
    ] as ToXml[]).concat(elements), {
      viewWidth: this.viewWidth,
      viewHeight: this.viewHeight,
      pixelWidth: this.pixelWidth,
      pixelHeight: this.pixelHeight,
      backgroundColor: this.options.backgroundColor
    })
  }

  drawTitle(box: Box, title: string): ToXml {
    return new Text({ x: box.x + box.width / 2, y: box.y + this.fontSize }, title, {
      fontFamily: this.titleFont,
      fontSize: this.titleFontSize,
      fill: this.titleColor,
      fontWeight: this.titleFontWeight,
      textAnchor: "middle"
    });
  }

  drawLegend(box: Box, index: number, name: string, color: string, spacing: number = 0): ToXml[] {
    // put the first half down the left column, then the second half down the right column.
    const leftColumn = Math.ceil(this.lines.list.length / 2);
    const y = box.y + (this.fontSize + spacing) * (index % leftColumn);
    const x = box.x + (box.width / 2) * Math.floor(index / leftColumn);
    const colorSize = 0.75 * this.fontSize;
    const colorBox = { x: x, y: y + this.fontSize - colorSize, width: colorSize, height: colorSize };
    const colorRect = new Rect(colorBox, { stroke: this.gridColor, strokeWidth: 1, fill: color });

    const textX = x + colorBox.width + this.innerPadding;
    const textY = y + this.fontSize;
    const textWidth = (box.width / 2) - this.innerPadding - this.padding - colorBox.width;
    const textHeight = this.fontSize;
    const text = new Text({ x: textX, y: textY }, name, {
      fontFamily: this.font, fontSize: this.fontSize, fill: this.legendColor, clipPath: `clip${index}`
    });

    // the "y" appears to be the baseline, not an actually-useful coordinate.
    // so, assume the descender isn't more than 25% taller.
    const clip = new ClipPath(`clip${index}`, new Rect({ x: textX, y: y, width: textWidth, height: textHeight * 1.25 }))
    return [ colorRect, text, clip ];
  }

  computeYLines(count: number = 5) {
    const interval = roundToCurrency((this.top - this.bottom) / count);
    const yBase = floorToPrecision(this.bottom, 1);
    return [ this.bottom, this.top ].concat(
      range(0, count).map(i => yBase + (i + 1) * interval).filter(y => y > this.bottom && y < this.top)
    );
  }

  computeXLines() {
    // our labels are about 5 chars wide at most ("12:34", "05/17", "2019")
    // so 5x font size gives enough room for the label and good spacing, and
    // 1.25x font size is enough vertical room.

  }
  // computeXLines() {
  //   roundedTimes = @dataTable.roundedTimes()
  //   lastX = @xLabelBox.x - (3 * @options.fontSize)
  //   xLines = []
  //   helperLines = []
  //   for i in [0 ... roundedTimes.length]
  //     delta = roundedTimes[i]
  //     continue if not delta?
  //     ts = @dataTable.timestamps[i] + delta
  //     px = @xToPixel(ts)
  //     if px < lastX + (4 * @options.fontSize)
  //       helperLines.push ts
  //     else
  //       xLines.push ts
  //       lastX = px
  //   [ xLines, helperLines ]

}


// @width = options.width
// @height = options.height


// # compute x/y guidelines
// @yLines = @computeYLines()
// [ @xLines, @xHelperLines ] = @computeXLines()
