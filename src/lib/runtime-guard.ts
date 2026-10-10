export type DesktopSessionState = "locked" | "unlocked" | "unknown";

export type RuntimeAction = {
  touchesSecureDesktop?: boolean;
  usesOperatingSystemCredential?: boolean;
  requiresInteractiveDesktop?: boolean;
};

export type RuntimeDecision = {
  effect: "allow" | "defer" | "deny";
  reason: string;
};

export function runtimeDecision(action: RuntimeAction, sessionState: DesktopSessionState): RuntimeDecision {
  if (action.touchesSecureDesktop) {
    return { effect: "deny", reason: "Secure-desktop access is permanently denied." };
  }
  if (action.usesOperatingSystemCredential) {
    return { effect: "deny", reason: "Operating-system credential capture or replay is permanently denied." };
  }
  if (action.requiresInteractiveDesktop && sessionState !== "unlocked") {
    return { effect: "defer", reason: "Interactive work waits for the owner to unlock Windows." };
  }
  return { effect: "allow", reason: "The action does not cross the locked-desktop boundary." };
}
