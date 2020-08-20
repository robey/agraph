// color themes

export interface Theme {
  // in case you don't want the background to be transparent
  backgroundColor: string;

  // for drawing the lines on
  graphBackgroundColor: string;

  // for drawing grid guide lines
  gridColor: string;

  // color for the title at top, if present
  titleColor: string;

  // color for x/y labels
  labelColor: string;

  // color for legend text
  legendColor: string;

  // color sequence for data
  colors: string[];
}

export const LIGHT_THEME: Theme = {
  backgroundColor: "#eeeeff",
  graphBackgroundColor: "#eeeeff",
  gridColor: "#555555",
  titleColor: "#660099",
  labelColor: "#555555",
  legendColor: "#555555",
  colors: [ "red", "blue", "orange", "#3c3", "#c6c", "yellow" ],
};

export const DARK_THEME: Theme = {
  backgroundColor: "#333355",
  graphBackgroundColor: "#333355",
  gridColor: "#999999",
  titleColor: "#ccccff",
  labelColor: "#77cccc",
  legendColor: "#77cccc",
  colors: [ "red", "blue", "orange", "#080", "#c6c", "yellow" ],
};
