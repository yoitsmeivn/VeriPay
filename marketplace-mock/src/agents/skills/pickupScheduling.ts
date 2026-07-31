import { createMiddleware, tool } from "langchain";
import * as z from "zod";

/**
 * Pickup-scheduling skill.
 *
 * Demonstrates a skill that ships its own tool: `createMiddleware` accepts a
 * `tools` array, so attaching this one middleware gives the seller both the
 * scheduling behaviour and the tool it needs to carry it out. Sellers without
 * this skill have no way to propose a window.
 */
export function pickupSchedulingSkill(opts: { location: string; itemLabel: string }) {
  const { location, itemLabel } = opts;

  const proposePickupWindow = tool(
    ({ day, timeRange, place }) => {
      return JSON.stringify({
        confirmed: false,
        proposal: { day, timeRange, place: place ?? `a public spot in ${location}` },
        note: "Proposed to buyer; awaiting confirmation.",
      });
    },
    {
      name: "propose_pickup_window",
      description:
        "Propose a specific day, time range, and meeting place for the buyer to " +
        "pick up the item. Use when the buyer signals they want to arrange a handoff.",
      schema: z.object({
        day: z.string().describe("Day of the week or date, e.g. 'Saturday'"),
        timeRange: z.string().describe("Time window, e.g. '10am-noon'"),
        place: z.string().optional().describe("Meeting spot; defaults to a public place"),
      }),
    }
  );

  return createMiddleware({
    name: "pickupScheduling",
    tools: [proposePickupWindow],

    wrapModelCall: async (request, handler) => {
      const guidance =
        `PICKUP LOGISTICS: you are local to ${location} and the handoff is in person. ` +
        `The item is ${itemLabel}. When the buyer shows real interest, propose a concrete ` +
        `day and time window via the propose_pickup_window tool rather than asking an ` +
        `open-ended "when are you free?". Prefer daylight hours in a public place.`;

      return handler({
        ...request,
        systemMessage: request.systemMessage.concat(`\n\n${guidance}`),
      });
    },
  });
}
