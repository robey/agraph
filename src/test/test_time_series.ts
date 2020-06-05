import { TimeSeries } from "../time_series";

import "should";
import "source-map-support/register";

describe("TimeSeries", () => {
  it("sort", () => {
    const errors = new TimeSeries("errors");
    errors.addPoints([ [ 0, 1 ], [ 10, 0 ], [ 5, 6 ] ]);
    errors.sort();
    errors.timestamps.should.eql([ 0, 5, 10 ]);
    errors.values.should.eql([ 1, 6, 0 ]);

    const hits = new TimeSeries("hits");
    hits.addPoints([ [ 5, 11 ], [ 10, 12 ], [ 0, 9 ] ]);
    hits.sort();
    hits.timestamps.should.eql([ 0, 5, 10 ]);
    hits.values.should.eql([ 9, 11, 12 ]);
  });

  it("normalize", () => {
    const errors = new TimeSeries("errors");
    errors.addPoints([ [ 0, 1 ], [ 5, 2 ], [ 15, 6 ] ]);
    errors.normalize();
    errors.timestamps.should.eql([ 0, 5, 10, 15 ]);
    errors.values.should.eql([ 1, 2, undefined, 6 ]);

    const hits = new TimeSeries("hits");
    hits.addPoints([ [ 5, 11 ], [ 15, 12 ] ]);
    hits.normalize(0, 25);
    hits.timestamps.should.eql([ 0, 5, 10, 15, 20, 25 ]);
    hits.values.should.eql([ undefined, 11, undefined, 12, undefined, undefined ]);
  });

  it("refuses to boil the oceans", () => {
    const ts = new TimeSeries("unreasonable");
    ts.addPoints([ [ 0, 1 ], [ 5, 2 ], [ 15000, 6 ] ]);
    (() => ts.normalize()).should.throw(/too distant/);
  });

  describe("toInterval", () => {
    const ts1 = new TimeSeries("ts1");
    ts1.addPoints([ [ 0, 2 ], [ 3, 5 ], [ 6, 8 ] ]);
    const ts2 = new TimeSeries("ts2");
    ts2.addPoints([ [ 5, 100 ], [ 8, 106 ], [ 11, 112 ], [ 14, 118 ], [ 17, 124 ] ]);
    const ts3 = new TimeSeries("gap");
    ts3.addPoints([ [ 5, 100 ], [ 6, 120 ], [ 7, undefined ], [ 8, 140 ], [ 9, 160 ] ]);
    const ts4 = new TimeSeries("ts4");
    ts4.addPoints([ [ 20, 100 ], [ 22, 110 ], [ 24, 130 ], [ 26, 130 ], [ 28, 120 ], [ 30, 150 ] ]);
    ts4.addPoints([ [ 32, 140 ], [ 34, 100 ], [ 36, 130 ] ]);
    const ts5 = TimeSeries.fromArrays(
      "ts5",
      [ 20, 22, 24, 26, 28, 30 ],
      [ undefined, undefined, 80, 90, undefined, undefined ]
    );

    it("one to one", () => {
      ts1.toInterval(3).toVector().should.eql([ [ 0, 2 ], [ 3, 5 ], [ 6, 8 ] ]);
    });

    it("doubling", () => {
      ts1.toInterval(1.5).toVector().should.eql([ [ 0, 2 ], [ 1.5, 3.5 ], [ 3, 5 ], [ 4.5, 6.5 ], [ 6, 8 ] ]);
    });

    it("shrinking", () => {
      ts2.toInterval(6).toVector().should.eql([ [ 5, 100 ], [ 11, 112 ], [ 17, 124 ] ]);
      ts2.toInterval(6, 2, 21).toVector().should.eql([ [ 2, undefined ], [ 8, 106 ], [ 14, 118 ], [ 20, undefined ] ]);
    });

    it("with gap", () => {
      ts3.toInterval(0.5).toVector().should.eql([
        [ 5, 100 ], [ 5.5, 110 ], [ 6, 120 ], [ 6.5, undefined ], [ 7, undefined ], [ 7.5, undefined ],
        [ 8, 140 ], [ 8.5, 150 ], [ 9, 160 ]
      ]);
    });

    it("with fractional expansion", () => {
      ts1.toInterval(2).toVector().should.eql([ [ 0, 2 ], [ 2, 4 ], [ 4, 6 ], [ 6, 8 ] ]);
    });

    it("with fractional contraction", () => {
      ts2.toInterval(4).toVector().should.eql([ [ 5, 100 ], [ 9, 108 ], [ 13, 116 ], [ 17, 124 ] ]);
    });

    it("compacts", () => {
      ts4.toInterval(8).toVector().should.eql([ [ 20, 100 ], [ 28, 120 ], [ 36, 130 ] ]);
    });

    it("doesn't compact away to nothing", () => {
      ts5.toInterval(5).toVector().should.eql([ [ 20, undefined ], [ 25, 85 ], [ 30, undefined ] ]);
    });
  });

  describe("antialias", () => {
    const ts1 = TimeSeries.fromArrays("ts1", [ 100, 120, 140, 160, 180, 200 ], [ 50, 100, 150, 200, 250, 300 ]);

    it("basic", () => {
      // 100, 125, 150, 175, 200 --> 0, 60, 120, 180, 240, 300
      makeHtml("test.html", ts1, 200, 200);
      ts1.antialias(4, 5).should.eql([ [ 5 ] ]);
    });

    // vertical line crosses multiple cells
  })
});


import * as fs from "fs";

function makeHtml(name: string, ts: TimeSeries, width: number, height: number) {
  const cells = ts.antialias(width, height);
  let out = "";
  out += "<html><body><table>\n";
  for (let y = 0; y < height; y++) {
    out += "<tr>\n";
    for (let x = 0; x < width; x++) {
      out += `<td style=\"width: 5px; height: 5px; background: #ff0000; opacity: ${cells.widthPercent[y * width + x]}\"></td>\n`;
    }
    out += "</tr>\n";
  }
  out += "</table></body></html>\n";
  fs.writeFileSync(name, out);
}
