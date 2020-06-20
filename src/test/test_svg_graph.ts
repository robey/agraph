import * as fs from "fs";
import { range } from "../arrays";
import { buildSvgGraph } from "../svg_graph";
import { TimeBuddy } from "../time";
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

  it("simple graph with legend/fill", () => {
    const list = new TimeSeriesList([
      TimeSeries.fromArrays("huey", hour, [ 100, 120, 110, 130, 120, 140, 130, 150, 140, 120, 110, 130 ]),
      TimeSeries.fromArrays("dewey", hour, [ 90, 100, 95, 100, 105, 95, 105, 110, 95, 90, 95, 100 ]),
      TimeSeries.fromArrays("louie", hour, [ 85, 85, 80, 80, 80, 75, 75, 70, 65, 65, 60, 55 ]),
      TimeSeries.fromArrays("mickey", hour, [ 50, 60, 70, 75, 80, 85, 90, 100, 110, 115, 125, 135 ]),
      TimeSeries.fromArrays("minnie", hour, [ 30, 30, 35, 30, 30, 35, 30, 30, 35, 30, 30, 35 ]),
    ]);

    const graph1 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: false, timezone });
    fs.readFileSync("./src/test/data/simple1.svg").toString().should.eql(graph1);
    const graph2 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: false, fill: true, timezone });
    fs.readFileSync("./src/test/data/simple1-fill.svg").toString().should.eql(graph2);
    const graph3 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: false, timezone });
    fs.readFileSync("./src/test/data/simple1-legend.svg").toString().should.eql(graph3);
    const graph4 = buildSvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true, fill: true, timezone });
    fs.readFileSync("./src/test/data/simple1-legend-fill.svg").toString().should.eql(graph4);
  });
});
