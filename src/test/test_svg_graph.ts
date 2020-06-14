import { range } from "../arrays";
import { SvgGraph } from "../svg_graph";
import { TimeBuddy } from "../time";
import { TimeSeries } from "../time_series";
import { TimeSeriesList } from "../time_series_list";

import "should";
import "source-map-support/register";

import * as fs from "fs";

const SVG_HEADER = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="100" height="100mm" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <desc>(none)</desc>
`;
const SVG_FOOTER = `</svg>\n`;

describe("SVG graph", () => {
  // make these tests work, no matter where you are, by forcing LA timezone.
  const t = new TimeBuddy("America/Los_Angeles");

  // wed 2020-06-10, 9:15:00 PDT
  const bikeDay = 1591805700;
  const hour = range(bikeDay, bikeDay + 3600, 60);
  const sawtooth = hour.map(t => 100 + t % 50);

  it("exists", () => {
    const list = new TimeSeriesList([
      TimeSeries.fromArrays("huey", hour, sawtooth),
      TimeSeries.fromArrays("dewey", hour, sawtooth),
      TimeSeries.fromArrays("louie", hour, sawtooth),
      TimeSeries.fromArrays("mickey", hour, sawtooth),
      TimeSeries.fromArrays("minnie", hour, sawtooth),
    ]);
    const graph = new SvgGraph(list, { title: "hello", backgroundColor: "#f8f8ff", showLegend: true });
    console.log(graph.draw());
    fs.writeFileSync("test2.svg", graph.draw());
  });
});
