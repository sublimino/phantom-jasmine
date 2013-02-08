#!/usr/local/bin/phantomjs

# Runs a Jasmine Suite from an html page
# @page is a PhantomJs page object
# @exit_func is the function to call in order to exit the script

fs = require("fs")

class PhantomJasmineRunner
  constructor: (@page, @exit_func = phantom.exit) ->
    @tries = 0
    @max_tries = 10

  get_status: -> @page.evaluate(-> console_reporter.status)

  terminate: ->
    switch @get_status()
      when "success" then @exit_func 0
      when "fail"    then @exit_func 1
      else                @exit_func 2

# Script Begin
if phantom.args.length == 0
  console.log "Need a url as the argument"
  phantom.exit 1

page = new WebPage()

runner = new PhantomJasmineRunner(page)

# Don't supress console output
page.onConsoleMessage = (msg) ->

  substring = msg.substring(0, 5)

  if substring is "junit"
    xmlStartPosition = msg.indexOf(" ", 6)
    filename = msg.substring(6, xmlStartPosition)
    xml = msg.substring(xmlStartPosition + 1)
    filepath = "test/output/" + filename
    fs.write filepath, xml, "w"

  else
    console.log msg

  finished = page.evaluate(-> console_reporter.finished)

  if finished
    runner.terminate()

address = phantom.args[0]

page.open address, (status) ->

  if status != "success"
    console.log "can't load the address!"
    phantom.exit 1

  # Now we wait until onConsoleMessage reads the termination signal from the log.