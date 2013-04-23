// Namespace object;
var informant = {
  version: '0.1.2'
};

// Global options hash, with default values
var globalOptions = {
  baseWidth     : 1,
  baseHeight    : 1,
  margins       : 0,
  headerPadding : 50,
  footerPadding : 50
};

// Create a mutator for every option
addMutators(informant, globalOptions, Object.keys(globalOptions));

// Shortcut mutator for setting base height/width at the same time
addShortcutMutator(informant, 'baseSize', [ 'baseHeight', 'baseWidth' ]);

// Shortcut for setting options as a hash
informant.config = function(opts) {
  if (!arguments.length) {
    return clone(globalOptions);
  }

  // Set config options through mutators
  return applyOptions(informant, opts);
};
