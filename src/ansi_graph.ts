import * as antsy from "antsy";
import { floorToPrecision, ceilToPrecision, toSI, ceilToCurrency } from "display-si";
import * as luxon from "luxon";

import { range } from "./arrays";
import { RGB, quantize4to2 } from "./rgb";
import { DEFAULT_COLORS } from "./themes";
import { DAY, defaultTimeLabel, TimeBuddy, TimeScale, YEAR } from "./time";
import { TimeSeries } from "./time_series";
import { TimeSeriesList } from "./time_series_list";

export enum AnsiGraphResolution {
  FULL,     // each pixel is one character cell
  HALF,     // each character cell holds two pixels, a top and bottom half, using unicode block drawing characters
  QUARTER,  // each character cell holds a 2x2 grid of pixels, using unicode block drawing characters
}

export interface AnsiGraphConfig {
  title?: string;

  // in case you don't want the background to be transparent
  backgroundColor: string;

  // add a legend of colors-to-metrics at the bottom?
  showLegend: boolean;

  // force the graph to start at y = 0? (recommended)
  scaleToZero: boolean;
  // set a max Y value too?
  maxY?: number;
  // display a label on the top/bottom of the graph?
  showTopYLabel: boolean;
  showBottomYLabel: boolean;

  // width & height of image, in cells:
  width: number;
  height: number;

  // set a time zone? default is "local"
  timezone?: string;

  // aim for this many vertical grid lines
  yLines: number;

  // should the graph be a solid shape filled down?
  fill: boolean;

  // customize the x-axis or y-axis labels? and how wide to allow for them?
  xAxisLabelFormat: (time: luxon.DateTime, scale: TimeScale) => string;
  yAxisLabelFormat: (n: number) => string;
  xAxisLabelWidth: number;
  yAxisLabelWidth: number;

  // for drawing the lines on
  graphBackgroundColor: string;
  // for drawing grid lines/borders
  gridColor: string;
  // color for the title at top, if present
  titleColor: string;
  // color for x/y labels
  labelColor: string;
  // color for legend text
  legendColor: string;
  // color for lines
  colors: string[];

  // how fancy do you want the ansi graphics?
  resolution: AnsiGraphResolution;

  // padding between major boxes, in characters
  padding: number;
  // extra space on either side of the image, in characters
  sideMargin: number;
}

const DEFAULTS: AnsiGraphConfig = {
  backgroundColor: "#335",
  showLegend: true,
  scaleToZero: true,
  showTopYLabel: true,
  showBottomYLabel: true,
  width: 78,
  height: 24,
  yLines: 5,
  fill: false,
  xAxisLabelFormat: defaultTimeLabel,
  yAxisLabelFormat: toSI,
  // our labels are about 5 chars wide at most ("12:34", "05/17", "2019")
  // so 7 gives room for a space on each side
  xAxisLabelWidth: 7,
  yAxisLabelWidth: 6,
  graphBackgroundColor: "#eeeeff",
  gridColor: "#555555",
  titleColor: "#660099",
  labelColor: "#555555",
  legendColor: "#555555",
  colors: DEFAULT_COLORS,
  resolution: AnsiGraphResolution.QUARTER,
  padding: 1,
  sideMargin: 1,
};

const CH_V = "\u2502";
const CH_H = "\u2500";
const CH_LB = "\u2514";
const CH_B = "\u2534";

// top, bottom
const CH_HALF = [ "\u2580", "\u2584" ];
// 16 possibilities for a 2x2, in order of UL UR LL LR
const CH_QUARTER = [
  " ", "\u2597", "\u2596", "\u2584", "\u259d", "\u2590", "\u259e", "\u259f",
  "\u2598", "\u259a", "\u258c", "\u2599", "\u2580", "\u259c", "\u259b", "\u2588",
];

export function buildAnsiGraph(lines: TimeSeriesList, options: Partial<AnsiGraphConfig> = {}): string {
  return new AnsiGraph(lines, options).draw();
}

export class AnsiGraph {
  config: AnsiGraphConfig;

  top: number;
  bottom: number;
  left: number;
  right: number;

  graphX: number;
  graphY: number;
  graphWidth: number;
  graphHeight: number;
  graphRight: number;
  graphBottom: number;

  constructor(public lines: TimeSeriesList, public options: Partial<AnsiGraphConfig> = {}) {
    this.config = Object.assign({}, DEFAULTS, options);

    // find a good bounding box for the graph itself
    this.top = this.options.maxY ?? ceilToPrecision(this.lines.maxY * 1.1, 2);
    this.bottom = this.config.scaleToZero ? 0 : floorToPrecision(this.lines.minY, 2);
    this.left = this.lines.minX;
    this.right = this.lines.maxX;

    /*
     * layout the boxes: the graph is in the center.
     *   - above it: the title
     *   - left of it: the Y axis labels
     *   - below it: the X axis labels, and optionally a legend
     */
    const legendLines = this.config.showLegend ? Math.ceil(this.lines.list.length / 2) : 0;
    this.graphX = this.config.yAxisLabelWidth + 1 + this.config.sideMargin;
    this.graphY = this.config.padding + (this.config.title !== undefined ? 1 : 0);
    this.graphWidth = this.config.width - this.graphX - this.config.sideMargin;
    this.graphHeight = this.config.height - legendLines - 2 /* x labels, line */ - this.graphY - this.config.padding;
    this.graphRight = this.graphX + this.graphWidth;
    this.graphBottom = this.graphY + this.graphHeight;
  }

