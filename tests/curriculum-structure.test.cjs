const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("the foundations syllabus has all seven sections and 35 topic labs", () => {
  assert.match(app, /const foundationsCurriculum = \[/);
  assert.equal((app.match(/\["(?:python|engineering|algorithms|systems|databases|math|data)", "[^"]+", "[^"]+", "[^"]+", "[^"]+"\]/g) || []).length, 35);
  assert.match(html, /id="view-curriculum"/);
  assert.match(html, /id="topic-modal"/);
});

test("lesson and topic modal backdrops cannot dismiss the dialog", () => {
  assert.doesNotMatch(html, /<div class="backdrop" data-close-modal/);
  assert.doesNotMatch(html, /<div class="backdrop" data-close-topic/);
});
