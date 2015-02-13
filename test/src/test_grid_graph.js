let grid_graph = require("../../lib/yeri/grid_graph");
let should = require("should");
let time_series = require("../../lib/yeri/time_series");
let util = require("util");

describe("GridGraph", () => {
  it("can compute boundaries", () => {
    let d = new time_series.DataTable([ 5, 8, 11, 14, 17 ], { errors: [ 100, 118, 106, 124, 112 ] });
    let g = new grid_graph.GridGraph(d, { width: 41, height: 11 });
    g.prepare();
    g.top.should.eql(130);
    g.bottom.should.eql(100);
    g.interval.should.eql(3);
  });
  
  it("can override boundaries", () => {
    let d = new time_series.DataTable([ 5, 8, 11, 14, 17 ], { errors: [ 100, 118, 106, 124, 112 ] });
    let g = new grid_graph.GridGraph(d, { width: 41, height: 11, top: 150, bottom: 50 });
    g.prepare();
    g.top.should.eql(150);
    g.bottom.should.eql(50);
    g.interval.should.eql(10);
  });
});
