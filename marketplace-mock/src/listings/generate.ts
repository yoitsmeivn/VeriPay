import { randomUUID } from "crypto";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";

import { createListing, listingPhotoForCategory } from "../db/listings";
import { slugify } from "../db/client";
import { clearAgentCache } from "../agents/registry";

const generatedListingSchema = z.object({
  title: z.string().min(5),
  price: z.number().int().positive(),
  category: z.string().min(2),
  condition: z.string().min(3),
  description: z.string().min(40),
  location: z.string().min(3),
  distance: z.string().min(3),
  imageEmoji: z.string().min(1),
  imageColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  seller: z.object({
    name: z.string().min(2),
    avatarEmoji: z.string().min(1),
    rating: z.number().min(3).max(5),
    ratingCount: z.number().int().positive(),
    joined: z.string().min(4),
    responseTime: z.string().min(3),
    responseRate: z.string().min(2),
    location: z.string().min(3),
    temperament: z.string().min(20),
  }),
});

type GeneratedListing = z.infer<typeof generatedListingSchema>;

function avatarUrlForName(name: string): string {
  const seed = encodeURIComponent(name.trim().toLowerCase());
  const portraits = [
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
  ];
  let hash = 0;
  for (const char of seed) hash = (hash + char.charCodeAt(0)) % portraits.length;
  return portraits[hash] ?? `https://i.pravatar.cc/200?u=${seed}`;
}

function uniqueSlug(title: string): string {
  const base = slugify(title) || "listing";
  return `${base}-${randomUUID().slice(0, 8)}`;
}

function limitPriceForSellerFloor(askingPrice: number): number {
  return Math.max(1, Math.round(askingPrice * 0.88));
}

export async function generateListing(prompt?: string): Promise<{ listingId: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate listings");
  }

  const model = new ChatOpenAI({
    model: process.env.VERIPAY_SELLER_LLM_MODEL?.replace(/^openai:/, "") ?? "gpt-4o-mini",
    temperature: 0.9,
  });

  const structured = model.withStructuredOutput(generatedListingSchema);

  const userBrief =
    typeof prompt === "string" && prompt.trim()
      ? prompt.trim()
      : "a realistic used item someone would sell on Facebook Marketplace in the Bay Area";

  const generated = (await structured.invoke([
    {
      role: "system",
      content:
        "You invent one Facebook Marketplace listing for a mock demo. " +
        "Return JSON only. The seller is a believable private individual with a distinct personality. " +
        "Prices should be realistic whole-dollar amounts in USD. " +
        "Descriptions should sound like a real person wrote them in Messenger, not marketing copy. " +
        "Use a Bay Area city for location. imageColor should be a soft neutral hex background.",
    },
    {
      role: "user",
      content: `Create a listing for: ${userBrief}`,
    },
  ])) as GeneratedListing;

  const slug = uniqueSlug(generated.title);
  const sellerSlug = `seller-${randomUUID().slice(0, 8)}`;
  const imageUrl = listingPhotoForCategory(generated.category, slug);

  const listing = await createListing({
    slug,
    title: generated.title,
    price: generated.price,
    category: generated.category,
    condition: generated.condition,
    description: generated.description,
    location: generated.location,
    distance: generated.distance,
    imageUrl,
    imageEmoji: generated.imageEmoji,
    imageColor: generated.imageColor,
    seller: {
      slug: sellerSlug,
      name: generated.seller.name,
      avatarUrl: avatarUrlForName(generated.seller.name),
      avatarEmoji: generated.seller.avatarEmoji,
      rating: generated.seller.rating,
      ratingCount: generated.seller.ratingCount,
      joined: generated.seller.joined,
      responseTime: generated.seller.responseTime,
      responseRate: generated.seller.responseRate,
      location: generated.seller.location,
    },
    agentDirection: "user-buys",
    agentLimitPrice: limitPriceForSellerFloor(generated.price),
    agentTemperament: generated.seller.temperament,
    agentCanSchedulePickup: true,
    isOwnedByViewer: false,
  });

  clearAgentCache(listing.id);

  return { listingId: listing.id };
}
