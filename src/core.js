/*jshint sub:true */
var root = this,
  d3 = root.d3;

// Namespace object;
var informant = {
  version: '0.1.0'
};

// Global options hash, with default values
var options = {
  baseWidth: 1,
  baseHeight: 1,
  margins: 0
};

// Create a mutator for every option
addMutators(informant, options, keys(options));

// Shortcut mutator for setting base height/width at the same time
addShortcutMutator(informant, 'baseSize', [ 'baseHeight', 'baseWidth' ]);

// Elements can be created through an `element` function
addElementCreator(informant);

// Shortcut for setting options as a hash
informant.config = function(opts) {
  if (!arguments.length) {
    return extend({}, options);
  }

  // Set config options through mutators
  return applyOptions(informant, opts);
};

var elementTypes = [];

informant.defineElement = function(name, definition) {
  if (informant[name]) {
    throw new Error("Attempting to define element that already exists or is protected: '" + name + "'");
  }

  elementTypes.push(name);

  informant[name] = function(opts) {
    var render,
      attributes = {
        height  : 200,
        width   : 200
      };

    // Create DOM node in the target (can be selector, DOM object, or d3 selection),
    // then call the element render method with it
    var instance = function(target) {
      var size = geometry(instance),
        container = select(target).append('div');

      container
        .classed('element element-' + name, true)
        .style('height', size.height + 'px')
        .style('width', size.width + 'px');

      if (instance.header()) {
        container.append('header').html(instance.header());
      }

      container.append('div')
        .classed('content', true)
        .call(render);

      if (instance.footer()) {
        container.append('footer').html(instance.footer());
      }

      return instance;
    };

    // Alias for element function itself
    instance.render = instance;

    // Add basic mutator functions
    addMutators(instance, attributes, [ 'metric', 'width', 'height', 'header', 'footer' ]);

    // Shortcut mutator for setting height/width at the same time
    addShortcutMutator(instance , 'size', [ 'height', 'width' ]);

    // Pass the element instance to the definition so that it can be modified
    render = definition(instance);

    // Element attributes can be specified in an options hash
    return applyOptions(instance, opts);
  };
};

informant.group = function() {
  var group, instances = [];

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

      // Add convenience function for easy chaining
      instance.end = function() {
        return group;
      };

      // Apply options after additional mutators have been added
      applyOptions(instance, opts);

      // If an options hash was specified, return the group for easier chaining
      return isUndefined(opts) ? instance : group;
    };
  });

  // Elements in the group can be created through an `element` function
  addElementCreator(group);

  // Alias for set funciton itself
  group.render = group;

  return group;
};
