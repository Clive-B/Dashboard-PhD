export const JARVIS_CAPABILITIES = {
  "assistant.general.ask": { risk: "low", externalStateChange: false },
  "dashboard.read": { risk: "low", externalStateChange: false },
  "calendar.read": { risk: "low", externalStateChange: false },
  "calendar.write": { risk: "moderate", externalStateChange: true },
  "notification.send": { risk: "high", externalStateChange: true },
  "integration.invoke": { risk: "high", externalStateChange: true },
  "data.export": { risk: "high", externalStateChange: true },
  "data.delete": { risk: "critical", externalStateChange: true },
  "permissions.manage": { risk: "critical", externalStateChange: true }
} as const;

export type JarvisCapability = keyof typeof JARVIS_CAPABILITIES;
export type JarvisRisk = (typeof JARVIS_CAPABILITIES)[JarvisCapability]["risk"];

const PERMANENTLY_DENIED_CAPABILITIES: Readonly<Record<string, string>> = Object.freeze({
  "desktop.unlock": "AIC Scholar never unlocks the operating system or bypasses the secure desktop.",
  "credential.capture": "AIC Scholar never captures an operating-system credential.",
  "credential.replay": "AIC Scholar never stores, types, or replays an operating-system credential."
});

export function isJarvisCapability(value: string): value is JarvisCapability {
  return Object.hasOwn(JARVIS_CAPABILITIES, value);
}

export function jarvisCapability(value: string) {
  return isJarvisCapability(value) ? JARVIS_CAPABILITIES[value] : null;
}

export function permanentJarvisDenial(value: string) {
  return PERMANENTLY_DENIED_CAPABILITIES[value] || null;
}

export function requiresHumanApproval(value: JarvisCapability) {
  return JARVIS_CAPABILITIES[value].externalStateChange;
}
