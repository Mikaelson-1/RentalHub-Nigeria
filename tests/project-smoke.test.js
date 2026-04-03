const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("critical routes exist", () => {
  const requiredFiles = [
    "src/app/api/properties/route.ts",
    "src/app/api/properties/[id]/status/route.ts",
    "src/app/api/bookings/route.ts",
    "src/app/api/uploads/route.ts",
    "src/app/api/admin/summary/route.ts",
  ];

  for (const filePath of requiredFiles) {
    assert.equal(fs.existsSync(filePath), true, `${filePath} should exist`);
  }
});

test("shared school mapping file exists", () => {
  const mappingPath = "src/lib/schools.ts";
  assert.equal(fs.existsSync(mappingPath), true, "schools mapping file should exist");
  const content = fs.readFileSync(mappingPath, "utf8");
  assert.match(content, /SCHOOL_OPTIONS/);
  assert.match(content, /SCHOOL_LOCATION_KEYWORDS/);
});
