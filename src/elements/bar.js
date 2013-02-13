informant.defineElement('bar', function(element) {
  var attributes = {
    keyAccessor   : valueAt('key'),
    valueAccessor : valueAt('value'),
    padding       : paddingObject(10, 30, 30, 50)
  };

  addMutators(element, attributes, [ 'keyAccessor', 'valueAccessor' ]);
  addPaddingMutator(element, attributes);

  return function(selection) {
    var metric = element.metric(),
      group = metric.group(),
      variableRangeGroup = new VariableRangeGroup(group, attributes.keyAccessor),
      size = geometry(element),
      container = selection.append('div')
        .classed('chart bar-chart', true);

    metric.on('ready', function init() {
      var chart = dc.barChart(container.node())
        .width(size.width)
        .height(contentHeight(element, size.height))
        .margins(element.padding())
        .dimension(metric.dimension())
        .group(variableRangeGroup)
        .keyAccessor(attributes.keyAccessor)
        .valueAccessor(attributes.valueAccessor)
        .x(createScale(metric))
        // TODO: make x axis units intelligent based on data
        .xUnits(dc.units.ordinal);

      // Visual options
      chart
        .elasticY(true)
        .elasticX(true)
        .centerBar(true)
        .renderHorizontalGridLines(true)
        .brushOn(false);

      chart.render();
    });

    metric.on('filter', function(dimension, filter) {
      var value = group.all();

      // Update the variable range group's new range only if it's a date dimension
      if (isArray(filter) && isDate(filter[0]) &&
        isArray(value) && isDate(attributes.keyAccessor(value[0]))) {
        variableRangeGroup.range(filter);
      }
    });
  };
});
