# GWC Digitaal Productpaspoort

Het GWC Digital Product Passport (DPP) is een platform van Groningen Werkt Circulair voor productinformatie, duurzaamheid en circulariteit. Het brengt basisgegevens en producthistorie samen en kan productinformatie via een QR-code beschikbaar maken.

## Versie 1.1.0

- Producten beheren in een tabel voor superadmins, met acties om te bewerken of te archiveren.
- Archiveren verbergt een product in de normale productlijsten, productpagina’s en zoekresultaten. De productgegevens, historie, meldingen, verhalen en GS1-koppelingen blijven bewaard.
- Productarchivering is alleen beschikbaar voor actieve superadmin-accounts.

## Mogelijkheden

- Digitale productpaspoorten en QR-codes op basis van GTIN.
- Product- en materiaalgegevens, verzorgingsinformatie en duurzaamheidsvelden.
- Historie van onder meer reparaties, uitleningen en retouren.
- Gebruikersrollen en productbeheer.
- Communityverhalen die aan producten kunnen worden gekoppeld.
- GS1 Nederland-koppeling en data-exportmogelijkheden.

Welke GS1-acties beschikbaar zijn, hangt af van de ingestelde omgeving en de rechten van het GS1-account.

## Contact

Groningen Werkt Circulair: [info@groningenwerktcirculair.info](mailto:info@groningenwerktcirculair.info).

## Techniek

- React, TypeScript en Vite voor de webinterface.
- Express en TypeScript voor de API.
- PostgreSQL met Drizzle ORM.
- Tailwind CSS en shadcn/ui.

## Lokaal ontwikkelen

Vereist Node.js en npm. Stel `DATABASE_URL` en `SESSION_SECRET` veilig in via de Replit Secrets-instellingen; zet geen geheime waarden in dit bestand of in GitHub.

```bash
npm install
npm run db:push
npm run dev
```

`npm run db:push` werkt het ontwikkelschema bij. Voor de beheerde Replit-productiedatabase worden schemawijzigingen bij publiceren verwerkt.

## Controles

```bash
npm run check
npm test
npm run build
```

## Configuratie en publiceren

De app kan aanvullende serverconfiguratie nodig hebben voor GS1, e-mail en externe exports. Bewaar configuratie en credentials in Replit Secrets en volg de projectinstellingen; publiceer nooit credentials, `.env`-bestanden of gebruikersuploads naar GitHub.
