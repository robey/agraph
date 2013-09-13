antsy = require 'antsy'
strftime = require 'strftime'
util = require 'util'

utils = require "./utils"
;GridGraph = require("./grid_graph").GridGraph

DEFAULT_OPTIONS =
  colors: [ "red", "blue", "orange", "#080", "#c6c", "yellow" ]
  backgroundColor: "335"
  graphBackgroundColor: "#000"
  backgroundHighlightColor: "333"
  gridColor: "555"
  labelColor: "077"
  titleColor: "c8f"
  showLegend: true

X_MARGIN = 7
Y_MARGIN = 2

# Paint a DataTable into an ansi canvas, with labels.
class AnsiGraph
  constructor: (dataTable, options = {}) ->
    @options = {}
    for k, v of DEFAULT_OPTIONS then @options[k] = v
    for k, v of options then @options[k] = v
    graphOptions = {}
    for k, v of @options then graphOptions[k] = v
    graphOptions.width -= X_MARGIN
    graphOptions.height -= Y_MARGIN
    if @options.title? then graphOptions.height -= 1
    if @options.showLegend? then graphOptions.height -= Math.ceil(Object.keys(dataTable.datasets).length / 2)
    @graph = new GridGraph(dataTable, graphOptions)

  draw: ->
    @graph.draw()
    canvas = new antsy.Canvas(@options.width, @options.height)
    canvas.fillBackground(@options.backgroundColor)

    # title?
    yOffset = 0
    if @options.title?
      yOffset += 1
      x = Math.round((X_MARGIN + @options.width - @options.title.length) / 2)
      canvas.color(@options.titleColor).at(x, 0).write(@options.title)

    canvas.backgroundColor(@options.graphBackgroundColor)
    for y in [0 ... @graph.height] then for x in [0 ... @graph.width] then canvas.at(x + X_MARGIN, y + yOffset).write(" ")

    @computeYLabels()
    @computeXLabels()
    @drawGrid(canvas, yOffset)
    @drawYLabels(canvas, yOffset)
    @drawXLabels(canvas, yOffset)

    # draw the graph now.
    names = @graph.scaled.sortedNames()
    @graph.map (x) => if x? then @options.colors[names.indexOf(x) % @options.colors.length] else null
    for y in [0 ... @graph.height] then for x in [0 ... @graph.width]
      color = @graph.get(x, y)
      if color? then canvas.at(x + X_MARGIN, y + yOffset).backgroundColor(color).write(" ")

    # legend?
    if @options.showLegend?
      total = names.length
      leftColumn = Math.ceil(total / 2)
      for name, i in names
        color = @options.colors[names.indexOf(name) % @options.colors.length]
        x = Math.round(@options.width / 2) * Math.floor(i / leftColumn) + 1
        y = @graph.height + Y_MARGIN + yOffset + (i % leftColumn)
        text = " #{name}"[0 ... Math.round(@options.width / 2) - 4]
        canvas.at(x, y).backgroundColor(color).write(" ")
        canvas.color(@options.labelColor).backgroundColor(@options.backgroundColor).write(text)

    canvas

  # ----- internals

  # draw labels along the Y axis, but always skip at least one space between labels, so they don't crowd together, and
  # don't draw the same value twice. build up a list of indices where we drew labels, so we can draw little highlight
  # lines in the background.
  computeYLabels: ->
    labels = @graph.yValues().map(utils.humanize)
    lastIndex = -999
    lastLabel = ""
    @yLabels = []
    for y in [0 ... @graph.height]
      label = labels[@graph.height - y - 1]
      if not (lastIndex == y - 1 or label == lastLabel)
        @yLabels.push { y: y, label: label }
        lastIndex = y
        lastLabel = label
    @yLabels

  computeXLabels: ->
    dataTable = @graph.scaled
    roundedTimes = dataTable.roundedTimes()
    @xLabels = []
    format = if dataTable.totalInterval > (2 * 24 * 60 * 60) then "%m/%d" else "%H:%M"
    x = 0
    while x < @graph.width - 4
      delta = roundedTimes[x]
      if delta?
        date = new Date((dataTable.timestamps[x] + delta) * 1000)
        label = strftime.strftime(format, date)
        @xLabels.push { x: x, label: label }
        x += label.length
      x += 1
    @xLabels

  drawYLabels: (canvas, yOffset) ->
    for label in @yLabels
      canvas.backgroundColor(@options.backgroundColor).color(@options.labelColor)
      canvas.at(0, label.y + yOffset).write(label.label)

  drawXLabels: (canvas, yOffset) ->
    for label in @xLabels
      canvas.backgroundColor(@options.backgroundColor).color(@options.labelColor)
      canvas.at(label.x + X_MARGIN - 2, @graph.height + yOffset + 1).write(label.label)

  drawGrid: (canvas, yOffset) ->
    xLines = {}
    yLines = {}
    for label in @xLabels then xLines[label.x] = true
    for label in @yLabels then yLines[label.y] = true
    font =
      "|": "\u2502"
      "+": "\u253c"
      "-": "\u2500"
      upright: "\u2514"
      uprightdown: "\u251c"
      uprightleft: "\u2534"

    canvas.backgroundColor(@options.backgroundColor).color(@options.gridColor)
    # left edge
    for y in [0 ... @graph.height]
      canvas.at(X_MARGIN - 1, y + yOffset).write(font["|"])
    # bottom edge
    for x in [0 ... @graph.width]
      canvas.at(x + X_MARGIN, @graph.height + yOffset).write(if xLines[x] then font.uprightleft else font["-"])
    # lower left corner
    canvas.at(X_MARGIN - 1, @graph.height + yOffset).write(font.upright)
    # horizontal highlight lines
    canvas.backgroundColor(@options.backgroundHighlightColor)
    for y in Object.keys(yLines).map((n) -> parseInt(n))
      for x in [0 ... @graph.width]
        canvas.at(x + X_MARGIN, y + yOffset).write(" ")
    for x in Object.keys(xLines).map((n) -> parseInt(n))
      for y in [0 ... @graph.height]
        canvas.backgroundColor(if yLines[y] then @options.backgroundHighlightColor else @options.graphBackgroundColor)
        canvas.at(x + X_MARGIN, y + yOffset).write(font["|"])


exports.AnsiGraph = AnsiGraph
