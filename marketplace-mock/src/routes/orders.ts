import { Router } from "express";
import { orders } from "../data";

const router = Router();

// GET /api/orders/:id
router.get("/:id", (req, res) => {
  const order = orders[req.params.id];
  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }
  res.json(order);
});

export default router;
