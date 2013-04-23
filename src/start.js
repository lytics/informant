// Universal Module Definition
// see https://github.com/umdjs/umd/blob/master/returnExports.js
(function(root, factory) {
  if (typeof exports === 'object') {
    module.exports = factory(require('analyst'), require('d3'), require('dc'));
  } else if (typeof define === 'function' && define.amd) {
    define([ 'analyst', 'd3', 'dc' ], factory);
  } else {
    root.informant = factory(root.analyst, root.d3, root.dc);
  }
})(this, function(analyst, d3, dc) {
