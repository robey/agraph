should = require 'should'
util = require '../src/agraph/util'
inspect = require("util").inspect

describe "util", ->
  it "humanize", ->
    util.humanize(0).should.eql "    0 "
    util.humanize(1).should.eql "    1 "
    util.humanize(109).should.eql "  109 "
    util.humanize(999).should.eql "  999 "
    util.humanize(1000).should.eql " 1000 "
    util.humanize(1001).should.eql "1.001K"
    util.humanize(1024).should.eql "1.024K"
    util.humanize(9999).should.eql "9.999K"
    util.humanize(12345).should.eql "12.35K"
    util.humanize(123456).should.eql "123.5K"
    util.humanize(1234567).should.eql "1.235M"
    util.humanize(74449000).should.eql "74.45M"
    util.humanize(Math.pow(2, 32)).should.eql "4.295G"
    util.humanize(Math.pow(2, 64)).should.eql "18.45E"
    util.humanize(0.1).should.eql "  100m"
    util.humanize(0.01).should.eql "   10m"
    util.humanize(0.001).should.eql "    1m"
    util.humanize(0.0001).should.eql "  100u"
    util.humanize(0.00001).should.eql "   10u"
    util.humanize(0.000001).should.eql "    1u"
    util.humanize(0.0000001).should.eql "  100n"
