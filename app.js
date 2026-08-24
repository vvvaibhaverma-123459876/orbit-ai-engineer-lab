const key = "orbit-prototype-state";
const defaults = {
  lessons: 1,
  currentLesson: 2,
  theme: "light",
  // Milestones on Portfolio project 01, tracked separately from lesson numbers.
  milestones: 1,
  streak: 1,
  bestStreak: 1,
  lastActiveDay: null,
  topicProgress: {}
};

// The path is intentionally finite and testable: six foundations lessons plus
// two applied lessons in each IIT-aligned module. Every lesson has theory,
// an exercise, and hidden cases, so every mapped module has a playable endpoint.
const TOTAL_LESSONS = 16;
const PROJECT_MILESTONES = 4;

function clampMilestones(value) {
  return Math.min(PROJECT_MILESTONES, Math.max(1, Math.round(Number(value) || 1)));
}

// Storage is best-effort: a corrupt value or a browser that blocks localStorage
// must never stop the rest of the app from starting.
function loadState() {
  try {
    const raw = localStorage.getItem(key);
    const stored = raw ? JSON.parse(raw) : null;
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return Object.assign({}, defaults);
    const merged = Object.assign({}, defaults, stored);
    if (!merged.topicProgress || typeof merged.topicProgress !== "object" || Array.isArray(merged.topicProgress)) merged.topicProgress = {};
    // Earlier builds stored a "portfolio" count that was really the lesson
    // number. Carry it across as a milestone count and drop the old key.
    if (typeof stored.portfolio === "number" && typeof stored.milestones !== "number") {
      merged.milestones = clampMilestones(stored.portfolio);
    }
    delete merged.portfolio;
    return merged;
  } catch (error) {
    console.warn("Orbit: saved progress could not be read, starting from defaults.", error);
    return Object.assign({}, defaults);
  }
}

