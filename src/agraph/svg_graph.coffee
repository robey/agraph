strftime = require 'strftime'
util = require 'util'
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
  lineWidth: 5
  # font to use for labels, size (in virtual pixels), and baseline (vertical alignment)
  font: "Cousine"
  fontSize: 20
  fontBaseline: 4

TEMPLATE = """
<?xml version="1.0" standalone="no"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg width="%VIEW_WIDTH%mm" height="%VIEW_HEIGHT%mm" viewBox="0 0 %PIXEL_WIDTH% %PIXEL_HEIGHT%" xmlns="http://www.w3.org/2000/svg" version="1.1">
  <desc>%DESCRIPTION%</desc>

  <!-- fill the background -->
  <rect x="0" y="0" width="%PIXEL_WIDTH%" height="%PIXEL_HEIGHT%" fill="%BACKGROUND_COLOR%"/>

  %CONTENT%
</svg>
"""

class Rect
  constructor: (@box, @options = {}) ->

  toXml: ->
    extra = ""
    if @options.stroke? then extra += """stroke="#{@options.stroke}" """
    if @options.strokeWidth? then extra += """stroke-width="#{@options.strokeWidth}" """
    if @options.fill? then extra += """fill="#{@options.fill}" """
    """<rect x="#{@box.x}" y="#{@box.y}" width="#{@box.width}" height="#{@box.height}" #{extra}/>"""

class Line
  constructor: (@points, @options = {}) ->

  toXml: ->
    path = "M #{@points[0].x} #{@points[0].y}"
    for i in [1 ... @points.length]
      path += " L #{@points[i].x} #{@points[i].y}"
    extra = ""
    if @options.stroke? then extra += """stroke="#{@options.stroke}" """
    if @options.strokeWidth? then extra += """stroke-width="#{@options.strokeWidth}" """
    if @options.strokeLineCap? then extra += """stroke-linecap="#{@options.strokeLineCap}" """
    if @options.strokeLineJoin? then extra += """stroke-linejoin="#{@options.strokeLineJoin}" """
    if @options.fill? then extra += """fill="#{@options.fill}" """
    """<path d="#{path}" #{extra}/>"""

