type MaybeNumber = number | undefined;

export function range(start: number, end: number, step: number = 1): number[] {
  return [...Array(Math.ceil((end - start) / step)).keys()].map(i => i * step + start);
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

//   # graphite: [ { target, datapoints: [ [ y, timestamp ], ... ] } ]
//   loadFromGraphite: (data) ->
//     for item in data then @addPoints(item.target, item.datapoints.map ([y, ts]) -> [ts, y])
//     @

}
