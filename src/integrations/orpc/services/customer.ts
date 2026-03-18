import { ORPCError } from "@orpc/client";
import { and, asc, desc, eq, ilike, isNotNull, isNull, ne, sql } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { generateId } from "@/utils/string";

const customerSelect = {
	id: schema.customer.id,
	name: schema.customer.name,
	createdAt: schema.customer.createdAt,
	updatedAt: schema.customer.updatedAt,
	deletedAt: schema.customer.deletedAt,
};

export const customerService = {
	list: async (input: {
		sort?: "lastUpdatedAt" | "name";
		query?: string;
		limit?: number;
		page?: number;
		pageSize?: number;
	}) => {
		const queryTrimmed = input.query?.trim();
		const conditions = queryTrimmed ? [ilike(schema.customer.name, `%${queryTrimmed}%`)] : [];
		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const sort = input.sort ?? "lastUpdatedAt";

		const baseQuery = db
			.select(customerSelect)
			.from(schema.customer)
			.where(whereClause)
			.orderBy(sort === "lastUpdatedAt" ? desc(schema.customer.updatedAt) : asc(schema.customer.name));

		// Non-paginated usage (e.g. combobox / selects) – respect limit, still return total.
		if (input.limit !== undefined && input.page === undefined && input.pageSize === undefined) {
			const [countRows, rows] = await Promise.all([
				db
					.select({ count: sql<number>`count(*)::int` })
					.from(schema.customer)
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
				.from(schema.customer)
				.where(whereClause),
			baseQuery.limit(pageSize).offset(offset),
		]);
		const total = countRows[0]?.count ?? 0;
		return { items: rows, total };
	},

	getById: async (input: { id: string }) => {
		const [row] = await db
			.select(customerSelect)
			.from(schema.customer)
			.where(and(eq(schema.customer.id, input.id), isNull(schema.customer.deletedAt)));
		if (!row) throw new ORPCError("NOT_FOUND");

		const links = await db
			.select({ domainId: schema.customerDomain.domainId })
			.from(schema.customerDomain)
			.where(eq(schema.customerDomain.customerId, input.id));

		return { ...row, domainIds: links.map((l) => l.domainId) };
	},

	create: async (input: { name: string }) => {
		const name = input.name.trim();
		if (!name) throw new ORPCError("BAD_REQUEST");
		const [existing] = await db
			.select(customerSelect)
			.from(schema.customer)
			.where(and(eq(schema.customer.name, name), isNull(schema.customer.deletedAt)));
		if (existing) throw new ORPCError("CUSTOMER_NAME_ALREADY_EXISTS", { status: 400 });
		const id = generateId();
		await db.insert(schema.customer).values({ id, name });
		return id;
	},

	update: async (input: { id: string; name: string }) => {
		const name = input.name.trim();
		const [existing] = await db
			.select(customerSelect)
			.from(schema.customer)
			.where(
				and(eq(schema.customer.name, name), ne(schema.customer.id, input.id), isNull(schema.customer.deletedAt)),
			);
		if (existing) throw new ORPCError("CUSTOMER_NAME_ALREADY_EXISTS", { status: 400 });
		const [updated] = await db
			.update(schema.customer)
			.set({ name })
			.where(and(eq(schema.customer.id, input.id), isNull(schema.customer.deletedAt)))
			.returning(customerSelect);
		if (!updated) throw new ORPCError("NOT_FOUND");
		return updated;
	},

	delete: async (input: { id: string }) => {
		const [row] = await db
			.update(schema.customer)
			.set({ deletedAt: new Date() })
			.where(and(eq(schema.customer.id, input.id), isNull(schema.customer.deletedAt)))
			.returning({ id: schema.customer.id });
		if (!row) throw new ORPCError("NOT_FOUND");
	},

	restore: async (input: { id: string }) => {
		const [row] = await db
			.update(schema.customer)
			.set({ deletedAt: null })
			.where(and(eq(schema.customer.id, input.id), isNotNull(schema.customer.deletedAt)))
			.returning({ id: schema.customer.id });
		if (!row) throw new ORPCError("NOT_FOUND");
	},

	getDomains: async (input: { id: string }) => {
		const [customer] = await db
			.select({ id: schema.customer.id })
			.from(schema.customer)
			.where(and(eq(schema.customer.id, input.id), isNull(schema.customer.deletedAt)));
		if (!customer) throw new ORPCError("NOT_FOUND");
		const links = await db
			.select({ domainId: schema.customerDomain.domainId })
			.from(schema.customerDomain)
			.where(eq(schema.customerDomain.customerId, input.id));
		return links.map((l) => l.domainId);
	},

	setDomains: async (input: { id: string; domainIds: string[] }) => {
		const [customer] = await db
			.select({ id: schema.customer.id })
			.from(schema.customer)
			.where(and(eq(schema.customer.id, input.id), isNull(schema.customer.deletedAt)));
		if (!customer) throw new ORPCError("NOT_FOUND");

		await db.transaction(async (tx) => {
			await tx.delete(schema.customerDomain).where(eq(schema.customerDomain.customerId, input.id));
			if (input.domainIds.length > 0) {
				await tx.insert(schema.customerDomain).values(
					input.domainIds.map((domainId) => ({
						customerId: input.id,
						domainId,
					})),
				);
			}
		});
	},
};

