informant.defineElement('graph', function(element) {
  return function(selection) {
    var metric = element.metric(),
      size = geometry(element),
      container = selection.append('div')
        .classed('chart line-chart', true);

    metric.on('ready', function init() {
      var chart = dc.lineChart(container.node())
        .width(size.width - 40)
        .height(size.height - 140)
        .margins({top: 10, right: 10, bottom: 30, left: 50})
        .dimension(metric.dimension())
        .group(metric.group())
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
  };
});
