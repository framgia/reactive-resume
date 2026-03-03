import z from "zod";

export const projectSchema = z.object({
	name: z.string().min(1, "Project name is required"),
	description: z.string().optional(),
	customerName: z.string().optional(),
	skills: z.array(z.string()).optional(),
	position: z.array(z.string()).optional(),
});

export type ProjectSchema = z.infer<typeof projectSchema>;