  draw(): string {
    let canvas = new antsy.Canvas(this.config.width, this.config.height);
    const region = canvas.clip(0, 0, this.config.width, this.config.height);
    region.backgroundColor(this.config.backgroundColor).clear();

    const yLines = this.computeYLines();
    const xLines = this.computeXLines();

    if (this.config.title) {
      const x = Math.round((this.config.width - this.config.title.length) / 2);
      region.color(this.config.titleColor, this.config.backgroundColor).at(x, 0).write(this.config.title);
    }

    // border
    region.color(this.config.gridColor);
    for (const y of range(this.graphY, this.graphBottom)) region.at(this.graphX - 1, y).write(CH_V);
    for (const x of range(this.graphX, this.graphRight)) region.at(x, this.graphBottom).write(CH_H);
    region.at(this.graphX - 1, this.graphBottom).write(CH_LB);
    for (const x of xLines) region.at(this.graphX + this.xToCell(x), this.graphBottom).write(CH_B);

    // y,x labels
    region.color(this.config.labelColor);
    for (const y of yLines) {
      const label = lpad(this.config.yAxisLabelFormat(y), this.config.yAxisLabelWidth);
      region.at(this.config.sideMargin, this.graphY + this.yToCell(y)).write(label);
    }
    const xInterval = xLines[1] - xLines[0];
    let xScale = xInterval >= YEAR ? TimeScale.YEARS : (xInterval >= DAY ? TimeScale.DAYS : TimeScale.MINUTES);
    for (const x of xLines) {
      const time = luxon.DateTime.fromSeconds(x, { zone: this.options.timezone });
      let label = this.config.xAxisLabelFormat(time, xScale);
      const xCell = Math.max(0, this.graphX + this.xToCell(x) - Math.floor(label.length / 2));
      if (label.length > this.config.width - xCell) label = label.slice(0, this.config.width - xCell);
      region.at(xCell, this.graphY + this.graphHeight + 1).write(label);
    }

    // clear graph region, and vertical guidelines
    const graphRegion = canvas.clip(
      this.graphX,
      this.graphY,
      this.graphX + this.graphWidth,
      this.graphY + this.graphHeight
    );
    graphRegion.backgroundColor(this.config.graphBackgroundColor).clear();
    graphRegion.color(this.config.gridColor);
    for (const x of xLines) {
      for (const y of range(0, this.graphHeight)) graphRegion.at(this.xToCell(x), y).write(CH_V);
    }

    // graph lines
    const yMult = (this.config.resolution == AnsiGraphResolution.FULL) ? 1 : 2;
    const xMult = (this.config.resolution == AnsiGraphResolution.QUARTER) ? 2 : 1;
    const graphData = Array<RGB | undefined>(this.graphWidth * this.graphHeight * yMult * xMult);

    const leftColumn = Math.ceil(this.lines.list.length / 2);
    this.lines.list.forEach((ts, i) => {
      const color = this.config.colors[i % this.config.colors.length];
      this.drawTimeSeries(ts, color, graphData, this.graphWidth * xMult, this.graphHeight * yMult);

      if (this.config.showLegend) {
        let x = this.graphX + Math.round(this.graphWidth / 2) * Math.floor(i / leftColumn);
        let y = this.graphBottom + 2 + (i % leftColumn) + this.config.padding;
        const text = (" " + ts.name).slice(0, Math.round(this.graphWidth / 2) - 4);
        region.at(x, y).backgroundColor(color).write(" ");
        region.backgroundColor(this.config.backgroundColor).color(this.config.labelColor).write(text);
      }
    });

    switch (this.config.resolution) {
      case AnsiGraphResolution.FULL:
        this.render(graphRegion, graphData);
        break;
      case AnsiGraphResolution.HALF:
        this.render2x(graphRegion, graphData);
        break;
      case AnsiGraphResolution.QUARTER:
        this.render4x(graphRegion, graphData);
        break;
    }

    return canvas.paintInline();
  }

  computeYLines(): number[] {
    if (this.config.yLines == 0) return [];
    const interval = ceilToCurrency((this.top - this.bottom) / this.config.yLines);
    const yBase = floorToPrecision(this.bottom, 1);
    const lines: number[] = [];
    if (this.config.showBottomYLabel) lines.push(this.bottom);
    if (this.config.showTopYLabel) lines.push(this.top);
    return lines.concat(
      range(0, this.config.yLines).map(i => yBase + (i + 1) * interval).filter(y => y > this.bottom && y < this.top)
    );
  }

