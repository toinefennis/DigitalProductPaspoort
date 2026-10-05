import type { GS1ConnectionTest, GS1Data, GS1Environment } from "../shared/gs1";

const bases = {
  production: "https://gs1nl-api.gs1.nl",
  acceptance: "https://gs1nl.api.gs1.nl",
};

const basicInBases = {
  production: "https://gs1nl.api.gs1.nl",
  acceptance: "https://gs1nl.api.gs1.nl",
};

export class GS1ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export class GS1NLClient {
  readonly environment: GS1Environment;
  readonly baseUrl: string;
  private token: { authorization: string; expiresAt: number } | undefined;
  private tokenRequest: Promise<string> | undefined;

  constructor(
    private credentials = () => ({
      clientId: process.env.GS1_CLIENT_ID,
      clientSecret: process.env.GS1_CLIENT_SECRET,
    }),
    private fetcher: typeof fetch = fetch,
    environment = process.env.GS1_ENVIRONMENT || "production",
  ) {
    if (environment !== "production" && environment !== "acceptance") {
      throw new Error("GS1_ENVIRONMENT moet production of acceptance zijn.");
    }
    this.environment = environment;
    this.baseUrl = bases[environment];
  }

  get configured() {
    const c = this.credentials();
    return Boolean(c.clientId && c.clientSecret);
  }

  private async send(path: string, init: RequestInit, baseUrl = this.baseUrl) {
    try {
      return await this.fetcher(baseUrl + path, {
        ...init, redirect: "error", signal: AbortSignal.timeout(20_000),
      });
    } catch {
      throw new GS1ApiError(504, "GS1 reageert niet of de verbinding is onderbroken. Een schrijfactie is mogelijk al verwerkt; controleer bij GS1 voordat je opnieuw indient.");
    }
  }

  private async failure(response: Response): Promise<never> {
    // Never relay raw authentication bodies, headers, token claims, or attempted values.
    const messages: Record<number, string> = {
      400: "GS1 heeft de aanvraag afgewezen. Controleer de ingevulde velden en de juiste omgeving.",
      401: "GS1 heeft de authenticatie afgewezen. Controleer de server-Secrets.",
      403: "Geen toegang tot deze GS1-API. Controleer het API-abonnement en de rechten bij GS1.",
      404: "Geen gegevens gevonden bij GS1.",
      409: "GS1 meldt een conflict met bestaande gegevens.",
      429: "GS1-aanvraaglimiet bereikt. Probeer het later opnieuw.",
    };
    throw new GS1ApiError(response.status, messages[response.status] || `GS1-aanvraag mislukt (HTTP ${response.status}).`);
  }

  async authorization(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now()) return this.token.authorization;
    if (this.tokenRequest) return this.tokenRequest;
    this.tokenRequest = (async () => {
      const { clientId, clientSecret } = this.credentials();
      if (!clientId || !clientSecret) throw new GS1ApiError(503, "GS1_CLIENT_ID en GS1_CLIENT_SECRET ontbreken in de server-Secrets.");
      const response = await this.send("/authorization/token", {
        method: "POST", headers: { client_id: clientId, client_secret: clientSecret },
      });
      if (!response.ok) return this.failure(response);
      const data = await this.json(response);
      if (!data || typeof data.access_token !== "string" || !data.access_token) {
        throw new GS1ApiError(502, "GS1 gaf geen geldig toegangstoken terug.");
      }
      const authorization = `${typeof data.token_type === "string" ? data.token_type : "Bearer"} ${data.access_token}`;
      const expiry = Number(data.expires_in);
      this.token = { authorization, expiresAt: Date.now() + (Number.isFinite(expiry) && expiry > 0 ? Math.max(1, expiry - 60) : 60) * 1000 };
      return authorization;
    })();
    try { return await this.tokenRequest; } finally { this.tokenRequest = undefined; }
  }

  private async json(response: Response) {
    try { return await response.json(); }
    catch { throw new GS1ApiError(502, "GS1 gaf geen geldig JSON-antwoord terug."); }
  }

  async request(path: string, method = "GET", body?: unknown, baseUrl = this.baseUrl) {
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt++) {
      const authorization = await this.authorization();
      response = await this.send(path, {
        method, headers: { Authorization: authorization, Accept: "application/json", ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      }, baseUrl);
      if (response.status !== 401 || attempt === 1) break;
      this.token = undefined;
    }
    if (!response!.ok) return this.failure(response!);
    // Digital Link writes have an explicitly empty 200 response in the official contract.
    const text = await response!.text();
    if (!text.trim()) return { status: response!.status, data: null };
    try { return { status: response!.status, data: JSON.parse(text) }; }
    catch { throw new GS1ApiError(502, "GS1 gaf geen geldig JSON-antwoord terug."); }
  }

  async contracts() { return (await this.request("/digitallinkv2/contracts")).data; }
  async ranges() { return (await this.request("/basic-product-data-in/GtinCodeRanges", "GET", undefined, basicInBases[this.environment])).data; }
  async linkTypes() { return (await this.request("/digitallinkv2/linktypes")).data; }
  async mediaTypes() { return (await this.request("/digitallinkv2/mediatypes")).data; }
  async lookup(gtin: string) { return (await this.request("/basic-product-data-out/gtins", "POST", [gtin])).data; }
  async getDigitalLink(gtin: string) {
    return (await this.request(`/digitallinkv2/v2/digitalLink/Gtin/${encodeURIComponent(gtin)}`)).data;
  }
  async publishDigitalLink(data: GS1Data) {
    return this.request("/digitallinkv2/v2/digitallink", "POST", data);
  }
  async registerProduct(data: GS1Data) {
    return this.request("/basic-product-data-in/RegistrateGtinProducts", "POST", { registrationProducts: [data] }, basicInBases[this.environment]);
  }
  async registrationResults(invocationId: string) {
    return this.request(`/basic-product-data-in/RegistrateProductResults/${encodeURIComponent(invocationId)}`, "GET", undefined, basicInBases[this.environment]);
  }

  async testConnection(): Promise<GS1ConnectionTest> {
    const result: GS1ConnectionTest = { environment: this.environment, authentication: { ok: false, status: 0 } };
    try { await this.authorization(); result.authentication = { ok: true, status: 200 }; }
    catch (e) {
      result.authentication = { ok: false, status: e instanceof GS1ApiError ? e.status : 502, message: (e as Error).message };
      return result;
    }
    await Promise.all(([
      ["digitalLink", () => this.contracts()],
      ["basicIn", () => this.ranges()],
      ["basicOut", () => this.lookup("09506000134352")],
    ] as const).map(async ([key, fn]) => {
      try { await fn(); result[key] = { ok: true, status: 200 }; }
      catch (e) { result[key] = { ok: false, status: e instanceof GS1ApiError ? e.status : 502, message: (e as Error).message }; }
    }));
    return result;
  }
}