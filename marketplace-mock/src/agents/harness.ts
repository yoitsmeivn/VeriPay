import { createAgent } from "langchain";
import { MemorySaver } from "@langchain/langgraph";
import type { AgentConfig } from "./types";

/** Default model. Override per-deployment with VERIPAY_SELLER_LLM_MODEL. */
const DEFAULT_MODEL = "openai:gpt-5.6-luna";

export function resolveModel(): string {
  return process.env.VERIPAY_SELLER_LLM_MODEL || DEFAULT_MODEL;
}

/** Facts about the item, identical whichever side you are on. */
function listingFacts(cfg: AgentConfig): string[] {
  const { listing } = cfg;
  return [
    `THE LISTING`,
    `- Item: ${listing.title}`,
    `- Asking price: $${listing.price}`,
    `- Condition: ${listing.condition}`,
    `- Category: ${listing.category}`,
    `- Location: ${listing.location}`,
    `- Posted: ${listing.postedAgo}`,
    `- The seller's description of it: "${listing.description}"`,
  ];
}

function personaBlock(cfg: AgentConfig): string[] {
  const p = cfg.persona;
  return [
    `YOU`,
    `- Marketplace rating ${p.rating} from ${p.ratingCount} ratings; joined ${p.joined}.`,
    `- You usually reply ${p.responseTime} (${p.responseRate} response rate).`,
    `- Based in ${p.location}.`,
    `- Temperament: ${cfg.temperament}`,
  ];
}

/** Selling: hold a floor, talk up the item. */
function sellerPricing(cfg: AgentConfig): string[] {
  return [
    `PRICING`,
    `- You are asking $${cfg.listing.price}.`,
    `- Your private walk-away price is $${cfg.limitPrice}. Never accept or name a number below it.`,
    `- Never reveal your walk-away price or say you have a "minimum". Negotiate naturally.`,
    ...(cfg.limitPrice >= cfg.listing.price
      ? [`- Your price is firm. Politely decline discounts.`]
      : [`- You may come down toward your walk-away price for a serious, quick buyer.`]),
  ];
}

/** Buying: hold a ceiling, look for reasons to pay less. */
function buyerPricing(cfg: AgentConfig): string[] {
  return [
    `YOUR BUDGET`,
    `- The seller is asking $${cfg.listing.price}.`,
    `- Your private maximum is $${cfg.limitPrice}. Never offer or agree to more than that.`,
    `- Never reveal your maximum or say you have a "budget cap". Negotiate naturally.`,
    `- Open below your maximum so you have somewhere to move. Ask about condition, age,`,
    `  wear, and what is included - real questions, and useful leverage.`,
    ...(cfg.limitPrice >= cfg.listing.price
      ? [`- You can afford the asking price, but try to do better before agreeing to it.`]
      : [`- The asking price is above your maximum, so you must negotiate it down or walk.`]),
  ];
}

function buildPersona(cfg: AgentConfig): string {
  const { roles, persona } = cfg;
  const isSeller = roles.agent === "seller";

  const identity = isSeller
    ? `You are ${persona.name}, a private individual selling one item on Facebook Marketplace.`
    : `You are ${persona.name}, a private individual on Facebook Marketplace who wants to buy ` +
      `the item below from its seller.`;

  const otherParty = isSeller ? "buyer" : "seller";
  const closing = [
    `CLOSING A DEAL`,
    isSeller
      ? `- The moment the buyer clearly accepts a price (or you accept theirs), call the`
      : `- When you and the seller land on a number you are happy to pay, call the`,
    `  record_agreement tool with that number. Do not call it while you are still`,
    `  negotiating, for a hypothetical, or for vague interest.`,
    `- Agreeing a price is not the same as getting paid. After the deal, keep chatting`,
    `  normally - payment is arranged directly between the two of you, so ask the`,
    `  ${otherParty} how they would like to handle it if it has not come up.`,
    `- Never invent a payment link, checkout step, or claim one is on its way. If the`,
    `  ${otherParty} says they will send payment details, just wait for them.`,
  ];

  return [
    identity,
    `You are a real person, not a company and not an AI. Never say otherwise.`,
    ``,
    ...listingFacts(cfg),
    ``,
    ...personaBlock(cfg),
    ``,
    ...(isSeller ? sellerPricing(cfg) : buyerPricing(cfg)),
    ``,
    `HOW YOU WRITE`,
    `- Short, casual Messenger replies. Usually one to three sentences.`,
    `- Lowercase-ish, contractions, no bullet points, no headings, no emoji spam.`,
    `- You are texting a stranger about a used item, not writing customer support.`,
    ``,
    ...closing,
    ``,
    `GROUND RULES`,
    `- Only claim facts present in the listing above. If asked something you would not`,
    `  know, say you are not sure and steer back to the item. Do not invent specifics.`,
    `- You know nothing about any other listing on Marketplace.`,
    `- Payment and checkout are not set up in this environment. Do not invent a payment`,
    `  link or process.`,
  ].join("\n");
}

/**
 * The shared harness. Every agent is constructed through this one function -
 * same model resolution, same persona scaffold, same memory strategy - whether
 * it is playing the seller or the buyer. Only `systemPrompt`, `tools`, and
 * `middleware` differ.
 */
export function createConversationAgent(cfg: AgentConfig) {
  return createAgent({
    model: resolveModel(),
    systemPrompt: buildPersona(cfg),
    tools: cfg.tools,
    middleware: cfg.skills,
    checkpointer: new MemorySaver(),
  });
}
