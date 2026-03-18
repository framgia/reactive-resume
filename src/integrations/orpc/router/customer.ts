import { protectedProcedure } from "../context";
import { customerDto } from "../dto/customer";
import { customerService } from "../services/customer";

export const customerRouter = {
	list: protectedProcedure
		.route({
			method: "GET",
			path: "/customers",
			tags: ["Customers"],
			operationId: "listCustomers",
			summary: "List all customers",
			description: "Returns a list of all customers, optionally filtered by name.",
			successDescription: "A list of customers.",
		})
		.input(customerDto.list.input)
		.output(customerDto.list.output)
		.handler(async ({ input }) => customerService.list(input)),

	getById: protectedProcedure
		.route({
			method: "GET",
			path: "/customers/{id}",
			tags: ["Customers"],
			operationId: "getCustomer",
			summary: "Get customer by ID",
			successDescription: "The customer.",
		})
		.input(customerDto.getById.input)
		.output(customerDto.getById.output)
		.handler(async ({ input }) => customerService.getById(input)),

	create: protectedProcedure
		.route({
			method: "POST",
			path: "/customers",
			tags: ["Customers"],
			operationId: "createCustomer",
			summary: "Create a customer",
			successDescription: "The ID of the created customer.",
		})
		.input(customerDto.create.input)
		.output(customerDto.create.output)
		.errors({
			CUSTOMER_NAME_ALREADY_EXISTS: {
				message: "A customer with this name already exists.",
				status: 400,
			},
		})
		.handler(async ({ input }) => customerService.create(input)),

	update: protectedProcedure
		.route({
			method: "PUT",
			path: "/customers/{id}",
			tags: ["Customers"],
			operationId: "updateCustomer",
			summary: "Update a customer",
			successDescription: "The updated customer.",
		})
		.input(customerDto.update.input)
		.output(customerDto.update.output)
		.errors({
			CUSTOMER_NAME_ALREADY_EXISTS: {
				message: "A customer with this name already exists.",
				status: 400,
			},
		})
		.handler(async ({ input }) => customerService.update(input)),

	delete: protectedProcedure
		.route({
			method: "DELETE",
			path: "/customers/{id}",
			tags: ["Customers"],
			operationId: "deleteCustomer",
			summary: "Delete a customer",
			successDescription: "The customer was deleted.",
		})
		.input(customerDto.delete.input)
		.output(customerDto.delete.output)
		.handler(async ({ input }) => customerService.delete(input)),

	restore: protectedProcedure
		.route({
			method: "POST",
			path: "/customers/{id}/restore",
			tags: ["Customers"],
			operationId: "restoreCustomer",
			summary: "Restore a soft-deleted customer",
			successDescription: "The customer was restored.",
		})
		.input(customerDto.restore.input)
		.output(customerDto.restore.output)
		.handler(async ({ input }) => customerService.restore(input)),

	getDomains: protectedProcedure
		.route({
			method: "GET",
			path: "/customers/{id}/domains",
			tags: ["Customers"],
			operationId: "getCustomerDomains",
			summary: "Get domain IDs for a customer",
			successDescription: "List of domain IDs.",
		})
		.input(customerDto.getDomains.input)
		.output(customerDto.getDomains.output)
		.handler(async ({ input }) => customerService.getDomains({ id: input.id })),

	setDomains: protectedProcedure
		.route({
			method: "PUT",
			path: "/customers/{id}/domains",
			tags: ["Customers"],
			operationId: "setCustomerDomains",
			summary: "Set domains for a customer (replaces existing)",
			successDescription: "Domains updated.",
		})
		.input(customerDto.setDomains.input)
		.output(customerDto.setDomains.output)
		.handler(async ({ input }) =>
			customerService.setDomains({
				id: input.id,
				domainIds: input.domainIds,
			}),
		),
};

