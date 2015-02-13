let defaults = require("./defaults");
let fs = require("fs");
let optimist = require("optimist");
let Promise = require("bluebird");
let request = require("request");
let time_series = require("./time_series");
let util = require("util");
let utils = require("./utils");
let _ = require("lodash");

let AnsiGraph = require("./ansi_graph").AnsiGraph;
let SvgGraph = require("./svg_graph").SvgGraph;

require("source-map-support").install();

let USAGE = `
Usage: yeri [options] <url(s)/filename(s)...>
`;

let DEFAULT_DELAY = 5;

optimist = optimist
  .usage(USAGE)
  .options("svg", { describe: "generate an SVG file (to stdout)" })
  .options("width", { alias: "w", describe: "width of ANSI graph", default: defaults.DEFAULT_ANSI_OPTIONS.width })
  .options("height", { alias: "h", describe: "height of ANSI graph", default: defaults.DEFAULT_ANSI_OPTIONS.height })
  .options("title", { alias: "t", describe: "title of the graph" })
  .options("colors", { alias: "c", describe: "set list of colors to cycle through" })
  .options("fill", { alias: "f", describe: "fill graph below line", default: defaults.DEFAULT_OPTIONS.fill })
  .options("stacked", { alias: "S", describe: "stack graphs on top of each other" })
  .options("zero", { alias: "z", describe: "zero-base the Y axis", default: defaults.DEFAULT_OPTIONS.scaleToZero })
  .options("top", { describe: "manually set the top edge of the visible graph" })
  .options("bottom", { describe: "manually set the bottom edge of the visible graph" })
  .options("monitor", { alias: "m", describe: "monitor mode: display the same query continuously" })
  .options("delay", { alias: "d", describe: "delay (in seconds) for monitor mode", default: DEFAULT_DELAY })
  .options("legend", { describe: "show legend underneath graph", default: defaults.DEFAULT_OPTIONS.showLegend })
  .options("theme", { describe: "select color theme" })
  .options("graphite", { alias: "g", describe: "fetch from a graphite server (assume command-line parameters are targets)" })
  .options("server", { alias: "s", describe: "(for -g) specify graphite host location" })
  .options("from", { describe: "(for -g) specify 'from' parameter to graphite" })
  .options("until", { describe: "(for -g) specify 'until' parameter to graphite" })
  .options("debug", { describe: "extra debug logging" })
  .boolean([ "monitor", "m", "graphite", "g", "debug", "stack", "S" ]);

exports.main = () => {
  let argv = _.assign({}, readYerirc(), optimist.argv);
  let urls = argv._;
  if (argv.help || urls.length == 0) {
    console.log(optimist.help());
    process.exit(1);
  }

  let options = _.assign({}, argv.svg ? defaults.DEFAULT_SVG_OPTIONS : defaults.DEFAULT_ANSI_OPTIONS);
  options.width = argv.width;
  options.height = argv.height;
  options.title = argv.title;
  options.fill = argv.fill;
  options.stacked = argv.stacked;
  options.scaleToZero = argv.zero;
  options.top = utils.dehumanize(argv.top);
  options.bottom = utils.dehumanize(argv.bottom);
  options.showLegend = argv.legend;

  if (argv.theme) {
    if (defaults.THEMES[argv.theme] == null) {
      console.log(`ERROR: No such theme: ${argv.theme}`);
      console.log(`Available themes: ${Object.keys(defaults.THEMES).sort().join(', ')}`);
      process.exit(1);
    }
  } else {
    argv.theme = argv.svg ? "light" : "dark";
  }

  options = _.assign(options, defaults.THEMES[argv.theme]);
  if (argv.colors) options.colors = argv.colors.split(",");

  if (argv.graphite) urls = urls.map((url) => {
    return (url.match(/^http(s?):/) || url.indexOf("/") >= 0) ? url :
      `http://${argv.server}/render?format=json&target=${url}` +
        (argv.from ? "&from=" + encodeURIComponent(argv.from) : "") +
        (argv.until ? "&until=" + encodeURIComponent(argv.until) : "");
  });

  displayGraphs(urls, options).then(() => {
    process.exit(0);
  });
}

// ----- internals

function displayGraphs(urls, options) {
  return fetchData(urls).then((collection) => {
    if (optimist.argv.svg) {
      let svg = new SvgGraph(collection.toTable(), options).draw();
      console.log(svg);
    } else {
      let canvas = new AnsiGraph(collection.toTable(), options).draw();
      if (optimist.argv.monitor) process.stdout.write("\u001b[2J\u001b[H");
      canvas.toStrings().forEach((line) => process.stdout.write(line + "\n"));
    }

    if (optimist.argv.monitor) {
      return Promise.delay(optimist.argv.delay * 1000).then(() => displayGraphs(urls, options));
    } else {
      return Promise.resolve();
    }
  });
}

function fetchData(urls) {
  let collection = new time_series.DataCollection();
  return Promise.all(urls.map((url) => {
    if (optimist.argv.debug) console.log(`fetching: ${url}`);
    return ((!url.match(/^https?:/) && fs.existsSync(url)) ? Promise.resolve(fs.readFileSync(url)) : get(url)).then((data) => {
      if (optimist.argv.debug) console.log(`data: ${data}`);
      data = JSON.parse(data);
      if (data.type == "matrix") {
        if (optimist.argv.debug) console.log("data is from prometheus");
        collection.loadFromPrometheus(data);
      } else {
        if (optimist.argv.debug) console.log("data is (probably) from graphite");
        collection.loadFromGraphite(data);
      }
    }).catch((error) => {
      console.log(`ERROR: ${error}`);
      process.exit(1);
    });
  })).then(() => collection);
}

function get(url) {
  return Promise.promisify(request.get)(url).then(([ response, body ]) => {
    if (response.statusCode != 200) throw new Error(`HTTP status ${response.statusCode}: ${url}`);
    return body;
  });
}

function readYerirc() {
  // read .yerirc if present
  let userHome = process.env["HOME"] || process.env["USERPROFILE"];
  let yerirc = `${userHome}/.yerirc`;
  if (fs.existsSync(yerirc)) {
    try {
      let data = fs.readFileSync(yerirc);
      return JSON.parse(data.toString());
    } catch (error) {
      console.log(`ERROR reading .yerirc: ${error}`);
      process.exit(1);
    }
  } else {
    return {};
  }
}
