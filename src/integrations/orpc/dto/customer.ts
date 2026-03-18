import { createSelectSchema } from "drizzle-zod";
import z from "zod";
import { schema } from "@/integrations/drizzle";

const customerSchema = createSelectSchema(schema.customer, {
	id: z.string().describe("The ID of the customer."),
	name: z.string().min(1).describe("The name of the customer."),
	createdAt: z.date().describe("When the customer was created."),
	updatedAt: z.date().describe("When the customer was last updated."),
});

export const customerDto = {
	list: {
		input: z
			.object({
				sort: z
					.enum(["lastUpdatedAt", "name"])
					.optional()
					.default("lastUpdatedAt")
					.describe("Sort order for customers."),
				query: z.string().optional().describe("Search by customer name (partial match)."),
				limit: z
					.number()
					.int()
					.min(1)
					.max(200)
					.optional()
					.describe("Max results (non-paginated select/search)."),
				page: z
					.number()
					.int()
					.min(1)
					.optional()
					.default(1)
					.describe("Page number for pagination (1-based). Ignored when limit is provided without page/pageSize."),
				pageSize: z
					.number()
					.int()
					.min(1)
					.max(200)
					.optional()
					.default(10)
					.describe("Number of items per page. Ignored when limit is provided without page/pageSize."),
			})
			.optional()
			.default({ sort: "lastUpdatedAt", page: 1, pageSize: 10 }),
		output: z.object({
			items: z.array(customerSchema),
			total: z.number().int().min(0).describe("Total number of customers matching the filter."),
		}),
	},

	getById: {
		input: customerSchema.pick({ id: true }),
		output: customerSchema.extend({
			deletedAt: z.date().nullable().optional(),
			domainIds: z.array(z.string()).describe("IDs of domains linked to this customer."),
		}),
	},

	create: {
		input: z.object({
			name: z.string().min(1),
		}),
		output: z.string().describe("The ID of the created customer."),
	},

	update: {
		input: customerSchema.pick({ id: true, name: true }),
		output: customerSchema,
	},

	delete: {
		input: customerSchema.pick({ id: true }),
		output: z.void(),
	},

	restore: {
		input: customerSchema.pick({ id: true }),
		output: z.void(),
	},

	getDomains: {
		input: customerSchema.pick({ id: true }),
		output: z.array(z.string()).describe("IDs of domains linked to this customer."),
	},

	setDomains: {
		input: customerSchema.pick({ id: true }).extend({
			domainIds: z.array(z.string()).describe("Domain IDs to link to the customer (replaces existing)."),
		}),
		output: z.void(),
	},
};

