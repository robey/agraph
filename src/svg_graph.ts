import * as luxon from "luxon";
import { floorToPrecision, ceilToPrecision, toSI, ceilToCurrency } from "display-si";
import { range } from "./arrays";
import { Box, buildSvg, ClipPath, Line, Rect, Text, ToXml } from "./svg";
import { DAY, TimeBuddy, YEAR } from "./time";
import { TimeSeries } from "./time_series";
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

  // set a time zone? default is "local"
  timezone?: string;

  // aim for this many vertical grid lines
  yLines?: number;

  // thickness of line to use for drawing the data
  lineWidth?: number;

  // should the graph be a solid shape filled down?
  fill?: boolean;

  // font to use for axis labels and legend
  font?: string;
  fontSize?: number;

  // bigger font for the title
  titleFont?: string;
  titleFontSize?: number;
  titleFontWeight?: string;
  titleColor?: string;

  // for drawing the lines on
  graphBackgroundColor?: string;
  // primary and secondary colors for drawing grid lines
  gridColor?: string;
  gridColor2?: string;
  // color for x/y labels
  labelColor?: string;
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
  yLines: 5,
  lineWidth: 3,
  fill: false,
  font: "monospace",
  fontSize: 20,
  titleFont: "sans-serif",
  titleFontSize: 24,
  titleFontWeight: "bold",
  titleColor: "#660099",
  graphBackgroundColor: "#eeeeff",
  gridColor: "#555555",
  gridColor2: "#bbbbbb",
  labelColor: "#555555",
  legendColor: "#555555",
  colors: [ "red", "blue", "orange", "#3c3", "#c6c", "yellow" ],
  padding: 20,
  innerPadding: 10,
  legendPadding: 5,
};


export function buildSvgGraph(lines: TimeSeriesList, options: SvgGraphOptions = {}): string {
  return new SvgGraph(lines, options).draw();
}

export class SvgGraph {
  showLegend: boolean;
  pixelWidth: number;
  pixelHeight: number;
  viewWidth: number;
  viewHeight: number;
  yLineCount: number;
  lineWidth: number;
  fill: boolean;
  font: string;
  fontSize: number;
  titleFont: string;
  titleFontSize: number;
  titleFontWeight: string;
  titleColor: string;
  graphBackgroundColor: string;
  gridColor: string;
  gridColor2: string;
  labelColor: string;
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
    this.showLegend = this.options.showLegend ?? DEFAULT_OPTIONS.showLegend;
    const aspectRatio = this.options.aspectRatio ?? DEFAULT_OPTIONS.aspectRatio;
    this.pixelWidth = this.options.pixelWidth ?? DEFAULT_OPTIONS.pixelWidth;
    this.pixelHeight = Math.round(this.pixelWidth / aspectRatio);
    this.viewWidth = this.options.viewWidth ?? DEFAULT_OPTIONS.viewWidth;
    this.viewHeight = Math.round(this.viewWidth / aspectRatio);
    this.yLineCount = this.options.yLines ?? DEFAULT_OPTIONS.yLines;
    this.lineWidth = this.options.lineWidth ?? DEFAULT_OPTIONS.lineWidth;
    this.fill = this.options.fill ?? DEFAULT_OPTIONS.fill;
    this.font = this.options.font ?? DEFAULT_OPTIONS.font;
    this.fontSize = this.options.fontSize ?? DEFAULT_OPTIONS.fontSize;
    this.titleFont = this.options.titleFont ?? DEFAULT_OPTIONS.titleFont;
    this.titleFontSize = this.options.titleFontSize ?? DEFAULT_OPTIONS.titleFontSize;
    this.titleFontWeight = this.options.titleFontWeight ?? DEFAULT_OPTIONS.titleFontWeight;
    this.titleColor = this.options.titleColor ?? DEFAULT_OPTIONS.titleColor;
    this.graphBackgroundColor = this.options.graphBackgroundColor ?? DEFAULT_OPTIONS.graphBackgroundColor;
    this.gridColor = this.options.gridColor ?? DEFAULT_OPTIONS.gridColor;
    this.gridColor2 = this.options.gridColor2 ?? DEFAULT_OPTIONS.gridColor2;
    this.labelColor = this.options.labelColor ?? DEFAULT_OPTIONS.labelColor;
    this.legendColor = this.options.legendColor ?? DEFAULT_OPTIONS.legendColor;
    this.colors = this.options.colors ?? DEFAULT_OPTIONS.colors;
    this.padding = this.options.padding ?? DEFAULT_OPTIONS.padding;
    this.innerPadding = this.options.innerPadding ?? DEFAULT_OPTIONS.innerPadding;
    this.legendPadding = this.options.legendPadding ?? DEFAULT_OPTIONS.legendPadding;
    const scaleToZero = this.options.scaleToZero ?? DEFAULT_OPTIONS.scaleToZero;

