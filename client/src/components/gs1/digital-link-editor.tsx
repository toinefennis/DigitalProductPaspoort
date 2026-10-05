import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export type DigitalLinkDraft = {
  accountNumber: string;
  identificationKeyType: "Gtin";
  identificationKey: string;
  isEnabled: boolean;
  itemDescription: string;
  resolverSettings: { useGS1Resolver: boolean; resolverDomainName?: string; [key: string]: unknown };
  links?: Array<{
    linkType: string;
    language: string;
    linkTitle: string;
    targetUrl: string;
    defaultLinkType: boolean;
    public: boolean;
    mediaType: string;
    [key: string]: unknown;
  }>;
  applicationIdentifiers?: Array<{ identifier: string; templateVariable: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

function TextField({ label, value, onChange, placeholder, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}{required ? " *" : ""}</Label><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></div>;
}

export function DigitalLinkEditor({
  value,
  onChange,
  linkTypes,
  mediaTypes,
  gtin,
  dppBaseUrl,
}: {
  value: DigitalLinkDraft;
  onChange: (value: DigitalLinkDraft) => void;
  linkTypes: Array<{ code: string; title: string; description?: string }>;
  mediaTypes: string[];
  gtin: string;
  dppBaseUrl?: string;
}) {
  const links = value.links ?? [];
  const identifiers = value.applicationIdentifiers ?? [];
  const draftUrl = (() => {
    const base = (dppBaseUrl || "https://dpp.gwcirculair.nl/dpp/GTIN14").replace(/\/+$/, "");
    if (base.includes("GTIN14")) return base;
    return `${base}/${gtin.padStart(14, "0")}`;
  })();

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
        <strong>Externe identificatie is read-only.</strong> Dit formulier wijzigt alleen de lokale conceptversie. Het accountnummer is uw GS1 MyGS1-accountnummer, niet uw contractnummer. Vraag het na als u het niet weet.
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Accountnummer (MyGS1)" value={value.accountNumber ?? ""} required onChange={(accountNumber) => onChange({ ...value, accountNumber })} placeholder="Niet het contractnummer" />
        <div className="space-y-1.5"><Label>Type identificatiesleutel</Label><Input value="Gtin" readOnly /></div>
        <TextField label="Identificatiesleutel" value={value.identificationKey ?? gtin} required onChange={(identificationKey) => onChange({ ...value, identificationKey })} />
        <TextField label="Artikelomschrijving" value={value.itemDescription ?? ""} required onChange={(itemDescription) => onChange({ ...value, itemDescription })} />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
        <div><Label>Digital Link ingeschakeld</Label><p className="mt-1 text-xs text-slate-500">Lokale voorkeur, nog niet bij GS1 gepubliceerd.</p></div>
        <Switch checked={!!value.isEnabled} onCheckedChange={(isEnabled) => onChange({ ...value, isEnabled })} />
      </div>
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div><h3 className="font-semibold text-slate-900">Resolverinstellingen</h3><p className="text-sm text-slate-500">Gebruik de GS1-resolver of specificeer een domein.</p></div>
        </div>
        <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2">
          <div className="flex items-center justify-between gap-3"><Label>GS1-resolver gebruiken</Label><Switch checked={!!value.resolverSettings?.useGS1Resolver} onCheckedChange={(useGS1Resolver) => onChange({ ...value, resolverSettings: { ...value.resolverSettings, useGS1Resolver } })} /></div>
          <TextField label="Resolverdomein (optioneel)" value={value.resolverSettings?.resolverDomainName ?? ""} onChange={(resolverDomainName) => onChange({ ...value, resolverSettings: { ...value.resolverSettings, resolverDomainName } })} placeholder="resolver.example.nl" />
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="font-semibold text-slate-900">Links</h3><p className="text-sm text-slate-500">Kies uitsluitend een linktype en mediatype uit de GS1-configuratie.</p></div>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, links: [...links, { linkType: "", language: "nl", linkTitle: "", targetUrl: "", defaultLinkType: false, public: false, mediaType: "" }] })}><Plus className="mr-1.5 h-4 w-4" /> Link toevoegen</Button>
        </div>
        {links.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">Nog geen links toegevoegd. Er wordt geen standaard linktype ingevuld.</div>}
        {links.map((link, index) => (
          <div key={index} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-700">Link {index + 1}</p><Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-700" onClick={() => onChange({ ...value, links: links.filter((_, itemIndex) => itemIndex !== index) })} aria-label={`Link ${index + 1} verwijderen`}><Trash2 className="h-4 w-4" /></Button></div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Linktype *</Label><Select value={link.linkType || undefined} onValueChange={(linkType) => onChange({ ...value, links: links.map((item, i) => i === index ? { ...item, linkType } : item) })}><SelectTrigger><SelectValue placeholder={linkTypes.length ? "Kies GS1-linktype" : "Linktypes laden"} /></SelectTrigger><SelectContent>{linkTypes.map((type) => <SelectItem key={type.code} value={type.code}>{type.title} ({type.code})</SelectItem>)}</SelectContent></Select>{link.linkType && !linkTypes.some((type) => type.code === link.linkType) && <p className="text-xs text-amber-700">Opgeslagen code staat niet in de actuele woordenlijst.</p>}</div>
              <TextField label="Taalcode *" value={link.language} onChange={(language) => onChange({ ...value, links: links.map((item, i) => i === index ? { ...item, language } : item) })} placeholder="nl" />
              <TextField label="Linktitel *" value={link.linkTitle} onChange={(linkTitle) => onChange({ ...value, links: links.map((item, i) => i === index ? { ...item, linkTitle } : item) })} />
              <TextField label="Doel-URL *" value={link.targetUrl} onChange={(targetUrl) => onChange({ ...value, links: links.map((item, i) => i === index ? { ...item, targetUrl } : item) })} placeholder="https://" />
              <div className="space-y-1.5"><Label>Mediatype *</Label><Select value={link.mediaType || undefined} onValueChange={(mediaType) => onChange({ ...value, links: links.map((item, i) => i === index ? { ...item, mediaType } : item) })}><SelectTrigger><SelectValue placeholder={mediaTypes.length ? "Kies GS1-mediatype" : "Media types laden"} /></SelectTrigger><SelectContent>{mediaTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div className="flex flex-wrap gap-6 border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2"><Switch checked={!!link.defaultLinkType} onCheckedChange={(defaultLinkType) => onChange({ ...value, links: links.map((item, i) => i === index ? { ...item, defaultLinkType } : item) })} /><Label>Standaardlinktype</Label></div>
              <div className="flex items-center gap-2"><Switch checked={!!link.public} onCheckedChange={(isPublic) => onChange({ ...value, links: links.map((item, i) => i === index ? { ...item, public: isPublic } : item) })} /><Label>Openbaar</Label></div>
            </div>
          </div>
        ))}
      </section>
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-semibold text-slate-900">Application identifiers</h3><p className="text-sm text-slate-500">Voeg alleen identifiers toe die voor dit product zijn vastgesteld.</p></div><Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, applicationIdentifiers: [...identifiers, { identifier: "", templateVariable: "" }] })}><Plus className="mr-1.5 h-4 w-4" /> Identifier toevoegen</Button></div>
        {identifiers.map((identifier, index) => <div key={index} className="grid items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_1fr_auto]"><TextField label="Identifier *" value={identifier.identifier} onChange={(next) => onChange({ ...value, applicationIdentifiers: identifiers.map((item, i) => i === index ? { ...item, identifier: next } : item) })} /><TextField label="Template variable *" value={identifier.templateVariable} onChange={(next) => onChange({ ...value, applicationIdentifiers: identifiers.map((item, i) => i === index ? { ...item, templateVariable: next } : item) })} /><Button type="button" variant="ghost" size="icon" onClick={() => onChange({ ...value, applicationIdentifiers: identifiers.filter((_, i) => i !== index) })} aria-label={`Identifier ${index + 1} verwijderen`}><Trash2 className="h-4 w-4" /></Button></div>)}
      </section>
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-800">DPP-doel-URL</p><p className="mt-1 break-all font-mono text-xs text-slate-600">{draftUrl}</p><p className="mt-1 text-xs text-slate-500">Dit is een voorgestelde lokale waarde; controleer de GTIN en URL.</p></div><Button type="button" variant="outline" size="sm" onClick={() => {
          const first = links[0];
          if (!first) onChange({ ...value, links: [{ linkType: "", language: "nl", linkTitle: "Productpaspoort", targetUrl: draftUrl, defaultLinkType: false, public: false, mediaType: "" }] });
          else onChange({ ...value, links: links.map((link, index) => index === 0 ? { ...link, targetUrl: draftUrl, linkTitle: link.linkTitle || "Productpaspoort" } : link) });
        }}>URL overnemen in link</Button></div>
      </div>
    </div>
  );
}