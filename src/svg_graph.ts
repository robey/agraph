import { floorToPrecision, ceilToPrecision, toSI, ceilToCurrency } from "display-si";
import * as luxon from "luxon";

import { range } from "./arrays";
import { Box, buildSvg, Circle, ClipPath, Line, Rect, Text, ToXml } from "./svg";
import { LIGHT_THEME } from "./themes";
import { DAY, defaultTimeLabel, TimeBuddy, TimeScale, YEAR } from "./time";
import { TimeSeries } from "./time_series";
import { TimeSeriesList } from "./time_series_list";

export interface HighlightConfig {
  color: string;
  opacity: number;
  threshold: (timestamp: number, graph: SvgGraph) => boolean;
}

export interface SvgGraphConfig {
  title?: string;

  // in case you don't want the background to be transparent
  backgroundColor?: string;

  // add a legend of colors-to-metrics at the bottom?
  showLegend: boolean;

  // force the graph to start at y = 0? (recommended)
  scaleToZero: boolean;
  // set a max Y value too?
  maxY?: number;
  // display a label on the top/bottom of the graph?
  showTopYLabel: boolean;
  showBottomYLabel: boolean;

  // width of image, in millimeters:
  viewWidth: number;
  // width of image, in virtual pixels:
  pixelWidth: number;

  // ratio of width to height (should be PHI or 16/9 or similar)
  aspectRatio: number;
  // or, if you'd rather specify the pixel height directly:
  pixelHeight?: number;

  // set a time zone? default is "local"
  timezone?: string;

  // aim for this many vertical grid lines
  yLines: number;

  // thickness of line to use for drawing the data
  lineWidth: number;

  // when/if drawing highlights, how big should the dot be?
  dotWidth: number;

  // should the graph be a solid shape filled down?
  fill: boolean;

  // font to use for axis labels and legend
  font: string;
  fontSize: number;

  // bigger font for the title
  titleFont: string;
  titleFontSize: number;
  titleFontWeight: string;
  titleColor: string;

  // customize the x-axis or y-axis labels? and how wide (in points) to allow for them?
  xAxisLabelFormat: (time: luxon.DateTime, scale: TimeScale) => string;
  yAxisLabelFormat: (n: number) => string;
  xAxisLabelWidthPt: number;
  yAxisLabelWidthPt: number;

  highlights: HighlightConfig[];

  // for drawing the lines on
  graphBackgroundColor: string;
  // for drawing grid guide lines
  gridColor: string;
  // color for x/y labels
  labelColor: string;
  // color for legend text
  legendColor: string;
  // color for lines
  colors: string[];

  // padding around the outside edge and between major boxes, in pixels
  padding: number;
  // padding between the labels and graph, in pixels
  innerPadding: number;
  // extra spacing between lines in the legend
  legendPadding: number;
}

const DEFAULTS: SvgGraphConfig = Object.assign({}, LIGHT_THEME, {
  showLegend: true,
  scaleToZero: true,
  showTopYLabel: true,
  showBottomYLabel: true,
  viewWidth: 120,
  pixelWidth: 800,
  aspectRatio: 16 / 9,
  yLines: 5,
  lineWidth: 3,
  dotWidth: 8,
  fill: false,
  font: "monospace",
  fontSize: 20,
  titleFont: "sans-serif",
  titleFontSize: 24,
  titleFontWeight: "bold",
  xAxisLabelFormat: defaultTimeLabel,
  yAxisLabelFormat: toSI,
  xAxisLabelWidthPt: 5,  // gives a comfy padding to each side
  yAxisLabelWidthPt: 4,  // 4pt is usually enough for 6 chars
  highlights: [],
  graphBackgroundColor: "#eeeeff",
  padding: 20,
  innerPadding: 10,
  legendPadding: 5,
});

export interface GraphInstant {
  timestamp: number;
  xOffset: number;
  xPercent: number;
  values: (number | undefined)[];
}


export function buildSvgGraph(lines: TimeSeriesList, options: Partial<SvgGraphConfig> = {}): string {
  return new SvgGraph(lines, options).draw();
}

export class SvgGraph {
  config: SvgGraphConfig;
  pixelHeight: number;
  viewHeight: number;

  top: number;
  bottom: number;
  left: number;
  right: number;

  graphBox: Box;
  titleBox: Box;
  yLabelBox: Box;
  xLabelBox: Box;
  legendBox: Box;

  cachedSvg?: ToXml[];
  focus?: GraphInstant;

