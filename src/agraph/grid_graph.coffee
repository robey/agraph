axes = require "./axes"
canvas = require "./canvas"

DEFAULT_OPTIONS =
  width: 70
  height: 20
  scaleToZero: false
  fill: true
  # for painting to canvas:
  colors: [ "red", "blue", "orange", "green", "purple", "cyan" ]
  backgroundColor: "335"
  backgroundHighlightColor: "333"
  gridColor: "555"
  labelColor: "077"

class GridGraph
  constructor: (@dataTable, options = {}) ->
    @options = {}
    for k, v of DEFAULT_OPTIONS then @options[k] = v
    for k, v of options then @options[k] = v
    @width = options.width
    @height = options.height
    # (y, x) containing the dataset name or null
    @grid = new Array(@width * @height)
    # force all elements to be there. js has weird "map" characteristics otherwise:
    for i in [0 ... @width * @height] then @grid[i] = null

  prepare: ->
    return if @scaled?
    @scaled = @dataTable.toDataPoints(@width)
    @bottom = if @options.scaleToZero then 0 else @scaled.minimum()
    @top = @scaled.maximum()
    if @height > 8
      # leave a 1-unit gap at the top & bottom
      @interval = (@top - @bottom) / (@height - 3)
      @top += @interval
      @bottom -= @interval
    else
      @interval = (@top - @bottom) / (@height - 1)

  # run each grid element through a transformation function.
  map: (f) ->
    @grid = @grid.map(f)

  draw: ->
    @prepare()
    for name in @sortedNames()
      dataset = @scaled.datasets[name]
      for x in [0 ... @width]
        y = Math.round((dataset[x] - @bottom) / @interval)
        @put(x, y, name)
        if @options.fill then for yy in [0 ... y] then @put(x, yy, name)

  put: (x, y, value) -> @grid[y * @width + x] = value

  # get uses y with 0 at the bottom left
  get: (x, y) -> @grid[(@height - y - 1) * @width + x]

  yValues: ->
    [0 ... @height].map (i) => @bottom + i * @interval

  toString: ->
    lines = for y in [0 ... @height]
      (for x in [0 ... @width] then (if @get(x, y)? then "*" else "_")).join("")
    lines.join("\n") + "\n"

  sortedNames: ->
    # FIXME: do the ones with max values first, then so on.
    @prepare()
    Object.keys(@scaled.datasets).sort()


X_MARGIN = 7
Y_MARGIN = 2

paint = (dataTable, inOptions) ->
  options = {}
  for k, v of DEFAULT_OPTIONS then options[k] = v
  for k, v of inOptions then options[k] = v

  graph = new GridGraph(dataTable, options)
  canvas = new canvas.Canvas(graph.width + X_MARGIN, graph.height + Y_MARGIN)
  canvas.fillBackground(options.backgroundColor)

  graph.draw()

  # borders
  canvas.backgroundColor(options.backgroundColor).color(options.gridColor)
  for y in [0 ... graph.height] then canvas.at(X_MARGIN - 1, y).write("|")
  for x in [0 ... graph.width] then canvas.at(x + X_MARGIN, graph.height).write("-")
  canvas.at(X_MARGIN - 1, graph.height).write("+")

  # x/y axis labels
  canvas.color(options.labelColor)
  axes.drawXLabels(canvas, graph.scaled, X_MARGIN, graph.height + 1, graph.width)
  yLabelIndexes = axes.drawYLabels(canvas, 0, 0, graph.height, graph.yValues())
  canvas.backgroundColor(options.backgroundHighlightColor)
  for y in yLabelIndexes then for x in [0 ... graph.width] then canvas.at(x + X_MARGIN, y).write(" ")

  # draw the graph now.
  names = graph.sortedNames()
  graph.map (x) -> if x? then options.colors[names.indexOf(x) % options.colors.length] else null
  for y in [0 ... graph.height] then for x in [0 ... graph.width]
    color = graph.get(x, y)
    if color? then canvas.at(x + X_MARGIN, y).backgroundColor(color).write(" ")

  canvas

exports.GridGraph = GridGraph
exports.paint = paint
