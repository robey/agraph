fs = require 'fs'
optimist = require 'optimist'
Q = require 'q'
request = require 'request'
util = require 'util'

defaults = require "./defaults"
time_series = require "./time_series"
utils = require "./utils"
AnsiGraph = require("./ansi_graph").AnsiGraph
SvgGraph = require("./svg_graph").SvgGraph

USAGE = """
Usage: yeri [options] <url(s)/filename(s)...>
"""

DEFAULT_DELAY = 5


optimist = optimist
  .usage(USAGE)
  .options("svg", describe: "generate an SVG file (to stdout)")
  .options("width", alias: "w", describe: "width of ANSI graph", default: defaults.DEFAULT_ANSI_OPTIONS.width)
  .options("height", alias: "h", describe: "height of ANSI graph", default: defaults.DEFAULT_ANSI_OPTIONS.height)
  .options("title", alias: "t", describe: "title of the graph")
  .options("colors", alias: "c", describe: "set list of colors to cycle through")
  .options("fill", alias: "f", describe: "fill graph below line", default: defaults.DEFAULT_OPTIONS.fill)
  .options("stacked", alias: "S", describe: "stack graphs on top of each other")
  .options("zero", alias: "z", describe: "zero-base the Y axis", default: defaults.DEFAULT_OPTIONS.scaleToZero)
  .options("top", describe: "manually set the top edge of the visible graph")
  .options("bottom", describe: "manually set the bottom edge of the visible graph")
  .options("monitor", alias: "m", describe: "monitor mode: display the same query continuously")
  .options("delay", alias: "d", describe: "delay (in seconds) for monitor mode", default: DEFAULT_DELAY)
  .options("legend", describe: "show legend underneath graph", default: defaults.DEFAULT_OPTIONS.showLegend)
  .options("theme", describe: "select color theme")
  .options("graphite", alias: "g", describe: "fetch from a graphite server (assume command-line parameters are targets)")
  .options("server", alias: "s", describe: "(for -g) specify graphite host location")
  .options("from", describe: "(for -g) specify 'from' parameter to graphite")
  .options("until", describe: "(for -g) specify 'until' parameter to graphite")
  .options("debug", describe: "extra debug logging")
  .boolean([ "monitor", "m", "graphite", "g", "debug", "stack", "S" ])

exports.main = ->
  readYerirc()
  .then (argv) ->
    for k, v of optimist.argv then argv[k] = v
    urls = argv._
    if argv.help or urls.length == 0
      console.log optimist.help()
      process.exit 0

    options = {}
    for k, v of (if argv.svg then defaults.DEFAULT_SVG_OPTIONS else defaults.DEFAULT_ANSI_OPTIONS) then options[k] = v
    options.width = argv.width
    options.height = argv.height
    options.title = argv.title
    options.fill = argv.fill
    options.stacked = argv.stacked
    options.scaleToZero = argv.zero
    options.top = utils.dehumanize(argv.top)
    options.bottom = utils.dehumanize(argv.bottom)
    options.showLegend = argv.legend

    if argv.theme?
      if not defaults.THEMES[argv.theme]?
        console.log "ERROR: No such theme: #{argv.theme}"
        console.log "Available themes: #{Object.keys(defaults.THEMES).sort().join(', ')}"
        process.exit 1
    else
      argv.theme = if argv.svg then "light" else "dark"

    options.extend(defaults.THEMES[argv.theme])
    if argv.colors? then options.colors = argv.colors.split(",")

    if argv.graphite then urls = urls.map (url) ->
      if url.match(/^http(s?):/)? or url.indexOf("/") >= 0
        url
      else
        "http://#{argv.server}/render?format=json&target=#{url}" +
          (if argv.from then "&from=" + encodeURIComponent(argv.from) else "") +
          (if argv["until"] then "&until=" + encodeURIComponent(argv["until"]) else "")

    displayGraphs(urls, options)
  .then ->
    process.exit(0)
  .done()

# ----- internals

displayGraphs = (urls, options) ->
  fetchData(urls).then (collection) ->
    if optimist.argv.svg
      svg = new SvgGraph(collection.toTable(), options).draw()
      console.log svg
    else
      canvas = new AnsiGraph(collection.toTable(), options).draw()
      if optimist.argv.monitor then process.stdout.write("\u001b[2J\u001b[H")
      for line in canvas.toStrings() then process.stdout.write(line + "\n")
  .then ->
    if optimist.argv.monitor
      Q.delay(optimist.argv.delay * 1000).then -> displayGraphs(urls, options)
    else
      Q()

fetchData = (urls) ->
  collection = new time_series.DataCollection()
  work = for url in urls
    if optimist.argv.debug then console.log "fetching: #{url}"
    (if (not url.match(/^https?:/)?) and fs.existsSync(url) then readFileQ(url) else get(url))
    .then (data) ->
      if optimist.argv.debug then console.log "data: #{data}"
      collection.loadFromGraphite(JSON.parse(data))
    .fail (error) ->
      console.log "ERROR: #{error}"
      process.exit 1
  Q.all(work).then ->
    collection

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

readYerirc = ->
  # read .yerirc if present
  user_home = process.env["HOME"] or process.env["USERPROFILE"]
  yerirc = "#{user_home}/.yerirc"
  if fs.existsSync(yerirc)
    readFileQ(yerirc).then (data) ->
      JSON.parse(data.toString())
    .fail (error) ->
      console.log "ERROR reading .yerirc: #{error}"
      process.exit 1
  else
    Q({})

readFileQ = (filename) ->
  rv = Q.defer()
  fs.readFile filename, (error, data) ->
    if error? then return rv.reject(error)
    rv.resolve(data)
  rv.promise
