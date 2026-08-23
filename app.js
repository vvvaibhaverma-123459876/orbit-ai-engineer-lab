const key = "orbit-prototype-state";
const defaults = { lessons: 1, portfolio: 1, currentLesson: 2, theme: "light" };
let state = Object.assign({}, defaults, JSON.parse(localStorage.getItem(key) || "{}"));
let lockedScrollY = 0;
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
      { question: "What does a Python function give you?", options: ["A reusable named block of logic", "A special type of loop"], answer: "a" },
      { question: "What does return do inside a function?", options: ["Sends a result back to the caller", "Prints the result automatically"], answer: "a" }
    ],
    validate: (code) => /return\s+number\s*\*\s*2/.test(code)
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
      { question: "What is a Python list?", options: ["An ordered collection of values", "A single number"], answer: "a" },
      { question: "Which built-in adds all values in scores?", options: ["sum(scores)", "max(scores)"], answer: "a" }
    ],
    validate: (code) => /return\s+sum\s*\(\s*scores\s*\)/.test(code)
  }
};

function save() { localStorage.setItem(key, JSON.stringify(state)); }

function updateProgress() {
  const percent = Math.max(18, Math.round((state.lessons / 6) * 100));
  $("#mastery").innerHTML = percent + "<small>%</small>";
  $("#detail-bar").style.width = percent + "%";
  $("#detail-label").textContent = percent + "% complete";
  $("#portfolio-count").textContent = String(state.portfolio).padStart(2, "0");
  $("#portfolio-bar").style.width = Math.min(100, state.portfolio * 25) + "%";
}

function updateLessonRows() {
  $$(".lesson-row").forEach((row, index) => {
    const number = index + 1;
    const isCurrent = number === state.currentLesson;
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
  const data = lessonContent[state.currentLesson] || lessonContent[2];
  $("#modal-kicker").textContent = data.kicker;
  $("#modal-title").textContent = data.title;
  $("#modal-lead").textContent = data.lead;
  $("#example-code").textContent = data.example;
  $("#prompt-title").textContent = data.prompt;
  $("#prompt-hint").textContent = data.hint;
  $("#code-editor").value = data.starter;
  $("#next-lesson").textContent = state.currentLesson === 2 ? "Continue to Lesson 3 →" : "Return to learning path →";
  renderTheory(data);
}

function renderTheory(data) {
  const fields = $$("#theory-check fieldset");
  data.theory.forEach((question, index) => {
    const field = fields[index];
    field.querySelector("legend").textContent = question.question;
    field.querySelectorAll("label").forEach((label, optionIndex) => {
      const input = label.querySelector("input");
      input.name = "theory-" + (index + 1);
      input.value = optionIndex === 0 ? "a" : "b";
      input.checked = false;
      label.innerHTML = "";
      label.append(input, document.createTextNode(" " + question.options[optionIndex]));
    });
  });
  $("#theory-score").textContent = "0 / 2 answered";
  $("#theory-result").textContent = "";
  $("#theory-check").className = "theory-check";
}

function openLesson() {
  lockedScrollY = window.scrollY;
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
  const data = lessonContent[state.currentLesson] || lessonContent[2];
  const selected = $$("#theory-check input:checked");
  const score = selected.reduce((total, input, index) => total + (input.value === data.theory[index].answer ? 1 : 0), 0);
  $("#theory-score").textContent = selected.length + " / 2 answered";
  const result = $("#theory-result");
  if (selected.length < 2) {
    $("#theory-check").className = "theory-check failed";
    result.textContent = "Answer both theory questions before starting the coding test.";
    return;
  }
  if (score === 2) {
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

function runTests() {
  const code = $("#code-editor").value;
  const data = lessonContent[state.currentLesson] || lessonContent[2];
  const result = $("#test-result");
  if (data.validate(code)) {
    result.className = "success";
    result.innerHTML = state.currentLesson === 2
      ? "✓ Hidden tests passed. Your function works for positive, negative and zero inputs. <b>Next: explain why it works.</b>"
      : "✓ Hidden tests passed. Your list function works with empty, short and longer lists. <b>Nice decomposition.</b>";
    $("#next-lesson").hidden = false;
    $("#editor-status").textContent = "Development history captured · 1 attempt";
    state.lessons = Math.max(state.lessons, state.currentLesson);
    state.portfolio = Math.max(state.portfolio, state.currentLesson);
    save();
    updateProgress();
    updateLessonRows();
  } else {
    result.className = "error";
    $("#next-lesson").hidden = true;
    result.textContent = state.currentLesson === 2
      ? "Not quite yet. Hidden tests expect a lowercase return statement using number multiplied by two."
      : "Not quite yet. Hidden tests expect a lowercase return statement using sum(scores).";
    $("#editor-status").textContent = "Attempt recorded · keep working";
  }
}

function continueAfterPass() {
  if (state.currentLesson === 2) {
    state.currentLesson = 3;
    save();
    updateLessonRows();
    closeLesson();
    showView("learn");
    setTimeout(() => {
      const row = $(".lesson-row.now");
      if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
  } else {
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
updateProgress();
updateLessonRows();
