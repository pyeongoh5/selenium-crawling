const path = require('path');
module.exports = {
  entry: ['./src/index.js'],
  target: 'node',
  mode: 'development',
  output: {
    // options related to how webpack emits results
    path: path.resolve(__dirname, "dist"), // string
    // the target directory for all output files
    // must be an absolute path (use the Node.js path module)
    filename: "bundle.js", // string
    // the name of the exported library
    libraryTarget: "commonjs2", // universal module definition
    // the type of the exported library
    /* Advanced output configuration (click to show) */
    /* Expert output configuration (on own risk) */
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        },
      }
    ]
  }
}