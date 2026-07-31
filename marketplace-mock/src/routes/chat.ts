import { Router } from "express";
import { randomUUID } from "crypto";
import { findListing } from "../db/listings";
import { getAgent, isKnownListing, getRoles } from "../agents/registry";
import { findAgreementThisTurn } from "../agents/tools/agreement";
import { messageText } from "../agents/skills/negotiation";
import * as store from "../agreement/store";
import { compose } from "../agreement/postAgreement";
import { agentMessage, ChatEvent } from "../chat/events";
import { getBuyerId } from "../auth";

const router = Router();

// POST /api/chat - talk to the seller agent for a listing.
// Body: { listingId, message, conversationId? }
// Returns an ordered event list; see src/chat/events.ts.
router.post("/", async (req, res) => {
  const { listingId, message, conversationId } = req.body ?? {};

  if (typeof listingId !== "string" || !listingId) {
    return res.status(400).json({ error: "listingId is required" });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }
  if (!isKnownListing(listingId)) {
    return res.status(404).json({ error: "Listing not found" });
  }
  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error:
        "Seller agent is not configured. Set OPENAI_API_KEY in .env.marketplace and restart the server.",
    });
  }

  const threadId =
    typeof conversationId === "string" && conversationId ? conversationId : randomUUID();

  try {
    const agent = getAgent(listingId);
    const result = await agent.invoke(
      { messages: [{ role: "user", content: message }] },
      { configurable: { thread_id: threadId } }
    );

    const messages = (result as any).messages ?? [];
    const recorded = findAgreementThisTurn(messages);
    const roles = getRoles(listingId);

    // No deal this turn: the agent's own reply is the whole response.
    if (!recorded) {
      const last = messages[messages.length - 1];
      const reply = last ? messageText(last) : "";
      if (!reply.trim()) {
        return res.status(502).json({ error: "Seller did not respond. Try again." });
      }
      return res.json({
        conversationId: threadId,
        events: [agentMessage(reply, roles.agent)],
      });
    }

    // Deal struck. From here the application owns the conversation - the agent's
    // turn already ended at the tool call, so there is no model prose involved.
    const listing = findListing(listingId)!;

    // Whichever side the human is on, they are one party and the agent's
    // persona is the other. Roles are declared per listing, never inferred.
    const humanId = getBuyerId(req);
    const { agreement } = store.upsert({
      conversationId: threadId,
      listingId,
      agreedPrice: recorded.agreedPrice,
      buyerId: roles.user === "buyer" ? humanId : listing.counterparty!.id,
      sellerId: roles.user === "seller" ? humanId : listing.seller.id,
    });

    const events: ChatEvent[] = await compose({ listing, agreement, roles });

    return res.json({
      conversationId: threadId,
      agreementId: agreement.agreementId,
      events,
    });
  } catch (err) {
    console.error("[chat] agent error:", err);
    res.status(502).json({ error: "Could not reach the seller right now." });
  }
});

export default router;