    // find a good bounding box for the graph itself
    this.top = ceilToPrecision(this.lines.maxY * 1.1, 2);
    this.bottom = scaleToZero ? 0 : floorToPrecision(this.lines.minY, 2);
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

    const yLines = this.computeYLines();
    const xLines = this.computeXLines(graphBox);

    // ----- build the elements

    let elements: ToXml[] = [];
    elements.push(new Rect(graphBox, { stroke: this.gridColor, strokeWidth: 1, fill: this.graphBackgroundColor }));

    if (this.options.title !== undefined) {
      elements.push(this.drawTitle(titleBox, this.options.title));
    }

    elements = elements.concat(
      this.drawYLabels(yLines, yLabelBox),
      this.drawYLines(yLines, graphBox),
      this.drawXLabels(xLines, xLabelBox),
      this.drawXLines(xLines, graphBox),
    );

    this.lines.list.forEach((ts, i) => {
      const color = this.colors[i % this.colors.length];
      elements.push(this.drawTimeSeries(ts, graphBox, color));
      if (this.showLegend) {
        for (const elem of this.drawLegend(legendBox, i, ts.name, color, this.legendPadding)) {
          elements.push(elem);
        }
      }
    });

    // build the actual SVG
    return buildSvg(elements, {
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

  drawYLabels(lines: number[], box: Box): ToXml[] {
    // this is a hack because "dominant-baseline" doesn't work.
    const textOffset = Math.round(this.fontSize / 3);

    return lines.map(y => {
      const px = box.x + box.width;
      const py = this.yToPixel(y, box) + textOffset;
      const options = { fontFamily: this.font, fontSize: this.fontSize, fill: this.labelColor, textAnchor: "end" };
      return new Text({ x: px, y: py }, toSI(y), options);
    });
  }

  drawYLines(lines: number[], box: Box): ToXml[] {
    return lines.map(y => {
      const points = [
        { x: box.x, y: this.yToPixel(y, box) },
        { x: box.x + box.width, y: this.yToPixel(y, box) },
      ];
      return new Line(points, { stroke: this.gridColor, strokeWidth: 1, fill: "none" });
    });
  }

  drawXLabels(lines: number[], box: Box): ToXml[] {
    let scale = this.lines.interval >= YEAR ? 2 : (this.lines.interval >= DAY ? 1 : 0);
    const options = { fontFamily: this.font, fontSize: this.fontSize, fill: this.labelColor, textAnchor: "middle" };
    const margin = 2.5 * this.fontSize;

    return lines.filter(t => {
      const x = this.xToPixel(t, box);
      return x >= box.x + margin && x <= box.x + box.width - margin;
    }).map(x => {
      const px = this.xToPixel(x, box);
      const py = box.y + this.fontSize;
      const time = luxon.DateTime.fromSeconds(x, { zone: this.options.timezone });

      let label: string;
      switch (scale) {
        case 2:
          label = time.year.toString();
          break;
        case 1:
          label = `${time.month}/${zpad(time.day)}`;
          break;
        default:
          label = `${time.hour}:${zpad(time.minute)}`;
          break;
      }

      return new Text({ x: px, y: py }, label, options);
    });
  }

  drawXLines(lines: number[], box: Box): ToXml[] {
    return lines.map(x => {
      const points = [
        { x: this.xToPixel(x, box), y: box.y },
        { x: this.xToPixel(x, box), y: box.y + box.height },
      ];
      return new Line(points, { stroke: this.gridColor, strokeWidth: 1, fill: "none" });
    });
  }

  drawTimeSeries(ts: TimeSeries, box: Box, color: string): ToXml {
    const points = ts.toPoints().map(point => {
      return point.value == undefined ? undefined :
        { x: this.xToPixel(point.timestamp, box), y: this.yToPixel(point.value, box) };
    });
    let fill = "none";
    let closeLoop = false;
    if (this.fill) {
      points.unshift({ x: box.x, y: box.y + box.height });
      points.push({ x: box.x + box.width, y: box.y + box.height });
      fill = color;
      closeLoop = true;
    }
    const options = {
      stroke: color,
      strokeWidth: this.lineWidth,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      fill,
      fillOpacity: 0.5,
      closeLoop,
    };
    return new Line(points, options);
  }

  drawLegend(box: Box, index: number, name: string, color: string, spacing: number = 0): ToXml[] {
    // put the first half down the left column, then the second half down the right column.
    const leftColumn = Math.ceil(this.lines.list.length / 2);
    const y = box.y + (this.fontSize + spacing) * (index % leftColumn);
    const x = box.x + (box.width / 2) * Math.floor(index / leftColumn);
    const colorSize = 0.75 * this.fontSize;
    const colorBox = { x: x, y: y + this.fontSize - colorSize, width: colorSize, height: colorSize };
    const colorRect = new Rect(colorBox, { stroke: this.gridColor, strokeWidth: 1, fill: color });

    // the "y" appears to be the baseline, not an actually-useful coordinate.
    // so, assume the descender isn't more than 25% taller.
    // the clip box is really to keep it constrained horizontally.
    const textX = x + colorBox.width + this.innerPadding;
    const textY = y + this.fontSize;
    const textWidth = (box.width / 2) - this.innerPadding - this.padding - colorBox.width;
    const textHeight = this.fontSize * 1.25;
    const clip = new ClipPath(`clip${index}`, new Rect({ x: textX, y: y, width: textWidth, height: textHeight }))
    const text = new Text({ x: textX, y: textY }, name, {
      fontFamily: this.font, fontSize: this.fontSize, fill: this.legendColor, clipPath: `clip${index}`
    });

    return [ colorRect, text, clip ];
  }

  yToPixel(y: number, box: Box): number {
    const scale = 1 - ((y - this.bottom) / (this.top - this.bottom));
    return box.y + scale * box.height;
  }

  xToPixel(x: number, box: Box): number {
    return box.x + ((x - this.left) / (this.right - this.left)) * box.width;
  }

  computeYLines(): number[] {
    if (this.yLineCount == 0) return [];
    const interval = ceilToCurrency((this.top - this.bottom) / this.yLineCount);
    const yBase = floorToPrecision(this.bottom, 1);
    return [ this.bottom, this.top ].concat(
      range(0, this.yLineCount).map(i => yBase + (i + 1) * interval).filter(y => y > this.bottom && y < this.top)
    );
  }

  computeXLines(box: Box): number[] {
    // our labels are about 5 chars wide at most ("12:34", "05/17", "2019")
    // so 5x font size gives enough room for the label and good spacing, and
    // 1.25x font size is enough vertical room.
    const gap = 5 * this.fontSize;
    const count = Math.floor(box.width / gap);
    return new TimeBuddy(this.options.timezone).timeGranularityFor(this.left, this.right, count);
  }
}


function zpad(n: number): string {
  return ("00" + n.toString()).slice(-2);
}
