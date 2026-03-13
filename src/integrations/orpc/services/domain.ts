import { ORPCError } from "@orpc/client";
import { and, eq, ilike, ne, sql } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { generateId } from "@/utils/string";

export const domainService = {
	list: async (input: { query?: string; limit?: number; page?: number; pageSize?: number }) => {
		const queryTrimmed = input.query?.trim();
		const conditions = queryTrimmed ? [ilike(schema.domain.name, `%${queryTrimmed}%`)] : undefined;
		const whereClause = conditions?.length ? and(...conditions) : undefined;

		const baseQuery = db
			.select()
			.from(schema.domain)
			.where(whereClause)
			.orderBy(schema.domain.name);

		// Non-paginated usage (e.g. combobox / selects) – respect limit, still return total.
		if (input.limit !== undefined && input.page === undefined && input.pageSize === undefined) {
			const [countRows, rows] = await Promise.all([
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(schema.domain)
					.where(whereClause),
				baseQuery.limit(input.limit),
			]);
			const total = countRows[0]?.count ?? 0;
			return { items: rows, total };
		}

		// Paginated usage.
		const page = input.page ?? 1;
		const pageSize = input.pageSize ?? 10;
		const offset = (page - 1) * pageSize;

		const [countRows, rows] = await Promise.all([
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(schema.domain)
				.where(whereClause),
			baseQuery.limit(pageSize).offset(offset),
		]);
		const total = countRows[0]?.count ?? 0;
		return { items: rows, total };
	},

	getById: async (input: { id: string }) => {
		const [row] = await db.select().from(schema.domain).where(eq(schema.domain.id, input.id));
		if (!row) throw new ORPCError("NOT_FOUND");
		return row;
	},

	create: async (input: { name: string }) => {
		const name = input.name.trim();
		const [existing] = await db.select().from(schema.domain).where(eq(schema.domain.name, name));
		if (existing) throw new ORPCError("DOMAIN_NAME_ALREADY_EXISTS", { status: 400 });
		const id = generateId();
		await db.insert(schema.domain).values({ id, name });
		return id;
	},

	update: async (input: { id: string; name: string }) => {
		const name = input.name.trim();
		const [existing] = await db
			.select()
			.from(schema.domain)
			.where(and(eq(schema.domain.name, name), ne(schema.domain.id, input.id)));
		if (existing) throw new ORPCError("DOMAIN_NAME_ALREADY_EXISTS", { status: 400 });
		const [updated] = await db.update(schema.domain).set({ name }).where(eq(schema.domain.id, input.id)).returning();
		if (!updated) throw new ORPCError("NOT_FOUND");
		return updated;
	},

	delete: async (input: { id: string }) => {
		const [row] = await db
			.delete(schema.domain)
			.where(eq(schema.domain.id, input.id))
			.returning({ id: schema.domain.id });
		if (!row) throw new ORPCError("NOT_FOUND");
	},
};
