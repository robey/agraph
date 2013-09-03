strftime = require 'strftime'
util = require 'util'

utils = require "./utils"
Canvas = require("./canvas").Canvas
GridGraph = require("./grid_graph").GridGraph

DEFAULT_OPTIONS =
  colors: [ "red", "blue", "orange", "#080", "#c6c", "yellow" ]
  backgroundColor: "335"
  backgroundHighlightColor: "333"
  gridColor: "555"
  gridColor2: "444"
  labelColor: "077"
  titleColor: "c8f"

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
    canvas = new Canvas(@options.width, @options.height)
    canvas.fillBackground(@options.backgroundColor)

    # title?
    yOffset = 0
    if @options.title?
      yOffset += 1
      x = Math.round((X_MARGIN + @options.width - @options.title.length) / 2)
      canvas.color(@options.titleColor).at(x, 0).write(@options.title)

    # borders
    canvas.backgroundColor(@options.backgroundColor).color(@options.gridColor)
    for y in [0 ... @graph.height] then canvas.at(X_MARGIN - 1, y + yOffset).write("|")
    for x in [0 ... @graph.width] then canvas.at(x + X_MARGIN, @graph.height + yOffset).write("-")
    canvas.at(X_MARGIN - 1, @graph.height + yOffset).write("+")

    @computeYLabels()
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
      total = Object.keys(@graph.dataTable.datasets).length
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

  drawYLabels: (canvas, yOffset) ->
    for label in @yLabels
      canvas.color(@options.labelColor)
      canvas.at(0, label.y + yOffset).write(label.label)
      # highlight lines
      canvas.color(@options.gridColor2)
      for x in [0 ... @graph.width]
        canvas.at(x + X_MARGIN, label.y + yOffset).write("-")

  drawXLabels: (canvas, yOffset) ->
    dataTable = @graph.scaled
    roundedTimes = dataTable.roundedTimes()
    format = if dataTable.totalInterval > (2 * 24 * 60 * 60) then "%m/%d" else "%H:%M"
    x = 0
    while x < @graph.width - 4
      delta = roundedTimes[x]
      if delta?
        date = new Date((dataTable.timestamps[x] + delta) * 1000)
        canvas.color(@options.labelColor)
        canvas.at(x + X_MARGIN - 2, @graph.height + yOffset + 1).write(strftime.strftime(format, date))
        for y in [0 ... @graph.height]
          console.log util.inspect(@yLabels.filter((label) -> label.y == y))
          ch = if @yLabels.filter((label) -> label.y == y).length > 0 then "+" else "|"
          canvas.color(@options.gridColor2)
          canvas.at(x + X_MARGIN, y + yOffset).write(ch)
        x += 6
      else
        x += 1


exports.AnsiGraph = AnsiGraph
