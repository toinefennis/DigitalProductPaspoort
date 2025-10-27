# GWC DPP - Digital Product Passport App

## Project Overview
Een uitgebreide digitale productpaspoort platform voor het Groningen Werkt Circulair project, gespecialiseerd in duurzame producttracking, community verhalen delen, en geavanceerde GS1 GDSN netwerk synchronisatie.

## Technische Stack
- **Frontend**: React TypeScript met Vite
- **Backend**: Express.js met TypeScript
- **Database**: PostgreSQL met Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui components
- **Authentication**: Passport.js met lokale strategie
- **Camera/Scanning**: Quagga.js + ZXing voor barcode/QR scanning

## Recent Changes
- **2025-10-27**: EU ESPR DPP compliance implementatie voltooid
- **2025-10-27**: Fase 1 velden geïmplementeerd (repairability, durability, care symbols, carbon footprint)
- **2025-10-27**: Fase 2 velden geïmplementeerd (water footprint, energy consumption, microplastic shedding)
- **2025-10-27**: Public DPP pagina gebouwd voor /dpp/:gtin route
- **2025-10-27**: Automatische QR code generatie voor product paspoorten
- **2025-10-27**: Carbon footprint breakdown velden toegevoegd aan product formulier
- **2025-10-27**: JSONB velden parsing gefixed in backend voor correcte data opslag
- **2025-01-03**: Story sharing links aangepast naar specifieke verhalen met URL parameter handling
- **2025-01-03**: Deep linking functionaliteit toegevoegd voor directe story access
- **2025-01-03**: Auto-expand en scroll naar gedeelde verhalen geïmplementeerd
- **2025-01-03**: Visuele highlighting voor gedeelde verhalen toegevoegd

## User Preferences
- Interface taal: Nederlands
- Gebruiksvriendelijke, niet-technische communicatie
- Focus op duurzaamheid en circulaire economie
- Mobiel-first design approach

## Project Architecture
- **client/**: React frontend applicatie
- **server/**: Express backend met API routes
- **shared/**: Gedeelde TypeScript types en schema's
- **uploads/**: Bestandsopslag voor afbeeldingen
- **attached_assets/**: Bijgevoegde bestanden van gebruiker

## Database Schema
- **users**: Gebruikersbeheer met rollen (admin, manager, user)
- **products**: Productinformatie met GTIN codes
- **events**: Productlevenscyclus events (reparatie, uitlening, etc.)
- **stories**: Community verhalen gekoppeld aan producten
- **notifications**: Gebruikersnotificaties
- **gtin_registry**: EU DPP compliant GTIN registratie
- **gs1_partners**: GS1 synchronisatie partners

## Key Features Implemented
1. **Digital Product Passport (DPP)**: EU ESPR compliant digitale productpaspoorten
   - Public DPP pagina toegankelijk via /dpp/:gtin (geen authenticatie vereist)
   - Repareerbaarheidsindex (1-10 schaal)
   - Duurzaamheidsscore (1-10 schaal)
   - ISO 3758 wassymbolen selector
   - Carbon footprint breakdown (grondstoffen, productie, transport, gebruik, einde levensduur)
   - Water footprint tracking
   - Energie verbruik en hernieuwbare energie percentage
   - Microplastic afgifte schatting
   - Automatische QR code generatie voor elk product
2. **Product Management**: CRUD operaties voor producten
3. **Event Tracking**: Levenscyclus events voor duurzaamheid
4. **Story Sharing**: Community verhalen met foto's en social media integratie
5. **User Management**: Rolengebaseerd toegangsbeheer
6. **Camera Scanning**: Barcode/QR code scanning voor productidentificatie
7. **GS1 Synchronization**: Automatische sync met GS1 partners
8. **Lending System**: Uitleensysteem voor producten
9. **Export Functionality**: Data export naar Excel
10. **Notification System**: Real-time gebruikersnotificaties
11. **Material Care**: Automatische verzorgingsinstructies met wassymbolen