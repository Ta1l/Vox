CREATE TYPE "public"."goal_status" AS ENUM('ACTIVE', 'ON_TRACK', 'AT_RISK', 'ACHIEVED', 'ABANDONED');--> statement-breakpoint
CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_kopecks" bigint NOT NULL,
	"contributed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chk_goal_contribution_positive" CHECK ("goal_contributions"."amount_kopecks" > 0)
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(256) NOT NULL,
	"description" text,
	"target_amount_kopecks" bigint NOT NULL,
	"saved_amount_kopecks" bigint DEFAULT 0 NOT NULL,
	"deadline" date,
	"priority" integer DEFAULT 0 NOT NULL,
	"protection_level" "protection_level" DEFAULT 'FLEXIBLE' NOT NULL,
	"status" "goal_status" DEFAULT 'ACTIVE' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "chk_goal_target_positive" CHECK ("goals"."target_amount_kopecks" > 0),
	CONSTRAINT "chk_goal_saved_valid" CHECK ("goals"."saved_amount_kopecks" >= 0)
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_goal_contributions_goal_date" ON "goal_contributions" USING btree ("goal_id","contributed_at");--> statement-breakpoint
CREATE INDEX "idx_goal_contributions_user_date" ON "goal_contributions" USING btree ("user_id","contributed_at");--> statement-breakpoint
CREATE INDEX "idx_goals_user_status" ON "goals" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_goals_user_deadline" ON "goals" USING btree ("user_id","deadline");--> statement-breakpoint
CREATE INDEX "idx_goals_user_priority" ON "goals" USING btree ("user_id","priority");