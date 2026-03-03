import { ORPCError } from "@orpc/client";
import { and, eq, ilike } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { generateId } from "@/utils/string";

export const domainService = {
	list: async (input: { query?: string; limit?: number }) => {
		const conditions = input.query?.trim() ? [ilike(schema.domain.name, `%${input.query.trim()}%`)] : undefined;

		let query = db
			.select()
			.from(schema.domain)
			.where(conditions?.length ? and(...conditions) : undefined)
			.orderBy(schema.domain.name);

		if (input.limit !== undefined) {
			query = query.limit(input.limit) as typeof query;
		}
		return await query;
	},

	getById: async (input: { id: string }) => {
		const [row] = await db.select().from(schema.domain).where(eq(schema.domain.id, input.id));
		if (!row) throw new ORPCError("NOT_FOUND");
		return row;
	},

	create: async (input: { name: string }) => {
		const id = generateId();
		await db.insert(schema.domain).values({
			id,
			name: input.name.trim(),
		});
		return id;
	},

	update: async (input: { id: string; name: string }) => {
		const [updated] = await db
			.update(schema.domain)
			.set({ name: input.name.trim() })
			.where(eq(schema.domain.id, input.id))
			.returning();
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
