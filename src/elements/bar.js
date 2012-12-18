informant.defineElement('bar', function(element) {
  return function(selection) {
    var metric = element.metric(),
      container = selection.append('div')
        .classed('chart bar-chart', true);

    metric.on('ready', function init() {
      var chart = dc.barChart(container.node())
        .width(element.width() - 40)
        .height(element.height() - 140)
        .margins({ top: 10, right: 10, bottom: 30, left: 60 })
        .dimension(metric.dimension())
        .group(metric.group())
        .x(createScale(metric))
        // TODO: make x axis units intelligent based on data
        .xUnits(dc.units.ordinal);

      // Visual options
      chart
        .elasticY(true)
        .centerBar(true)
        .renderHorizontalGridLines(true)
        .brushOn(false);

      chart.render();
    });
  };
});
