import type { Listing, Seller } from "../data";
import {
  DbListingRow,
  DbUserRow,
  getSql,
  majorToMinor,
  minorToMajor,
  postedAgo,
  ratingFromTimes10,
  ratingToTimes10,
} from "./client";

const PERSONA_PHOTOS: Record<string, string> = {
  "seller-1": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  "seller-2": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  you: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face",
  "buyer-1": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  "buyer-2": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
};

const LISTING_PHOTOS: Record<string, string> = {
  "console-ps5":
    "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&h=800&fit=crop",
  "iphone-15-pro":
    "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop",
  "coachella-wristbands":
    "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=800&fit=crop",
  "herman-miller-aeron":
    "https://images.unsplash.com/photo-1580480051063-82288aa12081?w=800&h=800&fit=crop",
};

const SEED_USERS = [
  {
    slug: "seller-1",
    name: "Lena Ortiz",
    avatar_url: PERSONA_PHOTOS["seller-1"],
    avatar_emoji: "\u{1F9D1}\u200D\u{1F680}",
    rating_times_10: 50,
    rating_count: 21,
    joined: "September 2021",
    response_time: "within an hour",
    response_rate: "97%",
    location: "Alameda, CA",
  },
  {
    slug: "seller-2",
    name: "Devon Blake",
    avatar_url: PERSONA_PHOTOS["seller-2"],
    avatar_emoji: "\u{1F9D1}\u200D\u{1F4BC}",
    rating_times_10: 46,
    rating_count: 14,
    joined: "January 2023",
    response_time: "within a few hours",
    response_rate: "88%",
    location: "San Francisco, CA",
  },
  {
    slug: "you",
    name: "You",
    avatar_url: PERSONA_PHOTOS.you,
    avatar_emoji: "\u{1F642}",
    rating_times_10: 49,
    rating_count: 11,
    joined: "May 2020",
    response_time: "within an hour",
    response_rate: "100%",
    location: "Berkeley, CA",
  },
  {
    slug: "buyer-1",
    name: "Maya Chen",
    avatar_url: PERSONA_PHOTOS["buyer-1"],
    avatar_emoji: "\u{1F469}\u200D\u{1F3A4}",
    rating_times_10: 48,
    rating_count: 33,
    joined: "June 2019",
    response_time: "within 15 minutes",
    response_rate: "96%",
    location: "Oakland, CA",
  },
  {
    slug: "buyer-2",
    name: "Sam Whitfield",
    avatar_url: PERSONA_PHOTOS["buyer-2"],
    avatar_emoji: "\u{1F9D1}\u200D\u{1F4BB}",
    rating_times_10: 47,
    rating_count: 26,
    joined: "February 2021",
    response_time: "within 30 minutes",
    response_rate: "94%",
    location: "Oakland, CA",
  },
];

const SEED_LISTINGS = [
  {
    slug: "console-ps5",
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
    image_url: LISTING_PHOTOS["console-ps5"],
    image_emoji: "\u{1F3AE}",
    image_color: "#eef0f6",
    seller_slug: "seller-1",
    is_owned_by_viewer: false,
    agent_direction: "user-buys",
    agent_limit_price: 370,
    agent_temperament:
      "Easygoing gamer. Happy to answer questions about the console's condition and what's " +
      "in the box, and relaxed about meeting up, but not in a hurry to discount.",
    agent_can_schedule_pickup: true,
  },
  {
    slug: "iphone-15-pro",
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
    image_url: LISTING_PHOTOS["iphone-15-pro"],
    image_emoji: "\u{1F4F1}",
    image_color: "#f6eef0",
    seller_slug: "seller-2",
    is_owned_by_viewer: false,
    agent_direction: "user-buys",
    agent_limit_price: 700,
    agent_temperament:
      "Brisk and businesslike. You know exactly what the phone is worth, you have the battery " +
      "health and box to prove it, and you expect a buyer who has done their homework.",
    agent_can_schedule_pickup: true,
  },
  {
    slug: "coachella-wristbands",
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
    image_url: LISTING_PHOTOS["coachella-wristbands"],
    image_emoji: "\u{1F3AB}",
    image_color: "#f6eef0",
    seller_slug: "you",
    counterparty_slug: "buyer-1",
    is_owned_by_viewer: true,
    agent_direction: "user-sells",
    agent_limit_price: 680,
    agent_temperament:
      "Enthusiastic festival-goer who really wants to go, but has been burned by ticket scams " +
      "before. You ask about activation status and whether you can inspect them in person, " +
      "and you push on price because you know resale wristbands vary a lot.",
    agent_can_schedule_pickup: false,
  },
  {
    slug: "herman-miller-aeron",
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
    image_url: LISTING_PHOTOS["herman-miller-aeron"],
    image_emoji: "\u{1FA91}",
    image_color: "#eef1f6",
    seller_slug: "you",
    counterparty_slug: "buyer-2",
    is_owned_by_viewer: true,
    agent_direction: "user-sells",
    agent_limit_price: 540,
    agent_temperament:
      "Practical remote worker kitting out a home office. You know Aeron model differences and " +
      "ask specific questions - size, lumbar support, arm adjustability, mesh condition - and " +
      "you use any wear you find as a reason to negotiate down.",
    agent_can_schedule_pickup: false,
  },
];

