informant.defineElement('graph', function(element) {
  return function(selection) {
    var metric = element.metric(),
      container = selection.append('div')
        .classed('chart line-chart', true);

    function xScale() {
      var domain = metric.domain(),
        scale = domain[0] instanceof Date ? d3.time.scale() : d3.scale.linear();

      return scale.domain(d3.extent(domain));
    }

    metric.on('ready', function init() {
      var chart = dc.lineChart(container.node())
        .width(element.width() - 40)
        .height(element.height() - 140)
        .margins({top: 10, right: 10, bottom: 30, left: 50})
        .dimension(metric.dimension())
        .group(metric.group())
        .x(xScale());

      // Visual options
      chart
        .elasticY(true)
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
