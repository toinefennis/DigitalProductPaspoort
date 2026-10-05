import { z } from "zod";

export type GS1Environment = "production" | "acceptance";
export type GS1Data = Record<string, any>;

export const GS1_PRODUCTION_BASE_URL = "https://gs1nl-api.gs1.nl";

export function gs1EnvironmentPresentation(config?: { environment?: GS1Environment; baseUrl?: string }) {
  if (config?.environment === "production") {
    return { label: "Productie", acceptanceUsesProduction: false };
  }
  if (config?.environment !== "acceptance") {
    return { label: "Omgeving laden", acceptanceUsesProduction: false };
  }

  let acceptanceUsesProduction = false;
  try {
    acceptanceUsesProduction = new URL(config.baseUrl ?? "").origin === GS1_PRODUCTION_BASE_URL;
  } catch {
    // An unknown or malformed endpoint must not be presented as the verified production host.
  }
  return {
    label: acceptanceUsesProduction ? "Acceptatie · productie-API" : "Acceptatie",
    acceptanceUsesProduction,
  };
}

export function isValidGtin(value: string): boolean {
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return false;
  const digits = value.slice(0, -1).split("").reverse();
  const sum = digits.reduce((total, digit, i) => total + Number(digit) * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - sum % 10) % 10 === Number(value.at(-1));
}

export const gtinSchema = z.string().trim().refine(isValidGtin, "Voer een geldige GTIN met controlecijfer in.");
export const normalizeGtin = (value: string) => gtinSchema.parse(value).padStart(14, "0");
const nonempty = z.string().trim().min(1);
const webUrl = z.string().url().refine(v => ["https:", "http:"].includes(new URL(v).protocol), "Gebruik een http(s)-URL.");

// Keep extension fields and multilingual/nested data; read-only fields are stored separately.
export const digitalLinkSchema = z.object({
  accountNumber: nonempty,
  identificationKeyType: z.literal("Gtin"),
  identificationKey: gtinSchema,
  isEnabled: z.boolean(),
  itemDescription: nonempty,
  resolverSettings: z.object({
    useGS1Resolver: z.boolean(),
    resolverDomainName: z.string().optional(),
  }).passthrough(),
  links: z.array(z.object({
    linkType: nonempty, language: nonempty, linkTitle: nonempty,
    targetUrl: webUrl, defaultLinkType: z.boolean(), public: z.boolean(),
    mediaType: nonempty,
  }).passthrough()).optional(),
  applicationIdentifiers: z.array(z.object({
    identifier: nonempty, templateVariable: nonempty,
  }).passthrough()).optional(),
}).passthrough();

export const registrationProductSchema = z.object({
  index: z.literal(1),
  // Official Basic IN: gtin="1" (equal to index) asks GS1 to assign the next licensed GTIN.
  gtin: z.union([z.literal("1"), gtinSchema]),
  status: z.enum(["Concept", "Actief", "Inactief"]),
  gpc: nonempty,
  consumerUnit: z.enum(["Ja", "Nee"]),
  packagingType: nonempty,
  targetMarketCountry: nonempty,
  description: nonempty.max(300),
  language: nonempty,
  brandName: nonempty.max(70),
  subBrandName: z.string().max(70).optional(),
  netContent: nonempty.refine(v => /^\d+(?:[.,]\d+)?$/.test(v), "Voer een positieve hoeveelheid in."),
  measurementUnit: nonempty,
  imageUrl: z.union([webUrl, z.literal("")]).optional(),
  contractNumber: nonempty,
}).passthrough();

export interface GS1Record {
  id: number;
  gtin: string;
  environment: GS1Environment;
  productId: number | null;
  registryId: number | null;
  basicData: GS1Data | null;
  basicDraft: GS1Data | null;
  digitalLinkData: GS1Data | null;
  digitalLinkDraft: GS1Data | null;
  externalReference: string | null;
  registrationStatus: string;
  syncState: string;
  version: number;
  lastError: string | null;
  syncedAt: Date | string | null;
  updatedAt: Date | string;
}

export interface GS1Job {
  id: string;
  environment: GS1Environment;
  userId: number;
  productId: number | null;
  registryId: number | null;
  invocationId: string | null;
  status: string;
  request: GS1Data;
  result: GS1Data | null;
  lastError: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface GS1Check {
  ok: boolean;
  status: number;
  message?: string;
}

export interface GS1ConnectionTest {
  environment: GS1Environment;
  authentication: GS1Check;
  digitalLink?: GS1Check;
  basicIn?: GS1Check;
  basicOut?: GS1Check;
}