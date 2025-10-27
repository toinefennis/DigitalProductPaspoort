# DPP Textiel Variabelen - Implementatie Status & Planning

## 📊 Huidige Status Analyse

### ✅ Reeds Geïmplementeerd

#### Products Tabel (Basis Producten)
| Variabele | Database Veld | Status |
|-----------|---------------|--------|
| GTIN | `gtin` | ✅ Volledig |
| Productnaam | `name` | ✅ Volledig |
| Merk | `brand` | ✅ Volledig |
| Producttype | `type` | ✅ Volledig |
| Beschrijving | `description` | ✅ Volledig |
| Hoofdmateriaal | `material` | ✅ Basis |
| Foto's | `photoUrl`, `additionalPhotos` | ✅ Volledig |
| Status | `status` | ✅ Volledig |
| Herkomst/Oorsprong | `origin` | ✅ Volledig |
| Wasinstructies | `washingInstructions` | ✅ Basis (text) |
| CO2 Footprint | `co2Footprint` | ✅ Basis (text) |
| ESG Score | `esgScore` | ✅ Volledig |
| Collectie | `collection` | ✅ Volledig |
| Verhaal | `story` | ✅ Volledig |
| GS1 Geregistreerd | `gs1Registered` | ✅ Volledig |
| **Materiaal Properties** (JSONB) | `materialProperties` | ✅ Gestructureerd |
| - Samenstelling | `composition` | ✅ |
| - Gewicht | `weight` | ✅ |
| - Duurzaamheid | `durability` | ✅ |
| - Recyclebaarheid | `recyclability` | ✅ |
| - Certificeringen | `certifications` | ✅ |

#### GTIN Registry Tabel (Uitgebreid DPP)
| Variabele Categorie | Database Veld | Status |
|---------------------|---------------|--------|
| **Basis Identificatie** | | |
| GTIN | `gtin` | ✅ Volledig |
| Productnaam | `productName` | ✅ Volledig |
| Merknaam | `brandName` | ✅ Volledig |
| Modelnummer | `modelNumber` | ✅ Volledig |
| Productcategorie | `productCategory` | ✅ Volledig |
| Beschrijving | `productDescription` | ✅ Volledig |
| Batch Nummer | `batchNumber` | ✅ Volledig |
| Serie Nummer | `serialNumber` | ✅ Volledig |
| Uniek Product ID | `uniqueProductId` | ✅ Volledig (URI) |
| | | |
| **Productie Info** | | |
| Herkomst Land | `countryOfOrigin` | ✅ Volledig (ISO) |
| Productie Datum | `productionDate` | ✅ Volledig |
| Productie Land | `productionCountry` | ✅ Volledig (ISO) |
| Productie Faciliteiten | `productionFacilities` | ✅ JSONB |
| Productie Processen | `productionProcesses` | ✅ Text |
| Economic Operator ID | `economicOperatorId` | ✅ GLN/URI |
| Production Facility ID | `productionFacilityId` | ✅ GLN/URI |
| Registratie ID | `registrationId` | ✅ DPP System |
| Leverancier Info | `supplierInformation` | ✅ JSONB |
| | | |
| **Fysieke Properties** | | |
| Product Gewicht | `productWeight` | ✅ Integer (gram) |
| Afmetingen | `productDimensions` | ✅ JSONB |
| Maat | `productSize` | ✅ Volledig |
| Kleur | `productColor` | ✅ Volledig |
| | | |
| **Materiaal Samenstelling** | | |
| Vezel Samenstelling | `fiberComposition` | ✅ JSONB Array |
| Gerecycled Content | `recycledContent` | ✅ JSONB |
| Materiaal Oorsprong | `materialOrigins` | ✅ JSONB |
| Materiaal Certificeringen | `materialCertifications` | ✅ JSONB Array |
| | | |
| **Duurzaamheid** | | |
| Duurzaamheidsdata | `sustainabilityData` | ✅ JSONB |
| Chemische Compliance | `chemicalCompliance` | ✅ JSONB |
| Sociale Compliance | `socialCompliance` | ✅ JSONB |
| Circulariteitsdata | `circularityData` | ✅ JSONB |
| | | |
| **Verzorging** | | |
| Verzorgingsinstructies | `careInstructions` | ✅ Text |
| Wassymbolen | `careSymbols` | ✅ JSONB |
| End-of-Life Instructies | `endOfLifeInstructions` | ✅ Text |
| | | |
| **Markt & Regelgeving** | | |
| Beoogde Markten | `intendedMarkets` | ✅ JSONB Array |
| Regelgeving Compliance | `regulatoryCompliance` | ✅ JSONB |

