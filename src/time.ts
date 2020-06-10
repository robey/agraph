import { ceilToCurrency } from "display-si";
import * as luxon from "luxon";
import { generate } from "./arrays";

export const MINUTE = 60;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
export const WEEK = 7 * DAY;
// these are looser concepts:
export const MONTH = 30 * DAY;
export const QUARTER = 90 * DAY;
export const YEAR = 365 * DAY;

interface IntervalMath {
  interval: number;
  start: (d: luxon.DateTime) => luxon.DateTime;
  next: (d: luxon.DateTime) => luxon.DateTime;
}

const INTERVALS: IntervalMath[] = [
  {
    interval: 1,
    start: d => d,
    next: d => d.plus({ second: 1 }),
  },
  {
    interval: 5,
    start: d => d.plus({ second: modCeil(d.toSeconds(), 5) }),
    next: d => d.plus({ second: 5 }),
  },
  {
    interval: 15,
    start: d => d.plus({ second: modCeil(d.toSeconds(), 15) }),
    next: d => d.plus({ second: 15 }),
  },
  {
    interval: MINUTE,
    start: d => d.plus({ second: modCeil(d.toSeconds(), MINUTE) }),
    next: d => d.plus({ minute: 1 }),
  },
  {
    interval: 5 * MINUTE,
    start: d => d.plus({ second: modCeil(d.toSeconds(), 5 * MINUTE) }),
    next: d => d.plus({ minute: 5 }),
  },
  {
    interval: 15 * MINUTE,
    start: d => d.plus({ second: modCeil(d.toSeconds(), 15 * MINUTE) }),
    next: d => d.plus({ minute: 15 }),
  },
  {
    interval: HOUR,
    start: d => d.plus({ second: modCeil(d.toSeconds(), HOUR) }),
    next: d => d.plus({ hour: 1 }),
  },
  {
    interval: 4 * HOUR,
    start: d => d.plus({ hour: modCeil(d.hour, 4) }),
    next: d => d.hour < 20 ? d.set({ hour: d.hour + 4 }) : d.plus({ day: 1 }).startOf("day"),
  },
  {
    interval: 12 * HOUR,
    start: d => d.plus({ hour: modCeil(d.hour, 12) }),
    next: d => d.hour == 0 ? d.set({ hour: 12 }) : d.plus({ day: 1 }).startOf("day"),
  },
  {
    interval: DAY,
    start: d => d.plus({ hour: modCeil(d.hour, 24) }),
    next: d => d.plus({ day: 1 }),
  },
  {
    interval: WEEK,
    start: nextMonday,
    next: d => nextMonday(d.plus({ seconds: 1 })),
  },
  {
    interval: MONTH,
    start: nextMonth,
    next: d => d.plus({ month: 1 }),
  },
  {
    interval: QUARTER,
    start: nextQuarter,
    next: d => d.plus({ month: 4 }),
  },
  {
    interval: YEAR,
    start: nextYear,
    next: d => d.plus({ year: 1 }),
  },
];

function modCeil(n: number, factor: number): number {
  const r = n % factor;
  return r == 0 ? 0 : factor - r;
}

function nextMonday(d: luxon.DateTime): luxon.DateTime {
  let d1 = d.startOf("day");
  if (d1.toSeconds() == d.toSeconds() && d.weekday == 1) return d;
  do {
    d1 = d1.plus({ days: 1 });
  } while (d1.weekday != 1);
  return d1;
}

function nextMonth(d: luxon.DateTime): luxon.DateTime {
  let d1 = d.startOf("month").startOf("day");
  if (d1.toSeconds() == d.toSeconds() && d.day == 1) return d;
  return d1.plus({ month: 1 });
}

function nextQuarter(d: luxon.DateTime): luxon.DateTime {
  let d1 = d.startOf("month").startOf("day");
  if (d1.toSeconds() == d.toSeconds() && d.day == 1 && d.month % 4 == 1) return d;
  do {
    d1 = d1.plus({ month: 1 });
  } while (d1.month % 4 != 1);
  return d1;
}

function nextYear(d: luxon.DateTime, multiple: number = 1): luxon.DateTime {
  let d1 = d.startOf("year").startOf("day");
  if (d1.toSeconds() == d.toSeconds() && d.year % multiple == 0) return d;
  do {
    d1 = d1.plus({ year: 1 });
  } while (d1.year % multiple != 0);
  return d1;
}


export class TimeBuddy {
  constructor(public timezone?: string) {
    // pass
  }

  toLuxon(t: number): luxon.DateTime {
    return luxon.DateTime.fromSeconds(t, { zone: this.timezone });
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
    // let the list go one element over -- if that happens, it means the maxTime range didn't really fit.
    const condition = (t: number, len: number) => t <= maxTime && len <= count + 1;

    for (const math of INTERVALS) {
      if (ideal > math.interval) continue;
      const start = math.start(this.toLuxon(minTime));
      const list = generate(start.toSeconds(), t => math.next(this.toLuxon(t)).toSeconds(), condition);
      if (list.length <= count) return list;
    }

    // some currency-multiple of years
    let multiple = 1;
    while (true) {
      const start = nextYear(this.toLuxon(minTime), multiple);
      const list = generate(start.toSeconds(), t => this.toLuxon(t).plus({ year: multiple }).toSeconds(), condition);
      if (list.length <= count) return list;
      multiple = ceilToCurrency(multiple * 2);
    }
  }
}
