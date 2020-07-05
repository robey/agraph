import * as fs from "fs";
import { RrdFile } from "../rrd";

import "should";
import "source-map-support/register";

/*
 * ping-later.rrd: 1504399042
 * rrdtool xport --json -s 1504396100 -e 1504396300 DEF:ping=ping-later.rrd:value:MAX XPORT:ping
 */

describe("RrdFile", () => {
  function readFile(filename: string): ArrayBuffer {
    const data = fs.readFileSync(`./src/test/data/${filename}`);
    return data.buffer;
  }

  it("validate", () => {
    const rrd = new RrdFile(new DataView(readFile("ping-later.rrd")));
    rrd.toString().should.eql(
      "RrdFile(LE, version=3, sources=1, archives=15, lastUpdate=1504399040, step=10, int=64:8, float=64:8)"
    );
    rrd.getKeys().should.eql([ "value:AVERAGE", "value:MIN", "value:MAX" ]);
  });

  it("read the finest granularity", () => {
    const rrd = new RrdFile(new DataView(readFile("ping-later.rrd")));
    rrd.getTimeSeries("value:MAX", 1504399000, 1504399050).toVector().should.eql([
      [ 1504399000, 17.9191 ],
      [ 1504399010, 23.8354 ],
      [ 1504399020, 18.8518 ],
      [ 1504399030, 18.8518 ],
      [ 1504399040, 18.7366 ]
    ]);
  });

  it("read nulls", () => {
    const rrd = new RrdFile(new DataView(readFile("ping-later.rrd")));
    rrd.getTimeSeries("value:MAX", 1504396100, 1504396300).toVector().should.eql([
      [ 1504396100, 25.37455 ],
      [ 1504396110, 25.37455 ],
      [ 1504396120, 24.2829 ],
      [ 1504396130, 20.94845 ],
      [ 1504396140, 20.94845 ],
      [ 1504396150, 25.2886 ],
      [ 1504396160, 25.39535 ],
      [ 1504396170, 25.39535 ],
      [ 1504396180, 24.5029 ],
      [ 1504396190, 16.951 ],
      [ 1504396200, 16.951 ],
      [ 1504396210, 17.748800000000003 ],
      [ 1504396220, 25.719050000000003 ],
      [ 1504396230, 25.719050000000003 ],
      [ 1504396240, 24.9086 ],
      [ 1504396250, undefined ],
      [ 1504396260, undefined ],
      [ 1504396270, undefined ],
      [ 1504396280, undefined ],
      [ 1504396290, undefined ]
    ]);
  });

  it("use a coarser database if necessary", () => {
    const rrd = new RrdFile(new DataView(readFile("ping-later.rrd")));
    rrd.getTimeSeries("value:MAX", 1504377000, 1504399000).toVector().slice(0, 5).should.eql([
      [ 1504377060, 32.15455 ],
      [ 1504377130, 23.2284 ],
      [ 1504377200, 26.615200000000005 ],
      [ 1504377270, 23.7565 ],
      [ 1504377340, 30.740400000000005 ]
    ]);
  });

  it("use the coarsest database if the user is being unreasonable", () => {
    const rrd = new RrdFile(new DataView(readFile("ping-later.rrd")));
    rrd.getTimeSeries("value:MAX", 1472778000, 1472810000).toVector().slice(0, 5).should.eql([
      [ 1472779040, undefined ]
    ]);
  });
});
