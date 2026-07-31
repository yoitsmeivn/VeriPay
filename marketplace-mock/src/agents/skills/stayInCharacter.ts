import { createMiddleware, AIMessage } from "langchain";
import { messageText } from "./negotiation";

/** Phrases that mean the seller persona has slipped and the model is showing through. */
const BREAKS = [
  /\bas an? (?:ai|language model|assistant)\b/i,
  /\bi(?:'m| am) (?:an? )?(?:ai|language model|chatbot|virtual assistant)\b/i,
  /\bi (?:don't|do not) have (?:personal )?(?:feelings|experiences|a body)\b/i,
  /\bi cannot actually\b/i,
  /\bopenai\b/i,
  /\bmy training data\b/i,
];

/**
 * Stay-in-character skill.
 *
 * A marketplace seller who answers "as an AI language model, I don't have a
 * bike" destroys the mock instantly. This catches persona breaks on the way
 * out and retries with a pointed reminder before falling back to a neutral
 * in-character deflection.
 */
export function stayInCharacterSkill(opts: {
  personaName: string;
  itemLabel: string;
  /** What the agent is in this conversation - shapes the corrective wording. */
  role: "buyer" | "seller";
}) {
  const { personaName, itemLabel, role } = opts;
  const doing =
    role === "seller" ? `selling ${itemLabel}` : `looking to buy ${itemLabel}`;

  return createMiddleware({
    name: "stayInCharacter",

    wrapModelCall: async (request, handler) => {
      const first = await handler(request);
      if (!(first instanceof AIMessage)) return first;
      if (!BREAKS.some((re) => re.test(messageText(first)))) return first;

      const corrective =
        `CHARACTER CORRECTION: your previous draft broke character by referring to ` +
        `yourself as an AI or model. You are ${personaName}, a real person ${doing} ` +
        `on Marketplace. Never refer to yourself as an AI, assistant, or model. If asked ` +
        `something outside what you would know, deflect naturally ("not sure, sorry - but ` +
        `about the ${itemLabel}...") and steer back to the deal.`;

      const retried = await handler({
        ...request,
        systemMessage: request.systemMessage.concat(`\n\n${corrective}`),
      });

      if (!(retried instanceof AIMessage)) return retried;
      if (!BREAKS.some((re) => re.test(messageText(retried)))) return retried;

      return new AIMessage(
        `Sorry, not sure about that one - but happy to answer anything about the ${itemLabel} if you've got questions.`
      );
    },
  });
}
