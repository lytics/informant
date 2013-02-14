// Group

informant.group = function() {
  var group,
    options,
    instances = [];

  group = function(target) {
    // Create an element that contains the whole group
    var group = select(target).append('div')
      .classed('informant group', true)
      .style('position', 'relative');

    // Render each element into it's own positioned wrapper
    instances.forEach(function(instance) {
      var position = geometry(instance),
        wrapper = group.append('div');

      wrapper
        .style('position', 'absolute')
        .style('top', position.top + 'px')
        .style('left', position.left + 'px')
        .classed('wrapper', true)
        .call(instance);

      // Add id attribute if specified
      if (instance.id()) {
        wrapper.attr('id', instance.id());
      }

      // Add classes if specified (use `classed` so as not to wipe out 'wrapper' class)
      if (instance.classes()) {
        wrapper.classed(instance.classes(), true);
      }
    });

    return group;
  };

  elementTypes.forEach(function(name) {
    group[name] = function(opts) {
      var instance = informant[name](),
        attributes = {
          top : 0,
          left: 0
        };

      instances.push(instance);

      addMutators(instance, attributes, [ 'id', 'classes', 'top', 'left' ]);

      // Shortcut mutator for setting both offsets at the same time
      addShortcutMutator(instance, 'position', [ 'top', 'left' ]);

      // Add convenience function for easy chaining (and an accessor for the element's group)
      instance.end = instance.group = function() {
        return group;
      };

      // Apply options after additional mutators have been added
      applyOptions(instance, opts);

      // If an options hash was specified, return the group for easier chaining
      return isUndefined(opts) ? instance : group;
    };
  });

  // Set attribute defaults to current global options
  options = clone(globalOptions);

  // Add mirror mutators for global options
  addMutators(group, options, keys(globalOptions));

  // Shortcut mutator for setting base height/width at the same time
  addShortcutMutator(group, 'baseSize', [ 'baseHeight', 'baseWidth' ]);

  // Elements in the group can be created through an `element` function
  addElementCreator(group);

  // Alias for set funciton itself
  group.render = group;

  return group;
};
