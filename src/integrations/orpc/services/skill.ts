import { ORPCError } from "@orpc/client";
import { asc, ilike, inArray } from "drizzle-orm";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { slugify } from "@/utils/string";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const skillService = {
	/** Get skill IDs by slug; create if not found. Name is trim() only; slug from slugify for lookup. */
	async getOrCreateSkillIds(names: string[], tx: Tx): Promise<string[]> {
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
			.select({ id: schema.skill.id, slug: schema.skill.slug })
			.from(schema.skill)
			.where(inArray(schema.skill.slug, slugs));
		const bySlug = new Map(existing.map((r) => [r.slug, r.id]));
		const missing = items.filter((i) => !bySlug.has(i.slug));
		if (missing.length > 0) {
			const inserted = await tx
				.insert(schema.skill)
				.values(missing.map((i) => ({ name: i.name, slug: i.slug })))
				.returning({ id: schema.skill.id, slug: schema.skill.slug });
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

	list: async (input?: { query?: string; limit?: number }) => {
		const query = input?.query?.trim();
		const limit = input?.limit ?? 20;
		let q = db
			.select({ id: schema.skill.id, name: schema.skill.name, slug: schema.skill.slug })
			.from(schema.skill)
			.orderBy(asc(schema.skill.slug));
		if (query) {
			const slugLike = `%${slugify(query)}%`;
			q = q.where(ilike(schema.skill.slug, slugLike)) as typeof q;
		}
		return await q.limit(limit);
	},
};
