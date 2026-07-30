import type { Listing } from "../data";
import type { Agreement } from "./store";
import type { Roles } from "../conversation/roles";
import { ChatEvent, agentMessage } from "../chat/events";

const money = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * Owns what the user sees once an agreement is recorded.
 *
 * Agreement and payment are separate events. Reaching a price says nothing
 * about how the money moves, so this confirms the deal and stops there - no
 * link, no promise that one is coming, no state change. The thread stays open
 * and the two parties arrange payment themselves, as ordinary conversation.
 *
 * The model is not involved: the confirmation is composed here, so it cannot
 * drift into inventing a checkout step.
 *
 * Payment infrastructure (`src/links/provider.ts`, the `payment_link` and
 * `conversation_state` events) is still wired up and rendered by the client -
 * it is simply never triggered by an agreement. A genuine external event is
 * what should emit those, if one is ever added.
 */
export async function compose(args: {
  listing: Listing;
  agreement: Agreement;
  roles: Roles;
}): Promise<ChatEvent[]> {
  const { listing, agreement, roles } = args;
  return [
    agentMessage(
      `Great - we're agreed at ${money(agreement.agreedPrice)} for the ${listing.title}.`,
      roles.agent
    ),
  ];
}