let state = loadState();
let lockedScrollY = 0;
let attempts = 0;
let lastTrigger = null;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const lessonContent = {
  2: {
    kicker: "LESSON 02 · CONCEPT + PRACTICE",
    title: "Write your first Python function",
    lead: "A function is a named idea you can call again. Read the example, then write one yourself without copying it.",
    example: "def greet(name):\n    return f\"Hello, {name}!\"",
    prompt: "Write double(number) so it returns the input multiplied by two.",
    hint: "Try a small number first. Hidden examples will check your code.",
    starter: "def double(number):\n    # write your return statement here\n    pass",
    theory: [
      { question: "What does a Python function give you?", options: ["A reusable named block of logic", "A special type of loop", "A way to store a single value"], answer: 0 },
      { question: "What does return do inside a function?", options: ["Sends a result back to the caller", "Prints the result automatically", "Ends the program"], answer: 0 }
    ],
    check: {
      name: "double",
      params: ["number"],
      cases: [
        { args: [3], expected: 6 },
        { args: [0], expected: 0 },
        { args: [-4], expected: -8 },
        { args: [7.5], expected: 15 },
        { args: [1000000], expected: 2000000 }
      ]
    },
    success: "Your function holds for positive, negative, zero, fractional and large inputs. <b>Next: explain why it works.</b>",
    nudge: "Read what your function returned above, then compare it with what doubling that input should give."
  },
  3: {
    kicker: "LESSON 03 · CONCEPT + PRACTICE",
    title: "Data structures hold more than one thing",
    lead: "Lists let a program work with a collection of values. That idea appears everywhere in data and AI systems.",
    example: "scores = [82, 91, 76]\nbest_score = max(scores)",
    prompt: "Write total(scores) so it returns the sum of every value in the list.",
    hint: "Python already has a built-in function that adds the values in a list.",
    starter: "def total(scores):\n    # return the sum of the values\n    pass",
    theory: [
      { question: "What is a Python list?", options: ["An ordered collection of values", "A single number", "A name for one variable"], answer: 0 },
      { question: "Which built-in adds all values in scores?", options: ["sum(scores)", "max(scores)", "len(scores)"], answer: 0 }
    ],
    check: {
      name: "total",
      params: ["scores"],
      cases: [
        { args: [[82, 91, 76]], expected: 249 },
        { args: [[]], expected: 0 },
        { args: [[5]], expected: 5 },
        { args: [[-2, 2]], expected: 0 },
        { args: [[1.5, 2.5]], expected: 4 }
      ]
    },
    success: "Your function holds for empty, single-item, negative and fractional lists. <b>Nice decomposition.</b>",
    nudge: "The empty list is the case most solutions miss. A loop and the built-in are both accepted."
  },
  4: {
    kicker: "LESSON 04 · PYTHON ENGINEERING",
    title: "Read configuration without hardcoding it",
    lead: "Production AI projects keep changing settings in configuration files instead of scattering magic numbers through the code.",
    example: "config = {\n    \"training\": {\"learning_rate\": 0.001}\n}",
    prompt: "Write get_learning_rate(config) so it returns the nested training learning rate.",
    hint: "The value lives at config['training']['learning_rate']. Return it; do not print it.",
    starter: "def get_learning_rate(config):\n    # read the nested training setting\n    pass",
    theory: [
      { question: "Why keep a learning rate in configuration?", options: ["It can change without rewriting the training code", "It makes the value secret automatically", "It makes training run faster"], answer: 0 },
      { question: "What kind of data is JSON best described as?", options: ["Structured key-value data", "Executable Python code", "A compression format"], answer: 0 }
    ],
    check: {
      name: "get_learning_rate",
      params: ["config"],
      cases: [
        { args: [{ training: { learning_rate: 0.001 } }], expected: 0.001 },
        { args: [{ training: { learning_rate: 0.05 }, model: { layers: 4 } }], expected: 0.05 },
        { args: [{ model: { layers: 2 }, training: { epochs: 10, learning_rate: 0.3 } }], expected: 0.3 }
      ]
    },
    success: "Your function reads the setting from every configuration shape without hardcoding the value.",
    nudge: "A hardcoded number passes the first case and fails the rest. Read the value out of the config you were given."
  },
  5: {
    kicker: "LESSON 05 · WORKFLOW ENGINEERING",
    title: "Turn practice into a reproducible record",
    lead: "A reliable AI engineer leaves a trail: a small function, a testable result, and a record another person can inspect.",
    example: "sessions = [\"functions\", \"lists\"]\nlatest = sessions[-1]",
    prompt: "Write session_count(sessions) so it returns how many practice sessions are recorded.",
    hint: "Use the list length. Empty input is a valid and important case.",
    starter: "def session_count(sessions):\n    # return the number of recorded sessions\n    pass",
    theory: [
      { question: "Why keep a development history?", options: ["It makes work reproducible and reviewable", "It makes code execute faster", "It replaces automated tests"], answer: 0 },
      { question: "Which expression counts values in a list?", options: ["len(sessions)", "max(sessions)", "sessions[0]"], answer: 0 }
    ],
    check: { name: "session_count", params: ["sessions"], cases: [
      { args: [[]], expected: 0 }, { args: [["a"]], expected: 1 },
      { args: [["a", "b", "c"]], expected: 3 }, { args: [[1, 2, 3, 4, 5]], expected: 5 }
    ] },
    success: "Your workflow helper handles empty, small and larger histories. <b>Evidence is part of engineering.</b>",
    nudge: "Try an empty list as well as a non-empty one; robust workflow tools define both cases."
  },
  6: {
    kicker: "LESSON 06 · FOUNDATIONS CHECKPOINT",
    title: "Defend a small data decision",
    lead: "Before moving into GenAI, demonstrate that you can combine functions, conditions and data into a decision a stakeholder can understand.",
    example: "def ready(score):\n    return score >= 3",
    prompt: "Write readiness(scores) so it returns True when the total of scores is at least 3, otherwise False.",
    hint: "Sum the supplied scores and compare the result. Do not hardcode a single example.",
    starter: "def readiness(scores):\n    # return whether the total score reaches 3\n    pass",
    theory: [
      { question: "What makes a checkpoint useful?", options: ["It tests transfer to a new case", "It only repeats the example verbatim", "It rewards the longest answer"], answer: 0 },
      { question: "What does a comparison such as total >= 3 produce?", options: ["A Boolean decision", "A list of values", "A file on disk"], answer: 0 }
    ],
    check: { name: "readiness", params: ["scores"], cases: [
      { args: [[]], expected: false }, { args: [[1, 1, 1]], expected: true },
      { args: [[2, 0]], expected: false }, { args: [[5, -1]], expected: true }, { args: [[0, 2.9]], expected: false }
    ] },
    success: "Foundations checkpoint passed. <b>Module 01 is now unlocked.</b>",
    nudge: "The threshold must work for totals below, equal to and above three."
  },
  7: {
    kicker: "MODULE 01 · GENAI + LLMS · CONCEPT",
    title: "Choose a model for the job",
    lead: "Model selection is a product decision: quality, latency, cost, and privacy must be weighed against the task—not hype.",
    example: "request = {\"task\": \"summarise\", \"latency_budget\": 2}",
    prompt: "Write task_name(request) so it returns the task field from the request dictionary.",
    hint: "Read the value by key; do not return a hardcoded task.",
    starter: "def task_name(request):\n    # return the requested task\n    pass",
    theory: [
      { question: "What is a language model token?", options: ["A unit of text processed by the model", "A guaranteed factual answer", "A database row"], answer: 0 },
      { question: "Which trade-off matters in model selection?", options: ["Quality, latency, cost and risk", "Logo colour only", "The number of slides in a demo"], answer: 0 }
    ],
    check: { name: "task_name", params: ["request"], cases: [
      { args: [{ task: "summarise", latency_budget: 2 }], expected: "summarise" },
      { args: [{ task: "classify", private: true }], expected: "classify" },
      { args: [{ task: "extract", retries: 3 }], expected: "extract" }
    ] },
    success: "You extracted the requirement instead of assuming it. <b>That is the first model-selection habit.</b>",
    nudge: "The hidden cases vary the task name to catch hardcoded answers."
  },
  8: {
    kicker: "MODULE 01 · GENAI + LLMS · PRACTICE",
    title: "Measure an answer, not a demo",
    lead: "A useful evaluation set has explicit expected outcomes. One convincing response is not a quality measurement.",
    example: "scores = [0.8, 0.9]\naverage = sum(scores) / len(scores)",
    prompt: "Write mean_score(scores) so it returns the arithmetic mean of a non-empty list.",
    hint: "Use sum and len; the hidden cases include decimals.",
    starter: "def mean_score(scores):\n    # return the average score\n    pass",
    theory: [
      { question: "What is an evaluation set?", options: ["A repeatable set of inputs and expected outcomes", "A random screenshot", "A model's marketing page"], answer: 0 },
      { question: "Why use several test cases?", options: ["To detect generalisation failures", "To make the model larger", "To avoid documenting assumptions"], answer: 0 }
    ],
    check: { name: "mean_score", params: ["scores"], cases: [
      { args: [[1, 1]], expected: 1 }, { args: [[0.8, 0.9]], expected: 0.85 }, { args: [[2, 4, 6]], expected: 4 }
    ] },
    success: "Your metric is repeatable across several cases. <b>Module 02 is ready next.</b>",
    nudge: "A mean is total divided by count; avoid returning only the first score."
  },
  9: {
    kicker: "MODULE 02 · PROMPTING + RAG · CONCEPT",
    title: "Retrieve before you generate",
    lead: "RAG systems ground a response in relevant context. Retrieval quality is a measurable part of the product, not a hidden magic step.",
    example: "chunks = [\"policy\", \"pricing\"]\ncontext = chunks[0]",
    prompt: "Write first_context(chunks) so it returns the first retrieved chunk.",
    hint: "The list is guaranteed to contain at least one chunk.",
    starter: "def first_context(chunks):\n    # return the highest-ranked context\n    pass",
    theory: [
      { question: "What does retrieval provide to a generator?", options: ["Relevant context", "A guaranteed answer", "A GPU"], answer: 0 },
      { question: "What should a RAG evaluation measure?", options: ["Retrieval relevance and answer faithfulness", "Only response colour", "Token count alone"], answer: 0 }
    ],
    check: { name: "first_context", params: ["chunks"], cases: [
      { args: [["policy", "pricing"]], expected: "policy" }, { args: [["refund"]], expected: "refund" }, { args: [["a", "b", "c"]], expected: "a" }
    ] },
    success: "Your function preserves retrieval order. <b>That makes the grounding contract explicit.</b>",
    nudge: "Do not select by a hardcoded word; the first chunk changes between cases."
  },
  10: {
    kicker: "MODULE 02 · PROMPTING + RAG · PRACTICE",
    title: "Set a relevance gate",
    lead: "Business systems need a refusal path when context is weak. A confidence or relevance threshold is safer than answering every question.",
    example: "def usable(score):\n    return score >= 0.7",
    prompt: "Write is_relevant(score) so it returns True for scores at least 0.7.",
    hint: "Use a comparison; the boundary value matters.",
    starter: "def is_relevant(score):\n    # apply the relevance threshold\n    pass",
    theory: [
      { question: "What is a relevance threshold?", options: ["A rule for deciding whether context is good enough", "A prompt decoration", "A database backup"], answer: 0 },
      { question: "Why should a RAG system have a refusal path?", options: ["Weak context can produce unsupported claims", "Refusals always improve latency", "It removes the need for evaluation"], answer: 0 }
    ],
    check: { name: "is_relevant", params: ["score"], cases: [
      { args: [0.7], expected: true }, { args: [0.69], expected: false }, { args: [0.95], expected: true }, { args: [0], expected: false }
    ] },
    success: "The relevance gate handles the boundary correctly. <b>Module 03 is unlocked.</b>",
    nudge: "Check exactly 0.7 as well as values just below and above it."
  },
  11: {
    kicker: "MODULE 03 · FINE-TUNING + ALIGNMENT · CONCEPT",
    title: "Keep the training signal clean",
    lead: "Fine-tuning changes behaviour through examples. A clean, representative dataset is more valuable than blindly adding more rows.",
    example: "record = {\"label\": \"helpful\"}\nlabel = record[\"label\"]",
    prompt: "Write label_of(record) so it returns the label stored in a training record.",
    hint: "Read the label field from the dictionary.",
    starter: "def label_of(record):\n    # return the training label\n    pass",
    theory: [
      { question: "What does fine-tuning adjust?", options: ["Model behaviour using task examples", "A user's browser theme", "A database schema only"], answer: 0 },
      { question: "What is alignment evaluation for?", options: ["Checking behaviour against intended constraints", "Maximising token count", "Removing all human review"], answer: 0 }
    ],
    check: { name: "label_of", params: ["record"], cases: [
      { args: [{ label: "helpful", text: "hi" }], expected: "helpful" }, { args: [{ label: "safe" }], expected: "safe" }, { args: [{ label: "needs_review", id: 3 }], expected: "needs_review" }
    ] },
    success: "You accessed the label from every record shape. <b>Data quality is an alignment control.</b>",
    nudge: "The label changes between examples, so read it from the input."
  },
  12: {
    kicker: "MODULE 03 · FINE-TUNING + ALIGNMENT · PRACTICE",
    title: "Cap a risky setting",
    lead: "Guardrails often begin as simple bounds. A capped setting prevents an unsafe value from flowing into a larger system.",
    example: "def cap(value):\n    if value > 1:\n        return 1\n    return value",
    prompt: "Write cap_temperature(value) so values above 1 return 1 and other values remain unchanged.",
    hint: "Use an if statement and a fallback return.",
    starter: "def cap_temperature(value):\n    # cap values above one\n    pass",
    theory: [
      { question: "Why validate a generation setting?", options: ["To prevent unsafe or invalid values", "To hide the setting from operators", "To replace monitoring"], answer: 0 },
      { question: "What should happen below the cap?", options: ["Preserve the requested value", "Always return zero", "Raise a model version"], answer: 0 }
    ],
    check: { name: "cap_temperature", params: ["value"], cases: [
      { args: [0.2], expected: 0.2 }, { args: [1], expected: 1 }, { args: [1.5], expected: 1 }, { args: [-0.2], expected: -0.2 }
    ] },
    success: "Your guardrail preserves valid values and caps invalid ones. <b>Module 04 is unlocked.</b>",
    nudge: "The hidden cases include values on both sides of the boundary."
  },
  13: {
    kicker: "MODULE 04 · MULTIMODAL + AGENTS · CONCEPT",
    title: "Make tool choice explicit",
    lead: "An agent is a controlled loop: interpret a goal, choose a tool, observe the result, and continue within limits.",
    example: "tools = [\"search\", \"calculator\"]\nfirst = tools[0]",
    prompt: "Write preferred_tool(tools) so it returns the first available tool.",
    hint: "The first tool is the ranked choice supplied by the planner.",
    starter: "def preferred_tool(tools):\n    # return the first available tool\n    pass",
    theory: [
      { question: "What makes an agent different from a single prompt?", options: ["It can select actions and observe results", "It never needs constraints", "It is always autonomous"], answer: 0 },
      { question: "Why limit tool calls?", options: ["To control cost, risk and runaway loops", "To make tools less observable", "To remove evaluation"], answer: 0 }
    ],
    check: { name: "preferred_tool", params: ["tools"], cases: [
      { args: [["search", "calculator"]], expected: "search" }, { args: [["vision"]], expected: "vision" }, { args: [["database", "email", "calendar"]], expected: "database" }
    ] },
    success: "The planner preserves the ranked tool choice. <b>Explicit policies make agents safer.</b>",
    nudge: "Return the first supplied tool rather than naming one in the function."
  },
  14: {
    kicker: "MODULE 04 · MULTIMODAL + AGENTS · PRACTICE",
    title: "Stop an agent within budget",
    lead: "A production agent needs a budget. A small comparison can prevent an expensive or unsafe plan from running.",
    example: "def allowed(steps):\n    return steps <= 5",
    prompt: "Write within_budget(steps) so it returns True when steps are five or fewer.",
    hint: "Use a less-than-or-equal comparison.",
    starter: "def within_budget(steps):\n    # enforce the five-step limit\n    pass",
    theory: [
      { question: "What is an agent budget?", options: ["A limit on actions, time or spend", "A prompt example", "A training label"], answer: 0 },
      { question: "What is a safe default when a budget is exceeded?", options: ["Stop and surface the decision", "Silently continue", "Delete the logs"], answer: 0 }
    ],
    check: { name: "within_budget", params: ["steps"], cases: [
      { args: [0], expected: true }, { args: [5], expected: true }, { args: [6], expected: false }, { args: [20], expected: false }
    ] },
    success: "The action budget is enforced at the boundary. <b>Module 05 is unlocked.</b>",
    nudge: "Check both five and six: off-by-one errors matter in safety limits."
  },
  15: {
    kicker: "MODULE 05 · DEPLOYMENT + SAFETY · CONCEPT",
    title: "Make a cost decision visible",
    lead: "Deployment is a business decision. A system is ready when its quality, latency, reliability and cost are measurable and defensible.",
    example: "budget = {\"monthly\": 100}\nlimit = budget[\"monthly\"]",
    prompt: "Write monthly_limit(budget) so it returns the monthly budget amount.",
    hint: "Read the monthly field from the configuration.",
    starter: "def monthly_limit(budget):\n    # return the monthly spending limit\n    pass",
    theory: [
      { question: "What is a production SLO?", options: ["A measurable reliability or performance target", "A model prompt", "A private API key"], answer: 0 },
      { question: "Why track cost per task?", options: ["It connects usage to a business decision", "It guarantees accuracy", "It removes the need for monitoring"], answer: 0 }
    ],
    check: { name: "monthly_limit", params: ["budget"], cases: [
      { args: [{ monthly: 100 }], expected: 100 }, { args: [{ monthly: 0, alert: true }], expected: 0 }, { args: [{ monthly: 250, team: "ml" }], expected: 250 }
    ] },
    success: "The cost limit is read from configuration. <b>One final safety exercise remains.</b>",
    nudge: "Configuration values can change; avoid returning a fixed number."
  },
  16: {
    kicker: "MODULE 05 · DEPLOYMENT + SAFETY · CHECKPOINT",
    title: "Choose a safe release",
    lead: "A release decision combines quality and risk. Ship only when both the quality threshold and the safety review are satisfied.",
    example: "def ship(quality, safe):\n    return quality >= 0.9 and safe",
    prompt: "Write can_release(quality, safe) so it returns True only when quality is at least 0.9 and safe is True.",
    hint: "Combine both Boolean conditions; neither condition alone is enough.",
    starter: "def can_release(quality, safe):\n    # return whether the release is ready\n    pass",
    theory: [
      { question: "What belongs in a release review?", options: ["Quality, reliability, cost and safety evidence", "Only a successful demo", "Only the model name"], answer: 0 },
      { question: "Why require both conditions for release?", options: ["A high-quality unsafe system is still not ready", "It makes deployment instant", "It avoids writing tests"], answer: 0 }
    ],
    check: { name: "can_release", params: ["quality", "safe"], cases: [
      { args: [0.9, true], expected: true }, { args: [0.89, true], expected: false }, { args: [0.99, false], expected: false }, { args: [0.95, true], expected: true }
    ] },
    success: "Final checkpoint passed. <b>You completed the end-to-end foundation path.</b>",
    nudge: "Both the quality threshold and the safety flag must be true."
  }
};

