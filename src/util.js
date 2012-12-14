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

// Given a selection, add an node that represents the component
function addComponent(component, selection, tag, classes) {
  if (component && component()) {
    return selection.append(tag)
      .classed(classes, !!classes)
      .html(component());
  }
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
