import test from "node:test";
import assert from "node:assert/strict";
import { emptyData } from "../lib/finance-repository";
import { decideSync, parseCopy } from "../lib/sync-state";
const a = emptyData();
const b = { ...a, settings: { ...a.settings, expectedSalary: 100 } };
const c = { ...a, settings: { ...a.settings, expectedSalary: 200 } };
const copy = (data = a, revision = 1) => ({ data, revision });
test("sync establishes a safe baseline for existing manual-sync and new devices", () => {
  assert.equal(decideSync(b, copy(b), null, null), "adopt");
  assert.equal(decideSync(a, copy(b), null, null), "download");
  assert.equal(decideSync(b, null, null, null), "upload");
  assert.equal(decideSync(b, copy(a, 4), null, 4), "upload");
  assert.equal(decideSync(b, copy(c, 5), null, 4), "conflict");
  assert.equal(decideSync(b, copy(c), null, null), "conflict");
});
test("one-sided edits sync, concurrent edits pause, identical acknowledgements recover", () => {
  assert.equal(decideSync(b, copy(a), copy(a), null), "upload");
  assert.equal(decideSync(a, copy(b, 2), copy(a), null), "download");
  assert.equal(decideSync(b, copy(c, 2), copy(a), null), "conflict");
  assert.equal(decideSync(b, copy(b, 2), copy(a), null), "adopt");
  assert.equal(decideSync(b, null, copy(a), null), "conflict");
  assert.equal(decideSync(b, copy(c, 1), copy(a, 2), null), "conflict");
});
test("corrupt sync metadata must not be treated as a fresh cloud record", () => {
  assert.equal(parseCopy(null), null);
  assert.throws(() => parseCopy("{}"));
  assert.throws(() => parseCopy(JSON.stringify({ revision: 0, data: a })));
  assert.deepEqual(parseCopy(JSON.stringify(copy(b, 3))), copy(b, 3));
});
