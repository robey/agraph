should = require 'should'
time_series = require '../src/agraph/time_series'
grid_graph = require '../src/agraph/grid_graph'
inspect = require("util").inspect

describe "GridGraph", ->
  it "can compute boundaries", ->
    d = new time_series.DataTable([ 5, 8, 11, 14, 17 ], errors: [ 100, 118, 106, 124, 112 ])
    g = new grid_graph.GridGraph(d, width: 41, height: 11)
    g.prepare()
    g.top.should.eql 127
    g.bottom.should.eql 97
    g.interval.should.eql 3
