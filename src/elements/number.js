informant.defineElement('number', function(element) {
  var attributes = {};

  var number = function(selection) {
    var metric = element.metric(),
      value;

    if (element.title()) {
      selection.append('div')
        .classed('title', true)
        .html(element.title());
    }

    value = selection.append('div')
      .classed('value', true);

    if (element.description()) {
      selection.append('div')
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