function toSeller(row: DbUserRow): Seller {
  return {
    id: row.slug,
    name: row.name,
    avatarEmoji: row.avatar_emoji ?? "\u{1F464}",
    avatarUrl: row.avatar_url,
    rating: ratingFromTimes10(row.rating_times_10),
    ratingCount: row.rating_count,
    joined: row.joined,
    responseTime: row.response_time,
    responseRate: row.response_rate,
    location: row.location,
  };
}

function toListing(row: DbListingRow, seller: DbUserRow, counterparty: DbUserRow | null): Listing {
  return {
    id: row.slug,
    title: row.title,
    price: minorToMajor(row.price_minor),
    category: row.category,
    condition: row.condition,
    description: row.description,
    location: row.location,
    distance: row.distance,
    postedAgo: postedAgo(row.created_at),
    emoji: row.image_emoji ?? "\u{1F4E6}",
    color: row.image_color ?? "#eef0f6",
    imageUrl: row.image_url ?? undefined,
    seller: toSeller(seller),
    counterparty: counterparty ? toSeller(counterparty) : undefined,
    isOwnedByViewer: row.is_owned_by_viewer,
    agentDirection: row.agent_direction as Listing["agentDirection"],
    agentLimitPrice: minorToMajor(row.agent_limit_price_minor),
    agentTemperament: row.agent_temperament,
    agentCanSchedulePickup: row.agent_can_schedule_pickup,
  };
}

async function loadUsers(): Promise<Map<string, DbUserRow>> {
  const sql = getSql();
  const users = await sql<DbUserRow[]>`
    select id, slug, name, avatar_url, avatar_emoji, rating_times_10, rating_count,
           joined, response_time, response_rate, location
    from marketplace_users
  `;
  return new Map(users.map((user) => [user.id, user]));
}

async function loadUsersBySlug(): Promise<Map<string, DbUserRow>> {
  const sql = getSql();
  const users = await sql<DbUserRow[]>`
    select id, slug, name, avatar_url, avatar_emoji, rating_times_10, rating_count,
           joined, response_time, response_rate, location
    from marketplace_users
  `;
  return new Map(users.map((user) => [user.slug, user]));
}

let listingCache = new Map<string, Listing>();

export async function refreshListingCache(): Promise<void> {
  const sql = getSql();
  const usersById = await loadUsers();
  const rows = await sql<DbListingRow[]>`
    select id, slug, title, price_minor, category, condition, description, location, distance,
           image_url, image_emoji, image_color, seller_user_id, counterparty_user_id,
           is_owned_by_viewer, agent_direction, agent_limit_price_minor, agent_temperament,
           agent_can_schedule_pickup, created_at
    from marketplace_listings
    order by created_at asc
  `;

  listingCache = new Map(
    rows.map((row) => {
      const seller = usersById.get(row.seller_user_id);
      if (!seller) throw new Error(`Missing seller for listing ${row.slug}`);
      const counterparty = row.counterparty_user_id
        ? usersById.get(row.counterparty_user_id) ?? null
        : null;
      return [row.slug, toListing(row, seller, counterparty)];
    }),
  );
}

export function findListing(id: string): Listing | undefined {
  return listingCache.get(id);
}

export function allListings(): Listing[] {
  return [...listingCache.values()];
}

export function browseListings(): Listing[] {
  return allListings().filter((listing) => listing.agentDirection === "user-buys");
}

export function myListings(): Listing[] {
  return allListings().filter((listing) => listing.agentDirection === "user-sells");
}

export async function seedIfEmpty(): Promise<void> {
  const sql = getSql();
  const existing = await sql<{ slug: string }[]>`
    select slug from marketplace_listings limit 1
  `;
  if (existing.length > 0) return;

  const userIds = new Map<string, string>();
  for (const user of SEED_USERS) {
    const [inserted] = await sql<{ id: string; slug: string }[]>`
      insert into marketplace_users (
        slug, name, avatar_url, avatar_emoji, rating_times_10, rating_count,
        joined, response_time, response_rate, location
      ) values (
        ${user.slug}, ${user.name}, ${user.avatar_url}, ${user.avatar_emoji},
        ${user.rating_times_10}, ${user.rating_count}, ${user.joined},
        ${user.response_time}, ${user.response_rate}, ${user.location}
      )
      returning id, slug
    `;
    userIds.set(inserted.slug, inserted.id);
  }

  for (const listing of SEED_LISTINGS) {
    await sql`
      insert into marketplace_listings (
        slug, title, price_minor, category, condition, description, location, distance,
        image_url, image_emoji, image_color, seller_user_id, counterparty_user_id,
        is_owned_by_viewer, agent_direction, agent_limit_price_minor, agent_temperament,
        agent_can_schedule_pickup
      ) values (
        ${listing.slug}, ${listing.title}, ${majorToMinor(listing.price)}, ${listing.category},
        ${listing.condition}, ${listing.description}, ${listing.location}, ${listing.distance},
        ${listing.image_url}, ${listing.image_emoji}, ${listing.image_color},
        ${userIds.get(listing.seller_slug)!},
        ${listing.counterparty_slug ? userIds.get(listing.counterparty_slug) ?? null : null},
        ${listing.is_owned_by_viewer}, ${listing.agent_direction},
        ${majorToMinor(listing.agent_limit_price)}, ${listing.agent_temperament},
        ${listing.agent_can_schedule_pickup}
      )
    `;
  }
}

