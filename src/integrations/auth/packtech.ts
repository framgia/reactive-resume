import { and, eq, or } from "drizzle-orm";
import z from "zod";
import { schema } from "@/integrations/drizzle";
import { db } from "@/integrations/drizzle/client";
import { env } from "@/utils/env";
import { hashPassword } from "@/utils/password";
import { toUsername } from "@/utils/string";

type SyncPacktechUserInput = {
	identifier: string;
	password: string;
	packtechUser: {
		email?: string;
		username?: string;
		displayUsername?: string;
		name?: string;
		image?: string;
		emailVerified?: boolean;
	};
};

const packtechAuthResponseSchema = z.object({
	message: z.string().optional(),
	data: z
		.object({
			token: z.string().min(1),
			expires: z.string().optional(),
		})
		.optional(),
});

const parseJwtPayload = (token: string): unknown => {
	const parts = token.split(".");
	if (parts.length < 2) return null;

	const payload = parts[1];
	if (!payload) return null;

	const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
	const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`;

	try {
		return JSON.parse(Buffer.from(padded, "base64").toString("utf-8"));
	} catch {
		return null;
	}
};

const packtechJwtPayloadSchema = z.object({
	user: z
		.object({
			email: z.email().optional(),
			username: z.string().min(1).optional(),
		})
		.optional(),
});

export const isPacktechCredentialAuthEnabled = () => Boolean(env.PACKTECH_AUTH_URL);

const resolveUserFromIdentifier = (identifier: string) => {
	if (identifier.includes("@")) {
		const email = identifier.toLowerCase();
		const username = toUsername(email.split("@")[0] ?? "");

		return {
			email,
			username,
		};
	}

	return {
		email: undefined,
		username: toUsername(identifier),
	};
};

const uniqueUsername = async (baseUsername: string) => {
	const normalizedBase = toUsername(baseUsername) || "user";

	let suffix = 0;
	while (suffix < 1000) {
		const candidate = suffix === 0 ? normalizedBase : `${normalizedBase}-${suffix}`;

		const [existing] = await db
			.select({ id: schema.user.id })
			.from(schema.user)
			.where(eq(schema.user.username, candidate))
			.limit(1);

		if (!existing) return candidate;
		suffix += 1;
	}

	throw new Error("Unable to resolve a unique username for Packtech authentication.");
};

export async function verifyPacktechCredential(input: { identifier: string; password: string }) {
	if (!env.PACKTECH_AUTH_URL) {
		return {
			success: false as const,
			message: "Packtech credential authentication is not configured.",
		};
	}

	const headers = new Headers({
		"Content-Type": "application/json",
	});

	try {
		const response = await fetch(env.PACKTECH_AUTH_URL, {
			method: "POST",
			headers,
			body: JSON.stringify({
				login: input.identifier,
				password: input.password,
			}),
			signal: AbortSignal.timeout(env.PACKTECH_AUTH_TIMEOUT_MS),
		});

		const payload = await response.json();

		const parsed = packtechAuthResponseSchema.safeParse(payload);

		if (!response.ok) {
			return {
				success: false as const,
				message: parsed.data?.message ?? "Unable to sign in with Packtech authentication server.",
			};
		}

		if (!parsed.success) {
			return {
				success: false as const,
				message: "Invalid response from Packtech authentication server.",
			};
		}

		if (!parsed.data.data?.token) {
			return {
				success: false as const,
				message: parsed.data.message ?? "Invalid credentials.",
			};
		}

		const jwtPayload = parseJwtPayload(parsed.data.data.token);
		const parsedJwtPayload = packtechJwtPayloadSchema.safeParse(jwtPayload);

		const username = toUsername(parsedJwtPayload.data?.user?.username ?? input.identifier);
		const email = parsedJwtPayload.data?.user?.email;

		return {
			success: true as const,
			user: {
				email,
				username,
				displayUsername: username,
				name: username,
				emailVerified: true,
			},
		};
	} catch {
		return {
			success: false as const,
			message: "Packtech authentication server is unreachable.",
		};
	}
}

export async function syncPacktechUser(input: SyncPacktechUserInput): Promise<{ username: string }> {
	const resolvedFromIdentifier = resolveUserFromIdentifier(input.identifier);
	const desiredUsername =
		toUsername(input.packtechUser.username ?? input.packtechUser.displayUsername ?? resolvedFromIdentifier.username) ||
		"user";
	const fallbackEmail = resolvedFromIdentifier.email ?? `${desiredUsername}@example.com`;
	const desiredEmail = input.packtechUser.email?.toLowerCase() ?? fallbackEmail;

	const [existingUser] = await db
		.select({
			id: schema.user.id,
			email: schema.user.email,
			username: schema.user.username,
			displayUsername: schema.user.displayUsername,
		})
		.from(schema.user)
		.where(or(eq(schema.user.email, desiredEmail), eq(schema.user.username, desiredUsername)))
		.limit(1);

	const passwordHash = await hashPassword(input.password);
	const displayUsername = toUsername(input.packtechUser.displayUsername ?? desiredUsername);

	if (existingUser) {
		await db
			.update(schema.user)
			.set({
				name: input.packtechUser.name ?? existingUser.username,
				image: input.packtechUser.image,
				emailVerified: input.packtechUser.emailVerified ?? true,
				updatedAt: new Date(),
			})
			.where(eq(schema.user.id, existingUser.id));

		const [existingCredential] = await db
			.select({ id: schema.account.id })
			.from(schema.account)
			.where(and(eq(schema.account.userId, existingUser.id), eq(schema.account.providerId, "credential")))
			.limit(1);

		if (existingCredential) {
			await db
				.update(schema.account)
				.set({
					password: passwordHash,
					updatedAt: new Date(),
				})
				.where(eq(schema.account.id, existingCredential.id));
		} else {
			await db.insert(schema.account).values({
				accountId: existingUser.id,
				providerId: "credential",
				userId: existingUser.id,
				password: passwordHash,
			});
		}

		return { username: existingUser.username };
	}

	const newUsername = await uniqueUsername(desiredUsername);
	const [createdUser] = await db
		.insert(schema.user)
		.values({
			name: input.packtechUser.name ?? newUsername,
			email: desiredEmail,
			emailVerified: input.packtechUser.emailVerified ?? true,
			image: input.packtechUser.image,
			username: newUsername,
			displayUsername: displayUsername || newUsername,
		})
		.returning({ id: schema.user.id, username: schema.user.username });

	await db.insert(schema.account).values({
		accountId: createdUser.id,
		providerId: "credential",
		userId: createdUser.id,
		password: passwordHash,
	});

	return { username: createdUser.username };
}
