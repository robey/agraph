# some very simple classes for generating SVG XML files.
# XML! blech!

util = require 'util'

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
    """<rect x="#{Math.round(@box.x)}" y="#{Math.round(@box.y)}" width="#{Math.round(@box.width)}" height="#{Math.round(@box.height)}" #{extra}/>"""


class Line
  constructor: (@points, @options = {}) ->

  toPath: ->
    discontinuity = true
    path = ""
    for point in @points
      if not point.y?
        discontinuity = true
      else
        command = if discontinuity then "M" else "L"
        path += "#{command} #{Math.round(point.x)} #{Math.round(point.y)} "
        discontinuity = false
    if @options.closeLoop then path += " Z"
    path

  toXml: ->
    extra = ""
    if @options.stroke? then extra += """stroke="#{@options.stroke}" """
    if @options.strokeWidth? then extra += """stroke-width="#{@options.strokeWidth}" """
    if @options.strokeLineCap? then extra += """stroke-linecap="#{@options.strokeLineCap}" """
    if @options.strokeLineJoin? then extra += """stroke-linejoin="#{@options.strokeLineJoin}" """
    if @options.fill? then extra += """fill="#{@options.fill}" """
    """<path d="#{@toPath()}" #{extra}/>"""


class Text
  constructor: (@x, @y, @text, @options = {}) ->

  toXml: ->
    extra = ""
    if @options.fontFamily? then extra += """font-family="#{@options.fontFamily}" """
    if @options.fontSize? then extra += """font-size="#{@options.fontSize}" """
    if @options.fill? then extra += """fill="#{@options.fill}" """
    if @options.textAnchor? then extra += """text-anchor="#{@options.textAnchor}" """
    if @options.clipPath? then extra += """clip-path="url(##{@options.clipPath})" """
    """<text x="#{Math.round(@x)}" y="#{Math.round(@y)}" #{extra}>#{@text}</text>"""


class ClipPath
  constructor: (@name, @rect) ->

  toXml: ->
    """<clipPath id="#{@name}">#{@rect.toXml()}</clipPath>"""


# collection of other xml items
class Compound
  constructor: (@elements) ->

  toXml: -> @elements.map((item) -> item.toXml()).join("\n") + "\n"


build = (options, items) ->
  content = new Compound(items).toXml()
  TEMPLATE
    .replace(/%VIEW_WIDTH%/g, options.viewWidth)
    .replace(/%VIEW_HEIGHT%/g, options.viewHeight)
    .replace(/%PIXEL_WIDTH%/g, options.pixelWidth)
    .replace(/%PIXEL_HEIGHT%/g, options.pixelHeight)
    .replace(/%DESCRIPTION%/g, options.description or "(none)")
    .replace(/%BACKGROUND_COLOR%/g, options.backgroundColor)
    .replace(/%CONTENT%/g, content)


exports.Rect = Rect
exports.Line = Line
exports.Text = Text
exports.ClipPath = ClipPath
exports.Compound = Compound
exports.build = build