export interface CreateListingInput {
  slug: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  description: string;
  location: string;
  distance: string;
  imageUrl: string;
  imageEmoji: string;
  imageColor: string;
  seller: {
    slug: string;
    name: string;
    avatarUrl: string;
    avatarEmoji: string;
    rating: number;
    ratingCount: number;
    joined: string;
    responseTime: string;
    responseRate: string;
    location: string;
  };
  agentDirection: Listing["agentDirection"];
  agentLimitPrice: number;
  agentTemperament: string;
  agentCanSchedulePickup: boolean;
  isOwnedByViewer?: boolean;
  counterparty?: CreateListingInput["seller"];
}

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const sql = getSql();
  const usersBySlug = await loadUsersBySlug();

  const upsertUser = async (user: CreateListingInput["seller"]) => {
    const existing = usersBySlug.get(user.slug);
    if (existing) return existing.id;

    const [inserted] = await sql<{ id: string; slug: string }[]>`
      insert into marketplace_users (
        slug, name, avatar_url, avatar_emoji, rating_times_10, rating_count,
        joined, response_time, response_rate, location
      ) values (
        ${user.slug}, ${user.name}, ${user.avatarUrl}, ${user.avatarEmoji},
        ${ratingToTimes10(user.rating)}, ${user.ratingCount}, ${user.joined},
        ${user.responseTime}, ${user.responseRate}, ${user.location}
      )
      returning id, slug
    `;
    usersBySlug.set(inserted.slug, {
      id: inserted.id,
      slug: inserted.slug,
      name: user.name,
      avatar_url: user.avatarUrl,
      avatar_emoji: user.avatarEmoji,
      rating_times_10: ratingToTimes10(user.rating),
      rating_count: user.ratingCount,
      joined: user.joined,
      response_time: user.responseTime,
      response_rate: user.responseRate,
      location: user.location,
    });
    return inserted.id;
  };

  const sellerUserId = await upsertUser(input.seller);
  const counterpartyUserId = input.counterparty ? await upsertUser(input.counterparty) : null;

  await sql`
    insert into marketplace_listings (
      slug, title, price_minor, category, condition, description, location, distance,
      image_url, image_emoji, image_color, seller_user_id, counterparty_user_id,
      is_owned_by_viewer, agent_direction, agent_limit_price_minor, agent_temperament,
      agent_can_schedule_pickup
    ) values (
      ${input.slug}, ${input.title}, ${majorToMinor(input.price)}, ${input.category},
      ${input.condition}, ${input.description}, ${input.location}, ${input.distance},
      ${input.imageUrl}, ${input.imageEmoji}, ${input.imageColor}, ${sellerUserId},
      ${counterpartyUserId}, ${input.isOwnedByViewer ?? false}, ${input.agentDirection},
      ${majorToMinor(input.agentLimitPrice)}, ${input.agentTemperament},
      ${input.agentCanSchedulePickup}
    )
  `;

  await refreshListingCache();
  const listing = findListing(input.slug);
  if (!listing) throw new Error(`Listing ${input.slug} was not found after insert`);
  return listing;
}

export function listingPhotoForCategory(category: string, slug: string): string {
  const key = category.toLowerCase();
  if (key.includes("phone") || key.includes("mobile")) {
    return "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&h=800&fit=crop";
  }
  if (key.includes("game") || key.includes("console")) {
    return "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&h=800&fit=crop";
  }
  if (key.includes("furniture") || key.includes("chair")) {
    return "https://images.unsplash.com/photo-1580480051063-82288aa12081?w=800&h=800&fit=crop";
  }
  if (key.includes("ticket") || key.includes("event")) {
    return "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&h=800&fit=crop";
  }
  if (key.includes("bike") || key.includes("bicycle")) {
    return "https://images.unsplash.com/photo-1485965120188-e220f721d03e?w=800&h=800&fit=crop";
  }
  return `https://picsum.photos/seed/${encodeURIComponent(slug)}/800/800`;
}
