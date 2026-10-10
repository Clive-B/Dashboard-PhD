import { getVercelOidcToken } from "@vercel/oidc";

export function generalAiEnabled() {
  return process.env.GENERAL_AI_ENABLED !== "false";
}

export async function aiGatewayToken() {
  if (!generalAiEnabled()) return null;
  const configuredToken = process.env.AI_GATEWAY_API_KEY?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (configuredToken) return configuredToken;
  if (!process.env.VERCEL) return null;
  try {
    return await getVercelOidcToken();
  } catch {
    return null;
  }
}