#### Events Tabel (Levenscyclus Tracking)
| Variabele | Database Veld | Status |
|-----------|---------------|--------|
| Event Types | `eventType` | ✅ Volledig |
| - Creatie, Reparatie, Uitleen, etc. | Meerdere types | ✅ |
| Beschrijving | `description` | ✅ |
| Foto | `photoUrl` | ✅ |
| Uitlener Info | `borrowerName`, `borrowerEmail`, etc. | ✅ |
| Verwachte Retour | `expectedReturn` | ✅ |

#### GS1 Synchronisatie
| Variabele | Database Veld | Status |
|-----------|---------------|--------|
| GS1 Partners | `gs1_partners` tabel | ✅ Volledig |
| GLN | `gln` | ✅ |
| Sync Events | `gs1_sync_events` | ✅ |
| Product Mappings | `gs1_product_mappings` | ✅ |

---

### ⚠️ Gedeeltelijk Geïmplementeerd

| Variabele | Huidig Veld | Probleem | Aanbeveling |
|-----------|-------------|----------|-------------|
| Wasinstructies | `washingInstructions` (text) | Geen gestructureerde symbolen | Uitbreiden naar JSONB met ISO 3758 codes |
| CO2 Footprint | `co2Footprint` (text) | Geen gedetailleerde breakdown | Uitbreiden naar JSONB met fases |
| Materiaal Samenstelling | `material` (text) in products | Simpel tekstveld | Gebruik `materialProperties.composition` of link naar gtinRegistry |

---

### ❌ Nog Niet Geïmplementeerd (Verplicht volgens EU ESPR)

#### Hoge Prioriteit - EU Verplicht
| Variabele | DPP Vereiste | Deadline | Complexiteit |
|-----------|--------------|----------|--------------|
| **Water Footprint** | Verplicht 2026 | 2026 | Medium |
| **Energie Verbruik** | Verplicht 2026 | 2026 | Medium |
| **Microplastic Shedding** | Verplicht 2027 | 2027 | Hoog |
| **Repairability Index (numeriek)** | Verplicht 2025 | Nu | Laag |
| **Durability Score (numeriek)** | Verplicht 2025 | Nu | Laag |
| **Material Circularity Indicator** | Aanbevolen 2025 | 2025 | Medium |
| **Supply Chain Traceability** | Verplicht 2026 | 2026 | Hoog |
| **Chemical Substances List** | REACH verplicht | Nu | Medium |

#### Medium Prioriteit - Praktisch Belangrijk
| Variabele | Gebruik | Complexiteit |
|-----------|---------|--------------|
| Internationale Maattabel | E-commerce essentieel | Laag |
| Kleurcode (Pantone/HEX) | Design/productie | Laag |
| Stofgewicht (GSM) | Kwaliteit indicator | Laag |
| Kleurvastheid Rating | Kwaliteitscontrole | Medium |
| Slijtage Weerstand | Duurzaamheid | Medium |
| Garantie Informatie | Consument rechten | Laag |
| Reparatie Service Info | Circulaire economie | Medium |
| Take-back Programma Details | Circulaire economie | Medium |
| Digital Product Passport URL | EU vereiste | Laag |
| QR Code Generatie | Toegankelijkheid | Laag |

#### Lage Prioriteit - Nice to Have
| Variabele | Gebruik | Complexiteit |
|-----------|---------|--------------|
| 360° Product Views | E-commerce | Medium |
| Video's (productie/gebruik) | Marketing | Laag |
| Blockchain Hash | Traceerbaarheid | Hoog |
| UV Bescherming Rating | Technische kledij | Laag |
| Ademend Vermogen | Sport kledij | Medium |
| Waterbestendigheid | Outdoor kledij | Laag |
| Customer Reviews | Community | Medium |
| Influencer Partnerships | Marketing | Laag |

---

## 🎯 Gefaseerde Implementatie Planning

### **FASE 1: EU Compliance Basis (3-4 weken)** 
**Deadline: Q1 2025**  
**Doel**: Voldoen aan minimale EU ESPR vereisten voor 2025

