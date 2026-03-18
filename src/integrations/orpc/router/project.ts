import { protectedProcedure } from "../context";
import { projectDto } from "../dto/project";
import { projectService } from "../services/project";

export const projectRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/projects",
			tags: ["Projects"],
			operationId: "listProjects",
			summary: "List all projects",
			description: "Returns a list of all projects, including soft-deleted ones. Deleted projects have deletedAt set.",
			successDescription: "A list of projects.",
		})
		.input(projectDto.list.input.optional().default({ sort: "lastUpdatedAt", page: 1, pageSize: 10 }))
		.output(projectDto.list.output)
		.handler(async ({ input }) => {
			const result = await projectService.list({
				sort: input.sort,
				name: input.name,
				customerId: input.customerId,
				domainIds: input.domainIds,
				skillIds: input.skillIds,
				positionId: input.positionId,
				query: input.query,
				limit: input.limit,
				page: input.page,
				pageSize: input.pageSize ?? input.limit,
			});
			return result;
		}),

	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/projects/{id}",
			tags: ["Projects"],
			operationId: "getProject",
			summary: "Get project by ID",
			description:
				"Returns a single project by ID. Only projects belonging to the authenticated user can be retrieved.",
			successDescription: "The project.",
		})
		.input(projectDto.getById.input)
		.output(projectDto.getById.output)
		.handler(async ({ input }) => {
			return await projectService.getById({ id: input.id });
		}),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/projects",
			tags: ["Projects"],
			operationId: "createProject",
			summary: "Create a new project",
			description: "Creates a new project with the given name, description, and customer name.",
			successDescription: "The ID of the created project.",
		})
		.input(projectDto.create.input)
		.output(projectDto.create.output)
		.handler(async ({ input }) => {
			return await projectService.create({
				name: input.name,
				description: input.description ?? undefined,
				customerId: input.customerId ?? undefined,
				skills: input.skills,
				position: input.position,
				domainIds: input.domainIds,
			});
		}),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/projects/{id}",
			tags: ["Projects"],
			operationId: "updateProject",
			summary: "Update a project",
			description: "Updates one or more fields of a project identified by its ID.",
			successDescription: "The updated project.",
		})
		.input(projectDto.update.input)
		.output(projectDto.update.output)
		.handler(async ({ input }) => {
			return await projectService.update({
				id: input.id,
				name: input.name ?? undefined,
				description: input.description ?? undefined,
				customerId: input.customerId ?? undefined,
				skills: input.skills,
				position: input.position,
				domainIds: input.domainIds,
			});
		}),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/projects/{id}",
			tags: ["Projects"],
			operationId: "deleteProject",
			summary: "Delete a project",
			description: "Deletes a project. This action cannot be undone.",
			successDescription: "The project was deleted successfully.",
		})
		.input(projectDto.delete.input)
		.output(projectDto.delete.output)
		.handler(async ({ input }) => {
			return await projectService.delete({ id: input.id });
		}),

	restore: protectedProcedure
		.route({
			method: "POST",
			path: "/projects/{id}/restore",
			tags: ["Projects"],
			operationId: "restoreProject",
			summary: "Restore a deleted project",
			description: "Restores a soft-deleted project by clearing its deletedAt timestamp.",
			successDescription: "The project was restored successfully.",
		})
		.input(projectDto.restore.input)
		.output(projectDto.restore.output)
		.handler(async ({ input }) => {
			return await projectService.restore({ id: input.id });
		}),

	getDomains: protectedProcedure
		.route({
			method: "GET",
			path: "/projects/{id}/domains",
			tags: ["Projects"],
			operationId: "getProjectDomains",
			summary: "Get domain IDs for a project",
			successDescription: "List of domain IDs.",
		})
		.input(projectDto.getDomains.input)
		.output(projectDto.getDomains.output)
		.handler(async ({ input }) => {
			return await projectService.getDomains({ id: input.id });
		}),
};
