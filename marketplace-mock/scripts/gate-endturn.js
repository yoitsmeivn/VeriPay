/**
 * Implementation gate: prove `beforeModel` + `canJumpTo: [END]` actually stops
 * the ReAct loop after record_agreement, using a fake model as a completion
 * counter. No network, no API cost.
 *
 *   node scripts/gate-endturn.js
 */
const { createAgent, FakeToolCallingModel } = require("langchain");
const { MemorySaver } = require("@langchain/langgraph");
const { listings } = require("../dist/data.js");
const { recordAgreementTool, findAgreementThisTurn } = require("../dist/agents/tools/agreement.js");
const { endTurnOnAgreementSkill } = require("../dist/agents/skills/endTurnOnAgreement.js");

const ps5 = listings.find((l) => l.id === "console-ps5");
const FLOOR = 370;

/**
 * Count real model invocations via an LLM callback, NOT via the fake model's
 * `indexRef`. That field is a modular index (`index = (index+1) % toolCalls.length`),
 * so it wraps to 0 after two completions and cannot be used as a counter.
 */
function build({ withMiddleware, toolCalls }) {
  const counter = { completions: 0 };
  const agent = createAgent({
    model: new FakeToolCallingModel({ toolCalls }),
    tools: [recordAgreementTool(ps5, FLOOR)],
    middleware: withMiddleware ? [endTurnOnAgreementSkill()] : [],
    checkpointer: new MemorySaver(),
  });
  const callbacks = [{ handleLLMStart: () => { counter.completions++; } }];
  return { agent, counter, callbacks };
}

const agreeThenIdle = [
  [{ name: "record_agreement", args: { agreedPrice: 400 }, id: "call_1" }],
  [], // a second completion, if the loop ever asks for one
];

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
};

(async () => {
  // --- Baseline: no middleware. Establishes that a 2nd completion happens. ---
  console.log("\n1. BASELINE (no middleware) - loop should request a 2nd completion");
  {
    const { agent, counter, callbacks } = build({ withMiddleware: false, toolCalls: agreeThenIdle });
    const res = await agent.invoke(
      { messages: [{ role: "user", content: "deal, $400" }] },
      { configurable: { thread_id: "baseline" }, callbacks }
    );
    check("model completions", counter.completions, 2);
    check("agreement visible to route", !!findAgreementThisTurn(res.messages), true);
  }

  // --- The mechanism under test ---
  console.log("\n2. WITH endTurnOnAgreement - loop must stop after the tool");
  {
    const { agent, counter, callbacks } = build({ withMiddleware: true, toolCalls: agreeThenIdle });
    const res = await agent.invoke(
      { messages: [{ role: "user", content: "deal, $400" }] },
      { configurable: { thread_id: "gated" }, callbacks }
    );
    check("model completions", counter.completions, 1);
    check("tool result still in state", !!findAgreementThisTurn(res.messages), true);
    const rec = findAgreementThisTurn(res.messages);
    check("agreed price readable", rec && rec.agreedPrice, 400);
  }

  // --- Scoping: a later turn must NOT be muted by the retained agreement ---
  console.log("\n3. SCOPING - a follow-up turn still gets a normal completion");
  {
    const toolCalls = [
      [{ name: "record_agreement", args: { agreedPrice: 400 }, id: "call_1" }],
      [], // follow-up turn's completion
      [],
    ];
    const { agent, counter, callbacks } = build({ withMiddleware: true, toolCalls });
    const cfg = { configurable: { thread_id: "scoped" }, callbacks };
    await agent.invoke({ messages: [{ role: "user", content: "deal, $400" }] }, cfg);
    const afterFirst = counter.completions;
    const res2 = await agent.invoke({ messages: [{ role: "user", content: "thanks!" }] }, cfg);
    check("completions on agreement turn", afterFirst, 1);
    check("follow-up turn ran the model", counter.completions > afterFirst, true);
    check("no agreement attributed to follow-up turn", !!findAgreementThisTurn(res2.messages), false);
  }

  // --- Below-floor must NOT end the turn (agent keeps negotiating) ---
  console.log("\n4. BELOW FLOOR - rejected agreement must not stop the loop");
  {
    const toolCalls = [
      [{ name: "record_agreement", args: { agreedPrice: 300 }, id: "call_1" }],
      [],
    ];
    const { agent, counter, callbacks } = build({ withMiddleware: true, toolCalls });
    const res = await agent.invoke(
      { messages: [{ role: "user", content: "$300 final" }] },
      { configurable: { thread_id: "floor" }, callbacks }
    );
    check("model completions", counter.completions, 2);
    check("no agreement recorded", !!findAgreementThisTurn(res.messages), false);
  }

  console.log(`\n${failures === 0 ? "GATE PASSED" : `GATE FAILED (${failures} check(s))`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("\nGATE ERRORED:", e.message);
  console.error(e.stack?.split("\n").slice(0, 6).join("\n"));
  process.exit(1);
});
