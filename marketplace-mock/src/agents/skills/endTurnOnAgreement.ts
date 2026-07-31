import { createMiddleware } from "langchain";
import { findAgreementThisTurn } from "../tools/agreement";

/**
 * Middleware jump targets are `["model", "tools", "end"]` (`JumpToTarget` in
 * langchain/dist/agents/constants). Note this is NOT LangGraph's `END`
 * sentinel ("__end__") - that belongs to the separate `JumpTo` type used
 * elsewhere in the agent internals, and passing it here fails typecheck.
 */
const JUMP_END = "end" as const;

/**
 * Ends the agent turn the moment an agreement is recorded.
 *
 * Without this, the ReAct loop returns to the model after `record_agreement`
 * runs and pays for a completion whose text is thrown away - the application
 * composes the confirmation, not the model.
 *
 * This is pure control flow. It reads no model output and rewrites nothing;
 * it only decides whether the loop continues.
 */
export function endTurnOnAgreementSkill() {
  return createMiddleware({
    name: "endTurnOnAgreement",
    beforeModel: {
      canJumpTo: [JUMP_END],
      hook: (state: any) =>
        findAgreementThisTurn(state.messages) ? { jumpTo: JUMP_END } : undefined,
    },
  });
}
