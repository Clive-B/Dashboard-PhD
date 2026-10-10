import test from "node:test";
import assert from "node:assert/strict";
import { isJarvisCapability, jarvisCapability, permanentJarvisDenial, requiresHumanApproval } from "../src/lib/jarvis";
import { runtimeDecision } from "../src/lib/runtime-guard";

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

test("secure desktop and operating-system credential use are permanently denied", () => {
  assert.match(permanentJarvisDenial("desktop.unlock") || "", /never unlocks/i);
  assert.match(permanentJarvisDenial("credential.replay") || "", /never stores, types, or replays/i);
  assert.equal(runtimeDecision({ touchesSecureDesktop: true }, "unlocked").effect, "deny");
  assert.equal(runtimeDecision({ usesOperatingSystemCredential: true }, "unlocked").effect, "deny");
});

test("interactive desktop work is deferred while Windows is locked", () => {
  assert.equal(runtimeDecision({ requiresInteractiveDesktop: true }, "locked").effect, "defer");
  assert.equal(runtimeDecision({ requiresInteractiveDesktop: true }, "unknown").effect, "defer");
  assert.equal(runtimeDecision({ requiresInteractiveDesktop: true }, "unlocked").effect, "allow");
  assert.equal(runtimeDecision({}, "locked").effect, "allow");
});
