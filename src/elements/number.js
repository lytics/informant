informant.defineElement('number', function(element) {
  var attributes = {};

  var number = function(selection) {
    var metric = element.metric(),
      value;

    if (element.title()) {
      selection.append('h1')
        .classed('title', true)
        .html(element.title());
    }

    value = selection.append('h2')
      .classed('value', true);

    if (element.description()) {
      selection.append('p')
        .classed('description', true)
        .html(element.description());
    }

    metric.on('change', function update() {
      value.text(metric.value());
    });
  };

  [ 'title', 'description' ].forEach(function(name) {
    element[name] = createMutator(name, attributes, element);
  });

  return number;
});
