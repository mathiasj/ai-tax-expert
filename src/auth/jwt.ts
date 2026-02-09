import { sign, verify } from "hono/utils/jwt/jwt";
import { env } from "../config/env.js";

export interface JWTPayload {
	sub: string;
	email: string;
	role: string;
	exp: number;
}

function parseExpiry(expiresIn: string): number {
	const match = expiresIn.match(/^(\d+)([smhd])$/);
	if (!match) return 7 * 24 * 3600;
	const [, value, unit] = match;
	const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
	return Number(value) * (multipliers[unit] ?? 86400);
}

export async function signToken(payload: Omit<JWTPayload, "exp">): Promise<string> {
	const expirySeconds = parseExpiry(env.JWT_EXPIRES_IN);
	const now = Math.floor(Date.now() / 1000);
	return sign(
		{ ...payload, iat: now, exp: now + expirySeconds },
		env.JWT_SECRET,
	);
}

export async function verifyToken(token: string): Promise<JWTPayload> {
	const payload = await verify(token, env.JWT_SECRET, "HS256");
	return payload as unknown as JWTPayload;
}