class Text
  constructor: (@x, @y, @text, @options = {}) ->

  toXml: ->
    extra = ""
    if @options.fontFamily? then extra += """font-family="#{@options.fontFamily}" """
    if @options.fontSize? then extra += """font-size="#{@options.fontSize}" """
    if @options.fill? then extra += """fill="#{@options.fill}" """
    if @options.textAnchor? then extra += """text-anchor="#{@options.textAnchor}" """
    """<text x="#{@x}" y="#{@y}" #{extra}>#{@text}</text>"""

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


    #utils.roundToPrecision(number, digits, "ceil")


  draw: ->
    content = """
    <rect x="#{@yLabelBox.x}" y="#{@yLabelBox.y}" width="#{@yLabelBox.width}" height="#{@yLabelBox.height}" stroke="black" stroke-width="1" fill="none"/>
    <rect x="#{@xLabelBox.x}" y="#{@xLabelBox.y}" width="#{@xLabelBox.width}" height="#{@xLabelBox.height}" stroke="black" stroke-width="1" fill="none"/>
    <rect x="#{@legendBox.x}" y="#{@legendBox.y}" width="#{@legendBox.width}" height="#{@legendBox.height}" stroke="black" stroke-width="1" fill="none"/>
    <rect x="#{@graphBox.x}" y="#{@graphBox.y}" width="#{@graphBox.width}" height="#{@graphBox.height}" stroke="black" stroke-width="1" fill="none"/>
    """
    content = @drawGraphBox() + "\n" +
      @drawYLabels().map((x) -> x.toXml()).join("\n") + "\n" +
      @drawXLabels().map((x) -> x.toXml()).join("\n") + "\n" +
      @drawDataset(@dataTable.datasets["errors"], "blue").toXml()
    TEMPLATE
      .replace("%VIEW_WIDTH%", @options.viewWidth)
      .replace("%VIEW_HEIGHT%", @options.viewHeight)
      .replace(/%PIXEL_WIDTH%/g, @options.pixelWidth)
      .replace(/%PIXEL_HEIGHT%/g, @options.pixelHeight)
      .replace(/%DESCRIPTION%/g, "tbd")
      .replace(/%BACKGROUND_COLOR%/g, @options.backgroundColor)
      .replace("%CONTENT%", content)


  drawGraphBox: ->
    outline = new Rect(@graphBox, stroke: @options.gridColor, strokeWidth: 1, fill: "none")
    yLines = for y in @yLines
      points = [
        { x: @graphBox.x, y: @yToPixel(y) }
        { x: @graphBox.x + @graphBox.width, y: @yToPixel(y) }
      ]
      new Line(points, stroke: @options.gridColor, strokeWidth: 1, fill: "none")
    xLines = for x in @xLines
      points = [
        { x: @xToPixel(x), y: @graphBox.y }
        { x: @xToPixel(x), y: @graphBox.y + @graphBox.height }
      ]
      new Line(points, stroke: @options.gridColor, strokeWidth: 1, fill: "none")
    outline.toXml() + "\n" +
      yLines.map((x) -> x.toXml()).join("\n") + "\n" +
      xLines.map((x) -> x.toXml()).join("\n") + "\n"

  drawYLabels: ->
    textOffset = Math.round(@options.fontSize / 2) - @options.fontBaseline
    for y in @yLines
      px = @yLabelBox.x + @yLabelBox.width
      py = @yToPixel(y) + textOffset
      new Text(px, py, utils.humanize(y), fontFamily: @options.font, fontSize: @options.fontSize, fill: @options.labelColor, textAnchor: "end")

  drawXLabels: ->
    format = if @dataTable.totalInterval > (2 * 24 * 60 * 60) then "%m/%d" else "%H:%M"
    py = @xLabelBox.y + @options.fontSize - @options.fontBaseline
    for ts in @xLines
      date = strftime.strftime(format, new Date(ts * 1000))
      new Text(@xToPixel(ts), py, date, fontFamily: @options.font, fontSize: @options.fontSize, fill: @options.labelColor, textAnchor: "middle")

    # roundedTimes = @dataTable.roundedTimes()
    # format = if @dataTable.totalInterval > (2 * 24 * 60 * 60) then "%m/%d" else "%H:%M"
    # lastX = @xLabelBox.x - (2 * @options.fontSize)
    # py = @xLabelBox.y + @options.fontSize - @options.fontBaseline
    # labels = []
    # for i in [0 ... roundedTimes.length]
    #   delta = roundedTimes[i]
    #   continue if not delta?
    #   ts = @dataTable.timestamps[i] + delta
    #   px = @xToPixel(ts)
    #   continue if px < lastX + (4 * @options.fontSize)
    #   date = strftime.strftime(format, new Date(ts * 1000))
    #   labels.push(new Text(px, py, date, fontFamily: @options.font, fontSize: @options.fontSize, fill: @options.labelColor, textAnchor: "middle"))
    # labels

  drawDataset: (dataset, color) ->
    points = for i in [0 ... dataset.length]
      { x: @xToPixel(@dataTable.timestamps[i]), y: @yToPixel(dataset[i]) }
    new Line(points, stroke: color, strokeWidth: @options.lineWidth, strokeLineCap: "round", strokeLineJoin: "round", fill: "none")

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
    lastX = @xLabelBox.x - (2 * @options.fontSize)
    xLines = []
    for i in [0 ... roundedTimes.length]
      delta = roundedTimes[i]
      continue if not delta?
      ts = @dataTable.timestamps[i] + delta
      px = @xToPixel(ts)
      continue if px < lastX + (4 * @options.fontSize)
      xLines.push ts
    xLines

  yToPixel: (y) -> 
    scale = 1 - ((y - @bottom) / (@top - @bottom))
    @graphBox.y + scale * @graphBox.height

  xToPixel: (x) ->
    @graphBox.x + ((x - @left) / (@right - @left)) * @graphBox.width



exports.PHI = PHI
exports.SvgGraph = SvgGraph
