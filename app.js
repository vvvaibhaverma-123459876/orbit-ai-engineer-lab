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

const TOTAL_LESSONS = 6;
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
  }
};

const modules = [
  {
    code: "00",
    title: "AI Engineer foundations",
    status: "IN PROGRESS",
    meta: "In progress",
    summary: "Build enough fluency to learn the IIT Kharagpur GenAI curriculum confidently, then turn your learning into working software.",
    unlocked: true
  },
  {
    code: "01",
    title: "Foundations of GenAI & LLMs",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Deep learning essentials, transformers, embeddings and model selection.",
    unlocked: false
  },
  {
    code: "02",
    title: "Advanced prompting & RAG",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Retrieval, hybrid search, reranking and evaluation you can measure.",
    unlocked: false
  },
  {
    code: "03",
    title: "Fine-tuning & alignment",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Adapting a base model to a task, and keeping its behaviour predictable once you have.",
    unlocked: false
  },
  {
    code: "04",
    title: "Multimodal & agentic AI",
    status: "LOCKED",
    meta: "6 weeks · 18 live hours",
    summary: "Systems that read images and documents, call tools and carry a task across several steps.",
    unlocked: false
  },
  {
    code: "05",
    title: "Deployment, optimization & safety",
    status: "LOCKED",
    meta: "8 weeks · 24 live hours",
    summary: "Serving a model at a cost you can defend, and the safety work that has to ship with it.",
    unlocked: false
  }
];

const projectMilestones = [
  "Set up the project, its folder layout and a first commit.",
  "Record a practice session and write it to a file.",
  "Calculate streaks from the stored sessions.",
  "Export a weekly review and cover it with tests."
];

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
  $("#mastery-note").textContent = "Foundations · " + state.lessons + " of " + TOTAL_LESSONS + " lessons";
  $("#roadmap-bar").style.width = percent + "%";
  $("#roadmap-lessons").textContent = lessonsLabel;
  $("#path-percent").textContent = percent + "%";
  $("#path-status").textContent = "In progress · " + lessonsLabel;
  $(".roadmap").style.setProperty("--road-progress", percent + "%");
  $("#active-counter").innerHTML =
    String(state.lessons).padStart(2, "0") + " <small>/ " + String(TOTAL_LESSONS).padStart(2, "0") + "</small>";
  if (selectedModule === 0) {
    $("#detail-bar").style.width = percent + "%";
    $("#detail-label").textContent = percent + "% complete";
  }

  const done = clampMilestones(state.milestones);
  // Artifacts in progress, which is not the same number as milestones done.
  $("#portfolio-count").textContent = "01";
  $("#portfolio-note").textContent = done >= PROJECT_MILESTONES ? "Artifact complete" : "Artifact in progress";
  $("#portfolio-bar").style.width = (done / PROJECT_MILESTONES) * 100 + "%";
  $("#mini-bar").style.width = (done / PROJECT_MILESTONES) * 100 + "%";
  $("#milestone-label").textContent = done + " of " + PROJECT_MILESTONES + " milestones";
  $("#mini-milestones").textContent =
    "Artifact 01 · " + done + " " + (done === 1 ? "milestone" : "milestones") + " of " + PROJECT_MILESTONES;
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
    $("#focus-title").textContent = "Next lesson is being prepared";
    $("#focus-meta").textContent = "Module 0 · More Python engineering practice coming soon";
    $("#active-lesson-title").textContent = "Next lesson is being prepared";
    $("#active-lesson-description").textContent = "You have completed the available practice in this slice. Keep your evidence ready for the next lesson.";
    return;
  }
  $("#focus-title").textContent = data.title;
  $("#focus-meta").textContent = "Lesson " + state.currentLesson + " of 6 · Python engineering";
  $("#active-lesson-title").textContent = data.title;
  $("#active-lesson-description").textContent = data.lead;
}

function updateLessonRows() {
  $$(".lesson-row").forEach((row, index) => {
    const number = index + 1;
    const isCurrent = number === state.currentLesson && Boolean(lessonContent[number]);
    const isDone = number <= state.lessons && !isCurrent;
    const check = row.querySelector("b");
    let marker = row.querySelector("em");
    let start = row.querySelector("[data-open-lesson]");

    row.className = "lesson-row" + (isDone ? " done" : isCurrent ? " now" : "");
    check.textContent = isDone ? "✓" : String(number);

    if (isCurrent) {
      if (marker) marker.remove();
      if (!start) {
        start = document.createElement("button");
        start.className = "small";
        start.type = "button";
        start.dataset.openLesson = "";
        start.textContent = "Start";
        row.appendChild(start);
      }
      start.hidden = false;
    } else {
      if (start) start.hidden = true;
      if (!marker) {
        marker = document.createElement("em");
        row.appendChild(marker);
      }
      marker.textContent = isDone ? "Done" : "Locked";
    }
  });
}

function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The module list was inert: clicking 01-05 moved neither the selection nor the
// detail pane, which stayed on module 00 whatever was clicked.
function selectModule(index) {
  const module = modules[index];
  if (!module) return;
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

  let locked = $("#module-locked");
  if (!module.unlocked) {
    if (!locked) {
      locked = document.createElement("p");
      locked.id = "module-locked";
      locked.className = "module-locked";
      $(".module-detail").appendChild(locked);
    }
    locked.textContent = module.meta + ". Unlocks once you finish the foundations checkpoint.";
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
    const list = document.createElement("ol");
    projectMilestones.forEach((text, index) => {
      const item = document.createElement("li");
      item.textContent = text;
      item.className = index < clampMilestones(state.milestones) ? "done" : "";
      list.appendChild(item);
    });
    panel.appendChild(list);
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
