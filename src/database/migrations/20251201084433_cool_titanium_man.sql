CREATE TYPE "public"."auth_method" AS ENUM('email_password', 'phone_otp');--> statement-breakpoint
CREATE TYPE "public"."discount_type" AS ENUM('percentage', 'fixed_amount');--> statement-breakpoint
CREATE TYPE "public"."fulfillment_type" AS ENUM('delivery', 'express_delivery', 'same_day_delivery', 'self_pickup');--> statement-breakpoint
CREATE TYPE "public"."loyalty_adjustment_type" AS ENUM('earn_purchase', 'redeem_discount', 'admin_add', 'admin_remove', 'expire', 'refund_reversal');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."product_type" AS ENUM('simple', 'bundle');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'approved', 'rejected', 'flagged');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'success', 'failed', 'error', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('authorization', 'capture', 'sale', 'refund', 'void', 'dispute');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'manager', 'customer');--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"phone_number" varchar,
	"email" varchar,
	"code" varchar,
	"type" varchar,
	"expires_at" timestamp,
	"is_used" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"full_name" varchar,
	"phone" varchar,
	"address_line1" varchar,
	"address_line2" varchar,
	"city" varchar,
	"state" varchar,
	"postal_code" varchar,
	"country" varchar,
	"is_default" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_token" text,
	"expires_at" timestamp,
	"ip_address" varchar,
	"user_agent" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"phone_number" varchar,
	"password_hash" text,
	"full_name" varchar,
	"role" "user_role" DEFAULT 'customer',
	"is_active" boolean DEFAULT true,
	"primary_auth_method" "auth_method",
	"email_verified_at" timestamp,
	"phone_verified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_number_unique" UNIQUE("phone_number")
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"description" text,
	"attributes" jsonb,
	"slug" varchar,
	"logo_url" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp,
	CONSTRAINT "brands_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "bundle_components" (
	"parent_variant_id" uuid,
	"child_variant_id" uuid,
	"quantity" integer DEFAULT 1,
	CONSTRAINT "bundle_components_parent_variant_id_child_variant_id_pk" PRIMARY KEY("parent_variant_id","child_variant_id")
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"slug" varchar,
	"parent_id" uuid,
	"created_at" timestamp,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" uuid,
	"category_id" uuid,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"url" text,
	"alt_text" varchar,
	"is_primary" boolean DEFAULT false,
	"display_order" integer
);
--> statement-breakpoint
CREATE TABLE "product_variant_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid,
	"url" text,
	"sort_order" integer
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"sku" varchar,
	"name" varchar,
	"price_amount" bigint,
	"price_currency" varchar,
	"compare_at_amount" bigint,
	"cost_price_amount" bigint,
	"weight_kg" numeric(10, 3),
	"attributes" jsonb,
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"canonical_category_id" uuid,
	"title" varchar,
	"flags" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"slug" varchar,
	"description" text,
	"type" "product_type" DEFAULT 'simple',
	"status" varchar DEFAULT 'draft',
	"created_at" timestamp,
	"updated_at" timestamp,
	CONSTRAINT "products_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"variant_id" uuid,
	"product_name" varchar,
	"sku" varchar,
	"unit_price_amount" bigint,
	"currency" varchar,
	"quantity" integer,
	"total_price_amount" bigint,
	"weight_kg" numeric(10, 3),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "order_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"type" "transaction_type",
	"status" "transaction_status",
	"amount" bigint,
	"currency" varchar,
	"provider" varchar DEFAULT 'stripe',
	"provider_transaction_id" varchar,
	"parent_transaction_id" uuid,
	"payment_method_details" jsonb,
	"gateway_response" jsonb,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"currency" varchar,
	"subtotal" integer,
	"tax_total" integer,
	"discount_total" integer,
	"shipping_total" integer,
	"grand_total" integer,
	"status" "order_status" DEFAULT 'pending',
	"payment_status" varchar,
	"payment_intent_id" varchar,
	"fulfillment_type" "fulfillment_type",
	"store_id" uuid,
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "shipping_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"fulfillment_type" "fulfillment_type",
	"base_rate" integer,
	"currency" varchar,
	"min_order_amount" integer,
	"max_order_amount" integer,
	"estimated_days" integer,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "shipping_rates_fulfillment_type_unique" UNIQUE("fulfillment_type")
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid,
	"variant_id" uuid,
	"quantity" integer,
	"price_snapshot_amount" bigint,
	"price_snapshot_currency" varchar,
	"added_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"session_id" varchar,
	"currency" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "loyalty_balances" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"points" integer DEFAULT 0,
	"last_updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "loyalty_redemption_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"points_required" integer,
	"discount_amount" bigint,
	"currency" varchar,
	"is_active" boolean DEFAULT true,
	"start_at" timestamp,
	"end_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "loyalty_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"order_id" uuid,
	"promo_id" uuid,
	"type" "loyalty_adjustment_type",
	"points_amount" integer,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promo_code_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_id" uuid,
	"user_id" uuid,
	"order_id" uuid,
	"amount_applied" integer,
	"redeemed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar,
	"name" varchar,
	"description" text,
	"stackable" boolean DEFAULT false,
	"min_order_amount" integer,
	"max_uses" integer,
	"max_uses_per_user" integer,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "promo_rule_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"variant_id" uuid,
	"category_id" uuid,
	"brand_id" uuid,
	"item_role" varchar
);
--> statement-breakpoint
CREATE TABLE "promo_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promo_code_id" uuid,
	"name" varchar,
	"description" text,
	"trigger_type" varchar,
	"trigger_variant_id" uuid,
	"trigger_category_id" uuid,
	"trigger_brand_id" uuid,
	"trigger_quantity" integer,
	"trigger_amount" integer,
	"benefit_type" varchar,
	"benefit_variant_id" uuid,
	"benefit_category_id" uuid,
	"benefit_brand_id" uuid,
	"benefit_value" integer,
	"benefit_quantity" integer,
	"applies_once_per_order" boolean DEFAULT false,
	"applies_per_unit" boolean DEFAULT false,
	"starts_at" timestamp,
	"ends_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inventory_levels" (
	"variant_id" uuid,
	"store_id" uuid,
	"stock" integer DEFAULT 0,
	"reserved_stock" integer DEFAULT 0,
	"last_adjusted_at" timestamp,
	CONSTRAINT "inventory_levels_variant_id_store_id_pk" PRIMARY KEY("variant_id","store_id")
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid,
	"cart_id" uuid,
	"quantity" integer,
	"reserved_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"created_by_session" varchar
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"address_line1" varchar,
	"address_line2" varchar,
	"city" varchar,
	"state" varchar,
	"postal_code" varchar,
	"country" varchar,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "volume_discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"variant_id" uuid,
	"min_quantity" integer,
	"discount_type" "discount_type",
	"discount_value" integer,
	"message" varchar,
	"starts_at" timestamp,
	"ends_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "banner" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kicker" varchar,
	"heading" varchar,
	"sub_heading" varchar,
	"cta_text" varchar,
	"cta_link" varchar,
	"background_colour" varchar,
	"background_image" varchar,
	"order" integer,
	"start_at" timestamp,
	"end_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "featured_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"variant_id" uuid,
	"section" varchar,
	"display_order" integer,
	"is_active" boolean DEFAULT true,
	"start_at" timestamp,
	"end_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "hero_slides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar,
	"subtitle" text,
	"description" text,
	"image_url" text,
	"mobile_image_url" text,
	"cta_text" varchar,
	"cta_link" varchar,
	"background_color" varchar,
	"text_color" varchar,
	"display_order" integer,
	"is_active" boolean DEFAULT true,
	"start_at" timestamp,
	"end_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"user_id" uuid,
	"variant_id" uuid,
	"rating" integer,
	"title" varchar,
	"content" text,
	"is_verified_purchase" boolean DEFAULT false,
	"status" "review_status" DEFAULT 'pending',
	"helpful_votes" integer DEFAULT 0,
	"unhelpful_votes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "related_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"related_product_id" uuid,
	"relation_type" varchar,
	"display_order" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" uuid,
	"url" text,
	"is_approved" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "search_index_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar,
	"entity_id" uuid,
	"operation" varchar,
	"payload" jsonb,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "currencies" (
	"code" varchar PRIMARY KEY NOT NULL,
	"symbol" varchar,
	"name" varchar,
	"decimals" integer DEFAULT 2,
	"rate_to_base" numeric(18, 8),
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "master_geo_cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state_id" integer,
	"name" varchar,
	"postal_code_pattern" varchar,
	"is_serviceable" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "master_geo_countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"iso_code_2" varchar(2),
	"iso_code_3" varchar(3),
	"name" varchar,
	"currency_code" varchar,
	"phone_code" varchar,
	"region" varchar,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "master_geo_countries_iso_code_2_unique" UNIQUE("iso_code_2"),
	CONSTRAINT "master_geo_countries_iso_code_3_unique" UNIQUE("iso_code_3")
);
--> statement-breakpoint
CREATE TABLE "master_geo_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer,
	"name" varchar,
	"code" varchar,
	"type" varchar
);
--> statement-breakpoint
CREATE TABLE "master_help_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" varchar,
	"question" text,
	"answer" text,
	"display_order" integer,
	"is_published" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "master_return_reasons" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar,
	"label" varchar,
	"requires_photo" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	CONSTRAINT "master_return_reasons_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "master_system_settings" (
	"key" varchar PRIMARY KEY NOT NULL,
	"value" text,
	"type" varchar DEFAULT 'string',
	"description" text,
	"is_public" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar,
	"description" text,
	CONSTRAINT "permissions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tax_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_code" varchar,
	"state_code" varchar,
	"name" varchar,
	"rate" numeric(6, 4),
	"priority" integer DEFAULT 10,
	"start_at" timestamp,
	"end_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "marketing_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid,
	"user_id" uuid,
	"utm_source" varchar,
	"utm_medium" varchar,
	"utm_campaign" varchar,
	"utm_term" varchar,
	"utm_content" varchar,
	"referrer_url" text,
	"landing_page_url" text,
	"user_agent" text,
	"ip_address" varchar,
	"device_type" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "marketing_attributions_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role" "user_role",
	"permission_id" uuid,
	CONSTRAINT "role_permissions_role_permission_id_pk" PRIMARY KEY("role","permission_id")
);
--> statement-breakpoint
CREATE TABLE "wishlist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wishlist_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"priority" integer DEFAULT 1,
	"price_at_addition" bigint,
	"note" varchar,
	"added_at" timestamp DEFAULT now(),
	CONSTRAINT "wishlist_items_wishlist_id_variant_id_unique" UNIQUE("wishlist_id","variant_id")
);
--> statement-breakpoint
CREATE TABLE "wishlists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar DEFAULT 'My Wishlist' NOT NULL,
	"is_public" boolean DEFAULT false,
	"share_token" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "wishlists_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_components" ADD CONSTRAINT "bundle_components_parent_variant_id_product_variants_id_fk" FOREIGN KEY ("parent_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_components" ADD CONSTRAINT "bundle_components_child_variant_id_product_variants_id_fk" FOREIGN KEY ("child_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_images" ADD CONSTRAINT "product_variant_images_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_price_currency_currencies_code_fk" FOREIGN KEY ("price_currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_canonical_category_id_categories_id_fk" FOREIGN KEY ("canonical_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_currency_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_transactions" ADD CONSTRAINT "order_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_transactions" ADD CONSTRAINT "order_transactions_currency_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_currency_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_currency_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_currency_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_balances" ADD CONSTRAINT "loyalty_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_redemption_rules" ADD CONSTRAINT "loyalty_redemption_rules_currency_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_transactions" ADD CONSTRAINT "loyalty_transactions_promo_id_promo_codes_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_promo_id_promo_codes_id_fk" FOREIGN KEY ("promo_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_code_redemptions" ADD CONSTRAINT "promo_code_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rule_items" ADD CONSTRAINT "promo_rule_items_rule_id_promo_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."promo_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rule_items" ADD CONSTRAINT "promo_rule_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rule_items" ADD CONSTRAINT "promo_rule_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rule_items" ADD CONSTRAINT "promo_rule_items_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_promo_code_id_promo_codes_id_fk" FOREIGN KEY ("promo_code_id") REFERENCES "public"."promo_codes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_trigger_variant_id_product_variants_id_fk" FOREIGN KEY ("trigger_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_trigger_category_id_categories_id_fk" FOREIGN KEY ("trigger_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_trigger_brand_id_brands_id_fk" FOREIGN KEY ("trigger_brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_benefit_variant_id_product_variants_id_fk" FOREIGN KEY ("benefit_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_benefit_category_id_categories_id_fk" FOREIGN KEY ("benefit_category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promo_rules" ADD CONSTRAINT "promo_rules_benefit_brand_id_brands_id_fk" FOREIGN KEY ("benefit_brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_levels" ADD CONSTRAINT "inventory_levels_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volume_discounts" ADD CONSTRAINT "volume_discounts_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_products" ADD CONSTRAINT "related_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_products" ADD CONSTRAINT "related_products_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_images" ADD CONSTRAINT "review_images_review_id_product_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."product_reviews"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_geo_cities" ADD CONSTRAINT "master_geo_cities_state_id_master_geo_states_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."master_geo_states"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_geo_countries" ADD CONSTRAINT "master_geo_countries_currency_code_currencies_code_fk" FOREIGN KEY ("currency_code") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_geo_states" ADD CONSTRAINT "master_geo_states_country_id_master_geo_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."master_geo_countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_attributions" ADD CONSTRAINT "marketing_attributions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_attributions" ADD CONSTRAINT "marketing_attributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_wishlist_id_wishlists_id_fk" FOREIGN KEY ("wishlist_id") REFERENCES "public"."wishlists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlist_items" ADD CONSTRAINT "wishlist_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;