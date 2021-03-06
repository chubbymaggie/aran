
const block = (kind) => (statement) => (
  statement.type === "VariableDeclaration" && statement.kind === kind ?
  ArrayLite.flatenMap(node.declarations, declarator) :
  []);

// The visitors of this file returns a list of statement.
// This is safe provided that control structures (if|while|do-while|for|for-in|label) have a statement block as body.
// Therefore, if it is not already the case, we put a block around the body of these structures.
// However, since ECMAScript6, statement blocks are no longer transparent due to block scoping.
// Yet, this transformation is safe because the body of the above structure cannot be a declaration (see http://www.ecma-international.org/ecma-262/6.0/#sec-statements).

const ArrayLite = require("array-lite");
const Visit = require("./index.js");

exports.EmptyStatement = (node) => [];

exports.BlockStatement = (node) => ARAN.cut.Block(
  ArrayLite.flatenMap(
    node.body,
    Visit.Statement));

exports.ExpressionStatement = (node) => ARAN.cut.Statement(
  (
    node.AranCompletion ?
    ARAN.cut.write(
      0,
      Visit.expression(node.expression)) :
    Visit.expression(node.expression)));

exports.IfStatement = (node) => ArrayLite.concat(
  (
    node.AranCompletion ?
    ARAN.cut.Statement(
      ARAN.cut.write(
        0,
        ARAN.cut.primitive(void 0))) :
    []),
  ARAN.cut.If(
    Visit.expression(node.test),
    Visit.Statement(node.consequent),
    (
      node.alternate ?
      Visit.statement(node.alternate) :
      [])));

exports.LabeledStatement = (node) => ARAN.cut.Label(
  "b" + node.label.name,
  Util.Body(node.body));

exports.BreakStatement = (node) => ARAN.cut.Break(
  (
    node.label ?
    "b" + node.label.name :
    ARAN.break));

exports.ContinueStatement = (node) => ARAN.cut.Break(
  (
    node.label ?
    "c" + node.label.name :
    ARAN.continue));

exports.WithStatement = (node) => Util.Completion(
  ARAN.cut.With(
    Visit.expression(node.object),
    Util.Body(node.body)));

exports.SwitchStatement = (node, temporary, statement) => Util.Completion(
  (
    temporary = ARAN.label,
    ARAN.break = "B" + node.AranSerial,
    statement = ARAN.cut.Label(
      ARAN.break,
      ArrayLite.concat(
        ARAN.build.Declare(
          "let",
          Unique("switch"),
          Visit.expression(node.discriminant)),
        ARAN.cut.Switch(
          ArrayLite.map(
            node.cases,
            (clause) => [
              (
                clause.test ?
                Util.binary(
                  ARAN.cut.primitive("==="),
                  ARAN.cut.$copy(
                    2,
                    ARAN.build.read(
                      Unique("switch"))),
                  Visit.expression(clause.test)) :
                ARAN.cut.primitive(true)),
              ArrayLite.flatenMap(clause.consequent, Visit.Statement)])))),
      ARAN.break = temporary,
      ARAN.build.Try(
        statement,
        ARAN.build.Throw(
          ARAN.build.read("error")),
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Interim.read("switch"))))));

exports.ReturnStatement = (node) => ARAN.cut.Return(
  (
    node.argument ?
    Visit.expression(node.argument) :
    ARAN.cut.primitive(void 0)));

exports.ThrowStatement = (node) => ARAN.cut.Throw(
  Visit.expression(node.argument));

exports.TryStatement = (node) => Util.Completion(
  ARAN.cut.Try(
    ArrayLite.flatenMap(
      node.block.body,
      Visit.Statement),
    (
      node.handler ?
      ArrayLite.concat(
        Util.Declare(
          "let",
          node.handler.param,
          ARAN.build.read("error")),
        ArrayLite.flatenMap(node.handler.body.body, Visit.Statement)) :
      ARAN.cut.Throw(
        ARAN.build.read("error"))),
    (
      node.finalizer ?
      ArrayLite.flatenMap(node.finalizer.body, Visit.Statement) :
      [])));

