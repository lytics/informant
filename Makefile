# See the README for installation instructions.

NODE_PATH ?= ./node_modules
JS_COMPILER = $(NODE_PATH)/uglify-js/bin/uglifyjs
JS_BEAUTIFIER = $(JS_COMPILER) -b -i 2 -nm -ns
JS_TESTER = $(NODE_PATH)/vows/bin/vows
CSS_COMPILER = $(NODE_PATH)/less/bin/lessc
CSS_MINIFIER = $(CSS_COMPILER) --yui-compress

all: \
	informant.js \
	informant.min.js \
	informant.css \
	informant.min.css \
	package.json

full: \
	informant.embed.js \
	informant.embed.min.js

informant.embed.js: \
	lib/d3/d3.v2.js \
	lib/crossfilter/crossfilter.js \
	lib/analyst/analyst.js \
	lib/dc/dc.js \
	informant.js

.INTERMEDIATE informant.js: \
	src/start.js \
	src/core.js \
	src/util.js \
	src/element.js \
	src/group.js \
	informant.elements.js \
	src/d3.js \
	src/export.js \
	src/end.js

informant.elements.js: \
	src/elements/html.js \
	src/elements/number.js \
	src/elements/list.js \
	src/elements/filter.js \
	src/elements/graph.js \
	src/elements/bar.js \
	src/elements/pie.js \
	src/elements/bubble.js

.INTERMEDIATE informant.css: \
	less/informant.less \
	less/variables.less \
	less/reset.less \
	less/mixins.less \
	less/element.less \
	less/elements/html.less \
	less/elements/number.less \
	less/elements/list.less \
	less/elements/filter.less \
	less/elements/graph.less \
	less/elements/bar.less \
	less/elements/pie.less \
	less/elements/bubble.less

test: all
	@$(JS_TESTER)

%.min.js: %.js
	@rm -f $@
	@echo "Minifying to $@..."
	$(JS_COMPILER) < $< > $@

%.js:
	@rm -f $@
	@echo "Compiling $@..."
	cat $(filter %.js,$^) | $(JS_BEAUTIFIER) > $@

%.min.css: %.css
	@rm -f $@
	@echo "Minifying to $@..."
	$(CSS_MINIFIER) $< > $@

%.css:
	@echo "Compiling $@..."
	$(CSS_COMPILER) $(filter %.less,$<) $@

%.less:
	@cat /dev/null

package.json: src/package.js src/core.js
	@rm -f $@
	node src/package.js > $@
	@chmod a-w $@

watch:
	@echo "watching 'src' and 'less' directories..."
	@node -e " \
		require('watchr').watch({ \
			paths: ['src/','less/'], \
			listener: function() { \
				require('child_process').exec('make', function(err, out) { \
					require('sys').puts(out); \
				}); \
			} \
		});"

clean:
	rm -f informant*

.PHONY: all test watch clean
