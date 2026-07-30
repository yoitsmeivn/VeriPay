/**
 * Who is who in a conversation.
 *
 * Stated explicitly per listing rather than inferred from the data, because
 * inferring it (e.g. "is listing.seller.id === 'you'?") spreads an implicit
 * rule across every consumer. One field, resolved once, used everywhere.
 */

export type Party = "buyer" | "seller";

/** user-buys: the classic flow. user-sells: the inverse - the agent is shopping. */
export type ConversationDirection = "user-buys" | "user-sells";

export interface Roles {
  /** What the human is. */
  user: Party;
  /** What the chatbot is. */
  agent: Party;
  /**
   * Which side the agent's walk-away price sits on. A seller will not go below
   * its floor; a buyer will not go above its ceiling.
   */
  limitKind: "floor" | "ceiling";
}

const TABLE: Record<ConversationDirection, Roles> = {
  "user-buys": {
    user: "buyer",
    agent: "seller",
    limitKind: "floor",
  },
  "user-sells": {
    user: "seller",
    agent: "buyer",
    limitKind: "ceiling",
  },
};

export const rolesFor = (direction: ConversationDirection): Roles => TABLE[direction];