const foundationsCurriculum = [
  { id: "python", number: "01", title: "Python", summary: "Understand the language deeply enough to reason about correctness, memory, performance, and the data model behind AI tooling.", topics: ["Language core", "Data structures in practice", "Object-oriented Python", "Concurrency & performance"], competencies: ["Predict unfamiliar code without running it.", "Choose structures by access pattern and complexity.", "Design classes, protocols, and composition that survive change.", "Choose correctly between async, threads, and processes."], traps: ["Mutable default arguments and late-bound closures.", "Quadratic list operations and accidental copies.", "Deep inheritance and shared mutable class state.", "Blocking calls inside async code and optimizing before profiling."], exercises: ["Implement zip, enumerate, map, and filter as generators.", "Build an O(1) LRU cache and a retry decorator.", "Create a constant-memory generator pipeline for a very large file.", "Compare sequential, threaded, and async I/O with measurements."], materials: "Fluent Python 2e · Effective Python · Python Language Reference · High Performance Python" },
  { id: "engineering", number: "02", title: "Software engineering practice", summary: "Make work reviewable, testable, maintainable, and recoverable—the habits that turn notebooks into production software.", topics: ["Version control", "Testing", "Code quality & architecture", "Tooling & debugging"], competencies: ["Recover from any Git state and produce a reviewable history.", "Write regression tests, property tests, and tests for nondeterministic LLM output.", "Refactor behind tests and structure a project for a new contributor.", "Debug with a debugger, inspect traces, and use structured logs."], traps: ["Rebasing shared history without understanding the risk.", "Mocking the name definition instead of the name used.", "Chasing 100% coverage instead of meaningful failures.", "Logging secrets, swallowing exceptions, and using print as observability."], exercises: ["Recover a detached HEAD and a lost commit with reflog.", "Use Hypothesis to find a real edge case.", "Turn a single-file script into a typed, tested package.", "Instrument a multi-layer service with correlation IDs."], materials: "Pro Git · pytest and Hypothesis docs · Architecture Patterns with Python · Missing Semester" },
  { id: "algorithms", number: "03", title: "Data structures & algorithms", summary: "Solve from constraints, state complexity before coding, and revisit problems until the pattern is durable.", topics: ["Complexity analysis", "Arrays & hashing", "Two pointers & sliding window", "Stacks & queues", "Binary search", "Linked lists", "Trees", "Heaps", "Graphs", "Backtracking", "Dynamic programming", "Greedy, intervals & math", "Sorting & searching internals"], competencies: ["State time and space complexity before implementation.", "Recognize the target pattern from constraints.", "Implement and explain canonical structures rather than memorizing answers."], traps: ["Using a list for repeated membership checks.", "Missing boundary cases in windows and binary search.", "Recursion depth, duplicate states, and hidden quadratic work."], exercises: ["Implement an open-addressing hash table with resize.", "Build an LRU cache with a doubly-linked list.", "Solve canonical array, graph, tree, heap, and DP problems with spaced revisits."], materials: "NeetCode patterns · CLRS selected chapters · CPython complexity notes" },
  { id: "systems", number: "04", title: "Systems", summary: "Understand the machine and network underneath AI applications so you can make reliable trade-offs instead of treating infrastructure as magic.", topics: ["Operating systems", "Networking", "Distributed systems"], competencies: ["Explain processes, memory, files, scheduling, and system calls.", "Trace an HTTP request, design reliable retries, and understand TLS.", "Reason about partial failure, consistency, replication, and idempotency."], traps: ["Confusing a process with a thread or a coroutine.", "Retry storms, missing timeouts, and assuming exactly-once delivery.", "Quoting CAP theorem without naming the failure model."], exercises: ["Inspect a running process and diagnose memory or file-descriptor pressure.", "Build an HTTP client with timeouts, backoff, and idempotency keys.", "Design a queue-backed service and document its consistency guarantees."], materials: "OSTEP · Computer Networking: A Top-Down Approach · Designing Data-Intensive Applications" },
  { id: "databases", number: "05", title: "Databases", summary: "Model data for change, write analytical SQL, understand indexes and transactions, and choose storage by access pattern.", topics: ["Relational modelling & SQL", "Database internals", "Beyond relational"], competencies: ["Design schemas that survive requirement changes.", "Write joins, window functions, cohorts, funnels, and sessionization queries.", "Read query plans and choose relational, document, key-value, search, or analytical stores deliberately."], traps: ["NULL and three-valued logic silently changing query results.", "Row explosions from duplicate join keys.", "Indexes with low selectivity, replication lag, and cache invalidation."], exercises: ["Model eight related entities and write 25 analytical queries.", "Rewrite and benchmark a slow query using EXPLAIN.", "Compare cache-aside, write-through, and search-index designs."], materials: "CMU 15-445 · Database Internals · PostgreSQL docs · DDIA" },
  { id: "math", number: "06", title: "Mathematics", summary: "Read a paper's method section, debug a model by reasoning about shapes and gradients, and connect equations to implementation.", topics: ["Linear algebra", "Calculus & optimization", "Probability & statistics"], competencies: ["Track matrix and tensor shapes through a computation.", "Explain backpropagation as the chain rule and choose an optimizer knowingly.", "Use probability, estimation, experimentation, and information theory to evaluate systems."], traps: ["Element-wise operations mistaken for matrix composition.", "Unstable softmax, poor scaling, and confusing correlation with causation.", "p-values treated as the probability a hypothesis is true."], exercises: ["Implement matrix multiplication, SVD/PCA, and a low-rank approximation.", "Build gradient descent, Adam, and a tiny reverse-mode autodiff engine.", "Run an A/B test with power analysis and compute entropy, cross-entropy, and KL."], materials: "Mathematics for Machine Learning · 3Blue1Brown · Strang · Statistical Rethinking" },
  { id: "data", number: "07", title: "Data handling", summary: "Build numerically stable, memory-aware, validated data workflows that can move from exploration to production.", topics: ["Numerical computing with NumPy", "Dataframes", "Cleaning & exploratory analysis", "Visualization", "Pipelines & scale"], competencies: ["Reason about shapes, broadcasting, views, dtypes, and numerical stability.", "Use pandas, Polars, SQL, and Arrow appropriately.", "Document cleaning decisions, validate contracts, and build idempotent pipelines."], traps: ["Silent copies, chained assignment, and object-dtype memory blowups.", "Imputing missing data without understanding MCAR, MAR, or MNAR.", "CSV in production, non-idempotent reruns, and misleading charts."], exercises: ["Implement stable softmax, cross-entropy, and layer norm in NumPy.", "Rewrite a pandas workflow in Polars and benchmark it.", "Clean a messy dataset with a written decision log and validation suite.", "Convert a large CSV workflow to partitioned Parquet and measure the result."], materials: "NumPy docs · Python for Data Analysis · Polars · Fundamentals of Data Engineering · Spark" }
];

function makeAdvancedSection(id, part, number, title, topics, summary, materials) {
  return {
    id, part, number, title, topics, summary,
    competencies: ["Explain the core mechanism and assumptions in your own words.", "Implement or evaluate the pattern on a controlled example.", "Name the failure modes, trade-offs, and production decision it affects."],
    traps: ["Using the technique without checking its assumptions.", "Reporting a result without a baseline, edge cases, or reproducible evidence.", "Optimising a local metric while making the user or system outcome worse."],
    exercises: topics.slice(0, 4).map((topic) => "Build a worked implementation or evaluation for " + topic + " and defend the trade-offs."),
    materials
  };
}

const advancedCurriculum = [
  makeAdvancedSection("ml-classical", "PART II · MACHINE LEARNING", "08", "Classical machine learning", ["Framing the problem", "Supervised learning", "Unsupervised learning", "Evaluation", "Feature engineering", "Interpretability"], "Turn a vague business request into a measurable prediction or discovery problem, then build an honest baseline.", "Hands-On Machine Learning · ISLR · scikit-learn user guide"),
  makeAdvancedSection("ml-deep", "PART II · MACHINE LEARNING", "09", "Deep learning", ["Neural network fundamentals", "Training dynamics", "PyTorch", "Architectures", "Transfer learning", "Scaling & distributed training"], "Build neural networks from first principles, train them reliably, and understand the memory and compute behind modern models.", "Deep Learning · Dive into Deep Learning · PyTorch docs"),
  makeAdvancedSection("ml-nlp", "PART II · MACHINE LEARNING", "10", "NLP before transformers", ["Text processing", "Statistical language models", "Word representations", "Sequence tasks & models", "Evaluation"], "Understand the representations and sequence models that made modern language systems possible.", "Jurafsky & Martin · Speech and Language Processing · Gensim and spaCy docs"),
  makeAdvancedSection("llm-transformer", "PART III · TRANSFORMERS & LLMs", "11", "The transformer", ["Attention", "The transformer block & architecture", "Positional information", "Attention variants & efficiency"], "Implement the transformer rather than treating it as a black box: shapes, residuals, normalization, position, and memory.", "Attention Is All You Need · annotated transformer · FlashAttention"),
  makeAdvancedSection("llm-tokenization", "PART III · TRANSFORMERS & LLMs", "12", "Tokenization", ["Tokenization"], "Understand how text becomes token IDs, why tokenization changes cost and capability, and how budgets fail at boundaries.", "BPE paper · tokenizer implementations · model tokenizer documentation"),
  makeAdvancedSection("llm-scale", "PART III · TRANSFORMERS & LLMs", "13", "Language models at scale", ["Pretraining", "The model landscape", "Capabilities & limits"], "Connect data, compute, scaling laws, model cards, benchmarks, and reproducible failure analysis.", "Chinchilla · model cards · HELM and benchmark methodology"),
  makeAdvancedSection("llm-adapting", "PART III · TRANSFORMERS & LLMs", "14", "Adapting models", ["The decision framework", "Fine-tuning", "Alignment", "Compression"], "Choose between prompting, retrieval, fine-tuning, preference optimisation, distillation, quantization, and cascades.", "LoRA · DPO · QLoRA · model compression literature"),
  makeAdvancedSection("llm-inference", "PART III · TRANSFORMERS & LLMs", "15", "Inference", ["The mechanics", "Serving"], "Reason about KV cache, sampling, batching, throughput, latency, memory arithmetic, and the economics of serving.", "vLLM docs · PagedAttention · inference systems papers"),
  makeAdvancedSection("ai-models", "PART IV · AI ENGINEERING", "16", "Working with models", ["APIs & integration", "Structured output", "Prompt engineering"], "Build reliable model boundaries with streaming, retries, schemas, validation, versioned prompts, and cost ceilings.", "Provider API docs · Pydantic · prompt evaluation patterns"),
  makeAdvancedSection("ai-rag", "PART IV · AI ENGINEERING", "17", "Retrieval & RAG", ["Embeddings", "Chunking & ingestion", "Indexing & search", "Query handling & generation", "Advanced patterns"], "Build retrieval from first principles, measure recall and faithfulness, then add hybrid search, permissions, and multi-turn handling.", "RAG papers · BM25 · vector database docs · retrieval evaluation"),
  makeAdvancedSection("ai-agents", "PART IV · AI ENGINEERING", "18", "Agents", ["Foundations", "Tools", "Planning & reasoning", "Memory", "Multi-agent", "Reliability"], "Build controlled tool-using loops with explicit state, budgets, retries, termination, memory, and trajectory evaluation.", "ReAct · tool-use papers · agent framework docs"),
  makeAdvancedSection("ai-evaluation", "PART IV · AI ENGINEERING", "19", "Evaluation", ["Foundations", "Datasets", "Methods", "System-specific evaluation", "Operationalizing"], "Create eval sets, metrics, judges, regression gates, and a flywheel that turns production failures into learning.", "LLM-as-judge research · RAG metrics · experiment design"),
  makeAdvancedSection("ai-safety", "PART IV · AI ENGINEERING", "20", "Safety & guardrails", ["Adversarial input", "Guardrails", "Privacy, ethics & governance"], "Threat-model model applications, layer controls, measure false positives and negatives, and protect privacy and agency.", "OWASP LLM guidance · NIST AI RMF · privacy and safety case studies"),
  makeAdvancedSection("prod-serving", "PART V · PRODUCTION", "21", "Serving & deployment", ["Building the service", "Containers & infrastructure"], "Ship a streaming, observable service with timeouts, circuit breakers, fallbacks, health checks, autoscaling, and graceful shutdown.", "FastAPI · Docker · Kubernetes · cloud deployment documentation"),
  makeAdvancedSection("prod-mlops", "PART V · PRODUCTION", "22", "MLOps", ["Experiment tracking & reproducibility", "Versioning", "Pipelines & CI/CD", "Data & model operations"], "Make experiments reproducible and releases reversible by versioning data, code, prompts, models, and evals together.", "MLflow · DVC · CI/CD docs · feature and model stores"),
  makeAdvancedSection("prod-observability", "PART V · PRODUCTION", "23", "Observability & cost", ["Observability", "Cost engineering"], "Trace every stage, attribute cost, measure latency and quality, and build budgets and caches that do not hide incorrect answers.", "OpenTelemetry · Prometheus · cost attribution patterns"),
  makeAdvancedSection("prod-design", "PART V · PRODUCTION", "24", "System design for AI", ["Method", "The reference architecture", "Canonical problems", "Classical ML system design"], "Whiteboard AI systems with explicit scale numbers, bottlenecks, failure modes, cost, and ownership.", "DDIA · system design interviews · production architecture reviews"),
  makeAdvancedSection("optional-vision", "PART VI · OPTIONAL DEPTH", "A", "Computer vision", ["Image formation & representations", "CNNs and vision transformers", "Detection and segmentation", "Vision evaluation"], "Extend the engineering toolkit to image representation, spatial inductive bias, multimodal inputs, and honest visual evaluation.", "CS231n · vision transformer papers · torchvision"),
  makeAdvancedSection("optional-speech", "PART VI · OPTIONAL DEPTH", "B", "Speech & audio", ["Audio signals", "Speech recognition", "Speech synthesis", "Audio evaluation"], "Work with waveforms, spectrograms, recognition, synthesis, latency, and noisy real-world audio.", "Speech and Signal Processing texts · Whisper · audio model docs"),
  makeAdvancedSection("optional-multimodal", "PART VI · OPTIONAL DEPTH", "C", "Multimodal", ["Vision-language models", "Document intelligence", "Multimodal agents"], "Combine text, image, document, and tool signals into systems with explicit grounding and evaluation.", "Multimodal model papers · document AI references"),
  makeAdvancedSection("optional-rl", "PART VI · OPTIONAL DEPTH", "D", "Reinforcement learning", ["MDPs and value functions", "Policy optimisation", "Offline and preference learning"], "Reason about sequential decisions, reward design, exploration, and the safety risks of learning from feedback.", "Sutton & Barto · policy optimisation papers"),
  makeAdvancedSection("optional-recommenders", "PART VI · OPTIONAL DEPTH", "E", "Recommender systems", ["Candidate generation", "Ranking", "Exploration and experimentation"], "Design recommenders that balance relevance, novelty, diversity, feedback loops, and business outcomes.", "Recommender systems literature · experimentation references"),
  makeAdvancedSection("optional-graph", "PART VI · OPTIONAL DEPTH", "F", "Graph machine learning", ["Graph representations", "Message passing", "Graph retrieval and evaluation"], "Model relational structure and understand where graph assumptions help or fail.", "Graph neural network papers · network science references"),
  makeAdvancedSection("optional-timeseries", "PART VI · OPTIONAL DEPTH", "G", "Time series & forecasting", ["Temporal validation", "Forecasting models", "Uncertainty and drift"], "Build forecasts without leakage, compare baselines, and communicate uncertainty under drift.", "Forecasting texts · temporal cross-validation references"),
  makeAdvancedSection("optional-performance", "PART VI · OPTIONAL DEPTH", "H", "Performance engineering", ["Profiling", "Memory and kernels", "Serving efficiency"], "Find the real bottleneck, reason about hardware, and improve throughput without sacrificing correctness.", "High Performance Python · systems profiling docs")
];
foundationsCurriculum.push(...advancedCurriculum);

