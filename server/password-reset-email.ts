import { ReplitConnectors } from "@replit/connectors-sdk";

export function resetEmailConfigured() {
  try {
    const url = new URL(process.env.PASSWORD_RESET_BASE_URL || "");
    return url.protocol === "https:" && !url.username && !url.password &&
      /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/.test(process.env.PASSWORD_RESET_FROM || "");
  } catch { return false; }
}

export function createPasswordResetEmailText(username: string, resetUrl: string) {
  return `Je hebt wachtwoordherstel aangevraagd voor GWC DPP.\n\nJe gebruikersnaam: ${username}\nJe kunt inloggen met je e-mailadres of deze gebruikersnaam.\n\nKies een nieuw wachtwoord via:\n${resetUrl}\n\nDeze link is 30 minuten geldig en kan één keer worden gebruikt. Heb je dit niet aangevraagd? Negeer deze e-mail; je wachtwoord blijft ongewijzigd.`;
}

export async function sendPasswordResetEmail(email: string, token: string, username: string) {
  if (!resetEmailConfigured()) throw new Error("Password reset email not configured");
  const url = new URL("/reset-password", process.env.PASSWORD_RESET_BASE_URL);
  // Fragments aren't sent to the web server, proxies or request logs.
  url.hash = new URLSearchParams({ token }).toString();
  const text = createPasswordResetEmailText(username, url.toString());
  const response = await new ReplitConnectors().proxy("resend", "/emails", {
    method: "POST",
    body: {
      from: `GWC DPP <${process.env.PASSWORD_RESET_FROM}>`,
      to: [email],
      subject: "Wachtwoord herstellen – GWC DPP",
      text,
    },
  });
  // Never include provider responses: they can contain email addresses or tokens.
  if (!response.ok) throw new Error("Password reset email delivery failed");
  const result = await response.json();
  if (!result?.id) throw new Error("Password reset email was not accepted");
}
