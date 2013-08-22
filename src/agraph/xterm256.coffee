
COLOR_CUBE = [ 0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff ]
GRAY_LINE = [0 ... 24].map (n) -> 8 + 10 * n

nearest = (n, table) ->
  rv = -1
  distance = 1000
  for color, index in table
    d = Math.abs(color - n) 
    if d < distance
      distance = d
      rv = index
  rv

# returns [ index into color cube, distance ]
nearest_color_cube = (red, green, blue) ->
  redi = nearest(red, COLOR_CUBE)
  greeni = nearest(green, COLOR_CUBE)
  bluei = nearest(blue, COLOR_CUBE)
  distance = color_distance(COLOR_CUBE[redi], COLOR_CUBE[greeni], COLOR_CUBE[bluei], red, green, blue)
  [ 36 * redi + 6 * greeni + bluei, distance ]

nearest_gray = (red, green, blue) ->
  gray = (red + green + blue) / 3
  i = nearest(gray, GRAY_LINE)
  distance = color_distance(GRAY_LINE[i], GRAY_LINE[i], GRAY_LINE[i], red, green, blue)
  [ i, distance ]

color_distance = (red1, green1, blue1, red2, green2, blue2) ->
  Math.sqrt(Math.pow(red1 - red2, 2) + Math.pow(green1 - green2, 2) + Math.pow(blue1 - blue2, 2))


exports.nearest_color_cube = nearest_color_cube
exports.nearest_gray = nearest_gray
