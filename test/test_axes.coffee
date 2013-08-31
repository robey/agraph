should = require 'should'
axes = require '../src/agraph/axes'
inspect = require("util").inspect

describe "axes", ->
  it "humanize", ->
    axes.humanize(0).should.eql "    0 "
    axes.humanize(1).should.eql "    1 "
    axes.humanize(109).should.eql "  109 "
    axes.humanize(999).should.eql "  999 "
    axes.humanize(1000).should.eql " 1000 "
    axes.humanize(1001).should.eql "1.001K"
    axes.humanize(1024).should.eql "1.024K"
    axes.humanize(9999).should.eql "9.999K"
    axes.humanize(12345).should.eql "12.35K"
    axes.humanize(123456).should.eql "123.5K"
    axes.humanize(1234567).should.eql "1.235M"
    axes.humanize(74449000).should.eql "74.45M"
    axes.humanize(Math.pow(2, 32)).should.eql "4.295G"
    axes.humanize(Math.pow(2, 64)).should.eql "18.45E"
    axes.humanize(0.1).should.eql "  100m"
    axes.humanize(0.01).should.eql "   10m"
    axes.humanize(0.001).should.eql "    1m"
    axes.humanize(0.0001).should.eql "  100u"
    axes.humanize(0.00001).should.eql "   10u"
    axes.humanize(0.000001).should.eql "    1u"
    axes.humanize(0.0000001).should.eql "  100n"
