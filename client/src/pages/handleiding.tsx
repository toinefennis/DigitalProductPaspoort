import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Printer, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Handleiding() {
  const [, setLocation] = useLocation();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b p-4 flex items-center justify-between">
        <Button variant="ghost" onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Terug
        </Button>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="bg-gwc-primary hover:bg-gwc-primary/90">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Afdrukken
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-8 print:p-4">
        <div className="text-center mb-12 print:mb-8">
          <h1 className="text-4xl font-bold text-gwc-primary mb-4 print:text-3xl">
            Handleiding GWC Digitaal Product Paspoort
          </h1>
          <p className="text-lg text-gray-600">
            Groningen Werkt Circulair - Digitaal Product Paspoort Platform
          </p>
          <p className="text-sm text-gray-500 mt-2">
            App URL: https://gwc-digitaal-product-paspoort.replit.app/
          </p>
        </div>

        <div className="space-y-8 print:space-y-6">
          <section className="print:break-inside-avoid">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              Inhoudsopgave
            </h2>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Wat is een Digitaal Product Paspoort?</li>
              <li>Wat kan ik met een Digitaal Product Paspoort?</li>
              <li>Gebruikersrollen</li>
              <li>Basisfuncties van de App</li>
              <li>Aan de slag - Inloggen & Registreren</li>
              <li>Hoe voeg ik een artikel toe?</li>
              <li>Hoe wijzig ik een artikel bij GS1?</li>
              <li>Stapsgewijze uitleg per rol</li>
              <li>Veelgestelde vragen (FAQ)</li>
            </ol>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              1. Wat is een Digitaal Product Paspoort?
            </h2>
            <p className="mb-4">
              Een <strong>Digitaal Product Paspoort (DPP)</strong> is een digitale identiteitskaart voor producten. 
              Het bevat alle belangrijke informatie over een product gedurende de hele levenscyclus - van productie tot recycling.
            </p>
            
            <h3 className="text-xl font-semibold mt-6 mb-3">Waarom is dit belangrijk?</h3>
            <p className="mb-4">
              Het DPP is onderdeel van de <strong>EU ESPR-regelgeving</strong> (Ecodesign for Sustainable Products Regulation) 
              die vanaf 2025 verplicht wordt voor textielproducten. Het doel is om:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
              <li><strong>Transparantie</strong> te bieden over de herkomst en samenstelling van producten</li>
              <li><strong>Duurzaamheid</strong> te bevorderen door informatie over reparatie en recycling</li>
              <li><strong>Circulaire economie</strong> te ondersteunen door producten langer in gebruik te houden</li>
              <li><strong>Consumenten</strong> te helpen bewuste keuzes te maken</li>
            </ul>

            <h3 className="text-xl font-semibold mt-6 mb-3">Wat bevat een DPP?</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">Categorie</th>
                    <th className="border border-gray-300 p-2 text-left">Informatie</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-gray-300 p-2 font-medium">Basisgegevens</td><td className="border border-gray-300 p-2">GTIN (barcode), productnaam, merk, categorie</td></tr>
                  <tr><td className="border border-gray-300 p-2 font-medium">Materialen</td><td className="border border-gray-300 p-2">Samenstelling, vezels, herkomst</td></tr>
                  <tr><td className="border border-gray-300 p-2 font-medium">Duurzaamheid</td><td className="border border-gray-300 p-2">Repareerbaarheidsindex, levensduur, CO₂-voetafdruk</td></tr>
                  <tr><td className="border border-gray-300 p-2 font-medium">Verzorging</td><td className="border border-gray-300 p-2">Wassymbolen, onderhoudsinstructies</td></tr>
                  <tr><td className="border border-gray-300 p-2 font-medium">Milieu-impact</td><td className="border border-gray-300 p-2">Waterverbruik, energieverbruik, microplastic afgifte</td></tr>
                  <tr><td className="border border-gray-300 p-2 font-medium">Levenscyclus</td><td className="border border-gray-300 p-2">Reparaties, uitleningen, overdrachten</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              2. Wat kan ik met een Digitaal Product Paspoort?
            </h2>
            
            <h3 className="text-xl font-semibold mt-4 mb-3">Voor Bedrijven</h3>
            <ul className="space-y-2 mb-4">
              <li>✅ <strong>Voldoen aan EU-regelgeving</strong> - Automatisch compliant met ESPR-vereisten</li>
              <li>✅ <strong>Productinformatie centraliseren</strong> - Alle gegevens op één plek</li>
              <li>✅ <strong>Duurzaamheid aantonen</strong> - Transparante milieu-impact communiceren</li>
              <li>✅ <strong>Klantenservice verbeteren</strong> - Volledige productgeschiedenis beschikbaar</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-3">Voor Consumenten</h3>
            <ul className="space-y-2 mb-4">
              <li>✅ <strong>Bewuste keuzes maken</strong> - Vergelijk producten op duurzaamheid</li>
              <li>✅ <strong>Verzorgingsinstructies vinden</strong> - Altijd de juiste was- en onderhoudsinformatie</li>
              <li>✅ <strong>Reparatiemogelijkheden ontdekken</strong> - Weet hoe en waar je kunt repareren</li>
              <li>✅ <strong>Productgeschiedenis bekijken</strong> - Zie de hele levenscyclus van je product</li>
            </ul>

            <h3 className="text-xl font-semibold mt-4 mb-3">Voor de Circulaire Economie</h3>
            <ul className="space-y-2">
              <li>✅ <strong>Producten langer gebruiken</strong> - Door goede verzorging en reparatie</li>
              <li>✅ <strong>Materialen traceren</strong> - Weet wat er in een product zit voor recycling</li>
              <li>✅ <strong>Verhalen delen</strong> - Community-verhalen over productervaringen</li>
            </ul>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              3. Gebruikersrollen
            </h2>
            <p className="mb-4">De GWC DPP app heeft drie gebruikersrollen, elk met specifieke rechten:</p>

            <Card className="mb-4 print:shadow-none print:border">
              <CardContent className="pt-4">
                <h3 className="text-xl font-semibold mb-3">👤 Gebruiker (User)</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Producten bekijken - Alle producten in de database bekijken</li>
                  <li>• DPP scannen - QR-codes en barcodes scannen</li>
                  <li>• Verhalen lezen - Community-verhalen bekijken</li>
                  <li>• Eigen profiel beheren - Persoonlijke gegevens aanpassen</li>
                  <li>• Meldingen ontvangen - Notificaties over producten</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="mb-4 print:shadow-none print:border">
              <CardContent className="pt-4">
                <h3 className="text-xl font-semibold mb-3">👔 Manager</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Alle gebruikersrechten plus:</li>
                  <li>• Producten toevoegen - Nieuwe artikelen registreren</li>
                  <li>• Producten bewerken - Bestaande productgegevens wijzigen</li>
                  <li>• Events registreren - Reparaties, uitleningen, etc. loggen</li>
                  <li>• Verhalen delen - Community-verhalen plaatsen</li>
                  <li>• Rapporten exporteren - Data exporteren naar Excel</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="print:shadow-none print:border">
              <CardContent className="pt-4">
                <h3 className="text-xl font-semibold mb-3">🔧 Beheerder (Admin)</h3>
                <ul className="space-y-1 text-sm">
                  <li>• Alle managerrechten plus:</li>
                  <li>• Gebruikersbeheer - Accounts aanmaken, rollen toewijzen</li>
                  <li>• GS1 Synchronisatie - Koppeling met GS1/GDSN netwerk</li>
                  <li>• GTIN Registry - Barcode-registratie beheren</li>
                  <li>• Systeem instellingen - App-configuratie aanpassen</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              4. Basisfuncties van de App
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
              <div className="p-4 bg-gray-50 rounded-lg print:border">
                <h3 className="font-semibold mb-2">📊 Dashboard</h3>
                <p className="text-sm">Startscherm met overzicht van producten, recente activiteiten en snelle toegang.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg print:border">
                <h3 className="font-semibold mb-2">📷 Scanner</h3>
                <p className="text-sm">Scan producten via QR-code, barcode of handmatige invoer.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg print:border">
                <h3 className="font-semibold mb-2">📦 Producten</h3>
                <p className="text-sm">Overzicht van alle geregistreerde producten met zoek- en filterfuncties.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg print:border">
                <h3 className="font-semibold mb-2">📝 Verhalen</h3>
                <p className="text-sm">Community-sectie voor het delen van ervaringen en tips.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg print:border">
                <h3 className="font-semibold mb-2">🔔 Meldingen</h3>
                <p className="text-sm">Notificaties over uitleningen, wijzigingen en systeemberichten.</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg print:border">
                <h3 className="font-semibold mb-2">📤 Export</h3>
                <p className="text-sm">Data exporteren naar Excel met filteropties.</p>
              </div>
            </div>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              5. Aan de slag - Inloggen & Registreren
            </h2>
            
            <h3 className="text-xl font-semibold mt-4 mb-3">Inloggen</h3>
            <ol className="list-decimal list-inside space-y-2 mb-4">
              <li>Ga naar https://gwc-digitaal-product-paspoort.replit.app/</li>
              <li>Voer je <strong>gebruikersnaam</strong> in</li>
              <li>Voer je <strong>wachtwoord</strong> in</li>
              <li>Klik op <strong>Inloggen</strong></li>
            </ol>

            <h3 className="text-xl font-semibold mt-6 mb-3">Demo Accounts (voor testen)</h3>
            <table className="w-full border-collapse border border-gray-300 text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Rol</th>
                  <th className="border border-gray-300 p-2 text-left">Gebruikersnaam</th>
                  <th className="border border-gray-300 p-2 text-left">Wachtwoord</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-gray-300 p-2">Admin</td><td className="border border-gray-300 p-2">admin</td><td className="border border-gray-300 p-2">admin123</td></tr>
                <tr><td className="border border-gray-300 p-2">Manager</td><td className="border border-gray-300 p-2">manager</td><td className="border border-gray-300 p-2">manager123</td></tr>
                <tr><td className="border border-gray-300 p-2">Gebruiker</td><td className="border border-gray-300 p-2">user</td><td className="border border-gray-300 p-2">user123</td></tr>
              </tbody>
            </table>

            <h3 className="text-xl font-semibold mt-6 mb-3">Nieuw Account Aanmaken</h3>
            <p className="mb-2"><strong>Optie 1: Via de registratiepagina</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4 mb-4">
              <li>Klik op "Nieuw Account Aanmaken" op de loginpagina</li>
              <li>Vul het registratieformulier in (naam, e-mail, gebruikersnaam, wachtwoord)</li>
              <li>Klik op "Account Aanmaken"</li>
            </ol>
            <p className="mb-2"><strong>Optie 2: Via QR-code</strong></p>
            <ol className="list-decimal list-inside space-y-1 ml-4">
              <li>Scan de QR-code op de loginpagina</li>
              <li>Je wordt doorgestuurd naar de registratiepagina</li>
              <li>Volg de stappen hierboven</li>
            </ol>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              6. Hoe voeg ik een artikel toe?
            </h2>
            <p className="text-sm text-gray-600 mb-4"><em>Vereiste rol: Manager of Beheerder</em></p>

            <h3 className="text-xl font-semibold mt-4 mb-3">Stap 1: Navigeer naar Product Toevoegen</h3>
            <p className="mb-4">Klik op de <strong>+</strong> knop (rechtsonder) of ga naar Menu → Product Toevoegen</p>

            <h3 className="text-xl font-semibold mt-4 mb-3">Stap 2: Basisgegevens invullen</h3>
            <table className="w-full border-collapse border border-gray-300 text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Veld</th>
                  <th className="border border-gray-300 p-2 text-left">Beschrijving</th>
                  <th className="border border-gray-300 p-2 text-left">Voorbeeld</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-gray-300 p-2">GTIN</td><td className="border border-gray-300 p-2">13-cijferige barcode</td><td className="border border-gray-300 p-2">8712345678901</td></tr>
                <tr><td className="border border-gray-300 p-2">Productnaam</td><td className="border border-gray-300 p-2">Duidelijke naam</td><td className="border border-gray-300 p-2">Biologisch Katoenen T-shirt</td></tr>
                <tr><td className="border border-gray-300 p-2">Type</td><td className="border border-gray-300 p-2">Categorie</td><td className="border border-gray-300 p-2">Kleding, Textiel</td></tr>
                <tr><td className="border border-gray-300 p-2">Merk</td><td className="border border-gray-300 p-2">Merknaam</td><td className="border border-gray-300 p-2">Eerlijk & Duurzaam</td></tr>
              </tbody>
            </table>

            <h3 className="text-xl font-semibold mt-4 mb-3">Stap 3: Duurzaamheidsgegevens (EU ESPR)</h3>
            <table className="w-full border-collapse border border-gray-300 text-sm mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 p-2 text-left">Veld</th>
                  <th className="border border-gray-300 p-2 text-left">Schaal</th>
                  <th className="border border-gray-300 p-2 text-left">Toelichting</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className="border border-gray-300 p-2">Repareerbaarheidsindex</td><td className="border border-gray-300 p-2">1-10</td><td className="border border-gray-300 p-2">Hoe makkelijk te repareren</td></tr>
                <tr><td className="border border-gray-300 p-2">Duurzaamheidsscore</td><td className="border border-gray-300 p-2">1-10</td><td className="border border-gray-300 p-2">Verwachte levensduur</td></tr>
                <tr><td className="border border-gray-300 p-2">CO₂-voetafdruk</td><td className="border border-gray-300 p-2">kg CO₂e</td><td className="border border-gray-300 p-2">Totale klimaatimpact</td></tr>
                <tr><td className="border border-gray-300 p-2">Waterverbruik</td><td className="border border-gray-300 p-2">Liters</td><td className="border border-gray-300 p-2">Productiewater</td></tr>
              </tbody>
            </table>

            <h3 className="text-xl font-semibold mt-4 mb-3">Stap 4: Verzorgingsinstructies</h3>
            <p className="mb-4">Selecteer de juiste wassymbolen: Wassen, Bleken, Drogen, Strijken, Chemisch reinigen</p>

            <h3 className="text-xl font-semibold mt-4 mb-3">Stap 5: Opslaan</h3>
            <p>Controleer alle gegevens en klik op <strong>"Product Opslaan"</strong>. Het product krijgt automatisch een QR-code.</p>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              7. Hoe wijzig ik een artikel bij GS1?
            </h2>
            <p className="text-sm text-gray-600 mb-4"><em>Vereiste rol: Beheerder</em></p>

            <h3 className="text-xl font-semibold mt-4 mb-3">Wat is GS1 Synchronisatie?</h3>
            <p className="mb-4">
              GS1 is het wereldwijde netwerk voor productidentificatie. De GWC DPP app kan synchroniseren met het 
              GDSN (Global Data Synchronisation Network) voor automatische productdata-updates.
            </p>

            <h3 className="text-xl font-semibold mt-4 mb-3">Stappen:</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li><strong>Ga naar GS1 Sync</strong> - Menu → GS1 Synchronisatie</li>
              <li><strong>Partner Configureren</strong> - Voeg partner toe met naam, GLN en API-sleutel</li>
              <li><strong>Synchronisatie Starten</strong> - Selecteer producten en klik op "Sync Starten"</li>
              <li><strong>Status Monitoren</strong> - Groen = Succesvol, Oranje = In behandeling, Rood = Fout</li>
            </ol>

            <h3 className="text-xl font-semibold mt-6 mb-3">GTIN Registry</h3>
            <p className="mb-2">Voor het beheren van barcodes:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Ga naar Menu → GTIN Registry</li>
              <li>Bekijk beschikbare GTIN's</li>
              <li>Registreer nieuwe GTIN's</li>
              <li>Koppel GTIN's aan producten</li>
            </ol>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              8. Stapsgewijze uitleg per rol
            </h2>

            <h3 className="text-xl font-semibold mt-4 mb-3">👤 Gebruiker - Dagelijks Gebruik</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg print:border">
              <h4 className="font-semibold mb-2">Product opzoeken via scan</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open de Scanner (camera-icoon)</li>
                <li>Richt de camera op de QR-code of barcode</li>
                <li>Bekijk de productinformatie</li>
                <li>Optioneel: bekijk de volledige DPP-pagina</li>
              </ol>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">👔 Manager - Productbeheer</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg print:border">
              <h4 className="font-semibold mb-2">Event registreren (reparatie, uitlening, etc.)</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Open het product</li>
                <li>Scroll naar "Gebeurtenissen"</li>
                <li>Klik op "Nieuwe Gebeurtenis"</li>
                <li>Selecteer type: 🔧 Reparatie, 📤 Uitlening, ↩️ Terugname, 🔄 Overdracht, ♻️ Recycling</li>
                <li>Voeg details toe en klik op "Opslaan"</li>
              </ol>
            </div>

            <h3 className="text-xl font-semibold mt-6 mb-3">🔧 Beheerder - Systeembeheer</h3>
            
            <div className="mb-4 p-4 bg-gray-50 rounded-lg print:border">
              <h4 className="font-semibold mb-2">Gebruiker toevoegen</h4>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Ga naar Gebruikers</li>
                <li>Klik op "Nieuwe Gebruiker"</li>
                <li>Vul in: Naam, E-mail, Gebruikersnaam, Wachtwoord, Rol</li>
                <li>Klik op "Aanmaken"</li>
              </ol>
            </div>
          </section>

          <section className="print:break-before-page">
            <h2 className="text-2xl font-bold text-gwc-primary border-b-2 border-gwc-primary pb-2 mb-4">
              9. Veelgestelde vragen (FAQ)
            </h2>

            <div className="space-y-4">
              <div>
                <p className="font-semibold">V: Kan ik de app op mijn telefoon gebruiken?</p>
                <p className="text-gray-700">A: Ja! De app is volledig responsive en werkt op telefoon, tablet en desktop.</p>
              </div>
              <div>
                <p className="font-semibold">V: Wat is een GTIN?</p>
                <p className="text-gray-700">A: Een GTIN (Global Trade Item Number) is een unieke 13-cijferige barcode die elk product identificeert.</p>
              </div>
              <div>
                <p className="font-semibold">V: Kan ik producten zonder GTIN toevoegen?</p>
                <p className="text-gray-700">A: Ja, de app genereert automatisch een intern nummer als je geen GTIN hebt.</p>
              </div>
              <div>
                <p className="font-semibold">V: Wat betekent de repareerbaarheidsindex?</p>
                <p className="text-gray-700">A: Een score van 1-10 die aangeeft hoe makkelijk een product te repareren is. 10 = zeer goed repareerbaar.</p>
              </div>
              <div>
                <p className="font-semibold">V: Zijn de EU ESPR-velden verplicht?</p>
                <p className="text-gray-700">A: Ja, vanaf 2025 zijn deze velden verplicht voor textielproducten in de EU.</p>
              </div>
              <div>
                <p className="font-semibold">V: Hoe kan ik de QR-code van een product downloaden?</p>
                <p className="text-gray-700">A: Open het product → klik op de QR-code → kies "Downloaden" of "Afdrukken".</p>
              </div>
            </div>
          </section>

          <section className="print:break-before-page mt-12">
            <div className="text-center p-8 bg-gray-50 rounded-lg print:border">
              <h2 className="text-xl font-bold text-gwc-primary mb-4">Contact & Support</h2>
              <p className="mb-2"><strong>Groningen Werkt Circulair</strong></p>
              <p className="text-gray-600 mb-4">
                Voor technische vragen of problemen met de app, neem contact op met je beheerder of het GWC support team.
              </p>
              <p className="text-sm text-gray-500">
                Laatste update: Januari 2025 | Versie: 1.0
              </p>
            </div>
          </section>
        </div>
      </div>

      <style>{`
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:break-before-page { break-before: page; }
          .print\\:break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}
