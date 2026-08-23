const key = "orbit-prototype-state";
const defaults = { lessons: 1, portfolio: 1, theme: "light" };
let state = Object.assign({}, defaults, JSON.parse(localStorage.getItem(key) || "{}"));
let lockedScrollY = 0;
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

function save() { localStorage.setItem(key, JSON.stringify(state)); }
function updateProgress() {
  const percent = Math.max(18, Math.round((state.lessons / 6) * 100));
  $("#mastery").innerHTML = percent + "<small>%</small>";
  $("#detail-bar").style.width = percent + "%";
  $("#detail-label").textContent = percent + "% complete";
  $("#portfolio-count").textContent = String(state.portfolio).padStart(2, "0");
  $("#portfolio-bar").style.width = Math.min(100, state.portfolio * 25) + "%";
}
function showView(name) {
  $$(".view").forEach((view) => view.classList.toggle("active-view", view.id === "view-" + name));
  $$(".nav").forEach((button) => button.classList.toggle("active", button.dataset.view === name));
  const titles = { overview: "Overview", learn: "Learning path", portfolio: "Portfolio", pulse: "AI pulse" };
  $("#view-title").textContent = titles[name] || "Overview";
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function openLesson() {
  lockedScrollY = window.scrollY;
  $("#lesson-modal").hidden = false;
  $("#next-lesson").hidden = true;
  $("#test-result").className = "";
  $("#test-result").textContent = "";
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
function runTests() {
  const code = $("#code-editor").value;
  const result = $("#test-result");
  const valid = /return\s+number\s*\*\s*2/.test(code) && !/^\s*pass\s*$/m.test(code);
  if (valid) {
    result.className = "success";
    result.innerHTML = "✓ Hidden tests passed. Your function works for positive, negative and zero inputs. <b>Next: explain why it works.</b>";
    $("#next-lesson").hidden = false;
    $("#editor-status").textContent = "Development history captured · 1 attempt";
    if (state.lessons < 2) { state.lessons = 2; state.portfolio = Math.max(2, state.portfolio); save(); updateProgress(); }
  } else {
    result.className = "error";
    $("#next-lesson").hidden = true;
    result.textContent = "Not quite yet. Hidden tests expect the function to return number multiplied by two. Replace pass with a return statement.";
    $("#editor-status").textContent = "Attempt recorded · keep working";
  }
}

$$(".nav").forEach((button) => button.addEventListener("click", () => showView(button.dataset.view)));
$$("[data-view-link]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.viewLink)));
$$("[data-open-lesson]").forEach((button) => button.addEventListener("click", openLesson));
$$("[data-close-modal]").forEach((node) => node.addEventListener("click", closeLesson));
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !$("#lesson-modal").hidden) closeLesson(); });
$("#run-code").addEventListener("click", runTests);
$("#next-lesson").addEventListener("click", () => { closeLesson(); showView("learn"); });
$("#code-editor").addEventListener("paste", (event) => { event.preventDefault(); $("#editor-status").textContent = "Paste is disabled. Build the solution yourself."; });
$("#code-editor").addEventListener("drop", (event) => event.preventDefault());
$("#code-editor").addEventListener("input", () => { $("#editor-status").textContent = "Typing captured · hidden tests ready"; });
$("#theme-toggle").addEventListener("click", () => { state.theme = state.theme === "dark" ? "light" : "dark"; document.body.classList.toggle("dark", state.theme === "dark"); save(); });
$("#reset-progress").addEventListener("click", () => { state = Object.assign({}, defaults); save(); updateProgress(); $("#test-result").className = ""; $("#test-result").textContent = ""; });
$$(".filters button").forEach((button) => button.addEventListener("click", () => { $$(".filters button").forEach((item) => item.classList.remove("selected")); button.classList.add("selected"); }));
document.body.classList.toggle("dark", state.theme === "dark");
updateProgress();
