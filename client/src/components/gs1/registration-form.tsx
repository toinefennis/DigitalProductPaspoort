import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, ArrowUpRight, Save, ShieldCheck, FilePlus2 } from "lucide-react";
import { registrationProductSchema, type GS1Job } from "@shared/gs1";

export type RegistrationDraft = {
  status: "Concept" | "Actief" | "Inactief";
  gpc: string;
  consumerUnit: "Ja" | "Nee";
  packagingType: string;
  targetMarketCountry: string;
  description: string;
  language: string;
  brandName: string;
  subBrandName: string;
  netContent: string;
  measurementUnit: string;
  imageUrl: string;
  contractNumber: string;
};

const initialDraft: RegistrationDraft = {
  status: "Concept",
  gpc: "",
  consumerUnit: "Ja",
  packagingType: "",
  targetMarketCountry: "Nederland",
  description: "",
  language: "Nederlands",
  brandName: "",
  subBrandName: "",
  netContent: "",
  measurementUnit: "",
  imageUrl: "",
  contractNumber: "",
};

function requestIdFor(job: GS1Job) {
  return String(job.request?.requestId ?? job.invocationId ?? job.id);
}

function productFor(job: GS1Job): Record<string, unknown> {
  const request = job.request as Record<string, unknown>;
  const product = request.registrationProduct;
  return product && typeof product === "object" ? product as Record<string, unknown> : request;
}

function draftFromJob(job: GS1Job): { gtin: string; draft: RegistrationDraft } {
  const product = productFor(job);
  return {
    gtin: String(product.gtin ?? "1"),
    draft: {
      ...initialDraft,
      status: (product.status as RegistrationDraft["status"]) ?? initialDraft.status,
      gpc: String(product.gpc ?? ""),
      consumerUnit: (product.consumerUnit as RegistrationDraft["consumerUnit"]) ?? initialDraft.consumerUnit,
      packagingType: String(product.packagingType ?? ""),
      targetMarketCountry: String(product.targetMarketCountry ?? ""),
      description: String(product.description ?? ""),
      language: String(product.language ?? ""),
      brandName: String(product.brandName ?? ""),
      subBrandName: String(product.subBrandName ?? ""),
      netContent: String(product.netContent ?? ""),
      measurementUnit: String(product.measurementUnit ?? ""),
      imageUrl: String(product.imageUrl ?? ""),
      contractNumber: String(product.contractNumber ?? ""),
    },
  };
}

