extend = (original, extras) ->
  rv = {}
  for k, v of original then rv[k] = v
  for k, v of extras then rv[k] = v
  rv

THEME_DARK =
  # colors for the graph lines
  colors: [ "red", "blue", "orange", "#080", "#c6c", "yellow" ]
  # background color for the whole image
  backgroundColor: "#335"
  # can use a different color for the graph itself
  graphBackgroundColor: "#335"
  # used to emphasize horizontal lines (only in ANSI)
  backgroundHighlightColor: "#333"
  # color of the grid lines
  gridColor: "#555"
  # color of the secondary grid lines (only in SVG)
  gridColor2: "#444"
  # color of label text
  labelColor: "#077"
  # color of title at the top
  titleColor: "#c8f"

THEME_LIGHT =
  colors: [ "red", "blue", "orange", "#3c3", "#c6c", "yellow" ]
  backgroundColor: "#f8f8ff"
  graphBackgroundColor: "#eef"
  backgroundHightlightColor: "#f8f8ff"
  gridColor: "#555"
  gridColor2: "#bbb"
  labelColor: "#555"
  titleColor: "#609"

# default options for AnsiGraph and SvgGraph.
# (some options -- like fonts -- only make sense for SVG, obviously.)
DEFAULT_OPTIONS = extend THEME_DARK,
  # should the graph be a solid shape filled down?
  fill: false
  # should the Y axis be zero-based?
  scaleToZero: true
  # draw a title?
  title: null

DEFAULT_SVG_OPTIONS = extend DEFAULT_OPTIONS,
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
  # font to use for the title
  titleFont: "Avenir Next"
  titleFontSize: 25
  titleFontBaseline: 5

DEFAULT_ANSI_OPTIONS = extend DEFAULT_OPTIONS,
  width: 80
  height: 24
  # ansi really needs fill mode.
  fill: true


exports.THEME_DARK = THEME_DARK
exports.THEME_LIGHT = THEME_LIGHT
exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS
exports.DEFAULT_ANSI_OPTIONS = DEFAULT_ANSI_OPTIONS
exports.DEFAULT_SVG_OPTIONS = DEFAULT_SVG_OPTIONS
