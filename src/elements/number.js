informant.defineElement('number', function(element) {
  return function(selection) {
    var metric = element.metric(),
      value = selection
        .append('div')
        .classed('value', true);

    metric.on('change', function update() {
      value.text(metric.value());
    });
  };
});
