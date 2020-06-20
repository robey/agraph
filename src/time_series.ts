import { average, binarySearch, range } from "./arrays";

type MaybeNumber = number | undefined;

export class Point {
  constructor(public timestamp: number, public value: MaybeNumber) {
    // pass
  }

  toString() {
    return `(${this.timestamp}, ${this.value})`;
  }
}

export interface CellData {
  // how much (0 - 1) of the cell's width contains the line?
  widthPercent: number[];

  // how much (0 - 1) of the cell's area is beneath the line?
  fillPercent: number[];
}


/*
 * a list of points, where the x axis is time (as a timestamp, in seconds),
 * and the x values are regularly spaced.
 * the y value may or m
 */
export class TimeSeries {
  timestamps: number[] = [];
  values: MaybeNumber[] = [];

  constructor(public name: string) {
    // pass
  }

  static fromArrays(name: string, timestamps: number[], values: MaybeNumber[]): TimeSeries {
    if (timestamps.length != values.length) throw new Error("timestamps and values must have the same length");
    const rv = new TimeSeries(name);
    rv.timestamps = timestamps;
    rv.values = values;
    return rv;
  }

  // add a set of [timestamp, value] points
  addPoints(points: [ number, MaybeNumber ][]) {
    for (const [ ts, v ] of points) {
      this.timestamps.push(ts);
      this.values.push(v);
    }
  }

  // graphite likes [value, timestamp]
  addGraphitePoints(points: [ MaybeNumber, number ][]) {
    for (const [ v, ts ] of points) {
      this.timestamps.push(ts);
      this.values.push(v);
    }
  }

  min(): number {
    return Math.min(...(this.values.filter(v => v !== undefined) as number[]));
  }

  max(): number {
    return Math.max(...(this.values.filter(v => v !== undefined) as number[]));
  }

  // ensure timestamps are in order.
  sort() {
    const sortedIndex = this.timestamps.map((ts, i) => [ ts, i ] as [ number, number ]);
    sortedIndex.sort((left, right) => left[0] - right[0]);
    this.timestamps = sortedIndex.map(([ ts, i ]) => ts);
    this.values = sortedIndex.map(([ _ts, i ]) => this.values[i]);
  }

  minInterval(): number | undefined {
    if (this.timestamps.length <= 1) return undefined;
    const intervals = range(1, this.timestamps.length).map(i => this.timestamps[i] - this.timestamps[i - 1]);
    // js default sorting will stringify first and give completely bonkers answers
    intervals.sort((a, b) => a - b);
    return intervals[0];
  }

  /*
   * assuming the timestamps are at regular intervals, fill in any missing
   * data with an undefined value. if no interval is passed in, we'll figure
   * it out. if a min or max timestamp is passed in, the data is stretched to
   * reach either or both.
   */
  normalize(minimum?: number, maximum?: number, interval?: number) {
    if (this.timestamps.length <= 1) return;

    this.sort();
    if (minimum !== undefined && this.timestamps[0] > minimum) {
      this.timestamps.unshift(minimum);
      this.values.unshift(undefined);
    }
    if (maximum !== undefined && this.timestamps[this.timestamps.length - 1] < maximum) {
      this.timestamps.push(maximum);
      this.values.push(undefined);
    }

    // minInterval will always return a value because we've already ensured there are at least 2 points.
    interval = interval ?? this.minInterval() ?? 60;

    for (let i = 1; i < this.timestamps.length; i++) {
      const thisInterval = this.timestamps[i] - this.timestamps[i - 1];
      if (thisInterval == interval) continue;
      if (thisInterval > interval * 100) throw new Error("Data points are too distant on the time scale");
      this.timestamps.splice(i, 0, this.timestamps[i - 1] + interval);
      this.values.splice(i, 0, undefined);
    }
  }

  toPoints(): Point[] {
    return range(0, this.timestamps.length).map(i => new Point(this.timestamps[i], this.values[i]));
  }

  toVector(): [ number, MaybeNumber ][] {
    return this.toPoints().map(p => [ p.timestamp, p.value ]);
  }

  /*
   * re-sample the time series to match a specific interval, and optionally a
   * new range. data values will be the same for timestamps that are the same
   * after changing the interval. other data values are interpolated from the
   * two points on either side.
   */
  toInterval(
    interval: number,
    minimum: number = this.timestamps[0],
    maximum: number = this.timestamps[this.timestamps.length - 1] + interval,
    op: (values: number[]) => number = average
  ): TimeSeries {
    this.sort();
    const ts = range(minimum, maximum, interval);
    const v = ts.map(t => this.interpolate(t));
    return TimeSeries.fromArrays(this.name, ts, v);
  }

