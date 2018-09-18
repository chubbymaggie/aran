
const ArrayLite = require("array-lite");

// stack : [..., iterator, array]
// function (iterator, array) { return array }

exports.rest = () => ARAN.build.closure(
  ArrayLite.concat(
    ARAN.build.Declare(
      "let",
      "iterator",
      ARAN.build.get(
        ARAN.build.read("arguments"),
        ARAN.build.primitive(0))),
    ARAN.build.Declare(
      "let",
      "array",
      ARAN.build.get(
        ARAN.build.read("arguments"),
        ARAN.build.primitive(1))),
    ARAN.build.Declare(
      "let",
      "step",
      ARAN.build.primitive(void 0)),
    ARAN.cut.While(
      ARAN.cut.unary(
        "!",
        Util.get(
          ARAN.build.write(
            "step",
            ARAN.cut.$copy(
              1,
              ARAN.cut.invoke(
                ARAN.cut.$copy(
                  2,
                  ARAN.build.read("iterator")),
                ARAN.cut.primitive("next"),
                []))),
          ARAN.cut.primitive("done"))),
      ARAN.build.Statement(
        Util.set(
          false,
          ARAN.cut.$copy(
            2,
            ARAN.build.read("array")),
          Util.get(
            ARAN.cut.$copy(
              1,
              ARAN.build.read("array")),
            ARAN.cut.primitive("length")),
          Util.get(
            ARAN.cut.$swap(
              1,
              2,
              ARAN.cut.$swap(
                2,
                3,
                ARAN.build.read("step"))),
            ARAN.cut.primitive("value"))))),
    ARAN.build.Statement(
      ARAN.cut.$drop(
        ARAN.build.read("step"))),
    ARAN.build.Return(
      ARAN.build.read("array"))));