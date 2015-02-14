let util = require("util");
let utils = require("./utils");
let _ = require("lodash");

let MINUTES = 60;
let HOURS = 60 * MINUTES;
let DAYS = 24 * HOURS;

// grr.
function sortInts(list) {
  return list.map((n) => parseInt(n)).sort((a, b) => a - b);
}

// for a given total interval, find a good granularity to round timestamps to.
function timeGranularityFor(interval) {
  if (interval >= 24 * HOURS) return 4 * HOURS;
  if (interval > 8 * HOURS) return 1 * HOURS;
  if (interval > 2 * HOURS) return 15 * MINUTES;
  if (interval > 30 * MINUTES) return 5 * MINUTES;
  return 1 * MINUTES;
}

class DataCollection {
  constructor() {
    // name -> { timestamp: value }
    this.data = {};
  }

  // add data of the form [ [x, y]... ] or [ {x, y}... ]
  addPoints(name, points) {
    if (!this.data[name]) this.data[name] = {};
    if (Array.isArray(points[0])) {
      points.forEach(([ ts, y]) => {
        this.data[name][ts] = y;
      });
    } else {
      points.forEach((p) => {
        this.data[name][parseInt(p.x)] = parseInt(p.y);
      });
    }
    return this;
  }

  // graphite: [ { target, datapoints: [ [ y, timestamp ], ... ] } ]
  loadFromGraphite(data) {
    data.forEach((item) => {
      this.addPoints(item.target, item.datapoints.map(([y, ts]) => [ts, y]));
    });
    return this;
  }

  // prometheus: { type: "matrix", value: [ ... ] }
  // each value: { "metric": { "__name__": "channel_count" }, "values": [ [ ts, "y" ] ] }
  loadFromPrometheus(data) {
    if (data.type != "matrix") throw new Error("Unable to parse prometheus data");
    data.value.forEach((metric) => {
      this.addPoints(metric.metric.__name__, metric.values.map((datum) => [ datum[0], parseInt(datum[1]) ]));
    });
  }

  // normalize all the intervals and fill in blanks ("undefined") for missing data.
  // end result should be a perfect rectangle of data.
  toTable() {
    let tset = {};
    for (let name in this.data) {
      for (let ts in this.data[name]) {
        tset[ts] = true;
      }
    }
    let timestamps = sortInts(Object.keys(tset));
    if (timestamps.length > 1) {
      // calculate smallest interval, and fill in gaps so all intervals are equal.
      let deltas = _.range(1, timestamps.length).map((i) => timestamps[i] - timestamps[i - 1]);
      let interval = sortInts(deltas)[0];
      for (let i = 1; i < timestamps.length; ) {
        if (timestamps[i] - timestamps[i - 1] > interval) {
          if (timestamps[i] - timestamps[i - 1] > interval * 100) throw new Error("Data points are too distant on the time scale");
          timestamps.push(timestamps[i - 1] + interval);
          timestamps = sortInts(timestamps);
        } else {
          i++;
        }
      }
    }
    let names = Object.keys(this.data);
    let datasets = {};
    names.forEach((name) => {
      datasets[name] = [];
    });
    timestamps.forEach((ts) => {
      names.forEach((name) => {
        datasets[name].push(this.data[name][ts]);
      });
    });
    return new DataTable(timestamps, datasets);
  }
}


class DataTable {
  // timestamps is a sorted list of time values, at equal intervals.
  // datasets is { name -> [values...] }, where the values correspond 1-to-1 with the timestamps.
  constructor(timestamps, datasets = {}) {
    this.timestamps = timestamps;
    this.datasets = datasets;
    this.last = this.timestamps.length - 1;
    this.interval = this.timestamps[1] - this.timestamps[0];
    this.totalInterval = this.interval * this.last;
  }

  // adjust our current timestamps into N new equally-spaced timestamps covering the same range. the new datasets will
  // be anchored on each end, but interpolated in the middle. if the datasets are being compressed by a factor of more
  // than 2, sets of points will be merged by average-area.
  // returns a new DataTable.
  toDataPoints(n) {
    let newInterval = this.totalInterval / (n - 1);
    let newTimestamps = _.range(0, n).map((i) => this.timestamps[0] + newInterval * i);
    if (n * 2 <= this.timestamps.length) return this.toAveragedDataPoints(n, newInterval, newTimestamps);
    let newDatasets = {};
    Object.keys(this.datasets).map((name) => {
      newDatasets[name] = [ this.datasets[name][0] ].concat(_.range(1, n).map((i) => this.interpolate(newTimestamps[i], this.datasets[name])));
    });
    return new DataTable(newTimestamps, newDatasets);
  }

  toCsv() {
    let names = Object.keys(this.datasets).sort();
    let rv = [ `# timestamp,${names.join(',')}` ].concat(_.range(this.timestamps.length).map((i) => {
      return `${this.timestamps[i]},` + names.map((name) => this.datasets[name][i] || "null").join(",");
    }));
    return rv.join("\n") + "\n";
  }

  minimum() {
    return _.min(_.values(this.datasets).map((dataset) => _.min(dataset.filter((n) => n != null))));
  }

  maximum() {
    return _.max(_.values(this.datasets).map((dataset) => _.max(dataset.filter((n) => n != null))));
  }

