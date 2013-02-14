// Module export
if (typeof module !== 'undefined') {
  // CommonJS
  module.exports = informant;
} else if (typeof define === 'function' && define.amd) {
  // AMD using a named module
  define('informant', function() {
    return informant;
  });
} else {
  // Normal global
  root['informant'] = informant;
}