  constructor(public lines: TimeSeriesList, public options: Partial<SvgGraphConfig> = {}) {
    this.config = Object.assign({}, DEFAULTS, options);
    if (options.pixelHeight) {
      this.pixelHeight = options.pixelHeight;
      this.config.aspectRatio = this.config.pixelWidth / this.pixelHeight;
    } else {
      this.pixelHeight = Math.round(this.config.pixelWidth / this.config.aspectRatio);
    }
    this.viewHeight = Math.round(this.config.viewWidth / this.config.aspectRatio);

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
     * around everything is padding. the labels are only separated by "inner
     * padding".
     */
    const legendLines = Math.ceil(this.lines.list.length / 2);
    const titleHeight = 1.25 * this.config.titleFontSize;
    const yLabelWidth = this.config.yAxisLabelWidthPt * this.config.fontSize;  // enough for 6 chars
    const xLabelHeight = 1.25 * this.config.fontSize;
    const legendHeight = (legendLines + 0.25) * this.config.fontSize + (legendLines - 1) * this.config.legendPadding;

    const graphX = this.config.padding + yLabelWidth + this.config.innerPadding;
    let graphY = this.config.padding;
    if (this.options.title !== undefined) graphY += titleHeight + this.config.innerPadding;
    this.graphBox = {
      x: graphX,
      y: graphY,
      width: this.config.pixelWidth - this.config.padding - graphX,
      height: this.pixelHeight - this.config.padding - xLabelHeight - this.config.innerPadding - graphY,
    };
    if (this.config.showLegend) this.graphBox.height -= this.config.padding + legendHeight;

    this.titleBox = { x: this.graphBox.x, y: this.config.padding, width: this.graphBox.width, height: titleHeight };
    this.yLabelBox = { x: this.config.padding, y: this.graphBox.y, width: yLabelWidth, height: this.graphBox.height };
    this.xLabelBox = {
      x: this.graphBox.x,
      y: this.graphBox.y + this.graphBox.height + this.config.innerPadding,
      width: this.graphBox.width,
      height: xLabelHeight,
    };
    this.legendBox = {
      x: this.graphBox.x,
      y: this.pixelHeight - this.config.padding - legendHeight,
      width: this.graphBox.width,
      height: legendHeight,
    };
  }

  formatTimestamp(timestamp: number, format: string): string {
    return luxon.DateTime.fromSeconds(timestamp, { zone: this.config.timezone }).toFormat(format);
  }

  /*
   * return the borders of the actual graph within the SVG, as fractions of
   * the overall SVG size. all numbers will be between 0 and 1.
   */
  getMouseGraphBox(): Box {
    return {
      x: this.graphBox.x / this.config.pixelWidth,
      y: this.graphBox.y / this.pixelHeight,
      width: this.graphBox.width / this.config.pixelWidth,
      height: this.graphBox.height / this.pixelHeight
    };
  }

  /*
   * return highlight data for the closest time to the mouse cursor, if it's
   * inside the graph box.
   *
   * `xFrac` and `yFrac` are between [0, 1] and indicate the mouse's relative
   * position to the SVG's upper left corner. in a javascript mouse event,
   * this is usually:
   *
   *     const xFrac = e.offsetX / e.target.clientWidth;
   *     const yFrac = e.offsetY / e.target.clientHeight;
   *
   * but you can calculate your own offset if you have a more complicated
   * layout.
   */
  nearestToMouse(xFrac: number, yFrac: number): GraphInstant | undefined {
    const px = this.config.pixelWidth * xFrac, py = this.pixelHeight * yFrac;
    if (py < this.graphBox.y || py > this.graphBox.y + this.graphBox.height) return undefined;
    const t = this.pixelToX(px);
    if (t === undefined) return undefined;
    return this.nearestInstant(t);
  }

  /*
   * return highlight data for the closest time to the requested time, if
   * it's inside the range being drawn.
   */
  nearestInstant(seconds: number): GraphInstant | undefined {
    const timestamp = this.lines.list[0].getNearestTime(seconds);
    if (timestamp == undefined) return undefined;
    const xOffset = this.xToPixel(timestamp);
    const xPercent = (xOffset - this.graphBox.x) / this.graphBox.width;
    return { timestamp, xOffset, xPercent, values: this.lines.list.map(ts => ts.interpolate(timestamp)) };
  }

  setFocus(instant?: GraphInstant) {
    this.focus = instant;
  }

