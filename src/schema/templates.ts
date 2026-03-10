import z from "zod";

export const templateSchema = z.enum([
	"azurill",
	"bronzor",
	"chikorita",
	"ditgar",
	"ditto",
	"gengar",
	"glalie",
	"kakuna",
	"lapras",
	"leafish",
	"onyx",
	"pikachu",
	"rhyhorn",
]);

export type Template = z.infer<typeof templateSchema>;

/** Default design colors per template. Only Chikorita has custom defaults; others use app defaults when creating. */
export const templateDefaultColors: Partial<Record<Template, { primary: string; text: string; background: string }>> = {
	chikorita: {
		primary: "rgba(220, 38, 38, 1)",
		text: "rgba(0, 0, 0, 1)",
		background: "rgba(255, 255, 255, 1)",
	},
};

/**
 * The templates listed in `printMarginTemplates` require explicit print margin settings.
 *
 * By default, web browsers and PDF generators may apply different margin values or even remove margins
 * when printing resumes. For these selected templates, it's essential to ensure that all printed pages—especially
 * in multi-page resumes—have consistent margins to preserve the intended layout and appearance across all pages.
 *
 * If you are adding a new template that does not have a sidebar background, or any page decoration that extends
 * close to the page borders, consider including it in the `printMarginTemplates` array below.
 */
export const printMarginTemplates = [
	"azurill",
	"bronzor",
	"kakuna",
	"lapras",
	"onyx",
	"pikachu",
	"rhyhorn",
] satisfies Template[] as string[];
