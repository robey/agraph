util = require 'util'

PHI = (1 + Math.sqrt(5)) / 2

DEFAULT_OPTIONS =
  colors: [ "red", "blue", "orange", "green", "purple", "cyan" ]
  backgroundColor: "#ffd"
  gridColor: "#555"
  labelColor: "#555"
  # width of image, in millimeters:
  viewWidth: 120
  # width of image, in virtual pixels:
  pixelWidth: 800
  # ratio of width to height (should be PHI or 16/9 or similar)
  aspectRatio: 16 / 9
  # padding around svg content, in virtual pixels
  padding: 10
  # padding between elements inside the svg
  innerPadding: 20
  # font to use for labels, size (in virtual pixels), and baseline (vertical alignment)
  font: "Cousine"
  fontSize: 20
  fontBaseline: 2

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
  constructor: (@box, @options) ->

  toXml: ->
    extra = ""
    if @options.stroke? then extra += """stroke="#{@options.stroke}" """
    if @options.strokeWidth? then extra += """stroke-width="#{@options.strokeWidth}" """
    if @options.fill? then extra += """fill="#{@options.fill}" """
    """<rect x="#{@box.x}" y="#{@box.y}" width="#{@box.width}" height="#{@box.height}" #{extra}/>"""

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

    utils.roundToPrecision(number, digits, "ceil")


  draw: ->
    content = """
    <rect x="#{@yLabelBox.x}" y="#{@yLabelBox.y}" width="#{@yLabelBox.width}" height="#{@yLabelBox.height}" stroke="black" stroke-width="1" fill="none"/>
    <rect x="#{@xLabelBox.x}" y="#{@xLabelBox.y}" width="#{@xLabelBox.width}" height="#{@xLabelBox.height}" stroke="black" stroke-width="1" fill="none"/>
    <rect x="#{@legendBox.x}" y="#{@legendBox.y}" width="#{@legendBox.width}" height="#{@legendBox.height}" stroke="black" stroke-width="1" fill="none"/>
    <rect x="#{@graphBox.x}" y="#{@graphBox.y}" width="#{@graphBox.width}" height="#{@graphBox.height}" stroke="black" stroke-width="1" fill="none"/>
    """
    content = @drawGraphBox()
    TEMPLATE
      .replace("%VIEW_WIDTH%", @options.viewWidth)
      .replace("%VIEW_HEIGHT%", @options.viewHeight)
      .replace(/%PIXEL_WIDTH%/g, @options.pixelWidth)
      .replace(/%PIXEL_HEIGHT%/g, @options.pixelHeight)
      .replace(/%DESCRIPTION%/g, "tbd")
      .replace(/%BACKGROUND_COLOR%/g, @options.backgroundColor)
      .replace("%CONTENT%", content)

  drawGraphBox: ->
    new Rect(@graphBox, stroke: @options.gridColor, strokeWidth: 1, fill: "none").toXml()


exports.PHI = PHI
exports.SvgGraph = SvgGraph
