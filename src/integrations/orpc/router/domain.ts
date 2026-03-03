import { protectedProcedure } from "../context";
import { domainDto } from "../dto/domain";
import { domainService } from "../services/domain";

export const domainRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/domains",
			tags: ["Domains"],
			operationId: "listDomains",
			summary: "List all domains",
			description: "Returns a list of all domains, optionally filtered by name.",
			successDescription: "A list of domains.",
		})
		.input(domainDto.list.input)
		.output(domainDto.list.output)
		.handler(async ({ input }) => domainService.list(input)),

	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/domains/{id}",
			tags: ["Domains"],
			operationId: "getDomain",
			summary: "Get domain by ID",
			successDescription: "The domain.",
		})
		.input(domainDto.getById.input)
		.output(domainDto.getById.output)
		.handler(async ({ input }) => domainService.getById(input)),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/domains",
			tags: ["Domains"],
			operationId: "createDomain",
			summary: "Create a domain",
			successDescription: "The ID of the created domain.",
		})
		.input(domainDto.create.input)
		.output(domainDto.create.output)
		.handler(async ({ input }) => domainService.create(input)),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/domains/{id}",
			tags: ["Domains"],
			operationId: "updateDomain",
			summary: "Update a domain",
			successDescription: "The updated domain.",
		})
		.input(domainDto.update.input)
		.output(domainDto.update.output)
		.handler(async ({ input }) => domainService.update(input)),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/domains/{id}",
			tags: ["Domains"],
			operationId: "deleteDomain",
			summary: "Delete a domain",
			successDescription: "The domain was deleted.",
		})
		.input(domainDto.delete.input)
		.output(domainDto.delete.output)
		.handler(async ({ input }) => domainService.delete(input)),
};
