import {
	boolean,
	jsonb,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

export const devices = pgTable("devices", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	keyHash: text("key_hash").notNull().unique(),
	surveyId: uuid("survey_id").references(() => surveys.id, { onDelete: "set null" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const surveys = pgTable("surveys", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	type: text("type").notNull(),
	config: jsonb("config").notNull(),
	status: text("status").notNull().default("draft"),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	endsAt: timestamp("ends_at"),
});

export const scanEvents = pgTable("scan_events", {
	id: uuid("id").primaryKey().defaultRandom(),
	surveyId: uuid("survey_id")
		.notNull()
		.references(() => surveys.id),
	deviceId: uuid("device_id")
		.notNull()
		.references(() => devices.id),
	scannerId: text("scanner_id").notNull(),
	tagId: text("tag_id").notNull(),
	scannedAt: timestamp("scanned_at").notNull().defaultNow(),
	accepted: boolean("accepted").notNull(),
	rejectionReason: text("rejection_reason"),
});

export const tagMappings = pgTable("tag_mappings", {
	id: uuid("id").primaryKey().defaultRandom(),
	tagId: text("tag_id").notNull().unique(),
	displayName: text("display_name").notNull(),
	lat: numeric("lat").notNull(),
	lng: numeric("lng").notNull(),
});
