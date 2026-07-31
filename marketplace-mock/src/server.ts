import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });
dotenv.config({ path: path.join(__dirname, "..", "..", ".env.marketplace") });

import express from "express";
import cors from "cors";
import listingsRouter from "./routes/listings";
import buyRouter from "./routes/buy";
import ordersRouter from "./routes/orders";
import chatRouter from "./routes/chat";
import { mountAuth } from "./auth";
import { closeDatabase } from "./db/client";
import { refreshListingCache, seedIfEmpty } from "./db/listings";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

mountAuth(app);

app.use("/api/listings", listingsRouter);
app.use("/api/buy", buyRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/chat", chatRouter);

app.use(express.static(path.join(__dirname, "..", "public")));

async function start() {
  try {
    await seedIfEmpty();
    await refreshListingCache();
  } catch (err) {
    console.error("[server] database init failed:", err);
    console.error(
      "Ensure SUPABASE_POOLER_URL is set in .env at the repo root, then run npm run db:migrate from the repo root.",
    );
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`Marketplace mock server running at http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    server.close();
    await closeDatabase();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
