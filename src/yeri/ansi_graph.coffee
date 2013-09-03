strftime = require 'strftime'

util = require "./util"
Canvas = require("./canvas").Canvas
GridGraph = require("./grid_graph").GridGraph

DEFAULT_OPTIONS =
  colors: [ "red", "blue", "orange", "green", "purple", "cyan" ]
  backgroundColor: "335"
  backgroundHighlightColor: "333"
  gridColor: "555"
  labelColor: "077"

X_MARGIN = 7
Y_MARGIN = 2

# Paint a DataTable into an ansi canvas, with labels.
class AnsiGraph
  constructor: (dataTable, options = {}) ->
    @options = {}
    for k, v of DEFAULT_OPTIONS then @options[k] = v
    for k, v of options then @options[k] = v
    @graph = new GridGraph(dataTable, options)

  draw: ->
    @graph.draw()
    canvas = new Canvas(@graph.width + X_MARGIN, @graph.height + Y_MARGIN)
    canvas.fillBackground(@options.backgroundColor)

    # borders
    canvas.backgroundColor(@options.backgroundColor).color(@options.gridColor)
    for y in [0 ... @graph.height] then canvas.at(X_MARGIN - 1, y).write("|")
    for x in [0 ... @graph.width] then canvas.at(x + X_MARGIN, @graph.height).write("-")
    canvas.at(X_MARGIN - 1, @graph.height).write("+")

    @drawXLabels(canvas)
    @drawYLabels(canvas)

    # draw the graph now.
    names = @graph.scaled.sortedNames()
    @graph.map (x) => if x? then @options.colors[names.indexOf(x) % @options.colors.length] else null
    for y in [0 ... @graph.height] then for x in [0 ... @graph.width]
      color = @graph.get(x, y)
      if color? then canvas.at(x + X_MARGIN, y).backgroundColor(color).write(" ")
    canvas

  # ----- internals

  # draw labels along the Y axis, but always skip at least one space between labels, so they don't crowd together, and
  # don't draw the same value twice. build up a list of indices where we drew labels, so we can draw little highlight
  # lines in the background.
  drawYLabels: (canvas) ->
    canvas.color(@options.labelColor)
    yLabels = @graph.yValues().map(util.humanize)
    lastIndex = -1
    lastLabel = ""
    labelIndexes = []
    for y in [0 ... @graph.height]
      label = yLabels[@graph.height - y - 1]
      if not (lastIndex == y - 1 or label == lastLabel)
        canvas.at(0, y).write(label)
        lastIndex = y
        lastLabel = label
        labelIndexes.push y

    # highlight lines
    canvas.backgroundColor(@options.backgroundHighlightColor)
    for y in labelIndexes then for x in [0 ... @graph.width] then canvas.at(x + X_MARGIN, y).write(" ")

  drawXLabels: (canvas) ->
    canvas.color(@options.labelColor)
    dataTable = @graph.scaled
    roundedTimes = dataTable.roundedTimes()
    format = if dataTable.totalInterval > (2 * 24 * 60 * 60) then "%m/%d" else "%H:%M"
    x = 0
    while x < @graph.width - 4
      delta = roundedTimes[x]
      if delta?
        date = new Date((dataTable.timestamps[x] + delta) * 1000)
        canvas.at(x + X_MARGIN - 2, @graph.height + 1).write(strftime.strftime(format, date))
        x += 6
      else
        x += 1


exports.AnsiGraph = AnsiGraph
