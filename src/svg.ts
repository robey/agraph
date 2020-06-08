// some very simple classes for generating SVG XML files.
// XML! ugh!

const DEFAULT_VIEW_WIDTH = 100;
const DEFAULT_VIEW_HEIGHT = 100;
const DEFAULT_PIXEL_WIDTH = 800;
const DEFAULT_PIXEL_HEIGHT = 800;

const DEFAULT_DESCRIPTION = "(none)";


interface SvgOptions {
  viewWidth?: number;
  viewHeight?: number;
  pixelWidth?: number;
  pixelHeight?: number;

  description?: string;
  backgroundColor?: string;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box {
  x: number;
  y: number;
  height: number;
  width: number;
}

export interface ToXml {
  toXml(indent: number): string[];
}


export interface RectOptions {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
}

export class Rect implements ToXml {
  constructor(public box: Box, public options: RectOptions = {}) {
    // pass
  }

  toXml(indent: number): string[] {
    const fields: string[] = [];
    if (this.options.stroke) fields.push(`stroke="${this.options.stroke}"`);
    if (this.options.strokeWidth) fields.push(`stroke-width="${this.options.strokeWidth}"`);
    if (this.options.fill) fields.push(`fill="${this.options.fill}"`);
    const extra = fields.join(" ");
    return [
      `<rect x="${this.box.x}" y="${this.box.y}" width="${this.box.width}" height="${this.box.height}" ${extra}/>`
    ];
  }
}


export interface LineOptions {
  stroke?: string;
  strokeWidth?: number;
  strokeLineCap?: string;
  strokeLineJoin?: string;
  fill?: string;
  closeLoop?: boolean;
}

export class Line implements ToXml {
  constructor(public points: (Point | undefined)[], public options: LineOptions = {}) {
    // pass
  }

  toPath() {
    let discontinuity = true;
    let path = "";
    for (const point of this.points) {
      if (!point) {
        discontinuity = true;
      } else {
        const command = discontinuity ? "M" : "L";
        path += `${command} ${Math.round(point.x)} ${Math.round(point.y)} `;
        discontinuity = false;
      }
    }
    path = path.trim();
    if (this.options.closeLoop) path += " Z";
    return path;
  }

  toXml(indent: number): string[] {
    const fields: string[] = [];
    if (this.options.stroke) fields.push(`stroke="${this.options.stroke}"`);
    if (this.options.strokeWidth) fields.push(`stroke-width="${this.options.strokeWidth}"`);
    if (this.options.strokeLineCap) fields.push(`stroke-linecap="${this.options.strokeLineCap}"`);
    if (this.options.strokeLineJoin) fields.push(`stroke-linejoin="${this.options.strokeLineJoin}"`);
    if (this.options.fill) fields.push(`fill="${this.options.fill}"`);
    return [ `<path d="${this.toPath()}" ${fields.join(" ")}/>` ];
  }
}


// collection of other xml items
class Compound implements ToXml {
  constructor(public elements: ToXml[]) {
    // make a copy
    this.elements = elements.slice();
  }

  toXml(indent: number): string[] {
    return ([] as string[]).concat(...this.elements.map(item => item.toXml(indent + 1))).map(s => indented(indent, s));
  }
}


export function buildSvg(items: ToXml[], options: SvgOptions = {}): string {
  const viewWidth = options.viewWidth ?? DEFAULT_VIEW_WIDTH;
  const viewHeight = options.viewHeight ?? DEFAULT_VIEW_HEIGHT;
  const pixelWidth = options.pixelWidth ?? DEFAULT_PIXEL_WIDTH;
  const pixelHeight = options.pixelHeight ?? DEFAULT_PIXEL_HEIGHT;
  const description = options.description ?? DEFAULT_DESCRIPTION;
  const content = new Compound(items);

  if (options.backgroundColor) {
    const rect = new Rect({ x: 0, y: 0, width: pixelWidth, height: pixelHeight }, { fill: options.backgroundColor });
    content.elements.push(rect);
  }

  return `<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="${viewWidth}" height="${viewHeight}mm" viewBox="0 0 ${pixelWidth} ${pixelHeight}" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <desc>${description}</desc>
${content.toXml(1)}
</svg>
`;
}

const SPACES = "                                        ";
function indented(level: number, s: string): string {
  return SPACES.slice(0, level * 2) + s;
}