CREATE TABLE "ai_provider_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"base_url" text NOT NULL,
	"model_name" varchar(128) NOT NULL,
	"api_key_encrypted" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_tested_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "ai_provider_configs" ADD CONSTRAINT "ai_provider_configs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_provider_configs_user" ON "ai_provider_configs" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_ai_provider_configs_user" ON "ai_provider_configs" USING btree ("user_id");