let should = require("should");
let util = require("util");
let utils = require("../../lib/yeri/utils");

require("source-map-support").install();

describe("utils", () => {
  it("humanize", () => {
    utils.humanize(0).should.eql("     0");
    utils.humanize(1).should.eql("     1");
    utils.humanize(109).should.eql("   109");
    utils.humanize(999).should.eql("   999");
    utils.humanize(1000).should.eql("  1000");
    utils.humanize(1001).should.eql("1.001K");
    utils.humanize(1024).should.eql("1.024K");
    utils.humanize(9999).should.eql("9.999K");
    utils.humanize(12345).should.eql("12.35K");
    utils.humanize(123456).should.eql("123.5K");
    utils.humanize(1234567).should.eql("1.235M");
    utils.humanize(74449000).should.eql("74.45M");
    utils.humanize(Math.pow(2, 32)).should.eql("4.295G");
    utils.humanize(Math.pow(2, 64)).should.eql("18.45E");
    utils.humanize(0.1).should.eql("  100m");
    utils.humanize(0.01).should.eql("   10m");
    utils.humanize(0.001).should.eql("    1m");
    utils.humanize(0.0001).should.eql("  100u");
    utils.humanize(0.00001).should.eql("   10u");
    utils.humanize(0.000001).should.eql("    1u");
    utils.humanize(0.0000001).should.eql("  100n");
    utils.humanize(8700).should.eql("  8.7K");
  });

  it("dehumanize", () => {
    utils.dehumanize("123").should.eql(123);
    utils.dehumanize("12K").should.eql(12000);
    utils.dehumanize("1.2G").should.eql(1.2e9);
    utils.dehumanize("123n").should.eql(1.23e-7);
  });

  it("roundToPrecision", () => {
    utils.roundToPrecision(123, 1).should.eql(100);
    utils.roundToPrecision(123, 2).should.eql(120);
    utils.roundToPrecision(123, 3).should.eql(123);
    utils.roundToPrecision(123, 1, "ceil").should.eql(200);
    utils.roundToPrecision(123, 2, "ceil").should.eql(130);
    utils.roundToPrecision(123, 3, "ceil").should.eql(123);
    utils.roundToPrecision(0, 3).should.eql(0);
    utils.roundToPrecision(0.00914, 2).should.eql(0.0091);
    utils.roundToPrecision(4087123, 3).should.eql(4090000);
  });

  it("roundToCurrency", () => {
    utils.roundToCurrency(0).should.eql(0);
    utils.roundToCurrency(1).should.eql(1);
    utils.roundToCurrency(1.4).should.eql(1);
    utils.roundToCurrency(1.5).should.eql(2);
    utils.roundToCurrency(1.6).should.eql(2);
    utils.roundToCurrency(2).should.eql(2);
    utils.roundToCurrency(2.5).should.eql(2);
    utils.roundToCurrency(3).should.eql(2);
    utils.roundToCurrency(4).should.eql(5);
    utils.roundToCurrency(5).should.eql(5);
    utils.roundToCurrency(7).should.eql(5);
    utils.roundToCurrency(9).should.eql(10);
    utils.roundToCurrency(11).should.eql(10);
    utils.roundToCurrency(290).should.eql(200);
  });
});