  antialias(
    width: number,
    height: number,
    top: number = this.max(),
    bottom: number = 0,
    left?: number,
    right?: number,
  ): CellData {
    this.sort();
    const ts = this.timestamps.slice();
    const v = this.values.slice();
    if (left === undefined) left = ts[0];
    if (right === undefined) right = ts[ts.length - 1];
    const cellWidth = (right - left) / width;
    const cellHeight = (top - bottom) / height;

    // first, interpolate the value at every vertical border.
    let i = 0;
    for (const t of range(left, right, cellWidth)) {
      while (ts[i] < t && i < ts.length) i++;
      if (i < ts.length && ts[i] == t) continue;
      ts.splice(i, 0, t);
      v.splice(i, 0, this.interpolate(t));
    }

    // next, interpolate any horizontal border crossing.
    let cell: MaybeNumber = undefined;
    for (let i = 0; i < ts.length; i++) {
      if (v[i] === undefined) {
        cell = undefined;
        continue;
      }
      const iCell = Math.floor(((v[i] ?? 0) - bottom) / cellHeight);
      if (iCell == cell) continue;
      if (cell === undefined) {
        cell = iCell;
        continue;
      }

      // we crossed at least one cell.
      const direction = cell < iCell ? 1 : -1;
      cell += direction;
      const iv = (cell + (direction == 1 ? 0 : 1)) * cellHeight + bottom;
      if (iv == v[i]) continue;

      const it = linearInterpolate(v[i - 1] ?? 0, v[i] ?? 0, ts[i - 1], ts[i], iv);
      ts.splice(i, 0, it);
      v.splice(i, 0, iv);
    }

    // at this point, ts and v contain line segments that are each constrained to one cell.
    const widthPercent: number[] = new Array(width * height);
    const fillPercent: number[] = new Array(width * height);
    widthPercent.fill(0);
    fillPercent.fill(0);

    for (let i = 1; i < ts.length; i++) {
      const v1 = v[i - 1], v2 = v[i];
      if (v1 === undefined || v2 === undefined) continue;
      const x = floor((ts[i - 1] - left) / cellWidth);
      const y = floor((Math.min(v1, v2) - bottom) / cellHeight);
      const yReal = height - y - 1;

      const segmentPercent = (ts[i] - ts[i - 1]) / cellWidth;
      const areaPercent = ((v1 - (y * cellHeight)) + (v2 - (y * cellHeight))) / 2 / cellHeight * segmentPercent;
      widthPercent[yReal * width + x] += segmentPercent;
      fillPercent[yReal * width + x] += areaPercent;
      for (const yy of range(yReal + 1, height)) fillPercent[yy * width + x] += segmentPercent;
    }

    return {
      widthPercent: widthPercent.map(n => Math.round(n * 1000) / 1000),
      fillPercent: fillPercent.map(n => Math.round(n * 1000) / 1000),
    };
  }

  /*
   * interpolate the value at a specific timestamp.
   *   - if the timestamp is outside of the existing dataset, the value
   *     will be undefined (missing).
   *   - if it matches an existing point's timestamp exactly, that value will
   *     be returned.
   * otherwise, it will be a linear interpolation of the values on either
   * side. if either side's value is missing:
   *   - if `skipMissing` is true, it will use the next defined value it can
   *     find on that side.
   *   - if `skipMissing` is false, it will return undefined (missing).
   */
  interpolate(ts: number, skipMissing: boolean = false): MaybeNumber {
    let right = binarySearch(this.timestamps, t => t >= ts);
    let left = right - 1;

    // skip unknown values?
    if (skipMissing) {
      while (left >= 0 && this.values[left] === undefined) left--;
      while (right < this.timestamps.length && this.values[right] === undefined) right++;
    }

    // edge cases: exact hit?
    if (right < this.timestamps.length && this.timestamps[right] == ts) return this.values[right];

    // edge cases: off the end?
    if (left < 0 || right >= this.timestamps.length) return undefined;

    // edge cases: not skipping unknown values, and one side is a gap?
    const vl = this.values[left], vr = this.values[right];
    if (vl === undefined || vr === undefined) return undefined;

    return linearInterpolate(this.timestamps[left], this.timestamps[right], vl, vr, ts);
  }

  getNearestTime(ts: number): number {
    let right = binarySearch(this.timestamps, t => t >= ts);
    let left = right - 1;
    if (left < 0) return this.timestamps[right];
    if (right >= this.timestamps.length) return this.timestamps[left];
    const t1 = this.timestamps[left], t2 = this.timestamps[right];
    return (Math.abs(t1 - ts) <= Math.abs(t2 - ts)) ? t1 : t2;
  }




//   # graphite: [ { target, datapoints: [ [ y, timestamp ], ... ] } ]
//   loadFromGraphite: (data) ->
//     for item in data then @addPoints(item.target, item.datapoints.map ([y, ts]) -> [ts, y])
//     @

}


// given two points (x1, y1) and (x2, y2), find newY for the line crossing at newX.
// you can reverse the sense of X and Y to calculate a new X for a given Y.
function linearInterpolate(x1: number, x2: number, y1: number, y2: number, newX: number): number {
  const interval = x2 - x1;
  const delta = y2 - y1;
  const frac = (newX - x1) / interval;
  return y1 + frac * delta;
}

function fudge(n: number): number {
  return Math.round(n * Math.pow(2, 32)) / Math.pow(2, 32);
}

function floor(n: number): number {
  return Math.floor(fudge(n));
}
