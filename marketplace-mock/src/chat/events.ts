/**
 * The chat wire format.
 *
 * Every /api/chat response returns an ordered list of events. Adding a
 * capability later (pickup scheduling, verification, receipts) means adding an
 * event type, not another optional top-level field - and because the server
 * emits discrete events, two messages can never collapse into one.
 */

export interface MessageEvent {
  type: "message";
  /** Which side of the deal the agent is speaking as. */
  role: "seller" | "buyer";
  text: string;
}

export interface PaymentLinkEvent {
  type: "payment_link";
  text: string;
  agreementId: string;
  url: string | null;
  expiresAt: string | null;
  /** "pending_link_service" until the real link service is wired up. */
  status: string;
}

/**
 * `ended` is terminal - the client closes the composer.
 * `awaiting_buyer_link` is a *waiting* state: the deal is done and the buyer's
 * own system will deliver the payment link, but the thread stays open so that
 * link (and any further conversation) can still land here.
 */
export type ConversationState = "ended" | "awaiting_buyer_link";

export interface ConversationStateEvent {
  type: "conversation_state";
  state: ConversationState;
  reason: string;
  agreementId?: string;
  /** Optional: omit when the preceding message already says everything needed. */
  text?: string;
}

export type ChatEvent = MessageEvent | PaymentLinkEvent | ConversationStateEvent;

export const agentMessage = (
  text: string,
  role: "seller" | "buyer" = "seller"
): MessageEvent => ({
  type: "message",
  role,
  text,
});

export const paymentLink = (args: {
  text: string;
  agreementId: string;
  url: string | null;
  expiresAt?: string | null;
  status: string;
}): PaymentLinkEvent => ({
  type: "payment_link",
  text: args.text,
  agreementId: args.agreementId,
  url: args.url,
  expiresAt: args.expiresAt ?? null,
  status: args.status,
});

export const conversationState = (args: {
  state: ConversationState;
  reason: string;
  agreementId?: string;
  text?: string;
}): ConversationStateEvent => ({
  type: "conversation_state",
  state: args.state,
  reason: args.reason,
  agreementId: args.agreementId,
  text: args.text,
});
