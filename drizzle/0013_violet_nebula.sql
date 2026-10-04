CREATE TYPE "public"."notification_status" AS ENUM('PENDING', 'SENT', 'FAILED', 'READ');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('PAYMENT_DUE', 'INSUFFICIENT_RESERVE', 'OVERDUE_PAYMENT', 'INCOME_EXPECTED', 'INCOME_DELAYED', 'WEEKLY_BUDGET_WARNING');--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(256) NOT NULL,
	"message" text NOT NULL,
	"related_entity_type" varchar(64),
	"related_entity_id" uuid,
	"status" "notification_status" DEFAULT 'PENDING' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"keys_auth" text NOT NULL,
	"keys_p256dh" text NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_notifications_user_status" ON "notifications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_notifications_scheduled" ON "notifications" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_notifications_user_type_entity_schedule" ON "notifications" USING btree ("user_id","type","related_entity_id","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_push_subscriptions_user_active" ON "push_subscriptions" USING btree ("user_id","is_active");