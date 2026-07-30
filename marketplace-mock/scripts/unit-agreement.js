/**
 * Unit tests for the application-owned agreement layer. No network, no API cost.
 *   node scripts/unit-agreement.js
 */
const { findListing } = require("../dist/data.js");
const { recordAgreementTool } = require("../dist/agents/tools/agreement.js");
const store = require("../dist/agreement/store.js");
const links = require("../dist/links/provider.js");
const { compose } = require("../dist/agreement/postAgreement.js");
const { rolesFor } = require("../dist/conversation/roles.js");

let failures = 0;
const check = (label, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}: ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
};

const ps5 = findListing("console-ps5");           // you buy  (floor $370)
const iphone = findListing("iphone-15-pro");      // you buy  (floor $700)
const wristbands = findListing("coachella-wristbands"); // you sell (ceiling $680)
const aeron = findListing("herman-miller-aeron");  // you sell (ceiling $540)
const URL_RE = /https?:\/\/|\bwww\./i;

(async () => {
  const PAYMENT_RE = /payment|link|checkout|invoice|pay\b/i;

  // --- 1. Agreement recording is unchanged (both directions) ---
  console.log("\n1. AGREEMENT RECORDING - unchanged, and mirrored per role");
  {
    const sellerSide = recordAgreementTool(ps5, 370, "floor");
    check("seller: $300 rejected (below floor)", JSON.parse(await sellerSide.invoke({ agreedPrice: 300 })).recorded, false);
    check("seller: $370 accepted (at floor)", JSON.parse(await sellerSide.invoke({ agreedPrice: 370 })).recorded, true);
    check("seller: $0 rejected", JSON.parse(await sellerSide.invoke({ agreedPrice: 0 })).recorded, false);

    const buyerSide = recordAgreementTool(wristbands, 680, "ceiling");
    check("buyer: $700 rejected (above ceiling)", JSON.parse(await buyerSide.invoke({ agreedPrice: 700 })).recorded, false);
    check("buyer: $650 accepted (below ceiling)", JSON.parse(await buyerSide.invoke({ agreedPrice: 650 })).recorded, true);
  }

  // --- 2. agreementId is stable and idempotent ---
  console.log("\n2. AGREEMENT ID idempotency");
  {
    store._reset();
    const base = { listingId: ps5.id, agreedPrice: 400, buyerId: "you", sellerId: "seller-1" };
    const first = store.upsert({ conversationId: "conv-A", ...base });
    const retry = store.upsert({ conversationId: "conv-A", ...base });
    const other = store.upsert({ conversationId: "conv-B", ...base });
    check("retry returns same id", retry.agreement.agreementId === first.agreement.agreementId, true);
    check("first is new", first.isNew, true);
    check("retry is not new", retry.isNew, false);
    check("different conversation gets a different id", other.agreement.agreementId !== first.agreement.agreementId, true);
    check("id is prefixed", first.agreement.agreementId.startsWith("agr_"), true);
  }

  // --- 3. BUYER-SIDE: agreement mentions no payment, thread stays open ---
  console.log("\n3. BUYER-SIDE agreement - confirmation only, no payment talk");
  {
    store._reset();
    let issueCalls = 0;
    const real = links.getLinkProvider();
    links.setLinkProvider({ async issue(r) { issueCalls++; return real.issue(r); } });

    for (const [label, listing, price] of [
      ["PS5", ps5, 400],
      ["iPhone 15 Pro", iphone, 750],
    ]) {
      const agreement = store.upsert({
        conversationId: `buy-${listing.id}`,
        listingId: listing.id,
        agreedPrice: price,
        buyerId: "you",
        sellerId: listing.seller.id,
      }).agreement;

      const events = await compose({ listing, agreement, roles: rolesFor("user-buys") });
      check(`${label}: confirmation only`, events.map((e) => e.type), ["message"]);
      check(`${label}: agent speaks as seller`, events[0].role, "seller");
      check(`${label}: states the agreed price`, events[0].text.includes(String(price).replace(/(\d)(?=(\d{3})+$)/, "$1,")), true);
      check(`${label}: no payment wording`, PAYMENT_RE.test(events[0].text), false);
      check(`${label}: no payment_link event`, events.some((e) => e.type === "payment_link"), false);
      check(`${label}: no "arrive separately" claim`, /arrive separately/i.test(JSON.stringify(events)), false);
      check(`${label}: no conversation_state event`, events.some((e) => e.type === "conversation_state"), false);
      check(`${label}: conversation stays open`, events.some((e) => e.type === "conversation_state" && e.state === "ended"), false);
    }

    check("LinkProvider never auto-triggered", issueCalls, 0);
    links.setLinkProvider(real);
  }

  // --- 4. SELLER-SIDE: same guarantees, inverse roles ---
  console.log("\n4. SELLER-SIDE agreement - confirmation only, no payment talk");
  {
    store._reset();
    const mac = wristbands;
    const sellRoles = rolesFor("user-sells");
    check("agent plays the buyer", sellRoles.agent, "buyer");
    check("user is the seller", sellRoles.user, "seller");

    let issueCalls = 0;
    const real = links.getLinkProvider();
    links.setLinkProvider({ async issue(r) { issueCalls++; return real.issue(r); } });

    const agreement = store.upsert({
      conversationId: "sell-1",
      listingId: mac.id,
      agreedPrice: 650,
      buyerId: "buyer-1",
      sellerId: "you",
    }).agreement;

    const events = await compose({ listing: mac, agreement, roles: sellRoles });
    check("confirmation only", events.map((e) => e.type), ["message"]);
    check("agent speaks as the buyer", events[0].role, "buyer");
    check("states the agreed price", /\$650/.test(events[0].text), true);
    check("no payment wording", PAYMENT_RE.test(events[0].text), false);
    check("no payment UI event", events.some((e) => ["payment_link", "send_link_action", "offer"].includes(e.type)), false);
    check("no conversation_state event", events.some((e) => e.type === "conversation_state"), false);
    check("conversation stays open", events.some((e) => e.type === "conversation_state" && e.state === "ended"), false);
    check("LinkProvider never auto-triggered", issueCalls, 0);
    links.setLinkProvider(real);
  }

  // --- 5. Both directions produce identical post-agreement shape ---
  console.log("\n5. BOTH FLOWS - identical post-agreement contract");
  {
    store._reset();
    const buy = await compose({
      listing: ps5,
      agreement: store.upsert({ conversationId: "b", listingId: ps5.id, agreedPrice: 400, buyerId: "you", sellerId: "seller-1" }).agreement,
      roles: rolesFor("user-buys"),
    });
    const sell = await compose({
      listing: aeron,
      agreement: store.upsert({ conversationId: "s", listingId: aeron.id, agreedPrice: 520, buyerId: "buyer-2", sellerId: "you" }).agreement,
      roles: rolesFor("user-sells"),
    });
    check("same event shape", buy.map((e) => e.type), sell.map((e) => e.type));
    check("neither closes the conversation", [...buy, ...sell].some((e) => e.type === "conversation_state"), false);
    check("neither mentions payment", PAYMENT_RE.test(JSON.stringify([...buy, ...sell])), false);
  }

  console.log(`\n${failures === 0 ? "UNIT TESTS PASSED" : `UNIT TESTS FAILED (${failures})`}`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => {
  console.error("ERRORED:", e.message);
  process.exit(1);
});
