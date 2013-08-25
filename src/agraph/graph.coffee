
# a set of (x, y) points that make up a line to be graphed.
# the x range must cover the entire graph, but y values of "undefined" (or null) are allowed.
# the x range must contain at least 2 values.
class Dataset
  constructor: (@points) ->
    @points.sort (a, b) -> a[0] - b[0]

  toString: ->
    point_strings = @points.map ([ x, y ]) -> "(#{x}, #{y})"
    "Dataset(#{point_strings.join(', ')})"

  # turn our N points into 'count' points, anchored on each end, but interpolated in the middle.
  # returns a new Dataset with the new values.
  interpolate_to: (count) ->
    ratio = (@points.length - 1) / (count - 1)
    x0 = @points[0][0]
    delta_x = @points[1][0] - x0
    new_delta_x = delta_x * ratio
    new_points = [ @points[0] ]
    for i in [1 ... count]
      x = x0 + new_delta_x * i
      left = Math.max(Math.floor(i * ratio), 0)
      right = Math.min(Math.ceil(i * ratio), @points.length - 1)
      [ xleft, yleft ] = @points[left]
      [ xright, yright ] = @points[right]
      if (not yleft?) or (not yright?)
        y = null
      else if xleft == xright
        y = yleft
      else
        y = yleft + (yright - yleft) * (x - xleft) / (xright - xleft)
      new_points.push [ x , y ]
    new Dataset(new_points)


class Graph
  constructor: (@width, @height) ->




exports.Dataset = Dataset
