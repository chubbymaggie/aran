const ArrayLite = require("array-lite");
const Build = require("../../../build");
const TrapArguments = require("./trap-arguments.js");

const empty = () => null;
function pass () {
  return arguments[arguments.length-1];
}

ArrayLite.each(
  Object.keys(TrapArguments.combiners),
  (key) => exports[key] = Build[key]);

ArrayLite.each(
  Object.keys(TrapArguments.informers),
  (key) => exports[key] = empty);

ArrayLite.each(
  Object.keys(TrapArguments.consumers),
  (key) => exports[key] = pass);

ArrayLite.each(
  Object.keys(TrapArguments.producers),
  (key) => {
    const last = TrapArguments.producers[key].length-1;
    const transformer = TrapArguments.producers[key][last];
    exports[key] = function () {
      return transformer(arguments[last]);
    };
  });
