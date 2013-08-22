
COLOR_CUBE = [ 0x00, 0x5f, 0x87, 0xaf, 0xd7, 0xff ]
GRAY_LINE = [0 ... 24].map (n) -> 8 + 10 * n
ANSI_LINE = [0 ... 16].map (n) ->
  c = if (n & 8) then 0xff else 0x80
  [ (if (n & 1) then c else 0), (if (n & 2) then c else 0), (if (n & 4) then c else 0) ]
# two special cases
ANSI_LINE[8] = ANSI_LINE[7]
ANSI_LINE[7] = [ 0xc0, 0xc0, 0xc0 ]

nearest = (n, table) ->
  rv = -1
  distance = 1000
  for color, index in table
    d = Math.abs(color - n) 
    if d < distance
      distance = d
      rv = index
  rv

nearest_color = (red, green, blue) ->
  [ cube_index, cube_distance ] = nearest_color_cube(red, green, blue)
  [ gray_index, gray_distance ] = nearest_gray(red, green, blue)
  [ ansi_index, ansi_distance ] = nearest_ansi(red, green, blue)
  if cube_distance < gray_distance and cube_distance < ansi_distance
    16 + cube_index
  else if gray_distance < ansi_distance
    232 + gray_index
  else
    ansi_index

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

nearest_ansi = (red, green, blue) ->
  distances = ANSI_LINE.map ([ r, g, b ]) -> color_distance(r, g, b, red, green, blue)
  i = nearest(0, distances)
  [ i, distances[i] ]

color_distance = (red1, green1, blue1, red2, green2, blue2) ->
  Math.sqrt(Math.pow(red1 - red2, 2) + Math.pow(green1 - green2, 2) + Math.pow(blue1 - blue2, 2))

exports.nearest_color = nearest_color
exports.nearest_color_cube = nearest_color_cube
exports.nearest_gray = nearest_gray
exports.nearest_ansi = nearest_ansi
