export interface Seller {
  id: string;
  name: string;
  avatarEmoji: string;
  rating: number; // out of 5
  ratingCount: number;
  joined: string; // e.g. "March 2019"
  responseTime: string;
  responseRate: string;
  location: string;
}

export interface Listing {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  description: string;
  location: string;
  distance: string;
  postedAgo: string;
  emoji: string; // used as a placeholder "photo"
  color: string; // background color for placeholder image
  /** Whoever owns the listing. On listings you are selling, this is you. */
  seller: Seller;
  /**
   * The person on the other side of the chat when the agent is NOT the seller.
   * Set on listings the user is selling: the agent plays this buyer.
   */
  counterparty?: Seller;
}

/**
 * People in the mock. Sellers front the listings you can buy; buyers are the
 * personas the agent plays on listings you are selling.
 */
export const sellers: Record<string, Seller> = {
  // --- Sellers you buy from (the agent plays these) ---
  "seller-1": {
    id: "seller-1",
    name: "Lena Ortiz",
    avatarEmoji: "\u{1F9D1}\u200D\u{1F680}",
    rating: 5.0,
    ratingCount: 21,
    joined: "September 2021",
    responseTime: "within an hour",
    responseRate: "97%",
    location: "Alameda, CA",
  },
  "seller-2": {
    id: "seller-2",
    name: "Devon Blake",
    avatarEmoji: "\u{1F9D1}\u200D\u{1F4BC}",
    rating: 4.6,
    ratingCount: 14,
    joined: "January 2023",
    responseTime: "within a few hours",
    responseRate: "88%",
    location: "San Francisco, CA",
  },

  // --- You, on listings you are selling ---
  you: {
    id: "you",
    name: "You",
    avatarEmoji: "\u{1F642}",
    rating: 4.9,
    ratingCount: 11,
    joined: "May 2020",
    responseTime: "within an hour",
    responseRate: "100%",
    location: "Berkeley, CA",
  },

  // --- Interested buyers (the agent plays these on your listings) ---
  "buyer-1": {
    id: "buyer-1",
    name: "Maya Chen",
    avatarEmoji: "\u{1F469}\u200D\u{1F3A4}",
    rating: 4.8,
    ratingCount: 33,
    joined: "June 2019",
    responseTime: "within 15 minutes",
    responseRate: "96%",
    location: "Oakland, CA",
  },
  "buyer-2": {
    id: "buyer-2",
    name: "Sam Whitfield",
    avatarEmoji: "\u{1F9D1}\u200D\u{1F4BB}",
    rating: 4.7,
    ratingCount: 26,
    joined: "February 2021",
    responseTime: "within 30 minutes",
    responseRate: "94%",
    location: "Oakland, CA",
  },
};

/** Listings you can browse and buy. The agent plays the seller. */
export const listings: Listing[] = [
  {
    id: "console-ps5",
    title: "PS5 Console - Disc Edition",
    price: 420,
    category: "Video Games & Consoles",
    condition: "Used - Good",
    description:
      "PlayStation 5 disc edition in great shape. Includes the original box, one DualSense " +
      "controller, and all cables. No coil whine, no drift on the stick, and it has always sat " +
      "on an open shelf rather than in a cabinet, so it runs cool and quiet. Smoke-free home. " +
      "Factory reset and ready to go. Selling because I upgraded to the Pro. Pickup only, " +
      "cash or Venmo.",
    location: "Alameda, CA",
    distance: "7.1 miles away",
    postedAgo: "4 hours ago",
    emoji: "\u{1F3AE}",
    color: "#eef0f6",
    seller: sellers["seller-1"],
  },
  {
    id: "iphone-15-pro",
    title: "iPhone 15 Pro - 256GB, Unlocked",
    price: 780,
    category: "Mobile Phones",
    condition: "Used - Like New",
    description:
      "iPhone 15 Pro, 256GB, natural titanium, carrier unlocked. Battery health is 91%. It has " +
      "lived in a case with a screen protector since day one, so the screen is flawless and " +
      "there is only the faintest wear on one corner of the frame. Face ID works perfectly. " +
      "Comes with the original box and a USB-C cable (no charger brick). Fully erased and " +
      "removed from my Apple account. Meet somewhere public in the city.",
    location: "San Francisco, CA",
    distance: "1.4 miles away",
    postedAgo: "1 day ago",
    emoji: "\u{1F4F1}",
    color: "#f6eef0",
    seller: sellers["seller-2"],
  },
];

/**
 * Listings YOU are selling. Same shape as above - the difference is that
 * `seller` is you and `counterparty` is the buyer the agent plays. Which side
 * the agent takes is declared explicitly in src/agents/registry.ts, not
 * inferred from these fields.
 */
export const myListings: Listing[] = [
  {
    id: "coachella-wristbands",
    title: "2x Coachella GA Wristbands - Weekend 1",
    price: 740,
    category: "Event Tickets",
    condition: "New",
    description:
      "Two general admission wristbands for Coachella Weekend 1. Bought them in the presale " +
      "and my travel plans fell through, so I need them gone. Both are unactivated and still " +
      "in the original mailer. Selling the pair together, not splitting. Face value was $499 " +
      "each plus fees, so this is well under what I paid. Happy to meet in person in Berkeley " +
      "so you can look them over before any money changes hands.",
    location: "Berkeley, CA",
    distance: "you are here",
    postedAgo: "2 days ago",
    emoji: "\u{1F3AB}",
    color: "#f6eef0",
    seller: sellers["you"],
    counterparty: sellers["buyer-1"],
  },
  {
    id: "herman-miller-aeron",
    title: "Herman Miller Aeron - Size B, Graphite",
    price: 610,
    category: "Furniture",
    condition: "Used - Good",
    description:
      "Herman Miller Aeron, size B (the medium, fits most people), graphite frame with the " +
      "standard mesh. Fully loaded: adjustable lumbar, height-adjustable arms, tilt limiter. " +
      "Used it as my work-from-home chair for about three years. The mesh is intact with no " +
      "sagging or tears, gas lift holds fine, casters roll smooth on hardwood. Some shine on " +
      "the armrest pads from use, which is the only real wear. These go for $1,500+ new. " +
      "Pickup in Berkeley - it is heavy and awkward, so bring a hatchback or an SUV.",
    location: "Berkeley, CA",
    distance: "you are here",
    postedAgo: "5 days ago",
    emoji: "\u{1FA91}",
    color: "#eef1f6",
    seller: sellers["you"],
    counterparty: sellers["buyer-2"],
  },
];

/** Every listing, whichever side of it you are on. */
export const allListings: Listing[] = [...listings, ...myListings];

export const findListing = (id: string): Listing | undefined =>
  allListings.find((l) => l.id === id);

export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  price: number;
  buyer: { id: string; name: string };
  seller: Seller;
  status: "pending_configuration";
  createdAt: string;
}

export const orders: Record<string, Order> = {};
