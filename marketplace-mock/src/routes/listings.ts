import { Router } from "express";
import { listings, myListings, findListing } from "../data";
import { getDirection, getRoles, isKnownListing } from "../agents/registry";

/**
 * Attach the conversation direction so the UI never has to infer which side
 * the user is on (e.g. by sniffing for `counterparty`).
 */
function withRoles(listing: ReturnType<typeof findListing>) {
  if (!listing) return listing;
  if (!isKnownListing(listing.id)) return listing;
  return { ...listing, direction: getDirection(listing.id), roles: getRoles(listing.id) };
}

const router = Router();

// GET /api/listings - all listings for the main marketplace grid
router.get("/", (_req, res) => {
  res.json(listings);
});

// GET /api/listings/mine - items YOU are selling (the Selling section)
router.get("/mine", (_req, res) => {
  res.json(myListings);
});

// GET /api/listings/:id - single listing detail page (either side)
router.get("/:id", (req, res) => {
  const listing = findListing(req.params.id);
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  res.json(withRoles(listing));
});

export default router;
