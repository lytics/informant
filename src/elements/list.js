informant.defineElement('list', function(element) {
  var attributes = {
    numbered: false,
    accessor: valueAt('key')
  };

  addMutators(element, attributes, [ 'numbered', 'accessor' ]);

  return function(selection) {
    var metric = element.metric(),
      accessor = element.accessor(),
      list = selection.append(element.numbered() ? 'ol' : 'ul');

    metric.on('change', function update() {
      var items = list.selectAll('li')
        .data(metric.value());

      items.enter()
        .append('li');

      items
        .text(accessor)
        .classed('selected', function(d) {
          return accessor(d) === metric.filter();
        })
        .on('click', function(d) {
          metric.filter(accessor(d) === metric.filter() ? null : accessor(d));

          if (dc) {
            dc.redrawAll();
          }
        });

      items.exit()
        .remove();
    });
  };
});
