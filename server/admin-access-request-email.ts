import { ReplitConnectors } from "@replit/connectors-sdk";

export interface AdminAccessRequestEmailData {
  userId: number;
  accountEmail: string;
  accountRole: string;
  fullName: string;
  mobileNumber: string;
}

export interface AdminEmailRecipient {
  email: string;
}

const senderAddressPattern = /^[^<>\s@]+@[^<>\s@]+\.[^<>\s@]+$/;

export function createAdminAccessRequestEmailText(request: AdminAccessRequestEmailData) {
  return [
    "Er is een verzoek ingediend om adminrechten te krijgen voor GWC DPP.",
    "",
    `Naam: ${request.fullName}`,
    `Mobiel nummer: ${request.mobileNumber}`,
    `Account e-mailadres: ${request.accountEmail}`,
    `Huidige accountrol: ${request.accountRole}`,
    `Account-ID: ${request.userId}`,
    "",
    "Beoordeel dit verzoek handmatig. Het indienen ervan wijzigt de accountrol niet.",
  ].join("\n");
}

export async function sendAdminAccessRequestEmail(
  request: AdminAccessRequestEmailData,
  recipients: AdminEmailRecipient[],
) {
  const fromAddress = process.env.PASSWORD_RESET_FROM;
  if (!fromAddress || !senderAddressPattern.test(fromAddress)) {
    throw new Error("Admin access request email sender is not configured");
  }

  const recipientsByAddress = new Map<string, AdminEmailRecipient>();
  recipients.forEach(recipient => {
    if (senderAddressPattern.test(recipient.email)) {
      recipientsByAddress.set(recipient.email.toLowerCase(), recipient);
    }
  });
  const uniqueRecipients: AdminEmailRecipient[] = [];
  recipientsByAddress.forEach(recipient => uniqueRecipients.push(recipient));
  if (uniqueRecipients.length === 0) {
    throw new Error("No active administrators are available");
  }

  const connector = new ReplitConnectors();
  const deliveries = await Promise.all(uniqueRecipients.map(async ({ email }) => {
    try {
      const response = await connector.proxy("resend", "/emails", {
        method: "POST",
        body: {
          from: `GWC DPP <${fromAddress}>`,
          to: [email],
          subject: "Verzoek om adminrechten – GWC DPP",
          text: createAdminAccessRequestEmailText(request),
        },
      });
      if (!response.ok) return false;
      const result = await response.json();
      return Boolean(result?.id);
    } catch {
      // Do not log provider responses or any of the personal details in the request.
      return false;
    }
  }));

  if (!deliveries.some(Boolean)) {
    throw new Error("Admin access request email delivery failed");
  }
}
