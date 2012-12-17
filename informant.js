(function() {
  function select(target) {
    return target instanceof d3.selection ? target : d3.select(target);
  }
  function createMutator(name, store, context) {
    return function(value) {
      if (!arguments.length) {
        return store[name];
      }
      store[name] = value;
      return context;
    };
  }
  function addMutators(context, store, names) {
    names.forEach(function(name) {
      context[name] = createMutator(name, store, context);
    });
  }
  function extend(target, obj) {
    keys(obj).forEach(function(attr) {
      target[attr] = obj[attr];
    });
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
  var root = this, d3 = root.d3;
  var informant = {
    version: "0.1.0"
  };
  var elementTypes = [];
  informant.defineElement = function(name, definition) {
    if (informant[name]) {
      throw new Error("Attempting to define element that already exists or is protected: '" + name + "'");
    }
    elementTypes.push(name);
    informant[name] = function(options) {
      var element, attributes = {
        height: 200,
        width: 200
      };
      var instance = function(target) {
        var container = select(target).append("div").classed("element element-" + name, true).style("height", instance.height() + "px").style("width", instance.width() + "px");
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
      instance.size = function(h, w) {
        if (!arguments.length) {
          return [ instance.height(), instance.width() ];
        }
        return instance.height(h).width(w);
      };
      element = definition(instance);
      if (isObject(options)) {
        keys(options).forEach(function(attr) {
          if (isFunction(this[attr])) {
            this[attr](options[attr]);
          }
        });
      }
      return instance;
    };
  };
  informant.group = function() {
    var group, instances = [];
    group = function(target) {
      var group = select(target).append("div").classed("group", true).style("position", "relative");
      instances.forEach(function(element) {
        group.append("div").classed("element-wrapper", true).style("position", "absolute").style("top", element.top() + "px").style("left", element.left() + "px").call(element);
      });
      return group;
    };
    elementTypes.forEach(function(name) {
      group[name] = function(options) {
        var instance = informant[name](options), attributes = {
          top: 0,
          left: 0
        };
        instances.push(instance);
        addMutators(instance, attributes, [ "top", "left" ]);
        instance.position = function(t, l) {
          if (!arguments.length) {
            return [ instance.top(), instance.left() ];
          }
          return instance.top(t).left(l);
        };
        instance.end = function() {
          return group;
        };
        return instance;
      };
    });
    group.render = group;
    return group;
  };
  var keys = Object.keys;
  var isFunction = is("function");
  var isObject = is("object");
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
      function xScale() {
        var domain = metric.domain(), scale = domain[0] instanceof Date ? d3.time.scale() : d3.scale.linear();
        return scale.domain(d3.extent(domain));
      }
      var metric = element.metric(), container = selection.append("div").classed("chart line-chart", true);
      metric.on("ready", function init() {
        var chart = dc.lineChart(container.node()).width(element.width() - 40).height(element.height() - 140).margins({
          top: 10,
          right: 10,
          bottom: 30,
          left: 50
        }).dimension(metric.dimension()).group(metric.group()).x(xScale());
        chart.elasticY(true).renderHorizontalGridLines(true).brushOn(false).renderArea(true);
        chart.xAxis().ticks(d3.time.days).tickFormat(function(date) {
          return date.getMonth() + 1 + "/" + date.getDate();
        });
        chart.render();
      });
    };
  });
  informant.defineElement("pie", function(element) {
    return function(selection) {
      var metric = element.metric(), container = selection.append("div").classed("chart pie-chart", true);
      metric.on("ready", function init() {
        var opacityScale = d3.scale.linear().domain([ 0, metric.group().size() - 1 ]).range([ "rgba(0,0,0,0.2)", "rgba(0,0,0,0.7)" ]);
        var chart = dc.pieChart(container.node()).width(element.width()).height(element.width()).radius(element.width() / 2 - 2).innerRadius(element.width() / 5).dimension(metric.dimension()).group(metric.group());
        var domain = [];
        for (var i = 0, size = metric.group().size(); i < size; i++) {
          domain.push(i);
        }
        chart.colors(domain.map(opacityScale));
        chart.render();
      });
    };
  });
  root["informant"] = informant;
})();