import type { Listing, Seller } from "../data";
import type { ConversationDirection, Roles } from "../conversation/roles";

/**
 * Everything the harness needs to build one agent, whichever side it plays.
 * Every agent supplies the same shape - only the values differ - so
 * `createConversationAgent` stays a single code path.
 */
export interface AgentConfig {
  listing: Listing;
  direction: ConversationDirection;
  roles: Roles;
  /** The person the agent plays: the seller, or an interested buyer. */
  persona: Seller;
  /**
   * The agent's walk-away price. A seller will not go below it; a buyer will
   * not go above it. `roles.limitKind` says which.
   */
  limitPrice: number;
  /** Persona-specific traits folded into the prompt. */
  temperament: string;
  /** Middleware units - the "skills" this agent has. */
  skills: any[];
  /** Tools this agent can call. */
  tools: any[];
}
