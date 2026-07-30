import type { Express, Request } from "express";
import { auth } from "express-openid-connect";

/**
 * Auth0 login, so a one-time payment link can be bound to a real buyer instead
 * of the hardcoded "you" in src/data.ts.
 *
 * Auth is OPTIONAL and off unless configured. Without a tenant the mock still
 * runs end to end and buyerId falls back to the anonymous placeholder - making
 * login mandatory would brick the whole marketplace for anyone who just wants to
 * click around. Set the four AUTH0_* vars in .env.marketplace to turn it on.
 *
 * Note: this is Auth0's standard Express SDK, not `@auth0/ai-langchain`. That
 * package pins @langchain/core ^0.3 / langgraph ^0.4 / zod ^3 while this project
 * runs 1.2.4 / 1.4.8 / 4.4.3, so installing it would force a LangChain downgrade
 * that deletes createAgent and createMiddleware. See docs/AGENT_AUDIT.md.
 */

const ANONYMOUS_BUYER = "you";

export function isAuthConfigured(): boolean {
  return Boolean(
    process.env.AUTH0_ISSUER_BASE_URL &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_SECRET &&
      process.env.AUTH0_BASE_URL
  );
}

export function mountAuth(app: Express): void {
  if (!isAuthConfigured()) {
    console.log("[auth] AUTH0_* not set - running without login; buyer is anonymous.");
    return;
  }

  app.use(
    auth({
      authRequired: false, // browsing stays public; only chat needs a buyer
      auth0Logout: true,
      secret: process.env.AUTH0_SECRET,
      baseURL: process.env.AUTH0_BASE_URL,
      clientID: process.env.AUTH0_CLIENT_ID,
      issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
    })
  );
  console.log("[auth] Auth0 enabled - /login and /logout are available.");
}

/**
 * Stable identifier for the buyer side of an agreement. Prefers the Auth0
 * subject claim; falls back to the anonymous placeholder when login is off.
 */
export function getBuyerId(req: Request): string {
  const sub = (req as any).oidc?.user?.sub;
  return typeof sub === "string" && sub ? sub : ANONYMOUS_BUYER;
}

/** True when a real, authenticated buyer is behind the request. */
export function isAuthenticatedBuyer(req: Request): boolean {
  return Boolean((req as any).oidc?.isAuthenticated?.());
}
