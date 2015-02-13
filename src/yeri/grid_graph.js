let utils = require("./utils");
let _ = require("lodash");

let DEFAULT_OPTIONS = {
  width: 70,
  height: 20,
  scaleToZero: false,
  fill: true,
  stacked: false
};

// Plot a DataTable into a grid of distinct x/y points, suitable for a
// character display.
// Drawing to an ansi canvas is done in AnsiGraph.
class GridGraph {
  constructor(dataTable, options = {}) {
    this.dataTable = dataTable;
    this.options = _.assign({}, DEFAULT_OPTIONS, options);
    this.width = options.width;
    this.height = options.height;
    // (y, x) containing the dataset name or null.
    // force all elements to be there. js has weird "map" characteristics otherwise:
    this.grid = new Array(this.width * this.height).map((n) => null);
  }

  prepare() {
    if (this.scaled) return;
    this.scaled = this.dataTable.toDataPoints(this.width);
    this.bottom = this.options.scaleToZero ? 0 : this.scaled.minimum();
    let maximum = this.options.stacked ? this.scaled.maximumStacked() : this.scaled.maximum();
    this.top = utils.roundToPrecision(maximum, 2, "ceil");
    if (this.options.bottom) this.bottom = this.options.bottom;
    if (this.options.top) this.top = this.options.top;
    if (this.top == this.bottom) this.top = this.bottom + 1;
    this.interval = (this.top - this.bottom) / (this.height - 1);
  }

  // run each grid element through a transformation function.
  map(f) {
    this.grid = this.grid.map(f);
  }

  draw() {
    this.prepare();
    let offsets = [];
    let fillOffsets = [];
    let names = this.scaled.sortedNames();
    if (this.options.stacked) names = names.reverse();
    names.forEach((name) => {
      let dataset = this.scaled.datasets[name];
      _.range(this.width).forEach((x) => {
        let yDot = dataset[x];
        if (this.options.stacked && offsets[x]) yDot += offsets[x];
        let y = Math.round((yDot - this.bottom) / this.interval);
        if (y >= 0) {
          if (y >= this.height) y = this.height;
          this.put(x, y, name);
          if (this.options.fill) {
            let yBase = 0;
            if (this.options.stacked && fillOffsets[x]) yBase += fillOffsets[x] + 1;
            _.range(yBase, y).forEach((yy) => this.put(x, yy, name));
          }
        }
        offsets[x] = yDot;
        fillOffsets[x] = y;
      });
    });
  }

  put(x, y, value) {
    this.grid[y * this.width + x] = value;
  }

  // get uses y with 0 at the bottom left
  get(x, y) {
    return this.grid[(this.height - y - 1) * this.width + x];
  }

  yValues() {
    return _.range(this.height).map((i) => this.bottom + i * this.interval);
  }

  closestY(value) {
    return Math.round((value - this.bottom) / this.interval);
  }

  dump() {
    return _.range(0, this.height).map((y) => {
      return _.range(0, this.width).map((x) => {
        return this.get(x, y) ? "*" : "_";
      }).join("");
    }).join("\n") + "\n";
  }
  
  toString() {
    return `<GridGraph ${this.width}x${this.height} of ${this.dataTable}>`;
  }
}


exports.GridGraph = GridGraph;
