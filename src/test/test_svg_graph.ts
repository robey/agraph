import * as fs from "fs";
import { range } from "../arrays";
import { buildSvgGraph, SvgGraphConfig } from "../svg_graph";
import { TimeSeries } from "../time_series";
import { TimeSeriesList } from "../time_series_list";

import "should";
import "source-map-support/register";

const SVG_HEADER = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="100" height="100mm" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <desc>(none)</desc>
`;
const SVG_FOOTER = `</svg>\n`;

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
    fs.readFileSync("./src/test/data/simple1.svg").toString().should.eql(graph1);
    const graph2 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: true, timezone });
    fs.readFileSync("./src/test/data/simple1-fill.svg").toString().should.eql(graph2);
    const graph3 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: false, timezone });
    fs.readFileSync("./src/test/data/simple1-legend.svg").toString().should.eql(graph3);
    const graph4 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: true, timezone });
    fs.readFileSync("./src/test/data/simple1-legend-fill.svg").toString().should.eql(graph4);
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
    fs.readFileSync("./src/test/data/highlights.svg").toString().should.eql(graph1);
  });
});
