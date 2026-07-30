# Marketplace (Mock)

A mock Facebook Marketplace: Node.js + Express + TypeScript backend, plain HTML/CSS/JS frontend.

Self-contained under `marketplace-mock/` so it stays out of the way of the main VeriPay repo -
its own `package.json`, `tsconfig.json`, `node_modules/`, and `.gitignore` live here. All paths
below are relative to this folder.

## Run it

The seller agents call the OpenAI API, so they need a key. It lives in
`.env.marketplace` at the **repo root** (one level up), which is gitignored:

```
OPENAI_API_KEY=sk-...
VERIPAY_SELLER_LLM_MODEL=openai:gpt-4o-mini   # optional; see "Model" below

# Optional - enables Auth0 login. Without these the app runs fine and the
# buyer is anonymous.
AUTH0_ISSUER_BASE_URL=https://YOUR_TENANT.us.auth0.com
AUTH0_CLIENT_ID=...
AUTH0_SECRET=...                              # 32+ random bytes
AUTH0_BASE_URL=http://localhost:3000
```

Then:

```
cd marketplace-mock
npm install
npm run dev       # dev server with auto-reload, http://localhost:3000
```

or build + run production style:

```
npm install
npm run build
npm start
```

## What's here

- `src/server.ts` - Express app, serves the API and the static frontend
- `src/data.ts` - in-memory listings, sellers, and orders (no real database yet)
- `src/routes/listings.ts` - `GET /api/listings`, `GET /api/listings/:id`
- `src/routes/buy.ts` - `POST /api/buy` creates a mock order and returns an order link (not called by the UI yet)
- `src/routes/orders.ts` - `GET /api/orders/:id`
- `src/routes/chat.ts` - `POST /api/chat`, the seller agent endpoint
- `src/agents/` - the seller agents (see below)
- `src/agreement/` - agreement store + application-owned post-agreement messages
- `src/chat/events.ts` - the chat event wire format
- `src/links/provider.ts` - seam for the external payment-link service
- `src/auth.ts` - Auth0 login (optional)
- `docs/AGENT_AUDIT.md` - full architecture audit
- `public/index.html` - marketplace grid (items to buy) plus the My Listings section (items you sell)
- `public/listing.html` - item detail page: photo, description, seller card, Message Seller
- `public/order.html` - order/checkout stub page (no longer reachable from the UI; see below)
- `public/js/chat.js` - chat widget; posts to `/api/chat` and renders the agent's reply

## Both sides of the marketplace

The mock covers the full loop. Which side you are on is declared per listing in
`src/agents/registry.ts` and never inferred from the data:

| Section | You are | The agent plays | Agent's limit |
|---|---|---|---|
| **Today's picks** | buyer | the seller | a **floor** - won't go lower |
| **My Listings** | seller | an interested buyer | a **ceiling** - won't go higher |

| # | Listing | Ask | Agent's limit | Agent persona |
|---|---|---|---|---|
| 1 | PS5 Console - Disc Edition | $420 | $370 floor | Lena Ortiz (seller) |
| 2 | iPhone 15 Pro - 256GB | $780 | $700 floor | Devon Blake (seller) |
| 3 | 2x Coachella GA Wristbands (**you sell**) | $740 | $680 **ceiling** | Maya Chen (buyer) |
| 4 | Herman Miller Aeron (**you sell**) | $610 | $540 **ceiling** | Sam Whitfield (buyer) |

Both sections are labelled with the role direction, and the listing page swaps "Message Seller" for
"Message Buyer" on your own listings.

**Agreement and payment are separate events.** Reaching a price says nothing about how the money
moves, so both flows behave identically once a deal is struck: the agreement is recorded, one
confirmation message is shown, and the thread stays open. No payment button, no link, no claim that
one is coming. The two parties arrange payment themselves, as ordinary conversation:

```
you:    180 deal
seller: Great - we're agreed at $180 for the 2x Concert Tickets - Friday Night Show.
you:    how would you like to handle payment?
seller: I'm open to whatever works best for you!
you:    I'll send you the payment link.
seller: Sounds good! Just send it over when you're ready.
```

Roles live in `src/conversation/roles.ts` as one small table:

```ts
"user-buys"  -> { user: "buyer",  agent: "seller", limitKind: "floor"   }
"user-sells" -> { user: "seller", agent: "buyer",  limitKind: "ceiling" }
```

## The agents

Every agent - seller or buyer - is a LangChain agent built with `createAgent()` through one shared
harness. Only the persona, tools, and skills differ.

```
src/agents/
  harness.ts   createConversationAgent() - the single construction path for every agent
  registry.ts  per-listing tuning (direction, limit price, temperament, skills)
  skills/      middleware - see below
  tools/       per-listing tools (get_listing_facts, check_availability, record_agreement)
```

**Skills are middleware.** LangChain has no primitive called "skills"; its
harness-customization primitive is `createMiddleware`, so that is what a skill is here. Each one
wraps the model call and can inspect or replace the reply before it reaches the buyer:

| Skill | What it does | Who has it |
|---|---|---|
| `endTurnOnAgreement` | Ends the turn once a deal is recorded, so no completion is generated to be thrown away. Pure control flow - reads no model output | all |
| `stayInCharacter` | Catches persona breaks ("as an AI...") and retries, then falls back to an in-character deflection | all |
| `negotiation` | Refuses to let a reply name a price below the seller's floor | all |
| `pickupScheduling` | Adds pickup logistics guidance **and registers its own `propose_pickup_window` tool** | sellers with a physical handoff (not the ticket seller) |

