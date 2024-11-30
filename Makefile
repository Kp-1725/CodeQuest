# Partially based off of:
# http://nefariousdesigns.co.uk/website-builds-using-make.html

# Set defaults
mod ?= default
mod-dir = $(mod)
js-target = scripts/build/untrusted.js
js-target-min = scripts/build/untrusted.min.js

js-modules = scripts/util.js \
             mods/$(mod-dir)/intro.js \
             scripts/_head.js \
             scripts/game.js \
             scripts/codeEditor.js \
             scripts/display.js \
             scripts/dynamicObject.js \
             scripts/inventory.js \
             scripts/map.js \
             scripts/objects.js \
             scripts/player.js \
             scripts/reference.js \
             scripts/sound.js \
             scripts/validate.js \
             scripts/ui.js \
             levels/levels.js \
             scripts/_launcher_release.js \
             scripts/_tail.js

js-modules-debug = $(js-modules:.js=_debug.js)

yui-jar = tools/yuicompressor-2.4.8pre.jar
VERBOSE ?= 0

# Verbose debugging
ifeq ($(VERBOSE), 1)
VERBOSE_ECHO = @echo
else
VERBOSE_ECHO = @:
endif

# Check for missing mod or files
err := $(shell if [ ! -d "mods/$(mod-dir)" ] || [ ! -f "mods/$(mod-dir)/intro.js" ]; then echo "Error: Mod [$(mod-dir)] or its intro.js not found!"; fi)
ifneq ($(err),)
$(error $(err))
endif

# Targets
.PHONY: debug release clean deploy deploy-full deploy-debug deploy-debug-full deploy-github runlocal check-env prepare-site prepare-site-full

# Helper to prepare basic site structure
prepare-site:
	@rm -rf _site
	@mkdir _site
	@cp -R levels scripts styles images sound index.html _site

prepare-site-full: prepare-site
	@cp -R music lib _site

# `make debug` merges scripts (using debug launcher)
debug: check-env
	$(VERBOSE_ECHO) "Merging JS files for debug…"
	@echo "Building level file…\t\t\t\c"
	@./compile_levels.sh $(mod-dir)
	@echo "[ Done ]"
	@echo "Merging JS files…\t\t\t\c"
	@cat $(js-modules-debug) > $(js-target)
	@./parse_target.sh $(js-target) $(mod-dir)
	@echo "[ Done ]"

# `make release` merges and compresses scripts (using release launcher)
release: check-env
	@rm -f $(js-target-min)
	@echo "Building level file…\t\t\t\c"
	@./compile_levels.sh $(mod-dir)
	@echo "[ Done ]"
	@echo "Merging JS files…\t\t\t\c"
	@cat $(js-modules) > $(js-target)
	@./parse_target.sh $(js-target) $(mod-dir)
	@echo "[ Done ]"
	@echo "Compressing merged JS…\t\t\t\c"
	@java -jar $(yui-jar) -o $(js-target-min) $(js-target)
	@echo "[ Done ]"

# `make clean` removes built scripts
clean:
	@rm -f $(js-target) $(js-target-min)

# `make deploy` deploys Untrusted to your own server
deploy: release prepare-site
	@echo "Deploying to server…\t\t\t\c"
	@./deploy.sh /untrusted _site
	@rm -rf _site
	@echo "[ Done ]"

# `make deploy-full` also deploys music and libs
deploy-full: release prepare-site-full
	@echo "Deploying to server…\t\t\t\c"
	@./deploy.sh /untrusted _site
	@rm -rf _site
	@echo "[ Done ]"

# `make deploy-debug` deploys the debug version to /debug
deploy-debug: debug prepare-site
	@echo "Deploying to server…\t\t\t\c"
	@./deploy.sh /untrusted/debug _site
	@rm -rf _site
	@echo "[ Done ]"

# `make deploy-debug-full` deploys the debug version with full assets
deploy-debug-full: debug prepare-site-full
	@echo "Deploying to server…\t\t\t\c"
	@./deploy.sh /untrusted/debug _site
	@rm -rf _site
	@echo "[ Done ]"

# `make deploy-github` deploys to GitHub Pages
deploy-github: release
	@git checkout gh-pages && git merge master --no-commit && make release && git commit -am "build" && git push origin gh-pages && git checkout master && make

# Check environment dependencies
check-env:
	@command -v java >/dev/null 2>&1 || { echo "Error: Java not found. Install Java to proceed."; exit 1; }
	@command -v ./node_modules/http-server/bin/http-server >/dev/null 2>&1 || { echo "Error: http-server not found. Run 'npm install' to install dependencies."; exit 1; }

# Start local server
runlocal: debug
	@echo "Running local instance on port 8000"
	@command -v ./node_modules/http-server/bin/http-server >/dev/null 2>&1 && \
		./node_modules/http-server/bin/http-server -c-1 || \
		python3 -m http.server 8000

