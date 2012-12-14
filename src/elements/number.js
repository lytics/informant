informant.defineElement('number', function(element) {
  var attributes = {};

  addMutators(element, attributes, [ 'title', 'description' ]);

  return function(selection) {
    var metric = element.metric(),
      value;

    addComponent(element.title, selection, 'h1', 'title');

    value = selection.append('h2')
      .classed('value', true);

    addComponent(element.description, selection, 'p', 'description');

    metric.on('change', function update() {
      value.text(metric.value());
    });
  };
});
