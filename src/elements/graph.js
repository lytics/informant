informant.defineElement('graph', function(element) {
  var attributes = {
    keyAccessor: valueAt('key'),
    valueAccessor: valueAt('value')
  };

  addMutators(element, attributes, [ 'keyAccessor', 'valueAccessor' ]);

  return function(selection) {
    var metric = element.metric(),
      group = metric.group(),
      variableRangeGroup = new VariableRangeGroup(group, attributes.keyAccessor),
      size = geometry(element),
      container = selection.append('div')
        .classed('chart line-chart', true);

    metric.on('ready', function init() {
      var chart = dc.lineChart(container.node())
        .width(size.width - 40)
        .height(size.height - 140)
        .margins({top: 10, right: 10, bottom: 30, left: 50})
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

      // Axes
      chart.xAxis()
        .ticks(d3.time.days)
        .tickFormat(function(date) {
          return (date.getMonth() + 1) + '/' + date.getDate();
        });

      chart.render();
    });

    metric.on('filter', function(dimension, filter) {
      var value = group.all();

      // Update the variable range group's new range only if it's a date dimension
      if (isArray(value) && isDate(attributes.keyAccessor(value[0]))) {
        variableRangeGroup.range(filter);
      }
    });
  };
});
