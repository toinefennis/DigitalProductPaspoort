import { useMemo, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BasicDataEditor } from "@/components/gs1/basic-data-editor";
import { DigitalLinkEditor, type DigitalLinkDraft } from "@/components/gs1/digital-link-editor";
import { RegistrationForm } from "@/components/gs1/registration-form";
import { digitalLinkSchema, gs1EnvironmentPresentation, isValidGtin, normalizeGtin, type GS1ConnectionTest, type GS1Job, type GS1Record } from "@shared/gs1";
import { AlertTriangle, ArrowDownToLine, ArrowUpRight, Check, CircleHelp, Clock3, Database, FileCheck2, Globe2, Link2, LockKeyhole, RefreshCw, Search, ShieldCheck, SlidersHorizontal, Unlink, Wifi } from "lucide-react";

const ROOT = "/api/gs1/nl";
type Config = { environment: "production" | "acceptance"; baseUrl: string; credentialsConfigured: boolean; dppBaseUrl: string };
type Contract = { contractNumber: string; startNumber?: string; endNumber?: string; productName?: string };
type LinkType = { code: string; title: string; description?: string };

async function getJson<T>(path: string): Promise<T> {
  const response = await apiRequest("GET", path);
  return await response.json() as T;
}
async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await apiRequest("POST", path, body);
  return await response.json() as T;
}
function items<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) return (data as { data: T[] }).data;
  return [];
}
function contractItems(data: unknown): Contract[] {
  if (Array.isArray(data)) return data as Contract[];
  if (data && typeof data === "object" && "contractNumber" in data) return [data as Contract];
  return items<Contract>(data);
}
function recordPath(gtin: string) { return `${ROOT}/records/${encodeURIComponent(gtin)}`; }
function confirmed(job: GS1Job) {
  const status = job.status.toLowerCase();
  const successes = job.result && Array.isArray(job.result.successfulProducts) ? job.result.successfulProducts.length : 0;
  return ["success", "succeeded", "completed", "confirmed", "actief", "registered"].includes(status) || successes > 0;
}
function unresolved(job: GS1Job) {
  return !confirmed(job) && !["draft", "failed", "error", "rejected", "cancelled", "completed", "complete"].includes(job.status.toLowerCase());
}
function stableSerialize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
function statusText(job: GS1Job) {
  if (confirmed(job)) return "Resultaat bevestigd";
  const status = job.status.toLowerCase();
  if (status === "draft") return "Lokaal opgeslagen · niet verzonden";
  if (["pending", "queued", "processing", "submitted", "in_progress"].includes(status)) return "In behandeling · nog niet bevestigd";
  if (["unknown", "uncertain", "timeout"].includes(status)) return "Status onbekend · niet opnieuw versturen";
  if (["failed", "error", "rejected"].includes(status)) return "Mislukt of afgewezen";
  return job.status || "Status onbekend";
}
function localDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(date);
}
function matchingValue(item: Record<string, unknown>) {
  return String(item.gtin ?? item.GTIN ?? item.globalTradeItemNumber ?? item.code ?? "");
}
function itemName(item: Record<string, unknown>, fallback: string) {
  return String(item.name ?? item.productName ?? item.title ?? item.brandName ?? fallback);
}
function itemId(item: Record<string, unknown>) {
  const id = item.id ?? item.productId ?? item.registryId;
  return id === undefined || id === null ? "" : String(id);
}
function setErrorText(error: unknown) {
  return error instanceof Error ? error.message : "Er is een onverwachte fout opgetreden.";
}
function defaultDigitalDraft(gtin: string): DigitalLinkDraft {
  return {
    accountNumber: "",
    identificationKeyType: "Gtin",
    identificationKey: gtin,
    isEnabled: false,
    itemDescription: "",
    resolverSettings: { useGS1Resolver: false },
    links: [],
    applicationIdentifiers: [],
  };
}
function cloneRecordDraft(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? JSON.parse(JSON.stringify(value)) as Record<string, unknown> : null;
}

