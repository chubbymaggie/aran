# Aran <img src="aran.png" align="right" alt="aran-logo" title="Aran Linvail"/>

Aran is a npm module for instrumenting JavaScript code which enables amongst other things: profiling, tracing, sandboxing, and symbolic execution. Aran performs a source-to-source code transformation fully compatible with ECMAScript5 specification (see http://www.ecma-international.org/ecma-262/5.1/) and we are working toward supporting ECMAScript6 (see http://www.ecma-international.org/ecma-262/6.0/). To install, run `npm install aran`.

## Demonstration

In Aran, an analysis consists in a set of syntactic traps that will be triggered while the program under scrutiny is being executed.
For instance, the expression `x + y` may be transformed into `aran.binary('+', x, y)` which triggers the `binary` trap.
Below we demonstrate how to analyze a monolithic - as opposed to modularized - JavaScript program using Aran.

1. The file `target.js` is a monolithic JavaScript program that is the target for our analysis:

  ```javascript
  // target.js //
  function delta (a, b, c) { return  b * b - 4 * a * c}
  function solve (a, b, c) {
    var s1 = ((-b) + Math.sqrt(delta(a, b, c))) / (2 * a);
    var s2 = ((-b) - Math.sqrt(delta(a, b, c))) / (2 * a);
    return [s1, s2];
  }
  solve(1, -5, 6);
  ```

2. The file `analysis.js` provides an implementation of the traps `Ast` and `apply`.
   These traps are written into the global value arbitrarily named `__hidden__`.
   The method `__search__`, defined later, is used to fetch the location of the code responsible of triggering `apply` traps.

  ```javascript
  // analysis.js //
  var __hidden__ = {};
  (function () {
    var tree;
    __hidden__.Ast = function (x, i) { tree = x };
    __hidden__.apply = function (f, t, xs, i) {
      var l = __hidden__.__search__(tree, i).loc.start.line;
      console.log("apply "+f.name+" at line "+l);
      return f.apply(t, xs);
    };
  } ());
  ```

3. The file `main.js` creates `__target__.js` as the concatenation of the analysis and the target instrumented by the top-level function of Aran:

  ```javascript
  // main.js //
  var fs = require('fs');
  var Aran = require('aran');
  var analysis = fs.readFileSync(__dirname+'/analysis.js', {encoding:'utf8'});
  var target = fs.readFileSync(__dirname+'/target.js', {encoding:'utf8'});
  var instrumented = Aran({global: '__hidden__', loc:true, traps:['Ast', 'apply']}, target);
  fs.writeFileSync(__dirname+'/__target__.js', analysis+'\n'+instrumented);
  ```

In ECMAScript5-compatible environments, evaluating the content of `__target__.js` will produce the following log: 

```
apply solve at line 8
apply delta at line 4
apply sqrt at line 4
apply delta at line 5
apply sqrt at line 5
```

Monolithic JavaScript programs can also be analyzed through Aran's [demo page](http://rawgit.com/lachrist/aran/master/glitterdust/demo.html).
In the demo page, the global value holding the traps has to be named `aran` and trap names are deduced from looking this global value.
Note that this is possible only because the instrumentation phase and execution/analysis phase happen on the same process.

<img src="demo.png" align="center" alt="demo-screenshot" title="Aran's demonstration page"/>

## API

This section details Aran's instrumentation API.
The top-level function exported by this node module expects the set of options below and some JavaScript code to instrument:

 Option   | Default  | Value
----------|----------|-----------------
`global`  | `'aran'` | String, the name of the global variable to store Aran's data
`traps`   | `[]`     | Array, contains the names of the traps to be called during the execution phase
`offset`  | `0`      | Integer, the value to start indexing [AST nodes](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API)
`loc`     | `false`  | Boolean, if true: ast node have line and column-based location info [see](http://esprima.org/doc/index.html)
`range`   | `false`  | Boolean, if true: ast node have an index-based location range [see](http://esprima.org/doc/index.html)
`nosetup` | `false`  | Boolean, set `true` only if sure the analysis is already setup (small performance gain)

The below table introduces by example the set of traps Aran can insert.
Traps starting with a upper-case letter are simple observers and their return values are never used while the value returned by lower-case traps may be used inside expressions.
All traps are independently optional and they all receive as last argument an integer which is the index of the AST node that triggered the trap.
The very first trap to be triggered is always `Ast` which receives the indexed AST tree of the target code before its instrumentation.
As shown in the demonstration, the helper function `__search__(tree, index)` can be used to obtain an AST node from an index.
In the table below, `123` is used as a dummy index.

 Traps                              | Target              | Instrumented
------------------------------------|---------------------|-------------------------------------------------------
**General**                         |                     |
`Ast(tree, index)`                  |                     |
`Strict(index)`                     | `'use strict';`     | `'use strict';`<br>`aran.Strict(123);`
`literal(value, index)`             | `'foo'`             | `aran.literal('foo', 123)`
`unary(op, value, index)`           | `!x`                | `aran.unary('!', x, 123)`
`binary(op, left, right, index)`    | `x + y`             | `aran.binary('+', x, y, 123)`
**Environment**                     |                     |
`Declare(kind, variables, index)`   | `var x = 1, y;`     | `aran.Declare('var', [x,y], 123);`<br>`var x = 1, y;`
`read(variable, value, index)`      | `x`                 | `aran.read('x', x, 123)` |
`write(variable, old, new, index)`  | `x = y`             | `aran.write('x', x, y, 123)`
`Enter(index)`<br>`Leave(index)`    | `{ ... }`           | `{`<br>&nbsp;&nbsp;`aran.Enter(123);`<br>&nbsp;&nbsp;`...`<br>&nbsp;&nbsp;`aran.Leave(123);`<br>`}`
**Apply**                           |                     |
`apply(fct, this, args, index)`     | `f(x,y)`            | `aran.apply(f, aran.g, [x,y], 123)`
`construct(fct, args, index)`       | `new F(x,y)`        | `aran.construct(F, [x,y], 123)`
`Arguments(value, index)`           | `function ...`      | `... aran.Arguments(arguments, 123)... `
`return(value, index)`              | `return x;`         | `return aran.return(x, 123);`
`eval(args, index)`                 | `eval(x, y)`        | `... eval(aran.eval([x,y], 123))... `
**Object**                          |                     |
`get(object, key, index)`           | `o.k`               | `aran.get(o, 'k', 123)` 
`set(object, key, value, index)`    | `o.k = x`           | `aran.set(o, 'k', x, 123)`
`delete(object, key, index)`        | `delete o.k`        | `aran.delete(o, 'k', 123)`
`enumerate(object, index)`          | `for (k in o) ...`  | `... aran.enumerate(o, 123) ...`
**Control**                         |                     |
`test(value, index)`                | `if (x) ...`        | `if (aran.test(x, 123)) ...`
`Label(label, index)`               | `l: { ... };`       | `aran.Label('l', 123);`<br>`l: { ... };`
`Break(label, index)`               | `break l;`          | `aran.Break('l', 123);`<br>`break l;`
`throw(error, index)`               | `throw x;`          | `throw aran.throw(x, 123);`
`Try(index)`<br>`catch(error, index)`<br>`Finally(index)` | `try {`<br>&nbsp;&nbsp;`...`<br>`} catch (e) {`<br>&nbsp;&nbsp;`...`<br>`} finally {`<br>&nbsp;&nbsp;`...`<br>`}` | `try { `<br>&nbsp;&nbsp;`aran.Try(123);`<br>&nbsp;&nbsp;`...`<br>`} catch (e) {`<br>&nbsp;&nbsp;`e = aran.catch(e, 123);`<br>&nbsp;&nbsp;`...`<br>`} finally {`<br>&nbsp;&nbsp;`aran.Finally(123);`<br>&nbsp;&nbsp;`..`<br>`}`

The below table depicts which traps are susceptible to be inserted for every [AST node type](https://developer.mozilla.org/en-US/docs/Mozilla/Projects/SpiderMonkey/Parser_API).
To further investigate how traps are inserted, please try it out in Aran's [demo page](http://rawgit.com/lachrist/aran/master/glitterdust/demo.html).

                         |`Ast`|`Strict`|`literal`|`unary`|`binary`|`Declare`|`read`|`write`|`Enter`|`Leave`|`apply`|`construct`|`Arguments`|`return`|`eval`|`get`|`set`|`delete`|`enumerate`|`test`|`Label`|`Break`|`throw`|`Try`|`catch`|`Finally`
-------------------------|:---:|:------:|:-------:|:-----:|:------:|:-------:|:----:|:-----:|:-----:|:-----:|:-----:|:---------:|:---------:|:------:|:----:|:---:|:---:|:------:|:---------:|:----:|:-----:|:-----:|:-----:|:---:|:-----:|:-------:
`Program`                | X   | X      |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`EmptyStatement`         |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`BlockStatement`         |     |        |         |       |        |         |      |       | X     | X     |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`ExpressionStatement`    |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`IfStatement`            |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           | X    |       |       |       |     |       |         
`LabeledStatement`       |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      | X     |       |       |     |       |         
`BreakStatement`         |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       | X     |       |     |       |         
`ContinueStatement`      |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`WithStatement`          |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`SwitchStatement`        |     |        |         |       | X      |         |      |       | X     | X     |       |           |           |        |      |     |     |        |           | X    |       |       |       |     |       |         
`ReturnStatement`        |     |        |         |       |        |         |      |       |       |       |       |           |           | X      |      |     |     |        |           |      |       |       |       |     |       |         
`ThrowStatement`         |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       | X     |     |       |         
`TryStatement`           |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       | X   | X     | X       
`WhileStatement`         |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           | X    |       |       |       |     |       |         
`DoWhileStatement`       |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           | X    |       |       |       |     |       |         
`ForStatement`           |     |        |         |       |        | X       |      |       | X     | X     |       |           |           |        |      |     |     |        |           | X    |       |       |       |     |       |         
`ForInStatement`         |     |        |         |       |        | X       |      | X     | X     | X     |       |           |           |        |      |     | X   |        | X         |      |       |       |       |     |       |         
`DebuggerStatement`      |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`FunctionDeclaration`    |     | X      |         |       |        | X       |      | X     |       |       |       |           | X         |        |      |     |     |        |           |      |       |       |       |     |       |         
`VariableDeclaration`    |     |        |         |       |        | X       |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`ThisExpression`         |     |        |         |       |        |         | X    |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`ArrayExpression`        |     |        | X       |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`ObjectExpression`       |     |        | X       |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`FunctionExpression`     |     | X      |         |       |        |         |      |       |       |       |       |           | X         |        |      |     |     |        |           |      |       |       |       |     |       |         
`SequenceExpression`     |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`UnaryExpression`        |     |        |         | X     |        |         |      |       |       |       |       |           |           |        |      |     |     | X      |           |      |       |       |       |     |       |         
`BinaryExpression`       |     |        |         |       | X      |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`AssignmentExpression`   |     |        |         |       | X      |         | X    | X     |       |       |       |           |           |        |      | X   | X   |        |           |      |       |       |       |     |       |         
`UpdateExpression`       |     |        | X       |       | X      |         | X    | X     |       |       |       |           |           |        |      | X   | X   |        |           |      |       |       |       |     |       |         
`LogicalExpression`      |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           | X    |       |       |       |     |       |         
`ConditionalExpression`  |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           | X    |       |       |       |     |       |         
`NewExpression`          |     |        |         |       |        |         |      |       |       |       |       | X         |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`CallExpression`         |     |        |         |       |        |         | X    |       |       |       | X     |           |           |        | X    | X   |     |        |           |      |       |       |       |     |       |         
`MemberExpression`       |     |        |         |       |        |         |      |       |       |       |       |           |           |        |      | X   |     |        |           |      |       |       |       |     |       |         
`Identifier`             |     |        |         |       |        |         | X    |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         
`Literal`                |     |        | X       |       |        |         |      |       |       |       |       |           |           |        |      |     |     |        |           |      |       |       |       |     |       |         

We finish this section by discussing the global value holding traps during the execution/analysis phase.
It is the responsibility of the user to make sure that the target code does not interact with it by choosing an appropriate global name or by adding proper guards to traps such as `read`, `write` and `enumerate`.
Such interaction should be avoided because it would alter the original behavior of the target code and the conclusion drawn during the analysis might be falsified.

## JavaScript Modules

TO-DO

## Supported ECMAScript6 Features

* Block scoping [let && const](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Statements/let)
