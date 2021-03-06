informant.defineElement('graph', function(element) {
  var attributes = {
    keyAccessor   : valueAt('key'),
    valueAccessor : valueAt('value'),
    padding       : paddingObject(10, 30, 30, 50)
  };

  addMutators(element, attributes, [ 'keyAccessor', 'valueAccessor' ]);
  addPaddingMutator(element, attributes);

  return function(selection) {
    var chart,
      metric = element.metric(),
      group = metric.group(),
      variableRangeGroup = new VariableRangeGroup(group, attributes.keyAccessor),
      size = geometry(element),
      container = selection.append('div')
        .classed('chart line-chart', true);

    metric.on('ready', function init() {
      chart = dc.lineChart(container.node())
        .width(size.width)
        .height(contentHeight(element, size.height))
        .margins(element.padding())
        .dimension(metric.dimension())
        .group(variableRangeGroup)
        .keyAccessor(attributes.keyAccessor)
        .valueAccessor(attributes.valueAccessor)
        .x(createScale(metric));

      // Visual options
      chart
        .elasticY(true)
        .elasticX(true)
        .renderHorizontalGridLines(true)
        .brushOn(false)
        .renderArea(true);

      // Intelligently assign axis ticks
      formatXAxis(chart, variableRangeGroup);

      chart.render();
    });

    metric.on('filter', function(dimension, filter) {
      var value = group.all();

      // Update the variable range group's new range only if it's a date dimension
      if (isArray(filter) && isDate(filter[0]) &&
        isArray(value) && isDate(attributes.keyAccessor(value[0]))) {
        variableRangeGroup.range(filter);
        chart && formatXAxis(chart, variableRangeGroup);
      }
    });
  };
});
