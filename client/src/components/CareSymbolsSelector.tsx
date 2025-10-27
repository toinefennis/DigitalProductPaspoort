import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface CareSymbol {
  symbol: string;
  code: string;
  temperature?: number;
  allowed?: boolean;
  method?: string;
  description: string;
}

interface CareSymbolsSelectorProps {
  value: CareSymbol[];
  onChange: (symbols: CareSymbol[]) => void;
}

const WASH_SYMBOLS = [
  { code: "1", temperature: 30, description: "Was op 30°C" },
  { code: "2", temperature: 40, description: "Was op 40°C" },
  { code: "3", temperature: 60, description: "Was op 60°C" },
  { code: "4", temperature: 95, description: "Was op 95°C" },
  { code: "5", temperature: 30, description: "Was op 30°C, fijnwas" },
  { code: "6", temperature: 40, description: "Was op 40°C, fijnwas" },
  { code: "7", temperature: null, description: "Handwas" },
  { code: "8", temperature: null, description: "Niet wassen" },
];

const BLEACH_SYMBOLS = [
  { code: "1", allowed: true, description: "Bleken toegestaan (elk bleekmiddel)" },
  { code: "2", allowed: true, description: "Alleen zuurstofbleekmiddel" },
  { code: "3", allowed: false, description: "Niet bleken" },
];

const DRY_SYMBOLS = [
  { code: "1", method: "hang", description: "Hangend drogen" },
  { code: "2", method: "flat", description: "Liggend drogen" },
  { code: "3", method: "drip", description: "Druipend drogen" },
  { code: "4", method: "shade", description: "Drogen in de schaduw" },
  { code: "5", method: "tumble_low", description: "Droogtrommel lage temperatuur" },
  { code: "6", method: "tumble_normal", description: "Droogtrommel normale temperatuur" },
  { code: "7", method: "tumble_no_heat", description: "Droogtrommel zonder warmte" },
  { code: "8", method: "no_tumble", description: "Niet in droogtrommel" },
];

const IRON_SYMBOLS = [
  { code: "1", temperature: 110, description: "Strijken max 110°C (laag)" },
  { code: "2", temperature: 150, description: "Strijken max 150°C (gemiddeld)" },
  { code: "3", temperature: 200, description: "Strijken max 200°C (hoog)" },
  { code: "4", temperature: null, description: "Niet strijken" },
  { code: "5", temperature: 110, description: "Strijken max 110°C, geen stoom" },
];

const PROFESSIONAL_SYMBOLS = [
  { code: "P", method: "perchloroethylene", description: "Professioneel reinigen met perchloroethyleen" },
  { code: "F", method: "petroleum", description: "Professioneel reinigen met petroleum" },
  { code: "W", method: "wet", description: "Nat professioneel reinigen" },
  { code: "P_BAR", method: "perchloroethylene_gentle", description: "Professioneel reinigen met perchloroethyleen, mild" },
  { code: "F_BAR", method: "petroleum_gentle", description: "Professioneel reinigen met petroleum, mild" },
  { code: "W_BAR", method: "wet_gentle", description: "Nat professioneel reinigen, mild" },
  { code: "NO", method: "none", description: "Niet professioneel reinigen" },
];

