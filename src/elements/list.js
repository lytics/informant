informant.defineElement('list', function(element) {
  var attributes = {
    keyAccessor: valueAt('key'),
    valueAccessor: valueAt('value'),
    numbered: false,
    showValues: false
  };

  addMutators(element, attributes, [ 'keyAccessor', 'valueAccessor', 'numbered', 'showValues' ]);

  return function(selection) {
    var metric = element.metric(),
      filterable = !!metric.dimension(),
      keyAccessor = element.keyAccessor(),
      valueAccessor = element.valueAccessor(),
      list = selection.append(element.numbered() ? 'ol' : 'ul');

    metric.on('change', function update() {
      var items = list.selectAll('li')
        .data(metric.value());

      items.enter()
        .append('li')
          .call(function(s) {
            s.append('span')
              .attr('class', 'key');
            if (element.showValues()) {
              s.append('span')
                .attr('class', 'value');
            }
          });

      items.call(function(s) {
        s.select('span.key')
          .text(keyAccessor);

        if (element.showValues()) {
          s.select('span.value')
            .text(valueAccessor);
        }
      });

      if (filterable) {
        list.classed('filterable', true);
        items
          .classed('selected', function(d) {
            return accessor(d) === metric.filter();
          })
          .on('click', function(d) {
            metric.filter(accessor(d) === metric.filter() ? null : accessor(d));

            if (dc) {
              dc.redrawAll();
            }
          });
      }

      items.exit()
        .remove();
    });
  };
});
