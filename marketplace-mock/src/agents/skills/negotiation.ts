import { createMiddleware, AIMessage } from "langchain";

/** Pull plain text out of an AIMessage whose content may be a string or block array. */
export function messageText(message: AIMessage): string {
  const content = message.content as unknown;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((block: any) => (typeof block === "string" ? block : block?.text ?? ""))
      .join(" ");
  }
  return "";
}

/** Every dollar figure mentioned in a reply, e.g. "$380" or "380 dollars". */
function pricesIn(text: string): number[] {
  const found: number[] = [];
  const dollarSign = /\$\s?(\d[\d,]*)/g;
  const spelled = /(\d[\d,]*)\s*(?:dollars|bucks)\b/gi;
  for (const re of [dollarSign, spelled]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const n = Number(m[1].replace(/,/g, ""));
      if (Number.isFinite(n)) found.push(n);
    }
  }
  return found;
}

/**
 * Negotiation skill.
 *
 * The persona prompt tells the seller its own floor so it can counter-offer
 * sensibly, but a prompt alone will not hold under a persistent lowballer -
 * models concede when pushed. This middleware is the backstop: it inspects
 * every outgoing reply and refuses to let one through that names a number
 * below the floor.
 *
 * One corrective retry first (which usually produces a good counter-offer),
 * then a deterministic fallback so the floor holds even if the model insists.
 */
export function negotiationSkill(opts: {
  limitPrice: number;
  askingPrice: number;
  limitKind: "floor" | "ceiling";
}) {
  const { limitPrice, askingPrice, limitKind } = opts;
  const isFloor = limitKind === "floor";
  const breaches = (p: number) => p > 0 && (isFloor ? p < limitPrice : p > limitPrice);

  return createMiddleware({
    name: `negotiation(${limitKind}=${limitPrice})`,

    wrapModelCall: async (request, handler) => {
      const first = await handler(request);
      if (!(first instanceof AIMessage)) return first;

      const breached = pricesIn(messageText(first)).filter(breaches);
      if (breached.length === 0) return first;

      // Retry once, reminding the seller of its own walk-away number.
      const corrective = isFloor
        ? `PRICING CORRECTION: your previous draft named $${Math.min(...breached)}, ` +
          `which is below your walk-away price of $${limitPrice}. You are asking ` +
          `$${askingPrice}. Never name or agree to any number below $${limitPrice}. ` +
          `Hold firm politely - counter at or above your floor, or restate your price ` +
          `and offer a non-price sweetener instead. Do not mention this correction.`
        : `PRICING CORRECTION: your previous draft named $${Math.max(...breached)}, ` +
          `which is above your maximum of $${limitPrice}. The seller is asking ` +
          `$${askingPrice}. Never name or agree to any number above $${limitPrice}. ` +
          `Hold firm politely - counter at or below your maximum, or explain why the ` +
          `item is worth less to you. Do not mention this correction.`;

      const retried = await handler({
        ...request,
        systemMessage: request.systemMessage.concat(`\n\n${corrective}`),
      });

      if (!(retried instanceof AIMessage)) return retried;
      const stillBreached = pricesIn(messageText(retried)).filter(breaches);
      if (stillBreached.length === 0) return retried;

      // Model would not hold the line - substitute a safe reply rather than
      // let an under-floor commitment reach the buyer.
      return new AIMessage(
        isFloor
          ? `I appreciate the offer, but $${limitPrice} is genuinely as low as I can go on this ` +
            `one. If that works for you I'm happy to sort out a pickup time.`
          : `I'd love to, but $${limitPrice} is genuinely the most I can stretch to. If that ` +
            `works for you I'm ready to go ahead.`
      );
    },
  });
}
