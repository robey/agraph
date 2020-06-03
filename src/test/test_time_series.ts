import { Timeseries } from "../time_series";

import "should";
import "source-map-support/register";

describe("Timeseries", () => {
  it("sort", () => {
    const errors = new Timeseries("errors");
    errors.addPoints([ [ 0, 1 ], [ 10, 0 ], [ 5, 6 ] ]);
    errors.sort();
    errors.timestamps.should.eql([ 0, 5, 10 ]);
    errors.values.should.eql([ 1, 6, 0 ]);

    const hits = new Timeseries("hits");
    hits.addPoints([ [ 5, 11 ], [ 10, 12 ], [ 0, 9 ] ]);
    hits.sort();
    hits.timestamps.should.eql([ 0, 5, 10 ]);
    hits.values.should.eql([ 9, 11, 12 ]);
  });

  it("normalize", () => {
    const errors = new Timeseries("errors");
    errors.addPoints([ [ 0, 1 ], [ 5, 2 ], [ 15, 6 ] ]);
    errors.normalize();
    errors.timestamps.should.eql([ 0, 5, 10, 15 ]);
    errors.values.should.eql([ 1, 2, undefined, 6 ]);

    const hits = new Timeseries("hits");
    hits.addPoints([ [ 5, 11 ], [ 15, 12 ] ]);
    hits.normalize(0, 25);
    hits.timestamps.should.eql([ 0, 5, 10, 15, 20, 25 ]);
    hits.values.should.eql([ undefined, 11, undefined, 12, undefined, undefined ]);
  });

  it("refuses to boil the oceans", () => {
    const ts = new Timeseries("unreasonable");
    ts.addPoints([ [ 0, 1 ], [ 5, 2 ], [ 15000, 6 ] ]);
    (() => ts.normalize()).should.throw(/too distant/);
  });

  describe("toInterval", () => {
    const ts1 = new Timeseries("ts1");
    ts1.addPoints([ [ 0, 2 ], [ 3, 5 ], [ 6, 8 ] ]);
    const ts2 = new Timeseries("ts2");
    ts2.addPoints([ [ 5, 100 ], [ 8, 106 ], [ 11, 112 ], [ 14, 118 ], [ 17, 124 ] ]);
    const ts3 = new Timeseries("gap");
    ts3.addPoints([ [ 5, 100 ], [ 6, 120 ], [ 7, undefined ], [ 8, 140 ], [ 9, 160 ] ]);

    it("one to one", () => {
      ts1.toInterval(3).toVector().should.eql([ [ 0, 2 ], [ 3, 5 ], [ 6, 8 ] ]);
    });

    it("doubling", () => {
      ts1.toInterval(1.5).toVector().should.eql([ [ 0, 2 ], [ 1.5, 3.5 ], [ 3, 5 ], [ 4.5, 6.5 ], [ 6, 8 ] ]);
    });

    it("shrinking", () => {
      ts2.toInterval(6).toVector().should.eql([ [ 5, 103 ], [ 11, 112 ], [ 17, 121 ] ]);
      ts2.toInterval(6, 2, 21).toVector().should.eql([ [ 2, 100 ], [ 8, 106 ], [ 14, 118 ], [ 20, 124 ] ]);
    });

    it("with gap", () => {
      ts3.toInterval(0.5).toVector().should.eql([
        [ 5, 100 ], [ 5.5, 110 ], [ 6, 120 ], [ 6.5, undefined ], [ 7, undefined ], [ 7.5, undefined ],
        [ 8, 140 ], [ 8.5, 150 ], [ 9, 160 ]
      ]);
    });

    it("with fractional expansion", () => {
      ts1.toInterval(2).toVector().should.eql([ [ 0, 2 ], [ 2, 5 ], [ 4, 5 ], [ 6, 8 ] ]);
    });
  // Data4 = new time_series.DataTable(
  //   [ 20, 22, 24, 26, 28, 30, 32, 34, 36 ],
  //   errors: [ 100, 110, 130, 130, 120, 150, 140, 100, 130 ]
  // )
  // Data5 = new time_series.DataTable(
  //   [ 20, 22, 24, 26, 28, 30 ],
  //   errors: [ null, null, null, 90, null, null ]
  // )


  // it "with fractional expansion", ->
  //   d = Data1.toDataPoints(4)
  //   d.toCsv().should.eql "\# timestamp,errors\n0,2\n2,4\n4,6\n6,8\n"

  // it "fractional contraction", ->
  //   d = Data2.toDataPoints(4)
  //   d.toCsv().should.eql "\# timestamp,errors\n5,100\n9,108\n13,116\n17,124\n"

  // it "compacts", ->
  //   d = Data4.toDataPoints(3)
  //   d.toCsv().should.eql "\# timestamp,errors\n20,112.5\n28,133.75\n36,117.5\n"

  // it "doesn't compact away to nothing", ->
  //   d = Data5.toDataPoints(3)
  //   d.toCsv().should.eql "\# timestamp,errors\n20,null\n25,31.5\n30,null\n"

  });
});