const topicLabs = [
  ["python", "Language core", "Predict a short Python program's output, then explain identity, equality, truthiness, default arguments, closures, exceptions, and imports.", "Write a one-page reasoning note for three snippets: a mutable default, a late-bound closure, and a try/except/else/finally flow. State the output before running it.", "A prediction table with output, memory/identity reasoning, and one corrected implementation."],
  ["python", "Data structures in practice", "Choose lists, dictionaries, sets, tuples, deque, Counter, heapq, or itertools from the access pattern and complexity—not habit.", "Take a slow membership-counting script and replace the right structure. Include expected complexity for lookup, insertion, and iteration.", "A before/after benchmark and a short structure-selection decision record."],
  ["python", "Object-oriented Python", "Use the data model, composition, dataclasses, protocols, and descriptors to model behaviour without building an inheritance maze.", "Design a Vector or Dataset class supporting repr, equality, length, indexing, iteration, and validation. Explain why composition is preferable where it is.", "A small tested class plus a class-design note covering data model methods."],
  ["python", "Concurrency & performance", "Choose async, threads, or processes from whether work is I/O-bound or CPU-bound, then profile before changing code.", "Run the same I/O workload sequentially, with a thread pool, and with asyncio. Record timings, bottlenecks, cancellation behaviour, and the GIL implication.", "A reproducible benchmark with a written recommendation and evidence."],
  ["engineering", "Version control", "Reason in Git objects, refs, staging, branches, merges, rebases, reflog, and recovery instead of deleting and recloning.", "Create a detached HEAD, a bad merge, and a lost commit in a scratch repository. Recover each with reflog, reset, revert, or cherry-pick and document the state transitions.", "A recovery runbook with command output and a reviewable commit history."],
  ["engineering", "Testing", "Design tests that are fast, isolated, repeatable, self-validating, and strong enough to catch a deliberately introduced bug.", "Write unit, integration, property-based, and nondeterministic-LLM tests for one small service. Explain what is real, fake, mocked, or asserted as a property.", "A pytest-style test matrix with one mutation that the suite catches."],
  ["engineering", "Code quality & architecture", "Separate domain logic from I/O, refactor behind tests, and choose patterns only when they clarify change.", "Refactor a single-file script into a typed src package with configuration, service, adapter, and test layers. Record each safe refactoring step.", "A package layout, dependency diagram, and before/after design note."],
  ["engineering", "Tooling & debugging", "Use the shell, debugger, traceback, structured logs, profiling, and correlation IDs to find causes rather than guessing.", "Diagnose a seeded failure without adding print statements. Capture the traceback, breakpoint observations, structured log fields, and the minimal fix.", "A reproducible incident note with root cause and regression test."],
  ["algorithms", "Complexity analysis", "State tight time and space bounds, amortized costs, recursion stack, and the target complexity implied by constraints.", "Annotate five functions and rewrite one after identifying its hidden quadratic loop. Predict performance from input constraints before benchmarking.", "A complexity worksheet and a benchmark that validates the prediction."],
  ["algorithms", "Arrays & hashing", "Use traversal, prefix sums, frequency maps, grouping, and set membership to turn repeated search into linear work.", "Solve Two Sum, Group Anagrams, and Subarray Sum Equals K. For each, explain the invariant and the memory trade-off.", "Three tested solutions with complexity annotations and edge-case tables."],
  ["algorithms", "Two pointers & sliding window", "Maintain a window invariant while inputs move monotonically; know when sorting is allowed and when it changes the problem.", "Solve a longest-substring or minimum-window problem. Trace the left/right pointers on a duplicate-heavy input.", "A pointer trace, invariant statement, and tested implementation."],
  ["algorithms", "Stacks & queues", "Use LIFO/FIFO structure for parsing, monotonic stacks, breadth-first search, and producer-consumer workflows.", "Build a min-stack and a queue-backed breadth-first traversal. Include underflow and empty-input behaviour.", "Two implementations with operation complexity and tests."],
  ["algorithms", "Binary search", "Define the search space, invariant, and boundary update precisely; binary search is a proof, not a memorised loop.", "Implement lower_bound and a rotated-array search. Trace the invariant at every iteration, including no-match cases.", "A boundary table and tests for duplicates, empty input, and extremes."],
  ["algorithms", "Linked lists", "Reason about pointers, mutation, ownership, and constant-space techniques such as fast/slow traversal.", "Implement reverse, cycle detection, and merge-two-sorted-lists. Draw the pointer state before and after each mutation.", "Pointer diagrams, implementations, and mutation-safety tests."],
  ["algorithms", "Trees", "Use recursive structure, depth/height invariants, traversal order, and explicit stack alternatives.", "Implement preorder, inorder, level-order, and lowest-common-ancestor for a binary tree.", "Traversal traces and a tested tree utility module."],
  ["algorithms", "Heaps", "Use heap invariants for priority queues, top-k selection, streaming medians, and scheduling.", "Build a task scheduler with tie-breaking and a top-k stream. Explain why a heap beats sorting every update.", "A priority-queue implementation with complexity and fairness notes."],
  ["algorithms", "Graphs", "Model relationships, choose adjacency structures, and distinguish BFS, DFS, shortest paths, and topological order.", "Build a dependency resolver that detects cycles and returns a valid order when one exists.", "A graph model, cycle trace, and tests for disconnected and cyclic inputs."],
  ["algorithms", "Backtracking", "Explore a state space with a choice, constraint, recurse, and undo discipline; prune only with a justified rule.", "Generate valid permutations or combinations and instrument how pruning changes the search tree.", "A search-tree sketch and implementation with duplicate handling."],
  ["algorithms", "Dynamic programming", "Identify state, transition, base case, evaluation order, and whether memoization or tabulation fits.", "Solve one sequence and one grid problem top-down and bottom-up. Compare memory compression options.", "State-transition diagrams and two equivalent implementations."],
  ["algorithms", "Greedy, intervals & math", "Prove when a local choice is safe, sort interval endpoints deliberately, and use mathematical invariants when they simplify code.", "Schedule non-overlapping intervals and defend the greedy exchange argument against a counterexample.", "A proof sketch, counterexample search, and tested scheduler."],
  ["algorithms", "Sorting & searching internals", "Know stability, comparison lower bounds, Timsort intuition, partitioning, and when external or counting methods apply.", "Compare three sorting strategies on nearly sorted, random, and adversarial data. Explain stability and memory.", "A benchmark report with data-shape recommendations."],
  ["systems", "Operating systems", "Explain processes, virtual memory, file descriptors, scheduling, system calls, signals, and resource limits.", "Inspect a running process, open files, memory footprint, and child process. Diagnose a seeded resource leak.", "A process/resource incident report with commands and findings."],
  ["systems", "Networking", "Trace DNS, TCP, TLS, HTTP, timeouts, retries, connection pools, and backpressure through a real request.", "Build a resilient HTTP client with timeouts, exponential backoff, idempotency keys, and structured request logs.", "A request trace, failure matrix, and client design note."],
  ["systems", "Distributed systems", "Reason about partial failure, consistency, replication, queues, delivery semantics, idempotency, and graceful degradation.", "Design a queue-backed service and decide its delivery guarantee, retry policy, deduplication key, and recovery path.", "A sequence diagram and failure-mode decision record."],
  ["databases", "Relational modelling & SQL", "Model entities, constraints, cardinality, normalization, NULL semantics, joins, windows, cohorts, funnels, and migrations.", "Model a support-learning domain with at least eight entities and write analytical queries for retention, funnel conversion, and top-N per group.", "An ERD, schema migration, and query workbook."],
  ["databases", "Database internals", "Understand pages, buffer pools, B+ trees, LSMs, query plans, joins, ACID, isolation, MVCC, WAL, and vacuum.", "Take a slow query, inspect EXPLAIN, propose indexes, then explain write amplification and transaction anomalies.", "Before/after query plans and a transaction anomaly reproduction."],
  ["databases", "Beyond relational", "Choose Redis, document, wide-column, analytical, graph, or search storage by access pattern and operational cost.", "Design a document retrieval system with a primary store, cache, search index, TTL policy, and consistency decision.", "A polyglot persistence diagram with cost and failure trade-offs."],
  ["math", "Linear algebra", "Track shapes, dot products, projections, norms, eigenvectors, SVD, PCA, tensors, and matrix calculus through model code.", "Implement matrix multiplication and a low-rank image approximation. Explain how the same idea motivates parameter-efficient adaptation.", "A shape worksheet, numerical implementation, and reconstruction plot."],
  ["math", "Calculus & optimization", "Connect derivatives, gradients, Hessians, chain rule, backpropagation, optimization trajectories, and automatic differentiation.", "Implement gradient descent, momentum, and Adam on a non-convex function, then build a tiny reverse-mode autodiff engine.", "Trajectory plots, gradient checks, and optimizer trade-offs."],
  ["math", "Probability & statistics", "Use Bayes, distributions, expectation, MLE, uncertainty, experiments, causality, entropy, cross-entropy, and KL correctly.", "Run an A/B test with power analysis, demonstrate peeking, and compute entropy and KL for two small distributions.", "An experiment report with assumptions, uncertainty, and practical significance."],
  ["data", "Numerical computing with NumPy", "Reason about shape, dtype, strides, views, broadcasting, vectorization, einsum, and numerical stability.", "Implement stable softmax, cross-entropy, and layer norm. Benchmark vectorized and loop versions and expose overflow in the naive code.", "A benchmark notebook and a numerical-stability note."],
  ["data", "Dataframes", "Use pandas/Polars indexing, joins, groupby, reshaping, time series, memory profiling, Arrow, and Parquet deliberately.", "Rewrite a pandas pipeline in Polars, validate row counts after joins, and measure memory and speed on a larger fixture.", "A correctness comparison and performance report."],
  ["data", "Cleaning & exploratory analysis", "Treat missingness, outliers, duplicates, schema violations, leakage, drift, and provenance as first-class engineering concerns.", "Clean a deliberately messy dataset, record every decision, and build validation checks that catch the original defects.", "A data-quality decision log and executable validation suite."],
  ["data", "Visualization", "Select honest charts, show uncertainty, use colour accessibly, and avoid axis or annotation choices that mislead.", "Answer one stakeholder question with a distribution, comparison, relationship, and trend view. Defend the final chart choice.", "A decision-ready figure and a critique of two misleading alternatives."],
  ["data", "Pipelines & scale", "Design idempotent batch/streaming pipelines with partitioning, watermarks, retries, backfills, file formats, orchestration, and data contracts.", "Convert a large CSV workflow to partitioned Parquet, rerun it safely for a date range, and document the contract between producer and consumer.", "A pipeline DAG, rerun test, and storage/query benchmark."]
].map(([section, title, theory, lab, deliverable]) => ({
  id: section + "-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"), section, title, theory, lab, deliverable,
  minimum: 80
}));

