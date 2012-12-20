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
  var slice = Function.prototype.call.bind(Array.prototype.slice);
  var keys = Object.keys;
  var isFunction = is("function");
  var isObject = is("object");
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
      var element, attributes = {
        height: 200,
        width: 200
      };
      var instance = function(target) {
        var size = geometry(instance), container = select(target).append("div");
        container.classed("element element-" + name, true).style("height", size.height + "px").style("width", size.width + "px");
        if (instance.header()) {
          container.append("header").html(instance.header());
        }
        container.append("div").classed("content", true).call(element);
        if (instance.footer()) {
          container.append("footer").html(instance.footer());
        }
        return instance;
      };
      instance.render = instance;
      addMutators(instance, attributes, [ "metric", "width", "height", "header", "footer" ]);
      addShortcutMutator(instance, "size", [ "height", "width" ]);
      element = definition(instance);
      return applyOptions(instance, opts);
    };
  };
  informant.group = function() {
    var group, instances = [];
    group = function(target) {
      var group = select(target).append("div").classed("informant group", true).style("position", "relative");
      instances.forEach(function(element) {
        var position = geometry(element), wrapper = group.append("div");
        wrapper.style("position", "absolute").style("top", position.top + "px").style("left", position.left + "px").classed("wrapper", true).call(element);
        if (element.id()) {
          wrapper.attr("id", element.id());
        }
        if (element.classes()) {
          wrapper.classed(element.classes(), true);
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
          metric.filter(accessor(d) === metric.filter() ? null : d.key);
          if (dc) {
            dc.redrawAll();
          }
        });
        items.exit().remove();
      });
    };
  });
  informant.defineElement("graph", function(element) {
    return function(selection) {
      var metric = element.metric(), size = geometry(element), container = selection.append("div").classed("chart line-chart", true);
      metric.on("ready", function init() {
        var chart = dc.lineChart(container.node()).width(size.width - 40).height(size.height - 140).margins({
          top: 10,
          right: 10,
          bottom: 30,
          left: 50
        }).dimension(metric.dimension()).group(metric.group()).x(createScale(metric));
        chart.elasticY(true).renderHorizontalGridLines(true).brushOn(false).renderArea(true);
        chart.xAxis().ticks(d3.time.days).tickFormat(function(date) {
          return date.getMonth() + 1 + "/" + date.getDate();
        });
        chart.render();
      });
    };
  });
  informant.defineElement("bar", function(element) {
    return function(selection) {
      var metric = element.metric(), size = geometry(element), container = selection.append("div").classed("chart bar-chart", true);
      metric.on("ready", function init() {
        var chart = dc.barChart(container.node()).width(size.width - 40).height(size.height - 140).margins({
          top: 10,
          right: 10,
          bottom: 30,
          left: 60
        }).dimension(metric.dimension()).group(metric.group()).x(createScale(metric)).xUnits(dc.units.ordinal);
        chart.elasticY(true).centerBar(true).renderHorizontalGridLines(true).brushOn(false);
        chart.render();
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
      keyAccessor: "key",
      valueAccessor: "value",
      radiusAccessor: "radius"
    };
    addMutators(element, attributes, [ "keyAccessor", "valueAccessor", "radiusAccessor" ]);
    return function(selection) {
      var metric = element.metric(), size = geometry(element), keyAccessor = pipe(valueAt(element.keyAccessor()), valueProp), valueAccessor = pipe(valueAt(element.valueAccessor()), valueProp), radiusAccessor = pipe(valueAt(element.radiusAccessor()), valueProp), container = selection.append("div").classed("chart bubble-chart", true);
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