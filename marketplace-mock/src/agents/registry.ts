import { findListing } from "../db/listings";
import { createConversationAgent } from "./harness";
import { negotiationSkill } from "./skills/negotiation";
import { pickupSchedulingSkill } from "./skills/pickupScheduling";
import { stayInCharacterSkill } from "./skills/stayInCharacter";
import { endTurnOnAgreementSkill } from "./skills/endTurnOnAgreement";
import { checkAvailabilityTool, getListingFactsTool } from "./tools";
import { recordAgreementTool } from "./tools/agreement";
import { rolesFor, type ConversationDirection, type Roles } from "../conversation/roles";
import type { AgentConfig } from "./types";

function buildConfig(listingId: string): AgentConfig {
  const listing = findListing(listingId);
  if (!listing) throw new Error(`Unknown listing: ${listingId}`);

  const direction = listing.agentDirection;
  const roles = rolesFor(direction);
  const itemLabel = listing.title;

  const persona = roles.agent === "seller" ? listing.seller : listing.counterparty;
  if (!persona) {
    throw new Error(`Listing ${listingId} is user-sells but has no counterparty persona`);
  }

  const skills: any[] = [
    endTurnOnAgreementSkill(),
    stayInCharacterSkill({ personaName: persona.name, itemLabel, role: roles.agent }),
    negotiationSkill({
      limitPrice: listing.agentLimitPrice,
      askingPrice: listing.price,
      limitKind: roles.limitKind,
    }),
  ];
  if (listing.agentCanSchedulePickup) {
    skills.push(pickupSchedulingSkill({ location: persona.location, itemLabel }));
  }

  return {
    listing,
    direction,
    roles,
    persona,
    limitPrice: listing.agentLimitPrice,
    temperament: listing.agentTemperament,
    skills,
    tools: [
      getListingFactsTool(listing),
      checkAvailabilityTool(listing),
      recordAgreementTool(listing, listing.agentLimitPrice, roles.limitKind),
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

export function clearAgentCache(listingId?: string): void {
  if (listingId) {
    cache.delete(listingId);
    return;
  }
  cache.clear();
}

export function isKnownListing(listingId: string): boolean {
  return Boolean(findListing(listingId));
}

export const getDirection = (listingId: string): ConversationDirection => {
  const listing = findListing(listingId);
  if (!listing) throw new Error(`Unknown listing: ${listingId}`);
  return listing.agentDirection;
};

export const getRoles = (listingId: string): Roles => rolesFor(getDirection(listingId));
