informant.defineElement('html', function(element) {
  var attributes = {
    content: ''
  };

  addMutators(element, attributes, [ 'content' ]);

  // Remove unused mutators
  delete element.metric;

  return function(selection) {
    selection.html(element.content());
  };
});
