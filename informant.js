(function() {
  function select(target) {
    return target instanceof d3.selection ? target : d3.select(target);
  }
  function addMutators(context, store, names) {
    names.forEach(function(name) {
      context[name] = function(value) {
        if (!arguments.length) {
          return store[name];
        }
        store[name] = value;
        return context;
      };
    });
  }
  function addShortcutMutator(context, name, argNames) {
    context[name] = function() {
      var args = slice(arguments);
      if (!args.length) {
        return argNames.map(function(name) {
          return context[name]();
        });
      }
      args = isArray(args[0]) ? args[0] : args;
      argNames.forEach(function(name, index) {
        context[name](args[index]);
      });
      return context;
    };
  }
  function addElementCreator(context) {
    context.element = function(name, opts) {
      if (elementTypes.indexOf(name) === -1) {
        throw new Error("Unknown element type: '" + name + "'");
      }
      return context[name](opts);
    };
  }
  function extend(target, obj) {
    keys(obj).forEach(function(attr) {
      target[attr] = obj[attr];
    });
    return target;
  }
  function applyOptions(target, options) {
    if (isObject(options)) {
      keys(options).forEach(function(attr) {
        if (!isFunction(target[attr])) {
          throw new Error("Uknown method: '" + attr + "'");
        }
        target[attr](options[attr]);
      });
    }
    return target;
  }
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function is(type) {
    var constructor = capitalize(type);
    return function(obj) {
      return Object.prototype.toString.call(obj) === "[object " + constructor + "]";
    };
  }
  function isUndefined(obj) {
    return obj === undefined;
  }
  function valueAt(index) {
    return function(d) {
      return d[index];
    };
  }
  function pipe(func, p) {
    return function(d) {
      return func(p(d));
    };
  }
  function createScale(metric, value) {
    var domain = value ? metric.value().map(value) : metric.domain();
    if (domain[0] instanceof Date) {
      return d3.time.scale().domain(d3.extent(domain));
    } else if (typeof domain[0] === "string") {
      return d3.scale.ordinal().domain(domain);
    } else {
      return d3.scale.linear().domain(d3.extent(domain));
    }
  }
  function geometry(element) {
    var size = informant.baseSize(), margin = informant.margins();
    return {
      top: size[0] * (element.top ? +element.top() : 0) + margin,
      left: size[1] * (element.left ? +element.left() : 0) + margin,
      height: size[0] * +element.height() - margin * 2,
      width: size[1] * +element.width() - margin * 2
    };
  }
  function VariableRangeGroup(group, accessor) {
    var attributes = {
      range: null
    };
    keys(group).forEach(function(prop) {
      if (prop !== "all" && group.hasOwnProperty(prop)) {
        this[prop] = function() {
          return group[prop].apply(group, arguments);
        };
      }
    }, this);
    this.all = function() {
      var data = group.all(), range = attributes.range;
      if (isArray(range)) {
        return data.filter(function(d) {
          return accessor(d) >= range[0] && accessor(d) < range[1];
        });
      }
      return data;
    };
    addMutators(this, attributes, [ "range" ]);
  }
  var slice = Function.prototype.call.bind(Array.prototype.slice);
  var keys = Object.keys;
  var isFunction = is("function");
  var isObject = is("object");
  var isDate = is("date");
  var isArray = Array.isArray;
  var root = this, d3 = root.d3;
  var informant = {
    version: "0.1.0"
  };
  var options = {
    baseWidth: 1,
    baseHeight: 1,
    margins: 0
  };
  addMutators(informant, options, keys(options));
  addShortcutMutator(informant, "baseSize", [ "baseHeight", "baseWidth" ]);
  addElementCreator(informant);
  informant.config = function(opts) {
    if (!arguments.length) {
      return extend({}, options);
    }
    return applyOptions(informant, opts);
  };
  var elementTypes = [];
  informant.defineElement = function(name, definition) {
    if (informant[name]) {
      throw new Error("Attempting to define element that already exists or is protected: '" + name + "'");
    }
    elementTypes.push(name);
    informant[name] = function(opts) {
      var render, attributes = {
        height: 200,
        width: 200
      };
      var instance = function(target) {
        var size = geometry(instance), container = select(target).append("div");
        container.classed("element element-" + name, true).style("height", size.height + "px").style("width", size.width + "px");
        if (instance.header()) {
          container.append("header").html(instance.header());
        }
        container.append("div").classed("content", true).call(render);
        if (instance.footer()) {
          container.append("footer").html(instance.footer());
        }
        return instance;
      };
      instance.render = instance;
      addMutators(instance, attributes, [ "metric", "width", "height", "header", "footer" ]);
      addShortcutMutator(instance, "size", [ "height", "width" ]);
      render = definition(instance);
      return applyOptions(instance, opts);
    };
  };
  informant.group = function() {
    var group, instances = [];
    group = function(target) {
      var group = select(target).append("div").classed("informant group", true).style("position", "relative");
      instances.forEach(function(instance) {
        var position = geometry(instance), wrapper = group.append("div");
        wrapper.style("position", "absolute").style("top", position.top + "px").style("left", position.left + "px").classed("wrapper", true).call(instance);
        if (instance.id()) {
          wrapper.attr("id", instance.id());
        }
        if (instance.classes()) {
          wrapper.classed(instance.classes(), true);
        }
      });
      return group;
    };
    elementTypes.forEach(function(name) {
      group[name] = function(opts) {
        var instance = informant[name](), attributes = {
          top: 0,
          left: 0
        };
        instances.push(instance);
        addMutators(instance, attributes, [ "id", "classes", "top", "left" ]);
        addShortcutMutator(instance, "position", [ "top", "left" ]);
        instance.end = function() {
          return group;
        };
        applyOptions(instance, opts);
        return isUndefined(opts) ? instance : group;
      };
    });
    addElementCreator(group);
    group.render = group;
    return group;
  };
  d3.interpolators.push(function(a, b) {
    function fill(value, length) {
      return d3.range(length).map(function() {
        return value;
      });
    }
    function extractCoordinates(path) {
      return path.substr(1, path.length - (isArea ? 2 : 1)).split("L");
    }
    function makePath(coordinates) {
      return "M" + coordinates.join("L") + (isArea ? "Z" : "");
    }
    function bufferPath(p1, p2) {
      var d = p2.length - p1.length;
      if (isArea) {
        return fill(p1[0], d / 2).concat(p1, fill(p1[p1.length - 1], d / 2));
      } else {
        return fill(p1[0], d).concat(p1);
      }
    }
    var isPath, isArea, interpolator, ac, bc, an, bn;
    isPath = /M-?\d*\.?\d*,-?\d*\.?\d*(L-?\d*\.?\d*,-?\d*\.?\d*)*Z?/;
    if (isPath.test(a) && isPath.test(b)) {
      isArea = a[a.length - 1] === "Z";
      ac = extractCoordinates(a);
      bc = extractCoordinates(b);
      an = ac.length;
      bn = bc.length;
      if (an > bn) {
        bc = bufferPath(bc, ac);
      }
      if (bn > an) {
        ac = bufferPath(ac, bc);
      }
      interpolator = d3.interpolateString(bn > an ? makePath(ac) : a, an > bn ? makePath(bc) : b);
      return bn > an ? interpolator : function(t) {
        return t === 1 ? b : interpolator(t);
      };
    }
  });
  informant.defineElement("number", function(element) {
    return function(selection) {
      var metric = element.metric(), value = selection.append("div").classed("value", true);
      metric.on("change", function update() {
        value.text(metric.value());
      });
    };
  });
  informant.defineElement("list", function(element) {
    var attributes = {
      numbered: false,
      accessor: valueAt("key")
    };
    addMutators(element, attributes, [ "numbered", "accessor" ]);
    return function(selection) {
      var metric = element.metric(), accessor = element.accessor(), list = selection.append(element.numbered() ? "ol" : "ul");
      metric.on("change", function update() {
        var items = list.selectAll("li").data(metric.value());
        items.enter().append("li");
        items.text(accessor).classed("selected", function(d) {
          return accessor(d) === metric.filter();
        }).on("click", function(d) {
          metric.filter(accessor(d) === metric.filter() ? null : accessor(d));
          if (dc) {
            dc.redrawAll();
          }
        });
        items.exit().remove();
      });
    };
  });
  informant.defineElement("filter", function(element) {
    var attributes = {
      source: null,
      filters: [],
      accessor: valueAt("key")
    }, dateFilters = [ {
      days: 90,
      name: "90 Day"
    }, {
      days: 30,
      name: "30 Day"
    }, {
      days: 7,
      name: "Week"
    }, {
      days: 1,
      name: "Day"
    } ], day = 24 * 60 * 60 * 1e3, filterAccessor = valueAt("filter");
    addMutators(element, attributes, [ "source", "filters", "accessor" ]);
    return function(selection) {
      function updateFilters() {
        list.selectAll("li").classed("selected", function(d) {
          return filterAccessor(d) === metric.filter();
        });
      }
      var metric = element.metric(), filters = element.filters(), list = selection.append("ul");
      if (!metric) {
        if (!element.source()) {
          throw new Error("A metric or source must be specified in a filter");
        }
        metric = element.source().metric().byDate();
      }
      metric.on("ready", function init() {
        if (!filters.length) {
          var dateRange = d3.extent(metric.value(), element.accessor()), rangeMax = new Date(+dateRange[1] + 1), fullRange = [ dateRange[0], rangeMax ];
          filters.push({
            name: "All",
            filter: fullRange
          });
          dateFilters.forEach(function(filter) {
            if (dateRange[1] - dateRange[0] >= day * filter.days) {
              filters.push({
                name: filter.name,
                filter: [ new Date(dateRange[1] - day * filter.days), rangeMax ]
              });
            }
          });
          metric.filter(fullRange);
        }
        list.selectAll("li").data(filters).enter().append("li").text(valueAt("name")).on("click", function(d) {
          var filter = filterAccessor(d);
          metric.filter(filter === metric.filter() ? null : filter);
          if (dc) {
            dc.redrawAll();
          }
        });
        updateFilters();
      });
      metric.on("filter", updateFilters);
    };
  });
  informant.defineElement("graph", function(element) {
    var attributes = {
      keyAccessor: valueAt("key"),
      valueAccessor: valueAt("value")
    };
    addMutators(element, attributes, [ "keyAccessor", "valueAccessor" ]);
    return function(selection) {
      var metric = element.metric(), group = metric.group(), variableRangeGroup = new VariableRangeGroup(group, attributes.keyAccessor), size = geometry(element), container = selection.append("div").classed("chart line-chart", true);
      metric.on("ready", function init() {
        var chart = dc.lineChart(container.node()).width(size.width - 40).height(size.height - 140).margins({
          top: 10,
          right: 10,
          bottom: 30,
          left: 50
        }).dimension(metric.dimension()).group(variableRangeGroup).keyAccessor(attributes.keyAccessor).valueAccessor(attributes.valueAccessor).x(createScale(metric));
        chart.elasticY(true).elasticX(true).renderHorizontalGridLines(true).brushOn(false).renderArea(true);
        chart.xAxis().ticks(d3.time.days).tickFormat(function(date) {
          return date.getMonth() + 1 + "/" + date.getDate();
        });
        chart.render();
      });
      metric.on("filter", function(dimension, filter) {
        var value = group.all();
        if (isArray(filter) && isDate(filter[0]) && isArray(value) && isDate(attributes.keyAccessor(value[0]))) {
          variableRangeGroup.range(filter);
        }
      });
    };
  });
  informant.defineElement("bar", function(element) {
    var attributes = {
      keyAccessor: valueAt("key"),
      valueAccessor: valueAt("value")
    };
    addMutators(element, attributes, [ "keyAccessor", "valueAccessor" ]);
    return function(selection) {
      var metric = element.metric(), group = metric.group(), variableRangeGroup = new VariableRangeGroup(group, attributes.keyAccessor), size = geometry(element), container = selection.append("div").classed("chart bar-chart", true);
      metric.on("ready", function init() {
        var chart = dc.barChart(container.node()).width(size.width - 40).height(size.height - 140).margins({
          top: 10,
          right: 10,
          bottom: 30,
          left: 60
        }).dimension(metric.dimension()).group(variableRangeGroup).keyAccessor(attributes.keyAccessor).valueAccessor(attributes.valueAccessor).x(createScale(metric)).xUnits(dc.units.ordinal);
        chart.elasticY(true).elasticX(true).centerBar(true).renderHorizontalGridLines(true).brushOn(false);
        chart.render();
      });
      metric.on("filter", function(dimension, filter) {
        var value = group.all();
        if (isArray(filter) && isDate(filter[0]) && isArray(value) && isDate(attributes.keyAccessor(value[0]))) {
          variableRangeGroup.range(filter);
        }
      });
    };
  });
  informant.defineElement("pie", function(element) {
    var attributes = {
      donut: false
    };
    addMutators(element, attributes, [ "donut" ]);
    return function(selection) {
      var metric = element.metric(), size = geometry(element), container = selection.append("div").classed("chart pie-chart", true);
      metric.on("ready", function init() {
        var radius = size.width / 2 - 60, width = radius * 2 + 6, opacityScale = d3.scale.linear().domain([ 0, metric.group().size() - 1 ]).range([ "rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)" ]);
        var chart = dc.pieChart(container.node()).width(width).height(width).radius(radius).dimension(metric.dimension()).group(metric.group());
        if (element.donut()) {
          chart.innerRadius(radius / 3);
        }
        chart.minAngleForLabel(.05);
        var domain = [];
        for (var i = 0, s = metric.group().size(); i < s; i++) {
          domain.push(i);
        }
        chart.colors(domain.map(opacityScale));
        chart.render();
      });
    };
  });
  informant.defineElement("bubble", function(element) {
    var valueProp = valueAt("value"), attributes = {
      keyAccessor: valueAt("key"),
      valueAccessor: valueAt("value"),
      radiusAccessor: valueAt("radius")
    };
    addMutators(element, attributes, [ "keyAccessor", "valueAccessor", "radiusAccessor" ]);
    return function(selection) {
      var metric = element.metric(), size = geometry(element), keyAccessor = pipe(element.keyAccessor(), valueProp), valueAccessor = pipe(element.valueAccessor(), valueProp), radiusAccessor = pipe(element.radiusAccessor(), valueProp), container = selection.append("div").classed("chart bubble-chart", true);
      metric.on("ready", function init() {
        var chart = dc.bubbleChart(container.node()).width(size.width - 40).height(size.height - 140).margins({
          top: 10,
          right: 50,
          bottom: 30,
          left: 50
        }).dimension(metric.dimension()).group(metric.group()).x(createScale(metric, keyAccessor)).y(createScale(metric, valueAccessor)).r(createScale(metric, radiusAccessor)).keyAccessor(keyAccessor).valueAccessor(valueAccessor).radiusValueAccessor(radiusAccessor);
        chart.colors(d3.scale.category20c()).maxBubbleRelativeSize(.09).renderLabel(true).elasticX(true).elasticY(true).renderHorizontalGridLines(true).renderVerticalGridLines(true).brushOn(false);
        chart.render();
      });
    };
  });
  root["informant"] = informant;
})();