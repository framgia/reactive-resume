import { ORPCError } from "@orpc/client";
import { and, asc, desc, eq, exists, inArray, isNotNull, isNull, like, or, sql } from "drizzle-orm";
import { get } from "es-toolkit/compat";
import type { Operation } from "fast-json-patch";
import { match } from "ts-pattern";
import type { z } from "zod";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import type { ResumeData } from "@/schema/resume/data";
import { defaultResumeData } from "@/schema/resume/data";
import { env } from "@/utils/env";
import type { Locale } from "@/utils/locale";
import { hashPassword, verifyPassword } from "@/utils/password";
import { applyResumePatches, ResumePatchError } from "@/utils/resume/patch";
import { generateId } from "@/utils/string";
import type { resumeDto } from "../dto/resume";
import { grantResumeAccess, hasResumeAccess } from "../helpers/resume-access";
import { getStorageService } from "./storage";

type GetByIdOutput = z.infer<typeof resumeDto.getById.output>;

async function getSkillsForResume(resumeId: string): Promise<{ id: string; name: string }[]> {
	const rows = await db
		.select({ id: schema.skill.id, name: schema.skill.name })
		.from(schema.resumeSkill)
		.innerJoin(schema.skill, eq(schema.resumeSkill.skillId, schema.skill.id))
		.where(eq(schema.resumeSkill.resumeId, resumeId));
	return rows;
}

const tags = {
	list: async (input: { userId: string }) => {
		const result = await db
			.select({ tags: schema.resume.tags })
			.from(schema.resume)
			.where(eq(schema.resume.userId, input.userId));

		const uniqueTags = new Set(result.flatMap((tag) => tag.tags));
		const sortedTags = Array.from(uniqueTags).sort((a, b) => a.localeCompare(b));

		return sortedTags;
	},
};

const statistics = {
	getById: async (input: { id: string; userId: string }) => {
		const [statistics] = await db
			.select({
				isPublic: schema.resume.isPublic,
				views: schema.resumeStatistics.views,
				downloads: schema.resumeStatistics.downloads,
				lastViewedAt: schema.resumeStatistics.lastViewedAt,
				lastDownloadedAt: schema.resumeStatistics.lastDownloadedAt,
			})
			.from(schema.resumeStatistics)
			.rightJoin(schema.resume, eq(schema.resumeStatistics.resumeId, schema.resume.id))
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));

		return {
			isPublic: statistics.isPublic,
			views: statistics.views ?? 0,
			downloads: statistics.downloads ?? 0,
			lastViewedAt: statistics.lastViewedAt,
			lastDownloadedAt: statistics.lastDownloadedAt,
		};
	},

	increment: async (input: { id: string; views?: boolean; downloads?: boolean }) => {
		const views = input.views ? 1 : 0;
		const downloads = input.downloads ? 1 : 0;
		const lastViewedAt = input.views ? sql`now()` : undefined;
		const lastDownloadedAt = input.downloads ? sql`now()` : undefined;

		await db
			.insert(schema.resumeStatistics)
			.values({
				resumeId: input.id,
				views,
				downloads,
				lastViewedAt,
				lastDownloadedAt,
			})
			.onConflictDoUpdate({
				target: [schema.resumeStatistics.resumeId],
				set: {
					views: sql`${schema.resumeStatistics.views} + ${views}`,
					downloads: sql`${schema.resumeStatistics.downloads} + ${downloads}`,
					lastViewedAt,
					lastDownloadedAt,
				},
			});
	},
};

