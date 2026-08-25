const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const childProcess = require("node:child_process");

const app = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "content", "manifest.json"), "utf8"));

test("the curriculum has the target 35-section and 197-topic structure", () => {
  assert.match(app, /const foundationsCurriculum = \[/);
  assert.equal((app.match(/\["(?:python|engineering|algorithms|systems|databases|math|data)", "[^"]+", "[^"]+", "[^"]+", "[^"]+"\]/g) || []).length, 35);
  assert.match(html, /id="view-curriculum"/);
  assert.match(html, /id="topic-modal"/);
  const report = childProcess.execFileSync(process.execPath, [path.join(__dirname, "..", "scripts", "curriculum-lint.cjs")], { encoding: "utf8" });
  assert.match(report, /Sections: 35/);
  assert.match(report, /Topics: 197/);
  assert.match(report, /Topic labs: 197/);
  assert.equal(manifest.sectionCount, 35);
  assert.equal(manifest.topicCount, 197);
  assert.equal(manifest.status, "in-progress");
  assert.equal(manifest.extraction.status, "human-approved");
  assert.equal(manifest.authoring.conceptsIndexed, 806);
});

test("Parts II through VI are represented in the same curriculum model", () => {
  assert.match(app, /const advancedCurriculum = \[/);
  assert.match(app, /PART II · MACHINE LEARNING/);
  assert.match(app, /PART III · TRANSFORMERS & LLMs/);
  assert.match(app, /PART IV · AI ENGINEERING/);
  assert.match(app, /PART V · PRODUCTION/);
  assert.match(app, /PART VI · OPTIONAL DEPTH/);
  assert.match(app, /PART 0 · CLASSICAL AI/);
  assert.match(app, /PART VII · STAYING CURRENT/);
  assert.match(app, /foundationsCurriculum\.forEach/);
});

test("the learning path is derived from the syllabus sections", () => {
  assert.match(app, /const partDefinitions = \[/);
  assert.match(app, /const modules = partDefinitions\.map/);
  assert.match(app, /sectionIds: sections\.map/);
  assert.match(app, /data-open-curriculum-section/);
});

test("the first reference topic is a complete authored vertical slice", () => {
  const python = manifest.sections.flatMap((section) => section.topics || []).find((topic) => topic.id === "python-language-core");
  assert.ok(python);
  assert.equal(python.status, "authored");
  assert.equal(python.lessons.length, 12);
  assert.equal(python.drills.length, 5);
  assert.equal(python.build.id, "01.01.build");
  assert.equal(manifest.authoring.lessonsAuthored, 12);
  assert.equal(manifest.authoring.drillsAuthored, 5);
  assert.equal(manifest.authoring.buildsAuthored, 1);
  assert.equal(fs.existsSync(path.join(__dirname, "..", "content", "part-01", "section-01-python", "topic-01-language-core", "lesson-12-capstone.mdx")), true);
});

test("lesson and topic modal backdrops cannot dismiss the dialog", () => {
  assert.doesNotMatch(html, /<div class="backdrop" data-close-modal/);
  assert.doesNotMatch(html, /<div class="backdrop" data-close-topic/);
});
