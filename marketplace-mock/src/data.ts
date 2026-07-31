export interface Seller {
  id: string;
  name: string;
  avatarEmoji: string;
  avatarUrl?: string;
  rating: number;
  ratingCount: number;
  joined: string;
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
  emoji: string;
  color: string;
  imageUrl?: string;
  seller: Seller;
  counterparty?: Seller;
  isOwnedByViewer?: boolean;
  /** Agent tuning — loaded from the database for every listing. */
  agentDirection: "user-buys" | "user-sells";
  agentLimitPrice: number;
  agentTemperament: string;
  agentCanSchedulePickup: boolean;
}

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