  computeXLines(): number[] {
    const count = Math.floor(this.graphWidth / this.config.xAxisLabelWidth);
    return new TimeBuddy(this.options.timezone).timeGranularityFor(this.left, this.right, count);
  }

  /*
   * "draw" the timeseries into a pixelated area of `width` by `height` cells.
   * returns two different `width * height` maps of the timeseries graph:
   *   - `widthPercent`: how much (0 - 1) of a cell's width contains the line?
   *   - `fillPercent`: how much (0 - 1) of a cell's volume falls below the
   *     line?
   */
  drawTimeSeries(ts: TimeSeries, color: string, graphData: (RGB | undefined)[], width: number, height: number) {
    const bg = RGB.named(this.config.graphBackgroundColor);
    const cVal = RGB.named(color);
    const cellData = ts.antialias(width, height, this.top, this.bottom, this.left, this.right);
    const alphas = this.config.fill ? cellData.fillPercent : cellData.widthPercent;

    for (const i of range(0, alphas.length)) {
      if (alphas[i] < 0.01) continue;
      const orig = graphData[i] ?? bg;
      graphData[i] = cVal.blend(orig, alphas[i]);
    }
  }

  render(graphRegion: antsy.Region, graphData: (RGB | undefined)[]) {
    for (const x of range(0, this.graphWidth)) {
      for (const y of range(0, this.graphHeight)) {
        const rgb = graphData[y * this.graphWidth + x];
        if (rgb === undefined) continue;
        graphRegion.at(x, y).backgroundColor(rgb.toAnsi()).write(" ");
      }
    }
  }

  // blit a double-height graph by using half-height blocks
  render2x(graphRegion: antsy.Region, graphData: (RGB | undefined)[]) {
    const bg = RGB.named(this.config.graphBackgroundColor);
    for (const x of range(0, this.graphWidth)) {
      for (const y of range(0, this.graphHeight)) {
        const rgb1 = graphData[y * 2 * this.graphWidth + x];
        const rgb2 = graphData[(y * 2 + 1) * this.graphWidth + x];
        if (rgb1 === undefined && rgb2 === undefined) continue;
        graphRegion.at(x, y).backgroundColor((rgb1 ?? bg).toAnsi()).color((rgb2 ?? bg).toAnsi()).write(CH_HALF[1]);
      }
    }
  }

  // blit a double-height graph by using half-height blocks
  render4x(graphRegion: antsy.Region, graphData: (RGB | undefined)[]) {
    const bg = RGB.named(this.config.graphBackgroundColor);
    const yStride = this.graphWidth * 4;
    for (const y of range(0, this.graphHeight)) {
      for (const x of range(0, this.graphWidth)) {
        const rgb1 = graphData[y * yStride + x * 2];
        const rgb2 = graphData[y * yStride + x * 2 + 1];
        const rgb3 = graphData[y * yStride + this.graphWidth * 2 + x * 2];
        const rgb4 = graphData[y * yStride + this.graphWidth * 2 + x * 2 + 1];
        if (rgb1 === undefined && rgb2 === undefined && rgb3 === undefined && rgb4 === undefined) continue;

        const pixel = [ rgb1 ?? bg, rgb2 ?? bg, rgb3 ?? bg, rgb4 ?? bg ];
        // special case: all 4 are the same color
        if (
          pixel[0].number() == pixel[1].number() &&
          pixel[0].number() == pixel[2].number() &&
          pixel[0].number() == pixel[3].number()
        ) {
          graphRegion.at(x, y).backgroundColor(pixel[0].toAnsi()).write(" ");
        } else {
          const pixelQ = quantize4to2(pixel);
          const colors = [...new Set(pixelQ)];
          const bits = pixelQ.map((c, i) => (c == colors[1] ? 1 : 0) << (3 - i)).reduce((a, b) => a | b, 0);
          graphRegion.at(x, y).backgroundColor(colors[0].toAnsi()).color(colors[1].toAnsi()).write(CH_QUARTER[bits]);
        }
      }
    }
  }

  yToCell(y: number): number {
    const scale = 1 - ((y - this.bottom) / (this.top - this.bottom));
    return Math.min(Math.floor(scale * this.graphHeight), this.graphHeight - 1);
  }

  xToCell(x: number): number {
    return Math.min(Math.floor(((x - this.left) / (this.right - this.left)) * this.graphWidth), this.graphWidth - 1);
  }
}


// web weenies need an entire module to do this
const S10 = "          ", S30 = [ S10, S10, S10 ].join(""), S120 = [ S30, S30, S30, S30 ].join("");
const lpad = (s: string, n: number) => (S120 + s).slice(-n);
