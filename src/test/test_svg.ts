import { buildSvg, Line, Rect, LineOptions } from "../svg";

import "should";
import "source-map-support/register";

const SVG_HEADER = `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="100" height="100mm" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <desc>(none)</desc>
`;
const SVG_FOOTER = `</svg>\n`;

describe("SVG", () => {
  it("empty", () => {
    buildSvg([], {}).should.eql(SVG_HEADER + "\n" + SVG_FOOTER);
  });

  it("rectangle", () => {
    const rect = new Rect({ x: 1, y: 2, width: 3, height: 4 }, { stroke: "#ffffff", strokeWidth: 2, fill: "#ff0000" });
    buildSvg([ rect ], {}).should.eql(
      SVG_HEADER +
      `  <rect x="1" y="2" width="3" height="4" stroke="#ffffff" stroke-width="2" fill="#ff0000"/>\n` +
      SVG_FOOTER
    );
  });

  describe("Line", () => {
    it("should plot a basic line", () => {
      const line = new Line([ { x: 10, y: 20 }, { x: 30, y: 40 } ], { strokeWidth: 2 });
      line.toPath().trim().should.eql("M 10 20 L 30 40");
    });

    it("should handle discontinuities", () => {
      const line = new Line([
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        undefined,
        undefined,
        { x: 90, y: 30 },
        { x: 110, y: 40 },
      ], { strokeWidth: 2 });
      line.toPath().trim().should.eql("M 10 20 L 30 40 M 90 30 L 110 40");
    });

    it("makes the whole svg", () => {
      const line = new Line([ { x: 10, y: 20 }, { x: 20, y: 20 } ], { stroke: "#66ff66" });
      buildSvg([ line ], {}).should.eql(SVG_HEADER + `  <path d="M 10 20 L 20 20" stroke="#66ff66"/>\n` + SVG_FOOTER);
    });

    it("all options", () => {
      const options: LineOptions = {
        stroke: "red", strokeWidth: 4, strokeLineCap: "cat", strokeLineJoin: "dog", fill: "blue", closeLoop: true
      };
      const line = new Line([ { x: 10, y: 20 }, { x: 20, y: 20 } ], options);
      buildSvg([ line ], {}).should.eql(
        SVG_HEADER +
        `  <path d="M 10 20 L 20 20 Z" stroke="red" stroke-width="4" stroke-linecap="cat" stroke-linejoin="dog" fill="blue"/>\n` +
        SVG_FOOTER);
    });
  });
});
