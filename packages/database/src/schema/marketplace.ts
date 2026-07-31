import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

/** Marketplace persona — sellers and buyer agents with profile photos. */
export const marketplaceUsers = pgTable('marketplace_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Stable public id, e.g. seller-1 or a generated slug. */
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  avatarEmoji: text('avatar_emoji'),
  /** Rating stored as tenths, e.g. 46 = 4.6 stars. */
  ratingTimes10: integer('rating_times_10').notNull(),
  ratingCount: integer('rating_count').notNull(),
  joined: text('joined').notNull(),
  responseTime: text('response_time').notNull(),
  responseRate: text('response_rate').notNull(),
  location: text('location').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/** Marketplace listing with agent negotiation tuning and listing photo. */
export const marketplaceListings = pgTable('marketplace_listings', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Public listing id used in URLs and agent registry, e.g. console-ps5. */
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  priceMinor: integer('price_minor').notNull(),
  currency: text('currency').notNull().default('usd'),
  category: text('category').notNull(),
  condition: text('condition').notNull(),
  description: text('description').notNull(),
  location: text('location').notNull(),
  distance: text('distance').notNull(),
  imageUrl: text('image_url'),
  imageEmoji: text('image_emoji'),
  imageColor: text('image_color'),
  sellerUserId: uuid('seller_user_id')
    .notNull()
    .references(() => marketplaceUsers.id),
  counterpartyUserId: uuid('counterparty_user_id').references(() => marketplaceUsers.id),
  /** True when the viewer (you) owns this listing — the "My Listings" section. */
  isOwnedByViewer: boolean('is_owned_by_viewer').notNull().default(false),
  agentDirection: text('agent_direction').notNull(),
  agentLimitPriceMinor: integer('agent_limit_price_minor').notNull(),
  agentTemperament: text('agent_temperament').notNull(),
  agentCanSchedulePickup: boolean('agent_can_schedule_pickup').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
