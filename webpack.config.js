const CopyPlugin = require('copy-webpack-plugin');
const ZipPlugin = require('zip-webpack-plugin');
const GeoPublishExtension = require('./geo-publish-extension');
const path = require('path');
require('dotenv').config();

// Publication sur GEO : `npm run geo:publish` (ou `webpack --env publish`)
const definitionPath = path.resolve(__dirname, 'src/plugin.geoext.json');

module.exports = (env = {}) => {
  const publish = !!env.publish || process.env.GEO_PUBLISH === 'true';

  // Nom du zip dérivé de plugin.geoext.json : <name>-<version>.zip (ex: GeoNotes-0.1.0.zip)
  const { name, version } = require(definitionPath);
  const zipName = `${name}-${version}.zip`;

  const plugins = [
    new CopyPlugin({
      patterns: [
        { from: 'src', to: './' }
      ]
    }),
    new ZipPlugin({
      filename: zipName
    })
  ];

  if (publish) {
    plugins.push(
      new GeoPublishExtension({
        definition: definitionPath,
        moduleName: zipName,
        server: process.env.GEO_SERVER,
        clientId: process.env.GEO_CLIENT_ID,
        secret: process.env.GEO_SECRET,
        accessToken: process.env.GEO_ACCESS_TOKEN,
        insecureServer: process.env.GEO_INSECURE === 'true'
      })
    );
  }

  return {
    mode: 'none',
    entry: {},
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'noop.js',
      clean: true
    },
    plugins,
    target: 'node'
  };
};
