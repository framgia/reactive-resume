import { ORPCError } from "@orpc/server";
import { google } from "googleapis";
import { Readable } from "node:stream";
import { env } from "@/utils/env";

function normalizePdfFilename(fileName: string): string {
	const sanitized = fileName.trim().replace(/[/\\]/g, "-");
	if (!sanitized) return "resume.pdf";
	return sanitized.toLowerCase().endsWith(".pdf") ? sanitized : `${sanitized}.pdf`;
}

function createDriveClient(refreshToken: string) {
	if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
		throw new ORPCError("INTERNAL_SERVER_ERROR", {
			message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
		});
	}

	const oauth2Client = new google.auth.OAuth2({
		clientId: env.GOOGLE_CLIENT_ID,
		clientSecret: env.GOOGLE_CLIENT_SECRET,
	});

	oauth2Client.setCredentials({ refresh_token: refreshToken });

	return google.drive({ version: "v3", auth: oauth2Client });
}

async function getOrCreateDriveFolderByPath(refreshToken: string, folderPath: string): Promise<string | undefined> {
	const normalizedPath = folderPath.trim();
	if (!normalizedPath) return undefined;

	const drive = createDriveClient(refreshToken);
	const segments = normalizedPath
		.split("/")
		.map((segment) => segment.trim())
		.filter(Boolean);

	let parentId: string | undefined;

	for (const segment of segments) {
		const escapedName = segment.replace(/'/g, "\\'");
		const parentFilter = parentId ? `'${parentId}' in parents and ` : "";

		const list = await drive.files.list({
			q: `${parentFilter}mimeType = 'application/vnd.google-apps.folder' and name = '${escapedName}' and trashed = false`,
			fields: "files(id)",
			pageSize: 1,
			supportsAllDrives: true,
			includeItemsFromAllDrives: true,
		});

		const existingFolderId = list.data.files?.[0]?.id;
		if (existingFolderId) {
			parentId = existingFolderId;
			continue;
		}

		const created = await drive.files.create({
			requestBody: {
				name: segment,
				mimeType: "application/vnd.google-apps.folder",
				parents: parentId ? [parentId] : undefined,
			},
			fields: "id",
			supportsAllDrives: true,
		});

		parentId = created.data.id ?? parentId;
	}

	return parentId;
}

export const googleDriveService = {
	uploadPdfToGoogleDrive: async (input: {
		fileName: string;
		folderPath?: string;
		refreshToken: string;
		pdfBuffer: Buffer;
	}): Promise<{ fileId: string; webViewLink: string | null }> => {
		const { fileName, folderPath, refreshToken, pdfBuffer } = input;
		const normalizedFileName = normalizePdfFilename(fileName);

		const drive = createDriveClient(refreshToken);
		const parentId =
			folderPath && folderPath.trim().length > 0 ? await getOrCreateDriveFolderByPath(refreshToken, folderPath) : undefined;

		const escapedFileName = normalizedFileName.replace(/'/g, "\\'");
		const parentFilter = parentId ? `'${parentId}' in parents and ` : "";

		const existing = await drive.files.list({
			q: `${parentFilter}name = '${escapedFileName}' and mimeType = 'application/pdf' and trashed = false`,
			fields: "files(id)",
			pageSize: 1,
			supportsAllDrives: true,
			includeItemsFromAllDrives: true,
		});

		const existingFileId = existing.data.files?.[0]?.id;
		if (existingFileId) {
			const updated = await drive.files.update({
				fileId: existingFileId,
				requestBody: { name: normalizedFileName },
				media: {
					mimeType: "application/pdf",
					body: Readable.from(pdfBuffer),
				},
				fields: "id,webViewLink",
				supportsAllDrives: true,
			});

			return { fileId: updated.data.id ?? existingFileId, webViewLink: updated.data.webViewLink ?? null };
		}

		const created = await drive.files.create({
			requestBody: {
				name: normalizedFileName,
				mimeType: "application/pdf",
				parents: parentId ? [parentId] : undefined,
			},
			media: {
				mimeType: "application/pdf",
				body: Readable.from(pdfBuffer),
			},
			fields: "id,webViewLink",
			supportsAllDrives: true,
		});

		if (!created.data.id) throw new ORPCError("INTERNAL_SERVER_ERROR");
		return { fileId: created.data.id, webViewLink: created.data.webViewLink ?? null };
	},
};

