import * as pg from "drizzle-orm/pg-core";
import { defaultResumeData, type ResumeData } from "../../schema/resume/data";
import { generateId } from "../../utils/string";

export const user = pg.pgTable(
	"user",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		image: pg.text("image"),
		name: pg.text("name").notNull(),
		email: pg.text("email").notNull().unique(),
		emailVerified: pg.boolean("email_verified").notNull().default(false),
		username: pg.text("username").notNull().unique(),
		displayUsername: pg.text("display_username").notNull().unique(),
		twoFactorEnabled: pg.boolean("two_factor_enabled").notNull().default(false),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.createdAt.asc())],
);

export const session = pg.pgTable(
	"session",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		token: pg.text("token").notNull().unique(),
		ipAddress: pg.text("ip_address"),
		userAgent: pg.text("user_agent"),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		expiresAt: pg.timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.token, t.userId), pg.index().on(t.expiresAt)],
);

export const account = pg.pgTable(
	"account",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		accountId: pg.text("account_id").notNull(),
		providerId: pg.text("provider_id").notNull().default("credential"),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		scope: pg.text("scope"),
		idToken: pg.text("id_token"),
		password: pg.text("password"),
		accessToken: pg.text("access_token"),
		refreshToken: pg.text("refresh_token"),
		accessTokenExpiresAt: pg.timestamp("access_token_expires_at", { withTimezone: true }),
		refreshTokenExpiresAt: pg.timestamp("refresh_token_expires_at", { withTimezone: true }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId)],
);

