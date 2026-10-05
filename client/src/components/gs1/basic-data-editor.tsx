import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function setAtPath(value: JsonValue, path: (string | number)[], nextValue: JsonValue): JsonValue {
  if (!path.length) return nextValue;
  const [head, ...tail] = path;
  const clone = copy(value);
  if (Array.isArray(clone) && typeof head === "number") clone[head] = setAtPath(clone[head], tail, nextValue);
  else if (clone && typeof clone === "object" && !Array.isArray(clone) && typeof head === "string") {
    clone[head] = setAtPath(clone[head], tail, nextValue);
  }
  return clone;
}

function removeAtPath(value: JsonValue, path: (string | number)[]): JsonValue {
  const clone = copy(value);
  if (!path.length) return clone;
  const [head, ...tail] = path;
  if (!tail.length) {
    if (Array.isArray(clone) && typeof head === "number") clone.splice(head, 1);
    else if (clone && typeof clone === "object" && !Array.isArray(clone) && typeof head === "string") delete clone[head];
    return clone;
  }
  if (Array.isArray(clone) && typeof head === "number") clone[head] = removeAtPath(clone[head], tail);
  else if (clone && typeof clone === "object" && !Array.isArray(clone) && typeof head === "string") {
    clone[head] = removeAtPath(clone[head], tail);
  }
  return clone;
}

function emptyFor(value: JsonValue | undefined): JsonValue {
  if (Array.isArray(value)) return {};
  if (typeof value === "number") return 0;
  if (typeof value === "boolean") return false;
  if (value === null) return null;
  return "";
}

function NodeEditor({
  name,
  value,
  path,
  onChange,
  onRemove,
  depth = 0,
}: {
  name: string;
  value: JsonValue;
  path: (string | number)[];
  onChange: (path: (string | number)[], value: JsonValue) => void;
  onRemove?: () => void;
  depth?: number;
}) {
  const [open, setOpen] = useState(depth < 1);
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object" && !isArray;
  const scalarType = value === null ? "null" : typeof value;
  const children = isArray ? value.map((entry, index) => [String(index + 1), entry, index] as const) :
    isObject ? Object.entries(value).map(([key, entry]) => [key, entry, key] as const) : [];

  return (
    <div className={depth === 0 ? "rounded-xl border border-slate-200 bg-white" : "rounded-lg border border-slate-200/80 bg-slate-50/70"}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        {(isArray || isObject) && (
          <button type="button" onClick={() => setOpen(!open)} className="text-slate-500" aria-label={open ? "Inklappen" : "Uitklappen"}>
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
        <Label className="min-w-0 flex-1 break-words text-sm font-medium text-slate-800">{name}</Label>
        {onRemove && <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-red-700" onClick={onRemove} aria-label={`${name} verwijderen`}><Trash2 className="h-3.5 w-3.5" /></Button>}
        {!isArray && !isObject && typeof value === "boolean" && (
          <Switch checked={value} onCheckedChange={(checked) => onChange(path, checked)} aria-label={name} />
        )}
        {!isArray && !isObject && typeof value !== "boolean" && (
          <Input
            aria-label={name}
            className="h-9 max-w-xl bg-white"
            type={typeof value === "number" ? "number" : "text"}
            value={value === null ? "" : String(value)}
            placeholder={value === null ? "null" : ""}
            onChange={(event) => {
              const raw = event.target.value;
              onChange(path, typeof value === "number" ? (raw === "" ? 0 : Number(raw)) : raw);
            }}
          />
        )}
        {!isArray && !isObject && (
          <select
            aria-label={`${name} gegevenstype`}
            className="h-9 max-w-28 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-600"
            value={scalarType}
            onChange={(event) => {
              const type = event.target.value;
              const next: JsonValue = type === "object" ? {} : type === "array" ? [] : type === "number" ? 0 : type === "boolean" ? false : type === "null" ? null : "";
              onChange(path, next);
            }}
          >
            <option value="string">Tekst</option>
            <option value="number">Getal</option>
            <option value="boolean">Ja/nee</option>
            <option value="object">Object</option>
            <option value="array">Lijst</option>
            <option value="null">Null</option>
          </select>
        )}
        {(isArray || isObject) && <span className="text-xs text-slate-500">{isArray ? `${value.length} items` : `${Object.keys(value).length} velden`}</span>}
      </div>
      {open && (isArray || isObject) && (
        <div className="space-y-2 border-t border-slate-200/80 px-3 py-3">
          {children.map(([childName, childValue, childKey]) => (
            <NodeEditor
              key={`${String(childKey)}-${childName}`}
              name={childName}
              value={childValue}
              path={[...path, childKey]}
              onChange={onChange}
              onRemove={() => onChange(path, removeAtPath(value, [childKey]))}
              depth={depth + 1}
            />
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {isArray && (
              <Button type="button" variant="outline" size="sm" onClick={() => onChange(path, [...value, emptyFor(value[0])])}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Rij toevoegen
              </Button>
            )}
            {isObject && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const key = window.prompt("Naam van het nieuwe veld");
                  if (key?.trim() && !(key.trim() in value)) onChange(path, { ...value, [key.trim()]: "" });
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Veld toevoegen
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BasicDataEditor({ value, onChange }: { value: Record<string, unknown>; onChange: (value: Record<string, unknown>) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-600">De volledige ontvangen GS1 Basic OUT-snapshot blijft behouden. Wijzigingen hieronder zijn uitsluitend een lokale conceptversie; ze worden niet naar GS1 verstuurd.</p>
      <NodeEditor
        name="Basic OUT"
        value={value as JsonValue}
        path={[]}
        onChange={(path, next) => onChange(setAtPath(value as JsonValue, path, next) as Record<string, unknown>)}
      />
    </div>
  );
}