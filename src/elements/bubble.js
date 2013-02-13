informant.defineElement('bubble', function(element) {
  var valueProp = valueAt('value'),
    attributes = {
      keyAccessor    : valueAt('key'),
      valueAccessor  : valueAt('value'),
      radiusAccessor : valueAt('radius'),
      padding        : paddingObject(10, 30, 30, 50)
    };

  addMutators(element, attributes, [ 'keyAccessor', 'valueAccessor', 'radiusAccessor' ]);
  addPaddingMutator(element, attributes);

  return function(selection) {
    var metric = element.metric(),
      size = geometry(element),
      keyAccessor = pipe(element.keyAccessor(), valueProp),
      valueAccessor = pipe(element.valueAccessor(), valueProp),
      radiusAccessor = pipe(element.radiusAccessor(), valueProp),
      container = selection.append('div')
        .classed('chart bubble-chart', true);

    metric.on('ready', function init() {
      var chart = dc.bubbleChart(container.node())
        .width(size.width)
        .height(contentHeight(element, size.height))
        .margins(element.padding())
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
