// Ensure that a target selector is a d3 selection
function select(target) {
  return target instanceof d3.selection ? target : d3.select(target);
}

// Add a getter/setter method that uses an object to store its value
function createMutator(name, store, context) {
  return function(value) {
    if (!arguments.length) {
      return store[name];
    }

    store[name] = value;
    return context;
  };
}

// Add a set of getter/setters to an object
function addMutators(context, store, names) {
  names.forEach(function(name) {
    context[name] = createMutator(name, store, context);
  });
}

// Simple extend implementation
function extend(target, obj) {
  keys(obj).forEach(function(attr) {
    target[attr] = obj[attr];
  });
}

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
