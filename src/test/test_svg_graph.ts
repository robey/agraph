import * as fs from "fs";
import { range } from "../arrays";
import { RrdFile } from "../rrd";
import { buildSvgGraph, SvgGraphConfig } from "../svg_graph";
import { DARK_THEME } from "../themes";
import { TimeSeries } from "../time_series";
import { TimeSeriesList } from "../time_series_list";

import "should";
import "source-map-support/register";

describe("SVG graph", () => {
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


  it("simple graph with legend/fill", () => {
    const graph1 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: false, timezone });
    graph1.should.eql(fs.readFileSync("./src/test/data/simple1.svg").toString());
    const graph2 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: true, timezone });
    graph2.should.eql(fs.readFileSync("./src/test/data/simple1-fill.svg").toString());
    const graph3 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: false, timezone });
    graph3.should.eql(fs.readFileSync("./src/test/data/simple1-legend.svg").toString());
    const graph4 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: true, timezone });
    graph4.should.eql(fs.readFileSync("./src/test/data/simple1-legend-fill.svg").toString());
  });

  it("custom axis labels", () => {
    const options: Partial<SvgGraphConfig> = {
      backgroundColor: "#ffcccc",
      xAxisLabelFormat: (time, scale) => `:${time.minute}min`,
      yAxisLabelFormat: n => `:${n}ms`,
    };
    const graph = buildSvgGraph(list, options);
    graph.should.match(/:150ms/);
    graph.should.match(/:30min/);
  });

  it("highlight zones", () => {
    const errors = TimeSeries.fromArrays("errors", hour, [ 0, 0, 0, 0.5, 0, 0.1, 1, 0.9, 0, 0.4, 0.6, 0 ]);
    const options: Partial<SvgGraphConfig> = {
      backgroundColor: "white",
      yAxisLabelFormat: n => `${n}ms`,
      highlights: [
        { color: "#ff8888", opacity: 0.3, threshold: ts => (errors.interpolate(ts) ?? 0) >= 0.5 },
        { color: "#8888ff", opacity: 0.3, threshold: ts => {
          return (errors.interpolate(ts) ?? 0) == 1 || (errors.interpolate(ts) ?? 0) == 0.1;
        } },
      ]
    };
    const graph1 = buildSvgGraph(list, options);
    graph1.should.eql(fs.readFileSync("./src/test/data/highlights.svg").toString());
  });

  it("maxY", () => {
    const graph1 = buildSvgGraph(list, {
      backgroundColor: "white", showLegend: false, maxY: 100, yAxisLabelWidthPt: 2, timezone
    });
    graph1.should.eql(fs.readFileSync("./src/test/data/clip-y.svg").toString());
  });

  it("dense graph from RRD", () => {
    const rrdData = fs.readFileSync("./src/test/data/ping-2020.rrd");
    const rrd = new RrdFile(new DataView(rrdData.buffer));

    // const startTime = 1593995240 - 60;
    const startTime = 1593478180 - 60;
    const endTime = 1594082510;
    const list = new TimeSeriesList([ rrd.getTimeSeries("value:MAX", startTime, endTime) ]);

    const options: Partial<SvgGraphConfig> = {
      backgroundColor: "white",
      yAxisLabelFormat: n => `${n}ms`,
      showLegend: false,
      aspectRatio: 2.5125,
      padding: 0,
      fontSize: 18,
      showTopYLabel: false,
      timezone,
    };

    const graph1 = buildSvgGraph(list, options);
    graph1.should.eql(fs.readFileSync("./src/test/data/dense-rrd.svg").toString());
  });

  it("dark theme", () => {
    const options = Object.assign({}, DARK_THEME, { title: "hello", showLegend: true, timezone });
    const graph = buildSvgGraph(list, options);
    graph.should.eql(fs.readFileSync("./src/test/data/simple1-dark.svg").toString());
  });
});
