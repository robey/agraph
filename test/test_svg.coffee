should = require 'should'
util = require 'util'

svg = require "../src/agraph/svg"

describe "Svg", ->
  describe "Line", ->
    it "should plot a basic line", ->
      line = new svg.Line([ { x: 10, y: 20 }, { x: 30, y: 40 } ], stroke: 2)
      line.toPath().trim().should.eql "M 10 20 L 30 40"

    it "should handle discontinuities", ->
      line = new svg.Line([
        { x: 10, y: 20 },
        { x: 30, y: 40 }
        { x: 50, y: null },
        { x: 70, y: null }
        { x: 90, y: 30 },
        { x: 110, y: 40 }
      ], stroke: 2)
      line.toPath().trim().should.eql "M 10 20 L 30 40 M 90 30 L 110 40"