export default function GS1Sync() {
  const { user, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const role = user?.role;
  const permitted = role === "manager" || role === "admin" || role === "superadmin";
  const [tab, setTab] = useState("records");
  const [lookupValue, setLookupValue] = useState("");
  const [selectedGtin, setSelectedGtin] = useState("");
  const [basicDraft, setBasicDraft] = useState<Record<string, unknown> | null>(null);
  const [digitalDraft, setDigitalDraft] = useState<DigitalLinkDraft | null>(null);
  const [productChoice, setProductChoice] = useState("");
  const [registryChoice, setRegistryChoice] = useState("");
  const [importName, setImportName] = useState("");
  const [importType, setImportType] = useState("overig");
  const [message, setMessage] = useState<{ tone: "good" | "bad" | "info"; text: string } | null>(null);
  const [draftJobToLoad, setDraftJobToLoad] = useState<GS1Job | null>(null);

  const configQuery = useQuery<Config>({ queryKey: [`${ROOT}/config`], queryFn: () => getJson(`${ROOT}/config`), enabled: permitted });
  const recordsQuery = useQuery<GS1Record[]>({ queryKey: [`${ROOT}/records`], queryFn: () => getJson(`${ROOT}/records`), enabled: permitted });
  const jobsQuery = useQuery<GS1Job[]>({ queryKey: [`${ROOT}/jobs`], queryFn: () => getJson(`${ROOT}/jobs`), enabled: permitted });
  const contractsQuery = useQuery<Contract[]>({ queryKey: [`${ROOT}/contracts`], queryFn: () => getJson(`${ROOT}/contracts`), enabled: permitted });
  const rangesQuery = useQuery<Contract[]>({ queryKey: [`${ROOT}/ranges`], queryFn: () => getJson(`${ROOT}/ranges`), enabled: permitted });
  const linkTypesQuery = useQuery<LinkType[]>({ queryKey: [`${ROOT}/link-types`], queryFn: () => getJson(`${ROOT}/link-types`), enabled: permitted });
  const mediaTypesQuery = useQuery<{ allowedMediaTypes: string[] }>({ queryKey: [`${ROOT}/media-types`], queryFn: () => getJson(`${ROOT}/media-types`), enabled: permitted });
  const productsQuery = useQuery<unknown>({ queryKey: ["/api/products"], enabled: permitted });
  const registryQuery = useQuery<unknown>({ queryKey: ["/api/gtin-registry"], enabled: permitted });
  const detailQuery = useQuery<GS1Record>({
    queryKey: [recordPath(selectedGtin)],
    queryFn: () => getJson(recordPath(selectedGtin)),
    enabled: permitted && !!selectedGtin,
  });
  const records = items<GS1Record>(recordsQuery.data);
  const jobs = items<GS1Job>(jobsQuery.data);
  const hasUnresolvedJob = jobs.some(unresolved);
  const contracts = contractItems(rangesQuery.data).length ? contractItems(rangesQuery.data) : contractItems(contractsQuery.data);
  const products = items<Record<string, unknown>>(productsQuery.data);
  const registry = items<Record<string, unknown>>(registryQuery.data);
  const record = detailQuery.data;
  const environmentPresentation = gs1EnvironmentPresentation(configQuery.data);
  const digitalDraftValidation = digitalDraft ? digitalLinkSchema.safeParse(digitalDraft) : null;
  const canPublishDigital = !!record?.digitalLinkDraft && !!digitalDraftValidation?.success &&
    stableSerialize(record.digitalLinkDraft) === stableSerialize(digitalDraft);
  const sameGtinProducts = useMemo(() => products.filter((item) => matchingValue(item).replace(/^0+/, "") === selectedGtin.replace(/^0+/, "")), [products, selectedGtin]);
  const sameGtinRegistry = useMemo(() => registry.filter((item) => matchingValue(item).replace(/^0+/, "") === selectedGtin.replace(/^0+/, "")), [registry, selectedGtin]);

  const testMutation = useMutation({
    mutationFn: () => postJson<GS1ConnectionTest>(`${ROOT}/test`, {}),
    onSuccess: (result) => {
      queryClient.setQueryData(["gs1-connection-test"], result);
      setMessage({ tone: "good", text: "Verbindingstest afgerond. Basic IN-rechten zijn alleen beschikbaar wanneer de test deze expliciet bevestigt." });
    },
    onError: (error) => setMessage({ tone: "bad", text: `Verbindingstest mislukt: ${setErrorText(error)}` }),
  });
  const testResult = queryClient.getQueryData<GS1ConnectionTest>(["gs1-connection-test"]);
  const lookupMutation = useMutation({
    mutationFn: async (gtin: string) => postJson<GS1Record>(`${ROOT}/lookup`, { gtin }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/records`] });
      openRecord(result.gtin);
      setMessage({ tone: "good", text: "GS1 Basic OUT-gegevens zijn opgehaald. Controleer of dit een provider-only snapshot is; de externe gegevens zijn niet gewijzigd." });
    },
    onError: (error) => setMessage({ tone: "bad", text: `Opzoeken is mislukt: ${setErrorText(error)}` }),
  });
  const saveMutation = useMutation({
    mutationFn: (input: { gtin: string; payload: Record<string, unknown> }) => postJson<GS1Record>(recordPath(input.gtin), input.payload),
    onSuccess: async (saved) => {
      queryClient.setQueryData([recordPath(saved.gtin)], saved);
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/records`] });
      setMessage({ tone: "good", text: "Lokale conceptversie opgeslagen. GS1 is hiermee niet bijgewerkt of bevestigd." });
    },
    onError: (error) => setMessage({ tone: "bad", text: `Lokaal opslaan is mislukt: ${setErrorText(error)}` }),
  });
  const importMutation = useMutation({
    mutationFn: (input: { gtin: string; name: string; type: string; expectedVersion: number }) => postJson<GS1Record>(`${recordPath(input.gtin)}/import`, { name: input.name, type: input.type, expectedVersion: input.expectedVersion }),
    onSuccess: async (saved) => {
      queryClient.setQueryData([recordPath(saved.gtin)], saved);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`${ROOT}/records`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/products"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/gtin-registry"] }),
      ]);
      setImportName("");
      setMessage({ tone: "good", text: "Lokaal product en GTIN-register zijn aangemaakt of gekoppeld aan deze GS1-record." });
    },
    onError: (error) => setMessage({ tone: "bad", text: `Importeren is mislukt: ${setErrorText(error)}` }),
  });
  const fetchDigitalMutation = useMutation({
    mutationFn: () => postJson<GS1Record>(`${recordPath(selectedGtin)}/digital-link/fetch`, {}),
    onSuccess: async (result) => {
      queryClient.setQueryData([recordPath(result.gtin)], result);
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/records`] });
      setMessage({ tone: "good", text: "Digital Link-snapshot opgehaald. De opgeslagen lokale conceptversie is niet overschreven." });
    },
    onError: (error) => setMessage({ tone: "bad", text: `Ophalen Digital Link is mislukt: ${setErrorText(error)}` }),
  });
  const publishMutation = useMutation({
    mutationFn: (input: { gtin: string; expectedVersion: number }) => postJson<GS1Record>(`${recordPath(input.gtin)}/digital-link/publish`, { confirm: true, expectedVersion: input.expectedVersion }),
    onSuccess: async (saved) => {
      queryClient.setQueryData([recordPath(saved.gtin)], saved);
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/records`] });
      setMessage({ tone: "good", text: "Digital Link is naar GS1 verstuurd. Controleer de bijgewerkte recordstatus; opslaan alleen was geen publicatie." });
    },
    onError: async (error) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [recordPath(selectedGtin)] }),
        queryClient.invalidateQueries({ queryKey: [`${ROOT}/records`] }),
      ]);
      setMessage({ tone: "bad", text: `Publiceren is mislukt: ${setErrorText(error)}. Recordstatus en versie zijn vernieuwd; bij een time-out eerst controleren en niet opnieuw verzenden.` });
    },
  });
  const registrationDraftMutation = useMutation({
    mutationFn: (input: { requestId: string; registrationProduct: Record<string, unknown> }) =>
      postJson<GS1Job>(`${ROOT}/registration-drafts`, input),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/jobs`] });
      setMessage({ tone: "good", text: `Registratieconcept ${job.id} lokaal opgeslagen. Er is niets naar GS1 verstuurd.` });
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/jobs`] });
      setMessage({ tone: "bad", text: `Concept kon niet worden opgeslagen: ${setErrorText(error)}` });
    },
  });
  const registrationMutation = useMutation({
    mutationFn: (input: { requestId: string; registrationProduct: Record<string, unknown> }) =>
      postJson<GS1Job>(`${ROOT}/registrations`, { ...input, confirm: true }),
    onSuccess: async (job) => {
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/jobs`] });
      setMessage({ tone: "info", text: `Registratieopdracht ${job.id} aangemaakt. De opdracht is niet GS1-bevestigd zolang de jobstatus dat niet expliciet bevestigt.` });
      setTab("jobs");
    },
    onError: async (error) => {
      await queryClient.invalidateQueries({ queryKey: [`${ROOT}/jobs`] });
      setMessage({ tone: "bad", text: `Opdrachtresultaat onzeker of mislukt: ${setErrorText(error)}. De opdrachtlijst is vernieuwd; verstuur niet opnieuw met dezelfde ID.` });
    },
  });
  const checkJobMutation = useMutation({
    mutationFn: (id: string) => postJson<GS1Job>(`${ROOT}/jobs/${encodeURIComponent(id)}/check`, {}),
    onSuccess: async (job) => {
      queryClient.setQueryData([`${ROOT}/jobs`], (old: GS1Job[] | undefined) => old?.map((item) => item.id === job.id ? job : item));
      if (confirmed(job)) {
        await queryClient.invalidateQueries({ queryKey: [`${ROOT}/records`] });
      }
    },
    onError: (error) => setMessage({ tone: "bad", text: `Statuscontrole mislukt: ${setErrorText(error)}. Opdracht niet opnieuw versturen.` }),
  });

  function openRecord(gtin: string) {
    setSelectedGtin(gtin);
    setLookupValue(gtin);
    setBasicDraft(null);
    setDigitalDraft(null);
    setProductChoice("");
    setRegistryChoice("");
  }
  function prepareBasicDraft() {
    const source = record?.basicDraft ?? record?.basicData;
    if (!source) {
      setMessage({ tone: "info", text: "Er is geen Basic OUT-snapshot om te kopiëren. Zoek eerst een geldige GTIN bij GS1." });
      return;
    }
    setBasicDraft(cloneRecordDraft(source));
    setMessage({ tone: "info", text: "Lokale Basic OUT-conceptversie gestart vanuit de snapshot. De oorspronkelijke snapshot blijft apart bewaard." });
  }
  function prepareDigitalDraft() {
    const source = record?.digitalLinkDraft ?? record?.digitalLinkData;
    if (source && typeof source === "object") setDigitalDraft(JSON.parse(JSON.stringify(source)) as DigitalLinkDraft);
    else setDigitalDraft(defaultDigitalDraft(record?.gtin ?? selectedGtin));
    setMessage({ tone: "info", text: "Lokale Digital Link-conceptversie gestart. Externe velden blijven als aparte snapshot bewaard." });
  }
  async function submitLookup() {
    const raw = lookupValue.trim();
    if (!isValidGtin(raw)) {
      setMessage({ tone: "bad", text: "Voer een volledige GTIN met geldig controlecijfer in. Er wordt geen code gegenereerd of geraden." });
      return;
    }
    lookupMutation.mutate(normalizeGtin(raw));
  }
  function saveLocal() {
    if (!record) return;
    const payload: Record<string, unknown> = { expectedVersion: record.version };
    if (basicDraft) payload.basicDraft = basicDraft;
    if (digitalDraft) payload.digitalLinkDraft = digitalDraft;
    if (productChoice && productChoice !== "none") payload.productId = Number(productChoice);
    else if (productChoice === "none") payload.productId = null;
    if (registryChoice && registryChoice !== "none") payload.registryId = Number(registryChoice);
    else if (registryChoice === "none") payload.registryId = null;
    saveMutation.mutate({ gtin: record.gtin, payload });
  }
  async function importProduct() {
    if (!record || !importName.trim()) return;
    if (!window.confirm(`Maak of koppel een lokaal product en GTIN-register voor ${record.gtin}? Er wordt geen product bij GS1 aangemaakt.`)) return;
    importMutation.mutate({ gtin: record.gtin, name: importName.trim(), type: importType, expectedVersion: record.version });
  }
  function publishDigital() {
    if (!record || !digitalDraft) return;
    const validation = digitalLinkSchema.safeParse(digitalDraft);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      setMessage({ tone: "bad", text: `Vul eerst de Digital Link-draft volledig in (${issue?.path.join(".") || "veld"}): ${issue?.message || "controleer de invoer"}` });
      return;
    }
    if (!record.digitalLinkDraft || stableSerialize(record.digitalLinkDraft) !== stableSerialize(digitalDraft)) {
      setMessage({ tone: "bad", text: "Sla eerst exact deze volledige Digital Link-draft lokaal op. Er wordt niets verzonden." });
      return;
    }
    if (!window.confirm(`Digital Link voor GTIN ${record.gtin} nu naar GS1 Nederland versturen? Alleen de opgeslagen lokale draft wordt verzonden.`)) return;
    publishMutation.mutate({ gtin: record.gtin, expectedVersion: record.version });
  }

  if (authLoading) {
    return <main className="min-h-[70dvh] bg-[#f3f7f5] p-6"><div className="mx-auto max-w-7xl animate-pulse space-y-4"><div className="h-36 rounded-2xl bg-[#dce9e2]" /><div className="h-20 rounded-xl bg-white" /><div className="h-72 rounded-xl bg-white" /></div></main>;
  }
  if (!permitted) {
    return <div className="mx-auto flex min-h-[60dvh] max-w-xl items-center justify-center p-6"><Card className="w-full border-slate-200 bg-[#f7faf8]"><CardContent className="p-8 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600"><LockKeyhole className="h-6 w-6" /></div><h1 className="text-xl font-semibold text-slate-900">GS1 Nederland-beheer</h1><p className="mt-2 text-sm leading-6 text-slate-600">Toegang is beschikbaar voor medewerkers met de rol manager, admin of superadmin.</p></CardContent></Card></div>;
  }

  return (
    <main className="min-h-[100dvh] bg-[#f3f7f5] pb-16 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <header className="mb-6 overflow-hidden rounded-2xl bg-[#153d35] text-white shadow-sm">
          <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-end">
            <div className="pointer-events-none absolute -right-6 -top-24 h-72 w-72 rounded-full border border-white/10" />
            <div className="pointer-events-none absolute -right-1 top-4 h-44 w-44 rounded-full border border-white/10" />
            <div className="relative">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-emerald-50"><Globe2 className="h-3.5 w-3.5" /> GRONINGEN WERKT CIRCULAIR <span className="opacity-50">/</span> GS1 NEDERLAND</div>
              <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Verifieer records.<br className="hidden sm:block" /> Beheer uw productpaspoorten.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-50/80">Koppel officiële GS1-productdata zorgvuldig aan lokale circulaire productpaspoorten. Externe snapshots en lokale concepten blijven altijd gescheiden.</p>
            </div>
            <div className="relative flex flex-wrap gap-2">
              <Button variant="secondary" className="bg-white text-[#153d35] hover:bg-emerald-50" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>{testMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Wifi className="mr-2 h-4 w-4" />}{testMutation.isPending ? "Testen…" : "Verbinding testen"}</Button>
              <Badge className="self-center border border-white/20 bg-white/10 px-3 py-1.5 text-white hover:bg-white/10">{environmentPresentation.label}</Badge>
            </div>
          </div>
        </header>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <StatusTile icon={<ShieldCheck className="h-4 w-4" />} label="GS1-authenticatie" value={testResult?.authentication ? (testResult.authentication.ok ? "Verbonden" : "Geen toegang") : configQuery.data?.credentialsConfigured ? "Geconfigureerd" : "Niet bevestigd"} detail={testResult?.authentication?.message ?? (configQuery.data?.credentialsConfigured ? "Test de verbinding voor actuele status." : "Credentials niet geconfigureerd.")} good={!!testResult?.authentication?.ok} />
          <StatusTile icon={<FileCheck2 className="h-4 w-4" />} label="Basic IN-rechten" value={testResult?.basicIn ? (testResult.basicIn.ok ? "Beschikbaar" : "Geen toegang") : "Nog niet getest"} detail={testResult?.basicIn?.message ?? "Registreren blijft vergrendeld totdat de test ok=true meldt."} good={!!testResult?.basicIn?.ok} />
          <StatusTile icon={<Database className="h-4 w-4" />} label="Lokale GS1-records" value={recordsQuery.isLoading ? "Laden…" : String(records.length)} detail={configQuery.data?.dppBaseUrl ? `DPP-basis: ${configQuery.data.dppBaseUrl}` : "Records worden niet automatisch aangemaakt."} />
        </div>
        {rangesQuery.isError && <Alert className="mb-5 border-amber-200 bg-amber-50 text-amber-950"><AlertTriangle className="h-4 w-4" /><AlertTitle>GS1 Basic IN-reeks is niet beschikbaar</AlertTitle><AlertDescription>De officiële reeksen konden niet worden geladen (mogelijk ontbreken Basic IN-rechten). Gebruik alleen contract- en reeksgegevens die u zelf in MyGS1 kunt bevestigen; er worden geen codes afgeleid.</AlertDescription></Alert>}

        {message && <Alert className={`mb-5 border ${message.tone === "bad" ? "border-red-200 bg-red-50 text-red-950" : message.tone === "good" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : "border-amber-200 bg-amber-50 text-amber-950"}`}><CircleHelp className="h-4 w-4" /><AlertDescription className="pr-6">{message.text}<button type="button" className="float-right font-semibold underline" onClick={() => setMessage(null)}>Sluiten</button></AlertDescription></Alert>}

        <Tabs value={tab} onValueChange={setTab} className="space-y-5">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-[#e3ede8] p-1 sm:grid-cols-4">
            <TabsTrigger value="records" className="gap-2 rounded-lg py-2.5"><Database className="h-4 w-4" />Records</TabsTrigger>
            <TabsTrigger value="digital" className="gap-2 rounded-lg py-2.5"><Link2 className="h-4 w-4" />Digital Link</TabsTrigger>
            <TabsTrigger value="register" className="gap-2 rounded-lg py-2.5"><ArrowUpRight className="h-4 w-4" />Registreren</TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2 rounded-lg py-2.5"><Clock3 className="h-4 w-4" />Opdrachten</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.8fr)]">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-lg"><Search className="h-5 w-5 text-[#2e7764]" />Officieel product opzoeken</CardTitle><p className="text-sm leading-6 text-slate-500">Zoek met een bestaande GTIN. Er worden geen codes voorgesteld, gegenereerd of geraden.</p></CardHeader>
                <CardContent><form className="flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void submitLookup(); }}><div className="flex-1 space-y-1.5"><Label htmlFor="gs1-lookup">GTIN</Label><Input id="gs1-lookup" value={lookupValue} onChange={(event) => setLookupValue(event.target.value)} placeholder="Bestaande GTIN met controlecijfer" inputMode="numeric" /></div><Button type="submit" className="mt-auto bg-[#22634f] hover:bg-[#194c3d]" disabled={lookupMutation.isPending}>{lookupMutation.isPending ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}{lookupMutation.isPending ? "Opzoeken…" : "Zoek bij GS1"}</Button></form></CardContent>
              </Card>
              <Card className="border-amber-200 bg-[#fffaf0] shadow-sm"><CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base text-amber-950"><AlertTriangle className="h-4 w-4" />Basic IN is niet vrijgegeven</CardTitle></CardHeader><CardContent className="text-sm leading-6 text-amber-950/80">De geverifieerde verbinding heeft geen Basic IN-toegang. Productregistraties zijn daarom standaard uitgeschakeld. Vraag GS1 Nederland om toegang voordat u registreert.</CardContent></Card>
            </div>

            <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
              <Card className="h-fit border-slate-200 shadow-sm">
                <CardHeader className="flex-row items-center justify-between space-y-0 pb-3"><CardTitle className="text-base">Bekende records</CardTitle><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Records vernieuwen" onClick={() => void recordsQuery.refetch()}><RefreshCw className={`h-4 w-4 ${recordsQuery.isFetching ? "animate-spin" : ""}`} /></Button></CardHeader>
                <CardContent className="p-0">
                  {recordsQuery.isLoading ? <div className="space-y-2 px-5 pb-5"><div className="h-16 animate-pulse rounded-lg bg-slate-100" /><div className="h-16 animate-pulse rounded-lg bg-slate-100" /></div> :
                    recordsQuery.isError ? <InlineError text={setErrorText(recordsQuery.error)} retry={() => void recordsQuery.refetch()} /> :
                    records.length === 0 ? <div className="px-5 pb-5"><EmptyState title="Nog geen lokale records" body="Zoek een bestaande GTIN bij GS1 om de officiële snapshot te bekijken." /></div> :
                    <div className="max-h-[540px] divide-y divide-slate-100 overflow-y-auto">{records.map((item) => <button key={item.id} type="button" onClick={() => openRecord(item.gtin)} className={`w-full px-5 py-3 text-left transition-colors hover:bg-emerald-50 ${selectedGtin === item.gtin ? "bg-emerald-50" : ""}`}><span className="flex items-center justify-between gap-2"><span className="font-mono text-sm font-semibold text-slate-900">{item.gtin}</span><Badge variant="outline" className="max-w-[145px] truncate text-[10px]">{item.registrationStatus || item.syncState}</Badge></span><span className="mt-1 block text-xs text-slate-500">Versie {item.version} · bijgewerkt {localDate(item.updatedAt)}</span></button>)}</div>}
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                {!selectedGtin ? <CardContent className="p-8"><EmptyState title="Selecteer of zoek een GTIN" body="Een record toont zowel de onveranderde GS1-snapshot als afzonderlijke lokale concepten." /></CardContent> :
                detailQuery.isLoading ? <CardContent className="space-y-3 p-6"><div className="h-7 w-52 animate-pulse rounded bg-slate-100" /><div className="h-28 animate-pulse rounded-xl bg-slate-100" /><div className="h-28 animate-pulse rounded-xl bg-slate-100" /></CardContent> :
                detailQuery.isError ? <CardContent className="p-6"><InlineError text={`Record niet geladen: ${setErrorText(detailQuery.error)}`} retry={() => void detailQuery.refetch()} /></CardContent> :
                record ? <><CardHeader className="border-b border-slate-100"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.12em] text-emerald-800"><span className="h-2 w-2 rounded-full bg-emerald-600" />GS1-record</div><CardTitle className="mt-2 font-mono text-xl">{record.gtin}</CardTitle><p className="mt-1 text-sm text-slate-500">Omgeving: {record.environment} · versie {record.version} · laatst bijgewerkt {localDate(record.updatedAt)}</p></div><div className="flex flex-wrap gap-2"><Badge variant="outline">{record.registrationStatus || "Status onbekend"}</Badge><Badge variant="secondary">{record.syncState || "Status onbekend"}</Badge></div></div></CardHeader>
                  <CardContent className="space-y-5 p-5">
                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><ShieldCheck className="h-4 w-4 text-[#28735c]" />Externe Basic OUT-snapshot</div>{record.basicData ? <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-5 text-slate-700">{JSON.stringify(record.basicData, null, 2)}</pre> : <p className="text-sm text-slate-500">Nog geen Basic OUT-snapshot bekend.</p>}</section>
                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-2 flex items-center gap-2 font-semibold text-slate-800"><Link2 className="h-4 w-4 text-[#28735c]" />Externe Digital Link-snapshot</div>{record.digitalLinkData ? <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 text-xs leading-5 text-slate-700">{JSON.stringify(record.digitalLinkData, null, 2)}</pre> : <p className="text-sm text-slate-500">Geen externe Digital Link-snapshot vastgelegd.</p>}<p className="mt-2 text-xs text-slate-500">Externe verwijzing: {record.externalReference || "geen"}</p></section>
                    <section className="space-y-3">
                      <div><h3 className="font-semibold text-slate-900">Lokale drafts</h3><p className="mt-1 text-sm text-slate-500">Begin of bewerk drafts expliciet. Ze vervangen de externe snapshot niet.</p></div>
                      {!basicDraft ? <Button type="button" variant="outline" onClick={prepareBasicDraft} disabled={!record.basicData && !record.basicDraft}>Bewerk lokale Basic OUT-draft</Button> : <div className="space-y-3"><BasicDataEditor value={basicDraft} onChange={setBasicDraft} /><Button type="button" variant="outline" onClick={() => setBasicDraft(null)}>Conceptwijzigingen sluiten</Button></div>}
                    </section>
                    <section className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-2">
                      <div className="md:col-span-2"><h3 className="font-semibold text-slate-900">Lokale relaties</h3><p className="mt-1 text-sm text-slate-500">Alleen bestaande lokale items met dezelfde GTIN worden aangeboden.</p></div>
                      <div className="space-y-1.5"><Label>Lokaal product met dezelfde GTIN</Label><Select value={productChoice || "none"} onValueChange={setProductChoice}><SelectTrigger><SelectValue placeholder="Geen koppeling" /></SelectTrigger><SelectContent><SelectItem value="none">Geen koppeling</SelectItem>{sameGtinProducts.map((item, index) => <SelectItem key={`${itemId(item)}-${index}`} value={itemId(item)}>{itemName(item, `Product ${itemId(item)}`)}</SelectItem>)}</SelectContent></Select>{sameGtinProducts.length === 0 && <p className="text-xs text-slate-500">Geen bestaand product met dezelfde GTIN gevonden.</p>}</div>
                      <div className="space-y-1.5"><Label>GTIN-registeritem met dezelfde GTIN</Label><Select value={registryChoice || "none"} onValueChange={setRegistryChoice}><SelectTrigger><SelectValue placeholder="Geen koppeling" /></SelectTrigger><SelectContent><SelectItem value="none">Geen koppeling</SelectItem>{sameGtinRegistry.map((item, index) => <SelectItem key={`${itemId(item)}-${index}`} value={itemId(item)}>{itemName(item, `Registeritem ${itemId(item)}`)}</SelectItem>)}</SelectContent></Select>{sameGtinRegistry.length === 0 && <p className="text-xs text-slate-500">Geen bestaand registeritem met dezelfde GTIN gevonden.</p>}</div>
                    </section>
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Button onClick={saveLocal} disabled={saveMutation.isPending || (!basicDraft && !digitalDraft && !productChoice && !registryChoice)} className="bg-[#22634f] hover:bg-[#194c3d]">{saveMutation.isPending ? "Opslaan…" : "Lokale concepten opslaan"}</Button>
                      <Button variant="outline" onClick={() => fetchDigitalMutation.mutate()} disabled={fetchDigitalMutation.isPending}>{fetchDigitalMutation.isPending ? "Ophalen…" : "Digital Link bij GS1 ophalen"}<ArrowDownToLine className="ml-2 h-4 w-4" /></Button>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4">
                      {!digitalDraft ? <Button variant="outline" onClick={prepareDigitalDraft}>Lokale Digital Link-draft openen</Button> : <div className="space-y-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-emerald-950">Digital Link-concept</h3><p className="mt-1 text-sm text-emerald-900/70">Velden worden pas extern gepubliceerd na expliciete bevestiging.</p></div><Button type="button" variant="ghost" size="sm" onClick={() => setDigitalDraft(null)}>Sluiten</Button></div><DigitalLinkEditor value={digitalDraft} onChange={setDigitalDraft} linkTypes={items<LinkType>(linkTypesQuery.data)} mediaTypes={mediaTypesQuery.data?.allowedMediaTypes ?? []} gtin={record.gtin} dppBaseUrl={configQuery.data?.dppBaseUrl} /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={saveLocal} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Opslaan…" : "Digital Link lokaal opslaan"}</Button><Button onClick={publishDigital} disabled={publishMutation.isPending || !canPublishDigital} className="bg-[#22634f] hover:bg-[#194c3d]">{publishMutation.isPending ? "Versturen…" : "Opgeslagen draft publiceren"}<ArrowUpRight className="ml-2 h-4 w-4" /></Button></div><p className="text-xs leading-5 text-emerald-950/70">Publiceren vereist een volledige, lokaal opgeslagen versie. Dit verstuurt een externe schrijfopdracht naar GS1.</p></div>}
                    </div>
                    <section className="space-y-3 rounded-xl border border-slate-200 p-4"><div className="flex items-start gap-2"><Unlink className="mt-0.5 h-4 w-4 text-slate-500" /><div><h3 className="font-semibold text-slate-900">Lokaal product aanmaken of koppelen</h3><p className="mt-1 text-sm text-slate-500">Deze expliciete actie gebruikt uitsluitend de geselecteerde GS1-GTIN; er wordt geen externe registratie verstuurd.</p></div></div><div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]"><div className="space-y-1.5"><Label htmlFor="gs1-import-name">Lokale productnaam</Label><Input id="gs1-import-name" value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="Naam voor het lokale product" /></div><div className="space-y-1.5"><Label>Producttype</Label><Select value={importType} onValueChange={setImportType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["kledingstuk", "materiaal", "remake", "overig"].map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div><Button className="mt-auto" variant="outline" onClick={() => void importProduct()} disabled={!importName.trim() || importMutation.isPending}>{importMutation.isPending ? "Verwerken…" : "Lokaal importeren"}</Button></div></section>
                    {record.lastError && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Laatste integratiefout</AlertTitle><AlertDescription>{record.lastError}</AlertDescription></Alert>}
                  </CardContent></> : null}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="digital" className="space-y-5">
            <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-[#28735c]" />Digital Link-beheer</CardTitle><p className="text-sm leading-6 text-slate-500">Bewerk een lokale draft voor een bestaand GS1-record. Externe snapshots zijn read-only en wijzigen alleen door een expliciete publicatie.</p></CardHeader><CardContent>
              {!record ? <EmptyState title="Nog geen record geselecteerd" body="Zoek eerst een bestaande GTIN en selecteer het record op de Records-pagina." action={<Button variant="outline" onClick={() => setTab("records")}>Naar records</Button>} /> :
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#edf4f0] p-4"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Geselecteerde record</p><p className="mt-1 font-mono text-lg font-semibold">{record.gtin}</p><p className="text-xs text-slate-500">Versie {record.version} · externe snapshot blijft gescheiden</p></div><div className="flex gap-2"><Button variant="outline" onClick={() => fetchDigitalMutation.mutate()} disabled={fetchDigitalMutation.isPending}>{fetchDigitalMutation.isPending ? "Ophalen…" : "Externe snapshot ophalen"}</Button><Button variant="outline" onClick={prepareDigitalDraft}>Draft openen / starten</Button></div></div>
                  {digitalDraft ? <div className="space-y-4"><DigitalLinkEditor value={digitalDraft} onChange={setDigitalDraft} linkTypes={items<LinkType>(linkTypesQuery.data)} mediaTypes={mediaTypesQuery.data?.allowedMediaTypes ?? []} gtin={record.gtin} dppBaseUrl={configQuery.data?.dppBaseUrl} /><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><Button variant="outline" onClick={saveLocal} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Opslaan…" : "Lokale draft opslaan"}</Button><Button onClick={publishDigital} disabled={publishMutation.isPending || !canPublishDigital} className="bg-[#22634f] hover:bg-[#194c3d]">{publishMutation.isPending ? "Versturen…" : "Opgeslagen draft publiceren"}<ArrowUpRight className="ml-2 h-4 w-4" /></Button></div><p className="text-xs leading-5 text-slate-500">De publicatieknop vereist een volledige versie die identiek is aan de opgeslagen draft.</p></div> : <EmptyState title="Lokale draft nog niet geopend" body="Open de draft om een lokale conceptversie te maken of de bestaande versie aan te passen." />}
                </div>}
            </CardContent></Card>
            <Alert className="border-slate-200 bg-white"><SlidersHorizontal className="h-4 w-4" /><AlertTitle>Geen verzonnen linktypes</AlertTitle><AlertDescription>Linktypen en mediatypen komen uit de officiële GS1-woordenlijsten. Wanneer die niet laden, kan een niet-ingevulde draft worden voorbereid maar worden er geen standaardcodes verzonnen.</AlertDescription></Alert>
          </TabsContent>

          <TabsContent value="register">
            {environmentPresentation.acceptanceUsesProduction && <Alert className="mb-4 border-red-300 bg-red-50 text-red-950"><AlertTriangle className="h-4 w-4" /><AlertTitle>Let op: GS1-productieomgeving</AlertTitle><AlertDescription>Deze verbinding gebruikt de GS1-productieomgeving. Verzoeken worden rechtstreeks daar verwerkt.</AlertDescription></Alert>}
            <Card className="border-slate-200 shadow-sm"><CardHeader><CardTitle className="text-xl">Productregistratie voorbereiden</CardTitle><p className="max-w-3xl text-sm leading-6 text-slate-500">Vul productdata in, sla een onvolledig concept lokaal op en verzend alleen na validatie en bevestiging.</p></CardHeader><CardContent><RegistrationForm contracts={contracts} jobs={jobs} draftToLoad={draftJobToLoad} onDraftLoaded={() => setDraftJobToLoad(null)} basicInReady={!!testResult?.basicIn?.ok} unresolvedJob={hasUnresolvedJob} pending={registrationMutation.isPending} savingDraft={registrationDraftMutation.isPending} onSaveDraft={async (requestId, registrationProduct) => await registrationDraftMutation.mutateAsync({ requestId, registrationProduct })} onSubmit={async (requestId, registrationProduct) => await registrationMutation.mutateAsync({ requestId, registrationProduct })} /></CardContent></Card>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" />Alleen expliciet bevestigde verzending</span><span className="inline-flex items-center gap-1.5"><LockKeyhole className="h-3.5 w-3.5" />Basic IN-toegang vereist</span></div>
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            <div className="flex items-end justify-between gap-3"><div><h2 className="text-xl font-semibold text-slate-900">Registratieopdrachten</h2><p className="mt-1 text-sm text-slate-500">Een aangemaakte of in behandeling zijnde job is geen GS1-bevestiging.</p></div><Button variant="outline" size="sm" onClick={() => void jobsQuery.refetch()} disabled={jobsQuery.isFetching}><RefreshCw className={`mr-2 h-4 w-4 ${jobsQuery.isFetching ? "animate-spin" : ""}`} />Vernieuwen</Button></div>
            {jobsQuery.isLoading ? <div className="space-y-3"><div className="h-28 animate-pulse rounded-xl bg-white" /><div className="h-28 animate-pulse rounded-xl bg-white" /></div> :
              jobsQuery.isError ? <InlineError text={setErrorText(jobsQuery.error)} retry={() => void jobsQuery.refetch()} /> :
              jobs.length === 0 ? <Card className="border-dashed border-slate-300 bg-white/70"><CardContent className="p-8"><EmptyState title="Nog geen opdrachten" body="Na een bewust bevestigde Basic IN-aanvraag verschijnen opdrachten en hun status hier." action={<Button variant="outline" onClick={() => setTab("register")}>Registratie voorbereiden</Button>} /></CardContent></Card> :
              <div className="space-y-3">{jobs.map((job) => <Card key={job.id} className="border-slate-200 shadow-sm"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-sm font-semibold text-slate-900">{job.id}</p><Badge className={confirmed(job) ? "border-emerald-200 bg-emerald-100 text-emerald-900" : job.status.toLowerCase() === "draft" ? "border-slate-200 bg-slate-100 text-slate-800" : "border-amber-200 bg-amber-100 text-amber-900"}>{statusText(job)}</Badge></div><p className="mt-2 text-xs text-slate-500">Aangemaakt {localDate(job.createdAt)} · {job.environment}</p>{job.lastError && <p className="mt-2 text-sm text-red-700">{job.lastError}</p>}{job.result && <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(job.result, null, 2)}</pre>}{job.request && <details className="mt-3"><summary className="cursor-pointer text-xs font-medium text-slate-600">{job.status.toLowerCase() === "draft" ? "Opgeslagen conceptgegevens" : "Ingediende gegevens"}</summary><pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-3 text-xs">{JSON.stringify(job.request, null, 2)}</pre></details>}</div><div className="flex shrink-0 gap-2">{job.status.toLowerCase() === "draft" && <Button variant="outline" size="sm" onClick={() => { setDraftJobToLoad(job); setTab("register"); }}>Bewerk concept</Button>}<Button variant="outline" size="sm" onClick={() => checkJobMutation.mutate(job.id)} disabled={checkJobMutation.isPending || confirmed(job) || job.status.toLowerCase() === "draft"}>{job.status.toLowerCase() === "draft" ? "Lokaal concept" : checkJobMutation.isPending ? "Controleren…" : confirmed(job) ? <><Check className="mr-2 h-4 w-4" />Bevestigd</> : "Status controleren"}</Button></div></CardContent></Card>)}</div>}
          </TabsContent>
        </Tabs>

        <footer className="mt-8 flex flex-col gap-2 border-t border-[#d5e2dc] pt-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>GS1-records zijn de bron voor officiële identificatie; lokale DPP-gegevens blijven afzonderlijk beheerd.</span><span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />Verbinding: {configQuery.data?.baseUrl || "endpoint laden"}</span></footer>
      </div>
    </main>
  );
}

function StatusTile({ icon, label, value, detail, good }: { icon: ReactNode; label: string; value: string; detail: string; good?: boolean }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{icon}{label}</span>{good === undefined ? <span className="h-2 w-2 rounded-full bg-slate-300" /> : <span className={`h-2 w-2 rounded-full ${good ? "bg-emerald-600" : "bg-amber-500"}`} />}</div><p className="mt-3 text-lg font-semibold text-slate-900">{value}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{detail}</p></div>;
}
function InlineError({ text, retry }: { text: string; retry: () => void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 p-4"><p className="text-sm font-medium text-red-900">Gegevens konden niet worden geladen</p><p className="mt-1 text-xs text-red-800">{text}</p><Button variant="outline" size="sm" className="mt-3" onClick={retry}>Opnieuw proberen</Button></div>;
}
function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="mx-auto max-w-md py-5 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800"><Database className="h-5 w-5" /></div><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{body}</p>{action && <div className="mt-4">{action}</div>}</div>;
}