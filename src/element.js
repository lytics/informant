// Element

// Elements can be created through an `element` function
addElementCreator(informant);

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
    addMutators(instance, attributes, [ 'metric', 'width', 'height', 'header', 'footer', 'headerPadding', 'footerPadding' ]);

    // Shortcut mutator for setting height/width at the same time
    addShortcutMutator(instance , 'size', [ 'height', 'width' ]);

    // Pass the element instance to the definition so that it can be modified
    render = definition(instance);

    // Element attributes can be specified in an options hash
    return applyOptions(instance, opts);
  };
};
