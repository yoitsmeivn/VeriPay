import { tool } from "langchain";
import * as z from "zod";
import type { Listing } from "../../data";

/**
 * Tools are built per-listing so each seller can only ever read its own item.
 * A seller physically cannot answer about another listing - there is no code
 * path to it.
 */

export function checkAvailabilityTool(listing: Listing) {
  return tool(
    () =>
      JSON.stringify({
        listingId: listing.id,
        available: true,
        holdsAccepted: true,
        note: `Still available. Listed ${listing.postedAgo}.`,
      }),
    {
      name: "check_availability",
      description:
        "Check whether your item is still available and whether you can hold it. " +
        "Use when the buyer asks 'is this still available?' or wants it held.",
      schema: z.object({}),
    }
  );
}

export function getListingFactsTool(listing: Listing) {
  return tool(
    ({ topic }) => {
      const facts: Record<string, unknown> = {
        title: listing.title,
        askingPrice: listing.price,
        condition: listing.condition,
        category: listing.category,
        location: listing.location,
        distance: listing.distance,
        postedAgo: listing.postedAgo,
        description: listing.description,
      };
      if (topic && topic in facts) return JSON.stringify({ [topic]: facts[topic] });
      return JSON.stringify(facts);
    },
    {
      name: "get_listing_facts",
      description:
        "Look up the verified facts about your own listing (condition, price, " +
        "location, full description). Use this before answering any factual question " +
        "about the item so you never guess at specifics.",
      schema: z.object({
        topic: z
          .string()
          .optional()
          .describe("Optional single field, e.g. 'condition' or 'description'"),
      }),
    }
  );
}
