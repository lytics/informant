informant.defineElement('pie', function(element) {
  var attributes = {
    donut   : false,
    padding : 10
  };

  addMutators(element, attributes, [ 'donut', 'padding' ]);

  return function(selection) {
    var metric = element.metric(),
      size = geometry(element),
      container = selection.append('div')
        .classed('chart pie-chart', true);

    metric.on('ready', function init() {
      var radius = Math.min(size.width, contentHeight(element, size.height)) / 2 - element.padding(),
        opacityScale = d3.scale.linear()
          .domain([0, metric.group().size() - 1])
          .range(['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']);

      var chart = dc.pieChart(container.node())
        .width(size.width)
        .height(contentHeight(element, size.height))
        .radius(radius)
        .dimension(metric.dimension())
        .group(metric.group());

      if (element.donut()) {
        chart.innerRadius(radius / 3);
      }

      // Visual options
      chart
        .minAngleForLabel(0.05);

      var domain = [];
      for (var i = 0, s = metric.group().size(); i < s; i++) {
        domain.push(i);
      }

      chart
        // TODO: figure out why this scale doesn't work
        // .colors(opacityScale);
        .colors(domain.map(opacityScale));

      chart.render();
    });
  };
});
