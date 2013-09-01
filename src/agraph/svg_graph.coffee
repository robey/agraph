strftime = require 'strftime'
util = require 'util'

svg = require "./svg"
utils = require "./utils"

PHI = (1 + Math.sqrt(5)) / 2

DEFAULT_OPTIONS =
  colors: [ "red", "blue", "orange", "green", "purple", "cyan" ]
  backgroundColor: "#ffe"
  gridColor: "#555"
  labelColor: "#555"
  # width of image, in millimeters:
  viewWidth: 120
  # width of image, in virtual pixels:
  pixelWidth: 800
  # ratio of width to height (should be PHI or 16/9 or similar)
  aspectRatio: 16 / 9
  # padding around svg content, in virtual pixels
  padding: 20
  # padding between elements inside the svg
  innerPadding: 10
  # thickness of line to use for drawing the data  
  lineWidth: 3
  # font to use for labels, size (in virtual pixels), and baseline (vertical alignment)
  font: "Cousine"
  fontSize: 20
  fontBaseline: 4


class SvgGraph
  constructor: (@dataTable, options = {}) ->
    @options = {}
    for k, v of DEFAULT_OPTIONS then @options[k] = v
    for k, v of options then @options[k] = v
    @width = options.width
    @height = options.height

    # calculate sizes of things:
    @options.pixelHeight = Math.round(@options.pixelWidth / @options.aspectRatio)
    @options.viewHeight = Math.round(@options.viewWidth / @options.aspectRatio)
    @legendLines = Math.ceil(Object.keys(@dataTable.datasets).length / 2)
    # y-axis labels need width for 6 characters.
    @yLabelBox =
      x: @options.padding
      y: @options.padding
      width: 4 * @options.fontSize
    # graph is right of y-axis labels, with padding on the right.
    @graphBox =
      x: @yLabelBox.x + @yLabelBox.width + @options.innerPadding
      y: @options.padding
    @graphBox.width = @options.pixelWidth - @options.padding - @graphBox.x
    # legend is below the graph
    @legendBox =
      x: @graphBox.x
      width: @graphBox.width
      height: @legendLines * @options.fontSize
    @legendBox.y = @options.pixelHeight - @options.padding - @legendBox.height
    # x-axis labels are above the legend box
    @xLabelBox =
      x: @graphBox.x
      width: @graphBox.width
      height: @options.fontSize
    @xLabelBox.y = @legendBox.y - @options.innerPadding - @xLabelBox.height
    @graphBox.height = @xLabelBox.y - @options.innerPadding - @graphBox.y
    @yLabelBox.height = @graphBox.height

    # find a good bounding box for the graph itself
    @top = utils.roundToPrecision(@dataTable.maximum(), 2, "ceil")
    @bottom = utils.roundToPrecision(@dataTable.minimum(), 2, "floor")
    @left = @dataTable.timestamps[0]
    @right = @dataTable.timestamps[@dataTable.last]

    # compute x/y guidelines
    @yLines = @computeYLines()
    @xLines = @computeXLines()

  draw: ->
    content = [ @drawGraphBox(), new svg.Compound(@drawYLabels()), new svg.Compound(@drawXLabels()) ]
    colorIndex = 0
    for name in @dataTable.sortedNames()
      content.push @drawDataset(@dataTable.datasets[name], @options.colors[colorIndex])
      colorIndex = (colorIndex + 1) % @options.colors.length
    svg.build(@options, content)

  # ----- internals

  drawGraphBox: ->
    outline = new svg.Rect(@graphBox, stroke: @options.gridColor, strokeWidth: 1, fill: "none")
    yLines = for y in @yLines
      points = [
        { x: @graphBox.x, y: @yToPixel(y) }
        { x: @graphBox.x + @graphBox.width, y: @yToPixel(y) }
      ]
      new svg.Line(points, stroke: @options.gridColor, strokeWidth: 1, fill: "none")
    xLines = for x in @xLines
      points = [
        { x: @xToPixel(x), y: @graphBox.y }
        { x: @xToPixel(x), y: @graphBox.y + @graphBox.height }
      ]
      new svg.Line(points, stroke: @options.gridColor, strokeWidth: 1, fill: "none")
    new svg.Compound([ outline ].concat(yLines, xLines))

  drawYLabels: ->
    textOffset = Math.round(@options.fontSize / 2) - @options.fontBaseline
    for y in @yLines
      px = @yLabelBox.x + @yLabelBox.width
      py = @yToPixel(y) + textOffset
      new svg.Text(px, py, utils.humanize(y), fontFamily: @options.font, fontSize: @options.fontSize, fill: @options.labelColor, textAnchor: "end")

  drawXLabels: ->
    format = if @dataTable.totalInterval > (2 * 24 * 60 * 60) then "%m/%d" else "%H:%M"
    py = @xLabelBox.y + @options.fontSize - @options.fontBaseline
    for ts in @xLines
      date = strftime.strftime(format, new Date(ts * 1000))
      new svg.Text(@xToPixel(ts), py, date, fontFamily: @options.font, fontSize: @options.fontSize, fill: @options.labelColor, textAnchor: "middle")

  drawDataset: (dataset, color) ->
    points = for i in [0 ... dataset.length]
      { x: @xToPixel(@dataTable.timestamps[i]), y: @yToPixel(dataset[i]) }
    new svg.Line(points, stroke: color, strokeWidth: @options.lineWidth, strokeLineCap: "round", strokeLineJoin: "round", fill: "none")

  computeYLines: ->
    yInterval = utils.roundToCurrency((@top - @bottom) / 5)
    yLines = []
    y = utils.roundToPrecision(@bottom, 1, "floor")
    while y <= @bottom then y += yInterval
    while y < @top
      yLines.push y
      y += yInterval
    yLines.push @top
    yLines.push @bottom
    yLines

  computeXLines: ->
    roundedTimes = @dataTable.roundedTimes()
    lastX = @xLabelBox.x - (3 * @options.fontSize)
    xLines = []
    for i in [0 ... roundedTimes.length]
      delta = roundedTimes[i]
      continue if not delta?
      ts = @dataTable.timestamps[i] + delta
      px = @xToPixel(ts)
      continue if px < lastX + (4 * @options.fontSize)
      xLines.push ts
      lastX = px
    xLines

  yToPixel: (y) -> 
    scale = 1 - ((y - @bottom) / (@top - @bottom))
    @graphBox.y + scale * @graphBox.height

  xToPixel: (x) ->
    @graphBox.x + ((x - @left) / (@right - @left)) * @graphBox.width



exports.PHI = PHI
exports.SvgGraph = SvgGraph
