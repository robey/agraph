import { range } from "./arrays";

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;

const IN_DAY_UNITS = [ 1, 5, 15, 60, 5 * MINUTE, 15 * MINUTE, HOUR, 4 * HOUR, 12 * HOUR, DAY ];

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
export function timeGranularityFor(minTime: number, maxTime: number, count: number): number[] {
  const ideal = (maxTime - minTime) / (count + 1);
  if (ideal <= 7 * DAY) {
    // can just align by rounding
    for (const interval of IN_DAY_UNITS) {
      const start = ceilTimeTo(minTime, interval);
      if (start + (count - 1) * interval >= maxTime) {
        return range(0, count).map(i => start + i * interval).filter(i => i <= maxTime);
      }
    }
  }

  if (ideal <= 28 * DAY) {
    // try weekly from monday
    const start = ceilToMonday(minTime);
    if (start + (count - 1) * WEEK >= maxTime) return [ start, WEEK ];
  }

  return [ minTime, Infinity ];
}

// bump up a time to the nearest round-number time matching an interval, in LOCAL time
export function ceilTimeTo(t: number, interval: number): number {
  // can we just align by rounding?
  if (interval <= 1 * HOUR) return Math.ceil(t / interval) * interval;

  // intervals > 1h, <= 1d should be offset from local midnight
  if (interval <= 24 * HOUR) {
    const d = new Date(t * 1000);
    d.setHours(0, 0, 0, 0);
    const midnight = d.getTime() / 1000;
    console.log(midnight)
    return midnight + Math.ceil((t - midnight) / interval) * interval;
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

export function ceilToMonday(t: number): number {
  t = ceilTimeTo(t, DAY);
  let d = new Date(t * 1000);
  while (d.getDay() != 1 || d.getTime() < t) {
    d.setTime(d.getTime() + 26 * HOUR * 1000);
    d.setHours(0, 0, 0, 0);
  }
  return d.getTime() / 1000;
}


function midnightOf(t: number): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