advancedCurriculum.forEach((section) => {
  section.topics.forEach((title) => {
    topicLabs.push({
      id: section.id + "-" + title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      section: section.id,
      title,
      theory: "Study " + title + " as part of " + section.title + ". Explain the mechanism, assumptions, shapes or interfaces, and how it changes an AI engineering decision. Connect the idea to a concrete failure mode rather than memorising a definition.",
      lab: "Build a focused notebook, implementation, experiment, or design review for " + title + ". Start with a baseline, record the inputs and constraints, then compare the result against one alternative.",
      deliverable: "A reproducible artifact with a short explanation, one edge case, one trade-off, and evidence a reviewer can inspect.",
      minimum: 100
    });
  });
});

const topicLabByKey = new Map(topicLabs.map((topic) => [topic.section + "::" + topic.title, topic]));

// Theory is deliberately separate from the assessment questions. Learners get
// an explanation, vocabulary, a worked mental model, and a business bridge
// before they are asked to prove anything with code.
const theoryGuides = {
  2: { title: "Functions: name a repeatable decision", explanation: "A function is a contract: it accepts inputs, transforms them, and returns a result without exposing every internal step. In AI systems, preprocessing, scoring, retrieval, and evaluation are all composed from small functions.", points: ["Parameters are the input contract.", "return gives a value back; print only displays it.", "A good function is deterministic, testable, and named for its job."], terms: "parameter · argument · return value · side effect", business: "A support team can change a scoring rule in one tested function instead of editing every workflow.", reflection: "Where would a reusable function prevent duplicated business logic?" },
  3: { title: "Lists: represent a collection", explanation: "Lists preserve an ordered collection of values. Data pipelines use the same idea for rows, tokens, retrieved documents, and evaluation cases. The edge cases—empty, one item, duplicates, and negative values—are part of the contract.", points: ["Indexing starts at zero.", "len measures collection size; sum aggregates numeric values.", "Empty input should have an intentional result."], terms: "list · index · iterable · aggregation", business: "A reporting pipeline that handles an empty day gracefully is more trustworthy than one that crashes at month end.", reflection: "Which edge case would a stakeholder notice first?" },
  4: { title: "Configuration: separate policy from code", explanation: "Configuration turns changeable policy into data. A learning rate, model name, timeout, or privacy flag should be read from a validated configuration rather than scattered as magic numbers through the code.", points: ["Nested dictionaries mirror JSON documents.", "Hardcoding can pass one demo and fail the next deployment.", "Configuration needs validation and a safe default."], terms: "JSON · key · schema · environment", business: "Operations can change a model endpoint or budget without asking an engineer to rewrite application logic.", reflection: "Which value in an AI product should never be hardcoded?" },
  5: { title: "Engineering history: make work reproducible", explanation: "A learning log is a miniature version of professional engineering practice. Record what changed, why it changed, and what evidence supports it. Reproducibility lets another person debug, review, and improve the work.", points: ["Small commits make cause and effect visible.", "A test result is stronger evidence than a screenshot.", "Logs should capture context without leaking secrets."], terms: "commit · test case · reproducibility · provenance", business: "A regulated team can explain which data and code produced a model decision.", reflection: "What evidence would help you trust a colleague's result?" },
  6: { title: "Checkpoint thinking: transfer, do not memorize", explanation: "A checkpoint tests whether a concept transfers to new inputs. The threshold exercise combines aggregation and comparison—the same pattern used in risk gates, quality checks, and business eligibility rules.", points: ["Boundaries deserve explicit tests.", "A Boolean is a decision, not an explanation.", "A checkpoint should expose misconceptions without giving away the answer."], terms: "threshold · boundary case · Boolean · transfer", business: "A lender, support queue, or release process can encode a transparent eligibility rule and audit it.", reflection: "What evidence would convince you that a rule generalizes?" },
  7: { title: "LLMs: choose capability against constraints", explanation: "A language model predicts the next token from context; it does not automatically know whether a response is true, private, affordable, or appropriate. Model choice therefore begins with the task and constraints, not the brand name.", points: ["Token limits affect context and cost.", "Latency, quality, privacy, and price trade off.", "A model card and an evaluation set inform selection."], terms: "token · context window · inference · model card", business: "A customer-support product may choose a smaller private model for routine cases and escalate complex cases to a stronger one.", reflection: "Which constraint is non-negotiable for your use case?" },
  8: { title: "Evaluation: turn quality into evidence", explanation: "Evaluation is a repeatable measurement process. Build representative cases, define expected outcomes, and inspect failures by category. A single impressive response is not a reliable quality signal.", points: ["Hold out cases that were not used to tune the prompt.", "Track both average quality and severe failures.", "A metric must map to a user or business outcome."], terms: "evaluation set · baseline · metric · regression", business: "A product manager can decide whether an assistant saves time only when quality and workflow impact are measured together.", reflection: "What would count as a severe failure in your domain?" },
  9: { title: "RAG: retrieve evidence before generation", explanation: "Retrieval-augmented generation separates finding relevant evidence from composing an answer. The retriever selects context; the generator uses it. You can evaluate each stage instead of treating the model as a black box.", points: ["Chunking affects what can be retrieved.", "Ranking determines which evidence reaches the prompt.", "Citations and faithfulness checks reduce unsupported claims."], terms: "embedding · chunk · retriever · grounding", business: "An HR assistant should answer from the current policy repository, not from outdated model memory.", reflection: "What source should your assistant refuse to answer without?" },
  10: { title: "RAG safety: define a relevance gate", explanation: "A relevance threshold creates a refusal path when retrieved context is weak. The threshold is a product decision that must be tuned against false refusals and unsupported answers.", points: ["Boundary values need tests.", "High recall finds more candidates; precision keeps noise out.", "A refusal should explain what evidence is missing."], terms: "relevance · precision · recall · refusal", business: "It is safer to route an ambiguous customer request to a human than to confidently cite the wrong policy.", reflection: "When is a refusal better than a plausible answer?" },
  11: { title: "Fine-tuning: teach behaviour with data", explanation: "Fine-tuning changes model behaviour through examples. It is not a substitute for retrieval, a safety policy, or evaluation. The examples must represent the task, desired style, and edge cases you care about.", points: ["Labels and instructions need consistent definitions.", "Data leakage makes evaluation look better than reality.", "A smaller clean set can beat a larger noisy set."], terms: "fine-tuning · label · leakage · representative data", business: "A classification model can learn a team's consistent triage labels only when those labels are defined and reviewed.", reflection: "What label disagreement would reveal a product ambiguity?" },
  12: { title: "Alignment: guard the operating range", explanation: "Alignment includes practical controls around model behaviour: input validation, output constraints, monitoring, and escalation. A cap is a tiny example of a larger safety invariant.", points: ["Bounds make unsafe states unreachable.", "Guardrails should fail visibly, not silently.", "Controls need adversarial and normal-case tests."], terms: "guardrail · invariant · validation · escalation", business: "A finance assistant should reject unsupported transaction values rather than silently normalising them.", reflection: "What is the safest failure mode for your system?" },
  13: { title: "Agents: actions need an explicit policy", explanation: "An agent loops over planning, tool use, observation, and a decision to continue. The useful abstraction is not autonomy; it is a controlled policy that makes actions observable and reviewable.", points: ["Tools have typed inputs and bounded effects.", "The planner should state why it selected a tool.", "Observations become evidence for the next step."], terms: "tool call · planner · observation · policy", business: "A claims workflow can read a document, query a policy database, and ask for human review without granting the model unrestricted access.", reflection: "Which tool should always require confirmation?" },
  14: { title: "Agents: budgets prevent runaway behaviour", explanation: "Every agent needs limits on steps, time, tokens, money, and permissions. A budget is both a technical control and a business promise about predictable operation.", points: ["Set a maximum before the loop begins.", "Stop with an inspectable reason when it is exceeded.", "Measure budget consumption as part of evaluation."], terms: "budget · timeout · permission · circuit breaker", business: "A procurement agent must stop before it can place orders or spend beyond an approved amount.", reflection: "What should happen when the agent reaches its limit?" },
  15: { title: "Deployment: make cost and reliability visible", explanation: "Production AI is an operating system, not a notebook. Track latency, error rate, quality, cost per task, and user impact. Service-level objectives turn vague promises into measurable targets.", points: ["A baseline gives you a comparison point.", "Cost is a function of traffic, tokens, retries, and infrastructure.", "Observability makes regressions diagnosable."], terms: "SLO · latency · error budget · observability", business: "A business can choose a slower high-quality path for high-value cases and a cheaper path for routine work.", reflection: "Which metric would trigger a rollback?" },
  16: { title: "Release readiness: quality and safety are conjunctive", explanation: "A release is ready only when the quality evidence and safety review both pass. This is a deliberately simple AND gate for a much larger launch checklist: evaluation, privacy, security, monitoring, rollback, and ownership.", points: ["One strong demo cannot compensate for an unsafe failure.", "Release criteria should be written before the launch.", "Rollback is part of the design, not an admission of defeat."], terms: "release gate · rollback · safety review · sign-off", business: "A hospital assistant should not ship because it is accurate if its access controls and escalation path are untested.", reflection: "Who owns the decision to pause a release?" }
};

