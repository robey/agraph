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

/*
 * a list of points, where the x axis is time (as a timestamp, in seconds),
 * and the x values are regularly spaced.
 * the y value may or m
 */
export class Timeseries {
  timestamps: number[] = [];
  values: MaybeNumber[] = [];

  constructor(public name: string) {
    // pass
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

  toInterval(
    interval: number,
    minimum: number = this.timestamps[0],
    maximum: number = this.timestamps[this.timestamps.length - 1] + interval,
    op: (values: number[]) => number = average
  ): Timeseries {
    const newTs: number[] = [];
    const newV: MaybeNumber[] = [];
    this.sort();
    for (const ts of range(minimum, maximum, interval)) {
      newTs.push(ts);
      newV.push(this.aggregate(ts - interval / 2, ts + interval / 2));
    }

    const rv = new Timeseries(this.name);
    rv.timestamps = newTs;
    rv.values = newV;
    return rv;
  }

  /*
   * aggregate all the values within a timestamp range.
   *   - if there are no values, interpolate instead.
   *   - if there are values, but they're all missing, return undefined.
   * otherwise, return the aggregate of all the values covered by the range.
   * the default function is "area", but any operation may be used.
   */
  aggregate(
    tsLeft: number,
    tsRight: number,
    op: (points: Point[]) => MaybeNumber = area
  ): MaybeNumber {
    // find data that's inside the range (left inclusive, right exclusive)
    let left = binarySearch(this.timestamps, t => t >= tsLeft);
    let right = binarySearch(this.timestamps, t => t > tsRight);
    console.log(tsLeft, tsRight, left, right)

    if (right == left) {
      // no data points in here: interpolate, if possible.
      return this.interpolate((tsLeft + tsRight) / 2);
    }

    // aggregate the existing data points.
    const points = range(left, right).map(i => {
      return new Point(this.timestamps[i], this.values[i]);
    }).filter(p => p.value !== undefined);
    // edge case: all data in this range was missing?
    if (points.length == 0) return undefined;
    // edge case: only one real value?
    if (points.length == 1) return points[0].value;

    // add left & right edges
    const leftEdge = this.interpolate(tsLeft);
    const rightEdge = this.interpolate(tsRight);
    // timestamps.unshift(tsLeft);
    // timestamps.push(tsRight);
    // values.unshift(this.interpolate(tsLeft));
    // values.push(this.interpolate(tsRight));
    return op(points);
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
    if (this.values[left] === undefined || this.values[right] === undefined) return undefined;

    // linear interpolate between the two known values
    const interval = this.timestamps[right] - this.timestamps[left];
    const delta = (this.values[right] || 0) - (this.values[left] || 0);
    return (this.values[left] || 0) + delta * (ts - this.timestamps[left]) / interval;
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


export function area(points: Point[]): MaybeNumber {
  console.log("area", points);
  return 0;
}
