// D3

// Add path interpolator to d3
// Note: this must come after the core file is included, otherwise d3 will be undefined
d3.interpolators.push(function(a, b) {
  var isPath, isArea, interpolator, ac, bc, an, bn;

  // Create a new array of a given length and fill it with the given value
  function fill(value, length) {
    return d3.range(length)
      .map(function() {
        return value;
      });
  }

  // Extract an array of coordinates from the path string
  function extractCoordinates(path) {
    return path.substr(1, path.length - (isArea ? 2 : 1)).split('L');
  }

  // Create a path from an array of coordinates
  function makePath(coordinates) {
    return 'M' + coordinates.join('L') + (isArea ? 'Z' : '');
  }

  // Buffer the smaller path with coordinates at the same position
  function bufferPath(p1, p2) {
    var d = p2.length - p1.length;

    if (isArea) {
      return fill(p1[0], d/2).concat(p1, fill(p1[p1.length - 1], d/2));
    } else {
      return fill(p1[0], d).concat(p1);
    }
  }

  isPath = /M-?\d*\.?\d*,-?\d*\.?\d*(L-?\d*\.?\d*,-?\d*\.?\d*)*Z?/;

  if (isPath.test(a) && isPath.test(b)) {
    isArea = a[a.length - 1] === 'Z';
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

    // Create an interpolater with the buffered paths (if both paths are of the same length,
    // the function will end up being the default string interpolator)
    interpolator = d3.interpolateString(bn > an ? makePath(ac) : a, an > bn ? makePath(bc) : b);

    // If the ending value changed, make sure the final interpolated value is correct
    return bn > an ? interpolator : function(t) {
      return t === 1 ? b : interpolator(t);
    };
  }
});
