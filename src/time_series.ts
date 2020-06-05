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

    if (interval === undefined) {
      const intervals = range(1, this.timestamps.length).map(i => this.timestamps[i] - this.timestamps[i - 1]);
      // js default sorting will stringify first and give completely bonkers answers
      intervals.sort((a, b) => a - b);
      interval = intervals[0];
    }

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
      const x = Math.floor((ts[i - 1] - left) / cellWidth);
      const y = Math.floor((Math.min(v1, v2) - bottom) / cellHeight);
      const yReal = height - y - 1;

      const old = widthPercent[yReal * width + x];
      widthPercent[yReal * width + x] += (ts[i] - ts[i - 1]) / cellWidth;
    }

    return { widthPercent, fillPercent };
  }

  // /*
  //  * aggregate all the values within a timestamp range.
  //  *   - if there are no values, interpolate instead.
  //  *   - if there are values, but they're all missing, return undefined.
  //  * otherwise, return the aggregate of all the values covered by the range.
  //  * the default function is "area", but any operation may be used.
  //  */
  // aggregate(
  //   tsLeft: number,
  //   tsRight: number,
  //   op: (points: Point[]) => MaybeNumber = area
  // ): MaybeNumber {
  //   // find data that's inside the range (left inclusive, right exclusive)
  //   let left = binarySearch(this.timestamps, t => t >= tsLeft);
  //   let right = binarySearch(this.timestamps, t => t > tsRight);
  //   console.log(tsLeft, tsRight, left, right)

  //   if (right == left) {
  //     // no data points in here: interpolate, if possible.
  //     return this.interpolate((tsLeft + tsRight) / 2);
  //   }

  //   // aggregate the existing data points.
  //   const points = range(left, right).map(i => {
  //     return new Point(this.timestamps[i], this.values[i]);
  //   }).filter(p => p.value !== undefined);
  //   // edge case: all data in this range was missing?
  //   if (points.length == 0) return undefined;
  //   // edge case: only one real value?
  //   if (points.length == 1) return points[0].value;

  //   // add left & right edges
  //   const leftEdge = this.interpolate(tsLeft);
  //   const rightEdge = this.interpolate(tsRight);
  //   // timestamps.unshift(tsLeft);
  //   // timestamps.push(tsRight);
  //   // values.unshift(this.interpolate(tsLeft));
  //   // values.push(this.interpolate(tsRight));
  //   return op(points);
  // }

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








  // # adjust our current timestamps into N new equally-spaced timestamps covering the same range. the new datasets will
  // # be anchored on each end, but interpolated in the middle. if the datasets are being compressed by a factor of more
  // # than 2, sets of points will be merged by average-area.
  // # returns a new DataTable.
  // toDataPoints: (n) ->
  //   new_interval = @totalInterval / (n - 1)
  //   new_timestamps = [0 ... n].map (i) => @timestamps[0] + new_interval * i
  //   if n * 2 <= @timestamps.length then return @toAveragedDataPoints(n, new_interval, new_timestamps)
  //   new_datasets = {}
  //   for name of @datasets
  //     new_datasets[name] = [ @datasets[name][0] ]
  //     for i in [1 ... n]
  //       new_datasets[name].push @interpolate(new_timestamps[i], @datasets[name])
  //   new DataTable(new_timestamps, new_datasets)

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
