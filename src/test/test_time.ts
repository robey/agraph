import * as luxon from "luxon";
import { range } from "../arrays";
import { DAY, HOUR, MINUTE, TimeBuddy, WEEK } from "../time";

import "should";
import "source-map-support/register";

describe("TimeBuddy", () => {
  // make these tests work, no matter where you are, by forcing LA timezone.
  const t = new TimeBuddy("America/Los_Angeles");

  // mon 2020-06-08, midnight PDT
  const midnight = 1591599600;

  describe("timeGranularityFor", () => {
    it("seconds", () => {
      t.timeGranularityFor(0, 10, 11).should.eql(range(0, 11));
      t.timeGranularityFor(0, 10, 10).should.eql([ 0, 5, 10 ]);
      t.timeGranularityFor(0, 100, 25).should.eql(range(0, 101, 5));
      t.timeGranularityFor(2, 102, 25).should.eql(range(5, 101, 5));
      t.timeGranularityFor(0, 100, 10).should.eql(range(0, 101, 15));
      t.timeGranularityFor(100, 150, 10).should.eql(range(105, 151, 15));
      t.timeGranularityFor(0, 100, 5).should.eql([ 0, 60 ]);
    });

    it("minutes", () => {
      t.timeGranularityFor(0, 15 * MINUTE, 20).should.eql(range(0, 15 * MINUTE + 1, 60));
      t.timeGranularityFor(0, HOUR, 20).should.eql(range(0, HOUR + 1, 5 * MINUTE));
      t.timeGranularityFor(0, HOUR, 6).should.eql(range(0, HOUR + 1, 15 * MINUTE));
    });

    it("hours/day", () => {
      t.timeGranularityFor(midnight, midnight + DAY, 25).should.eql(range(midnight, midnight + DAY + 1, HOUR));
      t.timeGranularityFor(midnight - HOUR, midnight + DAY, 20).should.eql(
        range(midnight, midnight + DAY + 1, 4 * HOUR)
      );
      t.timeGranularityFor(midnight - HOUR, midnight + 3 * DAY, 7).should.eql(
        range(midnight, midnight + 3 * DAY + 1, 12 * HOUR)
      );
      t.timeGranularityFor(midnight - HOUR, midnight + 3 * DAY, 5).should.eql(
        range(midnight, midnight + 3 * DAY + 1, DAY)
      );
    });

    it("hours/day across daylight savings", () => {
      // 8-mar-2020 was a daylight savings change in PST/PDT.
      const midnight2 = 1583654400;
      luxon.DateTime.fromSeconds(midnight2).toString().should.eql("2020-03-08T00:00:00.000-08:00");

      t.timeGranularityFor(midnight2 - 8 * HOUR, midnight2 + 12 * HOUR, 20).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-03-07T16:00:00.000-08:00",
        "2020-03-07T20:00:00.000-08:00",
        "2020-03-08T00:00:00.000-08:00",
        "2020-03-08T04:00:00.000-07:00",
        "2020-03-08T08:00:00.000-07:00",
        "2020-03-08T12:00:00.000-07:00",
      ]);

      t.timeGranularityFor(midnight2 - HOUR, midnight2 + 3 * DAY, 7).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-03-08T00:00:00.000-08:00",
        "2020-03-08T12:00:00.000-07:00",
        "2020-03-09T00:00:00.000-07:00",
        "2020-03-09T12:00:00.000-07:00",
        "2020-03-10T00:00:00.000-07:00",
        "2020-03-10T12:00:00.000-07:00",
        "2020-03-11T00:00:00.000-07:00",
      ]);

      t.timeGranularityFor(midnight2 - DAY - HOUR, midnight2 + 2 * DAY, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-03-07T00:00:00.000-08:00",
        "2020-03-08T00:00:00.000-08:00",
        // if it goofs, the next ones will be 01:00
        "2020-03-09T00:00:00.000-07:00",
        "2020-03-10T00:00:00.000-07:00",
      ]);
    });

    it("weeks", () => {
      t.timeGranularityFor(midnight - HOUR, midnight + 30 * DAY, 5).should.eql(
        range(midnight, midnight + 30 * DAY, WEEK)
      );

    });
  });

  describe("ceilTimeTo", () => {
    // mon 2020-06-08, 15:34:17 UTC-0700
    const now = 1591655657;
    // thu 2020-06-11, 15:34:17 UTC-0700
    const thursday = 1591914857;

    it("up to an hour", () => {
      t.ceilTimeTo(now, 1).should.eql(1591655657);
      t.ceilTimeTo(now, 2).should.eql(1591655658);
      t.ceilTimeTo(now, 5).should.eql(1591655660);
      t.ceilTimeTo(now, 60).should.eql(1591655700);
      t.ceilTimeTo(now, 300).should.eql(1591655700);
      // 16:00
      t.ceilTimeTo(now, 1800).should.eql(1591657200);
      t.ceilTimeTo(now, 3600).should.eql(1591657200);
    });

    it("up to a day, from midnight", () => {
      // 16:00
      t.ceilTimeTo(now, 2 * HOUR).should.eql(1591657200);
      t.ceilTimeTo(now, 4 * HOUR).should.eql(1591657200);
      // 18:00
      t.ceilTimeTo(now, 3 * HOUR).should.eql(1591664400);
      t.ceilTimeTo(now, 6 * HOUR).should.eql(1591664400);
      // midnight tomorrow
      t.ceilTimeTo(now, 12 * HOUR).should.eql(1591686000);
      t.ceilTimeTo(now, 24 * HOUR).should.eql(1591686000);
    });

    it("ceilToMonday", () => {
      // 15-jun
      t.ceilToMonday(now).should.eql(1592204400);
      t.ceilToMonday(thursday).should.eql(1592204400);
      t.ceilToMonday(thursday + 3 * DAY).should.eql(1592204400);
      // 22-jun
      t.ceilToMonday(thursday + 4 * DAY).should.eql(1592809200);
    });
  });
});
