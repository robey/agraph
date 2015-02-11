// some very simple classes for generating SVG XML files.
// XML! blech!

let util = require("util");

let TEMPLATE = `
<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="%VIEW_WIDTH%mm" height="%VIEW_HEIGHT%mm" viewBox="0 0 %PIXEL_WIDTH% %PIXEL_HEIGHT%" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <desc>%DESCRIPTION%</desc>

  <!-- fill the background -->
  <rect x="0" y="0" width="%PIXEL_WIDTH%" height="%PIXEL_HEIGHT%" fill="%BACKGROUND_COLOR%"/>

  %CONTENT%
</svg>
`

class Rect {
  constructor(box, options = {}) {
    this.box = box;
    this.options = options;
  }

  toXml() {
    let extra = "";
    if (this.options.stroke) extra += `stroke="${this.options.stroke}" `;
    if (this.options.strokeWidth) extra += `stroke-width="${this.options.strokeWidth}" `;
    if (this.options.fill) extra += `fill="${this.options.fill}" `;
    return `<rect x="${Math.round(this.box.x)}" y="${Math.round(this.box.y)}" width="${Math.round(this.box.width)}" height="${Math.round(this.box.height)}" ${extra}/>`;
  }
}

class Line {
  constructor(points, options = {}) {
    this.points = points;
    this.options = options;
  }

  toPath() {
    let discontinuity = true;
    let path = "";
    this.points.forEach((point) => {
      if (point.y == null) {
        discontinuity = true
      } else {
        let command = discontinuity ? "M" : "L";
        path += `${command} ${Math.round(point.x)} ${Math.round(point.y)} `;
        discontinuity = false;
      }
    });
    if (this.options.closeLoop) path += " Z";
    return path;
  }

  toXml() {
    let extra = "";
    if (this.options.stroke) extra += `stroke="${this.options.stroke}" `;
    if (this.options.strokeWidth) extra += `stroke-width="${this.options.strokeWidth}" `;
    if (this.options.strokeLineCap) extra += `stroke-linecap="${this.options.strokeLineCap}" `;
    if (this.options.strokeLineJoin) extra += `stroke-linejoin="${this.options.strokeLineJoin}" `;
    if (this.options.fill) extra += `fill="${this.options.fill}" `;
    return `<path d="${this.toPath()}" ${extra}/>`;
  }
}


class Text {
  constructor(x, y, text, options = {}) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.options = options;
  }

  toXml() {
    let extra = "";
    if (this.options.fontFamily) extra += `font-family="${this.options.fontFamily}" `;
    if (this.options.fontSize) extra += `font-size="${this.options.fontSize}" `;
    if (this.options.fill) extra += `fill="${this.options.fill}" `;
    if (this.options.textAnchor) extra += `text-anchor="${this.options.textAnchor}" `;
    if (this.options.clipPath) extra += `clip-path="url(#${this.options.clipPath})" `;
    return `<text x="${Math.round(this.x)}" y="${Math.round(this.y)}" ${extra}>${this.text}</text>`;
  }
}


class ClipPath {
  constructor(name, rect) {
    this.name = name;
    this.rect = rect;
  }

  toXml() {
    return `<clipPath id="${this.name}">${this.rect.toXml()}</clipPath>`;
  }
}


// collection of other xml items
class Compound {
  constructor(elements) {
    this.elements = elements;
  }

  toXml() {
    return this.elements.map((item) => item.toXml()).join("\n") + "\n";
  }
}


function build(options, items) {
  let content = new Compound(items).toXml();
  return TEMPLATE
    .replace(/%VIEW_WIDTH%/g, options.viewWidth)
    .replace(/%VIEW_HEIGHT%/g, options.viewHeight)
    .replace(/%PIXEL_WIDTH%/g, options.pixelWidth)
    .replace(/%PIXEL_HEIGHT%/g, options.pixelHeight)
    .replace(/%DESCRIPTION%/g, options.description || "(none)")
    .replace(/%BACKGROUND_COLOR%/g, options.backgroundColor)
    .replace(/%CONTENT%/g, content);
}


exports.Rect = Rect
exports.Line = Line
exports.Text = Text
exports.ClipPath = ClipPath
exports.Compound = Compound
exports.build = build
