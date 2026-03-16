import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import { schema } from "@/integrations/drizzle";
import { resumeDataSchema } from "@/schema/resume/data";
import { jsonPatchOperationSchema } from "@/utils/resume/patch";

const resumeSchema = createSelectSchema(schema.resume, {
	id: z.string().describe("The ID of the resume."),
	name: z.string().min(1).describe("The name of the resume."),
	slug: z.string().min(1).describe("The slug of the resume."),
	tags: z.array(z.string()).describe("The tags of the resume."),
	isPublic: z.boolean().describe("Whether the resume is public."),
	isLocked: z.boolean().describe("Whether the resume is locked."),
	password: z.string().min(6).nullable().describe("The password of the resume, if any."),
	data: resumeDataSchema.loose(),
	userId: z.string().describe("The ID of the user who owns the resume."),
	projectId: z.string().nullable().describe("The ID of the project this resume belongs to, if any."),
	positionId: z.string().nullable().describe("The selected position ID from the project's positions, if any."),
	createdAt: z.date().describe("The date and time the resume was created."),
	updatedAt: z.date().describe("The date and time the resume was last updated."),
});

export const resumeDto = {
	list: {
		input: z
			.object({
				sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).optional().default("lastUpdatedAt"),
				projectId: z.string().nullable().optional().describe("Filter by project ID; omit for all."),
				skillIds: z.array(z.string().uuid()).optional().default([]).describe("Filter by skills (resume has any)."),
				positionId: z
					.string()
					.uuid()
					.nullable()
					.optional()
					.describe("Filter by overall position/level; null = no position."),
			})
			.optional()
			.default({ sort: "lastUpdatedAt", skillIds: [], positionId: undefined }),

		output: z.array(resumeSchema.omit({ data: true, password: true, userId: true, sharedCopyFromId: true })),
	},

	getById: {
		input: resumeSchema.pick({ id: true }),
		output: resumeSchema
			.omit({
				password: true,
				userId: true,
				createdAt: true,
				updatedAt: true,
				sharedCopyFromId: true,
			})
			.extend({
				hasPassword: z.boolean(),
				skills: z
					.array(z.object({ id: z.string(), name: z.string() }))
					.describe("Selected skills from the project (id and display name)."),
				position: z.string().nullable().describe("Display name of the selected position."),
			}),
	},

	getBySlug: {
		input: z.object({ username: z.string(), slug: z.string() }),
		output: resumeSchema
			.omit({
				password: true,
				userId: true,
				createdAt: true,
				updatedAt: true,
				sharedCopyFromId: true,
			})
			.extend({
				skills: z.array(z.object({ id: z.string(), name: z.string() })),
				position: z.string().nullable(),
			}),
	},

	create: {
		input: resumeSchema.pick({ name: true, slug: true, tags: true }).extend({
			withSampleData: z.boolean().default(false),
			projectId: z.string().nullable().optional(),
			skillIds: z.array(z.string().uuid()).optional().default([]),
			positionId: z.string().nullable().optional(),
		}),
		output: z.string().describe("The ID of the created resume."),
	},

	import: {
		input: resumeSchema.pick({ data: true }).extend({
			projectId: z.string().optional(),
			skillIds: z.array(z.uuid()).optional(),
			positionId: z.uuid().optional(),
		}),
		output: z.string().describe("The ID of the imported resume."),
	},

	update: {
		input: resumeSchema
			.pick({
				name: true,
				slug: true,
				tags: true,
				data: true,
				isPublic: true,
				projectId: true,
				positionId: true,
			})
			.partial()
			.extend({
				id: z.string(),
				skillIds: z.array(z.uuid()).optional(),
			}),
		output: resumeSchema
			.omit({
				password: true,
				userId: true,
				createdAt: true,
				updatedAt: true,
				sharedCopyFromId: true,
			})
			.extend({
				hasPassword: z.boolean(),
				skills: z
					.array(z.object({ id: z.string(), name: z.string() }))
					.describe("Selected skills from the project (id and display name)."),
				position: z.string().nullable().describe("Display name of the selected position."),
			}),
	},

	setLocked: {
		input: resumeSchema.pick({ id: true, isLocked: true }),
		output: z.void(),
	},

	setPassword: {
		input: resumeSchema.pick({ id: true }).extend({ password: z.string().min(6).max(64) }),
		output: z.void(),
	},

	removePassword: {
		input: resumeSchema.pick({ id: true }),
		output: z.void(),
	},

	patch: {
		input: z.object({
			id: z.string().describe("The ID of the resume to patch."),
			operations: z
				.array(jsonPatchOperationSchema)
				.min(1)
				.describe("An array of JSON Patch (RFC 6902) operations to apply to the resume data."),
		}),
		output: resumeSchema
			.omit({
				password: true,
				userId: true,
				createdAt: true,
				updatedAt: true,
				sharedCopyFromId: true,
			})
			.extend({
				hasPassword: z.boolean(),
				skills: z.array(z.object({ id: z.string(), name: z.string() })),
			}),
	},

	duplicate: {
		input: resumeSchema.pick({ id: true, name: true, slug: true, tags: true }).extend({
			projectId: z.string().optional(),
			skillIds: z.array(z.uuid()).optional(),
			positionId: z.string().optional(),
		}),
		output: z.string().describe("The ID of the duplicated resume."),
	},

	delete: {
		input: resumeSchema.pick({ id: true }),
		output: z.void(),
	},

	shareCopy: {
		input: z.object({
			resumeId: z.string().describe("The ID of the resume to share."),
			userIds: z.array(z.string().uuid()).min(1).describe("IDs of users to receive a copy."),
		}),
		output: z.object({ count: z.number().describe("Number of users who received a copy.") }),
	},
};
