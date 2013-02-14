/* NPM package builder */

global.d3 = require('d3');

console.log(JSON.stringify({
  'name'        : 'informant',
  'version'     : require('../informant.js').version,
  'description' : 'A drop-in solution for visualizing metrics',
  'repository': {
    'type' : 'git',
    'url'  : 'http://github.com/lytics/informant.git'
  },
  'dependencies': {
    'd3': '2.10.3'
  },
  'devDependencies': {
    'uglify-js' : '1.3.3',
    'less'      : '1.3.1',
    'watchr'    : '2.1.6',
    'vows'      : '0.6.x'
  },
  'scripts': {
    'test': './node_modules/vows/bin/vows'
  }
}, null, 2));
