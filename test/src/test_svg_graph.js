let should = require("should");
let svg_graph = require("../../lib/yeri/svg_graph");
let time_series = require("../../lib/yeri/time_series");
let util = require("util");

require("source-map-support").install();

describe("SvgGraph", () => {
  let Data1 = new time_series.DataTable(
    [ 20, 22, 24, 26, 28, 30, 32, 34, 36 ],
    { errors: [ 100, 110, 130, 130, 120, 153, 140, 100, 130 ] }
  );

  it("computes bounding boxes", () => {
    let g = new svg_graph.SvgGraph(Data1, { pixelWidth: 1000, aspectRatio: 2, padding: 20, innerPadding: 25, fontSize: 30 });
    g.options.pixelHeight.should.eql(500);
    g.yLabelBox.should.eql({ x: 20, y: 65, height: 310, width: 120 });
    g.graphBox.should.eql({ x: 165, y: 65, height: 310, width: 815 });
    g.xLabelBox.should.eql({ x: 165, y: 400, height: 30, width: 815 });
    g.legendBox.should.eql({ x: 165, y: 450, height: 30, width: 815 });
    g.top.should.eql(160);
    g.bottom.should.eql(0);
  });
});
