const Aran = require("aran");
const AranLive = require("aran-live");

const advice = {};
// Targets are wrappers to circumvent proxy invariants.
const handlers = {
  has: (target, key) => key in target.inner,
  deleteProperty: (target, key) => delete target.inner[key],
  get: (target, key, receiver) => typeof key === "symbol" ?
    target.inner[key] :
    produce(target.type+"-read", ["'"+key+"'"], target.inner[key], null),
  set: (target, key, value, receiver) => {
    target.inner[key] = key in target.inner ?
      consume(target.type+"-write", ["'"+key+"'"], value, null) :
      consume(target.type+"-declare", ["'var'", "'"+key+"'"], value, null)
  }
};

//////////////
// Membrane //
//////////////
const print = (value) => {
  if (typeof value === "function")
    return "function";
  if (typeof value === "object")
    return value ? "object" : "null";
  if (typeof value === "string")
    return JSON.stringify(value);
  return String(value);
};
let counter = 0;
const consume = (name, infos, value, serial) => {
  console.log(name+"("+infos.concat([value.meta]).join(", ")+", @"+serial+")");
  return value.base;
};
const produce = (name, infos, value, serial) => {
  const right = name+"("+infos.concat([print(value)]).join(", ")+", @"+serial+")";
  console.log("#"+(++counter)+" = "+right);
  return {meta:"&"+counter, base:value};
};
const combine = (value, name, infos, serial) => {
  const right = name+"("+infos.join(", ")+", @"+serial+")";
  console.log("#"+(++counter)+"["+print(value)+"] = "+right);
  return {meta:"&"+counter, base:value};
};

///////////////
// Consumers //
///////////////
advice.test = (value, serial) =>
  consume("test", [], value, serial);
advice.throw = (value, serial) =>
  consume("throw", [], value, serial);
advice.return = (scope, value, serial) =>
  consume("return", [], value, serial);
advice.success = (scope, value, serial) =>
   scope ? consume("success", [], value, serial) : value;
advice.with = (value, serial) =>
  new Proxy({type:"with",inner:consume("with", [], value, serial)}, handlers);
advice.eval = (value, serial) =>
  instrument(consume("eval", [], value, serial), serial);

///////////////
// Producers //
///////////////
advice.arrival = (strict, scope, serial) => ({
  callee: produce("arrival-callee", [strict], scope.callee, serial),
  new: produce("arrival-new", [strict], scope.new, serial),
  this: produce("arrival-this", [strict], scope.this, serial),
  arguments: produce("arrival-arguments", [strict], scope.arguments, serial)
});
advice.begin = (strict, scope, serial) => {
  if (scope) {
    Object.keys(scope).sort().reverse().forEach((key) => {
      scope[key] = produce("begin-"+key, [strict], scope[key]);
    });
  }
  return scope;
};
advice.primitive = (value, serial) =>
  produce("primitive", [], value, serial);
advice.regexp = (value, serial) =>
  produce("regexp", [], value, serial);
advice.closure = (value, serial) =>
  produce("closure", [], value, serial);
advice.catch = (value, serial) =>
  produce("catch", [], value, serial);
advice.discard = (identifier, value, serial) =>
  produce("discard", ["'"+identifier+"'"], value, serial);

///////////////
// Combiners //
///////////////
const metaof = (value) => value.meta;
const baseof = (value) => value.base;
advice.apply = (value, values, serial) => combine(
  ("dummy", value.base)(...values.map(baseof)),
  "apply", [value.meta, "["+values.map(metaof)+"]"], serial);
advice.invoke = (value1, value2, values, serial) => combine(
  value1.base[value2.base](...values.map(baseof)),
  "invoke", [value1.meta, value2.meta, "["+values.map(metaof)+"]"], serial);
advice.construct = (value, values, serial) => combine(
  new value.base(...values.map(baseof)),
  "construct", [value.meta, "["+values.map(metaof)+"]"], serial);
advice.unary = (operator, value, serial) => combine(
  eval(operator+" value.base"),
  "unary", ["'"+operator+"'", value.meta], serial);
advice.binary = (operator, value1, value2, serial) => combine(
  eval("value1.base "+operator+" value2.base"),
  "binary", ["'"+operator+"'", value1.meta, value2.meta], serial);
advice.get = (value1, value2, serial) => combine(
  value1.base[value2.base],
  "get", [value1.meta, value2.meta], serial);
advice.set = (value1, value2, value3, serial) => combine(
  value1.base[value2.base] = value3.base,
  "set", [value1.meta, value2.meta, value3.meta], serial);
advice.delete = (value1, value2, serial) => combine(
  delete value1.base[value2.base],
  "delete", [value1.meta, value2.meta], serial);
advice.array = (values, serial) => combine(
  values.map(baseof),
  "array", ["["+values.map(metaof)+"]"], serial);
advice.object = (keys, value, serial) => {
  const object = {};
  const strings = [];
  for (let index = 0, length = keys.length; index < length; index++) {
    object[keys[index]] = value[keys[index]].base;
    strings.push(JSON.stringify(keys[index])+":"+value[keys[index]].meta);
  }
  return combine(object, "object", ["{"+strings.join(",")+"}"], serial);
};

///////////
// Setup //
///////////
advice.SANDBOX = new Proxy({type:"global",inner:global}, handlers);
const instrument = AranLive(Aran({sandbox:true}), advice);
module.exports = (script, source) => instrument(script);
