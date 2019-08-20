var path = require('path');

module.exports = {
  entry: './lib/constellation.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'constellation.js',
    library: 'constellation',
  },
  node: {
    fs: 'empty'
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