export function RegistrationForm({
  contracts,
  jobs,
  draftToLoad,
  onDraftLoaded,
  basicInReady,
  unresolvedJob,
  pending,
  savingDraft,
  onSaveDraft,
  onSubmit,
}: {
  contracts: Array<{ contractNumber: string; startNumber?: string; endNumber?: string; productName?: string }>;
  jobs: GS1Job[];
  draftToLoad: GS1Job | null;
  onDraftLoaded: () => void;
  basicInReady: boolean;
  unresolvedJob: boolean;
  pending: boolean;
  savingDraft: boolean;
  onSaveDraft: (requestId: string, product: Record<string, unknown>) => Promise<GS1Job>;
  onSubmit: (requestId: string, product: Record<string, unknown>) => Promise<GS1Job>;
}) {
  const [draft, setDraft] = useState<RegistrationDraft>(initialDraft);
  const [gtin, setGtin] = useState("1");
  const [requestId, setRequestId] = useState<string>(() => crypto.randomUUID());
  const [savedJob, setSavedJob] = useState<GS1Job | null>(null);
  const [submissionAttempted, setSubmissionAttempted] = useState(false);
  const [error, setError] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState("");
  const draftJobs = jobs.filter((job) => job.status.toLowerCase() === "draft");
  const currentJob = jobs.find((job) => requestIdFor(job) === requestId) ?? savedJob;
  const locked = submissionAttempted || (!!currentJob && currentJob.status.toLowerCase() !== "draft");
  const field = <K extends keyof RegistrationDraft>(key: K, value: RegistrationDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!draftToLoad || draftToLoad.status.toLowerCase() !== "draft") return;
    loadJob(draftToLoad);
    onDraftLoaded();
  // Loading is an explicit user action; do not reinitialize from job refetches.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftToLoad?.id]);

  function loadJob(job: GS1Job) {
    const restored = draftFromJob(job);
    setRequestId(requestIdFor(job));
    setGtin(restored.gtin);
    setDraft(restored.draft);
    setSavedJob(job);
    setSubmissionAttempted(false);
    setError("");
  }

  function registrationProduct() {
    return { index: 1, gtin: gtin.trim() || "1", ...draft };
  }

  async function saveDraft() {
    setError("");
    try {
      const job = await onSaveDraft(requestId, registrationProduct());
      setSavedJob(job);
      const returnedRequestId = requestIdFor(job);
      if (returnedRequestId) setRequestId(returnedRequestId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Concept kon niet worden opgeslagen.");
    }
  }

  async function submit() {
    setError("");
    if (!basicInReady) {
      setError("Extern verzenden is uitgeschakeld totdat de verbindingstest Basic IN-rechten bevestigt.");
      return;
    }
    const product = registrationProduct();
    const parsed = registrationProductSchema.safeParse(product);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      setError(`${issue?.path.join(".") || "Gegevens"}: ${issue?.message || "Controleer de invoer."}`);
      return;
    }
    if (unresolvedJob) {
      setError("Er staat al een onbevestigde opdracht open. Controleer die eerst voordat u een nieuwe verzending probeert.");
      return;
    }
    if (!window.confirm("U staat op het punt een productregistratie naar GS1 Nederland te versturen. Controleer alle gegevens en bevestig expliciet om te verzenden.")) return;
    setSubmissionAttempted(true);
    try {
      const job = await onSubmit(requestId, parsed.data as Record<string, unknown>);
      setSavedJob(job);
    } catch (cause) {
      // A failed HTTP response can still mean the provider accepted the request.
      // Keep this ID locked until the operator deliberately starts a new draft.
      setError(cause instanceof Error ? cause.message : "De status van de verzending is onzeker. Controleer de opdrachten.");
    }
  }

  function startNewDraft() {
    if (!window.confirm("Nieuw registratieconcept starten? Niet-opgeslagen wijzigingen in dit formulier gaan verloren.")) return;
    setRequestId(crypto.randomUUID());
    setGtin("1");
    setDraft(initialDraft);
    setSavedJob(null);
    setSubmissionAttempted(false);
    setError("");
  }

  return (
    <div className="space-y-5">
      {!basicInReady && <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Basic IN-rechten niet bevestigd</p><p className="mt-1 leading-6">U kunt een onvolledig registratieconcept lokaal opslaan. Extern verzenden blijft uitgeschakeld totdat de verbindingstest Basic IN expliciet bevestigt.</p></div></div>}
      {unresolvedJob && <div className="flex gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Er is een onbevestigde opdracht</p><p className="mt-1 leading-6">Controleer eerst de bestaande opdrachtstatus. Nieuwe registratieverzending is tijdelijk uitgeschakeld om dubbele aanvragen te voorkomen.</p></div></div>}
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">GS1 officiële Basic IN</p><p className="mt-1 leading-6">De waarde <code className="rounded bg-white/70 px-1">1</code> vraagt GS1 om de volgende GTIN uit de gelicentieerde reeks toe te kennen. Gebruik alleen een bestaande volledige GTIN als die al aan uw organisatie is toegewezen.</p></div></div>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-slate-900">Lokale registratieconcepten</p><p className="mt-1 text-xs text-slate-500">Concept-ID {requestId} · dezelfde ID wordt gebruikt om dit concept op te slaan en later te verzenden.</p></div>
          <Button type="button" variant="outline" size="sm" onClick={startNewDraft}><FilePlus2 className="mr-2 h-4 w-4" />Nieuw concept</Button>
        </div>
        {draftJobs.length > 0 && <div className="grid gap-2 sm:grid-cols-[1fr_auto]"><Select value={selectedDraftId} onValueChange={setSelectedDraftId}><SelectTrigger><SelectValue placeholder="Kies een opgeslagen concept om te bewerken" /></SelectTrigger><SelectContent>{draftJobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.id} · {String(productFor(job).gtin ?? "GTIN niet ingevuld")}</SelectItem>)}</SelectContent></Select><Button type="button" variant="secondary" disabled={!selectedDraftId} onClick={() => { const job = draftJobs.find((item) => item.id === selectedDraftId); if (job) loadJob(job); }}>Concept laden</Button></div>}
        {currentJob && <p className="text-xs text-slate-600">Opdrachtstatus: <strong>{currentJob.status}</strong>{locked ? " · dit concept is niet meer bewerkbaar; start alleen bewust een nieuw concept." : " · lokaal opgeslagen en nog niet verzonden."}</p>}
      </section>

      <fieldset disabled={locked} className="space-y-5 disabled:opacity-80">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>GTIN / officiële auto-toewijzing *</Label><Input value={gtin} onChange={(event) => setGtin(event.target.value)} placeholder="1 voor volgende gelicentieerde GTIN" /><p className="text-xs text-slate-500">Gebruik 1 voor auto-toewijzing of voer een bestaande GTIN met controlecijfer in.</p></div>
          <div className="space-y-1.5"><Label>Contractnummer *</Label>{contracts.length ? <Select value={draft.contractNumber || undefined} onValueChange={(v) => field("contractNumber", v)}><SelectTrigger><SelectValue placeholder="Selecteer uw GS1-contract" /></SelectTrigger><SelectContent>{contracts.map((contract, i) => <SelectItem key={`${contract.contractNumber}-${i}`} value={contract.contractNumber}>{contract.contractNumber}{contract.productName ? ` · ${contract.productName}` : ""}</SelectItem>)}</SelectContent></Select> : <Input value={draft.contractNumber} onChange={(event) => field("contractNumber", event.target.value)} placeholder="Contractnummer uit MyGS1" />}<p className="text-xs text-slate-500">Geen contractnummer afleiden uit de licentiereeks.</p></div>
          <div className="space-y-1.5"><Label>Status *</Label><Select value={draft.status} onValueChange={(v) => field("status", v as RegistrationDraft["status"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Concept">Concept</SelectItem><SelectItem value="Actief">Actief</SelectItem><SelectItem value="Inactief">Inactief</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Consumenteneenheid *</Label><Select value={draft.consumerUnit} onValueChange={(v) => field("consumerUnit", v as RegistrationDraft["consumerUnit"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Ja">Ja</SelectItem><SelectItem value="Nee">Nee</SelectItem></SelectContent></Select></div>
          <Field label="GPC-code *" value={draft.gpc} onChange={(v) => field("gpc", v)} placeholder="Vul de door GS1 bevestigde GPC-code in" />
          <Field label="Verpakkingstype *" value={draft.packagingType} onChange={(v) => field("packagingType", v)} placeholder="Volgens uw GS1-productdata" />
          <Field label="Land van afzet *" value={draft.targetMarketCountry} onChange={(v) => field("targetMarketCountry", v)} />
          <Field label="Taal *" value={draft.language} onChange={(v) => field("language", v)} />
          <Field label="Merknaam *" value={draft.brandName} onChange={(v) => field("brandName", v)} maxLength={70} />
          <Field label="Submerk" value={draft.subBrandName} onChange={(v) => field("subBrandName", v)} maxLength={70} />
          <Field label="Netto-inhoud *" value={draft.netContent} onChange={(v) => field("netContent", v)} placeholder="Bijvoorbeeld 1" />
          <Field label="Maateenheid *" value={draft.measurementUnit} onChange={(v) => field("measurementUnit", v)} placeholder="Bijvoorbeeld Gram" />
          <Field label="Afbeeldings-URL" value={draft.imageUrl} onChange={(v) => field("imageUrl", v)} placeholder="https://" />
          <div className="space-y-1.5 md:col-span-2"><Label>Productomschrijving * <span className="font-normal text-slate-500">(max. 300 tekens)</span></Label><textarea className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" maxLength={300} value={draft.description} onChange={(event) => field("description", event.target.value)} /><p className="text-right text-xs text-slate-500">{draft.description.length}/300</p></div>
        </div>
      </fieldset>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={locked || savingDraft} onClick={() => void saveDraft()}><Save className="mr-2 h-4 w-4" />{savingDraft ? "Concept opslaan…" : "Concept lokaal opslaan"}</Button>
        <Button type="button" disabled={!basicInReady || unresolvedJob || locked || pending} onClick={() => void submit()}>{pending ? "Versturen…" : "Bevestigen en naar GS1 sturen"}<ArrowUpRight className="ml-2 h-4 w-4" /></Button>
      </div>
      <p className="text-xs leading-5 text-slate-500">Lokaal opslaan verstuurt niets naar GS1. Bij een onzekere verzendstatus wordt deze ID vergrendeld: controleer de opdrachtlijst en start alleen indien nodig expliciet een nieuw concept.</p>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, maxLength }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; maxLength?: number }) {
  return <div className="space-y-1.5"><Label>{label}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} maxLength={maxLength} /></div>;
}