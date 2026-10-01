import test from "node:test";
import assert from "node:assert/strict";
import { calculateVoiceLevel } from "../src/lib/conversation";

test("silent microphone samples have no voice energy", () => {
  assert.equal(calculateVoiceLevel(new Uint8Array([128, 128, 128, 128])), 0);
});

test("changing microphone samples produce measurable voice energy", () => {
  assert.ok(calculateVoiceLevel(new Uint8Array([96, 160, 80, 176])) > 0.2);
});