export function CareSymbolsSelector({ value, onChange }: CareSymbolsSelectorProps) {
  const [selectedWash, setSelectedWash] = useState<string>("");
  const [selectedBleach, setSelectedBleach] = useState<string>("");
  const [selectedDry, setSelectedDry] = useState<string>("");
  const [selectedIron, setSelectedIron] = useState<string>("");
  const [selectedProfessional, setSelectedProfessional] = useState<string>("");

  const addSymbol = (type: string, code: string) => {
    let newSymbol: CareSymbol | null = null;

    switch (type) {
      case "wash": {
        const wash = WASH_SYMBOLS.find(s => s.code === code);
        if (wash) {
          newSymbol = {
            symbol: "wash",
            code: wash.code,
            temperature: wash.temperature || undefined,
            description: wash.description,
          };
        }
        setSelectedWash("");
        break;
      }
      case "bleach": {
        const bleach = BLEACH_SYMBOLS.find(s => s.code === code);
        if (bleach) {
          newSymbol = {
            symbol: "bleach",
            code: bleach.code,
            allowed: bleach.allowed,
            description: bleach.description,
          };
        }
        setSelectedBleach("");
        break;
      }
      case "dry": {
        const dry = DRY_SYMBOLS.find(s => s.code === code);
        if (dry) {
          newSymbol = {
            symbol: "dry",
            code: dry.code,
            method: dry.method || undefined,
            description: dry.description,
          };
        }
        setSelectedDry("");
        break;
      }
      case "iron": {
        const iron = IRON_SYMBOLS.find(s => s.code === code);
        if (iron) {
          newSymbol = {
            symbol: "iron",
            code: iron.code,
            temperature: iron.temperature || undefined,
            description: iron.description,
          };
        }
        setSelectedIron("");
        break;
      }
      case "professional": {
        const prof = PROFESSIONAL_SYMBOLS.find(s => s.code === code);
        if (prof) {
          newSymbol = {
            symbol: "professional",
            code: prof.code,
            method: prof.method || undefined,
            description: prof.description,
          };
        }
        setSelectedProfessional("");
        break;
      }
    }

    if (newSymbol) {
      const existingIndex = value.findIndex(s => s.symbol === newSymbol!.symbol);
      if (existingIndex >= 0) {
        const updated = [...value];
        updated[existingIndex] = newSymbol;
        onChange(updated);
      } else {
        onChange([...value, newSymbol]);
      }
    }
  };

  const removeSymbol = (index: number) => {
    const updated = value.filter((_, i) => i !== index);
    onChange(updated);
  };

  const getSymbolEmoji = (symbol: CareSymbol): string => {
    switch (symbol.symbol) {
      case "wash": return "🫧";
      case "bleach": return symbol.allowed ? "⚪" : "🚫";
      case "dry": return symbol.method?.includes("tumble") ? "🌀" : "👕";
      case "iron": return "🔥";
      case "professional": return "🏪";
      default: return "📋";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verzorgingssymbolen (ISO 3758)</CardTitle>
        <CardDescription>
          Selecteer de officiële verzorgingssymbolen voor dit product
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Selected Symbols Display */}
        {value.length > 0 && (
          <div className="space-y-2">
            <Label>Geselecteerde symbolen:</Label>
            <div className="flex flex-wrap gap-2">
              {value.map((symbol, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-muted px-3 py-2 rounded-md text-sm"
                  data-testid={`care-symbol-${symbol.symbol}`}
                >
                  <span className="text-lg">{getSymbolEmoji(symbol)}</span>
                  <span className="flex-1">{symbol.description}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSymbol(index)}
                    className="h-6 w-6 p-0"
                    data-testid={`remove-symbol-${index}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wash Symbols */}
        <div className="space-y-2">
          <Label htmlFor="wash-select">🫧 Wassen</Label>
          <div className="flex gap-2">
            <Select value={selectedWash} onValueChange={setSelectedWash}>
              <SelectTrigger id="wash-select" data-testid="select-wash">
                <SelectValue placeholder="Kies wassymbool..." />
              </SelectTrigger>
              <SelectContent>
                {WASH_SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol.code} value={symbol.code}>
                    {symbol.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => selectedWash && addSymbol("wash", selectedWash)}
              disabled={!selectedWash}
              data-testid="add-wash-symbol"
            >
              Toevoegen
            </Button>
          </div>
        </div>

        {/* Bleach Symbols */}
        <div className="space-y-2">
          <Label htmlFor="bleach-select">⚪ Bleken</Label>
          <div className="flex gap-2">
            <Select value={selectedBleach} onValueChange={setSelectedBleach}>
              <SelectTrigger id="bleach-select" data-testid="select-bleach">
                <SelectValue placeholder="Kies bleeksymbool..." />
              </SelectTrigger>
              <SelectContent>
                {BLEACH_SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol.code} value={symbol.code}>
                    {symbol.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => selectedBleach && addSymbol("bleach", selectedBleach)}
              disabled={!selectedBleach}
              data-testid="add-bleach-symbol"
            >
              Toevoegen
            </Button>
          </div>
        </div>

        {/* Dry Symbols */}
        <div className="space-y-2">
          <Label htmlFor="dry-select">👕 Drogen</Label>
          <div className="flex gap-2">
            <Select value={selectedDry} onValueChange={setSelectedDry}>
              <SelectTrigger id="dry-select" data-testid="select-dry">
                <SelectValue placeholder="Kies droogsymbool..." />
              </SelectTrigger>
              <SelectContent>
                {DRY_SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol.code} value={symbol.code}>
                    {symbol.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => selectedDry && addSymbol("dry", selectedDry)}
              disabled={!selectedDry}
              data-testid="add-dry-symbol"
            >
              Toevoegen
            </Button>
          </div>
        </div>

        {/* Iron Symbols */}
        <div className="space-y-2">
          <Label htmlFor="iron-select">🔥 Strijken</Label>
          <div className="flex gap-2">
            <Select value={selectedIron} onValueChange={setSelectedIron}>
              <SelectTrigger id="iron-select" data-testid="select-iron">
                <SelectValue placeholder="Kies strijksymbool..." />
              </SelectTrigger>
              <SelectContent>
                {IRON_SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol.code} value={symbol.code}>
                    {symbol.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => selectedIron && addSymbol("iron", selectedIron)}
              disabled={!selectedIron}
              data-testid="add-iron-symbol"
            >
              Toevoegen
            </Button>
          </div>
        </div>

        {/* Professional Symbols */}
        <div className="space-y-2">
          <Label htmlFor="professional-select">🏪 Professioneel Reinigen</Label>
          <div className="flex gap-2">
            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger id="professional-select" data-testid="select-professional">
                <SelectValue placeholder="Kies professioneel reinigingssymbool..." />
              </SelectTrigger>
              <SelectContent>
                {PROFESSIONAL_SYMBOLS.map((symbol) => (
                  <SelectItem key={symbol.code} value={symbol.code}>
                    {symbol.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => selectedProfessional && addSymbol("professional", selectedProfessional)}
              disabled={!selectedProfessional}
              data-testid="add-professional-symbol"
            >
              Toevoegen
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
