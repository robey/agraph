import * as luxon from "luxon";
import { range } from "../arrays";
import { DAY, HOUR, MINUTE, MONTH, TimeBuddy, WEEK, YEAR } from "../time";

import "should";
import "source-map-support/register";

describe("TimeBuddy", () => {
  // make these tests work, no matter where you are, by forcing LA timezone.
  const t = new TimeBuddy("America/Los_Angeles");

  // mon 2020-06-08, midnight PDT
  const midnight = 1591599600;
  // wed 2020-06-10, 9:14:56 PDT
  const bikeDay = 1591805696;

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
        range(midnight, midnight + 3 * DAY + 1, 24 * HOUR)
      );
      t.timeGranularityFor(midnight - HOUR, midnight + 3 * DAY, 5).should.eql(
        range(midnight, midnight + 3 * DAY + 1, DAY)
      );

      // round hours up from a random time correctly
      t.timeGranularityFor(1593991430, 1593991430 + 86000, 6).should.eql(
        range(1594004400, 1593991430 + 86000, 4 * HOUR)
      );
      t.timeGranularityFor(1593478180, 1594082510, 7).should.eql(
        range(1593500400, 1594082510, 24 * HOUR)
      );
    });

    it("weeks", () => {
      t.timeGranularityFor(midnight - HOUR, midnight + 30 * DAY, 5).should.eql(
        range(midnight, midnight + 30 * DAY, WEEK)
      );
      t.timeGranularityFor(midnight - 3 * DAY - HOUR, midnight + 30 * DAY, 5).should.eql(
        range(midnight, midnight + 30 * DAY, WEEK)
      );
      t.timeGranularityFor(midnight - 11 * DAY - HOUR, midnight + 20 * DAY, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-06-01T00:00:00.000-07:00",
        "2020-06-08T00:00:00.000-07:00",
        "2020-06-15T00:00:00.000-07:00",
        "2020-06-22T00:00:00.000-07:00",
      ]);
    });

    it("months", () => {
      t.timeGranularityFor(bikeDay, bikeDay + 3 * MONTH, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-07-01T00:00:00.000-07:00",
        "2020-08-01T00:00:00.000-07:00",
        "2020-09-01T00:00:00.000-07:00",
      ]);
      t.timeGranularityFor(bikeDay - 2 * WEEK, bikeDay + 3 * MONTH, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-06-01T00:00:00.000-07:00",
        "2020-07-01T00:00:00.000-07:00",
        "2020-08-01T00:00:00.000-07:00",
        "2020-09-01T00:00:00.000-07:00",
      ]);
      t.timeGranularityFor(bikeDay - 6 * MONTH, bikeDay - 3 * MONTH, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-01-01T00:00:00.000-08:00",
        "2020-02-01T00:00:00.000-08:00",
        "2020-03-01T00:00:00.000-08:00",
      ]);
    });

    it("quarters", () => {
      t.timeGranularityFor(bikeDay, bikeDay + 13 * MONTH, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-09-01T00:00:00.000-07:00",
        "2021-01-01T00:00:00.000-08:00",
        "2021-05-01T00:00:00.000-07:00",
      ]);
    });

    it("years", () => {
      t.timeGranularityFor(bikeDay - 3 * YEAR, bikeDay + YEAR, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2018-01-01T00:00:00.000-08:00",
        "2019-01-01T00:00:00.000-08:00",
        "2020-01-01T00:00:00.000-08:00",
        "2021-01-01T00:00:00.000-08:00",
      ]);

      // 2
      t.timeGranularityFor(bikeDay - 6 * YEAR, bikeDay + YEAR, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2016-01-01T00:00:00.000-08:00",
        "2018-01-01T00:00:00.000-08:00",
        "2020-01-01T00:00:00.000-08:00",
      ]);

      // 5
      t.timeGranularityFor(bikeDay - 20 * YEAR, bikeDay + 3 * YEAR, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2005-01-01T00:00:00.000-08:00",
        "2010-01-01T00:00:00.000-08:00",
        "2015-01-01T00:00:00.000-08:00",
        "2020-01-01T00:00:00.000-08:00",
      ]);

      // 10
      t.timeGranularityFor(bikeDay - 30 * YEAR, bikeDay + 3 * YEAR, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2000-01-01T00:00:00.000-08:00",
        "2010-01-01T00:00:00.000-08:00",
        "2020-01-01T00:00:00.000-08:00",
      ]);

      // 20
      t.timeGranularityFor(bikeDay - 50 * YEAR, bikeDay + 10 * YEAR, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "1980-01-01T00:00:00.000-08:00",
        "2000-01-01T00:00:00.000-08:00",
        "2020-01-01T00:00:00.000-08:00",
      ]);

      // 50
      t.timeGranularityFor(bikeDay - 90 * YEAR, bikeDay + 20 * YEAR, 4).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "1950-01-01T00:00:00.000-08:00",
        "2000-01-01T00:00:00.000-08:00",
      ]);

      // ok, that's enough.
    });

    it("across daylight savings", () => {
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
        "2020-03-09T00:00:00.000-07:00",
        "2020-03-10T00:00:00.000-07:00",
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

      t.timeGranularityFor(midnight2 - 11 * DAY - HOUR, midnight2 + 20 * DAY, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-03-02T00:00:00.000-08:00",
        "2020-03-09T00:00:00.000-07:00",
        "2020-03-16T00:00:00.000-07:00",
        "2020-03-23T00:00:00.000-07:00",
      ]);

      t.timeGranularityFor(midnight2 - 2 * MONTH, midnight2 + 2 * MONTH, 5).map(t => {
        return luxon.DateTime.fromSeconds(t).toString();
      }).should.eql([
        "2020-02-01T00:00:00.000-08:00",
        "2020-03-01T00:00:00.000-08:00",
        "2020-04-01T00:00:00.000-07:00",
        "2020-05-01T00:00:00.000-07:00",
      ]);
    });
  });
});
