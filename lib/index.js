var exec = require('child_process').exec;
var path = require('path');
var fs = require('fs');
var walkdir = require('walkdir');
var Mustache = require('mustache');
var glob = require('glob');

var lib = path.join(__dirname, './../lib');

var render = function(template, context) {
  return Mustache.to_html(template, context);
}

var loadScripts = function(config, f) {
  fs.exists(config, function(exists) {
    if (exists) {
      var sourceFiles = [], filePath;
      var scripts = require(path.join(process.cwd(), config));

      scripts.forEach(function(script) {
        filePath = path.join(process.cwd(), script);
        files = glob.sync(filePath)
        if (files.length === 0) {
          throw {name: 'FsError', message: "Nothing found at " + filePath};
        }

        sourceFiles = sourceFiles.concat(files);
      });
      f(sourceFiles);
    }
    else {
      f();
    }
  });
}

var loadSpecs = function(f) {
  var dir = process.argv[2] || 'spec';
  specPath = path.join(process.cwd(), dir);

  fs.exists(specPath, function(exists) {
    if (!exists) {
      specPath = path.join(process.cwd(), 'spec');
    }

    fs.exists(specPath, function(exists) {
      if (!exists) {
        throw {name: 'FsError', message: specPath + " does not exist"};
      }

      if (path.extname(specPath) == '.js') {
        f([ specPath ]);
      }
      else {
        var files = walkdir.sync(specPath);
        var specs = files.filter(function(file) {
          return path.extname(file) == '.js';
        });

        f(specs);
      }
    });
  });
}

var runTests = function(runner) {
  var cmds = [
    'phantomjs',
    path.join(lib, 'run_jasmine_test.coffee'),
    runner
  ];

  var command = cmds.join(' ');

  exec(command, function(err, stdout, stderr) {
    console.log(stdout);

    if (process.argv.indexOf('--browser') === -1) {
      fs.unlinkSync(runner);
    }

    process.exit(err && err.code || 0);
  });
}

var createRunner = function(html) {
  var runner = path.join(process.cwd(), 'runner.html');

  fs.writeFile(runner, html, function(err, data, error) {
    runTests(runner);
  });
}

var loadTemplate = function(trace, format, config, template) {
  var trace = trace || false;
  var format = format || "none";

  var template = path.join(lib, template);

  fs.readFile(template, function(err, data, error) {
    loadScripts(config, function(scripts) {
      loadSpecs(function(specs) {
        var vendor = path.join(__dirname, './../vendor');

        var context = {
          scripts: scripts,
          specs:   specs,
          lib:     lib,
          vendor:  vendor,
          trace:   trace,
          format:  format
        };

        var html = render(data.toString(), context);

        createRunner(html);
      });
    });
  });
}

module.exports = function(program) {
  loadTemplate(program.trace, program.format, program.config, program.runnerTemplate);
}
