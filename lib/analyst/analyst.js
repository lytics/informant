(function() {
  var root = this, d3 = root.d3, crossfilter = root.crossfilter;
  var analyst = {
    version: "0.1.0"
  };
  (function() {
    "use strict";
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
    var drivers = {};
    analyst.addDriver = function(name, driver) {
      function Driver(options) {
        this.options = options;
      }
      var constructor = driver.hasOwnProperty("constructor") ? driver.constructor : Driver;
      constructor.prototype = driver;
      drivers[name] = constructor;
    };
    analyst.source = function(type, options) {
      function getDimension(value) {
        if (!dimensions[value]) {
          var dimension = cf.dimension(valueFor(indexFor, value)), filter = dimension.filter;
          dimension.filter = function(value) {
            filter.call(dimension, value);
            dimension._value = value;
            dispatch.filter.call(source, dimension, value);
            return dimension;
          };
          dimension._value = null;
          dimensions[value] = dimension;
        }
        return dimensions[value];
      }
      if (!drivers[type]) {
        throw new Error("Source type '" + type + "' unknown");
      }
      var source = {}, filterStack = [], cf = crossfilter(), dimensions = {}, driver = new drivers[type](options), indexFor = driver.indexFor.bind(driver), dispatch = d3.dispatch("ready", "change", "filter"), metricId = 1, timeout;
      source.on = function(event, listener) {
        dispatch.on(event, listener);
        return source;
      };
      source.filter = function(filter) {
        filterStack.push(valueFor(indexFor, filter));
        return source;
      };
      source.fetch = function(callback) {
        driver.fetch(function(data) {
          var ready = !cf.size();
          cf.add(filterStack.reduce(function(data, filter) {
            return data.filter(filter);
          }, data));
          if (ready) {
            dispatch.ready.call(source);
          }
          dispatch.change.call(source);
          if (callback) {
            callback.call(source);
          }
        });
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
          var value = valueFor(indexFor, field);
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
          var value = valueFor(indexFor, field);
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
          var value = valueFor(indexFor, field), distinctsField = fieldName(field, "distincts");
          if (!(outputField in applyInitial())) {
            distinctReduce(field, distinctsField);
            transformStack.unshift(function(d) {
              d[outputField] = keys(d[distinctsField]).length;
              return d;
            });
          }
          return metric;
        }
        var metric = {}, dimension, group, outputFields = {}, reduceStack = [], transformStack = [ applyAliases ], dateValue = valueFor(indexFor, "_date"), applyAdd = applyReduce("add"), applyRemove = applyReduce("remove"), applyInitial = applyReduce("initial"), dispatch = d3.dispatch("ready", "change", "filter");
        metric.on = function(event, listener) {
          dispatch.on(event, listener);
          return metric;
        };
        metric.by = function(field) {
          if (dimension) {
            throw new Error("A metric can only be dimensioned once");
          }
          dimension = getDimension(field);
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
            group = dimension ? dimension.group() : cf.groupAll();
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
        source.on("change." + metricId, function() {
          dispatch.change.call(metric);
        });
        source.on("ready." + metricId, function() {
          dispatch.ready.call(metric);
        });
        source.on("filter." + metricId, function(filteredDimension, filterValue) {
          dispatch.filter.call(metric, filteredDimension, filterValue);
          if (!dimension || filteredDimension !== dimension) {
            dispatch.change.call(metric);
          }
        });
        metricId++;
        return metric;
      };
      return source;
    };
    var slice = Function.prototype.call.bind(Array.prototype.slice);
    var keys = Object.keys;
    var isFunction = is("function");
    var isObject = is("object");
    var isArray = Array.isArray;
  })();
  analyst.addDriver("lytics", {
    fetch: function(callback) {
      var self = this, options = this.options, baseUrl = options.url || "//api.lytics.io", url = baseUrl + "/api/" + (options.clientId ? options.clientId + "/" : "") + options.query, data = options.data || {}, params = [];
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
          self.fields = fields;
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
        callback(data);
        delete root[cbName];
        script.remove();
      };
      script.src = url;
      root[cbName] = handleResponse;
      document.body.appendChild(script);
    },
    indexFor: function(field) {
      var fields = this.fields;
      return fields && field in fields ? fields[field] : null;
    }
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