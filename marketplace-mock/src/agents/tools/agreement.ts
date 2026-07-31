import { tool } from "langchain";
import * as z from "zod";
import type { Listing } from "../../data";

/** Marker the control-flow middleware and the route both look for. */
export const RECORD_AGREEMENT_TOOL = "record_agreement";

export interface RecordedAgreement {
  recorded: true;
  agreedPrice: number;
}

/**
 * Records that buyer and seller reached a deal. That is its whole job.
 *
 * It deliberately produces no user-facing text: the confirmation message, the
 * payment link, and ending the conversation are all owned by the application
 * layer (`src/agreement/postAgreement.ts`). The model decides *whether* there
 * is an agreement; it does not decide what the buyer sees afterwards.
 *
 * The floor check lives here rather than in middleware because it is a
 * validation rule on a state transition - it stops the agent recording a deal
 * it was never allowed to accept, even if it routed around the negotiation
 * middleware's output check.
 */
export function recordAgreementTool(
  listing: Listing,
  limitPrice: number,
  limitKind: "floor" | "ceiling" = "floor"
) {
  return tool(
    ({ agreedPrice }) => {
      if (!Number.isFinite(agreedPrice) || agreedPrice <= 0) {
        return JSON.stringify({
          recorded: false,
          error: "agreedPrice must be a positive number.",
        });
      }
      // A seller must not go below its floor; a buyer must not go above its
      // ceiling. Same guard, mirrored - so neither side can record a deal it
      // was never allowed to accept.
      const breached =
        limitKind === "floor" ? agreedPrice < limitPrice : agreedPrice > limitPrice;
      if (breached) {
        return JSON.stringify({
          recorded: false,
          error:
            `$${agreedPrice} is ${limitKind === "floor" ? "below" : "above"} what you can ` +
            `accept. Do not record this agreement - keep negotiating or hold your price.`,
        });
      }
      return JSON.stringify({ recorded: true, agreedPrice } satisfies RecordedAgreement);
    },
    {
      name: RECORD_AGREEMENT_TOOL,
      description:
        "Record that you and the other party have agreed on a final price. Call this ONLY once " +
        "a specific number has clearly been accepted by both of you. Do not call it for " +
        "hypotheticals, partial interest, or an offer you are still countering.",
      schema: z.object({
        agreedPrice: z
          .number()
          .describe(`The agreed price in dollars for "${listing.title}"`),
      }),
    }
  );
}

/**
 * Did a *successful* record_agreement land during the current turn?
 *
 * Scoped to messages after the last human turn on purpose. The checkpointer
 * retains history, so an unscoped check would match the agreement forever and
 * short-circuit every later turn - wrong for listings that keep chatting after
 * the link is sent.
 */
export function findAgreementThisTurn(messages: any[]): RecordedAgreement | null {
  if (!Array.isArray(messages)) return null;

  let start = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const type = messages[i]?.getType?.() ?? messages[i]?._getType?.();
    if (type === "human") {
      start = i;
      break;
    }
  }

  for (let i = start; i < messages.length; i++) {
    const m = messages[i];
    const type = m?.getType?.() ?? m?._getType?.();
    if (type !== "tool" || m?.name !== RECORD_AGREEMENT_TOOL) continue;
    try {
      const parsed = JSON.parse(
        typeof m.content === "string" ? m.content : JSON.stringify(m.content)
      );
      if (parsed?.recorded === true) return parsed as RecordedAgreement;
    } catch {
      // Unparseable tool result - treat as no agreement.
    }
  }
  return null;
}
