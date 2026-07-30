import { findListing } from "../data";
import { createConversationAgent } from "./harness";
import { negotiationSkill } from "./skills/negotiation";
import { pickupSchedulingSkill } from "./skills/pickupScheduling";
import { stayInCharacterSkill } from "./skills/stayInCharacter";
import { endTurnOnAgreementSkill } from "./skills/endTurnOnAgreement";
import { checkAvailabilityTool, getListingFactsTool } from "./tools";
import { recordAgreementTool } from "./tools/agreement";
import { rolesFor, type ConversationDirection, type Roles } from "../conversation/roles";
import type { AgentConfig } from "./types";

interface Tuning {
  /**
   * Who plays which side. Stated explicitly rather than inferred from the
   * listing, so no consumer has to guess.
   */
  direction: ConversationDirection;
  /** The agent's walk-away price: a floor when selling, a ceiling when buying. */
  limitPrice: number;
  temperament: string;
  canSchedulePickup: boolean;
}

/**
 * Per-listing tuning. Everything else is derived from `src/data.ts` so the
 * agents and the UI can never disagree about price, condition, or location.
 */
const TUNING: Record<string, Tuning> = {
  // ---- You are BUYING these. The agent plays the seller. ----
  "console-ps5": {
    direction: "user-buys",
    limitPrice: 370, // floor - won't sell below this
    temperament:
      "Easygoing gamer. Happy to answer questions about the console's condition and what's " +
      "in the box, and relaxed about meeting up, but not in a hurry to discount.",
    canSchedulePickup: true,
  },
  "iphone-15-pro": {
    direction: "user-buys",
    limitPrice: 700, // floor
    temperament:
      "Brisk and businesslike. You know exactly what the phone is worth, you have the battery " +
      "health and box to prove it, and you expect a buyer who has done their homework.",
    canSchedulePickup: true,
  },

  // ---- You are SELLING these. The agent plays an interested buyer. ----
  "coachella-wristbands": {
    direction: "user-sells",
    limitPrice: 680, // ceiling - won't pay above this
    temperament:
      "Enthusiastic festival-goer who really wants to go, but has been burned by ticket scams " +
      "before. You ask about activation status and whether you can inspect them in person, " +
      "and you push on price because you know resale wristbands vary a lot.",
    canSchedulePickup: false, // the seller (you) arranges the handoff
  },
  "herman-miller-aeron": {
    direction: "user-sells",
    limitPrice: 540, // ceiling
    temperament:
      "Practical remote worker kitting out a home office. You know Aeron model differences and " +
      "ask specific questions - size, lumbar support, arm adjustability, mesh condition - and " +
      "you use any wear you find as a reason to negotiate down.",
    canSchedulePickup: false, // the seller (you) arranges the handoff
  },
};

function buildConfig(listingId: string): AgentConfig {
  const listing = findListing(listingId);
  if (!listing) throw new Error(`Unknown listing: ${listingId}`);

  const tuning = requireTuning(listingId);
  const roles = rolesFor(tuning.direction);
  const itemLabel = listing.title;

  // The agent plays the seller on listings you are buying, and the interested
  // buyer (listing.counterparty) on listings you are selling.
  const persona = roles.agent === "seller" ? listing.seller : listing.counterparty;
  if (!persona) {
    throw new Error(`Listing ${listingId} is user-sells but has no counterparty persona`);
  }

  const skills: any[] = [
    endTurnOnAgreementSkill(),
    stayInCharacterSkill({ personaName: persona.name, itemLabel, role: roles.agent }),
    negotiationSkill({
      limitPrice: tuning.limitPrice,
      askingPrice: listing.price,
      limitKind: roles.limitKind,
    }),
  ];
  if (tuning.canSchedulePickup) {
    skills.push(pickupSchedulingSkill({ location: persona.location, itemLabel }));
  }

  return {
    listing,
    direction: tuning.direction,
    roles,
    persona,
    limitPrice: tuning.limitPrice,
    temperament: tuning.temperament,
    skills,
    tools: [
      getListingFactsTool(listing),
      checkAvailabilityTool(listing),
      recordAgreementTool(listing, tuning.limitPrice, roles.limitKind),
    ],
  };
}

/** Agents are built lazily and cached, so no model client is created at import time. */
const cache = new Map<string, ReturnType<typeof createConversationAgent>>();

export function getAgent(listingId: string) {
  let agent = cache.get(listingId);
  if (!agent) {
    agent = createConversationAgent(buildConfig(listingId));
    cache.set(listingId, agent);
  }
  return agent;
}

export function isKnownListing(listingId: string): boolean {
  return Boolean(findListing(listingId)) && listingId in TUNING;
}

export const getDirection = (listingId: string): ConversationDirection =>
  requireTuning(listingId).direction;

export const getRoles = (listingId: string): Roles => rolesFor(getDirection(listingId));

function requireTuning(listingId: string): Tuning {
  const tuning = TUNING[listingId];
  if (!tuning) throw new Error(`No agent tuning configured for listing: ${listingId}`);
  return tuning;
}
