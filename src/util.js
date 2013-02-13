// Ensure that a target selector is a d3 selection
function select(target) {
  return target instanceof d3.selection ? target : d3.select(target);
}

// Add a set of getter/setters to an object
function addMutators(context, store, names) {
  names.forEach(function(name) {
    context[name] = function(value) {
      if (!arguments.length) {
        return store[name];
      }

      store[name] = value;
      return context;
    };
  });
}

function addShortcutMutator(context, name, argNames) {
  context[name] = function() {
    var args = slice(arguments);

    if (!args.length) {
      // Return an array of values by invoking each getter
      return argNames.map(function(name) {
        return context[name]();
      });
    }

    // Accept a normal arguments list or an array
    args = isArray(args[0]) ? args[0] : args;

    // Invoke each setter method with the arguments
    argNames.forEach(function(name, index) {
      context[name](args[index]);
    });

    return context;
  };
}

// Adds a function for creating an element within the given context
function addElementCreator(context) {
  context.element = function(name, opts) {
    if (elementTypes.indexOf(name) === -1) {
      throw new Error("Unknown element type: '" + name + "'");
    }

    return context[name](opts);
  };
}

// Simple extend implementation
function extend(target, obj) {
  keys(obj).forEach(function(attr) {
    target[attr] = obj[attr];
  });
  return target;
}

// Shallow clone using extend
function clone(obj) {
  return extend({}, obj);
}

// Given a hash of options, invoke mutators with the given values
function applyOptions(target, options) {
  if (isObject(options)) {
    keys(options).forEach(function(attr) {
      if (!isFunction(target[attr])) {
        throw new Error("Uknown method: '" + attr + "'");
      }

      target[attr](options[attr]);
    });
  }
  return target;
}

// Courtesy of Ben Alman: http://benalman.com/news/2012/09/partial-application-in-javascript/#extra-credit
var slice = Function.prototype.call.bind(Array.prototype.slice);

// Returns an array of an object's keys
var keys = Object.keys;

// Capitalizes the first letter of the given string
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Use Object.toString technique to determine a variable's true type
function is(type) {
  var constructor = capitalize(type);
  return function(obj) {
    return Object.prototype.toString.call(obj) === '[object ' + constructor + ']';
  };
}

// Checks if the object is a function
var isFunction = is('function');

// Checks if the object is a plain object
var isObject = is('object');

// Checks if the object is a date
var isDate =  is('date');

// Checks if the object is an array
var isArray = Array.isArray;

// Checks if the object is undefined
function isUndefined(obj) {
  return obj === undefined;
}

// Returns a function that returns the value of the first arg at the given index
function valueAt(index) {
  return function(d) {
    return d[index];
  };
}

// Given two value functions, returns a new value function that pipes the first through the second
function pipe(func, p) {
  return function(d) {
    return func(p(d));
  };
}

// Intelligently creates a scale depending on the metrics data type
function createScale(metric, value) {
  var domain = value ? metric.value().map(value) : metric.domain();

  if (domain[0] instanceof Date) {
    return d3.time.scale().domain(d3.extent(domain));
  } else if (typeof domain[0] === 'string') {
    return d3.scale.ordinal().domain(domain);
  } else {
    return d3.scale.linear().domain(d3.extent(domain));
  }
}

// Return a string that indicates the date object's month
function formatMonth(date) {
  return d3.time.format('%b');
}

// Return a string that indicates the date object's day
function formatDay(date) {
  return (date.getMonth() + 1) + '/' + date.getDate();
}

// Return a string that indicates the date object's hour
function formatHour(date) {
  return d3.time.format('%I%p');
}

// Intelligently add axis ticks/labels based on the domain
function addAxisTicks(axis, domain) {
  var width = domain[1] - domain[0] || 0,
    extent = d3.extent(domain),
    day = 24*60*60*1000;

  if (domain[0] instanceof Date) {
    if (width < day) {
      // Show hours
      axis.tickFormat(formatHour);
    } else if (width < day*90) {
      // Show days
      axis.tickFormat(formatDay);
    } else {
      // Show months
      axis.tickFormat(formatMonth);
    }

    // If the domain consists of dates, the underlying scale will be a d3.time.scale,
    // which means you can specify the 'approximate' number of ticks -- in this case
    // 9 tends to cram them together, overlapping labels
    // TODO: this number should probably be proportional to the chart size and font
    axis.ticks(8);
  }
}

// Helper function for quickly creating objects representing padding
function paddingObject(t, r, b, l) {
  return { top: t, right: r, bottom: b, left: l };
}

// Add a mutator for setting padding object w/ 'top', 'bottom', 'left', 'right' keys
function addPaddingMutator(context, store) {
  context.padding = function(padding) {
    if (!arguments.length) {
      return store.padding;
    }

    if (isObject(padding)) {
      // if padding values are missing, fill in with defaults/existing values
      extend(store.padding || paddingObject(0, 0, 0, 0), padding);
    } else if (!isNaN(padding)) {
      // also accept a single numeric value
      store.padding = paddingObject(+padding, +padding, +padding, +padding);
    }

    return context;
  };
}

// Helper for scaling size and offset
function geometry(element) {
  var size = (element.group ? element.group() : informant).baseSize(),
    margin = informant.margins();

  return {
    top   : size[0] * (element.top ? +element.top() : 0) + margin,
    left  : size[1] * (element.left ? +element.left() : 0) + margin,
    height: size[0] * +element.height() - margin * 2,
    width : size[1] * +element.width() - margin * 2
  };
}

// A crossfilter group proxy object that alters the final output based on a
// given range restriction
function VariableRangeGroup(group, accessor) {
  var attributes = {
    range: null
  };

  // Add proxies for all functions but `.all()`
  keys(group).forEach(function(prop) {
    if (prop !== 'all' && group.hasOwnProperty(prop)) {
      this[prop] = function() {
        return group[prop].apply(group, arguments);
      };
    }
  }, this);

  // Replace `.all()` with a function that limits the range of the output
  this.all = function() {
    var data = group.all(),
      range = attributes.range;

    if (isArray(range)) {
      return data.filter(function(d) {
        return accessor(d) >= range[0] && accessor(d) < range[1];
      });
    }

    return data;
  };

  // Add getter/setter for the limiting range
  addMutators(this, attributes, [ 'range' ]);
}