// The learning path is derived from the same curriculum records used by the
// syllabus browser. This prevents the two views from slowly drifting apart as
// new programme parts are added.
const partDefinitions = [
  { key: "PART I · FOUNDATIONS", code: "I", title: "Foundations & core engineering", summary: "Python, software engineering, algorithms, systems, databases, mathematics, and data handling." },
  { key: "PART II · MACHINE LEARNING", code: "II", title: "Machine learning", summary: "Classical ML, deep learning, and the NLP foundations that lead into modern language models." },
  { key: "PART III · TRANSFORMERS & LLMs", code: "III", title: "Transformers & LLMs", summary: "Attention, tokenization, scaling, adaptation, and efficient inference." },
  { key: "PART IV · AI ENGINEERING", code: "IV", title: "AI engineering", summary: "Model integration, retrieval, agents, evaluation, safety, and guardrails." },
  { key: "PART V · PRODUCTION", code: "V", title: "Production", summary: "Serving, MLOps, observability, cost engineering, and AI system design." },
  { key: "PART VI · OPTIONAL DEPTH", code: "VI", title: "Optional depth", summary: "Computer vision, speech, multimodal systems, reinforcement learning, recommenders, graphs, forecasting, and performance." }
];

const modules = partDefinitions.map((part, index) => {
  const sections = foundationsCurriculum.filter((section) => (section.part || "PART I · FOUNDATIONS").toLowerCase() === part.key.toLowerCase());
  const topicLabIds = sections.flatMap((section) => section.topics.map((topic) => section.id + "-" + topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")));
  return {
    code: String(index).padStart(2, "0"),
    partCode: part.code,
    partLabel: part.key,
    title: part.title,
    status: index === 0 ? "IN PROGRESS" : "LOCKED",
    meta: sections.length + " sections · " + topicLabIds.length + " topic labs",
    summary: part.summary,
    unlocked: index === 0,
    lessonIds: index === 0 ? [1, 2, 3, 4, 5, 6] : [],
    sectionIds: sections.map((section) => section.id),
    topicLabIds,
    unlockAfter: index === 0 ? 0 : null
  };
});

const projectMilestones = [
  "Set up the project, its folder layout and a first commit.",
  "Record a practice session and write it to a file.",
  "Calculate streaks from the stored sessions.",
  "Export a weekly review and cover it with tests."
];

const businessCase = {
  title: "Business case: a support-learning loop",
  brief: "A support team wants to reduce repeat questions without sending confidential tickets to an unapproved model. Design a small learning log and explain how you would measure usefulness, privacy, cost and escalation.",
  prompts: [
    "What user problem is being solved, and what is explicitly out of scope?",
    "Which evidence would make you ship, pause, or roll back the assistant?",
    "Where should a human review or refusal path appear?"
  ]
};

let selectedModule = 0;

function save() {
  try {
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn("Orbit: progress could not be saved on this device.", error);
  }
}

// Numbers of the lessons that actually have content, in order.
function lessonNumbers() {
  return Object.keys(lessonContent).map(Number).sort((a, b) => a - b);
}

function moduleForLesson(number) {
  return modules.find((module) => module.lessonIds.includes(Number(number))) || modules[0];
}

function moduleStats(module) {
  if (!module) return { done: 0, total: 0, percent: 0, codingDone: 0, topicDone: 0 };
  const codingDone = module.lessonIds.filter((number) => number <= state.lessons).length;
  const topicDone = module.topicLabIds.filter((id) => state.topicProgress[id]).length;
  const total = module.lessonIds.length + module.topicLabIds.length;
  const done = codingDone + topicDone;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0, codingDone, topicDone };
}

function isModuleUnlocked(module) {
  const index = modules.indexOf(module);
  if (!module || index < 0) return false;
  if (index === 0) return true;
  // Browsing the syllabus is always allowed; the gated path unlocks each
  // subsequent part after the preceding part's evidence is complete.
  return moduleStats(modules[index - 1]).percent === 100;
}

function modulePercent(module) {
  return moduleStats(module).percent;
}

function moduleStatus(module) {
  if (!isModuleUnlocked(module)) return "LOCKED";
  return modulePercent(module) === 100 ? "COMPLETE" : "IN PROGRESS";
}

// If the stored pointer names a lesson that does not exist, move it to the first
// lesson the learner has not finished. Landing past the last lesson is only
// legitimate once every available lesson is complete.
function repairLessonPointer() {
  if (lessonContent[state.currentLesson]) return;
  const pending = lessonNumbers().find((number) => number > state.lessons);
  if (pending) {
    state.currentLesson = pending;
    save();
  }
}

function updateProgress() {
  // No floor: the figure is the real fraction of lessons completed. It was
  // pinned at a minimum of 18% while the markup repeated "18%" in four places.
  const percent = Math.round((state.lessons / TOTAL_LESSONS) * 100);
  const firstStats = moduleStats(modules[0]);

  $("#mastery").innerHTML = percent + "<small>%</small>";
  $("#mastery-note").textContent = state.lessons >= TOTAL_LESSONS ? "All modules · path complete" : "All modules · " + state.lessons + " of " + TOTAL_LESSONS + " lessons";
  $("#roadmap-bar").style.width = firstStats.percent + "%";
  $("#roadmap-lessons").textContent = firstStats.done + " / " + firstStats.total + " checkpoints";
  $("#path-percent").textContent = firstStats.percent + "%";
  $("#path-status").textContent = moduleStatus(modules[0]).toLowerCase() + " · " + firstStats.done + " / " + firstStats.total + " checkpoints";
  $(".roadmap").style.setProperty("--road-progress", firstStats.percent + "%");
  $("#active-counter").innerHTML =
    String(state.lessons).padStart(2, "0") + " <small>/ " + String(TOTAL_LESSONS).padStart(2, "0") + "</small>";
  modules.forEach((module, index) => {
    const button = $(".path[data-module='" + index + "']");
    if (!button) return;
    const unlocked = isModuleUnlocked(module);
    const stats = moduleStats(module);
    const percentForModule = stats.percent;
    const code = button.querySelector("b");
    const title = button.querySelector("strong");
    if (code) code.textContent = module.code;
    if (title) title.textContent = module.title;
    button.classList.toggle("locked", !unlocked);
    button.querySelector("em").textContent = unlocked ? percentForModule + "%" : "⌑";
    const small = button.querySelector("small");
    if (small) small.textContent = unlocked ? moduleStatus(module).toLowerCase() + " · " + stats.done + " / " + stats.total + " checkpoints" : module.meta;
  });
  $$(".roadmap .road").forEach((card, index) => {
    const module = modules[index];
    if (!module) return;
    const stats = moduleStats(module);
    const unlocked = isModuleUnlocked(module);
    const heading = card.querySelector("h3");
    const label = card.querySelector("h3 i");
    const summary = card.querySelector("p");
    const marker = card.querySelector("b");
    if (marker) marker.textContent = module.code;
    if (heading) {
      heading.firstChild.textContent = module.title + " ";
      if (label) label.textContent = moduleStatus(module);
    }
    if (summary) summary.textContent = module.summary;
    card.classList.toggle("current", index === 0);
    card.classList.toggle("locked", !unlocked);
    const arrow = card.querySelector("button");
    if (arrow) arrow.setAttribute("aria-label", "Open " + module.title + " module");
    const mini = card.querySelector("small");
    if (mini) mini.textContent = unlocked ? stats.done + " / " + stats.total + " checkpoints" : module.meta;
  });
  const roadMore = $(".road-more");
  if (roadMore) roadMore.textContent = "+ " + Math.max(0, modules.length - 3) + " further syllabus parts mapped to your programme";
  $("#detail-bar").style.width = modulePercent(modules[selectedModule]) + "%";
  $("#detail-label").textContent = modulePercent(modules[selectedModule]) + "% complete";

  const done = clampMilestones(state.milestones);
  // Artifacts in progress, which is not the same number as milestones done.
  $("#portfolio-count").textContent = "01";
  $("#portfolio-note").textContent = done >= PROJECT_MILESTONES ? "Artifact complete" : "Artifact in progress";
  $("#portfolio-bar").style.width = (done / PROJECT_MILESTONES) * 100 + "%";
  $("#mini-bar").style.width = (done / PROJECT_MILESTONES) * 100 + "%";
  $("#milestone-label").textContent = done + " of " + PROJECT_MILESTONES + " milestones";
  $("#mini-milestones").textContent =
    "Artifact 01 · " + done + " " + (done === 1 ? "milestone" : "milestones") + " of " + PROJECT_MILESTONES;

  const projectTwo = $(".locked-project");
  if (projectTwo) {
    const unlocked = state.lessons >= 8;
    projectTwo.classList.toggle("unlocked-project", unlocked);
    const label = projectTwo.querySelector("label");
    const copy = projectTwo.querySelector("p");
    const note = projectTwo.querySelector("small");
    if (label) label.innerHTML = "PROJECT 02 <i>" + (unlocked ? "READY" : "LOCKED") + "</i>";
    if (copy) copy.textContent = unlocked ? "A document intelligence system with retrieval evidence, evaluation cases and an explicit refusal path." : "Unlocks after your foundations checkpoint. Your first bridge into the IIT RAG module.";
    if (note) note.textContent = unlocked ? "Brief ready · define the business metric" : "Complete Module 00 to unlock";
  }
}

function dayKey(date) {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-");
}

// The streak was the literal text "4 days" in the markup.
function updateStreak() {
  const today = dayKey(new Date());
  if (state.lastActiveDay !== today) {
    const yesterday = dayKey(new Date(Date.now() - 86400000));
    state.streak = state.lastActiveDay === yesterday ? (Number(state.streak) || 0) + 1 : 1;
    state.lastActiveDay = today;
    state.bestStreak = Math.max(Number(state.bestStreak) || 1, state.streak);
    save();
  }
  $("#streak-count").innerHTML = state.streak + " <small>" + (state.streak === 1 ? "day" : "days") + "</small>";
  $("#streak-note").textContent = "Best run: " + state.bestStreak + (state.bestStreak === 1 ? " day" : " days");
}

// The date line and the pulse counts were written into the markup by hand and
// would be wrong the day after they were typed.
function updateStandingContent() {
  const now = new Date();
  const date = now
    .toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
    .toUpperCase();
  const time = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  $("#today-line").innerHTML = date + ' <i aria-hidden="true">\u2022</i> ' + time;

  const pulseCount = $$("#pulse-list .pulse-card").length;
  $("#pulse-count").innerHTML = String(pulseCount).padStart(2, "0") + " <small>new</small>";
  const badge = $('.nav[data-view="pulse"] em');
  if (badge) badge.textContent = String(pulseCount);
}

function updateDashboard() {
  const data = lessonContent[state.currentLesson];
  if (!data) {
    $("#focus-title").textContent = "All mapped lessons complete";
    $("#focus-meta").textContent = "16 / 16 lessons · portfolio defence ready";
    $("#active-lesson-title").textContent = "Your foundation path is complete";
    $("#active-lesson-description").textContent = "Review your portfolio evidence, then use the business case prompts to explain the decisions behind your work.";
    return;
  }
  $("#focus-title").textContent = data.title;
  const module = moduleForLesson(state.currentLesson);
  $("#focus-meta").textContent = "Lesson " + state.currentLesson + " of " + TOTAL_LESSONS + " · " + module.title;
  $("#active-lesson-title").textContent = data.title;
  $("#active-lesson-description").textContent = data.lead;
}

function renderModuleRows() {
  const module = modules[selectedModule] || modules[0];
  const host = $("#module-lessons");
  host.textContent = "";

  // Keep the original executable foundation lessons visible, then show the
  // syllabus sections that make up this part. Every row opens the same topic
  // lab or lesson used elsewhere in the app.
  module.lessonIds.forEach((number) => {
    const data = lessonContent[number];
    const row = document.createElement("div");
    const isCurrent = number === state.currentLesson && Boolean(data);
    const isDone = number <= state.lessons && !isCurrent;
    row.className = "lesson-row" + (isDone ? " done" : isCurrent ? " now" : "");
    const marker = document.createElement("b");
    marker.textContent = isDone ? "✓" : String(number);
    const info = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = number + ". " + (data ? data.title : number === 1 ? "Your learning system" : "Lesson");
    const meta = document.createElement("small");
    meta.textContent = isDone ? "Complete" : isCurrent ? "Current · 25 min" : "Next · 25 min";
    info.append(title, meta);
    row.append(marker, info);
    if (isCurrent) {
      const start = document.createElement("button");
      start.className = "small";
      start.type = "button";
      start.dataset.openLesson = "";
      start.textContent = "Start";
      row.appendChild(start);
    } else {
      const status = document.createElement("em");
      status.textContent = isDone ? "Done" : "Locked";
      row.appendChild(status);
    }
    host.appendChild(row);
  });

  module.sectionIds.forEach((sectionId) => {
    const section = foundationsCurriculum.find((item) => item.id === sectionId);
    if (!section) return;
    const row = document.createElement("div");
    row.className = "lesson-row syllabus-row";
    const marker = document.createElement("b");
    marker.textContent = section.number;
    const info = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = section.title;
    const completed = section.topics.filter((topic) => state.topicProgress[section.id + "-" + topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")]).length;
    const meta = document.createElement("small");
    meta.textContent = completed + " / " + section.topics.length + " topic labs complete";
    info.append(title, meta);
    row.append(marker, info);
    const open = document.createElement("button");
    open.className = "small";
    open.type = "button";
    open.dataset.openCurriculumSection = String(foundationsCurriculum.indexOf(section));
    open.textContent = completed === section.topics.length ? "Review syllabus" : "Open syllabus";
    row.appendChild(open);
    host.appendChild(row);
  });
}

function updateLessonRows() {
  renderModuleRows();
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The module list was inert: clicking 01-05 moved neither the selection nor the
// detail pane, which stayed on module 00 whatever was clicked.
function selectModule(index) {
  const module = modules[index];
  if (!module) return;
  module.unlocked = isModuleUnlocked(module);
  module.status = moduleStatus(module);
  selectedModule = index;

  $$(".path").forEach((button, position) => {
    const isSelected = position === index;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  $("#module-kicker").innerHTML = "MODULE " + module.code + ' <i>' + module.status + "</i>";
  $("#module-title").textContent = module.title;
  $("#module-summary").textContent = module.summary;
  // Locked parts remain inspectable so the learning path and syllabus never
  // appear to disagree. Only the gated executable lesson is locked; the
  // learner can preview the mapped sections and open their syllabus labs.
  $("#module-progress").hidden = false;
  $("#module-lessons").hidden = false;
  renderModuleRows();

  let locked = $("#module-locked");
  if (!module.unlocked) {
    if (!locked) {
      locked = document.createElement("p");
      locked.id = "module-locked";
      locked.className = "module-locked";
      $(".module-detail").appendChild(locked);
    }
    const prerequisite = modules[index - 1] ? modules[index - 1].title : "the previous module";
    locked.textContent = module.meta + ". Preview available; gated progression unlocks once you finish " + prerequisite + ".";
    locked.hidden = false;
  } else if (locked) {
    locked.hidden = true;
  }

  updateProgress();
}

// Open the brief instead of leaving the button inert.
function toggleProjectBrief() {
  const button = $("#project-action");
  const panel = $("#project-brief");
  const willOpen = panel.hidden;

  if (willOpen && !panel.childElementCount) {
    const heading = document.createElement("h3");
    heading.textContent = businessCase.title;
    const brief = document.createElement("p");
    brief.textContent = businessCase.brief;
    panel.append(heading, brief);
    const list = document.createElement("ol");
    projectMilestones.forEach((text, index) => {
      const item = document.createElement("li");
      item.textContent = text;
      item.className = index < clampMilestones(state.milestones) ? "done" : "";
      list.appendChild(item);
    });
    panel.appendChild(list);
    const prompts = document.createElement("ul");
    prompts.className = "business-prompts";
    businessCase.prompts.forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      prompts.appendChild(item);
    });
    panel.appendChild(prompts);
  }

  panel.hidden = !willOpen;
  button.setAttribute("aria-expanded", String(willOpen));
  button.textContent = willOpen ? "Hide project brief" : "Open project brief →";
}

// The filter tabs previously moved a highlight and filtered nothing.
function filterPulse(topic) {
  $$("#pulse-list .pulse-card").forEach((card) => {
    card.hidden = topic !== "all" && card.dataset.topic !== topic;
  });
  $$(".filters button").forEach((button) => {
    const isSelected = button.dataset.topic === topic;
    button.classList.toggle("selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });
}

function renderCurriculumSections() {
  const host = $("#curriculum-sections");
  if (!host || host.childElementCount) return;
  foundationsCurriculum.forEach((section, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "curriculum-tab" + (index === 0 ? " selected" : "");
    button.dataset.curriculumSection = String(index);
    const complete = section.topics.filter((topic) => state.topicProgress[(section.id + "-" + topic.toLowerCase().replace(/[^a-z0-9]+/g, "-"))]).length;
    button.innerHTML = "<b>" + (section.part || "PART I · FOUNDATIONS") + " · " + section.number + "</b><strong>" + section.title + "</strong><small>" + complete + " / " + section.topics.length + " labs complete</small>";
    host.appendChild(button);
  });
}

function renderCurriculumDetail(index) {
  const section = foundationsCurriculum[index] || foundationsCurriculum[0];
  $("#curriculum-kicker").textContent = (section.part || "PART I · FOUNDATIONS") + " · " + section.number;
  $("#curriculum-title").textContent = section.title;
  $("#curriculum-summary").textContent = section.summary;
  $("#curriculum-topic-count").textContent = section.topics.length;
  $("#curriculum-exercise-count").textContent = section.exercises.length;
  $("#curriculum-material-count").textContent = section.materials.split(" · ").length;
  ["competencies", "traps", "exercises"].forEach((field) => {
    const host = $("#curriculum-" + field);
    host.textContent = "";
    section[field].forEach((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      host.appendChild(item);
    });
  });
  const topics = $("#curriculum-topics");
  topics.textContent = "";
  section.topics.forEach((topic, topicIndex) => {
    const card = document.createElement("article");
    card.className = "topic-card";
    const lab = topicLabByKey.get(section.id + "::" + topic);
    const complete = lab && state.topicProgress[lab.id];
    card.innerHTML = "<strong>" + String(topicIndex + 1).padStart(2, "0") + " · " + topic + "</strong><small>" + (complete ? "Lab complete · evidence saved" : "Theory, implementation lab, and evidence review") + "</small>";
    if (lab) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "small topic-lab-button";
      button.dataset.topicLab = lab.id;
      button.textContent = complete ? "Review lab" : "Open topic lab →";
      card.appendChild(button);
    }
    topics.appendChild(card);
  });
  $("#curriculum-materials").textContent = section.materials;
  $$(".curriculum-tab").forEach((button) => {
    const selected = Number(button.dataset.curriculumSection) === index;
    button.classList.toggle("selected", selected);
    const current = foundationsCurriculum[Number(button.dataset.curriculumSection)];
    const complete = current.topics.filter((topic) => {
      const lab = topicLabByKey.get(current.id + "::" + topic);
      return lab && state.topicProgress[lab.id];
    }).length;
    button.querySelector("small").textContent = complete + " / " + current.topics.length + " labs complete";
  });
}

function selectCurriculumSection(index) {
  renderCurriculumDetail(Number(index));
}

let activeTopicLab = null;

function openTopicLab(id) {
  const lab = topicLabs.find((topic) => topic.id === id);
  if (!lab) return;
  activeTopicLab = lab;
  lastTrigger = document.activeElement;
  $("#topic-modal-kicker").textContent = "SECTION " + (foundationsCurriculum.find((section) => section.id === lab.section)?.number || "") + " · TOPIC LAB";
  $("#topic-modal-title").textContent = lab.title;
  $("#topic-modal-theory").textContent = lab.theory;
  $("#topic-modal-lab").textContent = lab.lab;
  $("#topic-modal-deliverable").textContent = lab.deliverable;
  $("#topic-evidence").value = "";
  $("#topic-result").className = "";
  $("#topic-result").textContent = "";
  $("#topic-editor-status").textContent = "Paste is disabled for this assessment.";
  $("#topic-modal").hidden = false;
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  $(".app-shell").inert = true;
  $(".topic-modal-panel").focus();
}

function closeTopicLab() {
  $("#topic-modal").hidden = true;
  $(".app-shell").inert = false;
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  lastTrigger = null;
  activeTopicLab = null;
}

function submitTopicEvidence() {
  if (!activeTopicLab) return;
  const evidence = $("#topic-evidence").value.trim();
  const result = $("#topic-result");
  if (evidence.length < activeTopicLab.minimum) {
    result.className = "error";
    result.textContent = "Add at least " + activeTopicLab.minimum + " characters. Include your approach, one trade-off, an edge case, and evidence a reviewer could inspect.";
    $("#topic-editor-status").textContent = "Evidence needs more reasoning before it can be recorded.";
    return;
  }
  state.topicProgress[activeTopicLab.id] = { completedAt: new Date().toISOString(), evidenceLength: evidence.length };
  save();
  result.className = "success";
  result.textContent = "✓ Topic lab complete. Your evidence has been added to the learning record.";
  $("#topic-editor-status").textContent = "Development history captured · evidence saved";
  updateProgress();
  renderModuleRows();
  const sectionIndex = foundationsCurriculum.findIndex((section) => section.id === activeTopicLab.section);
  if (sectionIndex >= 0) renderCurriculumDetail(sectionIndex);
}

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("active-view", view.id === "view-" + name));
  $$(".nav").forEach((button) => {
    const isActive = button.dataset.view === name;
    button.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const titles = { overview: "Overview", learn: "Learning path", curriculum: "Full AI syllabus", portfolio: "Portfolio", pulse: "AI pulse" };
  $("#view-title").textContent = titles[name] || "Overview";
  window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

function renderLesson() {
  const data = lessonContent[state.currentLesson];
  if (!data) return;
  $("#modal-kicker").textContent = data.kicker;
  $("#modal-title").textContent = data.title;
  $("#modal-lead").textContent = data.lead;
  $("#example-code").textContent = data.example;
  $("#prompt-title").textContent = data.prompt;
  $("#prompt-hint").textContent = data.hint;
  $("#code-editor").value = data.starter;
  renderTheoryLesson(data);
  const next = lessonContent[state.currentLesson + 1];
  $("#next-lesson").textContent = next ? "Continue to Lesson " + (state.currentLesson + 1) + " →" : "Return to learning path →";
  renderTheory(data);
}

function renderTheoryLesson(data) {
  const guide = theoryGuides[state.currentLesson] || {
    title: data.title,
    explanation: data.lead,
    points: ["Understand the concept before changing the code."],
    terms: "concept · input · output · evidence",
    business: "Connect this exercise to a user, system, or business decision.",
    reflection: "What would you need to explain to a teammate?"
  };
  $("#theory-title").textContent = guide.title;
  $("#theory-explanation").textContent = guide.explanation;
  $("#theory-terms").textContent = guide.terms;
  $("#theory-business").textContent = guide.business;
  $("#theory-reflection").textContent = guide.reflection;
  const points = $("#theory-points");
  points.textContent = "";
  guide.points.forEach((point) => {
    const item = document.createElement("li");
    item.textContent = point;
    points.appendChild(item);
  });
  $("#theory-progress").textContent = "Concept · vocabulary · business connection";
}

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Questions are built from the lesson data rather than from fixed markup, so a
// lesson may carry any number of them. Option order is shuffled on every render:
// previously every correct answer was the first radio in the list.
function renderTheory(data) {
  const host = $("#theory-questions");
  host.textContent = "";

  data.theory.forEach((question, index) => {
    const field = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = index + 1 + ". " + question.question;
    field.appendChild(legend);

    shuffle(question.options.map((option, optionIndex) => optionIndex)).forEach((optionIndex) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "theory-" + (index + 1);
      // The value carries the option's original position, so shuffling the
      // display order never changes which answer is correct.
      input.value = String(optionIndex);
      label.append(input, document.createTextNode(" " + question.options[optionIndex]));
      field.appendChild(label);
    });

    host.appendChild(field);
  });

  $("#theory-score").textContent = "0 / " + data.theory.length + " answered";
  $("#theory-result").textContent = "";
  $("#theory-check").className = "theory-check";
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableInModal() {
  return $$(FOCUSABLE, $(".modal-panel")).filter((node) => !node.hidden && node.offsetParent !== null);
}

function openLesson() {
  if (!lessonContent[state.currentLesson]) {
    showView("learn");
    return;
  }
  lastTrigger = document.activeElement;
  lockedScrollY = window.scrollY;
  attempts = 0;
  renderLesson();
  $("#lesson-modal").hidden = false;
  $("#next-lesson").hidden = true;
  $("#practice-stage").hidden = true;
  $("#test-result").className = "";
  $("#test-result").textContent = "";
  $("#code-editor").disabled = true;
  $("#run-code").disabled = true;
  $("#editor-status").textContent = "Pass the theory checkpoint to unlock the coding test.";
  document.documentElement.classList.add("modal-open");
  document.body.classList.add("modal-open");
  document.body.style.top = "-" + lockedScrollY + "px";
  // Keep the page behind the dialog out of the tab order and the accessibility
  // tree; previously a keyboard user tabbed straight through the backdrop.
  $(".app-shell").inert = true;
  // The editor is disabled until the theory checkpoint passes, so focusing it
  // was a no-op that left focus outside the dialog entirely.
  $(".modal-panel").focus();
}

function closeLesson() {
  $("#lesson-modal").hidden = true;
  $(".app-shell").inert = false;
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  document.body.style.top = "";
  window.scrollTo(0, lockedScrollY);
  if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  lastTrigger = null;
}

// Keep Tab inside the dialog while it is open.
function trapFocus(event) {
  if (event.key !== "Tab" || $("#lesson-modal").hidden) return;
  const nodes = focusableInModal();
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const panel = $(".modal-panel");
  if (event.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function checkTheory() {
  const data = lessonContent[state.currentLesson];
  if (!data) return;
  const total = data.theory.length;
  let answered = 0;
  let score = 0;

  // Score each question against its own selection. Reducing over the checked
  // inputs by position silently mismarked answers whenever one was left blank.
  data.theory.forEach((question, index) => {
    const chosen = $('#theory-questions input[name="theory-' + (index + 1) + '"]:checked');
    if (!chosen) return;
    answered += 1;
    if (Number(chosen.value) === question.answer) score += 1;
  });

  $("#theory-score").textContent = answered + " / " + total + " answered";
  const result = $("#theory-result");
  if (answered < total) {
    $("#theory-check").className = "theory-check failed";
    result.textContent = "Answer every theory question before starting the coding test.";
    return;
  }
  if (score === total) {
    $("#theory-check").className = "theory-check passed";
    result.textContent = "✓ Theory checkpoint passed. The coding test is now unlocked.";
    $("#code-editor").disabled = false;
    $("#run-code").disabled = false;
    $("#practice-stage").hidden = false;
    $("#editor-status").textContent = "Theory passed · paste is disabled for this assessment.";
  } else {
    $("#theory-check").className = "theory-check failed";
    result.textContent = "Not quite. Review the explanation above and try the theory questions again.";
  }
}

// Run the submission against the lesson's real cases. Nothing here inspects the
// text of the answer: the code is executed and judged on what it returns.
function runTests() {
  const data = lessonContent[state.currentLesson];
  const result = $("#test-result");
  if (!data) return;

  attempts += 1;
  const outcome = PythonLite.checkSolution($("#code-editor").value, data.check);

  if (outcome.status === "passed") {
    result.className = "success";
    result.innerHTML = "✓ " + outcome.passed + " / " + outcome.total + " hidden tests passed. " + data.success;
    $("#next-lesson").hidden = false;
    $("#editor-status").textContent = "Development history captured · " + attempts + " attempt" + (attempts === 1 ? "" : "s");
    state.lessons = Math.max(state.lessons, state.currentLesson);
    // One milestone per completed lesson, capped at the project's four — the
    // milestone count used to be set to the lesson number outright, so passing
    // lesson 4 reported four artifacts and a full bar.
    state.milestones = clampMilestones(state.lessons);
    save();
    updateProgress();
    updateLessonRows();
    refreshProjectBrief();
    return;
  }

  result.className = "error";
  $("#next-lesson").hidden = true;
  // The nudge only makes sense once the code actually ran and produced a result.
  const ranAtAll = outcome.status === "failed";
  const progress = ranAtAll ? outcome.passed + " / " + outcome.total + " hidden tests passed. " : "";
  const nudge = ranAtAll && outcome.failure && data.nudge ? " " + data.nudge : "";
  result.textContent = progress + outcome.detail + nudge;
  $("#editor-status").textContent = "Attempt " + attempts + " recorded · keep working";
}

function refreshProjectBrief() {
  const panel = $("#project-brief");
  if (!panel.childElementCount) return;
  $$("li", panel).forEach((item, index) => {
    item.className = index < clampMilestones(state.milestones) ? "done" : "";
  });
}

function continueAfterPass() {
  const next = state.currentLesson + 1;
  if (lessonContent[next]) {
    state.currentLesson = next;
    save();
    const nextModule = modules.findIndex((module) => module.lessonIds.includes(next));
    if (nextModule >= 0) selectModule(nextModule);
    updateLessonRows();
    updateDashboard();
    closeLesson();
    showView("learn");
    setTimeout(() => {
      const row = $(".lesson-row.now");
      if (row) row.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
    }, 250);
  } else {
    // No further content. Park the pointer past the last lesson so the finished
    // lesson reads as complete instead of staying "current" forever.
    const numbers = lessonNumbers();
    const last = numbers[numbers.length - 1];
    if (state.lessons >= last) state.currentLesson = last + 1;
    save();
    updateLessonRows();
    updateDashboard();
    closeLesson();
    showView("learn");
  }
}

$$(".nav").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
$$("[data-view-link]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewLink)));
document.addEventListener("click", (event) => {
  const lessonButton = event.target.closest("[data-open-lesson]");
  if (lessonButton) openLesson();
  const topicButton = event.target.closest("[data-topic-lab]");
  if (topicButton) openTopicLab(topicButton.dataset.topicLab);
});
$$('[data-close-modal]').forEach((node) => node.addEventListener("click", closeLesson));
$$('[data-close-topic]').forEach((node) => node.addEventListener("click", closeTopicLab));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#lesson-modal").hidden) closeLesson();
  if (event.key === "Escape" && !$("#topic-modal").hidden) closeTopicLab();
  trapFocus(event);
});
$("#run-code").addEventListener("click", runTests);
$("#next-lesson").addEventListener("click", continueAfterPass);
$("#check-theory").addEventListener("click", checkTheory);
$("#code-editor").addEventListener("paste", (event) => { event.preventDefault(); $("#editor-status").textContent = "Paste is disabled. Build the solution yourself."; });
$("#code-editor").addEventListener("drop", (event) => event.preventDefault());
$("#code-editor").addEventListener("input", () => { $("#editor-status").textContent = "Typing captured · hidden tests ready"; });
$("#submit-topic").addEventListener("click", submitTopicEvidence);
$("#topic-evidence").addEventListener("paste", (event) => { event.preventDefault(); $("#topic-editor-status").textContent = "Paste is disabled. Build the evidence yourself."; });
$("#topic-evidence").addEventListener("drop", (event) => event.preventDefault());
function applyTheme() {
  const isDark = state.theme === "dark";
  // The class goes on the root element so html, and the overscroll area behind
  // the page, pick up the dark background too.
  document.documentElement.classList.toggle("dark", isDark);
  const toggle = $("#theme-toggle");
  toggle.setAttribute("aria-pressed", String(isDark));
  $(".visually-hidden", toggle).textContent = isDark ? "Dark theme on" : "Dark theme off";
}

$("#theme-toggle").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  save();
});
$("#reset-progress").addEventListener("click", () => {
  if (!$("#lesson-modal").hidden) closeLesson();
  if (!$("#topic-modal").hidden) closeTopicLab();
  // Keep the streak: it records days visited, which a progress reset does not
  // undo. Everything the reset does touch is re-rendered here — the theme and
  // the dashboard were previously left showing the pre-reset state, which put
  // the theme toggle one click out of step with what was on screen.
  const { streak, bestStreak, lastActiveDay, theme } = state;
  state = Object.assign({}, defaults, { streak, bestStreak, lastActiveDay, theme });
  save();
  applyTheme();
  updateProgress();
  updateLessonRows();
  updateDashboard();
  selectModule(0);
  $("#project-brief").hidden = true;
  $("#project-brief").textContent = "";
  $("#project-action").setAttribute("aria-expanded", "false");
  $("#project-action").textContent = "Open project brief →";
});
$$(".filters button").forEach((button) => button.addEventListener("click", () => filterPulse(button.dataset.topic)));
$$(".path").forEach((button) => button.addEventListener("click", () => selectModule(Number(button.dataset.module))));
document.addEventListener("click", (event) => {
  const curriculumButton = event.target.closest("[data-curriculum-section]");
  if (curriculumButton) selectCurriculumSection(Number(curriculumButton.dataset.curriculumSection));
  const openSyllabus = event.target.closest("[data-open-curriculum-section]");
  if (openSyllabus) {
    showView("curriculum");
    selectCurriculumSection(Number(openSyllabus.dataset.openCurriculumSection));
  }
});
$("#project-action").addEventListener("click", toggleProjectBrief);
applyTheme();
repairLessonPointer();
updateStandingContent();
updateStreak();
selectModule(0);
updateProgress();
updateLessonRows();
updateDashboard();
filterPulse("all");
renderCurriculumSections();
renderCurriculumDetail(0);
const curriculumTopicTotal = foundationsCurriculum.reduce((total, section) => total + section.topics.length, 0);
$("#view-curriculum .page-intro h1").textContent = "AI engineer syllabus · Parts I–VI";
$("#view-curriculum .page-intro p").textContent = "Six parts, " + curriculumTopicTotal + " topics, and the competencies that make later AI work durable. Read the theory, practise the pattern, and attach evidence to your portfolio.";
