/*jshint sub:true */
var root = this,
  d3 = root.d3;

// Namespace object;
var informant = {
  version: '0.1.0'
};

var elementTypes = [];

informant.defineElement = function(name, definition) {
  if (informant[name]) {
    throw new Error("Attempting to define element that already exists or is protected: '" + name + "'");
  }

  elementTypes.push(name);

  informant[name] = function(options) {
    var element,
      attributes = {
        height  : 200,
        width   : 200
      };

    // render element into target (can be selector, DOM object, or d3 selection)
    var instance = function(target) {
      var container = select(target)
        .append('div')
          .classed('element element-' + name, true)
          .style('height', instance.height() + 'px')
          .style('width', instance.width() + 'px');

      if (instance.header()) {
        container.append('header').html(instance.header());
      }

      container.append('div')
        .classed('content', true)
        .call(element);

      if (instance.footer()) {
        container.append('footer').html(instance.footer());
      }

      return instance;
    };

    // Alias for element function itself
    instance.render = instance;

    addMutators(instance, attributes, [ 'metric', 'width', 'height', 'header', 'footer' ]);

    // Shortcut mutator for setting height/width at the same time
    instance.size = function(h, w) {
      if (!arguments.length) {
        return [ instance.height(), instance.width() ];
      }

      return instance
        .height(h)
        .width(w);
    };

    // Pass the element instance to the definition so that it can be modified
    element = definition(instance);

    // Element attributes can be specified in an options hash
    if (isObject(options)) {
      keys(options).forEach(function(attr) {
        if (isFunction(this[attr])) {
          this[attr](options[attr]);
        }
      });
    }

    return instance;
  };
};

informant.group = function() {
  var group, instances = [];

  group = function(target) {
    // Create an element that contains the whole group
    var group = select(target).append('div')
      .classed('group', true)
      .style('position', 'relative');

    // Render each element into it's own positioned wrapper
    instances.forEach(function(element) {
      group.append('div')
        .classed('element-wrapper', true)
        .style('position', 'absolute')
        .style('top', element.top() + 'px')
        .style('left', element.left() + 'px')
        .call(element);
    });

    return group;
  };

  elementTypes.forEach(function(name) {
    group[name] = function(options) {
      var instance = informant[name](options),
        attributes = {
          top : 0,
          left: 0
        };

      instances.push(instance);

      addMutators(instance, attributes, [ 'top', 'left' ]);

      // Shortcut mutator for setting both offsets at the same time
      instance.position = function(t, l) {
        if (!arguments.length) {
          return [ instance.top(), instance.left() ];
        }

        return instance
          .top(t)
          .left(l);
      };

      // Add convenience function for easy chaining
      instance.end = function() {
        return group;
      };

      return instance;
    };
  });

  // Alias for set funciton itself
  group.render = group;

  return group;
};
