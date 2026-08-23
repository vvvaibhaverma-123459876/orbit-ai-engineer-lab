const test = require("node:test");
const assert = require("node:assert/strict");
const PythonLite = require("../python-lite.js");

const exercises = [
  ["session_count", ["sessions"], "def session_count(sessions):\n    return len(sessions)", [[[] , 0], [["a", "b", "c"], 3]]],
  ["readiness", ["scores"], "def readiness(scores):\n    return sum(scores) >= 3", [[[], false], [[1, 1, 1], true], [[2, 0], false]]],
  ["task_name", ["request"], "def task_name(request):\n    return request['task']", [[{ task: "summarise" }, "summarise"], [{ task: "classify" }, "classify"]]],
  ["mean_score", ["scores"], "def mean_score(scores):\n    return sum(scores) / len(scores)", [[[1, 1], 1], [[0.8, 0.9], 0.85]]],
  ["first_context", ["chunks"], "def first_context(chunks):\n    return chunks[0]", [[['policy', 'pricing'], "policy"], [["refund"], "refund"]]],
  ["is_relevant", ["score"], "def is_relevant(score):\n    return score >= 0.7", [[0.7, true], [0.69, false], [0.95, true]]],
  ["label_of", ["record"], "def label_of(record):\n    return record['label']", [[{ label: "helpful" }, "helpful"], [{ label: "safe" }, "safe"]]],
  ["cap_temperature", ["value"], "def cap_temperature(value):\n    if value > 1:\n        return 1\n    return value", [[0.2, 0.2], [1.5, 1], [-0.2, -0.2]]],
  ["preferred_tool", ["tools"], "def preferred_tool(tools):\n    return tools[0]", [[['search', 'calculator'], "search"], [["vision"], "vision"]]],
  ["within_budget", ["steps"], "def within_budget(steps):\n    return steps <= 5", [[5, true], [6, false]]],
  ["monthly_limit", ["budget"], "def monthly_limit(budget):\n    return budget['monthly']", [[{ monthly: 100 }, 100], [{ monthly: 0 }, 0]]],
  ["can_release", ["quality", "safe"], "def can_release(quality, safe):\n    return quality >= 0.9 and safe", [[[0.9, true], true], [[0.89, true], false], [[0.99, false], false]]]
];

for (const [name, params, code, examples] of exercises) {
  test(`${name} curriculum exercise accepts its intended solution`, () => {
    const result = PythonLite.checkSolution(code, {
      name,
      params,
      cases: examples.map(([args, expected]) => ({ args: Array.isArray(args) && params.length > 1 ? args : [args], expected }))
    });
    assert.equal(result.status, "passed", result.detail);
  });
}
