# Handleiding GWC Digitaal Product Paspoort

**App URL:** https://gwc-digitaal-product-paspoort.replit.app/

---

## Inhoudsopgave

1. [Wat is een Digitaal Product Paspoort?](#wat-is-een-digitaal-product-paspoort)
2. [Wat kan ik met een Digitaal Product Paspoort?](#wat-kan-ik-met-een-digitaal-product-paspoort)
3. [Gebruikersrollen](#gebruikersrollen)
4. [Basisfuncties van de App](#basisfuncties-van-de-app)
5. [Aan de slag - Inloggen & Registreren](#aan-de-slag---inloggen--registreren)
6. [Hoe voeg ik een artikel toe?](#hoe-voeg-ik-een-artikel-toe)
7. [Hoe wijzig ik een artikel bij GS1?](#hoe-wijzig-ik-een-artikel-bij-gs1)
8. [Stapsgewijze uitleg per rol](#stapsgewijze-uitleg-per-rol)
9. [Veelgestelde vragen (FAQ)](#veelgestelde-vragen-faq)

---

## Wat is een Digitaal Product Paspoort?

Een **Digitaal Product Paspoort (DPP)** is een digitale identiteitskaart voor producten. Het bevat alle belangrijke informatie over een product gedurende de hele levenscyclus - van productie tot recycling.

### Waarom is dit belangrijk?

Het DPP is onderdeel van de **EU ESPR-regelgeving** (Ecodesign for Sustainable Products Regulation) die vanaf 2025 verplicht wordt voor textielproducten. Het doel is om:

- **Transparantie** te bieden over de herkomst en samenstelling van producten
- **Duurzaamheid** te bevorderen door informatie over reparatie en recycling
- **Circulaire economie** te ondersteunen door producten langer in gebruik te houden
- **Consumenten** te helpen bewuste keuzes te maken

### Wat bevat een DPP?

| Categorie | Informatie |
|-----------|------------|
| **Basisgegevens** | GTIN (barcode), productnaam, merk, categorie |
| **Materialen** | Samenstelling, vezels, herkomst |
| **Duurzaamheid** | Repareerbaarheidsindex, levensduur, CO₂-voetafdruk |
| **Verzorging** | Wassymbolen, onderhoudsinstructies |
| **Milieu-impact** | Waterverbruik, energieverbruik, microplastic afgifte |
| **Levenscyclus** | Reparaties, uitleningen, overdrachten |

---

## Wat kan ik met een Digitaal Product Paspoort?

### Voor Bedrijven

✅ **Voldoen aan EU-regelgeving** - Automatisch compliant met ESPR-vereisten  
✅ **Productinformatie centraliseren** - Alle gegevens op één plek  
✅ **Duurzaamheid aantonen** - Transparante milieu-impact communiceren  
✅ **Klantenservice verbeteren** - Volledige productgeschiedenis beschikbaar  

### Voor Consumenten

✅ **Bewuste keuzes maken** - Vergelijk producten op duurzaamheid  
✅ **Verzorgingsinstructies vinden** - Altijd de juiste was- en onderhoudsinformatie  
✅ **Reparatiemogelijkheden ontdekken** - Weet hoe en waar je kunt repareren  
✅ **Productgeschiedenis bekijken** - Zie de hele levenscyclus van je product  

### Voor de Circulaire Economie

✅ **Producten langer gebruiken** - Door goede verzorging en reparatie  
✅ **Materialen traceren** - Weet wat er in een product zit voor recycling  
✅ **Verhalen delen** - Community-verhalen over productervaringen  

---

## Gebruikersrollen

De GWC DPP app heeft drie gebruikersrollen, elk met specifieke rechten en mogelijkheden:

### 👤 Gebruiker (User)

| Rechten | Beschrijving |
|---------|-------------|
| Producten bekijken | Alle producten in de database bekijken |
| DPP scannen | QR-codes en barcodes scannen |
| Verhalen lezen | Community-verhalen bekijken |
| Eigen profiel beheren | Persoonlijke gegevens aanpassen |
| Meldingen ontvangen | Notificaties over producten |

### 👔 Manager

| Rechten | Beschrijving |
|---------|-------------|
| Alle gebruikersrechten | Plus onderstaande uitbreidingen |
| Producten toevoegen | Nieuwe artikelen registreren |
| Producten bewerken | Bestaande productgegevens wijzigen |
| Events registreren | Reparaties, uitleningen, etc. loggen |
| Verhalen delen | Community-verhalen plaatsen |
| Rapporten exporteren | Data exporteren naar Excel |

### 🔧 Beheerder (Admin)

| Rechten | Beschrijving |
|---------|-------------|
| Alle managerrechten | Plus onderstaande uitbreidingen |
| Gebruikersbeheer | Accounts aanmaken, rollen toewijzen |
| GS1 Synchronisatie | Koppeling met GS1/GDSN netwerk |
| GTIN Registry | Barcode-registratie beheren |
| Systeem instellingen | App-configuratie aanpassen |

---

## Basisfuncties van de App

### 📊 Dashboard
Het startscherm met overzicht van:
- Totaal aantal producten
- Recente activiteiten
- Openstaande uitleningen
- Snelle toegang tot veelgebruikte functies

### 📷 Scanner
Scan producten via:
- **QR-code** - Scan de DPP QR-code
- **Barcode** - Scan de GTIN/EAN barcode
- **Handmatig** - Voer de code handmatig in

### 📦 Producten
Overzicht van alle geregistreerde producten met:
- Zoekfunctie
- Filters op categorie, merk, status
- Sorteeropties

### 📝 Verhalen
Community-sectie waar gebruikers ervaringen delen:
- Reparatieverhalen
- Duurzaamheidstips
- Productbeoordelingen

### 🔔 Meldingen
Notificaties over:
- Terugkeer uitleningen
- Productwijzigingen
- Systeemberichten

### 📊 Uitleningen
Beheer van uitgeleende producten:
- Actieve uitleningen
- Geschiedenis
- Herinneringen

### 📤 Export
Data exporteren naar:
- Excel (.xlsx)
- Gefilterde rapporten

---

## Aan de slag - Inloggen & Registreren

### Inloggen

1. Ga naar https://gwc-digitaal-product-paspoort.replit.app/
2. Voer je **gebruikersnaam** in
3. Voer je **wachtwoord** in
4. Klik op **Inloggen**

#### Demo Accounts (voor testen)

| Rol | Gebruikersnaam | Wachtwoord |
|-----|----------------|------------|
| Admin | admin | admin123 |
| Manager | manager | manager123 |
| Gebruiker | user | user123 |

### Nieuw Account Aanmaken

**Optie 1: Via de registratiepagina**
1. Klik op **"Nieuw Account Aanmaken"** op de loginpagina
2. Vul het registratieformulier in:
   - Voornaam en achternaam
   - E-mailadres
   - Gebruikersnaam
   - Wachtwoord (minimaal 6 tekens)
3. Klik op **"Account Aanmaken"**

**Optie 2: Via QR-code**
1. Scan de QR-code op de loginpagina
2. Je wordt doorgestuurd naar de registratiepagina
3. Volg de stappen hierboven

---

## Hoe voeg ik een artikel toe?

> **Vereiste rol:** Manager of Beheerder

### Stap-voor-stap handleiding

#### Stap 1: Navigeer naar Product Toevoegen
- Klik op de **+** knop (rechtsonder) op het dashboard
- Of ga naar **Menu > Product Toevoegen**

#### Stap 2: Basisgegevens invullen

| Veld | Beschrijving | Voorbeeld |
|------|-------------|-----------|
| **GTIN** | 13-cijferige barcode | 8712345678901 |
| **Productnaam** | Duidelijke naam | "Biologisch Katoenen T-shirt" |
| **Type** | Categorie | Kleding, Textiel, Accessoire |
| **Merk** | Merknaam | "Eerlijk & Duurzaam" |
| **Beschrijving** | Productomschrijving | Korte tekst over het product |

#### Stap 3: Materiaalsamenstelling
- Selecteer de **materialen** (bijv. katoen, polyester)
- Geef het **percentage** per materiaal aan
- Totaal moet 100% zijn

#### Stap 4: Duurzaamheidsgegevens (EU ESPR)

| Veld | Schaal | Toelichting |
|------|--------|-------------|
| **Repareerbaarheidsindex** | 1-10 | Hoe makkelijk te repareren |
| **Duurzaamheidsscore** | 1-10 | Verwachte levensduur |
| **CO₂-voetafdruk** | kg CO₂e | Totale klimaatimpact |
| **Waterverbruik** | Liters | Productiewater |

#### Stap 5: Verzorgingsinstructies
- Selecteer de juiste **wassymbolen**:
  - Wassen (temperatuur)
  - Bleken
  - Drogen
  - Strijken
  - Chemisch reinigen

#### Stap 6: Foto uploaden
- Klik op **"Foto uploaden"**
- Selecteer een productafbeelding
- Aanbevolen formaat: vierkant, minimaal 500x500 pixels

#### Stap 7: Opslaan
- Controleer alle gegevens
- Klik op **"Product Opslaan"**
- Het product krijgt automatisch een **QR-code** toegewezen

---

## Hoe wijzig ik een artikel bij GS1?

> **Vereiste rol:** Beheerder

### Wat is GS1 Synchronisatie?

GS1 is het wereldwijde netwerk voor productidentificatie. De GWC DPP app kan synchroniseren met het **GDSN** (Global Data Synchronisation Network) voor:
- Automatische productdata-updates
- Consistente informatie bij retailers
- Centrale productbeheer

### Stap 1: Ga naar GS1 Sync
- Menu > **GS1 Synchronisatie**

### Stap 2: Partner Configureren
1. Klik op **"Partner Toevoegen"**
2. Vul in:
   - Partner naam
   - GLN (Global Location Number)
   - API-sleutel (indien beschikbaar)
3. Klik op **"Opslaan"**

### Stap 3: Synchronisatie Starten
1. Selecteer de **producten** die je wilt synchroniseren
2. Kies de **doelpartner**
3. Klik op **"Sync Starten"**

### Stap 4: Status Monitoren
- Bekijk de sync-status in het overzicht
- Groen = Succesvol
- Oranje = In behandeling
- Rood = Fout (controleer details)

### GTIN Registry
Voor het beheren van barcodes:
1. Ga naar **Menu > GTIN Registry**
2. Hier kun je:
   - Beschikbare GTIN's bekijken
   - Nieuwe GTIN's registreren
   - GTIN's aan producten koppelen

---

## Stapsgewijze uitleg per rol

### 👤 Gebruiker - Dagelijks Gebruik

#### Product opzoeken via scan
1. Open de **Scanner** (camera-icoon)
2. Richt de camera op de **QR-code** of **barcode**
3. Bekijk de productinformatie
4. Optioneel: bekijk de volledige **DPP-pagina**

#### Verhalen lezen
1. Ga naar **Verhalen**
2. Blader door community-verhalen
3. Klik op een verhaal voor details
4. Deel interessante verhalen via de deelknop

#### Profiel aanpassen
1. Ga naar **Profiel** (rechtsboven)
2. Bewerk je gegevens
3. Wijzig je wachtwoord indien nodig
4. Sla wijzigingen op

---

### 👔 Manager - Productbeheer

#### Nieuw product registreren
1. Klik op de **+** knop
2. Vul alle vereiste velden in (zie sectie hierboven)
3. Upload een productfoto
4. Klik op **"Opslaan"**
5. Print of download de QR-code

#### Product bewerken
1. Zoek het product via **Producten** of **Scanner**
2. Klik op het product
3. Klik op **"Bewerken"**
4. Pas de gegevens aan
5. Klik op **"Opslaan"**

#### Event registreren (reparatie, uitlening, etc.)
1. Open het product
2. Scroll naar **"Gebeurtenissen"**
3. Klik op **"Nieuwe Gebeurtenis"**
4. Selecteer het type:
   - 🔧 Reparatie
   - 📤 Uitlening
   - ↩️ Terugname
   - 🔄 Overdracht
   - ♻️ Recycling
5. Voeg details toe
6. Klik op **"Opslaan"**

#### Verhaal plaatsen
1. Ga naar **Verhalen**
2. Klik op **"Nieuw Verhaal"**
3. Selecteer het product
4. Schrijf je verhaal
5. Voeg foto's toe (optioneel)
6. Klik op **"Publiceren"**

#### Data exporteren
1. Ga naar **Export**
2. Selecteer de **datumrange**
3. Kies welke data (producten, events, etc.)
4. Klik op **"Exporteren naar Excel"**
5. Download het bestand

---

### 🔧 Beheerder - Systeembeheer

#### Gebruiker toevoegen
1. Ga naar **Gebruikers**
2. Klik op **"Nieuwe Gebruiker"**
3. Vul in:
   - Naam
   - E-mail
   - Gebruikersnaam
   - Wachtwoord
   - **Rol** (Gebruiker/Manager/Admin)
4. Klik op **"Aanmaken"**

#### Gebruikersrol wijzigen
1. Ga naar **Gebruikers**
2. Zoek de gebruiker
3. Klik op **"Bewerken"**
4. Wijzig de **rol**
5. Klik op **"Opslaan"**

#### GS1 Synchronisatie configureren
1. Ga naar **GS1 Sync**
2. Configureer partners (zie sectie hierboven)
3. Plan automatische synchronisaties
4. Monitor de sync-status

#### GTIN's beheren
1. Ga naar **GTIN Registry**
2. Bekijk beschikbare barcodes
3. Registreer nieuwe GTIN's
4. Koppel GTIN's aan producten

#### Instellingen aanpassen
1. Ga naar **Instellingen**
2. Configureer:
   - Bedrijfsnaam
   - Logo
   - E-mail notificaties
   - Taalinstellingen

---

## Veelgestelde vragen (FAQ)

### Algemeen

**V: Kan ik de app op mijn telefoon gebruiken?**  
A: Ja! De app is volledig responsive en werkt op telefoon, tablet en desktop.

**V: Moet ik betalen voor de app?**  
A: Neem contact op met GWC voor licentie-informatie.

**V: Wat gebeurt er als ik mijn wachtwoord vergeet?**  
A: Neem contact op met een beheerder om je wachtwoord te resetten.

### Producten

**V: Wat is een GTIN?**  
A: Een GTIN (Global Trade Item Number) is een unieke 13-cijferige barcode die elk product identificeert.

**V: Kan ik producten zonder GTIN toevoegen?**  
A: Ja, de app genereert automatisch een intern nummer als je geen GTIN hebt.

**V: Hoe krijg ik een officiële GTIN?**  
A: Registreer je bedrijf bij GS1 Nederland (gs1.nl) om officiële barcodes aan te vragen.

### DPP & Duurzaamheid

**V: Wat betekent de repareerbaarheidsindex?**  
A: Een score van 1-10 die aangeeft hoe makkelijk een product te repareren is. 10 = zeer goed repareerbaar.

**V: Hoe bereken ik de CO₂-voetafdruk?**  
A: Dit is de totale uitstoot tijdens productie, transport en gebruik. Gebruik een CO₂-calculator of vraag je leverancier.

**V: Zijn de EU ESPR-velden verplicht?**  
A: Ja, vanaf 2025 zijn deze velden verplicht voor textielproducten in de EU.

### Technisch

**V: Welke browsers worden ondersteund?**  
A: Chrome, Firefox, Safari, Edge (laatste 2 versies).

**V: Hoe kan ik de QR-code van een product downloaden?**  
A: Open het product > klik op de QR-code > kies "Downloaden" of "Afdrukken".

**V: Kan ik bulk-import doen?**  
A: Ja, via de GS1 Sync functie of neem contact op met support voor bulk-import opties.

---

## Contact & Support

**Groningen Werkt Circulair**  
📧 E-mail: [info@groningenwerktcirculair.info](mailto:info@groningenwerktcirculair.info)<br>
🌐 Website: [www.groningenwerktcirculair.info](https://www.groningenwerktcirculair.info)

**App Ondersteuning**  
Voor technische vragen of problemen met de app, neem contact op met je beheerder of het GWC support team.

---

*Laatste update: Januari 2025*  
*Versie: 1.05*
