import { TimeSeries } from "../time_series";
import { TimeSeriesList } from "../time_series_list";

import "should";
import "source-map-support/register";

describe("TimeSeriesList", () => {
  it("normalize", () => {
    const ts1 = TimeSeries.fromArrays("eggs", [ 10, 20, 30 ], [ 5, 6, 7 ]);
    const ts2 = TimeSeries.fromArrays("cookies", [ 10, 20, 30, 40 ], [ 1, 1, 2, 2 ]);
    const ts3 = TimeSeries.fromArrays("cashews", [ 20, 40 ], [ 50, 52 ]);
    const list = new TimeSeriesList([ ts1, ts2, ts3 ]);

    list.minX.should.eql(10);
    list.maxX.should.eql(40);
    list.interval.should.eql(10);
    list.minY.should.eql(1);
    list.maxY.should.eql(52);

    list.list[0].toVector().should.eql([ [ 10, 5 ], [ 20, 6 ], [ 30, 7 ], [ 40, undefined ] ]);
    list.list[1].toVector().should.eql([ [ 10, 1 ], [ 20, 1 ], [ 30, 2 ], [ 40, 2 ] ]);
    list.list[2].toVector().should.eql([ [ 10, undefined ], [ 20, 50 ], [ 30, undefined ], [ 40, 52 ] ]);
  });

  it("toCsv", () => {
    const ts1 = TimeSeries.fromArrays("eggs", [ 10, 20, 30 ], [ 5, 6, 7 ]);
    const ts2 = TimeSeries.fromArrays("cookies", [ 10, 20, 30, 40 ], [ 1, 1, 2, 2 ]);
    const ts3 = TimeSeries.fromArrays("cashews", [ 20, 40 ], [ 50, 52 ]);
    const list = new TimeSeriesList([ ts1, ts2, ts3 ]);

    list.toCsv().should.eql(
      "timestamp,eggs,cookies,cashews\n" +
      "10,5,1,null\n" +
      "20,6,1,50\n" +
      "30,7,2,null\n" +
      "40,null,2,52\n"
    );
  });
});
