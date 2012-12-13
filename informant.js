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
        select(target).append("div").classed("element element-" + name, true).style("height", instance.height() + "px").style("width", instance.width() + "px").call(element);
        return instance;
      };
      instance.render = instance;
      [ "metric", "width", "height" ].forEach(function(name) {
        instance[name] = createMutator(name, attributes, instance);
      });
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
        [ "top", "left" ].forEach(function(name) {
          instance[name] = createMutator(name, attributes, instance);
        });
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
  root["informant"] = informant;
  var keys = Object.keys;
  var isFunction = is("function");
  var isObject = is("object");
  informant.defineElement("number", function(element) {
    var attributes = {};
    var number = function(selection) {
      var metric = element.metric(), value;
      if (element.title()) {
        selection.append("h1").classed("title", true).html(element.title());
      }
      value = selection.append("h2").classed("value", true);
      if (element.description()) {
        selection.append("p").classed("description", true).html(element.description());
      }
      metric.on("change", function update() {
        value.text(metric.value());
      });
    };
    [ "title", "description" ].forEach(function(name) {
      element[name] = createMutator(name, attributes, element);
    });
    return number;
  });
  informant.defineElement("graph", function(element) {
    var graph = function(selection) {
      function xScale() {
        var domain = metric.domain(), scale = domain[0] instanceof Date ? d3.time.scale() : d3.scale.linear();
        return scale.domain(d3.extent(domain));
      }
      var metric = element.metric();
      metric.on("ready", function init() {
        var chart = dc.lineChart(selection.node()).width(element.width() - 40).height(element.height() - 140).margins({
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
    return graph;
  });
})();