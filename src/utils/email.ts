import z from "zod";

const ALLOWED_EMAIL_DOMAINS = ["sun-asterisk.com", "sun-asterisk.vn"] as const;

/**
 * Zod schema for email that must use one of the configured allowed domains.
 */
export const emailSchema = z.email().pipe(
	z
		.string()
		.trim()
		.toLowerCase()
		.refine(
			(val) => ALLOWED_EMAIL_DOMAINS.some((d) => val.endsWith(`@${d}`)),
			{
				message: `Email must use one of these domains: ${ALLOWED_EMAIL_DOMAINS.join(", ")}.`,
			},
		),
);

/**
 * Email schema for optional fields (e.g. resume basics). Allows empty string or valid email with allowed domain.
 */
export const optionalEmailSchema = z.union([z.literal(""), emailSchema]);

/**
 * Check if a string is a valid email with the allowed domain.
 */
export function isValidSunAsteriskEmail(email: string): boolean {
	return emailSchema.safeParse(email).success;
}
