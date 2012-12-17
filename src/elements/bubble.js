informant.defineElement('bubble', function(element) {
  var valueProp = valueAt('value'),
    attributes = {
      keyAccessor: 'key',
      valueAccessor: 'value',
      radiusAccessor: 'radius'
    };

  addMutators(element, attributes, [ 'keyAccessor', 'valueAccessor', 'radiusAccessor' ]);

  return function(selection) {
    var metric = element.metric(),
      keyAccessor = pipe(valueAt(element.keyAccessor()), valueProp),
      valueAccessor = pipe(valueAt(element.valueAccessor()), valueProp),
      radiusAccessor = pipe(valueAt(element.radiusAccessor()), valueProp),
      container = selection.append('div')
        .classed('chart bubble-chart', true);

    function scale(value) {
      var domain = metric.value().map(value),
        scale = domain[0] instanceof Date ? d3.time.scale() : d3.scale.linear();

      return scale.domain(d3.extent(domain));
    }

    metric.on('ready', function init() {
      var chart = dc.bubbleChart(container.node())
        .width(element.width() - 40)
        .height(element.height() - 140)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(metric.dimension())
        .group(metric.group())
        .x(scale(keyAccessor))
        .y(scale(valueAccessor))
        .r(scale(radiusAccessor))
        .keyAccessor(keyAccessor)
        .valueAccessor(valueAccessor)
        .radiusValueAccessor(radiusAccessor);

      // Visual options
      chart
        .colors(d3.scale.category20c())
        // .minRadiusWithLabel(30)
        .maxBubbleRelativeSize(0.09)
        .renderLabel(true)
        .elasticX(true)
        .elasticY(true)
        .renderHorizontalGridLines(true)
        .renderVerticalGridLines(true)
        .brushOn(false);

      chart.render();
    });
  };
});
