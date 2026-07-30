# Escrow App — PRD

## Concept

A peer-to-peer escrow platform for buying and selling goods online. Either party generates a one-time deal link, fills out the terms, and shares it. The second party accepts via email only — no account required. Funds are held in escrow until the buyer confirms receipt, with a 48-hour auto-release fallback. An AI fraud check surfaces the other party's risk score to each participant.

**Demo scenario:** Buying/selling concert tickets between two people who don't know each other.

---

## Auth Model

**Creator (deal initiator):**
- Must have an Auth0 account
- Has a dashboard with all their deals
- Can be either the buyer or the seller

**Second party (link recipient):**
- No account required
- Opens the one-time link, enters their email, and accepts the deal
- Receives all updates via email
- Identity = email address only

---

## Deal States

```
new → connected → escrowed → completed
```

| State | Trigger |
|---|---|
| `new` | Creator generates link and fills out deal info |
| `connected` | Second party opens link, enters email, clicks Accept |
| `escrowed` | Buyer pays via Stripe checkout |
| `completed` | Buyer confirms receipt OR 48hr auto-release fires |

**Link behavior:** One-time use. Burns on open. After `connected`, the creator accesses the deal via dashboard and the second party via email link.

---

## Screens

### 1. Landing
- Hero explaining the product
- CTA: "Create a Deal" → Auth0 login if not authenticated
- How it works: 3-step explainer (create, share, transact)

### 2. Log In / Sign Up
- Auth0 Universal Login
- Redirects to Dashboard on success

### 3. Dashboard — Creator only
- Deals grouped by state: New, Connected, Escrowed, Completed
- Each deal card shows: title, price, other party email, their fraud score, current state, next action CTA
- "New Deal" button

### 4. Create Deal
- Fields: Title, Description, Price, Your Role (Buying or Selling)
- Submit generates a one-time link and saves deal as `new`

### 5. Deal Created
- Confirmation screen with copyable one-time link
- Warning that the link expires after one use
- "Go to Dashboard" button

### 6. Link Landing — Second party only
- If link already used: "This link has already been used"
- Otherwise: deal title, description, price, creator name/email, creator's fraud score
- Email input field + "Accept Deal" button
- On accept: link burns, deal moves to `connected`, both parties notified via email

### 7. Deal Detail — All states

**new:** Deal info, waiting message, option to cancel

**connected:** Other party's email and fraud score. If creator is buyer: Pay into Escrow button. If creator is seller: waiting on buyer to pay.

**escrowed:** If seller: input to submit delivery note and mark delivered. If buyer: waiting on seller, delivery note shown when submitted.

**completed:** Transaction summary for both parties.

### 8. Second Party Deal View
- Accessed via email link, no login required
- Same state-aware UI as Deal Detail
- If escrowed and they are the buyer: Stripe checkout
- If delivered and they are the buyer: Confirm Receipt button

### 9. Payment / Checkout
- Stripe checkout with amount locked to deal price
- On success: deal moves to `escrowed`, 48hr release timer starts

### 10. Profile
- User info
- Deal history summary
- Connected Stripe account status (for sellers)

---

## Key User Flows

### Flow A — Seller creates deal
1. Seller logs in, creates deal (role: selling)
2. Copies one-time link, sends to buyer
3. Buyer opens link, sees seller's fraud score, enters email, accepts
4. Deal moves to `connected` — both notified
5. Buyer pays via Stripe
6. Deal moves to `escrowed`
7. Seller submits delivery note
8. Buyer confirms receipt → deal `completed`, funds release to seller

### Flow B — Buyer creates deal
1. Buyer logs in, creates deal (role: buying)
2. Copies one-time link, sends to seller
3. Seller opens link, sees buyer's fraud score, enters email, accepts
4. Deal moves to `connected`
5. Buyer pays → `escrowed`
6. Seller delivers, buyer confirms → `completed`

### Flow C — Auto-release
1. Deal is `escrowed`, seller delivers
2. Buyer does not confirm within 48 hours
3. Funds automatically release to seller, deal → `completed`

---

## AI Fraud Check

**When it runs:** On the creator when the deal is created, and on the second party when they accept.

**What each party sees:** The OTHER party's fraud score — never their own.

**Inputs assessed:** Email history on platform, past deals, past flags, account age, deal price and type.

**Risk levels:**
- `low` — green badge, no warning
- `medium` — yellow badge, reasons shown
- `high` — red badge, reasons shown, "Proceed with caution" warning

**Trust labels:** `new`, `trusted`, `suspicious`