#### Database Wijzigingen
```sql
-- Uitbreiden products tabel
ALTER TABLE products ADD COLUMN:
  -- Numerieke scores (verplicht)
  repairability_index INTEGER CHECK (repairability_index BETWEEN 1 AND 10),
  durability_score INTEGER CHECK (durability_score BETWEEN 1 AND 10),
  
  -- Gestructureerde wasinstructies
  care_symbols JSONB, -- ISO 3758 symbolen
  
  -- DPP toegang
  dpp_url TEXT,
  qr_code_data TEXT,
  
  -- Uitgebreide CO2
  carbon_footprint_detailed JSONB; -- {total, material, production, transport, use, end_of_life}

-- Uitbreiden gtinRegistry
ALTER TABLE gtin_registry ADD COLUMN:
  -- Verplichte scores
  repairability_index INTEGER,
  durability_score INTEGER,
  material_circularity_indicator DECIMAL(3,2), -- 0.00 - 1.00
  
  -- Chemical compliance details
  restricted_substances_list JSONB,
  reach_compliant BOOLEAN DEFAULT false,
  reach_registration_numbers JSONB;
```

#### Frontend Wijzigingen
1. **Product Formulier Uitbreiden**
   - Repairability index slider (1-10)
   - Durability score slider (1-10)
   - Wassymbolen selector (visueel)
   - Chemical compliance checklist

2. **DPP QR Code Generatie**
   - Automatische QR code bij product aanmaak
   - URL naar public DPP pagina

3. **Public DPP Pagina**
   - SEO-vriendelijke product paspoort weergave
   - Alle verplichte velden zichtbaar
   - QR code download optie

#### Backend Wijzigingen
1. **API Endpoints**
   - `GET /api/dpp/:gtin` - Public DPP data
   - `POST /api/products/:id/qr` - QR code generatie
   - `POST /api/products/:id/validate-compliance` - EU compliance check

2. **Automatische Validatie**
   - Check op verplichte velden bij product save
   - Waarschuwing bij ontbrekende EU-data

#### Deliverables
- ✅ Repairability & Durability scores invoer
- ✅ Gestructureerde wassymbolen
- ✅ QR code generatie
- ✅ Public DPP pagina
- ✅ EU compliance validator

---

### **FASE 2: Milieu Impact Tracking (4-5 weken)**
**Deadline: Q2 2025**  
**Doel**: Uitgebreide duurzaamheids metrics

#### Database Wijzigingen
```sql
ALTER TABLE products ADD COLUMN:
  -- Water & Energie
  water_footprint_liters INTEGER,
  water_footprint_breakdown JSONB, -- {fiber, production, dyeing, washing_estimated}
  energy_consumption_kwh DECIMAL(10,2),
  renewable_energy_percentage INTEGER,
  
  -- Microplastics
  microplastic_shedding_estimated INTEGER, -- vezels per wasbeurt
  fiber_shedding_test_results JSONB;

ALTER TABLE gtin_registry ADD COLUMN:
  -- Gedetailleerde milieu data
  water_footprint_detailed JSONB,
  energy_footprint_detailed JSONB,
  microplastic_data JSONB,
  
  -- Carbon breakdown
  carbon_footprint_kg DECIMAL(10,2),
  carbon_breakdown JSONB, -- {material, production, transport, use_phase, end_of_life}
  
  -- Circularity
  recycled_content_percentage INTEGER,
  recyclability_percentage INTEGER,
  biodegradability_percentage INTEGER;
```

#### Frontend Wijzigingen
1. **Duurzaamheid Dashboard**
   - Visuele CO2 breakdown (pie chart)
   - Water footprint visualisatie
   - Impact vergelijking (vs. gemiddeld product)

2. **Product Detail Pagina**
   - Duurzaamheid scorecard
   - Milieu impact badges
   - Vergelijking met industry benchmarks

3. **Calculator Tools**
   - CO2 footprint calculator (input: materialen, transport, productie land)
   - Water footprint estimator
   - Microplastic shedding predictor

#### Backend Wijzigingen
1. **Berekening Logica**
   - CO2 calculator API
   - Water footprint formules per materiaal
   - Database met materiaal impact data

2. **API Endpoints**
   - `POST /api/calculate/carbon` - CO2 berekening
   - `POST /api/calculate/water` - Water footprint
   - `GET /api/benchmarks/:category` - Industry averages

#### Deliverables
- ✅ Water footprint tracking
- ✅ Energie verbruik logging
- ✅ CO2 breakdown visualisatie
- ✅ Microplastic shedding data
- ✅ Impact calculators
- ✅ Benchmark vergelijkingen

