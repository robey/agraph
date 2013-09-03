
# Yeri

Yeri can fetch time-series data from graphite (or potentially other sources in the future) and draw pretty graphs, either in ANSI (xterm256 terminals) or in SVG (web vector graphics).

Yeri is short for "iyeriwok", an Inuit word meaning "to stare at".

## To-Do

- "canvas" and "xterm256" should be broken out into a reusable module for drawing ANSI into a buffer
- "svg" can be broken out into a reusable module -- but should it? it's really dumb.
