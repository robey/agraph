module.exports = {
  mode: "production",
  entry: {
    yeri: "./src/yeri.ts",
  },
  output: {
    path: __dirname + "/lib",
    filename: "[name]-browser.js",
    library: "yeri"
  },
  devtool: "source-map",
  resolve: {
    extensions: [ ".ts", ".js" ]
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: "ts-loader", enforce: "pre" }
    ]
  },

  externals: {
  },
};
