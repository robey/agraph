import { TimeSeries } from "./time_series";

/*
 * a set of TimeSeries, normalized to have the same min/max timestamps and
 * intervals.
 */
export class TimeSeriesList {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  interval: number;

  constructor(public list: TimeSeries[]) {
    const realList = list.filter(ts => ts.timestamps.length > 0);
    this.minX = Math.min(...realList.map(ts => Math.min(...ts.timestamps)));
    this.maxX = Math.max(...realList.map(ts => Math.max(...ts.timestamps)));
    this.minY = Math.min(...realList.map(ts => ts.min()));
    this.maxY = Math.max(...realList.map(ts => ts.max()));
    this.interval = Math.min(...realList.map(ts => ts.minInterval() ?? Infinity));
    if (this.interval === Infinity) return;

    list.forEach(ts => ts.normalize(this.minX, this.maxX, this.interval));
  }
}
