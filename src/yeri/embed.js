let svg_graph = require("./svg_graph");
let time_series = require("./time_series");

// given a list of json objects (picked up via $.getJSON, for example), generate a string of SVG.
function yeriMakeSvg(jsons, options = {}) {
  if (!Array.isArray(jsons)) jsons = [ jsons ];
  let table = time_series.buildFromJsons(jsons);
  let svg = new svg_graph.SvgGraph(table, options).draw();
  return svg;
}

document.yeriMakeSvg = yeriMakeSvg;
