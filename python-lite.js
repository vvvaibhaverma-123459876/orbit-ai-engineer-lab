/*
 * python-lite.js
 *
 * A deliberately small Python interpreter, just large enough to run the kind of
 * function a learner writes in Module 0 and check it against real test cases.
 *
 * It exists because pattern-matching a submission against a regular expression
 * cannot tell a correct answer from a near miss: it accepted "return number * 20"
 * and a bare "# return number * 2" comment, while rejecting "return 2 * number".
 *
 * Supported: def, return, assignment (including += style), if/elif/else, for/in,
 * while, pass, arithmetic, comparisons, and/or/not, lists, dicts, subscripting,
 * and a small set of builtins. Anything else raises Unsupported so the learner is
 * told the checker cannot run their construct rather than that they are wrong.
 */
var PythonLite = (function () {
  "use strict";

  var STEP_LIMIT = 20000;

  function PyError(message) {
    this.name = "PyError";
    this.message = message;
  }
  PyError.prototype = Object.create(Error.prototype);

  function Unsupported(message) {
    this.name = "Unsupported";
    this.message = message;
  }
  Unsupported.prototype = Object.create(Error.prototype);

  var RETURN = { signal: "return" };

  /* ---------- source preparation ---------- */

  // Remove a trailing comment without touching a # inside a string literal.
  function stripComment(line) {
    var out = "";
    var quote = null;
    for (var i = 0; i < line.length; i += 1) {
      var ch = line[i];
      if (quote) {
        out += ch;
        if (ch === "\\") {
          out += line[i + 1] || "";
          i += 1;
        } else if (ch === quote) {
          quote = null;
        }
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        out += ch;
        continue;
      }
      if (ch === "#") break;
      out += ch;
    }
    return out;
  }

  function readLines(source) {
    return String(source)
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map(function (raw) {
        var line = stripComment(raw.replace(/\t/g, "    "));
        return { indent: line.search(/\S/), text: line.trim() };
      })
      .filter(function (line) {
        return line.text !== "";
      });
  }

  /* ---------- expression tokenizer ---------- */

  var OPERATORS = ["**", "//", "==", "!=", "<=", ">=", "+", "-", "*", "/", "%", "<", ">", "(", ")", "[", "]", "{", "}", ",", ":", "."];

  function tokenize(text) {
    var tokens = [];
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (/\s/.test(ch)) {
        i += 1;
        continue;
      }
      if (ch === '"' || ch === "'") {
        var quote = ch;
        var value = "";
        var j = i + 1;
        while (j < text.length && text[j] !== quote) {
          if (text[j] === "\\") {
            value += text[j + 1] || "";
            j += 2;
            continue;
          }
          value += text[j];
          j += 1;
        }
        if (j >= text.length) throw new PyError("a string is missing its closing quote");
        tokens.push({ type: "string", value: value });
        i = j + 1;
        continue;
      }
      if (/[0-9]/.test(ch) || (ch === "." && /[0-9]/.test(text[i + 1] || ""))) {
        var start = i;
        while (i < text.length && /[0-9._]/.test(text[i])) i += 1;
        tokens.push({ type: "number", value: parseFloat(text.slice(start, i).replace(/_/g, "")) });
        continue;
      }
      if (/[A-Za-z_]/.test(ch)) {
        var nameStart = i;
        while (i < text.length && /[A-Za-z0-9_]/.test(text[i])) i += 1;
        tokens.push({ type: "name", value: text.slice(nameStart, i) });
        continue;
      }
      var op = null;
      for (var k = 0; k < OPERATORS.length; k += 1) {
        if (text.lastIndexOf(OPERATORS[k], i) === i) {
          op = OPERATORS[k];
          break;
        }
      }
      if (!op) throw new PyError('unexpected character "' + ch + '"');
      tokens.push({ type: "op", value: op });
      i += op.length;
    }
    tokens.push({ type: "end", value: "" });
    return tokens;
  }

  /* ---------- expression parser ---------- */

  function Parser(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  Parser.prototype.peek = function () {
    return this.tokens[this.pos];
  };

  Parser.prototype.next = function () {
    this.pos += 1;
    return this.tokens[this.pos - 1];
  };

  Parser.prototype.at = function (type, value) {
    var token = this.peek();
    return token.type === type && (value === undefined || token.value === value);
  };

  Parser.prototype.eat = function (type, value) {
    if (!this.at(type, value)) return false;
    this.pos += 1;
    return true;
  };

  Parser.prototype.expect = function (type, value) {
    if (!this.eat(type, value)) {
      throw new PyError('expected "' + value + '" but found "' + this.peek().value + '"');
    }
  };

  Parser.prototype.parseExpression = function () {
    return this.parseOr();
  };

  Parser.prototype.parseOr = function () {
    var node = this.parseAnd();
    while (this.at("name", "or")) {
      this.next();
      node = { kind: "logical", op: "or", left: node, right: this.parseAnd() };
    }
    return node;
  };

  Parser.prototype.parseAnd = function () {
    var node = this.parseNot();
    while (this.at("name", "and")) {
      this.next();
      node = { kind: "logical", op: "and", left: node, right: this.parseNot() };
    }
    return node;
  };

  Parser.prototype.parseNot = function () {
    if (this.at("name", "not")) {
      this.next();
      return { kind: "not", value: this.parseNot() };
    }
    return this.parseComparison();
  };

  Parser.prototype.parseComparison = function () {
    var node = this.parseAdditive();
    for (;;) {
      var token = this.peek();
      if (token.type === "op" && ["==", "!=", "<", "<=", ">", ">="].indexOf(token.value) !== -1) {
        this.next();
        node = { kind: "compare", op: token.value, left: node, right: this.parseAdditive() };
        continue;
      }
      if (token.type === "name" && token.value === "in") {
        this.next();
        node = { kind: "compare", op: "in", left: node, right: this.parseAdditive() };
        continue;
      }
      if (token.type === "name" && token.value === "not" && this.tokens[this.pos + 1] && this.tokens[this.pos + 1].value === "in") {
        this.next();
        this.next();
        node = { kind: "not", value: { kind: "compare", op: "in", left: node, right: this.parseAdditive() } };
        continue;
      }
      return node;
    }
  };

  Parser.prototype.parseAdditive = function () {
    var node = this.parseMultiplicative();
    while (this.at("op", "+") || this.at("op", "-")) {
      var op = this.next().value;
      node = { kind: "binary", op: op, left: node, right: this.parseMultiplicative() };
    }
    return node;
  };

  Parser.prototype.parseMultiplicative = function () {
    var node = this.parseUnary();
    while (this.at("op", "*") || this.at("op", "/") || this.at("op", "//") || this.at("op", "%")) {
      var op = this.next().value;
      node = { kind: "binary", op: op, left: node, right: this.parseUnary() };
    }
    return node;
  };

  Parser.prototype.parseUnary = function () {
    if (this.at("op", "-") || this.at("op", "+")) {
      var op = this.next().value;
      return { kind: "unary", op: op, value: this.parseUnary() };
    }
    return this.parsePower();
  };

  Parser.prototype.parsePower = function () {
    var node = this.parsePostfix();
    if (this.eat("op", "**")) {
      return { kind: "binary", op: "**", left: node, right: this.parseUnary() };
    }
    return node;
  };

  Parser.prototype.parsePostfix = function () {
    var node = this.parseAtom();
    for (;;) {
      if (this.eat("op", "(")) {
        node = { kind: "call", callee: node, args: this.parseArguments() };
        continue;
      }
      if (this.eat("op", "[")) {
        var index = this.parseExpression();
        this.expect("op", "]");
        node = { kind: "subscript", target: node, index: index };
        continue;
      }
      if (this.eat("op", ".")) {
        var attribute = this.next();
        if (attribute.type !== "name") throw new PyError("expected an attribute name after .");
        node = { kind: "attribute", target: node, name: attribute.value };
        continue;
      }
      return node;
    }
  };

  Parser.prototype.parseArguments = function () {
    var args = [];
    if (this.eat("op", ")")) return args;
    do {
      args.push(this.parseExpression());
    } while (this.eat("op", ","));
    this.expect("op", ")");
    return args;
  };

  Parser.prototype.parseAtom = function () {
    var token = this.peek();
    if (token.type === "number" || token.type === "string") {
      this.next();
      return { kind: "literal", value: token.value };
    }
    if (token.type === "name") {
      this.next();
      if (token.value === "True") return { kind: "literal", value: true };
      if (token.value === "False") return { kind: "literal", value: false };
      if (token.value === "None") return { kind: "literal", value: null };
      if (["lambda", "yield", "await", "class", "import"].indexOf(token.value) !== -1) {
        throw new Unsupported(token.value);
      }
      return { kind: "name", value: token.value };
    }
    if (this.eat("op", "(")) {
      var inner = this.parseExpression();
      this.expect("op", ")");
      return inner;
    }
    if (this.eat("op", "[")) {
      var items = [];
      if (!this.eat("op", "]")) {
        do {
          items.push(this.parseExpression());
        } while (this.eat("op", ","));
        this.expect("op", "]");
      }
      return { kind: "list", items: items };
    }
    if (this.eat("op", "{")) {
      var entries = [];
      if (!this.eat("op", "}")) {
        do {
          var dictKey = this.parseExpression();
          this.expect("op", ":");
          entries.push({ key: dictKey, value: this.parseExpression() });
        } while (this.eat("op", ","));
        this.expect("op", "}");
      }
      return { kind: "dict", entries: entries };
    }
    throw new PyError('unexpected "' + String(token.value) + '"');
  };

  function parseExpressionText(text) {
    var parser = new Parser(tokenize(text));
    var node = parser.parseExpression();
    if (!parser.at("end")) throw new PyError('unexpected "' + String(parser.peek().value) + '"');
    return node;
  }

  /* ---------- statement parser ---------- */

  var ASSIGN_OPS = ["+=", "-=", "*=", "/=", "//=", "%="];

  function parseBlock(lines, cursor, indent) {
    var statements = [];
    while (cursor.index < lines.length && lines[cursor.index].indent >= indent) {
      if (lines[cursor.index].indent > indent && statements.length === 0) {
        throw new PyError("unexpected indentation");
      }
      if (lines[cursor.index].indent > indent) break;
      statements.push(parseStatement(lines, cursor, indent));
    }
    return statements;
  }

  function parseSuite(lines, cursor, parentIndent) {
    if (cursor.index >= lines.length || lines[cursor.index].indent <= parentIndent) {
      throw new PyError("an indented block is missing");
    }
    return parseBlock(lines, cursor, lines[cursor.index].indent);
  }

  function parseStatement(lines, cursor, indent) {
    var line = lines[cursor.index];
    var text = line.text;

    if (text === "pass") {
      cursor.index += 1;
      return { kind: "pass" };
    }

    if (text === "return" || text.indexOf("return ") === 0) {
      cursor.index += 1;
      var valueText = text.slice(6).trim();
      return { kind: "return", value: valueText ? parseExpressionText(valueText) : { kind: "literal", value: null } };
    }

    if (/^(break|continue)$/.test(text)) {
      cursor.index += 1;
      return { kind: text };
    }

    if (/^if\s+/.test(text) && text.slice(-1) === ":") {
      cursor.index += 1;
      var branches = [{ test: parseExpressionText(text.slice(2, -1).trim()), body: parseSuite(lines, cursor, indent) }];
      var fallback = [];
      while (cursor.index < lines.length && lines[cursor.index].indent === indent) {
        var nextText = lines[cursor.index].text;
        if (/^elif\s+/.test(nextText) && nextText.slice(-1) === ":") {
          cursor.index += 1;
          branches.push({ test: parseExpressionText(nextText.slice(4, -1).trim()), body: parseSuite(lines, cursor, indent) });
          continue;
        }
        if (nextText === "else:") {
          cursor.index += 1;
          fallback = parseSuite(lines, cursor, indent);
        }
        break;
      }
      return { kind: "if", branches: branches, fallback: fallback };
    }

    var forMatch = /^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+):$/.exec(text);
    if (forMatch) {
      cursor.index += 1;
      return { kind: "for", target: forMatch[1], iterable: parseExpressionText(forMatch[2].trim()), body: parseSuite(lines, cursor, indent) };
    }

    if (/^while\s+/.test(text) && text.slice(-1) === ":") {
      cursor.index += 1;
      return { kind: "while", test: parseExpressionText(text.slice(5, -1).trim()), body: parseSuite(lines, cursor, indent) };
    }

    if (/^(def|class|import|from|try|with|async)\b/.test(text)) {
      throw new Unsupported(text.split(/\s|\(|:/)[0]);
    }

    for (var i = 0; i < ASSIGN_OPS.length; i += 1) {
      var marker = ASSIGN_OPS[i];
      var at = text.indexOf(marker);
      if (at > 0) {
        cursor.index += 1;
        return {
          kind: "assign",
          target: parseTarget(text.slice(0, at).trim()),
          op: marker.slice(0, -1),
          value: parseExpressionText(text.slice(at + marker.length).trim())
        };
      }
    }

    var plain = /^([^=!<>]+?)=(?!=)(.+)$/.exec(text);
    if (plain) {
      cursor.index += 1;
      return { kind: "assign", target: parseTarget(plain[1].trim()), op: null, value: parseExpressionText(plain[2].trim()) };
    }

    cursor.index += 1;
    return { kind: "expression", value: parseExpressionText(text) };
  }

  function parseTarget(text) {
    var node = parseExpressionText(text);
    if (node.kind !== "name" && node.kind !== "subscript") {
      throw new Unsupported("this kind of assignment");
    }
    return node;
  }

  /* ---------- runtime values ---------- */

  function isList(value) {
    return Array.isArray(value);
  }

  function isDict(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function truthy(value) {
    if (value === null || value === undefined || value === false) return false;
    if (value === true) return true;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.length > 0;
    if (isList(value)) return value.length > 0;
    if (isDict(value)) return Object.keys(value).length > 0;
    return true;
  }

  function equals(a, b) {
    if (a === b) return true;
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-9;
    if (isList(a) && isList(b)) {
      return a.length === b.length && a.every(function (item, index) {
        return equals(item, b[index]);
      });
    }
    if (isDict(a) && isDict(b)) {
      var keysA = Object.keys(a).sort();
      var keysB = Object.keys(b).sort();
      return keysA.length === keysB.length && keysA.every(function (dictKey, index) {
        return dictKey === keysB[index] && equals(a[dictKey], b[dictKey]);
      });
    }
    return false;
  }

  function describe(value) {
    if (value === null || value === undefined) return "None";
    if (value === true) return "True";
    if (value === false) return "False";
    if (typeof value === "string") return JSON.stringify(value);
    if (isList(value)) return "[" + value.map(describe).join(", ") + "]";
    if (isDict(value)) {
      return "{" + Object.keys(value).map(function (dictKey) {
        return JSON.stringify(dictKey) + ": " + describe(value[dictKey]);
      }).join(", ") + "}";
    }
    return String(value);
  }

  var BUILTINS = {
    sum: function (values, start) {
      requireList(values, "sum");
      return values.reduce(function (total, item) {
        return total + toNumber(item, "sum");
      }, start === undefined ? 0 : toNumber(start, "sum"));
    },
    len: function (value) {
      if (typeof value === "string" || isList(value)) return value.length;
      if (isDict(value)) return Object.keys(value).length;
      throw new PyError("len() needs a list, string or dict");
    },
    max: function () {
      var values = spread(arguments, "max");
      if (!values.length) throw new PyError("max() got an empty sequence");
      return values.reduce(function (best, item) {
        return item > best ? item : best;
      });
    },
    min: function () {
      var values = spread(arguments, "min");
      if (!values.length) throw new PyError("min() got an empty sequence");
      return values.reduce(function (best, item) {
        return item < best ? item : best;
      });
    },
    abs: function (value) {
      return Math.abs(toNumber(value, "abs"));
    },
    round: function (value, digits) {
      var factor = Math.pow(10, digits === undefined ? 0 : digits);
      return Math.round(toNumber(value, "round") * factor) / factor;
    },
    sorted: function (values) {
      requireList(values, "sorted");
      return values.slice().sort(function (a, b) {
        return a > b ? 1 : a < b ? -1 : 0;
      });
    },
    range: function (a, b, step) {
      var start = b === undefined ? 0 : toNumber(a, "range");
      var stop = b === undefined ? toNumber(a, "range") : toNumber(b, "range");
      var by = step === undefined ? 1 : toNumber(step, "range");
      if (by === 0) throw new PyError("range() step must not be zero");
      var out = [];
      for (var i = start; by > 0 ? i < stop : i > stop; i += by) out.push(i);
      return out;
    },
    int: function (value) {
      return Math.trunc(toNumber(value, "int"));
    },
    float: function (value) {
      return toNumber(value, "float");
    },
    str: function (value) {
      return typeof value === "string" ? value : describe(value);
    },
    list: function (value) {
      if (isList(value)) return value.slice();
      if (typeof value === "string") return value.split("");
      if (isDict(value)) return Object.keys(value);
      throw new PyError("list() needs a sequence");
    }
  };

  function spread(args, name) {
    if (args.length === 1 && isList(args[0])) return args[0];
    return Array.prototype.slice.call(args).map(function (value) {
      return value;
    });
  }

  function requireList(value, name) {
    if (!isList(value)) throw new PyError(name + "() needs a list");
  }

  function toNumber(value, name) {
    if (typeof value === "number") return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value))) return Number(value);
    throw new PyError(name + "() needs a number but got " + describe(value));
  }

  /* ---------- evaluation ---------- */

  function Interpreter(env) {
    this.env = env;
    this.steps = 0;
  }

  Interpreter.prototype.tick = function () {
    this.steps += 1;
    if (this.steps > STEP_LIMIT) throw new PyError("this solution ran too long — check for a loop that never ends");
  };

  Interpreter.prototype.evaluate = function (node) {
    this.tick();
    switch (node.kind) {
      case "literal":
        return node.value;
      case "name":
        if (Object.prototype.hasOwnProperty.call(this.env, node.value)) return this.env[node.value];
        if (Object.prototype.hasOwnProperty.call(BUILTINS, node.value)) return BUILTINS[node.value];
        throw new PyError('"' + node.value + '" is not defined');
      case "list":
        return node.items.map(this.evaluate, this);
      case "dict": {
        var result = {};
        for (var i = 0; i < node.entries.length; i += 1) {
          result[String(this.evaluate(node.entries[i].key))] = this.evaluate(node.entries[i].value);
        }
        return result;
      }
      case "unary": {
        var operand = this.evaluate(node.value);
        return node.op === "-" ? -toNumber(operand, "-") : toNumber(operand, "+");
      }
      case "not":
        return !truthy(this.evaluate(node.value));
      case "logical": {
        var left = this.evaluate(node.left);
        if (node.op === "and") return truthy(left) ? this.evaluate(node.right) : left;
        return truthy(left) ? left : this.evaluate(node.right);
      }
      case "compare":
        return this.compare(node);
      case "binary":
        return this.binary(node);
      case "subscript": {
        var target = this.evaluate(node.target);
        var index = this.evaluate(node.index);
        return this.subscript(target, index);
      }
      case "attribute":
        throw new Unsupported("the ." + node.name + " attribute");
      case "call":
        return this.call(node);
      default:
        throw new Unsupported("this expression");
    }
  };

  Interpreter.prototype.subscript = function (target, index) {
    if (isList(target)) {
      var position = toNumber(index, "list index");
      var resolved = position < 0 ? target.length + position : position;
      if (resolved < 0 || resolved >= target.length) throw new PyError("list index " + describe(index) + " is out of range");
      return target[resolved];
    }
    if (typeof target === "string") {
      var at = toNumber(index, "string index");
      var spot = at < 0 ? target.length + at : at;
      if (spot < 0 || spot >= target.length) throw new PyError("string index is out of range");
      return target[spot];
    }
    if (isDict(target)) {
      var dictKey = String(index);
      if (!Object.prototype.hasOwnProperty.call(target, dictKey)) throw new PyError("KeyError: " + describe(index));
      return target[dictKey];
    }
    throw new PyError(describe(target) + " cannot be indexed");
  };

  Interpreter.prototype.compare = function (node) {
    var left = this.evaluate(node.left);
    var right = this.evaluate(node.right);
    switch (node.op) {
      case "==":
        return equals(left, right);
      case "!=":
        return !equals(left, right);
      case "in":
        if (isList(right)) return right.some(function (item) { return equals(item, left); });
        if (typeof right === "string") return right.indexOf(String(left)) !== -1;
        if (isDict(right)) return Object.prototype.hasOwnProperty.call(right, String(left));
        throw new PyError("in needs a list, string or dict on the right");
      case "<":
        return left < right;
      case "<=":
        return left <= right;
      case ">":
        return left > right;
      default:
        return left >= right;
    }
  };

  Interpreter.prototype.binary = function (node) {
    var left = this.evaluate(node.left);
    var right = this.evaluate(node.right);
    if (node.op === "+") {
      if (typeof left === "string" && typeof right === "string") return left + right;
      if (isList(left) && isList(right)) return left.concat(right);
      return toNumber(left, "+") + toNumber(right, "+");
    }
    if (node.op === "*") {
      if (typeof left === "string" && typeof right === "number") return left.repeat(Math.max(0, Math.trunc(right)));
      if (typeof left === "number" && typeof right === "string") return right.repeat(Math.max(0, Math.trunc(left)));
      if (isList(left) && typeof right === "number") {
        var repeated = [];
        for (var i = 0; i < Math.trunc(right); i += 1) repeated = repeated.concat(left);
        return repeated;
      }
      return toNumber(left, "*") * toNumber(right, "*");
    }
    var a = toNumber(left, node.op);
    var b = toNumber(right, node.op);
    switch (node.op) {
      case "-":
        return a - b;
      case "/":
        if (b === 0) throw new PyError("ZeroDivisionError: division by zero");
        return a / b;
      case "//":
        if (b === 0) throw new PyError("ZeroDivisionError: division by zero");
        return Math.floor(a / b);
      case "%":
        if (b === 0) throw new PyError("ZeroDivisionError: modulo by zero");
        return ((a % b) + b) % b;
      default:
        return Math.pow(a, b);
    }
  };

  Interpreter.prototype.call = function (node) {
    var args = node.args.map(this.evaluate, this);
    if (node.callee.kind === "attribute") {
      var owner = this.evaluate(node.callee.target);
      return this.method(owner, node.callee.name, args);
    }
    var fn = this.evaluate(node.callee);
    if (typeof fn !== "function") throw new PyError(describe(fn) + " is not callable");
    return fn.apply(null, args);
  };

  Interpreter.prototype.method = function (owner, name, args) {
    if (isList(owner)) {
      if (name === "append") {
        owner.push(args[0]);
        return null;
      }
      if (name === "extend") {
        requireList(args[0], "extend");
        Array.prototype.push.apply(owner, args[0]);
        return null;
      }
    }
    if (isDict(owner)) {
      if (name === "get") {
        var dictKey = String(args[0]);
        return Object.prototype.hasOwnProperty.call(owner, dictKey) ? owner[dictKey] : (args.length > 1 ? args[1] : null);
      }
      if (name === "keys") return Object.keys(owner);
      if (name === "values") return Object.keys(owner).map(function (dictKey) { return owner[dictKey]; });
    }
    if (typeof owner === "string") {
      if (name === "lower") return owner.toLowerCase();
      if (name === "upper") return owner.toUpperCase();
      if (name === "strip") return owner.trim();
    }
    throw new Unsupported("the ." + name + "() method");
  };

  /* ---------- statement execution ---------- */

  Interpreter.prototype.assign = function (target, value) {
    if (target.kind === "name") {
      this.env[target.value] = value;
      return;
    }
    var owner = this.evaluate(target.target);
    var index = this.evaluate(target.index);
    if (isList(owner)) {
      var position = toNumber(index, "list index");
      owner[position < 0 ? owner.length + position : position] = value;
      return;
    }
    if (isDict(owner)) {
      owner[String(index)] = value;
      return;
    }
    throw new PyError("cannot assign into " + describe(owner));
  };

  Interpreter.prototype.run = function (statements) {
    for (var i = 0; i < statements.length; i += 1) {
      var outcome = this.execute(statements[i]);
      if (outcome) return outcome;
    }
    return null;
  };

  Interpreter.prototype.execute = function (statement) {
    this.tick();
    switch (statement.kind) {
      case "pass":
        return null;
      case "expression":
        this.evaluate(statement.value);
        return null;
      case "return":
        return { signal: RETURN.signal, value: this.evaluate(statement.value) };
      case "break":
        return { signal: "break" };
      case "continue":
        return { signal: "continue" };
      case "assign": {
        var value = this.evaluate(statement.value);
        if (statement.op) {
          var current = this.evaluate(statement.target);
          value = this.binary({ op: statement.op, left: { kind: "literal", value: current }, right: { kind: "literal", value: value } });
        }
        this.assign(statement.target, value);
        return null;
      }
      case "if": {
        for (var i = 0; i < statement.branches.length; i += 1) {
          if (truthy(this.evaluate(statement.branches[i].test))) return this.run(statement.branches[i].body);
        }
        return this.run(statement.fallback);
      }
      case "for": {
        var iterable = this.evaluate(statement.iterable);
        var items = isList(iterable) ? iterable : typeof iterable === "string" ? iterable.split("") : isDict(iterable) ? Object.keys(iterable) : null;
        if (!items) throw new PyError(describe(iterable) + " is not something you can loop over");
        for (var index = 0; index < items.length; index += 1) {
          this.env[statement.target] = items[index];
          var outcome = this.run(statement.body);
          if (outcome && outcome.signal === "break") break;
          if (outcome && outcome.signal === RETURN.signal) return outcome;
        }
        return null;
      }
      case "while": {
        while (truthy(this.evaluate(statement.test))) {
          this.tick();
          var result = this.run(statement.body);
          if (result && result.signal === "break") break;
          if (result && result.signal === RETURN.signal) return result;
        }
        return null;
      }
      default:
        throw new Unsupported("this statement");
    }
  };

  /* ---------- public surface ---------- */

  // Pull one function definition out of the submission.
  function findFunction(source, name) {
    var lines = readLines(source);
    var header = new RegExp("^def\\s+" + name + "\\s*\\(([^)]*)\\)\\s*:$");
    for (var i = 0; i < lines.length; i += 1) {
      var match = header.exec(lines[i].text);
      if (!match) continue;
      var params = match[1].split(",").map(function (part) {
        return part.trim();
      }).filter(Boolean);
      var body = [];
      for (var j = i + 1; j < lines.length && lines[j].indent > lines[i].indent; j += 1) body.push(lines[j]);
      if (!body.length) throw new PyError("def " + name + " has an empty body");
      var cursor = { index: 0 };
      var statements = parseBlock(body, cursor, body[0].indent);
      return { params: params, statements: statements };
    }
    return null;
  }

  function callFunction(fn, args) {
    var env = {};
    for (var i = 0; i < fn.params.length; i += 1) {
      env[fn.params[i].split("=")[0].trim()] = args[i] === undefined ? null : args[i];
    }
    var interpreter = new Interpreter(env);
    var outcome = interpreter.run(fn.statements);
    return outcome && outcome.signal === RETURN.signal ? outcome.value : null;
  }

  /*
   * Run a submission against real cases.
   * spec: { name, params, cases: [{ args, expected }] }
   * Returns { status, detail, passed, total, failure }
   * status is "passed", "failed", or "unsupported".
   */
  function checkSolution(source, spec) {
    var fn;
    try {
      fn = findFunction(source, spec.name);
    } catch (error) {
      return failureFrom(error, spec);
    }

    if (!fn) {
      return {
        status: "failed",
        passed: 0,
        total: spec.cases.length,
        detail: "No function named " + spec.name + "() was found. Start with def " + spec.name + "(" + spec.params.join(", ") + "):"
      };
    }
    if (fn.params.length !== spec.params.length) {
      return {
        status: "failed",
        passed: 0,
        total: spec.cases.length,
        detail: spec.name + "() should take " + spec.params.length + " argument" + (spec.params.length === 1 ? "" : "s") +
          " (" + spec.params.join(", ") + ") but takes " + fn.params.length + "."
      };
    }

    var passed = 0;
    for (var i = 0; i < spec.cases.length; i += 1) {
      var testCase = spec.cases[i];
      var actual;
      try {
        actual = callFunction(fn, deepCopy(testCase.args));
      } catch (error) {
        var reported = failureFrom(error, spec);
        reported.passed = passed;
        reported.failure = callText(spec.name, testCase.args);
        return reported;
      }
      if (!equals(actual, testCase.expected)) {
        return {
          status: "failed",
          passed: passed,
          total: spec.cases.length,
          failure: callText(spec.name, testCase.args),
          expected: describe(testCase.expected),
          detail: callText(spec.name, testCase.args) + " returned " + describe(actual) + ", which is not the expected result."
        };
      }
      passed += 1;
    }

    return { status: "passed", passed: passed, total: spec.cases.length, detail: "" };
  }

  function failureFrom(error, spec) {
    if (error instanceof Unsupported || error.name === "Unsupported") {
      return {
        status: "unsupported",
        passed: 0,
        total: spec.cases.length,
        detail: "This checker cannot run " + error.message + " yet. Try solving it with the basics covered in the lesson."
      };
    }
    return {
      status: "failed",
      passed: 0,
      total: spec.cases.length,
      detail: "Your code could not run: " + error.message + "."
    };
  }

  function callText(name, args) {
    return name + "(" + args.map(describe).join(", ") + ")";
  }

  function deepCopy(value) {
    if (isList(value)) return value.map(deepCopy);
    if (isDict(value)) {
      return Object.keys(value).reduce(function (copy, dictKey) {
        copy[dictKey] = deepCopy(value[dictKey]);
        return copy;
      }, {});
    }
    return value;
  }

  return {
    checkSolution: checkSolution,
    findFunction: findFunction,
    callFunction: callFunction,
    describe: describe,
    callText: callText
  };
})();

if (typeof module !== "undefined" && module.exports) module.exports = PythonLite;
