# Aran <img src="aran.png" align="right" alt="aran-logo" title="Aran Linvail"/>

Aran is a npm module for dynamically instrumenting JavaScript code. Aran is based on a source-to-source code transformation largely compatible with ECMAScript5 specification (see http://www.ecma-international.org/ecma-262/5.1/) and enable amongst other things: profiling, tracing, sandboxing, and symbolic execution. To install: `npm install aran`. Aran has an executable to 

**Aran uses ECMAScript6 Harmony Proxies which are currently only well supported by Firefox. Sanboxing and `with` statements will make Aran crash on Node, Safari, Chrome and Internet Explorer!**

This module exposes a function that expects three arguments: (i) a value used to mock the global object for the code being instrumented, (ii) a set of functions for intercepting language-level operations, (iii) a set of options. The return value of Aran is a function that instrument and run given code string. In the snippet below, we setup a simple yet powerful analysis that can be deployed to browsers using building tools such as `browserify`.

```javascript
var Aran = require('aran');

var fcts = [];

/* Setting aran and traps */
var aran = Aran({
  ast: true,
  loc: true,
  traps: {
  function: function (x, n) {
      fcts.push(x);
      x.__birth__ = n;
      x.__calls__ = [];
      return x; },
    apply: function (f, o, xs, n) {
      if (f.__calls__) f.__calls__.push(n);
      return f.apply(o, xs);}
}
});
/* Target code */
var target = [
/* 1 */'function delta (a, b, c) { return  b * b - 4 * a * c}',
/* 2 */'function solve (a, b, c) {',
/* 3 */'  var sol1 = ((-b) + Math.sqrt(delta(a, b, c))) / (2 * a);',
/* 4 */'  var sol2 = ((-b) - Math.sqrt(delta(a, b, c))) / (2 * a);',
/* 5 */'  return [sol1, sol2];',
/* 6 */'}',
/* 7 */'solve(1, -5, 6);',
].join('\n');
/* Run and log results */
var compiled = aran.compile(target);

eval(compiled);

fcts.forEach(function (x) {
  var start = x.__birth__.loc.start;
  console.log('Function '+x.name+'@'+start.line+'-'+start.column);
  x.__calls__.forEach(function (call) {
    var start = call.loc.start;
    console.log('  Call@'+start.line+'-'+start.column);
  });
  });
```

```bash
Function delta@1-0
  Call@3-31
  Call@4-31
Function solve@2-0
  Call@7-0
```

We choosed to instrument JavaScript code at runtime to support dynamic code evaluation enabled by the infamous `eval` function and the `Function` constructor. If code was instrumented statically, dynamic code evaluation would be uninstrumented wich could easily break the analysis ; consider: `eval('delete aran.sandbox')`. Consequently, as shown in the above snippet, Aran has been designed to be on the same virtual machine as the code being instrumented.

## Demonstration

Download the files `demo/demo.html` and `demo/bundle.js` and put them into the same directory. Then simply open `demo.html` with a recent version of Firefox. In the master text field, you can specify aran's parameters using exports: `exports.sandbox`, `exports.traps` and `exports.options`. Note that there is a set of built-in analyses available through the drop-down list. The target text field expects the code to be instrumented.

<img src="demo.png" align="center" alt="demo" title="Demonstration"/>

## Sandbox

As stated above, the sandbox parameter will act in all point as if it was the global object of the code being instrumented. The difficulty of coming up with a suitable sandbox for complex analysis such as dynamic symbolic execution is not to be underestimated. If the traps `has`, `get`, `set` and `delete` are implemented, the sandbox can be a value of any type, otherwise it should be a JavaScript object. Two sandbox properties have a particular status:

  * `eval`: Letting the target code accessing the built-in `window.eval` function enables direct eval calls (see: http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.2.1.1) ; any other value will prevent the target to perform direct eval call. Roughly, `eval(x)` is compiled into a conditional expression where the consequent is a direct eval call and the alternative a normal function call:
    
    ```javascript
    (eval === aran.global.eval) ? eval(aran.compile(x)) : eval(x)
    ```
  
  * `undefined`: Because `undefined` is omnipresent in JavaScript, it does not really make sense to rule it out of the sandbox. Blacklisting `undefined` from the sandbox will merely prevent the target code to explicitely access `undefined` using an identifier. If you want to intercept any apparation of `undefined` (e.g.: undefined arguments, empty returns, etc), you should implement `traps.undefined` instead. Assuming that the sandbox verifies `sandbox['undefined'] = undefined`, the trap will be triggered on explicit `undefined` reference as if it was a literal.

## Traps

Traps can be used to implement shadow execution and, in general, dynamic techniques that require runtime values. Traps have been designed to provide a minimal interface for piloting JavaScript semantic. That is that many non-fundamental JavaScript features such as `x++` have been desugared to be expressed with simpler concepts. All traps are independently optional. Traps are listed in the below table:

 Trap | Target | Transformed
:-----|:-------|:-----------
`primitive(Value, Node)` | `'foo'` | `aran.traps.primitive('foo', :Literal:)`
`object(Properties, Node)` | `{a:x}` | `aran.traps.object([{key:'a', value:x}], :ObjectExpression:)`
`array(Array, Node)` | `[x,y,z]` | `aran.traps.array([x,y,z], :ArrayExpression:)`
`regexp(Pattern, Flags, Node)` | `/abc/gi` | `aran.traps.regexp("abc", "gi", :Literal:)`
`function(Function, Node)` | `function (...) {...}` | `aran.traps.function(function (...) { ... }, :FunctionExpression:)`
`arguments(Arguments, Node)` | `function (...) {...}` | `... function (...) { arguments = aran.traps.arguments(arguments, :FunctionExpression:); ... } ...`
`undefined(MaybeName, Node)` | `return;` | `return aran.traps.undefined(null, :ReturnStatement:);`
`test(value, Node)` | `x ? y : z` | `aran.traps.test(x, :ConditionalExpression:) ? y : z`
`eval(value, Node)` | `eval(x)` | `eval(aran.compile(aran.traps.eval(x, :CallExpression:)))`
`try(Node)` | `try { ...` | `try { aran.traps.try(:TryStatement:) ...`
`catch([E/e]xception, Node)` | `... catch (e) { ... }` | `... catch (e) { e = aran.traps.catch(e, :TryStatement:); ... }`
`unary(Operator, argument, Node)` | `!x` | `aran.traps.unary('!', x, :UnaryExpression:)`
`binary(Operator, left, right, Node)` | `x+y` | `aran.traps.binary('+', x, y, :BinaryExpression:)`
`apply(function, this, Arguments, Node)` | `f(x, y)` | `aran.traps.apply(f, aran.traps.global, [x,y], :CallExpression:)`
`construct(function, Arguments, Node)` | `new F(x, y)` | `aran.traps.construct(F, [x,y], :NewExpression:)`
`get(object, [K]key, MaybeNode)` | `o[k]` | `aran.traps.get(o, k, :MemberExpression:)`
`set(object, [K]key, value, MaybeNode)` | `o[k] = v` | `aran.traps.set(o, k, v, :AssignmentExpression:)`
`delete(object, [K]key, MaybeNode)` | `delete o[k]` | `aran.traps.delete(o, k, :UnaryExpression:)`
`enumerate(object, Node)` | `for (x in o) { ... }` | `... aran.traps.enumerate(o, :ForInStatement:) ...`

Clarifications:

  1. Node arguments are mozilla ast node (see https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API). The only difference is that each node has a `parent` property that points to the node's parent allowing to traverse the ast from leafs to root.
  2. In the transformed column, `:ReturnStatement:` means that the given ast node is of type `ReturnStatement`.
  3. Arguments that start with a capital letter are raw (unintercepted) values while arguments that start with a lower case letter have been previously intercepted.
  4. The value returned by traps can be of anytype. Exceptions being: `Booleanize` and `Has` should return a value of type `boolean`, `Stringify` should return a value of type `string`.

## Options

Option  | When set to true
:-------|:----------------
`ast`   | traps expect an ast mozilla node as last argument
`loc`   | ast node have line and column-based location info (see http://esprima.org/doc/index.html)
`range` | ast node have an index-based location range (array) (see http://esprima.org/doc/index.html)

## To-Do

* Support strict mode (currently being ignored).
* Fully support last valued expression e.g.: `eval('switch (1) { case 1: 2; }')`.

<!-- 
## Remarks on traps

* `primitive`: primitive creation arise on the following literals:
    * `null`
    * `false`
    * `true`
    * numbers
    * strings

* `undefined`: valid `Cause` parameters are:
    * `'empty-return'`: return statement without argument.
    * `'no-return'`: function ending without any return statement.
    * `'argument-ID'`: `ID` is the name of the argument being undefined.
    * `'variable-ID'`: `ID` is the name of the variable being undefined.
    * `'explicit'`: identifier named `'undefined'` accessing the `undefined` value.

* `object`: guaranteed to contain plain data field whose values have been recursively intercepted. In particular, inline accessors (see: http://www.ecma-international.org/ecma-262/5.1/#sec-11.1.5) have been deplaced within to `Object.defineProperties`.

* `array`: elements have been intercepted.

* `booleanize`: valid `Cause` parameters are:
    * `'if'`
    * `'if-else'`
    * `'while'`
    * `'do-while'`
    * `'for'`
    * `'?:'`

* `stringify`: only used to perform direct call to `eval` as defined in http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.2.1.1.

* `unary`: valid `Operator` parameters are:
    * `'-'`
    * `'+'`
    * `'!'`
    * `'~'`
    * `'typeof'`: given value is a raw `undefined` if the argument is an undefined identifier
    * `'void'`

* `binary`: valid `Operator` parameters are:
    * `'=='`
    * `'!='`
    * `'===`
    * `'!=='`
    * `'<'`
    * `'<='`
    * `'>'`
    * `'>='`
    * `'<<'`
    * `'>>'`
    * `'>>>'`
    * `'+'`
    * `'-'`
    * `'*'`
    * `'/'`
    * `'%'`
    * `'|'`
    * `'^'`
    * `'&'`
    * `'in'`
    * `'instanceof'`
    * `'..'`

* `get`, `set`, `delete`: the `property` parameter can either be:
    * A raw string if it came from a static property access (e.g. `o.a`).
    * A wrapped value if it came from a computed member expression (e.g. `o["a"]`).

* `exist`: only trap not inserted inside the target code ; triggered instead when scope lookup hits a `with` statement or the global object. The value returned by this trap should indicate whether the identifier exists in the environment-object. In the case of a `with` statement, a false value will make the lookup propagate to the enclosing scope. In the case of the global object, a false value will trigger a reference error.

### Precision concerning JavaScript semantic

You are free to return the value you want from trap calls, however be aware that doing so carelessly will most likely result into a modification of JavaScript semantic. For instance you are free to say that `1+1 = 11` (JCVD was right after all) but the target program will not behave the same after instrumentation. For those of you who want to stick close to JavaScript semantic here is a list of things to keep in mind when implementing traps:

* `object`: object literals verify below assertions:

    ```javascript
    var o = {a:1}
    assert(Object.getPrototypeOf(o) === Object.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(o, 'a')) === '{"value":1,"writable":true,"enumerable":true,"configurable":true}')
    ```

* `array`: array literals verify below assertions:

    ```javascript
    var xs = [1,2,3];
    assert(Object.getPrototypeOf(xs) === Array.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(xs, 1)) === '{"value":2,"writable":true,"enumerable":true,"configurable":true}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(xs, 'length')) === '{"value":3,"writable":true,"enumerable":false,"configurable":false}');
    ```

    N.B.: The `length` property of JavaScript arrays has a special behavior described in http://www.ecma-international.org/ecma-262/5.1/#sec-15.4.

* `arguments`: pure data objects whose keys are numbers ; arguments objects verify the below assertions:

   ```javascript
   function f (x1, x2) {
     assert(Object.getPrototypeOf(arguments) === Object.prototype);
     assert(arguments.callee === f);
     assert(JSON.stringify(Object.getOwnPropertyDescriptor(arguments, 'callee')) === '{"writable":true,"enumerable":false,"configurable":true}');
     assert(JSON.stringify(Object.getOwnPropertyDescriptor(arguments, 'length')) === '{"value":5,"writable":true,"enumerable":false,"configurable":true}');
     assert(JSON.stringify(Object.getOwnPropertyDescriptor(arguments, 1)) === '{"value":12,"writable":true,"enumerable":true,"configurable":true}');
   }
   f(11,12,13,14,15);
   ```

   N.B.: The `arguments` object points to the same locations as the ones pointed by the formal parameters ; changing the value of a formal parameter also change the value of the corresponding argument's number field. Consequently, if `traps.undefined` is implemented, undefined arguments will be updated.  The behaviors described above do not hold in strict mode (which is ignored by Aran anyway).

* `function`: function literals verify below assertions:

    ```javascript
    var f = function (x, y, z) { return x+y+z };
    assert(Object.getPrototypeOf(f) === Function.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(f, 'length')) === '{"value":3,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(f, 'prototype')) === '{"value":{},"writable":true,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(f.prototype, 'constructor')) === '{"writable":true,"enumerable":false,"configurable":true}');
    assert(f.prototype.constructor === f);
    ```

* `regexp`: regular expression literals verify below assertions:

    ```javascript
    var r = /abc/gi;
    assert(Object.getPrototypeOf(r) === RegExp.prototype);
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'global')) === '{"value":true,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'ignoreCase')) === '{"value":true,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'multiline')) === '{"value":false,"writable":false,"enumerable":false,"configurable":false}');
    assert(JSON.stringify(Object.getOwnPropertyDescriptor(r, 'lastIndex')) === '{"value":0,"writable":true,"enumerable":false,"configurable":false}');
    ```
 -->
