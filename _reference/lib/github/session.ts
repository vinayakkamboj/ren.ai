import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

export const GITHUB_SESSION_COOKIE = "nutrient_github_session";
export const GITHUB_STATE_COOKIE = "nutrient_github_oauth_state";

export interface GitHubSession {
  accessToken: string;
  login: string;
  scope: string;
  connectedAt: string;
}

export interface GitHubOAuthState {
  state: string;
  returnTo: string;
}

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64url(input: string): Buffer {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

function getSessionKey(): Buffer {
  const secret = process.env.GITHUB_SESSION_SECRET || process.env.GITHUB_CLIENT_SECRET;
  if (!secret) {
    throw new Error("GITHUB_SESSION_SECRET or GITHUB_CLIENT_SECRET is required for GitHub OAuth.");
  }
  return createHash("sha256").update(secret).digest();
}

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function createOAuthState(returnTo: string): GitHubOAuthState {
  return {
    state: base64url(randomBytes(24)),
    returnTo: normalizeReturnTo(returnTo),
  };
}

export function encodeOAuthState(state: GitHubOAuthState): string {
  return base64url(JSON.stringify(state));
}

export function decodeOAuthState(value: string | undefined): GitHubOAuthState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(fromBase64url(value).toString("utf8")) as GitHubOAuthState;
    if (!parsed.state || !parsed.returnTo) return null;
    return {
      state: parsed.state,
      returnTo: normalizeReturnTo(parsed.returnTo),
    };
  } catch {
    return null;
  }
}

export function statesMatch(a: string, b: string): boolean {
  const first = Buffer.from(a);
  const second = Buffer.from(b);
  return first.length === second.length && timingSafeEqual(first, second);
}

export function sealGitHubSession(session: GitHubSession): string {
  const key = getSessionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return base64url(Buffer.concat([iv, tag, encrypted]));
}

export function openGitHubSession(value: string | undefined): GitHubSession | null {
  if (!value) return null;
  try {
    const payload = fromBase64url(value);
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", getSessionKey(), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString("utf8")) as GitHubSession;
    if (!parsed.accessToken || !parsed.login) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function readGitHubSession(cookies: CookieReader): GitHubSession | null {
  return openGitHubSession(cookies.get(GITHUB_SESSION_COOKIE)?.value);
}

export function setGitHubSessionCookie(response: NextResponse, session: GitHubSession): void {
  response.cookies.set(GITHUB_SESSION_COOKIE, sealGitHubSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearGitHubSessionCookie(response: NextResponse): void {
  response.cookies.set(GITHUB_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function setOAuthStateCookie(response: NextResponse, state: GitHubOAuthState): void {
  response.cookies.set(GITHUB_STATE_COOKIE, encodeOAuthState(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
}

export function clearOAuthStateCookie(response: NextResponse): void {
  response.cookies.set(GITHUB_STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function normalizeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
