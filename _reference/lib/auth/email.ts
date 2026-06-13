export const ALLOWED_EMAIL_DOMAIN = "nutrient.io";

// Add more admin emails to this array to grant admin access to other users.
export const ADMIN_EMAILS = ["vinayak.kamboj@nutrient.io"];

export const ALLOWED_EMAIL_MESSAGE =
  "Use your @nutrient.io email address to access Demo Studio.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isAllowedEmail(email: string | null | undefined) {
  if (!email) return false;
  return normalizeEmail(email).endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

export function isAdmin(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(normalizeEmail(email));
}
