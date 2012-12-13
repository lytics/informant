# See the README for installation instructions.

NODE_PATH ?= ./node_modules
JS_COMPILER = $(NODE_PATH)/uglify-js/bin/uglifyjs
JS_BEAUTIFIER = $(NODE_PATH)/uglify-js/bin/uglifyjs -b -i 2 -nm -ns
JS_TESTER = $(NODE_PATH)/vows/bin/vows

all: \
	informant.js \
	informant.min.js

.INTERMEDIATE informant.js: \
	src/start.js \
	src/core.js \
	src/util.js \
	informant.elements.js \
	src/end.js

informant.elements.js: \
	src/elements/number.js \
	src/elements/graph.js

test: all
	@$(JS_TESTER)

%.min.js: %.js
	@rm -f $@
	$(JS_COMPILER) < $< > $@

%.js:
	@rm -f $@
	cat $(filter %.js,$^) | $(JS_BEAUTIFIER) > $@
	@chmod a-w $@

watch:
	@node -e " \
		require('watchr').watch({ \
			path: 'src/', \
			listener: function() { \
				require('child_process').exec('make', function(err, out) { \
					require('sys').puts(out); \
				}); \
			} \
		});"

clean:
	rm -f informant*.js
