import z from "zod";
import { protectedProcedure, publicProcedure } from "../context";
import { printerService } from "../services/printer";
import { authService } from "../services/auth";
import { resumeService } from "../services/resume";

export const printerRouter = {
	printResumeAsPDF: publicProcedure
		.route({
			method: "GET",
			path: "/resumes/{id}/pdf",
			tags: ["Resume Export"],
			operationId: "exportResumePdf",
			summary: "Export resume as PDF",
			description:
				"Generates a PDF from the specified resume and uploads it to storage. Returns a URL to download the generated PDF file. If the request is made by an unauthenticated user (e.g. via a public share link), the resume's download count is incremented. Authentication is optional.",
			successDescription: "The PDF was generated successfully. Returns a URL to download the file.",
		})
		.input(z.object({ id: z.string().describe("The unique identifier of the resume to export.") }))
		.output(z.object({ url: z.string().describe("The URL to download the generated PDF file.") }))
		.handler(async ({ input, context }) => {
			const { id, data, userId } = await resumeService.getByIdForPrinter({ id: input.id });
			const url = await printerService.printResumeAsPDF({ id, data, userId });

			if (!context.user) {
				await resumeService.statistics.increment({ id: input.id, downloads: true });
			}

			return { url };
		}),

	uploadResumePDFToGoogleDrive: protectedProcedure
		.route({
			method: "POST",
			path: "/resumes/{id}/pdf/google-drive",
			tags: ["Resume Export"],
			operationId: "uploadResumePdfToGoogleDrive",
			summary: "Upload resume PDF to Google Drive",
			description:
				"Generates a PDF from the specified resume and uploads it to the authenticated user's Google Drive. If a PDF with the same name already exists in the target folder, it is replaced. Missing folders in the folder path are created automatically.",
			successDescription: "The PDF was uploaded to Google Drive successfully.",
		})
		.input(
			z.object({
				id: z.string().describe("The unique identifier of the resume."),
				fileName: z.string().min(1).describe("The destination PDF file name."),
				folderPath: z.string().optional().describe("Optional slash-separated folder path in Google Drive."),
			}),
		)
		.output(
			z.object({
				fileId: z.string().describe("The Google Drive file id."),
				webViewLink: z.string().nullable().describe("The Google Drive web view URL."),
			}),
		)
		.errors({
			GOOGLE_ACCOUNT_NOT_CONNECTED: {
				message: "Google account is not connected or does not have refresh token access.",
				status: 400,
			},
		})
		.handler(async ({ input, context, errors }) => {
			const { id, data, userId } = await resumeService.getByIdForPrinter({ id: input.id, userId: context.user.id });

			const refreshToken = await authService.getGoogleRefreshTokenForUser(context.user.id);

			if (!refreshToken) throw errors.GOOGLE_ACCOUNT_NOT_CONNECTED();

			return await printerService.uploadResumePDFToGoogleDrive({
				id,
				data,
				userId,
				fileName: input.fileName,
				folderPath: input.folderPath,
				refreshToken,
			});
		}),

	getResumeScreenshot: protectedProcedure
		.route({
			method: "GET",
			path: "/resumes/{id}/screenshot",
			tags: ["Resume Export"],
			operationId: "getResumeScreenshot",
			summary: "Get resume screenshot",
			description:
				"Returns a URL to a screenshot image of the first page of the specified resume. Screenshots are cached for up to 6 hours and regenerated automatically when the resume is updated. Returns null if the screenshot cannot be generated. Requires authentication.",
			successDescription: "The screenshot URL, or null if the screenshot could not be generated.",
		})
		.input(z.object({ id: z.string().describe("The unique identifier of the resume.") }))
		.output(z.object({ url: z.string().nullable().describe("The URL to the screenshot image, or null.") }))
		.handler(async ({ context, input }) => {
			try {
				const { id, data, userId, updatedAt } = await resumeService.getByIdForPrinter({
					id: input.id,
					userId: context.user.id,
				});

				const url = await printerService.getResumeScreenshot({ id, data, userId, updatedAt });

				return { url };
			} catch {
				// ignore errors, as the screenshot is not critical
			}

			return { url: null };
		}),
};
