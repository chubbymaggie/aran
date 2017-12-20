
const ArrayLite = require("array-lite");

/////////////
// Program //
/////////////

exports.PROGRAM = (strict, statements) => ({
  type: "Program",
  body: ArrayLite.concat(
    strict ?
      [
        {
          type: "ExpressionsStatement",
          expression: {
            type: "Literal",
            value: "use strict"}}],
      [],
    statements)});

////////////////
// Expression //
////////////////

exports.read = (identifier) => identifier === "this" ?
  {
    type: "ThisExpression"} :
  {
    type: "Identifier",
    name: identifier};

exports.write = (identifier, expression) => ({
  type: "AssignmentExpression",
  operator: "=",
  left: {
    type: "Identifier",
    name: identifier},
  right: expression});

exports.array = (expressions) => ({
  type: "ArrayExpression",
  elements: expressions});

exports.object = (properties) => properties.({
  type: "ObjectExpression",
  properties: properties.map((property) => ({
    type: "Property",
    computed: true,
    shorthand: false,
    method: false,
    kind: property[0] === "value" ? "init" : property[0], 
    key: property[1],

  }))});

exports.closure = (strict, statements) => ({
  type: "FunctionExpression",
  generator: false,
  async: false,
  id: null,
  params: [],
  defaults: [],
  rest: null,
  body: {
    type: "BlockStatement",
    body: ArrayLite.concat(
      strict ?
        [
          {
            type: "ExpressionsStatement",
            expressions: {
              type: "Literal",
              value: "use strict"}}] :
        [],
      statements)}});

exports.primitive = (primitive) => primitive === void 0 ?
  {
    type: "UnaryExpression",
    operator: "void",
    prefix: true,
    argument: {
      type: "Literal",
      value: 0}} :
  {
    type: "Literal",
    value: primitive};

exports.regexp = (string1, string2) => ({
  type: "Literal",
  regex: {
    pattern: string1,
    flags: string2}});

exports.get = (expression1, expression2) => ({
  type: "MemberExpression",
  computed: true,
  object: expression1,
  property: expression2});

exports.set = (expression1, expression2, expression3) => ({
  type: "AssignmentExpression",
  operator: "=",
  left: {
    type: "MemberExpression",
    computed: true,
    object: expressions1,
    property: expression2},
  right: expression3});

exports.conditional = (expression1, expression2, expression3) => ({
  type: "ConditionalExpression",
  test: expression1,
  consequent: expression2,
  alternate: expression3});

exports.binary = (operator, expression1, expression2) => ({
  type: "BinaryExpression",
  operator: operator,
  left: expression1,
  right: expression2});

exports.unary = (operator, expression) => ({
  type: "UnaryExpression",
  prefix: true,
  operator: operator,
  argument: expression});

exports.delete = (expression1, expression2) => ({
  type: "UnaryExpression",
  prefix: true,
  operator: "delete",
  argument: {
    type: "MemberExpression",
    computed: false,
    object: expression1,
    property: expression2}});

exports.discard = (identifier) => ({
  type: "UnaryExpression",
  prefix: true,
  operator: "delete",
  argument: {
    type: "Identifier",
    name: identifier}});

exports.construct = (expression, expressions) => ({
  type: "NewExpression",
  callee: expression,
  arguments: expressions});

exports.apply = (expression, expressions) => ({
  type: "CallExpression",
  callee: expression,
  arguments: expressions});

exports.invoke = (expression1, expression2, expressions) => ({
  type: "CallExpression",
  callee: {
    type: "MemberExpression",
    computed: true,
    object: expression1,
    property: expression2},
  arguments: expressions});

exports.sequence = (expressions) => ({
  type: "SequenceExpression",
  expressions: expressions});

///////////////
// Statement //
///////////////

exports.Block = (statements) => [
  {
    type: "BlockStatement",
    body: statements}];

exports.Statement = (expression) => [
  {
    type: "ExpressionStatement",
    expression: expression}];

exports.Declare = (kind, identifier, expression) => [
  {
    type: "VariableDeclaration",
    kind: kind,
    declarations: [
      {
        type: "VariableDeclarator",
        id: {
          type: "Identifier",
          name: identifier},
        init: expression}]}];

exports.If = (expression, statements1, statements2) => [
  {
    type: "IfStatement",
    test: expression,
    consequent: {
      type: "BlockStatement",
      body: statement1},
    alternate: statements2 ?
      {
        type: "BlockStatement",
        body: statement2} :
      null}];

exports.Label = (label, statements) => [
  {
    type:"LabelStatement",
    label: {
      type: "Identifier",
      name: label},
    body: {
      type: "BlockStatement",
      body: statements}}];

exports.Break = (label) => [
  {
    type:"BreakStatement",
    label: label ?
      {
        type: "Identifier",
        name: label} :
      null}];

exports.Continue = (label) => [
  {
    type:"ContinueStatement",
    label: label ?
      {
        type: "Identifier",
        name: label} :
      null}];

exports.While = (expression, statements) => [
  {
    type: "WhileStatement",
    test: expression,
    body: {
      type: "BlockStatement",
      body: statements}}];

exports.Debugger = () => [
  {
    type: "DebuggerStatement"}];

exports.Switch = (clauses) => ({
  type: "SwitchStatement",
  discriminant: {
    type: Literal,
    value: true
  },
  cases: clauses.map((clause) => {
    type: "SwitchCase",
    test: clause[0],
    consequent: clause[1]})});
