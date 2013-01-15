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

// Add path interpolator to d3
// Note: this must come after the core file is included, otherwise d3 will be undefined
d3.interpolators.push(function(a, b) {
  var isPath, isArea, interpolator, ac, bc, an, bn;

  // Create a new array of a given length and fill it with the given value
  function fill(value, length) {
    return d3.range(length)
      .map(function() {
        return value;
      });
  }

  // Extract an array of coordinates from the path string
  function extractCoordinates(path) {
    return path.substr(1, path.length - (isArea ? 2 : 1)).split('L');
  }

  // Create a path from an array of coordinates
  function makePath(coordinates) {
    return 'M' + coordinates.join('L') + (isArea ? 'Z' : '');
  }

  // Buffer the smaller path with coordinates at the same position
  function bufferPath(p1, p2) {
    var d = p2.length - p1.length;

    if (isArea) {
      return fill(p1[0], d/2).concat(p1, fill(p1[p1.length - 1], d/2));
    } else {
      return fill(p1[0], d).concat(p1);
    }
  }

  isPath = /M-?\d*\.?\d*,-?\d*\.?\d*(L-?\d*\.?\d*,-?\d*\.?\d*)*Z?/;

  if (isPath.test(a) && isPath.test(b)) {
    isArea = a[a.length - 1] === 'Z';
    ac = extractCoordinates(a);
    bc = extractCoordinates(b);
    an = ac.length;
    bn = bc.length;

    if (an > bn) {
      bc = bufferPath(bc, ac);
    }

    if (bn > an) {
      ac = bufferPath(ac, bc);
    }

    // Create an interpolater with the buffered paths (if both paths are of the same length,
    // the function will end up being the default string interpolator)
    interpolator = d3.interpolateString(bn > an ? makePath(ac) : a, an > bn ? makePath(bc) : b);

    // If the ending value changed, make sure the final interpolated value is correct
    return bn > an ? interpolator : function(t) {
      return t === 1 ? b : interpolator(t);
    };
  }
});