// TODO
exports.WhileStatement = (node) => Util.Completion(
  Util.Loop(
    [],
    Visit.expression(node.test),
    [],
    node.body,
    []));

// TODO
exports.DoWhileStatement = (node) => Util.Completion(
  Util.Loop(
    ARAN.build.Statement(
      Interim.hoist(
        "dowhile",
        ARAN.build.primitive(false))),
    ARAN.build.conditional(
      Interim.read("dowhile"),
      Visit.expression(node.test),
      Interim.write(
        "dowhile",
        ARAN.cut.primitive(true))),
    [],
    node.body,
    []));

// for (let x; y; z) { ... }
//
// { 
//   let x;
//   while (y) { ... z; }
// }

// TODO
exports.ForStatement = (node) => Util.Completion(
  Util.Loop(
    (
      node.init ?
      (
        node.init.type === "VariableDeclaration" ?
        Util.Declaration(node.init) :
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Visit.expression(node.init)))) :
      []),
    (
      node.test ?
      Visit.expression(node.test) :
      ARAN.cut.primitive(true)),
    [],
    node.body,
    (
      node.update ?
      ARAN.build.Statement(
        ARAN.cut.$drop(
          Visit.expression(node.update))) :
      [])));

// for (k in o) { ... }
//
// let _ks1 = [];
// let _o = o;
// while (o) {
//   let _ks2 = keys(o);
//   let _i2 = 0;
//   while (_i2 < _ks2.length) {
//     _ks1[_ks1.length] = _ks2[_i2];
//     _i2 = i2 +1;
//   }
//   o = getPrototypeOf(o);
// }
// let _i1 = 0;
// while (_i1 < _ks1.length) {
//   k1 = _ks1[_i1];
//   ...
//   i1 = i1 + 1;
// }

// TODO
exports.ForInStatement = (node) => Util.Completion(
  ArrayLite.concat(
    ARAN.build.Statement(
      Interim.hoist(
        "keys1",
        ARAN.cut.array([]))),
    ARAN.build.Statement(
      Interim.hoist(
        "object",
        Visit.expression(node.right))),
    ARAN.cut.While(
      ARAN.cut.$copy(
        1,
        Interim.read("object")),
      ArrayLite.concat(
        ARAN.build.Statement(
          Interim.hoist(
            "keys2",
            ARAN.cut.apply(
              ARAN.cut.$builtin("Object.keys"),
              [
                ARAN.cut.$copy(
                  2,
                  Interim.read("object"))]))),
        ARAN.build.Statement(
          Interim.hoist(
            "index2",
            ARAN.cut.primitive(0))),
        ARAN.cut.While(
          ARAN.cut.binary(
            "<",
            ARAN.cut.$copy(
              1,
              Interim.read("index2")),
            Util.get(
              ARAN.cut.$copy(
                3,
                Interim.read("keys2")),
              ARAN.cut.primitive("length"))),
          ArrayLite.concat(
            ARAN.build.Statement(
              Util.set(
                false,
                ARAN.cut.$copy(
                  4,
                  Interim.read("keys1")),
                Util.get(
                  ARAN.cut.$copy(
                    1,
                    Interim.read("keys1")),
                  ARAN.cut.primitive("length")),
                Util.get(
                  ARAN.cut.$copy(
                    4,
                    Interim.read("keys2")),
                  ARAN.cut.$copy(
                    4,
                    Interim.read("index2"))))),
            ARAN.build.Statement(
              Interim.write(
                "index2",
                ARAN.cut.binary(
                  "+",
                  Interim.read("index2"),
                  ARAN.cut.primitive(1)))))),
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Interim.read("index2"))),
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Interim.read("keys2"))),
        ARAN.build.Statement(
          Interim.write(
            "object",
            ARAN.cut.apply(
              ARAN.cut.$swap(
                1,
                2,
                ARAN.cut.$builtin("Object.getPrototypeOf")),
              [
                Interim.read("object")]))))),
    ARAN.build.Statement(
      ARAN.cut.$drop(
        Interim.read("object"))),
    ARAN.build.Statement(
      Interim.hoist(
        "index1",
        ARAN.cut.primitive(0))),
    ARAN.build.Try(
      Util.Loop(
        (
          node.left.type === "VariableDeclaration" ?
          Util.Declaration(node.left) :
          []),
        ARAN.cut.binary(
          "<",
          ARAN.cut.$copy(
            1,
            Interim.read("index1")),
          Util.get(
            ARAN.cut.$copy(
              3,
              Interim.read("keys1")),
            ARAN.cut.primitive("length"))),
        ARAN.build.Statement(
          (
            node.left.type === "MemberExpression" ?
            Util.set(
              ARAN.node.AranStrict,
              Visit.expression(node.left.object),
              Util.property(node.left),
              Util.get(
                ARAN.cut.$copy(
                  4,
                  Interim.read("keys1")),
                ARAN.cut.$copy(
                  4,
                  Interim.read("index1")))) :
            Util.assign(
              (
                node.left.type === "VariableDeclaration" ?
                node.left.declarations[0].id :
                node.left),
              Util.get(
                ARAN.cut.$copy(
                  2,
                  Interim.read("keys1")),
                ARAN.cut.$copy(
                  2,
                  Interim.read("index1")))))),
        node.body,
        ARAN.build.Statement(
          Interim.write(
            "index1",
            ARAN.cut.binary(
              "+",
              Interim.read("index1"),
              ARAN.cut.primitive(1))))),
      ARAN.build.Throw(
        ARAN.build.read("error")),
      ArrayLite.concat(
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Interim.read("index1"))),
        ARAN.build.Statement(
          ARAN.cut.$drop(
            Interim.read("keys1")))))));