export const verification = pg.pgTable("verification", {
	id: pg
		.uuid("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => generateId()),
	identifier: pg.text("identifier").notNull().unique(),
	value: pg.text("value").notNull(),
	expiresAt: pg.timestamp("expires_at", { withTimezone: true }).notNull(),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const twoFactor = pg.pgTable(
	"two_factor",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		secret: pg.text("secret"),
		backupCodes: pg.text("backup_codes"),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId), pg.index().on(t.secret)],
);

export const passkey = pg.pgTable(
	"passkey",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name"),
		aaguid: pg.text("aaguid"),
		publicKey: pg.text("public_key").notNull(),
		credentialID: pg.text("credential_id").notNull(),
		counter: pg.integer("counter").notNull(),
		deviceType: pg.text("device_type").notNull(),
		backedUp: pg.boolean("backed_up").notNull().default(false),
		transports: pg.text("transports").notNull(),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [pg.index().on(t.userId)],
);

export const resume = pg.pgTable(
	"resume",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name").notNull(),
		slug: pg.text("slug").notNull(),
		tags: pg.text("tags").array().notNull().default([]),
		isPublic: pg.boolean("is_public").notNull().default(false),
		allowDownload: pg.boolean("allow_download").notNull().default(true),
		isLocked: pg.boolean("is_locked").notNull().default(false),
		password: pg.text("password"),
		data: pg
			.jsonb("data")
			.notNull()
			.$type<ResumeData>()
			.$defaultFn(() => defaultResumeData),
		userId: pg
			.uuid("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		projectId: pg.uuid("project_id").references(() => project.id, { onDelete: "set null" }),
		positionId: pg.uuid("position_id").references(() => position.id, { onDelete: "set null" }),
		sharedCopyFromId: pg.uuid("shared_copy_from_id"),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
	},
	(t) => [
		pg.unique().on(t.slug, t.userId),
		pg.index().on(t.userId),
		pg.index().on(t.projectId),
		pg.index().on(t.createdAt.asc()),
		pg.index().on(t.userId, t.updatedAt.desc()),
		pg.index().on(t.isPublic, t.slug, t.userId),
		pg.index().on(t.sharedCopyFromId),
		pg.foreignKey({ columns: [t.sharedCopyFromId], foreignColumns: [t.id] }).onDelete("set null"),
	],
);

export const resumeStatistics = pg.pgTable("resume_statistics", {
	id: pg
		.uuid("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => generateId()),
	views: pg.integer("views").notNull().default(0),
	downloads: pg.integer("downloads").notNull().default(0),
	lastViewedAt: pg.timestamp("last_viewed_at", { withTimezone: true }),
	lastDownloadedAt: pg.timestamp("last_downloaded_at", { withTimezone: true }),
	resumeId: pg
		.uuid("resume_id")
		.unique()
		.notNull()
		.references(() => resume.id, { onDelete: "cascade" }),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const apikey = pg.pgTable(
	"apikey",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name"),
		start: pg.text("start"),
		prefix: pg.text("prefix"),
		key: pg.text("key").notNull(),
		configId: pg.text("config_id").notNull().default("default"),
		referenceId: pg
			.uuid("reference_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		refillInterval: pg.integer("refill_interval"),
		refillAmount: pg.integer("refill_amount"),
		lastRefillAt: pg.timestamp("last_refill_at", { withTimezone: true }),
		enabled: pg.boolean("enabled").notNull().default(true),
		rateLimitEnabled: pg.boolean("rate_limit_enabled").notNull().default(false),
		rateLimitTimeWindow: pg.integer("rate_limit_time_window"),
		rateLimitMax: pg.integer("rate_limit_max"),
		requestCount: pg.integer("request_count").notNull().default(0),
		remaining: pg.integer("remaining"),
		lastRequest: pg.timestamp("last_request", { withTimezone: true }),
		expiresAt: pg.timestamp("expires_at", { withTimezone: true }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
		permissions: pg.text("permissions"),
		metadata: pg.jsonb("metadata"),
	},
	(t) => [pg.index().on(t.referenceId), pg.index().on(t.key), pg.index().on(t.enabled, t.referenceId)],
);

export const skill = pg.pgTable("skill", {
	id: pg
		.uuid("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => generateId()),
	name: pg.text("name").notNull(),
	slug: pg.text("slug").notNull().unique(),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const position = pg.pgTable("position", {
	id: pg
		.uuid("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => generateId()),
	name: pg.text("name").notNull(),
	slug: pg.text("slug").notNull().unique(),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const customer = pg.pgTable("customer", {
	id: pg
		.uuid("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => generateId()),
	name: pg.text("name").notNull().unique(),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
	deletedAt: pg.timestamp("deleted_at", { withTimezone: true }),
});

export const project = pg.pgTable(
	"project",
	{
		id: pg
			.uuid("id")
			.notNull()
			.primaryKey()
			.$defaultFn(() => generateId()),
		name: pg.text("name").notNull(),
		description: pg.text("description"),
		customerId: pg.uuid("customer_id").references(() => customer.id, { onDelete: "set null" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: pg
			.timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date()),
		deletedAt: pg.timestamp("deleted_at", { withTimezone: true }),
	},
	(t) => [pg.index().on(t.createdAt.asc()), pg.index().on(t.deletedAt), pg.index().on(t.customerId)],
);

export const projectSkill = pg.pgTable(
	"project_skill",
	{
		projectId: pg
			.uuid("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		skillId: pg
			.uuid("skill_id")
			.notNull()
			.references(() => skill.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.primaryKey({ columns: [t.projectId, t.skillId] }), pg.index().on(t.projectId), pg.index().on(t.skillId)],
);

export const projectPosition = pg.pgTable(
	"project_position",
	{
		projectId: pg
			.uuid("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		positionId: pg
			.uuid("position_id")
			.notNull()
			.references(() => position.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		pg.primaryKey({ columns: [t.projectId, t.positionId] }),
		pg.index().on(t.projectId),
		pg.index().on(t.positionId),
	],
);

/** A resume can have multiple skills (many-to-many). */
export const resumeSkill = pg.pgTable(
	"resume_skill",
	{
		resumeId: pg
			.uuid("resume_id")
			.notNull()
			.references(() => resume.id, { onDelete: "cascade" }),
		skillId: pg
			.uuid("skill_id")
			.notNull()
			.references(() => skill.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.primaryKey({ columns: [t.resumeId, t.skillId] }), pg.index().on(t.resumeId), pg.index().on(t.skillId)],
);

export const domain = pg.pgTable("domain", {
	id: pg
		.uuid("id")
		.notNull()
		.primaryKey()
		.$defaultFn(() => generateId()),
	name: pg.text("name").notNull().unique(),
	createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: pg
		.timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => /* @__PURE__ */ new Date()),
});

export const projectDomain = pg.pgTable(
	"project_domain",
	{
		projectId: pg
			.uuid("project_id")
			.notNull()
			.references(() => project.id, { onDelete: "cascade" }),
		domainId: pg
			.uuid("domain_id")
			.notNull()
			.references(() => domain.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [pg.primaryKey({ columns: [t.projectId, t.domainId] }), pg.index().on(t.projectId), pg.index().on(t.domainId)],
);

export const customerDomain = pg.pgTable(
	"customer_domain",
	{
		customerId: pg
			.uuid("customer_id")
			.notNull()
			.references(() => customer.id, { onDelete: "cascade" }),
		domainId: pg
			.uuid("domain_id")
			.notNull()
			.references(() => domain.id, { onDelete: "cascade" }),
		createdAt: pg.timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		pg.primaryKey({ columns: [t.customerId, t.domainId] }),
		pg.index().on(t.customerId),
		pg.index().on(t.domainId),
	],
);
