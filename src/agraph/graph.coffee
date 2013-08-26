
# a set of (x, y) points that make up a line to be graphed.
# the x range must cover the entire graph, but y values of "undefined" (or null) are allowed.
# the x range must contain at least 2 values.
class Dataset
  constructor: (@points) ->
    if Object.prototype.toString.call(@points[0]).match(/Array/)?
      @points = @points.map ([ x, y ]) -> { x, y }
    @points.sort (a, b) -> a.x - b.x
    @last = @points.length - 1
  
  toString: ->
    point_strings = @points.map (p) -> "(#{p.x}, #{p.y})"
    "Dataset(#{point_strings.join(', ')})"

  # turn our N points into 'count' points, anchored on each end, but interpolated in the middle.
  # returns a new Dataset with the new values.
  interpolate_to: (count) ->
    if count * 2 <= @points.length then return @compact_to(count)
    delta_x = (@points[@last].x - @points[0].x) / (count - 1)
    new_points = [ @points[0] ]
    for i in [1 ... count]
      x = @points[0].x + delta_x * i
      new_points.push @interpolate_for_x(x)
    new Dataset(new_points)

  # like interpolate, but if we are creating fewer points, we want to compute running averages.
  compact_to: (count) ->
    delta_x = (@points[@last].x - @points[0].x) / (count - 1)
    new_points = [ ]
    for i in [0 ... count]
      x = @points[0].x + delta_x * i
      # first, interpolate Y as it would exist on the left & right edges of our delta_x-width zone.
      x0 = x - delta_x / 2
      x1 = x + delta_x / 2
      [ left0, right0 ] = @fenceposts_for_x(x0)
      [ left1, right1 ] = @fenceposts_for_x(x1)
      p_left = @interpolate_for_x(x0, left0, right0)
      p_right = @interpolate_for_x(x1, left1, right1)
      # sum the area under the points from p_left to p_right
      area = 0
      width = 0
      for j in [left0 ... right1]
        p0 = if j == left0 then p_left else @points[j]
        p1 = if j + 1 == right0 then p_right else @points[j + 1]
        # area is delta-x * average(p0.y, p1.y)
        area += (p1.x - p0.x) * (p0.y + p1.y) / 2
        width += (p1.x - p0.x)
      new_points.push { x: x, y: area / width }
    new Dataset(new_points)

  # ----- internals:

  # interpolate a new y value for the given x value
  interpolate_for_x: (x, left = null, right = null) ->
    if not left?
      [ left, right ] = @fenceposts_for_x(x)
    x = Math.min(Math.max(x, @points[left].x), @points[right].x)

    if (not @points[left].y?) or (not @points[right].y?)
      y = null
    else if left == right
      y = @points[left].y
    else
      delta_y = @points[right].y - @points[left].y
      delta_x = @points[right].x - @points[left].x
      y = @points[left].y + delta_y * (x - @points[left].x) / delta_x
    { x, y }

  # figure out the left and right fenceposts for an x
  fenceposts_for_x: (x) ->
    ratio = (x - @points[0].x) / (@points[@last].x - @points[0].x)
    left = Math.max(0, Math.min(@last, Math.floor(ratio * @last)))
    right = Math.max(0, Math.min(@last, Math.ceil(ratio * @last)))
    [ left, right ]






class Graph
  constructor: (@width, @height) ->




exports.Dataset = Dataset
