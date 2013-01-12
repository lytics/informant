informant.defineElement('filter', function(element) {
  var attributes = {
      source: null,
      filters: [],
      accessor: valueAt('key')
    },
    dateFilters = [
      { days: 90, name: '90 Day' },
      { days: 30, name: '30 Day' },
      { days: 7, name: 'Week' },
      { days: 1, name: 'Day' }
    ],
    day = 24*60*60*1000,
    filterAccessor = valueAt('filter');

  addMutators(element, attributes, [ 'source', 'filters', 'accessor' ]);

  return function(selection) {
    var metric = element.metric(),
      filters = element.filters(),
      list = selection.append('ul');

    if (!metric) {
      if (!element.source()) {
        throw new Error('A metric or source must be specified in a filter');
      }

      metric = element.source().metric().byDate();
    }

    metric.on('ready', function init() {
      if (!filters.length) {
        var dateRange = d3.extent(metric.value(), element.accessor());

        filters.push({
          name: 'All',
          filter: null
        });

        dateFilters.forEach(function(filter) {
          if (dateRange[1] - dateRange[0] >= day*filter.days) {
            filters.push({
              name: filter.name,
              filter: [ new Date(dateRange[1] - day*filter.days), Date.now() ]
            });
          }
        });
      }

      list.selectAll('li')
        .data(filters)
        .enter()
          .append('li')
          .text(valueAt('name'))
          .on('click', function(d) {
            var filter = filterAccessor(d);
            metric.filter(filter === metric.filter() ? null : filter);

            if (dc) {
              dc.redrawAll();
            }
          });

      updateFilters();
    });

    function updateFilters() {
      list.selectAll('li')
        .classed('selected', function(d) {
          return filterAccessor(d) === metric.filter();
        });
    }

    metric.on('filter', updateFilters);
  };
});
