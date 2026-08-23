const key = "orbit-prototype-state";
const defaults = {
  lessons: 1,
  currentLesson: 2,
  theme: "light",
  // Milestones on Portfolio project 01, tracked separately from lesson numbers.
  milestones: 1,
  streak: 1,
  bestStreak: 1,
  lastActiveDay: null
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

const modules = [
  {
    code: "00",
    title: "AI Engineer foundations",
    status: "IN PROGRESS",
    meta: "In progress",
    summary: "Build enough fluency to learn the IIT Kharagpur GenAI curriculum confidently, then turn your learning into working software.",
    unlocked: true,
    lessonIds: [1, 2, 3, 4, 5, 6],
    unlockAfter: 0
  },
  {
    code: "01",
    title: "Foundations of GenAI & LLMs",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Deep learning essentials, transformers, embeddings and model selection.",
    unlocked: false,
    lessonIds: [7, 8],
    unlockAfter: 6
  },
  {
    code: "02",
    title: "Advanced prompting & RAG",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Retrieval, hybrid search, reranking and evaluation you can measure.",
    unlocked: false,
    lessonIds: [9, 10],
    unlockAfter: 8
  },
  {
    code: "03",
    title: "Fine-tuning & alignment",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Adapting a base model to a task, and keeping its behaviour predictable once you have.",
    unlocked: false,
    lessonIds: [11, 12],
    unlockAfter: 10
  },
  {
    code: "04",
    title: "Multimodal & agentic AI",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Systems that read images and documents, call tools and carry a task across several steps.",
    unlocked: false,
    lessonIds: [13, 14],
    unlockAfter: 12
  },
  {
    code: "05",
    title: "Deployment, optimization & safety",
    status: "LOCKED",
    meta: "8 weeks · 24 live hours",
    summary: "Serving a model at a cost you can defend, and the safety work that has to ship with it.",
    unlocked: false,
    lessonIds: [15, 16],
    unlockAfter: 14
  }
];

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

function isModuleUnlocked(module) {
  return Boolean(module && state.lessons >= module.unlockAfter);
}

function modulePercent(module) {
  if (!module || !module.lessonIds.length) return 0;
  const done = module.lessonIds.filter((number) => number <= state.lessons).length;
  return Math.round((done / module.lessonIds.length) * 100);
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
  const lessonsLabel = state.lessons + " / " + TOTAL_LESSONS + " lessons";

  $("#mastery").innerHTML = percent + "<small>%</small>";
  $("#mastery-note").textContent = state.lessons >= TOTAL_LESSONS ? "All modules · path complete" : "All modules · " + state.lessons + " of " + TOTAL_LESSONS + " lessons";
  $("#roadmap-bar").style.width = percent + "%";
  $("#roadmap-lessons").textContent = lessonsLabel;
  $("#path-percent").textContent = percent + "%";
  $("#path-status").textContent = moduleStatus(modules[0]).toLowerCase() + " · " + modules[0].lessonIds.filter((number) => number <= state.lessons).length + " / " + modules[0].lessonIds.length + " lessons";
  $(".roadmap").style.setProperty("--road-progress", percent + "%");
  $("#active-counter").innerHTML =
    String(state.lessons).padStart(2, "0") + " <small>/ " + String(TOTAL_LESSONS).padStart(2, "0") + "</small>";
  $("#path-percent").textContent = modulePercent(modules[0]) + "%";
  modules.forEach((module, index) => {
    const button = $(".path[data-module='" + index + "']");
    if (!button) return;
    const unlocked = isModuleUnlocked(module);
    const percentForModule = modulePercent(module);
    button.classList.toggle("locked", !unlocked);
    button.querySelector("em").textContent = unlocked ? percentForModule + "%" : "⌑";
    const small = button.querySelector("small");
    if (small) small.textContent = unlocked ? moduleStatus(module).toLowerCase() + " · " + module.lessonIds.filter((number) => number <= state.lessons).length + " / " + module.lessonIds.length + " lessons" : module.meta;
  });
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
  $("#module-progress").hidden = !module.unlocked;
  $("#module-lessons").hidden = !module.unlocked;
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
    locked.textContent = module.meta + ". Unlocks once you finish " + prerequisite + ".";
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

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("active-view", view.id === "view-" + name));
  $$(".nav").forEach((button) => {
    const isActive = button.dataset.view === name;
    button.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  const titles = { overview: "Overview", learn: "Learning path", portfolio: "Portfolio", pulse: "AI pulse" };
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
  const next = lessonContent[state.currentLesson + 1];
  $("#next-lesson").textContent = next ? "Continue to Lesson " + (state.currentLesson + 1) + " →" : "Return to learning path →";
  renderTheory(data);
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
});
$$("[data-close-modal]").forEach((node) => node.addEventListener("click", closeLesson));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("#lesson-modal").hidden) closeLesson();
  trapFocus(event);
});
$("#run-code").addEventListener("click", runTests);
$("#next-lesson").addEventListener("click", continueAfterPass);
$("#check-theory").addEventListener("click", checkTheory);
$("#code-editor").addEventListener("paste", (event) => { event.preventDefault(); $("#editor-status").textContent = "Paste is disabled. Build the solution yourself."; });
$("#code-editor").addEventListener("drop", (event) => event.preventDefault());
$("#code-editor").addEventListener("input", () => { $("#editor-status").textContent = "Typing captured · hidden tests ready"; });
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
