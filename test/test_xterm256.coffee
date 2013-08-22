should = require 'should'
xterm256 = require '../src/agraph/xterm256'
inspect = require("util").inspect

describe "xterm256", ->
  it "finds the nearest color cube", ->
    xterm256.nearest_color_cube(0, 0, 0).should.eql [ 0, 0 ]
    xterm256.nearest_color_cube(47, 47, 47).should.eql [ 0, Math.sqrt(3 * 47 * 47) ]
    xterm256.nearest_color_cube(48, 48, 48).should.eql [ 1 * 36 + 1 * 6 + 1, Math.sqrt(3 * 47 * 47) ]
    xterm256.nearest_color_cube(255, 140, 2).should.eql [ 5 * 36 + 2 * 6 + 0, Math.sqrt(5 * 5 + 2 * 2) ]
    xterm256.nearest_color_cube(127, 0, 250).should.eql [ 2 * 36 + 0 * 6 + 5, Math.sqrt(8 * 8 + 5 * 5) ]
    xterm256.nearest_color_cube(255, 255, 255).should.eql [ 5 * 36 + 5 * 6 + 5, 0 ]

  it "finds the nearest gray", ->
    xterm256.nearest_gray(0, 0, 0).should.eql [ 0, Math.sqrt(3 * 8 * 8) ]
    xterm256.nearest_gray(18, 18, 18).should.eql [ 1, 0 ]
    xterm256.nearest_gray(17, 19, 20).should.eql [ 1, Math.sqrt(1 + 1 + 4) ]
    xterm256.nearest_gray(255, 255, 255).should.eql [ 23, Math.sqrt(3 * 17 * 17) ]
    xterm256.nearest_gray(127, 127, 127).should.eql [ 12, Math.sqrt(3) ]
    xterm256.nearest_gray(0, 128, 64).should.eql [ 6, Math.sqrt(68 * 68 + 60 * 60 + 4 * 4) ]

