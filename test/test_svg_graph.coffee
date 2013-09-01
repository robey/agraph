should = require 'should'
time_series = require "../src/agraph/time_series"
svg_graph = require "../src/agraph/svg_graph"
inspect = require("util").inspect

describe "SvgGraph", ->
  Data1 = new time_series.DataTable(
    [ 20, 22, 24, 26, 28, 30, 32, 34, 36 ],
    errors: [ 100, 110, 130, 130, 120, 150, 140, 100, 130 ]
  )

  it "computes bounding boxes", ->
    g = new svg_graph.SvgGraph(Data1, pixelWidth: 1000, aspectRatio: 2, padding: 20, innerPadding: 25, fontSize: 30)
    g.options.pixelHeight.should.eql 500
    g.yLabelBox.should.eql { x: 20, y: 20, height: 350, width: 120 }
    g.graphBox.should.eql { x: 165, y: 20, height: 350, width: 815 }
    g.xLabelBox.should.eql { x: 165, y: 395, height: 30, width: 815 }
    g.legendBox.should.eql { x: 165, y: 450, height: 30, width: 815 }
