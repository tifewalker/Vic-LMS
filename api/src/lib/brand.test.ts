import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { brand } from "./brand.js";

test("API brand names match web/src/lib/site.ts", () => {
  const site = readFileSync(new URL("../../../web/src/lib/site.ts", import.meta.url), "utf8");
  const operator = site.match(/operator: \{[^}]*?name: "([^"]+)",\s*shortName: "([^"]+)"/s);
  assert.ok(operator, "operator block not found in site.ts");
  assert.equal(brand.operator, operator[1]);
  assert.equal(brand.operatorShort, operator[2]);
  assert.match(site, new RegExp(`shortName: "${brand.institutionShort}"`));
});
