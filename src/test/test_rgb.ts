import { quantize4to2, RGB } from "../rgb";

import "should";
import "source-map-support/register";

describe("RGB", () => {
  it("basic", () => {
    const red = RGB.from(0xff0201);
    red.red.should.eql(255);
    red.green.should.eql(2);
    red.blue.should.eql(1);
    red.number().should.eql(0xff0201);
    red.toHex().should.eql("ff0201");
    red.toAnsi().should.eql(9);

    const cyan = RGB.named("cyan");
    cyan.number().should.eql(0x00ffff);
    cyan.toHex().should.eql("00ffff");

    red.blend(cyan, 0.5).number().should.eql(0x808180);
  });

  it("mix3", () => {
    const c1 = RGB.from(0x660033);
    const c2 = RGB.from(0xccff33);
    const c3 = RGB.from(0x0099ff);
    c1.mix3(c2, c3).toHex().should.eql("668877");
  });

  it("distance", () => {
    const black = RGB.from(0);
    const white = RGB.from(0xffffff);
    const red = RGB.from(0xff0000);
    const purple = RGB.from(0xff00ff);
    red.distance(red).should.eql(0);
    red.distance(purple).should.eql(255);
    black.distance(white).should.eql(Math.sqrt(255 * 255 * 3));
  });

  it("quantize4to2", () => {
    quantize4to2([
      RGB.from(0xffffff), RGB.from(0), RGB.from(0), RGB.from(0)
    ]).should.eql([
      RGB.from(0xffffff), RGB.from(0), RGB.from(0), RGB.from(0)
    ]);

    quantize4to2([
      RGB.from(0xffffff), RGB.from(0), RGB.from(0xffffff), RGB.from(0)
    ]).should.eql([
      RGB.from(0xffffff), RGB.from(0), RGB.from(0xffffff), RGB.from(0)
    ]);

    quantize4to2([
      RGB.from(0xffffff), RGB.from(0), RGB.from(0x222222), RGB.from(0x111111)
    ]).should.eql([
      RGB.from(0xffffff), RGB.from(0x111111), RGB.from(0x111111), RGB.from(0x111111)
    ]);

    quantize4to2([
      RGB.from(0xffffff), RGB.from(0x009999), RGB.from(0x007777), RGB.from(0xdddddd)
    ]).should.eql([
      RGB.from(0xeeeeee), RGB.from(0x008888), RGB.from(0x008888), RGB.from(0xeeeeee)
    ]);
  });
});
