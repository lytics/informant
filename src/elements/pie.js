informant.defineElement('pie', function(element) {
  var attributes = {};

  addMutators(element, attributes, [ 'title', 'description' ]);

  return function(selection) {
    var metric = element.metric(),
      container;

    addComponent(element.title, selection, 'h1', 'title');

    container = selection.append('div')
      .classed('chart pie-chart', true);

    addComponent(element.description, selection, 'p', 'description');

    metric.on('ready', function init() {
      var opacityScale = d3.scale.linear()
        .domain([0, metric.group().size() - 1])
        .range(['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']);

      var chart = dc.pieChart(container.node())
        .width(element.width())
        .height(element.width())
        .radius((element.width()) / 2 - 2) // the 2 pixels accounts for thicker stroke width
        .innerRadius(element.width() / 5)
        .dimension(metric.dimension())
        .group(metric.group());

      var domain = [];
      for (var i = 0, size = metric.group().size(); i < size; i++) {
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
