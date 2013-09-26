utils = require("./utils")

DEFAULT_OPTIONS =
  width: 70
  height: 20
  scaleToZero: false
  fill: true
  stacked: false

# Plot a DataTable into a grid of distinct x/y points, suitable for a character display.
# Drawing to an ansi canvas is done in AnsiGraph.
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
    maximum = if @options.stacked then @scaled.maximumStacked() else @scaled.maximum()
    @top = utils.roundToPrecision(maximum, 2, "ceil")
    if @options.bottom? then @bottom = @options.bottom
    if @options.top? then @top = @options.top
    if @top == @bottom then @top = @bottom + 1
    @interval = (@top - @bottom) / (@height - 1)

  # run each grid element through a transformation function.
  map: (f) ->
    @grid = @grid.map(f)

  draw: ->
    @prepare()
    offsets = []
    fillOffsets = []
    names = @scaled.sortedNames()
    if @options.stacked then names = names.reverse()
    for name in names
      dataset = @scaled.datasets[name]
      for x in [0 ... @width]
        yDot = dataset[x]
        if @options.stacked and offsets[x]? then yDot += offsets[x]
        y = Math.round((yDot - @bottom) / @interval)
        if y >= 0
          if y >= @height then y = @height
          @put(x, y, name)
          if @options.fill
            yBase = 0
            if @options.stacked and fillOffsets[x]? then yBase += fillOffsets[x] + 1
            for yy in [yBase ... y] then @put(x, yy, name)
        offsets[x] = yDot
        fillOffsets[x] = y

  put: (x, y, value) -> @grid[y * @width + x] = value

  # get uses y with 0 at the bottom left
  get: (x, y) -> @grid[(@height - y - 1) * @width + x]

  yValues: ->
    [0 ... @height].map (i) => @bottom + i * @interval

  closestY: (value) ->
    Math.round((value - @bottom) / @interval)

  dump: ->
    lines = for y in [0 ... @height]
      (for x in [0 ... @width] then (if @get(x, y)? then "*" else "_")).join("")
    lines.join("\n") + "\n"

  toString: ->
    "<GridGraph #{@width}x#{@height} of #{@dataTable}>"


exports.GridGraph = GridGraph
