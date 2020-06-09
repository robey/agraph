import { range } from "../arrays";
import { ceilTimeTo, ceilToMonday, DAY, HOUR, timeGranularityFor, MINUTE } from "../time";

import "should";
import "source-map-support/register";

describe("timeGranularityFor", () => {
  it("seconds", () => {
    timeGranularityFor(0, 10, 11).should.eql(range(0, 11));
    timeGranularityFor(0, 10, 10).should.eql([ 0, 5, 10 ]);
    timeGranularityFor(0, 100, 25).should.eql(range(0, 101, 5));
    timeGranularityFor(2, 102, 25).should.eql(range(5, 101, 5));
    timeGranularityFor(0, 100, 10).should.eql(range(0, 101, 15));
    timeGranularityFor(100, 150, 10).should.eql(range(105, 151, 15));
    timeGranularityFor(0, 100, 5).should.eql([ 0, 60 ]);
  });

  it("minutes", () => {
    timeGranularityFor(0, 15 * MINUTE, 20).should.eql(range(0, 15 * MINUTE + 1, 60));
    timeGranularityFor(0, HOUR, 20).should.eql(range(0, HOUR + 1, 5 * MINUTE));
    timeGranularityFor(0, HOUR, 6).should.eql(range(0, HOUR + 1, 15 * MINUTE));
  });

  it("hours", () => {
    timeGranularityFor(0, DAY, 25).should.eql(range(0, DAY + 1, HOUR));
    // FIXME 4 hour should be based on local midnight
    timeGranularityFor(0, DAY, 20).should.eql(range(0, DAY + 1, 4 * HOUR));
    // FIXME 12 hour should be based on local midnight
    timeGranularityFor(0, 3 * DAY, 5).should.eql(range(0, 3 * DAY + 1, 12 * HOUR));
  });
});

// this test will only work in pacific time.
describe("ceilTimeTo", () => {
  // mon 2020-06-08, 15:34:17 UTC-0700
  const now = 1591655657;
  // thu 2020-06-11, 15:34:17 UTC-0700
  const thursday = 1591914857;

  it("up to an hour", () => {
    ceilTimeTo(now, 1).should.eql(1591655657);
    ceilTimeTo(now, 2).should.eql(1591655658);
    ceilTimeTo(now, 5).should.eql(1591655660);
    ceilTimeTo(now, 60).should.eql(1591655700);
    ceilTimeTo(now, 300).should.eql(1591655700);
    // 16:00
    ceilTimeTo(now, 1800).should.eql(1591657200);
    ceilTimeTo(now, 3600).should.eql(1591657200);
  });

  it("up to a day, from midnight", () => {
    // 16:00
    ceilTimeTo(now, 2 * HOUR).should.eql(1591657200);
    ceilTimeTo(now, 4 * HOUR).should.eql(1591657200);
    // 18:00
    ceilTimeTo(now, 3 * HOUR).should.eql(1591664400);
    ceilTimeTo(now, 6 * HOUR).should.eql(1591664400);
    // midnight tomorrow
    ceilTimeTo(now, 12 * HOUR).should.eql(1591686000);
    ceilTimeTo(now, 24 * HOUR).should.eql(1591686000);
  });

  it("ceilToMonday", () => {
    // 15-jun
    ceilToMonday(now).should.eql(1592204400);
    ceilToMonday(thursday).should.eql(1592204400);
    ceilToMonday(thursday + 3 * DAY).should.eql(1592204400);
    // 22-jun
    ceilToMonday(thursday + 4 * DAY).should.eql(1592809200);
  });
});
