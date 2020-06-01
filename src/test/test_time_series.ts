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
});
