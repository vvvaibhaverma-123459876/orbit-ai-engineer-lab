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

test("Parts II through VI are represented in the same curriculum model", () => {
  assert.match(app, /const advancedCurriculum = \[/);
  assert.match(app, /PART II · MACHINE LEARNING/);
  assert.match(app, /PART III · TRANSFORMERS & LLMs/);
  assert.match(app, /PART IV · AI ENGINEERING/);
  assert.match(app, /PART V · PRODUCTION/);
  assert.match(app, /PART VI · OPTIONAL DEPTH/);
  assert.match(app, /advancedCurriculum\.forEach/);
});

test("the learning path is derived from the syllabus sections", () => {
  assert.match(app, /const partDefinitions = \[/);
  assert.match(app, /const modules = partDefinitions\.map/);
  assert.match(app, /sectionIds: sections\.map/);
  assert.match(app, /data-open-curriculum-section/);
});

test("lesson and topic modal backdrops cannot dismiss the dialog", () => {
  assert.doesNotMatch(html, /<div class="backdrop" data-close-modal/);
  assert.doesNotMatch(html, /<div class="backdrop" data-close-topic/);
});
