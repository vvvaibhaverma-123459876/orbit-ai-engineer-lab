const key = "orbit-prototype-state";
const defaults = { lessons: 1, portfolio: 1, currentLesson: 2, theme: "light" };

// Storage is best-effort: a corrupt value or a browser that blocks localStorage
// must never stop the rest of the app from starting.
function loadState() {
  try {
    const raw = localStorage.getItem(key);
    const stored = raw ? JSON.parse(raw) : null;
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return Object.assign({}, defaults);
    return Object.assign({}, defaults, stored);
  } catch (error) {
    console.warn("Orbit: saved progress could not be read, starting from defaults.", error);
    return Object.assign({}, defaults);
  }
}

let state = loadState();
let lockedScrollY = 0;
let attempts = 0;
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
  const percent = Math.max(18, Math.round((state.lessons / 6) * 100));
  $("#mastery").innerHTML = percent + "<small>%</small>";
  $("#detail-bar").style.width = percent + "%";
  $("#detail-label").textContent = percent + "% complete";
  $("#portfolio-count").textContent = String(state.portfolio).padStart(2, "0");
  $("#portfolio-bar").style.width = Math.min(100, state.portfolio * 25) + "%";
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

function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("active-view", view.id === "view-" + name));
  $$(".nav").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  const titles = { overview: "Overview", learn: "Learning path", portfolio: "Portfolio", pulse: "AI pulse" };
  $("#view-title").textContent = titles[name] || "Overview";
  window.scrollTo({ top: 0, behavior: "smooth" });
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

function openLesson() {
  if (!lessonContent[state.currentLesson]) {
    showView("learn");
    return;
  }
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
  $("#code-editor").focus();
}

function closeLesson() {
  $("#lesson-modal").hidden = true;
  document.documentElement.classList.remove("modal-open");
  document.body.classList.remove("modal-open");
  document.body.style.top = "";
  window.scrollTo(0, lockedScrollY);
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
    save();
    updateProgress();
    updateLessonRows();
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
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
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
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#lesson-modal").hidden) closeLesson(); });
$("#run-code").addEventListener("click", runTests);
$("#next-lesson").addEventListener("click", continueAfterPass);
$("#check-theory").addEventListener("click", checkTheory);
$("#code-editor").addEventListener("paste", (event) => { event.preventDefault(); $("#editor-status").textContent = "Paste is disabled. Build the solution yourself."; });
$("#code-editor").addEventListener("drop", (event) => event.preventDefault());
$("#code-editor").addEventListener("input", () => { $("#editor-status").textContent = "Typing captured · hidden tests ready"; });
$("#theme-toggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; document.body.classList.toggle("dark", state.theme === "dark"); save(); });
$("#reset-progress").addEventListener("click", () => { state = Object.assign({}, defaults); save(); updateProgress(); updateLessonRows(); });
$$(".filters button").forEach((button) => button.addEventListener("click", () => { $$(".filters button").forEach((item) => item.classList.remove("selected")); button.classList.add("selected"); }));
document.body.classList.toggle("dark", state.theme === "dark");
repairLessonPointer();
updateProgress();
updateLessonRows();
updateDashboard();
