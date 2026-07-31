CREATE TABLE "marketplace_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"price_minor" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"description" text NOT NULL,
	"location" text NOT NULL,
	"distance" text NOT NULL,
	"image_url" text,
	"image_emoji" text,
	"image_color" text,
	"seller_user_id" uuid NOT NULL,
	"counterparty_user_id" uuid,
	"is_owned_by_viewer" boolean DEFAULT false NOT NULL,
	"agent_direction" text NOT NULL,
	"agent_limit_price_minor" integer NOT NULL,
	"agent_temperament" text NOT NULL,
	"agent_can_schedule_pickup" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "marketplace_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"avatar_url" text NOT NULL,
	"avatar_emoji" text,
	"rating_times_10" integer NOT NULL,
	"rating_count" integer NOT NULL,
	"joined" text NOT NULL,
	"response_time" text NOT NULL,
	"response_rate" text NOT NULL,
	"location" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_users_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_seller_user_id_marketplace_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "public"."marketplace_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_counterparty_user_id_marketplace_users_id_fk" FOREIGN KEY ("counterparty_user_id") REFERENCES "public"."marketplace_users"("id") ON DELETE no action ON UPDATE no action;