  draw(): string {
    if (this.cachedSvg === undefined) {
      const yLines = this.computeYLines();
      const xLines = this.computeXLines();

      // ----- build the elements

      let elements: ToXml[] = [];
      elements.push(new Rect(this.graphBox, {
        stroke: this.config.gridColor, strokeWidth: 1, fill: this.config.graphBackgroundColor
      }));
      // draw the graph lines inside a clip box, in case the mandated y-limits are insufficient for the data
      elements.push(new ClipPath("clip-graph-box", new Rect(this.graphBox)));

      if (this.options.title !== undefined) {
        elements.push(this.drawTitle(this.options.title));
      }

      for (const h of this.config.highlights) {
        elements.push(...this.drawHighlight(h));
      }

      elements.push(
        ...this.drawYLabels(yLines),
        ...this.drawYLines(yLines),
        ...this.drawXLabels(xLines),
        ...this.drawXLines(xLines),
      );

      this.lines.list.forEach((ts, i) => {
        const color = this.config.colors[i % this.config.colors.length];
        elements.push(this.drawTimeSeries(ts, color));
        if (this.config.showLegend) {
          for (const elem of this.drawLegend(this.legendBox, i, ts.name, color, this.config.legendPadding)) {
            elements.push(elem);
          }
        }
      });

      this.cachedSvg = elements;
    }

    // build the actual SVG
    return buildSvg(this.cachedSvg.concat(this.drawFocus()), {
      viewWidth: this.config.viewWidth,
      viewHeight: this.viewHeight,
      pixelWidth: this.config.pixelWidth,
      pixelHeight: this.pixelHeight,
      backgroundColor: this.options.backgroundColor
    })
  }

  drawTitle(title: string): ToXml {
    return new Text({
      x: this.titleBox.x + this.titleBox.width / 2, y: this.titleBox.y + this.config.fontSize
    }, title, {
      fontFamily: this.config.titleFont,
      fontSize: this.config.titleFontSize,
      fill: this.config.titleColor,
      fontWeight: this.config.titleFontWeight,
      textAnchor: "middle"
    });
  }

  drawYLabels(lines: number[]): ToXml[] {
    // this is a hack because "dominant-baseline" doesn't work.
    const textOffset = Math.round(this.config.fontSize / 3);

    return lines.map(y => {
      const px = this.yLabelBox.x + this.yLabelBox.width;
      const py = this.yToPixel(y) + textOffset;
      const options = {
        fontFamily: this.config.font, fontSize: this.config.fontSize, fill: this.config.labelColor, textAnchor: "end"
      };
      return new Text({ x: px, y: py }, this.config.yAxisLabelFormat(y), options);
    });
  }

  drawYLines(lines: number[]): ToXml[] {
    return lines.map(y => {
      const points = [
        { x: this.graphBox.x, y: this.yToPixel(y) },
        { x: this.graphBox.x + this.graphBox.width, y: this.yToPixel(y) },
      ];
      return new Line(points, { stroke: this.config.gridColor, strokeWidth: 1, fill: "none" });
    });
  }

  drawXLabels(lines: number[]): ToXml[] {
    const interval = lines[1] - lines[0];
    let scale = interval >= YEAR ? TimeScale.YEARS : (interval >= DAY ? TimeScale.DAYS : TimeScale.MINUTES);
    const options = {
      fontFamily: this.config.font, fontSize: this.config.fontSize, fill: this.config.labelColor, textAnchor: "middle"
    };
    const margin = this.config.xAxisLabelWidthPt * this.config.fontSize / 2;

    return lines.filter(t => {
      return this.config.showBottomYLabel ? (this.xToPixel(t) >= this.xLabelBox.x + margin) : true;
    }).map(x => {
      const px = this.xToPixel(x);
      const py = this.xLabelBox.y + this.config.fontSize;
      const time = luxon.DateTime.fromSeconds(x, { zone: this.options.timezone });
      return new Text({ x: px, y: py }, this.config.xAxisLabelFormat(time, scale), options);
    });
  }

  drawXLines(lines: number[]): ToXml[] {
    return lines.map(x => {
      const points = [
        { x: this.xToPixel(x), y: this.graphBox.y },
        { x: this.xToPixel(x), y: this.graphBox.y + this.graphBox.height },
      ];
      return new Line(points, { stroke: this.config.gridColor, strokeWidth: 1, fill: "none" });
    });
  }

