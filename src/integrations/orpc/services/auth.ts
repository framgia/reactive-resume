import { ORPCError } from "@orpc/client";
import { and, eq, isNotNull } from "drizzle-orm";
import type { AuthProvider } from "@/integrations/auth/types";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { env } from "@/utils/env";
import { logger } from "@/utils/logger";
import { getStorageService } from "./storage";

export type ProviderList = Partial<Record<AuthProvider, string>>;

const providers = {
	list: (): ProviderList => {
		const providers: ProviderList = { credential: "Password" };

		if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) providers.google = "Google";
		if (env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET) providers.github = "GitHub";
		if (env.OAUTH_CLIENT_ID && env.OAUTH_CLIENT_SECRET) providers.custom = env.OAUTH_PROVIDER_NAME ?? "Custom OAuth";
		if (env.PACKTECH_AUTH_URL) providers.packtech = "Packtech";

		return providers;
	},
};

async function getGoogleRefreshTokenForUser(userId: string): Promise<string | null> {
	const [googleAccount] = await db
		.select({ refreshToken: schema.account.refreshToken })
		.from(schema.account)
		.where(
			and(
				eq(schema.account.userId, userId),
				eq(schema.account.providerId, "google"),
				isNotNull(schema.account.refreshToken),
			),
		)
		.limit(1);

	return googleAccount?.refreshToken ?? null;
}

export const authService = {
	providers,
	getGoogleRefreshTokenForUser,

	deleteAccount: async (input: { userId: string }): Promise<void> => {
		if (!input.userId || input.userId.length === 0) return;

		const storageService = getStorageService();

		// Delete all user files in one call (pictures, screenshots, pdfs)
		// The storage service delete method supports recursive deletion via prefix
		try {
			await storageService.delete(`uploads/${input.userId}`);
		} catch {
			// Ignore error and proceed with deleting user
		}

		try {
			await db.delete(schema.user).where(eq(schema.user.id, input.userId));
		} catch (err) {
			logger.error("Failed to delete user record", {
				userId: input.userId,
				error: err,
			});

			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}
	},
};
