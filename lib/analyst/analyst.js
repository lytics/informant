(function() {
  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  function is(type) {
    var constructor = capitalize(type);
    return function(obj) {
      return Object.prototype.toString.call(obj) === "[object " + constructor + "]";
    };
  }
  function zero() {
    return 0;
  }
  function object() {
    return {};
  }
  function fieldName(field, modifier) {
    return (field ? field + "." : "") + modifier;
  }
  function valueFor(indexer, field) {
    if (isFunction(field)) {
      return function(d) {
        return field(d, indexer);
      };
    }
    return function(d) {
      var index = indexer(field);
      return index !== null ? d[index] : null;
    };
  }
  function valueAt(index) {
    return function(d) {
      return d[index];
    };
  }
  function addEventHandling(target) {
    var callbacks = {};
    target.on = function(events, callback, context) {
      var event, node, tail, list;
      if (!callback) return target;
      events = events.split(eventSplitter);
      while (event = events.shift()) {
        list = callbacks[event];
        node = list ? list.tail : {};
        node.next = tail = {};
        node.context = context;
        node.callback = callback;
        callbacks[event] = {
          tail: tail,
          next: list ? list.next : node
        };
      }
      return target;
    };
    target.off = function(events, callback, context) {
      var event, node, tail, cb, ctx;
      if (!(events || callback || context)) {
        callbacks = {};
        return target;
      }
      events = events ? events.split(eventSplitter) : _.keys(callbacks);
      while (event = events.shift()) {
        node = callbacks[event];
        delete callbacks[event];
        if (!node || !(callback || context)) continue;
        tail = node.tail;
        while ((node = node.next) !== tail) {
          cb = node.callback;
          ctx = node.context;
          if (callback && cb !== callback || context && ctx !== context) {
            target.on(event, cb, ctx);
          }
        }
      }
      return target;
    };
    target.trigger = function(events) {
      var event, node, tail, args, all, rest;
      all = callbacks.all;
      events = events.split(eventSplitter);
      rest = [].slice.call(arguments, 1);
      while (event = events.shift()) {
        if (node = callbacks[event]) {
          tail = node.tail;
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || target, rest);
          }
        }
        if (node = all) {
          tail = node.tail;
          args = [ event ].concat(rest);
          while ((node = node.next) !== tail) {
            node.callback.apply(node.context || target, args);
          }
        }
      }
      return target;
    };
  }
  var root = this, d3 = root.d3, crossfilter = root.crossfilter;
  var analyst = {
    version: "0.1.0"
  };
  var drivers = {};
  analyst.addDriver = function(name, driver) {
    if (analyst[name]) {
      throw new Error("Attempting to add a driver that already exists or is protected: '" + name + "'");
    }
    drivers[name] = driver;
    analyst[name] = function() {
      var args = [ name ].concat(slice(arguments));
      return analyst.source.apply(analyst, args);
    };
    return analyst;
  };
  var slice = Function.prototype.call.bind(Array.prototype.slice);
  var keys = Object.keys;
  var isString = is("string");
  var isFunction = is("function");
  var isObject = is("object");
  var isArray = Array.isArray;
  var eventSplitter = /\s+/;
  analyst.source = function(type) {
    function defaultIndexer(field) {
      return field in fieldMap ? fieldMap[field] : null;
    }
    if (!drivers[type]) {
      throw new Error("Source type '" + type + "' unknown");
    }
    var source = {}, filterStack = [], sanitizer, fieldMap = {}, indexer, cf = crossfilter(), dimensions = {}, fetch, timeout;
    addEventHandling(source);
    source.add = function(data) {
      if (!isArray(data)) {
        throw new Error("Input data must be an array");
      }
      var ready = !cf.size(), clean;
      if (sanitizer) {
        data = data.reduce(function(cleansed, d) {
          if (clean = sanitizer(d, indexer || defaultIndexer)) {
            cleansed.push(clean);
          }
          return cleansed;
        }, []);
      }
      cf.add(data);
      if (ready) {
        source.trigger("ready");
      }
      source.trigger("change");
      return source;
    };
    source.sanitizer = function(s) {
      if (!arguments.length) {
        return filter;
      }
      if (!isFunction(s)) {
        throw new Error("Sanitizer must be a function");
      }
      sanitizer = s;
      return source;
    };
    source.fieldMap = function(fm) {
      if (!arguments.length) {
        return fieldMap;
      }
      if (!isObject(fm)) {
        throw new Error("Field map must be a plain object");
      }
      fieldMap = fm;
      return source;
    };
    source.indexer = function(i) {
      if (!arguments.length) {
        return indexer || defaultIndexer;
      }
      if (!isFunction(i)) {
        throw new Error("Indexer must be a function");
      }
      indexer = i;
      return source;
    };
    source.fetch = function() {
      if (isFunction(fetch)) {
        fetch();
      }
      return source;
    };
    source.start = function(interval) {
      source.stop();
      timeout = root.setTimeout(function send() {
        source.fetch(function() {
          root.setTimeout(send, interval);
        });
      }, interval);
      return source;
    };
    source.stop = function() {
      if (timeout) {
        timeout = root.clearTimeout(timeout);
      }
      return source;
    };
    source.metric = function() {
      return analyst.metric(source);
    };
    source.crossfilter = function() {
      return cf;
    };
    source.dimension = function(value) {
      if (!dimensions[value]) {
        var dimension = cf.dimension(valueFor(source.indexer(), value)), filter = dimension.filter;
        dimension.filter = function(value) {
          filter.call(dimension, value);
          dimension._value = value;
          source.trigger("filter", dimension, value);
          return dimension;
        };
        dimension._value = null;
        dimensions[value] = dimension;
      }
      return dimensions[value];
    };
    fetch = drivers[type].apply(source, slice(arguments, 1));
    return source;
  };
  analyst.metric = function(source) {
    function applyAliases(output) {
      var fields = keys(outputFields);
      return fields.length ? fields.reduce(function(data, field) {
        data[outputFields[field]] = output[field];
        return data;
      }, {}) : output;
    }
    function applyTransforms(initial) {
      var fields = keys(outputFields), output = transformStack.reduce(function(v, transform) {
        return transform(v);
      }, initial);
      return fields.length === 1 ? output[fields[0]] : output;
    }
    function applyReduce(type) {
      return function(result, d) {
        return reduceStack.reduce(function(data, reduction) {
          data[reduction.field] = reduction[type](data[reduction.field], d);
          return data;
        }, result || {});
      };
    }
    function addReduce(reduce, suffix) {
      return function(field) {
        var transforms = slice(arguments, 1), outputField = fieldName(field, suffix), alias = isFunction(transforms[0]) ? outputField : transforms.shift() || outputField;
        outputFields[outputField] = alias;
        transforms.forEach(function(transform) {
          transformStack.push(function(d) {
            d[alias] = transform(d[alias]);
            return d;
          });
        });
        return reduce(field, outputField);
      };
    }
    function countReduce() {
      return metric.reduce(function(count) {
        return count + 1;
      }, function(count) {
        return count - 1;
      }, zero, "count");
    }
    function sumReduce(field, outputField) {
      var value = valueFor(source.indexer(), field);
      return metric.reduce(function(sum, d) {
        return sum + value(d);
      }, function(sum, d) {
        return sum - value(d);
      }, zero, outputField);
    }
    function averageReduce(field, outputField) {
      var totalField = fieldName(field, "total");
      if (!(outputField in applyInitial())) {
        countReduce();
        sumReduce(field, totalField);
        transformStack.unshift(function(d) {
          d[outputField] = d.count ? d[totalField] / d.count : 0;
          return d;
        });
      }
      return metric;
    }
    function distinctReduce(field, outputField) {
      var value = valueFor(source.indexer(), field);
      return metric.reduce(function(distinct, d) {
        var v = value(d);
        if (v in distinct) {
          distinct[v]++;
        } else {
          distinct[v] = 1;
        }
        return distinct;
      }, function(distinct, d) {
        var v = value(d);
        if (v in distinct) {
          distinct[v]--;
          if (!distinct[v]) {
            delete distinct[v];
          }
        }
        return distinct;
      }, object, outputField);
    }
    function distinctCountReduce(field, outputField) {
      var value = valueFor(source.indexer(), field), distinctsField = fieldName(field, "distincts");
      if (!(outputField in applyInitial())) {
        distinctReduce(field, distinctsField);
        transformStack.unshift(function(d) {
          d[outputField] = keys(d[distinctsField]).length;
          return d;
        });
      }
      return metric;
    }
    var metric = {}, dimension, group, outputFields = {}, reduceStack = [], transformStack = [ applyAliases ], dateValue = valueFor(source.indexer(), "_date"), applyAdd = applyReduce("add"), applyRemove = applyReduce("remove"), applyInitial = applyReduce("initial");
    addEventHandling(metric);
    metric.by = function(field) {
      if (dimension) {
        throw new Error("A metric can only be dimensioned once");
      }
      dimension = source.dimension(field);
      return metric;
    };
    [ "hour", "day", "week", "month" ].forEach(function(interval) {
      var methodName = "by" + capitalize(interval);
      metric[methodName] = function() {
        return metric.by(function(d) {
          return d3.time[interval](dateValue(d));
        });
      };
    });
    metric.byDate = function(value) {
      return metric.by(function(d) {
        return value ? value(dateValue(d)) : dateValue(d);
      });
    };
    metric.byDateFormat = function(formatStr) {
      var format = d3.time.format(formatStr);
      return metric.by(function(d) {
        return format(dateValue(d));
      });
    };
    metric.byDayOfWeek = function(string, abbr) {
      string = string === undefined || string;
      return string ? metric.byDateFormat(abbr ? "%a" : "%A") : function(d) {
        return dateValue(d).getDay();
      };
    };
    metric.byHourOfDay = function() {
      return metric.by(function(d) {
        return dateValue(d).getHours();
      });
    };
    metric.reduce = function(reduceAdd, reduceRemove, initialValue, outputField) {
      outputField = outputField || "output";
      if (!(outputField in applyInitial())) {
        reduceStack.push({
          add: reduceAdd,
          remove: reduceRemove,
          initial: initialValue,
          field: outputField
        });
      }
      return metric;
    };
    metric.count = addReduce(countReduce);
    metric.sum = addReduce(sumReduce, "total");
    metric.average = addReduce(averageReduce, "average");
    metric.distinct = addReduce(distinctReduce, "distincts");
    metric.distinctCount = addReduce(distinctCountReduce, "distinct_total");
    metric.dimension = function() {
      return dimension;
    };
    metric.filter = function(value) {
      if (!dimension) {
        throw new Error("A metric can only be filtered after being dimensioned");
      }
      return value === undefined ? dimension._value : dimension.filter.call(dimension, value);
    };
    metric.group = function() {
      if (!group) {
        group = dimension ? dimension.group() : source.crossfilter().groupAll();
        if (reduceStack.length) {
          group.reduce(applyAdd, applyRemove, applyInitial);
        }
        if (group.all) {
          var all = group.all;
          group.all = function() {
            return all.call(group).map(function(result) {
              return {
                key: result.key,
                value: applyTransforms(result.value)
              };
            });
          };
        } else {
          var value = group.value;
          group.value = function() {
            return applyTransforms(value.call(group));
          };
        }
      }
      return group;
    };
    metric.value = function() {
      var group = metric.group();
      return group[group.value ? "value" : "all"]();
    };
    metric.domain = function() {
      if (!dimension) {
        return null;
      }
      return metric.group().all().map(valueAt("key"));
    };
    metric.extract = function(field) {
      transformStack.push(valueAt(field));
      return metric;
    };
    metric.transform = function(transform) {
      var transforms = slice(arguments);
      transformStack = transformStack.concat(transforms);
      return metric;
    };
    [ "ready", "change", "filter" ].forEach(function(event) {
      source.on(event, function() {
        var args = [ event ].concat(slice(arguments));
        metric.trigger.apply(metric, args);
      });
    });
    source.on("filter", function(filteredDimension, filterValue) {
      if (!dimension || filteredDimension !== dimension) {
        metric.trigger("change");
      }
    });
    return metric;
  };
  analyst.addDriver("preload", function(data, fieldMap) {
    if (isObject(fieldMap)) {
      this.fieldMap(fieldMap);
    }
    this.add(isArray(data) ? data : []);
  });
  analyst.addDriver("lytics", function(options) {
    var source = this;
    options = options || {};
    return function(limit) {
      var baseUrl = options.url || "//api.lytics.io", url = baseUrl + "/api/" + (options.clientId ? options.clientId + "/" : "") + options.query, data = options.data || {}, params = [];
      var script = document.createElement("script");
      var cbName = "analyst_lytics_" + (new Date).getTime();
      params.push("callback=" + cbName);
      Object.keys(data).forEach(function(key) {
        params.push(key + "=" + data[key]);
      });
      if (params.length) {
        url += "?" + params.join("&");
      }
      var handleResponse = function(response) {
        var data = [];
        if (response.meta) {
          var dimensions = response.meta.dimensions, measures = response.meta.measures, fields = {};
          offset = 1;
          if (dimensions && dimensions.length > 0) {
            dimensions.forEach(function(field, index) {
              fields[field] = index;
            });
            offset = dimensions.length;
          } else {
            fields._ = 0;
          }
          measures.forEach(function(measure, index) {
            fields[measure.As] = index + offset;
          });
          fields._ts = offset + measures.length;
          fields._date = fields._ts + 1;
          source.fieldMap(fields);
        }
        if (response.data) {
          response.data.forEach(function(segment) {
            var ts = segment._ts, date = new Date(ts.ts * 1e3);
            segment.rows.forEach(function(row, index) {
              row.push(ts.ts);
              row.push(date);
              data.push(row);
            });
          });
        }
        source.add(data);
        delete root[cbName];
        script.remove();
      };
      script.src = url;
      root[cbName] = handleResponse;
      document.body.appendChild(script);
    };
  });
  if (typeof exports !== "undefined") {
    exports.analyst = analyst;
  } else if (typeof define === "function" && define.amd) {
    define("analyst", function() {
      return analyst;
    });
  } else {
    root["analyst"] = analyst;
  }
})();