  drawHighlight(h: HighlightConfig): ToXml[] {
    let left: number | undefined;
    let right = 0;
    const spans: [ number, number ][] = [];
    const rv: ToXml[] = [];

    for (let ts = this.lines.minX; ts <= this.lines.maxX; ts += this.lines.interval) {
      if (h.threshold(ts, this)) {
        left = left ?? Math.max(this.xToPixel(ts - this.lines.interval / 2), this.graphBox.x);
        right = Math.min(this.xToPixel(ts + this.lines.interval / 2), this.graphBox.x + this.graphBox.width);
      } else if (left !== undefined) {
        spans.push([ left, right ]);
        left = undefined;
      }
    }
    if (left !== undefined) spans.push([ left, right ]);

    // draw boxes
    return spans.map(([ left, right ]) => {
      return new Rect({
        x: left, y: this.graphBox.y, width: right - left, height: this.graphBox.height
      }, {
        fill: h.color,
        opacity: h.opacity,
      });
    });
  }

  drawTimeSeries(ts: TimeSeries, color: string): ToXml {
    const points = ts.toPoints().map(point => {
      return point.value == undefined ? undefined :
        { x: this.xToPixel(point.timestamp), y: this.yToPixel(point.value) };
    });
    let fill = "none";
    let closeLoop = false;
    if (this.config.fill) {
      points.unshift({ x: this.graphBox.x, y: this.graphBox.y + this.graphBox.height });
      points.push({ x: this.graphBox.x + this.graphBox.width, y: this.graphBox.y + this.graphBox.height });
      fill = color;
      closeLoop = true;
    }
    const options = {
      stroke: color,
      strokeWidth: this.config.lineWidth,
      strokeLineCap: "round",
      strokeLineJoin: "round",
      fill,
      fillOpacity: 0.5,
      closeLoop,
      clipPath: "clip-graph-box",
    };
    return new Line(points, options);
  }

  drawLegend(box: Box, index: number, name: string, color: string, spacing: number = 0): ToXml[] {
    // put the first half down the left column, then the second half down the right column.
    const leftColumn = Math.ceil(this.lines.list.length / 2);
    const y = box.y + (this.config.fontSize + spacing) * (index % leftColumn);
    const x = box.x + (box.width / 2) * Math.floor(index / leftColumn);
    const colorSize = 0.75 * this.config.fontSize;
    const colorBox = { x: x, y: y + this.config.fontSize - colorSize, width: colorSize, height: colorSize };
    const colorRect = new Rect(colorBox, { stroke: this.config.gridColor, strokeWidth: 1, fill: color });

    // the "y" appears to be the baseline, not an actually-useful coordinate.
    // so, assume the descender isn't more than 25% taller.
    // the clip box is really to keep it constrained horizontally.
    const textX = x + colorBox.width + this.config.innerPadding;
    const textY = y + this.config.fontSize;
    const textWidth = (box.width / 2) - this.config.innerPadding - this.config.padding - colorBox.width;
    const textHeight = this.config.fontSize * 1.25;
    const clip = new ClipPath(`clip${index}`, new Rect({ x: textX, y: y, width: textWidth, height: textHeight }))
    const text = new Text({ x: textX, y: textY }, name, {
      fontFamily: this.config.font,
      fontSize: this.config.fontSize,
      fill: this.config.legendColor,
      clipPath: `clip${index}`
    });

    return [ colorRect, text, clip ];
  }

  drawFocus(): ToXml[] {
    if (!this.focus) return [];
    const x = this.xToPixel(this.focus.timestamp);

    const dots: Circle[] = [];
    this.focus.values.forEach((v, i) => {
      if (v === undefined) return;
      const color = this.config.colors[i % this.config.colors.length];
      const options = { fill: color, stroke: color, strokeWidth: 1 };
      dots.push(new Circle({ x, y: this.yToPixel(v) }, this.config.dotWidth / 2, options));
    });
    return dots;
  }

  yToPixel(y: number): number {
    const scale = 1 - ((y - this.bottom) / (this.top - this.bottom));
    return this.graphBox.y + scale * this.graphBox.height;
  }

  xToPixel(x: number): number {
    return this.graphBox.x + ((x - this.left) / (this.right - this.left)) * this.graphBox.width;
  }

  pixelToX(px: number): number | undefined {
    if (px < this.graphBox.x || px >= this.graphBox.x + this.graphBox.width) return undefined;
    const xFrac = (px - this.graphBox.x) / this.graphBox.width;
    return xFrac * (this.right - this.left) + this.left;
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
    // our labels are about 5 chars wide at most ("12:34", "05/17", "2019")
    // so 5x font size gives enough room for the label and good spacing, and
    // 1.25x font size is enough vertical room.
    const gap = 5 * this.config.fontSize;
    const count = Math.floor(this.graphBox.width / gap);
    return new TimeBuddy(this.options.timezone).timeGranularityFor(this.left, this.right, count);
  }
}
