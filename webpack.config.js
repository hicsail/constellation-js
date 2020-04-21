var path = require('path');

module.exports = {
  entry: './lib/constellation.js',
  output: {
    path: path.resolve(__dirname, 'demos/static/js'),
    filename: 'constellation.js',
    library: 'constellation',
  },
  node: {
    fs: 'empty',
    child_process: 'empty',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  stats: {
    colors: true
  },
  devtool: 'source-map'
};
