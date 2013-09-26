DEFAULT_OPTIONS =
  width: 70
  height: 20
  scaleToZero: false
  fill: true

# FIXME stack graph?

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
    @top = @scaled.maximum()
    if @options.bottom? then @bottom = @options.bottom
    if @options.top? then @top = @options.top
    if @height > 8 and (not @options.top?) and (not @options.bottom?)
      if @bottom > 0
        # leave a 1-unit gap at the top & bottom
        @interval = (@top - @bottom) / (@height - 3)
        @bottom -= @interval
      else 
        # just the top
        @interval = (@top - @bottom) / (@height - 2)
      @top += @interval
    else
      @interval = (@top - @bottom) / (@height - 1)

  # run each grid element through a transformation function.
  map: (f) ->
    @grid = @grid.map(f)

  draw: ->
    @prepare()
    for name in @scaled.sortedNames()
      dataset = @scaled.datasets[name]
      for x in [0 ... @width]
        y = Math.round((dataset[x] - @bottom) / @interval)
        if y >= 0
          if y >= @height then y = @height
          @put(x, y, name)
          if @options.fill then for yy in [0 ... y] then @put(x, yy, name)

  put: (x, y, value) -> @grid[y * @width + x] = value

  # get uses y with 0 at the bottom left
  get: (x, y) -> @grid[(@height - y - 1) * @width + x]

  yValues: ->
    [0 ... @height].map (i) => @bottom + i * @interval

  dump: ->
    lines = for y in [0 ... @height]
      (for x in [0 ... @width] then (if @get(x, y)? then "*" else "_")).join("")
    lines.join("\n") + "\n"

  toString: ->
    "<GridGraph #{@width}x#{@height} of #{@dataTable}>"


exports.GridGraph = GridGraph
