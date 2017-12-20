
const Cut = require("./cut");
const VisitStatement = require("./visit-statement");
const Build = require("./build.js");
const Protect = require("./protect.js");

const keys = Object.keys;

module.exports = (program, pointcut) => {
  program.__min__ = ++ARAN.counter;
  ARAN.index = ARAN.counter;
  ARAN.cut = Cut(pointcut);
  ARAN.context = Context(program.body[0]);
  const statements = Flaten.apply(
    null,
    program.body.map(VisitStatement));
  return Build.PROGRAM(
    ARAN.context.strict,
    Flaten(
      Flaten.apply(
        keys(bindings).forEach(save)),
      Flaten.apply(
        null,
        ARAN.hidden.map((identifier) => Build.Declare(
          "var",
          identifier,
          Build.primitive(null)))),
      Flaten.apply(null, ARAN.context.hoisted);
      statements));
};

const bindings = {
  global: () => Build.conditional(
    Build.binary(
      Build.unary(
        "typeof",
        Build.read("window")),
      Build.primitive(void 0)),
    Build.read("global"),
    Build.read("window")),
  apply: () => Build.get(
    Build.read("Reflect"),
    "apply"),
  defineProperty: () => Build.get(
    Build.read("Object"),
    "defineProperty"),
  getPrototypeOf: () => Build.get(
    Build.read("Object"),
    "getPrototypeOf"),
  keys: () => Build.get(
    Build.read("Object"),
    "keys"),
  iterator: () => Build.get(
    Build.read("Symbol"),
    "iterator"),
  eval: () => Build.read("eval")};

const save = (key) => Build.If(
  Build.binary(
    "===",
    Build.unary(
      "typeof",
      Build.read(Protect(key))),
    Build.unary(
      "void",
      Build.primitive(0))),
  Build.Declaration(
    "var",
    Protect(key)
    bindings[key]()),
  []);
