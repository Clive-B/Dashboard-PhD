import test from "node:test";
import assert from "node:assert/strict";
import { isJarvisCapability, jarvisCapability, requiresHumanApproval } from "../src/lib/jarvis";

test("unknown Jarvis capabilities are denied by default", () => {
  assert.equal(isJarvisCapability("email.send.anything"), false);
  assert.equal(jarvisCapability("email.send.anything"), null);
});

test("external state changes require human approval", () => {
  assert.equal(requiresHumanApproval("calendar.write"), true);
  assert.equal(requiresHumanApproval("notification.send"), true);
  assert.equal(requiresHumanApproval("data.delete"), true);
});

test("read-only dashboard access does not itself mutate state", () => {
  assert.equal(requiresHumanApproval("dashboard.read"), false);
});
