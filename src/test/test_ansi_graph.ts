import * as fs from "fs";
import { buildAnsiGraph, AnsiGraphResolution, AnsiGraphConfig } from "../ansi_graph";
import { range } from "../arrays";
import { TimeSeries } from "../time_series";
import { TimeSeriesList } from "../time_series_list";

import "should";
import "source-map-support/register";
import { RrdFile } from "../rrd";

describe("ANSI graph", () => {
  // make these tests work, no matter where you are, by forcing LA timezone.
  const timezone = "America/Los_Angeles";

  // wed 2020-06-10, 21:15:00 PDT
  const bikeDay = 1591848900;
  const hour = range(bikeDay, bikeDay + 3600, 300);

  const list = new TimeSeriesList([
    TimeSeries.fromArrays("huey", hour, [ 100, 120, 110, 130, 120, 140, 130, 150, 140, 120, 110, 130 ]),
    TimeSeries.fromArrays("dewey", hour, [ 90, 100, 95, 100, 105, 95, 105, 110, 95, 90, 95, 100 ]),
    TimeSeries.fromArrays("louie", hour, [ 85, 85, 80, 80, 80, 75, 75, 70, 65, 65, 60, 55 ]),
    TimeSeries.fromArrays("mickey", hour, [ 50, 60, 70, 75, 80, 85, 90, 100, 110, 115, 125, 135 ]),
    TimeSeries.fromArrays("minnie", hour, [ 30, 30, 35, 30, 30, 35, 30, 30, 35, 30, 30, 35 ]),
  ]);


  it("simple graph with legend/fill", async () => {
    const graph1 = buildAnsiGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: false, timezone });
    graph1.should.eql(fs.readFileSync("./src/test/data/ansi.txt").toString());

    const graph2 = buildAnsiGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: true, timezone });
    graph2.should.eql(fs.readFileSync("./src/test/data/ansi-fill.txt").toString());

    const graph3 = buildAnsiGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: false, timezone });
    graph3.should.eql(fs.readFileSync("./src/test/data/ansi-legend.txt").toString());

    const graph4 = buildAnsiGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: true, timezone });
    graph4.should.eql(fs.readFileSync("./src/test/data/ansi-legend-fill.txt").toString());
  });

  it("half res", () => {
    const graph = buildAnsiGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: false, timezone, resolution: AnsiGraphResolution.HALF });
    graph.should.eql(fs.readFileSync("./src/test/data/ansi-2x.txt").toString());
  });

  it("no res", () => {
    const graph = buildAnsiGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: false, timezone, resolution: AnsiGraphResolution.FULL });
    graph.should.eql(fs.readFileSync("./src/test/data/ansi-1x.txt").toString());
  });

  it("custom axis labels", () => {
    const options: Partial<AnsiGraphConfig> = {
      backgroundColor: "#ffcccc",
      xAxisLabelFormat: (time, scale) => `:${time.minute}min`,
      yAxisLabelFormat: n => `:${n}ms`,
    };
    const graph = buildAnsiGraph(list, options);
    graph.should.match(/:150ms/);
    graph.should.match(/:30min/);
  });

  it("maxY", () => {
    const graph = buildAnsiGraph(list, {
      backgroundColor: "white", showLegend: false, maxY: 100, yAxisLabelWidth: 2
    });
    graph.should.eql(fs.readFileSync("./src/test/data/ansi-clip-y.txt").toString());
  });

  it("dense graph from RRD", () => {
    const rrdData = fs.readFileSync("./src/test/data/ping-2020.rrd");
    const rrd = new RrdFile(new DataView(rrdData.buffer));

    // const startTime = 1593995240 - 60;
    const startTime = 1593478180 - 60;
    const endTime = 1594082510;
    const list = new TimeSeriesList([ rrd.getTimeSeries("value:MAX", startTime, endTime) ]);

    const options: Partial<AnsiGraphConfig> = {
      width: 200,
      height: 30,
      backgroundColor: "white",
      yAxisLabelFormat: n => `${n}ms`,
      showLegend: false,
      padding: 0,
      showTopYLabel: false,
    };

    const graph = buildAnsiGraph(list, options);
    graph.should.eql(fs.readFileSync("./src/test/data/ansi-rrd.txt").toString());
  });
});