// TODO
exports.ForOfStatement = (node) => Util.Completion(
  ARAN.build.Try(
    Util.Loop(
      ArrayLite.concat(
        (
          node.left.type === "VariableDeclaration" ?
          Util.Declaration(node.left) :
          []),
        ARAN.build.Statement(
          Interim.hoist(
            "iterator",
            ARAN.cut.invoke(
              Visit.expression(node.right),
              ARAN.cut.$builtin("Symbol.iterator"),
              [])))),
      ARAN.cut.unary(
        "!",
        Util.get(
          ARAN.cut.$copy(
            1,
            Interim.hoist(
              "step",
              ARAN.cut.invoke(
                ARAN.cut.$copy(
                  1,
                  Interim.read("iterator")),
                ARAN.cut.primitive("next"),
                []))),
          ARAN.cut.primitive("done"))),
      ARAN.build.Statement(
        (
          node.left.type === "MemberExpression" ?
          Util.set(
            ARAN.node.AranStrict,
            Visit.expression(node.left.object),
            Util.property(node.left),
            Util.get(
              ARAN.cut.$copy(
                3,
                Interim.read("step")),
              ARAN.cut.primitive("value"))) :
          Util.assign(
            (
              node.left.type === "VariableDeclaration" ?
              node.left.declarations[0].id :
              node.left),
            Util.get(
              ARAN.cut.$copy(
                1,
                Interim.read("step")),
              ARAN.cut.primitive("value"))))),
      node.body,
      ARAN.build.Statement(
        ARAN.cut.$drop(
          Interim.read("step")))),
    ARAN.build.Throw(
      ARAN.build.read("error")),
    ArrayLite.concat(
      ARAN.build.Statement(
        ARAN.cut.$drop(
          Interim.read("step"))),
      ARAN.build.Statement(
        ARAN.cut.$drop(
          Interim.read("iterator"))))));

exports.DebuggerStatement = (node) => ARAN.cut.Debugger();

exports.FunctionDeclaration = (node) => ARAN.Hoist(
  ARAN.cut.Declare(
    "var", // changed from (dunno why): node.AranStrict ? "let" : "var"
    node.id.name,
    Helpers.closure(node)),
  []);

exports.VariableDeclaration = (node) => Util.Declaration(node);