---

### **FASE 3: Supply Chain Traceability (5-6 weken)**
**Deadline: Q3 2025**  
**Doel**: Volledige supply chain transparantie

#### Database Wijzigingen
```sql
-- Nieuwe tabel: supply_chain_steps
CREATE TABLE supply_chain_steps (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  gtin_registry_id INTEGER REFERENCES gtin_registry(id),
  step_order INTEGER NOT NULL,
  step_type VARCHAR(50) NOT NULL, -- 'farming', 'spinning', 'weaving', 'dyeing', 'cutting', 'sewing', 'finishing'
  facility_name VARCHAR(255),
  facility_address TEXT,
  facility_gln VARCHAR(13),
  facility_country VARCHAR(2),
  facility_certifications JSONB,
  process_date DATE,
  process_description TEXT,
  input_materials JSONB,
  output_materials JSONB,
  carbon_footprint DECIMAL(10,2),
  water_usage INTEGER,
  energy_usage DECIMAL(10,2),
  workers_count INTEGER,
  working_conditions_score INTEGER,
  audit_date DATE,
  audit_report_url TEXT,
  photos JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nieuwe tabel: material_sources
CREATE TABLE material_sources (
  id SERIAL PRIMARY KEY,
  material_type VARCHAR(100) NOT NULL,
  origin_country VARCHAR(2),
  origin_region VARCHAR(255),
  farm_name VARCHAR(255),
  certification_type VARCHAR(100), -- 'GOTS', 'OCS', 'BCI', etc.
  certification_number VARCHAR(255),
  harvest_date DATE,
  organic BOOLEAN DEFAULT false,
  fair_trade BOOLEAN DEFAULT false,
  traceability_code VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE gtin_registry ADD COLUMN:
  supply_chain_verified BOOLEAN DEFAULT false,
  supply_chain_transparency_score INTEGER, -- 1-5
  tier_1_suppliers JSONB, -- Direct suppliers
  tier_2_suppliers JSONB, -- Fabric mills
  tier_3_suppliers JSONB; -- Raw material
```

#### Frontend Wijzigingen
1. **Supply Chain Visualisatie**
   - Interactieve kaart met productie locaties
   - Timeline van productie stappen
   - Faciliteit detail modals

2. **Supply Chain Manager**
   - Wizard voor stapsgewijs invoeren supply chain
   - Bulk upload (CSV/Excel)
   - Certificaat upload per stap

3. **Traceability View**
   - QR scan → volledige supply chain
   - "Van boer tot kledingstuk" verhaal
   - Foto's per productie stap

#### Backend Wijzigingen
1. **Supply Chain API**
   - CRUD voor supply chain steps
   - Import/export functionaliteit
   - Verificatie logica

2. **Integraties**
   - GS1 GDSN sync voor supplier data
   - Certificering verificatie APIs
   - Maps API voor locatie visualisatie

#### Deliverables
- ✅ Supply chain steps database
- ✅ Material sources tracking
- ✅ Visuele supply chain kaart
- ✅ Stapsgewijze invoer wizard
- ✅ Certificaat management
- ✅ Transparency score berekening

---

### **FASE 4: Technische Specs & Kwaliteit (3-4 weken)**
**Deadline: Q4 2025**  
**Doel**: Gedetailleerde technische product informatie

#### Database Wijzigingen
```sql
ALTER TABLE products ADD COLUMN:
  -- Afmetingen & Maten
  size_chart JSONB, -- {EU: 38, US: 6, UK: 10, etc.}
  fit_type VARCHAR(50), -- 'slim', 'regular', 'oversized'
  measurements JSONB, -- {chest, waist, hip, length, sleeve, inseam}
  
  -- Kleur & Design
  color_code_hex VARCHAR(7),
  color_code_pantone VARCHAR(20),
  pattern_type VARCHAR(100),
  print_technique VARCHAR(100),
  
  -- Technische Kwaliteit
  fabric_weight_gsm INTEGER,
  thread_count INTEGER,
  pilling_rating INTEGER, -- 1-5
  color_fastness_rating INTEGER, -- 1-5
  abrasion_resistance_rating INTEGER, -- 1-5
  tear_strength VARCHAR(50),
  dimensional_stability VARCHAR(50), -- krimp %
  
  -- Functionele Properties
  uv_protection_upf INTEGER,
  breathability_rating INTEGER,
  water_resistance_mm INTEGER,
  wind_resistance BOOLEAN,
  stretch_recovery VARCHAR(50),
  
  -- Garantie
  warranty_period_months INTEGER,
  warranty_conditions TEXT,
  return_policy_days INTEGER;

ALTER TABLE gtin_registry ADD COLUMN:
  technical_specifications JSONB,
  quality_test_results JSONB,
  performance_ratings JSONB;
```

