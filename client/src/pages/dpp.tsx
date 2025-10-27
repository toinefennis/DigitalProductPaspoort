import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, Share2, Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Product } from "@shared/schema";

export default function DPPPage() {
  const [, params] = useRoute("/dpp/:gtin");
  const gtin = params?.gtin;

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: [`/api/products/gtin/${gtin}`],
    enabled: !!gtin,
  });

  useEffect(() => {
    if (product) {
      document.title = `Digital Product Passport - ${product.name} | GWC DPP`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 
          `Digital Product Passport voor ${product.name}. GTIN: ${product.gtin}. Volledige productinformatie, duurzaamheidsgegevens en verzorgingsinstructies.`
        );
      }
    }
  }, [product]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Digital Product Passport - ${product?.name}`,
          text: `Bekijk het digitale productpaspoort voor ${product?.name}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link gekopieerd naar klembord!');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getCareSymbolEmoji = (symbol: string): string => {
    switch (symbol) {
      case "wash": return "🫧";
      case "bleach": return "⚪";
      case "dry": return "👕";
      case "iron": return "🔥";
      case "professional": return "🏪";
      default: return "📋";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Product niet gevonden</h2>
            <p className="text-muted-foreground">
              Het gevraagde Digital Product Passport kon niet worden gevonden.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b print:border-b-2">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-green-800 dark:text-green-400">
                Digital Product Passport
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                EU Ecodesign for Sustainable Products Regulation (ESPR)
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Product Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{product.name}</CardTitle>
                {product.brand && (
                  <p className="text-lg text-muted-foreground">{product.brand}</p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="secondary">{product.type}</Badge>
                  <Badge variant="outline">GTIN: {product.gtin}</Badge>
                  {product.status && <Badge>{product.status}</Badge>}
                </div>
              </div>
              {product.qrCodeData && (
                <div className="ml-4">
                  <img 
                    src={product.qrCodeData} 
                    alt="QR Code" 
                    className="w-24 h-24 border-2 border-gray-200 rounded"
                  />
                  <p className="text-xs text-center mt-1 text-muted-foreground">Scan voor DPP</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.photoUrl && (
              <img
                src={product.photoUrl}
                alt={product.name}
                className="w-full max-h-96 object-cover rounded-lg"
              />
            )}
            {product.description && (
              <div>
                <h3 className="font-semibold mb-2">Beschrijving</h3>
                <p className="text-muted-foreground">{product.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* EU Compliance Scores */}
        {(product.repairabilityIndex || product.durabilityScore) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🔧 EU Compliance Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {product.repairabilityIndex && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Repareerbaarheidsindex</span>
                    <Badge variant="outline">{product.repairabilityIndex}/10</Badge>
                  </div>
                  <Progress value={product.repairabilityIndex * 10} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.repairabilityIndex >= 7 && "Dit product is gemakkelijk te repareren"}
                    {product.repairabilityIndex >= 4 && product.repairabilityIndex < 7 && "Dit product kan gerepareerd worden"}
                    {product.repairabilityIndex < 4 && "Reparatie van dit product is beperkt mogelijk"}
                  </p>
                </div>
              )}
              
              {product.durabilityScore && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Duurzaamheidsscore</span>
                    <Badge variant="outline">{product.durabilityScore}/10</Badge>
                  </div>
                  <Progress value={product.durabilityScore * 10} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.durabilityScore >= 7 && "Dit product gaat zeer lang mee"}
                    {product.durabilityScore >= 4 && product.durabilityScore < 7 && "Dit product heeft een gemiddelde levensduur"}
                    {product.durabilityScore < 4 && "Dit product heeft een kortere levensduur"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Care Symbols */}
        {product.careSymbols && Array.isArray(product.careSymbols) && product.careSymbols.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>🧺 Verzorgingsinstructies (ISO 3758)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {product.careSymbols.map((symbol: any, index: number) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <span className="text-2xl">{getCareSymbolEmoji(symbol.symbol)}</span>
                    <span className="flex-1 text-sm">{symbol.description}</span>
                    {symbol.temperature && (
                      <Badge variant="secondary">{symbol.temperature}°C</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Environmental Impact */}
        {(product.waterFootprintLiters || product.energyConsumptionKwh || product.carbonFootprintDetailed) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🌍 Milieu Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {product.waterFootprintLiters && (
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {product.waterFootprintLiters.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Liters Water</div>
                    <p className="text-xs text-muted-foreground mt-2">Totaal waterverbruik</p>
                  </div>
                )}
                
                {product.energyConsumptionKwh && (
                  <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                      {product.energyConsumptionKwh}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">kWh Energie</div>
                    <p className="text-xs text-muted-foreground mt-2">Energieverbruik productie</p>
                  </div>
                )}

                {product.renewableEnergyPercentage !== null && product.renewableEnergyPercentage !== undefined && (
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {product.renewableEnergyPercentage}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Hernieuwbaar</div>
                    <p className="text-xs text-muted-foreground mt-2">Hernieuwbare energie</p>
                  </div>
                )}

                {product.carbonFootprintDetailed && (product.carbonFootprintDetailed as any).totalKg && (
                  <div className="text-center p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <div className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                      {(product.carbonFootprintDetailed as any).totalKg}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">kg CO₂e</div>
                    <p className="text-xs text-muted-foreground mt-2">Carbon footprint</p>
                  </div>
                )}

                {product.microplasticSheddingEstimated && (
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {(product.microplasticSheddingEstimated / 1000).toFixed(0)}k
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Vezels/wasbeurt</div>
                    <p className="text-xs text-muted-foreground mt-2">Microplastic afgifte</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Material Information */}
        {(product.material || product.origin || product.materialProperties) && (
          <Card>
            <CardHeader>
              <CardTitle>📦 Materiaal Informatie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {product.material && (
                <div>
                  <span className="font-medium">Materiaal: </span>
                  <span className="text-muted-foreground">{product.material}</span>
                </div>
              )}
              {product.origin && (
                <div>
                  <span className="font-medium">Herkomst: </span>
                  <span className="text-muted-foreground">{product.origin}</span>
                </div>
              )}
              {product.materialProperties && typeof product.materialProperties === 'object' && (
                <>
                  {(product.materialProperties as any).composition && (
                    <div>
                      <span className="font-medium">Samenstelling: </span>
                      <span className="text-muted-foreground">{(product.materialProperties as any).composition}</span>
                    </div>
                  )}
                  {(product.materialProperties as any).weight && (
                    <div>
                      <span className="font-medium">Gewicht: </span>
                      <span className="text-muted-foreground">{(product.materialProperties as any).weight}</span>
                    </div>
                  )}
                  {(product.materialProperties as any).recyclability && (
                    <div>
                      <span className="font-medium">Recyclebaarheid: </span>
                      <span className="text-muted-foreground">{(product.materialProperties as any).recyclability}</span>
                    </div>
                  )}
                  {(product.materialProperties as any).certifications && Array.isArray((product.materialProperties as any).certifications) && (
                    <div>
                      <span className="font-medium">Certificeringen: </span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {(product.materialProperties as any).certifications.map((cert: string, index: number) => (
                          <Badge key={index} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Dit Digital Product Passport is aangemaakt volgens de EU Ecodesign for Sustainable Products Regulation (ESPR)
              </p>
              <p className="text-xs text-muted-foreground">
                Groningen Werkt Circulair | {new Date().getFullYear()}
              </p>
              {product.dppUrl && (
                <p className="text-xs font-mono text-muted-foreground">
                  DPP URL: {product.dppUrl}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
