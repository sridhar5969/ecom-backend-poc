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
CREATE TABLE "related_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid,
	"related_product_id" uuid,
	"relation_type" varchar,
	"display_order" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_currency_currencies_code_fk" FOREIGN KEY ("currency") REFERENCES "public"."currencies"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "featured_products" ADD CONSTRAINT "featured_products_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_products" ADD CONSTRAINT "related_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "related_products" ADD CONSTRAINT "related_products_related_product_id_products_id_fk" FOREIGN KEY ("related_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;