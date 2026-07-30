import dotenv from "dotenv";
import path from "path";

// Secrets live in .env.marketplace at the repo root (gitignored), so the key
// is shared with anything else in VeriPay rather than duplicated per package.
dotenv.config({ path: path.join(__dirname, "..", "..", ".env.marketplace") });

import express from "express";
import cors from "cors";
import listingsRouter from "./routes/listings";
import buyRouter from "./routes/buy";
import ordersRouter from "./routes/orders";
import chatRouter from "./routes/chat";
import { mountAuth } from "./auth";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Auth0 (no-op unless the AUTH0_* vars are set) - must precede the routes so
// req.oidc is populated for /api/chat.
mountAuth(app);

// API routes
app.use("/api/listings", listingsRouter);
app.use("/api/buy", buyRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/chat", chatRouter);

// Static frontend
app.use(express.static(path.join(__dirname, "..", "public")));

app.listen(PORT, () => {
  console.log(`Marketplace mock server running at http://localhost:${PORT}`);
});
