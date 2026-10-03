CREATE TABLE "budget_envelopes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"target_amount_kopecks" bigint NOT NULL,
	"funded_amount_kopecks" bigint DEFAULT 0 NOT NULL,
	"spent_amount_kopecks" bigint DEFAULT 0 NOT NULL,
	"protection_level" "protection_level" DEFAULT 'NEGOTIABLE' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chk_envelope_target_valid" CHECK ("budget_envelopes"."target_amount_kopecks" >= 0),
	CONSTRAINT "chk_envelope_funded_valid" CHECK ("budget_envelopes"."funded_amount_kopecks" >= 0),
	CONSTRAINT "chk_envelope_spent_valid" CHECK ("budget_envelopes"."spent_amount_kopecks" >= 0 AND "budget_envelopes"."spent_amount_kopecks" <= "budget_envelopes"."funded_amount_kopecks")
);
--> statement-breakpoint
ALTER TABLE "budget_envelopes" ADD CONSTRAINT "budget_envelopes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_envelopes_user_active" ON "budget_envelopes" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_envelopes_user_protection" ON "budget_envelopes" USING btree ("user_id","protection_level");