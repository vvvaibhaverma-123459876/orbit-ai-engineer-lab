const test = require("node:test");
const assert = require("node:assert");
const PythonLite = require("../python-lite.js");

const doubleSpec = {
  name: "double",
  params: ["number"],
  cases: [
    { args: [0], expected: 0 },
    { args: [3], expected: 6 },
    { args: [-4], expected: -8 },
    { args: [7.5], expected: 15 }
  ]
};

const totalSpec = {
  name: "total",
  params: ["scores"],
  cases: [
    { args: [[]], expected: 0 },
    { args: [[5]], expected: 5 },
    { args: [[82, 91, 76]], expected: 249 },
    { args: [[-2, 2]], expected: 0 }
  ]
};

const configSpec = {
  name: "get_learning_rate",
  params: ["config"],
  cases: [
    { args: [{ training: { learning_rate: 0.001 } }], expected: 0.001 },
    { args: [{ training: { learning_rate: 0.05 }, model: { layers: 4 } }], expected: 0.05 }
  ]
};

const check = (code, spec) => PythonLite.checkSolution(code, spec);

test("accepts equivalent correct solutions the old regex rejected", () => {
  const answers = [
    "def double(number):\n    return number * 2",
    "def double(number):\n    return 2 * number",
    "def double(number):\n    return number + number",
    "def double(number):\n    result = number * 2\n    return result",
    "def double(number):\n    return number*2  # doubled",
    "def double( number ):\n\treturn number * 2"
  ];
  for (const answer of answers) {
    assert.strictEqual(check(answer, doubleSpec).status, "passed", answer);
  }
});

test("rejects the near misses the old regex accepted", () => {
  const wrong = [
    ["def double(number):\n    return number * 20", "off-by-a-digit"],
    ["# return number * 2", "comment only, no function"],
    ["return number * 2", "no function definition"],
    ["def double(number):\n    return number", "returns the input unchanged"],
    ["def double(number):\n    print(number * 2)", "prints instead of returning"],
    ["def double(number):\n    pass", "starter code left alone"],
    ["def double(number):\n    return number ** 2", "squares instead of doubling"]
  ];
  for (const [answer, label] of wrong) {
    assert.notStrictEqual(check(answer, doubleSpec).status, "passed", label);
  }
});

test("a returned string that merely contains the answer does not pass", () => {
  assert.notStrictEqual(check('def double(number):\n    return "number * 2"', doubleSpec).status, "passed");
});

test("accepts a hand-written loop as readily as the builtin", () => {
  const loop = "def total(scores):\n    running = 0\n    for score in scores:\n        running += score\n    return running";
  const builtin = "def total(scores):\n    return sum(scores)";
  const indexed = "def total(scores):\n    running = 0\n    for i in range(len(scores)):\n        running = running + scores[i]\n    return running";
  for (const answer of [loop, builtin, indexed]) {
    assert.strictEqual(check(answer, totalSpec).status, "passed", answer);
  }
});

test("catches a loop that only works on non-empty lists", () => {
  const buggy = "def total(scores):\n    running = scores[0]\n    for score in scores:\n        running += score\n    return running";
  const result = check(buggy, totalSpec);
  assert.notStrictEqual(result.status, "passed");
  assert.match(result.detail, /out of range|returned/);
});

test("nested lookups pass by subscript or by get", () => {
  assert.strictEqual(check("def get_learning_rate(config):\n    return config['training']['learning_rate']", configSpec).status, "passed");
  assert.strictEqual(check('def get_learning_rate(config):\n    return config["training"]["learning_rate"]', configSpec).status, "passed");
  assert.strictEqual(check("def get_learning_rate(config):\n    training = config['training']\n    return training['learning_rate']", configSpec).status, "passed");
  assert.strictEqual(check("def get_learning_rate(config):\n    return config.get('training').get('learning_rate')", configSpec).status, "passed");
});

test("a hardcoded value fails on the second configuration", () => {
  const result = check("def get_learning_rate(config):\n    return 0.001", configSpec);
  assert.strictEqual(result.status, "failed");
  assert.strictEqual(result.passed, 1, "should pass the first case and fail the second");
});

test("reports a missing or misnamed function clearly", () => {
  const result = check("def doubl(number):\n    return number * 2", doubleSpec);
  assert.strictEqual(result.status, "failed");
  assert.match(result.detail, /No function named double\(\)/);
});

test("reports the wrong number of parameters", () => {
  const result = check("def double(number, factor):\n    return number * 2", doubleSpec);
  assert.match(result.detail, /should take 1 argument/);
});

test("unsupported constructs are labelled, not called wrong", () => {
  const result = check("def double(number):\n    import math\n    return number * 2", doubleSpec);
  assert.strictEqual(result.status, "unsupported");
  assert.match(result.detail, /cannot run import/);
});

test("an endless loop is stopped rather than hanging the page", () => {
  const result = check("def double(number):\n    while True:\n        number = number\n    return number", doubleSpec);
  assert.strictEqual(result.status, "failed");
  assert.match(result.detail, /ran too long/);
});

test("a solution cannot mutate the test fixture to make later cases pass", () => {
  const result = check("def total(scores):\n    scores.append(999)\n    return sum(scores) - 999", totalSpec);
  assert.strictEqual(result.status, "passed", "each case gets a fresh copy of its arguments");
});

test("syntax problems report as a run failure with a reason", () => {
  const result = check("def double(number):\n    return number *", doubleSpec);
  assert.strictEqual(result.status, "failed");
  assert.match(result.detail, /could not run/);
});

test("arithmetic, comparison and control flow behave like Python", () => {
  const spec = { name: "f", params: ["n"], cases: [{ args: [7], expected: "odd" }, { args: [8], expected: "even" }] };
  const code = "def f(n):\n    if n % 2 == 0:\n        return 'even'\n    else:\n        return 'odd'";
  assert.strictEqual(check(code, spec).status, "passed");
  const floorSpec = { name: "f", params: ["n"], cases: [{ args: [7], expected: 3 }] };
  assert.strictEqual(check("def f(n):\n    return n // 2", floorSpec).status, "passed");
  const trueDivSpec = { name: "f", params: ["n"], cases: [{ args: [7], expected: 3.5 }] };
  assert.strictEqual(check("def f(n):\n    return n / 2", trueDivSpec).status, "passed");
  const negModSpec = { name: "f", params: ["n"], cases: [{ args: [-1], expected: 4 }] };
  assert.strictEqual(check("def f(n):\n    return n % 5", negModSpec).status, "passed", "Python modulo is non-negative");
});

test("failure feedback names the case without handing over the answer", () => {
  const result = check("def double(number):\n    return number * 3", doubleSpec);
  assert.strictEqual(result.status, "failed");
  assert.match(result.detail, /double\(3\) returned 9/);
  assert.doesNotMatch(result.detail, /\b6\b/, "the expected value must not appear in learner-facing feedback");
  assert.strictEqual(result.expected, "6", "but it is still available to the caller");
});
