import { ORPCError } from "@orpc/client";
import { and, asc, desc, eq, exists, ilike, inArray, ne, sql } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { slugify } from "@/utils/string";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const positionService = {
	/** Get position IDs by slug; create if not found. Name is trim() only; slug from slugify for lookup. */
	async getOrCreatePositionIds(names: string[], tx: Tx): Promise<string[]> {
		const seen = new Set<string>();
		const items: { name: string; slug: string }[] = [];
		for (const n of names) {
			const name = n.trim();
			if (!name) continue;
			const slug = slugify(name);
			if (seen.has(slug)) continue;
			seen.add(slug);
			items.push({ name, slug });
		}
		if (items.length === 0) return [];
		const slugs = items.map((i) => i.slug);
		const existing = await tx
			.select({ id: schema.position.id, slug: schema.position.slug })
			.from(schema.position)
			.where(inArray(schema.position.slug, slugs));
		const bySlug = new Map(existing.map((r) => [r.slug, r.id]));
		const missing = items.filter((i) => !bySlug.has(i.slug));
		if (missing.length > 0) {
			const inserted = await tx
				.insert(schema.position)
				.values(missing.map((i) => ({ name: i.name, slug: i.slug })))
				.returning({ id: schema.position.id, slug: schema.position.slug });
			for (const r of inserted) bySlug.set(r.slug, r.id);
		}
		const result: string[] = [];
		for (const item of items) {
			const id = bySlug.get(item.slug);
			if (id === undefined) throw new ORPCError("INTERNAL_SERVER_ERROR");
			result.push(id);
		}
		return result;
	},

	list: async (input?: {
		query?: string;
		sort?: "createdAt" | "name";
		limit?: number;
		page?: number;
		pageSize?: number;
		projectId?: string;
	}) => {
		const queryTrimmed = input?.query?.trim();
		const sort = input?.sort ?? "name";
		const limit = input?.limit;
		const projectId = input?.projectId;
		const hasProjectFilter = Boolean(projectId);

		const whereClause =
			queryTrimmed || hasProjectFilter
				? and(
						...(queryTrimmed
							? [ilike(schema.position.slug, `%${slugify(queryTrimmed)}%`)]
							: []),
						...(hasProjectFilter
							? [
									exists(
										db
											.select()
											.from(schema.projectPosition)
											.where(
												and(
													eq(schema.projectPosition.positionId, schema.position.id),
													eq(schema.projectPosition.projectId, projectId!),
												),
											),
									),
								]
							: []),
					)
				: undefined;

		const baseQuery = db
			.select({
				id: schema.position.id,
				name: schema.position.name,
				slug: schema.position.slug,
				createdAt: schema.position.createdAt,
			})
			.from(schema.position)
			.where(whereClause)
			.orderBy(
				sort === "createdAt"
					? desc(schema.position.createdAt)
					: asc(schema.position.name),
			);

		const countQuery = db
			.select({ count: sql<number>`count(*)::int` })
			.from(schema.position)
			.where(whereClause);

		// Non-paginated usage (e.g. combobox) – respect limit, still return total for convenience.
		if (limit !== undefined && input?.page === undefined && input?.pageSize === undefined) {
			const [countRows, rows] = await Promise.all([
				countQuery,
				baseQuery.limit(limit),
			]);
			const total = countRows[0]?.count ?? 0;
			return { items: rows, total };
		}

		// Paginated usage.
		const page = input?.page ?? 1;
		const pageSize = input?.pageSize ?? 10;
		const offset = (page - 1) * pageSize;

		const [countRows, rows] = await Promise.all([
			countQuery,
			baseQuery.limit(pageSize).offset(offset),
		]);
		const total = countRows[0]?.count ?? 0;
		return { items: rows, total };
	},

	create: async (input: { name: string }) => {
		const name = input.name.trim();
		const slug = slugify(name);
		const [existing] = await db.select().from(schema.position).where(eq(schema.position.slug, slug));
		if (existing) throw new ORPCError("POSITION_SLUG_ALREADY_EXISTS", { status: 400 });
		const [inserted] = await db.insert(schema.position).values({ name, slug }).returning();
		if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");
		return inserted.id;
	},

	update: async (input: { id: string; name: string }) => {
		const name = input.name.trim();
		const slug = slugify(name);
		const [conflict] = await db
			.select()
			.from(schema.position)
			.where(and(eq(schema.position.slug, slug), ne(schema.position.id, input.id)));
		if (conflict) {
			throw new ORPCError("POSITION_SLUG_ALREADY_EXISTS", { status: 400 });
		}
		const [updated] = await db
			.update(schema.position)
			.set({ name, slug })
			.where(eq(schema.position.id, input.id))
			.returning();
		if (!updated) throw new ORPCError("NOT_FOUND");
		return updated;
	},

	delete: async (input: { id: string }) => {
		const [row] = await db
			.delete(schema.position)
			.where(eq(schema.position.id, input.id))
			.returning({ id: schema.position.id });
		if (!row) throw new ORPCError("NOT_FOUND");
	},
};
