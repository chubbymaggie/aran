var Stream = require("stream");
var Otiluke = require("otiluke");
var Browserify = require("browserify");
var Minimist = require("minimist");

var args = Minimist(process.argv.slice(2));
if ("help" in args)
  console.log("Usage: aran --entry /absolute/path/to/main.js --port 8080")
if (!args.entry)
  throw "Argument --entry is mandatory"

var buffer = [];
var writable = new Stream.Writable();
writable._write = function (chunk, encoding, done) {
  buffer.push(chunk.toString("utf8"));
  done();
};
writable.on("finish", function () {
  buffer.push("\nrequire('main');");
  Otiluke(args.log, "aran", buffer.join(""), args.port);
});
var b = Browserify();
b.require(args.entry, {expose:"main"});
b.bundle().pipe(writable);