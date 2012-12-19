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
      size = geometry(element),
      keyAccessor = pipe(valueAt(element.keyAccessor()), valueProp),
      valueAccessor = pipe(valueAt(element.valueAccessor()), valueProp),
      radiusAccessor = pipe(valueAt(element.radiusAccessor()), valueProp),
      container = selection.append('div')
        .classed('chart bubble-chart', true);

    metric.on('ready', function init() {
      var chart = dc.bubbleChart(container.node())
        .width(size.width - 40)
        .height(size.height - 140)
        .margins({ top: 10, right: 50, bottom: 30, left: 50 })
        .dimension(metric.dimension())
        .group(metric.group())
        .x(createScale(metric, keyAccessor))
        .y(createScale(metric, valueAccessor))
        .r(createScale(metric, radiusAccessor))
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
