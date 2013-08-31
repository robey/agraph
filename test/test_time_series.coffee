should = require 'should'
time_series = require '../src/agraph/time_series'
inspect = require("util").inspect

describe "DataCollection", ->
  it "can sort two datasets", ->
    d = new time_series.DataCollection()
    d.addPoints("errors", [ [ 0, 1 ], [ 10, 0 ], [ 5, 6 ] ])
    d.addPoints("hits", [ [ 5, 11 ], [ 10, 12 ], [ 0, 9 ] ])
    table = d.toTable()
    table.timestamps.should.eql [ 0, 5, 10 ]
    table.datasets.should.eql {
      errors: [ 1, 6, 0 ]
      hits: [ 9, 11, 12 ]
    }

  it "can detect missing timestamps", ->
    d = new time_series.DataCollection()
    d.addPoints("errors", [ [ 0, 1 ], [ 5, 2 ], [ 15, 6 ] ])
    d.addPoints("hits", [ [ 5, 11 ], [ 15, 12 ] ])
    table = d.toTable()
    table.timestamps.should.eql [ 0, 5, 10, 15 ]
    table.datasets.should.eql {
      errors: [ 1, 2, undefined, 6 ]
      hits: [ undefined, 11, undefined, 12 ]
    }

describe "DataTable", ->
  describe "can interpolate a dataset", ->
    Data1 = new time_series.DataTable([ 0, 3, 6 ], errors: [ 2, 5, 8 ])
    Data2 = new time_series.DataTable([ 5, 8, 11, 14, 17 ], errors: [ 100, 106, 112, 118, 124 ])
    Data3 = new time_series.DataTable([ 5, 6, 7, 8, 9 ], errors: [ 100, 120, null, 140, 160 ])
    Data4 = new time_series.DataTable(
      [ 20, 22, 24, 26, 28, 30, 32, 34, 36 ],
      errors: [ 100, 110, 130, 130, 120, 150, 140, 100, 130 ]
    )
    Data5 = new time_series.DataTable(
      [ 20, 22, 24, 26, 28, 30 ],
      errors: [ null, null, null, 90, null, null ]
    )

    it "one to one", ->
      d = Data1.toDataPoints(3)
      d.toCsv().should.eql("\# timestamp,errors\n0,2\n3,5\n6,8\n")

    it "doubling", ->
      d = Data1.toDataPoints(5)
      d.toCsv().should.eql "\# timestamp,errors\n0,2\n1.5,3.5\n3,5\n4.5,6.5\n6,8\n"

    it "shrinking", ->
      d = Data2.toDataPoints(3)
      d.toCsv().should.eql "\# timestamp,errors\n5,100\n11,112\n17,124\n"

    it "with missing segment", ->
      d = Data3.toDataPoints(9)
      d.toCsv().should.eql "\# timestamp,errors\n5,100\n5.5,110\n6,120\n6.5,null\n7,null\n7.5,null\n8,140\n8.5,150\n9,160\n"

    it "with fractional expansion", ->
      d = Data1.toDataPoints(4)
      d.toCsv().should.eql "\# timestamp,errors\n0,2\n2,4\n4,6\n6,8\n"

    it "fractional contraction", ->
      d = Data2.toDataPoints(4)
      d.toCsv().should.eql "\# timestamp,errors\n5,100\n9,108\n13,116\n17,124\n"

    it "compacts", ->
      d = Data4.toDataPoints(3)
      d.toCsv().should.eql "\# timestamp,errors\n20,112.5\n28,133.75\n36,117.5\n"

    it "doesn't compact away to nothing", ->
      d = Data5.toDataPoints(3)
      d.toCsv().should.eql "\# timestamp,errors\n20,null\n25,31.5\n30,null\n"

  it "calculates min/max", ->
    d = new time_series.DataTable(
      [ 1, 2, 3, 4, 5 ],
      errors: [ 10, 13, 15, 20, 18 ],
      hits: [ 5, 4, 9, 1, 4 ]
    )
    d.minimum().should.eql 1
    d.maximum().should.eql 20
