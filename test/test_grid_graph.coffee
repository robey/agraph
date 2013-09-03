should = require 'should'
util = require 'util'

time_series = require "../src/yeri/time_series"
grid_graph = require "../src/yeri/grid_graph"

describe "GridGraph", ->
  it "can compute boundaries", ->
    d = new time_series.DataTable([ 5, 8, 11, 14, 17 ], errors: [ 100, 118, 106, 124, 112 ])
    g = new grid_graph.GridGraph(d, width: 41, height: 11)
    g.prepare()
    g.top.should.eql 127
    g.bottom.should.eql 97
    g.interval.should.eql 3
    