export const resumeService = {
	tags,
	statistics,

	list: async (input: {
		userId: string;
		sort: "lastUpdatedAt" | "createdAt" | "name";
		projectId?: string | null;
		skillIds?: string[];
		positionId?: string | null;
	}) => {
		const skillIds = input.skillIds?.length ? input.skillIds : undefined;
		const positionFilter =
			input.positionId !== undefined
				? input.positionId === null
					? isNull(schema.resume.positionId)
					: eq(schema.resume.positionId, input.positionId)
				: undefined;

		const projectIdFilter =
			input.projectId !== undefined
				? input.projectId === null
					? isNull(schema.resume.projectId)
					: eq(schema.resume.projectId, input.projectId)
				: undefined;

		// When filtering by projectId: INNER JOIN project so only non-deleted projects are included.
		// Otherwise: LEFT JOIN + project.deleted_at IS NULL so resumes without project or with valid project are included.
		const hasProjectFilter = input.projectId !== undefined;
		const baseQuery =
			hasProjectFilter && input.projectId !== null
				? db
						.select({
							id: schema.resume.id,
							name: schema.resume.name,
							slug: schema.resume.slug,
							tags: schema.resume.tags,
							isPublic: schema.resume.isPublic,
							isLocked: schema.resume.isLocked,
							projectId: schema.resume.projectId,
							positionId: schema.resume.positionId,
							createdAt: schema.resume.createdAt,
							updatedAt: schema.resume.updatedAt,
						})
						.from(schema.resume)
						.innerJoin(
							schema.project,
							and(eq(schema.resume.projectId, schema.project.id), isNull(schema.project.deletedAt)),
						)
				: db
						.select({
							id: schema.resume.id,
							name: schema.resume.name,
							slug: schema.resume.slug,
							tags: schema.resume.tags,
							isPublic: schema.resume.isPublic,
							isLocked: schema.resume.isLocked,
							projectId: schema.resume.projectId,
							positionId: schema.resume.positionId,
							createdAt: schema.resume.createdAt,
							updatedAt: schema.resume.updatedAt,
						})
						.from(schema.resume)
						.leftJoin(schema.project, eq(schema.resume.projectId, schema.project.id));

		return await baseQuery
			.where(
				and(
					eq(schema.resume.userId, input.userId),
					projectIdFilter ?? or(isNull(schema.resume.projectId), isNull(schema.project.deletedAt)),
					skillIds?.length
						? exists(
								db
									.select()
									.from(schema.resumeSkill)
									.where(
										and(
											eq(schema.resumeSkill.resumeId, schema.resume.id),
											inArray(schema.resumeSkill.skillId, skillIds),
										),
									),
							)
						: undefined,
					positionFilter,
				),
			)
			.orderBy(
				match(input.sort)
					.with("lastUpdatedAt", () => desc(schema.resume.updatedAt))
					.with("createdAt", () => asc(schema.resume.createdAt))
					.with("name", () => asc(schema.resume.name))
					.exhaustive(),
			);
	},

	getById: async (input: { id: string; userId: string }): Promise<GetByIdOutput> => {
		const [resume] = await db
			.select({
				id: schema.resume.id,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				data: schema.resume.data,
				isPublic: schema.resume.isPublic,
				isLocked: schema.resume.isLocked,
				projectId: schema.resume.projectId,
				positionId: schema.resume.positionId,
				hasPassword: sql<boolean>`${schema.resume.password} IS NOT NULL`,
			})
			.from(schema.resume)
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));

		if (!resume) throw new ORPCError("NOT_FOUND");

		const [skills, positionRow] = await Promise.all([
			getSkillsForResume(resume.id),
			resume.positionId
				? db
						.select({ name: schema.position.name })
						.from(schema.position)
						.where(eq(schema.position.id, resume.positionId))
						.then(([r]) => r?.name ?? null)
				: Promise.resolve(null),
		]);

		return {
			...resume,
			positionId: resume.positionId,
			skills,
			position: positionRow,
		} as GetByIdOutput;
	},

	getByIdForPrinter: async (input: { id: string; userId?: string }) => {
		const [resume] = await db
			.select({
				id: schema.resume.id,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				data: schema.resume.data,
				userId: schema.resume.userId,
				isLocked: schema.resume.isLocked,
				projectId: schema.resume.projectId,
				updatedAt: schema.resume.updatedAt,
			})
			.from(schema.resume)
			.where(
				input.userId
					? and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId))
					: eq(schema.resume.id, input.id),
			);

		if (!resume) throw new ORPCError("NOT_FOUND");

		try {
			if (!resume.data.picture.url) throw new Error("Picture is not available");

			// Convert picture URL to base64 data, so there's no fetching required on the client.
			const url = resume.data.picture.url.replace(env.APP_URL, "http://localhost:3000");
			const base64 = await fetch(url)
				.then((res) => res.arrayBuffer())
				.then((buffer) => Buffer.from(buffer).toString("base64"));

			resume.data.picture.url = `data:image/jpeg;base64,${base64}`;
		} catch {
			// Ignore errors, as the picture is not always available
		}

		return {
			...resume,
			skills: [],
			position: null,
			positionId: null,
		};
	},

	getBySlug: async (input: { username: string; slug: string; currentUserId?: string }) => {
		const [resume] = await db
			.select({
				id: schema.resume.id,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				data: schema.resume.data,
				isPublic: schema.resume.isPublic,
				isLocked: schema.resume.isLocked,
				projectId: schema.resume.projectId,
				passwordHash: schema.resume.password,
				hasPassword: sql<boolean>`${schema.resume.password} IS NOT NULL`,
			})
			.from(schema.resume)
			.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
			.where(
				and(
					eq(schema.resume.slug, input.slug),
					eq(schema.user.username, input.username),
					input.currentUserId ? eq(schema.resume.userId, input.currentUserId) : eq(schema.resume.isPublic, true),
				),
			);

		if (!resume) throw new ORPCError("NOT_FOUND");

		if (!resume.hasPassword) {
			await resumeService.statistics.increment({ id: resume.id, views: true });

			return {
				id: resume.id,
				name: resume.name,
				slug: resume.slug,
				tags: resume.tags,
				data: resume.data,
				isPublic: resume.isPublic,
				isLocked: resume.isLocked,
				projectId: resume.projectId,
				skills: [],
				position: null,
				positionId: null,
				hasPassword: false as const,
			};
		}

		if (hasResumeAccess(resume.id, resume.passwordHash)) {
			await resumeService.statistics.increment({ id: resume.id, views: true });

			return {
				id: resume.id,
				name: resume.name,
				slug: resume.slug,
				tags: resume.tags,
				data: resume.data,
				isPublic: resume.isPublic,
				isLocked: resume.isLocked,
				projectId: resume.projectId,
				skills: [],
				position: null,
				positionId: null,
				hasPassword: true as const,
			};
		}

		throw new ORPCError("NEED_PASSWORD", {
			status: 401,
			data: { username: input.username, slug: input.slug },
		});
	},

	getNextCopyNumber: async (input: { userId: string; slugPrefix: string }) => {
		const { userId, slugPrefix } = input;
		const rows = await db
			.select({ slug: schema.resume.slug })
			.from(schema.resume)
			.where(and(eq(schema.resume.userId, userId), like(schema.resume.slug, `${slugPrefix}%`)));
		let max = 0;
		for (const { slug } of rows) {
			if (slug.startsWith(slugPrefix)) {
				const suffix = slug.slice(slugPrefix.length);
				const n = Number.parseInt(suffix, 10);
				if (Number.isInteger(n) && n >= 1) max = Math.max(max, n);
			}
		}
		return max + 1;
	},

	create: async (input: {
		userId: string;
		name: string;
		slug: string;
		tags: string[];
		locale: Locale;
		data?: ResumeData;
		sharedCopyFromId?: string;
		projectId?: string | null;
		skillIds?: string[];
		positionId?: string | null;
	}) => {
		const id = generateId();

		input.data = input.data ?? defaultResumeData;
		input.data.metadata.page.locale = input.locale;

		try {
			await db.insert(schema.resume).values({
				id,
				name: input.name,
				slug: input.slug,
				tags: input.tags,
				userId: input.userId,
				projectId: input.projectId ?? null,
				positionId: input.positionId ?? null,
				data: input.data,
				sharedCopyFromId: input.sharedCopyFromId,
			});

			const skillIds = input.skillIds?.length ? input.skillIds : [];
			if (skillIds.length > 0) {
				await db.insert(schema.resumeSkill).values(skillIds.map((skillId) => ({ resumeId: id, skillId })));
			}

			return id;
		} catch (error) {
			const constraint = get(error, "cause.constraint") as string | undefined;

			if (constraint === "resume_slug_user_id_unique") {
				throw new ORPCError("RESUME_SLUG_ALREADY_EXISTS", { status: 400 });
			}

			throw error;
		}
	},

	update: async (input: {
		id: string;
		userId: string;
		name?: string;
		slug?: string;
		tags?: string[];
		data?: ResumeData;
		isPublic?: boolean;
		projectId?: string | null;
		skillIds?: string[];
		positionId?: string | null;
	}) => {
		const [resume] = await db
			.select({ isLocked: schema.resume.isLocked })
			.from(schema.resume)
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));

		if (resume?.isLocked) throw new ORPCError("RESUME_LOCKED");

		const updateData: Partial<typeof schema.resume.$inferSelect> = {};
		if (input.name !== undefined) updateData.name = input.name;
		if (input.slug !== undefined) updateData.slug = input.slug;
		if (input.tags !== undefined) updateData.tags = input.tags;
		if (input.data !== undefined) updateData.data = input.data;
		if (input.isPublic !== undefined) updateData.isPublic = input.isPublic;
		if (input.projectId !== undefined) updateData.projectId = input.projectId;
		if (input.positionId !== undefined) updateData.positionId = input.positionId;

		const resumeWhere = and(
			eq(schema.resume.id, input.id),
			eq(schema.resume.isLocked, false),
			eq(schema.resume.userId, input.userId),
		);
		const returning = {
			id: schema.resume.id,
			name: schema.resume.name,
			slug: schema.resume.slug,
			tags: schema.resume.tags,
			data: schema.resume.data,
			isPublic: schema.resume.isPublic,
			isLocked: schema.resume.isLocked,
			projectId: schema.resume.projectId,
			positionId: schema.resume.positionId,
			hasPassword: sql<boolean>`${schema.resume.password} IS NOT NULL`,
		};

		try {
			const updated = await db.transaction(async (tx) => {
				if (input.skillIds !== undefined) {
					await tx.delete(schema.resumeSkill).where(eq(schema.resumeSkill.resumeId, input.id));
					if (input.skillIds.length > 0) {
						await tx
							.insert(schema.resumeSkill)
							.values(input.skillIds.map((skillId) => ({ resumeId: input.id, skillId })));
					}
				}

				const [row] =
					Object.keys(updateData).length > 0
						? await tx
								.update(schema.resume)
								.set(updateData)
								.where(resumeWhere)
								.returning(returning)
						: await tx.select(returning).from(schema.resume).where(resumeWhere);
				if (!row) throw new ORPCError("NOT_FOUND");
				return row;
			});

			const [skills, positionName] = await Promise.all([
				getSkillsForResume(updated.id),
				updated.positionId
					? db
							.select({ name: schema.position.name })
							.from(schema.position)
							.where(eq(schema.position.id, updated.positionId))
							.then(([r]) => r?.name ?? null)
					: Promise.resolve(null),
			]);

			return {
				...updated,
				skills,
				position: positionName,
			};
		} catch (error) {
			if (get(error, "cause.constraint") === "resume_slug_user_id_unique") {
				throw new ORPCError("RESUME_SLUG_ALREADY_EXISTS", { status: 400 });
			}

			throw error;
		}
	},

	patch: async (input: { id: string; userId: string; operations: Operation[] }) => {
		const [existing] = await db
			.select({ data: schema.resume.data, isLocked: schema.resume.isLocked })
			.from(schema.resume)
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));

		if (!existing) throw new ORPCError("NOT_FOUND");
		if (existing.isLocked) throw new ORPCError("RESUME_LOCKED");

		let patchedData: ResumeData;

		try {
			patchedData = applyResumePatches(existing.data, input.operations);
		} catch (error) {
			if (error instanceof ResumePatchError) {
				throw new ORPCError("INVALID_PATCH_OPERATIONS", {
					status: 400,
					message: error.message,
					data: { code: error.code, index: error.index, operation: error.operation },
				});
			}

			throw new ORPCError("INVALID_PATCH_OPERATIONS", {
				status: 400,
				message: error instanceof Error ? error.message : "Failed to apply patch operations",
			});
		}

		const [resume] = await db
			.update(schema.resume)
			.set({ data: patchedData })
			.where(
				and(eq(schema.resume.id, input.id), eq(schema.resume.isLocked, false), eq(schema.resume.userId, input.userId)),
			)
			.returning({
				id: schema.resume.id,
				name: schema.resume.name,
				slug: schema.resume.slug,
				tags: schema.resume.tags,
				data: schema.resume.data,
				isPublic: schema.resume.isPublic,
				isLocked: schema.resume.isLocked,
				projectId: schema.resume.projectId,
				positionId: schema.resume.positionId,
				hasPassword: sql<boolean>`${schema.resume.password} IS NOT NULL`,
			});

		if (!resume) throw new ORPCError("NOT_FOUND");
		const skills = await getSkillsForResume(resume.id);
		return { ...resume, skills };
	},

	setLocked: async (input: { id: string; userId: string; isLocked: boolean }) => {
		await db
			.update(schema.resume)
			.set({ isLocked: input.isLocked })
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));
	},

	setPassword: async (input: { id: string; userId: string; password: string }) => {
		const hashedPassword = await hashPassword(input.password);

		await db
			.update(schema.resume)
			.set({ password: hashedPassword })
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));
	},

	verifyPassword: async (input: { slug: string; username: string; password: string }) => {
		const [resume] = await db
			.select({ id: schema.resume.id, password: schema.resume.password })
			.from(schema.resume)
			.innerJoin(schema.user, eq(schema.resume.userId, schema.user.id))
			.where(
				and(
					isNotNull(schema.resume.password),
					eq(schema.resume.slug, input.slug),
					eq(schema.user.username, input.username),
				),
			);

		if (!resume) throw new ORPCError("NOT_FOUND");

		const passwordHash = resume.password as string;
		const isValid = await verifyPassword(input.password, passwordHash);

		if (!isValid) throw new ORPCError("INVALID_PASSWORD");

		grantResumeAccess(resume.id, passwordHash);

		return true;
	},

	removePassword: async (input: { id: string; userId: string }) => {
		await db
			.update(schema.resume)
			.set({ password: null })
			.where(and(eq(schema.resume.id, input.id), eq(schema.resume.userId, input.userId)));
	},

	delete: async (input: { id: string; userId: string }) => {
		const storageService = getStorageService();

		const deleteResumePromise = db
			.delete(schema.resume)
			.where(
				and(eq(schema.resume.id, input.id), eq(schema.resume.isLocked, false), eq(schema.resume.userId, input.userId)),
			);

		// Delete screenshots and PDFs using the new key format
		const deleteScreenshotsPromise = storageService.delete(`uploads/${input.userId}/screenshots/${input.id}`);
		const deletePdfsPromise = storageService.delete(`uploads/${input.userId}/pdfs/${input.id}`);

		await Promise.allSettled([deleteResumePromise, deleteScreenshotsPromise, deletePdfsPromise]);
	},
};