#### Frontend Wijzigingen
1. **Technische Specs Tab**
   - Gedetailleerde maattabel
   - Kleur swatches met codes
   - Kwaliteit ratings sterren
   - Functionele eigenschappen badges

2. **Maattabel Generator**
   - Visuele size guide builder
   - Internationale conversie automatisch
   - Pas-advies tool

3. **Test Resultaten Upload**
   - Lab test rapporten upload
   - Automatische data extractie (OCR)
   - Quality score berekening

#### Deliverables
- ✅ Maattabel systeem
- ✅ Kleur code management
- ✅ Kwaliteit ratings
- ✅ Functionele specs
- ✅ Garantie & retour info

---

### **FASE 5: Sociale Impact & Certificeringen (3 weken)**
**Deadline: Q1 2026**  
**Doel**: Sociale verantwoordelijkheid tracking

#### Database Wijzigingen
```sql
-- Nieuwe tabel: labor_conditions
CREATE TABLE labor_conditions (
  id SERIAL PRIMARY KEY,
  facility_gln VARCHAR(13),
  facility_name VARCHAR(255),
  audit_date DATE NOT NULL,
  audit_organization VARCHAR(255),
  audit_score INTEGER, -- 0-100
  
  -- Arbeidsomstandigheden
  living_wage_paid BOOLEAN,
  average_working_hours_week INTEGER,
  overtime_voluntary BOOLEAN,
  child_labor_policy TEXT,
  minimum_age_workers INTEGER,
  union_rights_respected BOOLEAN,
  gender_equality_score INTEGER,
  
  -- Veiligheid
  safety_incidents_last_year INTEGER,
  safety_training_provided BOOLEAN,
  worker_satisfaction_score INTEGER, -- 1-10
  
  -- Compliance
  sa8000_certified BOOLEAN,
  fair_trade_certified BOOLEAN,
  bsci_score VARCHAR(1), -- A, B, C, D, E
  
  audit_report_url TEXT,
  corrective_actions JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE gtin_registry ADD COLUMN:
  social_impact_score INTEGER, -- 0-100
  labor_conditions_verified BOOLEAN DEFAULT false,
  worker_welfare_data JSONB,
  community_impact_data JSONB;
```

#### Frontend Wijzigingen
1. **Sociale Impact Dashboard**
   - Arbeidsomstandigheden scorecard
   - Certificering badges
   - Audit geschiedenis timeline

2. **Certificaat Manager**
   - Upload en validatie certificaten
   - Expiry tracking en reminders
   - Public certificaat viewer

#### Deliverables
- ✅ Labor conditions tracking
- ✅ Certificering management
- ✅ Sociale impact scores
- ✅ Audit rapportage

---

### **FASE 6: Circulaire Economie Features (4 weken)**
**Deadline: Q2 2026**  
**Doel**: End-of-life en circulaire features

#### Database Wijzigingen
```sql
-- Nieuwe tabel: circular_services
CREATE TABLE circular_services (
  id SERIAL PRIMARY KEY,
  service_type VARCHAR(50) NOT NULL, -- 'repair', 'takeback', 'resale', 'recycling', 'upcycling'
  provider_name VARCHAR(255),
  provider_address TEXT,
  provider_email VARCHAR(255),
  provider_phone VARCHAR(50),
  service_description TEXT,
  geographic_coverage JSONB, -- landen/regio's
  cost_info TEXT,
  booking_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Nieuwe tabel: product_lifecycle_events
CREATE TABLE product_lifecycle_events (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  event_type VARCHAR(50), -- 'repair', 'refurbish', 'resold', 'recycled', 'upcycled'
  event_date DATE NOT NULL,
  service_provider VARCHAR(255),
  cost DECIMAL(10,2),
  description TEXT,
  impact_saved_co2 DECIMAL(10,2),
  impact_saved_water INTEGER,
  photos JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE products ADD COLUMN:
  -- Einde Levensduur
  recycling_instructions_detailed JSONB,
  takeback_program_available BOOLEAN DEFAULT false,
  takeback_partner_id INTEGER,
  repair_service_available BOOLEAN DEFAULT false,
  repair_partner_id INTEGER,
  resale_platform_url TEXT,
  upcycling_suggestions JSONB,
  compostable BOOLEAN DEFAULT false,
  
  -- Circulariteit
  times_repaired INTEGER DEFAULT 0,
  times_resold INTEGER DEFAULT 0,
  current_lifecycle_stage VARCHAR(50), -- 'new', 'first_use', 'repaired', 'refurbished', 'end_of_life'
  estimated_lifespan_years INTEGER,
  actual_lifespan_years INTEGER;
```

