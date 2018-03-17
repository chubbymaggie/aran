const ArrayLite = require("array-lite");
const TrapArguments = require("./trap-arguments.js");
const Object_keys = Object.keys;

const empty = () => null;
function last () { return arguments[arguments.length-1] }

ArrayLite.forEach(
  Object_keys(TrapArguments.combiners),
  (key) => exports[key] = (
    TrapArguments.combiners[key].length === 1 ?
    (argument0) => ARAN.build[key](argument0) :
    (
      TrapArguments.combiners[key].length === 2 ?
      (argument0, argument1) => ARAN.build[key](argument0, argument1) :
      (argument0, argument1, argument2) => ARAN.build[key](argument0, argument1, argument2))));

exports.arrival = (boolean, expression1, expression2, expression3) => ARAN.build.array([
  expression1,
  expression2,
  expression3]);

ArrayLite.forEach(
  Object_keys(TrapArguments.informers),
  (key) => exports[key] = empty);

ArrayLite.forEach(
  Object_keys(TrapArguments.modifiers),
  (key) => exports[key] = last);
