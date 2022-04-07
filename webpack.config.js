var path = require('path');

module.exports = {
  devServer: {
    host: '0.0.0.0',
    allowedHosts: 'all'
  },
  entry: './lib/constellation.js',
  output: {
    path: path.resolve(__dirname, 'demos/static/js'),
    filename: 'constellation.js',
    library: 'constellation',
  },
  resolve: {
    fallback: {
      fs: false
    }
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