#### Frontend Wijzigingen
1. **Circulaire Services Marketplace**
   - Zoek reparatie diensten
   - Take-back programma info
   - Resale platform links

2. **Product Lifecycle Timeline**
   - Visuele timeline alle lifecycle events
   - CO2/water besparing totalen
   - "Second life" verhalen

3. **End-of-Life Wizard**
   - Scan product → recycling instructies
   - Dichtstbijzijnde inleverpunt
   - Upcycling ideeën generator

#### Deliverables
- ✅ Circulaire diensten database
- ✅ Lifecycle event tracking
- ✅ End-of-life wizard
- ✅ Repair/resale/recycle links
- ✅ Impact savings calculator

---

## 📅 Tijdlijn Overzicht

```
Q1 2025 (Jan-Mar)  │ FASE 1: EU Compliance Basis ████████████░░░░░░░░
Q2 2025 (Apr-Jun)  │ FASE 2: Milieu Impact        ░░░░░░░░████████████
Q3 2025 (Jul-Sep)  │ FASE 3: Supply Chain         ░░░░░░░░░░░█████████
Q4 2025 (Oct-Dec)  │ FASE 4: Technische Specs     ░░░░░░░░░░░░░░██████
Q1 2026 (Jan-Mar)  │ FASE 5: Sociale Impact       ░░░░░░░░░░░░░░░░░███
Q2 2026 (Apr-Jun)  │ FASE 6: Circulaire Economie  ░░░░░░░░░░░░░░░░░░░█████
```

---

## 💰 Geschatte Inspanning per Fase

| Fase | Development | Testing | Documentatie | Totaal |
|------|-------------|---------|--------------|--------|
| 1. EU Compliance | 60u | 20u | 10u | **90u** |
| 2. Milieu Impact | 80u | 25u | 15u | **120u** |
| 3. Supply Chain | 100u | 30u | 20u | **150u** |
| 4. Technische Specs | 60u | 20u | 10u | **90u** |
| 5. Sociale Impact | 50u | 15u | 10u | **75u** |
| 6. Circulaire Economie | 70u | 25u | 15u | **110u** |
| **TOTAAL** | **420u** | **135u** | **80u** | **635u** |

---

## 🎯 Quick Wins (Meteen Starten)

### Week 1-2: Basis Verbeteringen
1. **QR Code Generatie** (4u)
   - npm package: `qrcode`
   - Genereer bij product create/update
   - Opslaan in `products.qr_code_data`

2. **Repairability & Durability Sliders** (8u)
   - Add fields to products table
   - Simple slider input in product form
   - Display on product detail page

3. **Public DPP Pagina** (16u)
   - Route: `/dpp/:gtin`
   - SEO optimized
   - Print-vriendelijke layout
   - Share buttons

4. **Wassymbolen Selector** (12u)
   - Visuele symbool kiezer
   - ISO 3758 compliant
   - Opslaan als JSONB array

### Week 3-4: Compliance Validator
5. **EU Compliance Checker** (16u)
   - Validatie functie voor verplichte velden
   - Visuele compliance score
   - Waarschuwingen in product formulier
   - Admin dashboard met compliance overzicht

**Totaal Quick Wins: 56 uur (1.5 maand voor 1 developer)**

---

## 🔧 Technische Implementatie Tips

### Database Migratie Strategie
```bash
# Veilige aanpak per fase
1. Maak nieuwe kolommen met ALTER TABLE
2. Run: npm run db:push --force (bij problemen)
3. Data migratie scripts indien nodig
4. Test op development database eerst
5. Backup voor production deployment
```

### JSONB Veld Structuren

