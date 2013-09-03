fs = require 'fs'
optimist = require 'optimist'
Q = require 'q'
request = require 'request'
util = require 'util'

defaults = require "./defaults"
time_series = require "./time_series"
AnsiGraph = require("./ansi_graph").AnsiGraph
SvgGraph = require("./svg_graph").SvgGraph

USAGE = """
Usage: yeri [options] <url(s)/filename(s)...>
"""

optimist = optimist
  .usage(USAGE)
  .options("svg", describe: "generate an SVG file (to stdout)")
  .options("width", alias: "w", describe: "width of ANSI graph", default: defaults.DEFAULT_ANSI_OPTIONS.width)
  .options("height", alias: "h", describe: "height of ANSI graph", default: defaults.DEFAULT_ANSI_OPTIONS.height)
  .options("title", alias: "t", describe: "title of the graph")
  .options("colors", alias: "c", describe: "set list of colors to cycle through", default: defaults.DEFAULT_OPTIONS.colors.join(","))
  .options("fill", alias: "f", describe: "fill graph below line", default: defaults.DEFAULT_OPTIONS.fill)
  .options("zero", alias: "z", describe: "zero-base the Y axis", default: defaults.DEFAULT_OPTIONS.scaleToZero)
  .options("legend", describe: "show legend underneath graph", default: defaults.DEFAULT_OPTIONS.showLegend)


exports.main = ->
  argv = optimist.argv
  urls = argv._
  if argv.help or urls.length == 0
    console.log optimist.help()
    process.exit 0

  options = {}
  for k, v of (if argv.svg then defaults.DEFAULT_SVG_OPTIONS else defaults.DEFAULT_ANSI_OPTIONS) then options[k] = v
  options.width = argv.width
  options.height = argv.height
  options.title = argv.title
  options.colors = argv.colors.split(",")
  options.fill = argv.fill
  options.scaleToZero = argv.zero
  options.showLegend = argv.legend

  collection = new time_series.DataCollection()
  work = for url in urls
    (if (not url.match(/^https?:/)?) and fs.existsSync(url) then readFileQ(url) else get(url))
    .then (data) ->
      collection.loadFromGraphite(JSON.parse(data))
    .fail (error) ->
      console.log "ERROR: #{error}"
      process.exit 1
  Q.all(work).then ->
    if argv.svg
      svg = new SvgGraph(collection.toTable(), options).draw()
      console.log svg
    else
      canvas = new AnsiGraph(collection.toTable(), options).draw()
      for line in canvas.toStrings() then console.log(line)
    process.exit(0)
  .done()

# ----- internals

get = (url) ->
  rv = Q.defer()
  request.get url, (error, response, body) ->
    if error?
      rv.reject(error)
      return
    if response.statusCode != 200
      rv.reject(new Error("HTTP status #{response.statusCode}: #{url}"))
      return
    rv.resolve(body)
  rv.promise

readFileQ = (filename) ->
  rv = Q.defer()
  fs.readFile filename, (error, data) ->
    if error?
      rv.reject(error)
      return
    rv.resolve(data)
  rv.promise
