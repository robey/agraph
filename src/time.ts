import * as luxon from "luxon";
import { range, generate } from "./arrays";

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

const IN_DAY_UNITS = [ 1, 5, 15, 60, 5 * MINUTE, 15 * MINUTE, HOUR, ];

const ALIGN_UNITS = [ 4 * HOUR, 12 * HOUR, DAY, ];
const ALIGN_NEXT: ((t: number) => number)[] = [
  // 4 hour
  asLuxon(d => d.hour < 20 ? d.set({ hour: d.hour + 4 }) : d.plus({ day: 1 }).startOf("day")),
  asLuxon(d => d.hour == 0 ? d.set({ hour: d.hour + 12 }) : d.plus({ day: 1 }).startOf("day")),
  asLuxon(d => d.plus({ day: 1 })),
];

// turn a DateTime transform into a seconds transform
function asLuxon(transform: (d: luxon.DateTime) => luxon.DateTime): (t: number) => number {
  return t => transform(luxon.DateTime.fromSeconds(t)).toSeconds();
}


export class TimeBuddy {
  constructor(public timezone?: string) {
    // pass
  }

  /*
   * figure out <= N good, equally-spaced x-axis markers that line up with some
   * "normal" time interval, in local time:
   *   - 1/5/15 seconds
   *   - 1/5/15 minutes
   *   - 1/4/12 hours
   *   - midnight
   *   - monday
   *   - first of the month
   *   - first of the quarter
   *   - jan 1
   *   - some currency-multiple of years
   */
  timeGranularityFor(minTime: number, maxTime: number, count: number): number[] {
    const ideal = (maxTime - minTime) / (count + 1);
    if (ideal <= 7 * DAY) {
      // can just align by rounding
      for (const interval of IN_DAY_UNITS) {
        const start = this.ceilTimeTo(minTime, interval);
        if (start + (count - 1) * interval >= maxTime) {
          return range(0, count).map(i => start + i * interval).filter(i => i <= maxTime);
        }
      }

      for (const i of range(0, ALIGN_UNITS.length)) {
        const interval = ALIGN_UNITS[i];
        const start = this.ceilTimeTo(minTime, interval);
        const list = generate(start, ALIGN_NEXT[i], (t, len) => t <= maxTime && len <= count);
        if (list.length <= count && list[list.length - 1] <= maxTime) return list;
      }
    }

    if (ideal < 7 * DAY) {

    }

    if (ideal <= 28 * DAY) {
      // try weekly from monday
      const start = this.ceilToMonday(minTime);
      const list = generate(start, t => this.ceilToMonday(t + 1), (t, len) => t <= maxTime && len <= count);
      if (list.length <= count && list[list.length - 1] <= maxTime) return list;
    }

    return [ minTime, Infinity ];
  }

  // bump up a time to the nearest "round-number" time matching an interval,
  // in this time zone. it supports any interval up to 24 hours. (there's no
  // way to make equal intervals after that.)
  ceilTimeTo(t: number, interval: number): number {
    // can we just align by rounding?
    if (interval <= 1 * HOUR) return Math.ceil(t / interval) * interval;

    const d = luxon.DateTime.fromSeconds(t, { zone: this.timezone });

    // intervals > 1h, <= 1d should be offset from local midnight
    if (interval <= 24 * HOUR) {
      const midnight = d.startOf("day");
      return midnight.toSeconds() + Math.ceil((t - midnight.toSeconds()) / interval) * interval;
    }

    // // intervals > 1d, < 7d should be offset from the first of the month
    // if (interval < 7 * DAY) {
    //   const d = new Date(t * 1000);
    //   d.setDate(1);
    //   d.setHours(0, 0, 0, 0);
    //   let first = d.getTime() / 1000;
    //   return first + Math.ceil((t - first) / interval) * interval;
    // }

    throw new Error("intervals of more than a day are not supported");
  }

  // when's the next monday?
  ceilToMonday(t: number): number {
    let d = luxon.DateTime.fromSeconds(t, { zone: this.timezone }).startOf("day");
    if (d.toSeconds() == t && d.weekday == 1) return t;
    do {
      d = d.plus({ days: 1 });
    } while (d.weekday != 1);
    return d.toSeconds();
  }



}