#### Voorbeeld: fiberComposition
```json
[
  {
    "fiber_code": "CO",
    "fiber_name": "Katoen",
    "percentage": 60,
    "origin": "organic",
    "origin_country": "IN",
    "certification": ["GOTS", "OCS"]
  },
  {
    "fiber_code": "PES",
    "fiber_name": "Polyester",
    "percentage": 40,
    "origin": "recycled",
    "origin_country": "CN",
    "certification": ["GRS"]
  }
]
```

#### Voorbeeld: carbonBreakdown
```json
{
  "total_kg": 8.5,
  "material_phase": 3.2,
  "production_phase": 2.1,
  "transport_phase": 1.5,
  "use_phase": 1.2,
  "end_of_life_phase": 0.5,
  "calculation_method": "PEF",
  "calculation_date": "2025-01-15"
}
```

#### Voorbeeld: careSymbols
```json
[
  {"symbol": "wash", "code": "1", "temperature": 30, "description": "Was op 30°C"},
  {"symbol": "bleach", "code": "2", "allowed": false, "description": "Niet bleken"},
  {"symbol": "dry", "code": "1", "method": "hang", "description": "Hangend drogen"},
  {"symbol": "iron", "code": "2", "temperature": 150, "description": "Strijken max 150°C"},
  {"symbol": "professional", "code": "P", "description": "Professioneel reinigen mogelijk"}
]
```

---

## 📚 Aanbevolen Libraries & Tools

### QR Code & Barcodes
- `qrcode` - QR code generatie
- `@zxing/library` - Al geïnstalleerd! Voor scanning

### Calculators
- Carbon footprint: Eigen database + formules
- Water footprint: [Water Footprint Network](https://waterfootprint.org/en/) data

### Visualisaties
- `recharts` - Al geïnstalleerd! Voor charts
- `react-leaflet` - Voor supply chain maps

### Data Import/Export
- `xlsx` - Al geïnstalleerd! Voor Excel
- `papaparse` - Voor CSV parsing

---

## ✅ Acceptatie Criteria per Fase

### Fase 1 - EU Compliance
- [ ] Alle producten hebben repairability index (1-10)
- [ ] Alle producten hebben durability score (1-10)
- [ ] QR codes gegenereerd voor alle producten
- [ ] Public DPP pagina werkt voor alle GTINs
- [ ] Wassymbolen visueel selecteerbaar
- [ ] EU compliance score zichtbaar in admin

### Fase 2 - Milieu Impact
- [ ] CO2 footprint met breakdown voor 80%+ producten
- [ ] Water footprint berekend
- [ ] Milieu impact visualisaties werkend
- [ ] Benchmark vergelijkingen beschikbaar

### Fase 3 - Supply Chain
- [ ] Supply chain steps trackbaar
- [ ] Visuele kaart met locaties
- [ ] Certificaten uploadbaar per stap
- [ ] Transparency score berekening actief

### Fase 4 - Technische Specs
- [ ] Maattabellen voor alle kledingstukken
- [ ] Kleurcodes gestandaardiseerd
- [ ] Kwaliteit ratings invulbaar
- [ ] Garantie info aanwezig

### Fase 5 - Sociale Impact
- [ ] Labor conditions trackbaar per faciliteit
- [ ] Certificaten gevalideerd
- [ ] Sociale impact scores berekend
- [ ] Audit rapporten toegankelijk

### Fase 6 - Circulaire Economie
- [ ] Circulaire diensten database gevuld
- [ ] Lifecycle events trackbaar
- [ ] End-of-life wizard werkend
- [ ] Impact savings getoond

---

## 🚀 Volgende Stappen

### Direct Starten (Deze Sprint)
1. **Database Schema Uitbreiden** - Fase 1 velden toevoegen
2. **QR Code Package Installeren** - `npm install qrcode`
3. **Repairability/Durability Sliders** - Frontend component maken
4. **Public DPP Route** - `/dpp/:gtin` endpoint + pagina

### Deze Maand
5. **Wassymbolen Component** - Visuele selector bouwen
6. **Compliance Validator** - Backend validatie logica
7. **Admin Dashboard Update** - Compliance overzicht

### Volgende Maand
8. **CO2 Calculator** - Berekeningslogica implementeren
9. **Milieu Impact Dashboard** - Visualisaties bouwen

---

**Document Versie**: 1.0  
**Laatst Bijgewerkt**: 27 Januari 2025  
**Status**: Ready voor Implementatie
