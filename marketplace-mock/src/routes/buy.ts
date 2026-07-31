import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import { findListing } from "../db/listings";
import { orders, Order } from "../data";

const router = Router();

// POST /api/buy  { listingId }
// Creates a mock order tying together buyer + seller + listing, and
// returns a shareable orderId link. Payment/shipping is NOT wired up yet -
// this just stands up the reference both sides would use once it is.
router.post("/", (req, res) => {
  const { listingId } = req.body as { listingId?: string };
  const listing = listingId ? findListing(listingId) : undefined;

  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }

  const orderId = uuidv4();
  const order: Order = {
    id: orderId,
    listingId: listing.id,
    listingTitle: listing.title,
    price: listing.price,
    buyer: { id: "you", name: "You" },
    seller: listing.seller,
    status: "pending_configuration",
    createdAt: new Date().toISOString(),
  };

  orders[orderId] = order;

  res.status(201).json({
    order,
    orderLink: `/order.html?id=${orderId}`,
  });
});

export default router;
