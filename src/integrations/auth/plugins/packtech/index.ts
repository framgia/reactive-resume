import { APIError } from "@better-auth/core/error";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { eq } from "drizzle-orm";
import z from "zod";
import {
	isPacktechCredentialAuthEnabled,
	syncPacktechUser,
	verifyPacktechCredential,
} from "@/integrations/auth/packtech";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";

const signInPacktechBodySchema = z.object({
	login: z.string().min(1),
	password: z.string().min(1),
});

export const packtech = () => ({
	id: "packtech",
	endpoints: {
		signInPacktech: createAuthEndpoint(
			"/sign-in/packtech",
			{
				method: "POST",
				body: signInPacktechBodySchema,
				metadata: {
					openapi: {
						summary: "Sign in with Packtech",
						description: "Authenticate credentials against Packtech and create a Better Auth session.",
					},
				},
			},
			async (ctx) => {
				if (!isPacktechCredentialAuthEnabled()) {
					throw APIError.fromStatus(404, { message: "Packtech credential authentication is disabled." });
				}

				const identifier = ctx.body.login.trim();
				const password = ctx.body.password;

				const verification = await verifyPacktechCredential({ identifier, password });
				if (!verification.success) {
					throw APIError.fromStatus(401, { message: verification.message });
				}

				const account = await syncPacktechUser({
					identifier,
					password,
					packtechUser: verification.user,
				});

				const [user] = await db.select().from(schema.user).where(eq(schema.user.username, account.username)).limit(1);

				if (!user) {
					throw APIError.fromStatus(401, { message: "Invalid credentials." });
				}

				const session = await ctx.context.internalAdapter.createSession(user.id, false);
				if (!session) {
					throw APIError.fromStatus(500, { message: "Failed to create session." });
				}

				await setSessionCookie(ctx, { session, user }, false);

				return ctx.json({
					token: session.token,
					user,
				});
			},
		),
	},
});
