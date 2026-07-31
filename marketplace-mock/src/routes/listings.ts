import { Router } from "express";
import { browseListings, findListing, myListings } from "../db/listings";
import { getDirection, getRoles, isKnownListing } from "../agents/registry";
import { generateListing } from "../listings/generate";

function withRoles(listing: ReturnType<typeof findListing>) {
  if (!listing) return listing;
  if (!isKnownListing(listing.id)) return listing;
  return { ...listing, direction: getDirection(listing.id), roles: getRoles(listing.id) };
}

const router = Router();

router.get("/", (_req, res) => {
  res.json(browseListings());
});

router.get("/mine", (_req, res) => {
  res.json(myListings());
});

router.post("/generate", async (req, res) => {
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt : undefined;

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error:
        "Listing generation requires OPENAI_API_KEY in .env.marketplace. Restart the server after setting it.",
    });
  }

  try {
    const result = await generateListing(prompt);
    const listing = findListing(result.listingId);
    if (!listing) {
      return res.status(500).json({ error: "Listing was created but could not be loaded." });
    }
    res.status(201).json(withRoles(listing));
  } catch (err) {
    console.error("[listings] generate error:", err);
    res.status(502).json({ error: "Could not generate a listing right now." });
  }
});

router.get("/:id", (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  res.json(withRoles(listing));
});

export default router;