`negotiation` is the one that shows why skills are middleware and not just prompt text: the limit
is enforced on the way out, so a persistent lowballer cannot talk a seller under its floor - and a
persistent seller cannot talk a buyer over its ceiling. It retries once with a correction, then
substitutes a safe reply if the model still will not hold.

Limits are listed in the table above: floors on listings you buy, ceilings on listings you sell.

**Grounding.** Personas are built from `src/data.ts`, so the agents and the UI can never disagree
about price, condition, or location. Tools are constructed per-listing, so a seller has no code
path to another seller's item.

**Memory.** Conversations are kept in a LangGraph `MemorySaver`, keyed by the `conversationId`
the API returns. It is in-process: restarting the server clears every conversation.

### Model

Set `VERIPAY_SELLER_LLM_MODEL` to any LangChain provider string. Defaults to
`openai:gpt-5.6-luna` if unset. `openai:gpt-4o-mini` is what `.env.marketplace` currently
pins and it works, though it is a legacy model no longer listed on OpenAI's models page -
worth moving to a current model (`gpt-5.6-luna` / `-terra` / `-sol`) when convenient.

### Closing a deal

When either side accepts a price, the agent calls `record_agreement` and **its turn ends there** -
the `endTurnOnAgreement` middleware stops the loop so no completion is generated just to be
discarded. The confirmation is composed by the application (`src/agreement/postAgreement.ts`), not
the model, so it cannot drift into inventing a checkout step.

That confirmation is the whole of the post-agreement behaviour, in both directions. Payment is not
this system's concern.

Every agreement gets a stable `agreementId` (`src/agreement/store.ts`), idempotent per
`(conversationId, listingId)`. It is the intended join key for receipts, webhooks, and audit logs.

**Payment infrastructure is still available, just never auto-triggered.**
`src/links/provider.ts` (`LinkProvider` + `StubLinkProvider`) and the `payment_link` /
`conversation_state` events remain wired up and rendered by the client. Nothing emits them today; a
genuine external event is what should, if one is ever added. See `docs/AGENT_AUDIT.md` §10 for the
link-service contract.

### `POST /api/chat`

```
Request : { listingId, message, conversationId? }
Response: { conversationId, agreementId?, events: [...] }
```

Responses always return an **ordered event list**, so new capabilities become new event types rather
than new top-level fields. Clients ignore unknown types.

| Event | Fields |
|---|---|
| `message` | `role`, `text` |
| `payment_link` | `text`, `agreementId`, `url`, `expiresAt`, `status` |
| `conversation_state` | `state` (`ended` \| `awaiting_buyer_link`), `reason`, `agreementId?`, `text?` |

`message` events carry `role: "seller" | "buyer"` - whichever side the agent is playing.

Omit `conversationId` to start a new conversation; pass the returned one back to continue it.
Errors: 400 (bad input), 404 (unknown listing), 503 (no API key configured), 502 (agent failed).

### `GET /api/listings/mine`

The items you are selling, for the Selling section.

### Auth0

`express-openid-connect` is wired up in `src/auth.ts` but **off unless the four `AUTH0_*` vars are
set** — the mock stays fully usable without a tenant, with the buyer as an anonymous placeholder.
Once configured you get `/login` and `/logout`, browsing stays public, and the buyer's Auth0 `sub`
becomes the identity bound to each agreement and payment link.

Note: `@auth0/ai-langchain` is **not** installed and cannot be — it pins `@langchain/core ^0.3`,
`langgraph ^0.4`, and `zod ^3`, while this project runs 1.2.4 / 1.4.8 / 4.4.3. Installing it would
force a LangChain downgrade that deletes `createAgent`. Details and the recommended alternative are
in `docs/AGENT_AUDIT.md` §11.

### Tests

```
node scripts/gate-endturn.js     # loop termination; offline, no API cost
node scripts/unit-agreement.js   # floor, agreementId idempotency, two-message rule
```

## Buying - intentionally not wired up yet

There is no Buy button in the UI right now. The listing page has a single action, Message Seller.
Buying is deferred, but the backend for it is still in place and working, so turning it back on is
a small change rather than a rebuild:

- `src/routes/buy.ts` - `POST /api/buy` still creates an order record (id, listing, buyer, seller,
  timestamp) and returns an order link. Currently nothing in the UI calls it.
- `public/order.html` - the order/checkout stub page. Still served, just unreachable by clicking.
- `.btn-secondary` in `public/css/style.css` - the old Buy button style, left in place.

To re-enable it, add the button back to the template in `public/listing.html` and give it a click
handler that POSTs to `/api/buy` and redirects to the returned `orderLink`.

When it does come back, the shape to keep in mind: real Marketplace has no shareable "buy link"
the buyer sends the seller - Meta creates an order tied to both parties internally, and status
shows up in the chat thread. This mock already matches that shape (one order tied to buyer +
seller + listing) without real payment behind it.

## Chat

The Message Seller button opens a chat window scoped to that listing/seller. Messages go to
`POST /api/chat` and come back from that listing's seller agent. The "typing..." indicator now
covers a real model call, and input is disabled until the reply lands. Errors surface in-thread
as a system message rather than leaving the indicator spinning.

Conversations live in memory on the server and are cleared on restart. Persisting them (a
messages table keyed by conversation id, swapping `MemorySaver` for a real checkpointer) is the
natural next step.

## Next steps if you want to build this out further

- Swap the in-memory arrays in `src/data.ts` for a real database (Postgres, SQLite, etc.)
- Add real auth so "you" isn't hardcoded as the buyer
- Wire `POST /api/buy` to an actual payment processor and update order status accordingly
- Persist chat conversations (replace `MemorySaver` with a durable checkpointer)
- Stream agent replies token-by-token instead of waiting for the full response
- Add image uploads instead of emoji placeholders
