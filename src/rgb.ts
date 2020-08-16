import * as antsy from "antsy";

const THIRD = 1 / 3;

// color manipulation, for the ansi graphs
export class RGB {
  constructor(public red: number, public green: number, public blue: number) {
    // pass
  }

  static from(color: number): RGB {
    return new RGB((color >>> 16) & 0xff, (color >>> 8) & 0xff, color & 0xff);
  }

  static named(name: string): RGB {
    return RGB.from(antsy.name_to_rgb(name));
  }

  number(): number {
    return (this.red << 16) + (this.green << 8) + this.blue;
  }

  // quick estimate of Y, using 0.375, 0.5, 0.125
  approximateLuma(): number {
    return (this.red * 3 + this.green * 4 + this.blue) >> 3;
  }

  correctLuma(desired: number): RGB {
    const m = desired / this.approximateLuma();
    return new RGB(Math.round(this.red * m), Math.round(this.green * m), Math.round(this.blue * m));
  }

  toHex(): string {
    return ("000000" + this.number().toString(16)).slice(-6);
  }

  toAnsi(): number {
    return antsy.get_color(this.toHex());
  }

  blend(other: RGB, alpha: number): RGB {
    const nalpha = 1 - alpha;
    return new RGB(
      Math.ceil(this.red * alpha + other.red * nalpha),
      Math.ceil(this.green * alpha + other.green * nalpha),
      Math.ceil(this.blue * alpha + other.blue * nalpha),
    );
  }

  mix3(c1: RGB, c2: RGB): RGB {
    return new RGB(
      Math.round(this.red * THIRD + c1.red * THIRD + c2.red * THIRD),
      Math.round(this.green * THIRD + c1.green * THIRD + c2.green * THIRD),
      Math.round(this.blue * THIRD + c1.blue * THIRD + c2.blue * THIRD),
    );
  }

  distance(other: RGB): number {
    return Math.sqrt(
      Math.pow(this.red - other.red, 2) +
      Math.pow(this.green - other.green, 2) +
      Math.pow(this.blue - other.blue, 2)
    );
  }
}


// weights assume a rough 2:1 ratio on character cells, so we want to prioritize horizontal over vertical
const COMBOS: [ number, number, number ][] = [
  [ 0, 1, 1 ], [ 0, 2, 2 ], [ 0, 3, 2.2 ], [ 1, 2, 2.2 ], [ 1, 3, 2 ], [ 2, 3, 1 ]
];

// turn 4 colors into 2 by merging the closest ones together (special-cased)
export function quantize4to2(colors: RGB[]): RGB[] {
  const distances = COMBOS.map(([ i, j, weight ]) => [ i, j, colors[i].distance(colors[j]) * weight ]);
  const merge = distances.sort((a, b) => a[2] - b[2]).slice(0, 2);
  const rv = colors.slice();

  // two cases for the two closest distances:
  //   - two pairs
  //   - one triplet
  let triplet: [ number, number, number ] | undefined;
  if (merge[0][0] == merge[1][0] || merge[0][1] == merge[1][0]) {
    triplet = [ merge[0][0], merge[0][1], merge[1][1] ];
  } else if (merge[0][0] == merge[1][1] || merge[0][1] == merge[1][1]) {
    triplet = [ merge[0][0], merge[0][1], merge[1][0] ];
  } else {
    // two pairs
    const c1 = colors[merge[0][0]].blend(colors[merge[0][1]], 0.5);
    const c2 = colors[merge[1][0]].blend(colors[merge[1][1]], 0.5);
    rv[merge[0][0]] = rv[merge[0][1]] = c1;
    rv[merge[1][0]] = rv[merge[1][1]] = c2;
    return rv;
  }

  // funny math tricks: figure out the missing color
  const other = 6 - triplet[0] - triplet[1] - triplet[2];
  rv[triplet[0]] = rv[triplet[1]] = rv[triplet[2]] = colors[triplet[0]].mix3(colors[triplet[1]], colors[triplet[2]]);
  return rv;
}
