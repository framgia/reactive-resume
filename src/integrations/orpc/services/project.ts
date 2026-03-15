import { ORPCError } from "@orpc/client";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, or, sql } from "drizzle-orm";
import { match } from "ts-pattern";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { positionService } from "@/integrations/orpc/services/position";
import { skillService } from "@/integrations/orpc/services/skill";
import { generateId } from "@/utils/string";

export const projectService = {
	list: async (input: {
		sort: "lastUpdatedAt" | "createdAt" | "name";
		name?: string;
		customerName?: string;
		domainIds?: string[];
		skillIds?: string[];
		positionId?: string | null;
		query?: string;
		limit?: number;
		page?: number;
		pageSize?: number;
	}) => {
		const conditions: ReturnType<typeof eq>[] = [];
		const nameTrimmed = input.name?.trim();
		const customerNameTrimmed = input.customerName?.trim();
		const queryTrimmed = input.query?.trim();
		const domainIdsFilter = input.domainIds?.map((id) => id.trim()).filter(Boolean);
		const hasDomainFilter = (domainIdsFilter?.length ?? 0) > 0;
		if (nameTrimmed) {
			conditions.push(ilike(schema.project.name, `%${nameTrimmed}%`));
		}
		if (customerNameTrimmed) {
			conditions.push(ilike(schema.project.customerName, `%${customerNameTrimmed}%`));
		}
		if (queryTrimmed) {
			const queryCondition = or(
				ilike(schema.project.name, `%${queryTrimmed}%`),
				ilike(schema.project.customerName, `%${queryTrimmed}%`),
			);
			if (queryCondition) conditions.push(queryCondition);
		}
		if (hasDomainFilter && domainIdsFilter) {
			conditions.push(
				inArray(
					schema.project.id,
					db
						.select({ id: schema.projectDomain.projectId })
						.from(schema.projectDomain)
						.where(inArray(schema.projectDomain.domainId, domainIdsFilter)),
				),
			);
		}

		const skillIdsFilter = input.skillIds?.map((id) => id.trim()).filter(Boolean);
		const hasSkillFilter = (skillIdsFilter?.length ?? 0) > 0;
		if (hasSkillFilter && skillIdsFilter) {
			conditions.push(
				inArray(
					schema.project.id,
					db
						.select({ id: schema.projectSkill.projectId })
						.from(schema.projectSkill)
						.where(inArray(schema.projectSkill.skillId, skillIdsFilter)),
				),
			);
		}

		const positionIdFilter = input.positionId?.trim();
		const hasPositionFilter = Boolean(positionIdFilter);
		if (hasPositionFilter && positionIdFilter) {
			conditions.push(
				inArray(
					schema.project.id,
					db
						.select({ id: schema.projectPosition.projectId })
						.from(schema.projectPosition)
						.where(eq(schema.projectPosition.positionId, positionIdFilter)),
				),
			);
		}

		const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

		const page = input.page ?? 1;
		const pageSize = input.pageSize ?? input.limit ?? 10;
		const offset = (page - 1) * pageSize;

		const baseQuery = db
			.select({
				id: schema.project.id,
				name: schema.project.name,
				description: schema.project.description,
				customerName: schema.project.customerName,
				createdAt: schema.project.createdAt,
				updatedAt: schema.project.updatedAt,
				deletedAt: schema.project.deletedAt,
				domainNames:
					sql<string>`COALESCE(string_agg(${schema.domain.name}, ', ' ORDER BY ${schema.domain.name}), '')`.as(
						"domain_names",
					),
			})
			.from(schema.project)
			.leftJoin(schema.projectDomain, eq(schema.project.id, schema.projectDomain.projectId))
			.leftJoin(schema.domain, eq(schema.projectDomain.domainId, schema.domain.id))
			.where(whereClause)
			.groupBy(
				schema.project.id,
				schema.project.name,
				schema.project.description,
				schema.project.customerName,
				schema.project.createdAt,
				schema.project.updatedAt,
				schema.project.deletedAt,
			)
			.orderBy(
				match(input.sort)
					.with("lastUpdatedAt", () => desc(schema.project.updatedAt))
					.with("createdAt", () => asc(schema.project.createdAt))
					.with("name", () => asc(schema.project.name))
					.exhaustive(),
			);

		const [countRows, rows] = await Promise.all([
			db.select({ count: sql<number>`count(*)::int` }).from(schema.project).where(whereClause),
			baseQuery.limit(pageSize).offset(offset),
		]);
		const total = countRows[0]?.count ?? 0;
		return { items: rows, total };
	},

	getById: async (input: { id: string }) => {
		const rows = await db
			.select({
				project: schema.project,
				domainId: schema.projectDomain.domainId,
			})
			.from(schema.project)
			.leftJoin(schema.projectDomain, eq(schema.project.id, schema.projectDomain.projectId))
			.where(and(eq(schema.project.id, input.id), isNull(schema.project.deletedAt)));

		if (rows.length === 0) throw new ORPCError("NOT_FOUND");

		const project = rows[0].project;
		const domainIds = rows.map((r) => r.domainId).filter((id): id is string => id != null);

		const [skills, positions] = await Promise.all([
			db
				.select({ id: schema.skill.id, name: schema.skill.name })
				.from(schema.projectSkill)
				.innerJoin(schema.skill, eq(schema.projectSkill.skillId, schema.skill.id))
				.where(eq(schema.projectSkill.projectId, input.id)),
			db
				.select({ id: schema.position.id, name: schema.position.name })
				.from(schema.projectPosition)
				.innerJoin(schema.position, eq(schema.projectPosition.positionId, schema.position.id))
				.where(eq(schema.projectPosition.projectId, input.id)),
		]);

		return {
			...project,
			domainIds,
			skills,
			position: positions,
		};
	},

	create: async (input: {
		name: string;
		description?: string | null;
		customerName?: string | null;
		skills?: string[];
		position?: string[];
		domainIds?: string[];
	}) => {
		const id = generateId();
		const skillNames = input.skills ?? [];
		const positionNames = input.position ?? [];

		await db.transaction(async (tx) => {
			await tx.insert(schema.project).values({
				id,
				name: input.name,
				description: input.description ?? null,
				customerName: input.customerName ?? null,
			});

			const skillIds = await skillService.getOrCreateSkillIds(skillNames, tx);
			if (skillIds.length > 0) {
				await tx.insert(schema.projectSkill).values(skillIds.map((skillId) => ({ projectId: id, skillId })));
			}
			const positionIds = await positionService.getOrCreatePositionIds(positionNames, tx);
			if (positionIds.length > 0) {
				await tx
					.insert(schema.projectPosition)
					.values(positionIds.map((positionId) => ({ projectId: id, positionId })));
			}
			if (input.domainIds?.length) {
				await tx.insert(schema.projectDomain).values(
					input.domainIds.map((domainId) => ({
						projectId: id,
						domainId,
					})),
				);
			}
		});

		return id;
	},

	update: async (input: {
		id: string;
		name?: string;
		description?: string | null;
		customerName?: string | null;
		skills?: string[];
		position?: string[];
		domainIds?: string[];
	}) => {
		const projectWhere = and(eq(schema.project.id, input.id), isNull(schema.project.deletedAt));

		const updateData: Partial<typeof schema.project.$inferSelect> = {
			name: input.name,
			description: input.description,
			customerName: input.customerName,
		};

		const runUpdate = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
			const [row] = await tx.update(schema.project).set(updateData).where(projectWhere).returning();
			if (!row) throw new ORPCError("NOT_FOUND");

			if (input.skills !== undefined) {
				await tx.delete(schema.projectSkill).where(eq(schema.projectSkill.projectId, input.id));
				const skillIds = await skillService.getOrCreateSkillIds(input.skills, tx);
				if (skillIds.length > 0) {
					await tx.insert(schema.projectSkill).values(skillIds.map((skillId) => ({ projectId: input.id, skillId })));
				}
			}
			if (input.position !== undefined) {
				await tx.delete(schema.projectPosition).where(eq(schema.projectPosition.projectId, input.id));
				const positionIds = await positionService.getOrCreatePositionIds(input.position, tx);
				if (positionIds.length > 0) {
					await tx
						.insert(schema.projectPosition)
						.values(positionIds.map((positionId) => ({ projectId: input.id, positionId })));
				}
			}
			if (input.domainIds !== undefined) {
				await tx.delete(schema.projectDomain).where(eq(schema.projectDomain.projectId, input.id));
				if (input.domainIds.length > 0) {
					await tx
						.insert(schema.projectDomain)
						.values(input.domainIds.map((domainId) => ({ projectId: input.id, domainId })));
				}
			}

			return row;
		};

		const attachSkillsPosition = async (row: typeof schema.project.$inferSelect) => {
			const [skillNames, positionNames] = await Promise.all([
				db
					.select({ name: schema.skill.name })
					.from(schema.projectSkill)
					.innerJoin(schema.skill, eq(schema.projectSkill.skillId, schema.skill.id))
					.where(eq(schema.projectSkill.projectId, row.id)),
				db
					.select({ name: schema.position.name })
					.from(schema.projectPosition)
					.innerJoin(schema.position, eq(schema.projectPosition.positionId, schema.position.id))
					.where(eq(schema.projectPosition.projectId, row.id)),
			]);
			return { ...row, skills: skillNames.map((r) => r.name), position: positionNames.map((r) => r.name) };
		};

		const needsTx = input.skills !== undefined || input.position !== undefined || input.domainIds !== undefined;
		if (needsTx) {
			const row = await db.transaction(runUpdate);
			return await attachSkillsPosition(row);
		}

		const [updated] = await db.update(schema.project).set(updateData).where(projectWhere).returning();
		if (!updated) throw new ORPCError("NOT_FOUND");
		return await attachSkillsPosition(updated);
	},

	delete: async (input: { id: string }) => {
		const [row] = await db
			.select({ id: schema.project.id })
			.from(schema.project)
			.where(and(eq(schema.project.id, input.id), isNull(schema.project.deletedAt)));

		if (!row) throw new ORPCError("NOT_FOUND");

		await db
			.update(schema.project)
			.set({ deletedAt: new Date() })
			.where(and(eq(schema.project.id, input.id)));
	},

	restore: async (input: { id: string }) => {
		const [row] = await db
			.update(schema.project)
			.set({ deletedAt: null })
			.where(and(eq(schema.project.id, input.id), isNotNull(schema.project.deletedAt)))
			.returning({ id: schema.project.id });

		if (!row) throw new ORPCError("NOT_FOUND");
	},

	getDomains: async (input: { id: string }) => {
		const [project] = await db
			.select({ id: schema.project.id })
			.from(schema.project)
			.where(and(eq(schema.project.id, input.id), isNull(schema.project.deletedAt)));
		if (!project) throw new ORPCError("NOT_FOUND");
		const links = await db
			.select({ domainId: schema.projectDomain.domainId })
			.from(schema.projectDomain)
			.where(eq(schema.projectDomain.projectId, input.id));
		return links.map((l) => l.domainId);
	},

	setDomains: async (input: { id: string; domainIds: string[] }) => {
		const [project] = await db
			.select({ id: schema.project.id })
			.from(schema.project)
			.where(and(eq(schema.project.id, input.id), isNull(schema.project.deletedAt)));
		if (!project) throw new ORPCError("NOT_FOUND");

		await db.transaction(async (tx) => {
			await tx.delete(schema.projectDomain).where(eq(schema.projectDomain.projectId, input.id));
			if (input.domainIds.length > 0) {
				await tx.insert(schema.projectDomain).values(
					input.domainIds.map((domainId) => ({
						projectId: input.id,
						domainId,
					})),
				);
			}
		});
	},
};