  maximumStacked() {
    let datasets = _.values(this.datasets);
    return _.max(_.range(this.timestamps.length).map((i) => datasets.map((dataset) => dataset[i] || 0).reduce((a, b) => a + b)));
  }

  // for each time interval, if it contains a timestamp that can be rounded
  // to a "nice" granularity, return the amount to add to the interval to
  // make it nice. if it doesn't cover a good timestamp, return null.
  roundedTimes() {
    return this.timestamps.map((ts) => {
      let minTime = ts - (this.interval / 2);
      let maxTime = ts + (this.interval / 2);
      let g = timeGranularityFor(this.totalInterval);
      let lowTime = Math.floor(ts / g) * g;
      let hiTime = lowTime + g;
      return (lowTime >= minTime) ? lowTime - ts : (hiTime <= maxTime ? hiTime - ts : null);
    });
  }

  // list the dataset names in the order they should be drawn (with the highest-valued line first)
  sortedNames() {
    let names = [];
    let datasets = {};
    _.forIn(this.datasets, (v, k) => datasets[k] = v);
    while (Object.keys(datasets).length > 0) {
      // find the dataset that has the highest value most often.
      let scores = {};
      let datasetNames = Object.keys(datasets);
      datasetNames.forEach((name) => scores[name] = 0);
      _.range(0, this.timestamps.length).forEach((i) => {
        scores[_.sortBy(datasetNames, (name) => -datasets[name][i])[0]] += 1;
      });
      let winner = _.sortBy(datasetNames, (name) => -scores[name])[0];
      names.push(winner);
      delete datasets[winner];
    }
    return names;
  }

  toString() {
    return `<DataTable of ${this.timestamps.length} [${this.timestamps[0]}..${this.timestamps[this.last]}] ${Object.keys(this.datasets).join(', ')}>`;
  }

  // ----- internals:

  // like interpolation, but if we are creating fewer points, we want to compute running averages.
  toAveragedDataPoints(n, newInterval, newTimestamps) {
    let newDatasets = {};
    Object.keys(this.datasets).forEach((name) => newDatasets[name] = []);

    _.range(0, n).forEach((i) => {
      // find left/right bounding timestamps, and the nearest existing data point on either side of each.
      let constrain = (ts) => Math.min(Math.max(ts, this.timestamps[0]), this.timestamps[this.last]);
      let tsLeft = constrain(newTimestamps[i] - newInterval / 2);
      let tsRight = constrain(newTimestamps[i] + newInterval / 2);
      let [ left0, left1 ] = this.fencepostsFor(tsLeft);
      let [ right0, right1 ] = this.fencepostsFor(tsRight);

      _.forIn(this.datasets, (dataset, name) => {
        // first, interpolate Y as it would exist on the bounding timestamps.
        let yLeft = this.interpolate(tsLeft, dataset, left0, left1);
        let yRight = this.interpolate(tsRight, dataset, right0, right1);

        // sum the area under the points from y_left to y_right.
        // (another way to think of it: compute the weighted average of the points.)
        // first, the left and right edges:
        let computeArea = (ts0, ts1, y0, y1) => ((y0 || 0) + (y1 || 0)) / 2 * (ts1 - ts0);
        let area = computeArea(tsLeft, this.timestamps[left1], yLeft, dataset[left1]) +
          computeArea(this.timestamps[right0], tsRight, dataset[right0], yRight);

        // then, all regular-width intervals in-between:
        let anyExist = false;
        _.range(left1, right0).forEach((j) => {
          if (dataset[j] != null || dataset[j + 1] != null) anyExist = true;
          area += computeArea(this.timestamps[j], this.timestamps[j + 1], dataset[j], dataset[j + 1]);
        });

        newDatasets[name].push(anyExist ? area / (tsRight - tsLeft) : null);
      });
    });
    return new DataTable(newTimestamps, newDatasets);
  }

  // interpolate the data point for a new timestamp and an existing dataset
  interpolate(ts, dataset, left = null, right = null) {
    if (!left) [ left, right ] = this.fencepostsFor(ts);
    if (dataset[left] == null || dataset[right] == null) return null;
    if (left == right) return dataset[left];
    return dataset[left] + (dataset[right] - dataset[left]) * (ts - this.timestamps[left]) / this.interval;
  }

  // figure out the left and right fenceposts for a timestamp
  fencepostsFor(t) {
    let ratio = (t - this.timestamps[0]) / this.totalInterval;
    let left = Math.max(0, Math.min(this.last, Math.floor(ratio * this.last)));
    let right = Math.max(0, Math.min(this.last, Math.ceil(ratio * this.last)));
    return [ left, right ];
  }
}


// given a list of json objects (one per dataset), build a DataTable suitable for graphing.
function buildFromJsons(jsons) {
  let collection = new DataCollection();
  jsons.forEach((data) => {
    if (data.type == "matrix") {
      // prometheus
      collection.loadFromPrometheus(data);
    } else {
      // graphite?
      collection.loadFromGraphite(data);
    }
  });
  return collection.toTable();
}


exports.buildFromJsons = buildFromJsons;
exports.DataCollection = DataCollection;
exports.DataTable = DataTable;
