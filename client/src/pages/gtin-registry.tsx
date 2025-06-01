import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Save, Trash2, Edit, FileText, Globe, Factory, Recycle, Shield, Leaf } from "lucide-react";
import type { GtinRegistry, InsertGtinRegistry } from "@shared/schema";

// Comprehensive GTIN Registry schema based on DPP requirements
const gtinRegistrySchema = z.object({
  // Basic Product Identification
  gtin: z.string().min(8, "GTIN must be at least 8 digits").max(14, "GTIN must be at most 14 digits"),
  productName: z.string().min(1, "Product name is required"),
  brandName: z.string().optional(),
  modelNumber: z.string().optional(),
  productCategory: z.string().optional(),
  productDescription: z.string().optional(),
  
  // DPP Specific Fields
  uniqueProductId: z.string().optional(),
  batchNumber: z.string().optional(),
  serialNumber: z.string().optional(),
  countryOfOrigin: z.string().length(2, "Country code must be 2 characters").optional(),
  productionDate: z.string().optional(),
  
  // Economic Operator & Facility
  economicOperatorId: z.string().optional(),
  productionFacilityId: z.string().optional(),
  registrationId: z.string().optional(),
  
  // Product Physical Properties
  productWeight: z.number().positive().optional(),
  productSize: z.string().optional(),
  productColor: z.string().optional(),
  
  // Material Composition
  fiberComposition: z.string().optional(),
  recycledContent: z.string().optional(),
  materialOrigins: z.string().optional(),
  materialCertifications: z.string().optional(),
  
  // Production & Supply Chain
  productionCountry: z.string().length(2, "Country code must be 2 characters").optional(),
  productionFacilities: z.string().optional(),
  productionProcesses: z.string().optional(),
  supplierInformation: z.string().optional(),
  
  // Sustainability & Compliance
  sustainabilityData: z.string().optional(),
  chemicalCompliance: z.string().optional(),
  socialCompliance: z.string().optional(),
  circularityData: z.string().optional(),
  
  // Care & End of Life
  careInstructions: z.string().optional(),
  endOfLifeInstructions: z.string().optional(),
  
  // Regulatory & Market
  intendedMarkets: z.string().optional(),
  regulatoryCompliance: z.string().optional(),
});

type GtinRegistryFormData = z.infer<typeof gtinRegistrySchema>;

// Country codes for dropdowns
const countryCodes = [
  { code: "DE", name: "Germany" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "BD", name: "Bangladesh" },
  { code: "VN", name: "Vietnam" },
  { code: "TR", name: "Turkey" },
  { code: "US", name: "United States" },
];

// Product categories
const productCategories = [
  "T-shirt", "Jeans", "Jas", "Huishoudtextiel", "Accessoires", 
  "Sportkleding", "Ondergoed", "Schoenen", "Tassen", "Andere"
];

export default function GtinRegistry() {
  const [selectedRegistry, setSelectedRegistry] = useState<GtinRegistry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all GTIN registries
  const { data: registries, isLoading } = useQuery<GtinRegistry[]>({
    queryKey: ["/api/gtin-registry"],
  });

  const form = useForm<GtinRegistryFormData>({
    resolver: zodResolver(gtinRegistrySchema),
    defaultValues: {
      gtin: "",
      productName: "",
      brandName: "",
      modelNumber: "",
      productCategory: "",
      productDescription: "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: GtinRegistryFormData) => {
      const processedData = {
        ...data,
        productWeight: data.productWeight ? Number(data.productWeight) : undefined,
        fiberComposition: data.fiberComposition ? JSON.parse(data.fiberComposition) : null,
        recycledContent: data.recycledContent ? JSON.parse(data.recycledContent) : null,
        materialOrigins: data.materialOrigins ? JSON.parse(data.materialOrigins) : null,
        materialCertifications: data.materialCertifications ? JSON.parse(data.materialCertifications) : null,
        productionFacilities: data.productionFacilities ? JSON.parse(data.productionFacilities) : null,
        supplierInformation: data.supplierInformation ? JSON.parse(data.supplierInformation) : null,
        sustainabilityData: data.sustainabilityData ? JSON.parse(data.sustainabilityData) : null,
        chemicalCompliance: data.chemicalCompliance ? JSON.parse(data.chemicalCompliance) : null,
        socialCompliance: data.socialCompliance ? JSON.parse(data.socialCompliance) : null,
        circularityData: data.circularityData ? JSON.parse(data.circularityData) : null,
        intendedMarkets: data.intendedMarkets ? JSON.parse(data.intendedMarkets) : null,
        regulatoryCompliance: data.regulatoryCompliance ? JSON.parse(data.regulatoryCompliance) : null,
      };
      
      return await apiRequest("/api/gtin-registry", {
        method: "POST",
        body: JSON.stringify(processedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gtin-registry"] });
      form.reset();
      setIsEditing(false);
      toast({
        title: "Succes",
        description: "GTIN registratie succesvol aangemaakt",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon GTIN registratie niet aanmaken",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: GtinRegistryFormData) => {
      if (!selectedRegistry) throw new Error("Geen registratie geselecteerd");
      
      const processedData = {
        ...data,
        productWeight: data.productWeight ? Number(data.productWeight) : undefined,
      };
      
      return await apiRequest(`/api/gtin-registry/${selectedRegistry.id}`, {
        method: "PATCH",
        body: JSON.stringify(processedData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gtin-registry"] });
      setSelectedRegistry(null);
      setIsEditing(false);
      form.reset();
      toast({
        title: "Succes",
        description: "GTIN registratie succesvol bijgewerkt",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon GTIN registratie niet bijwerken",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/gtin-registry/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gtin-registry"] });
      setSelectedRegistry(null);
      toast({
        title: "Succes",
        description: "GTIN registratie succesvol verwijderd",
      });
    },
    onError: (error) => {
      toast({
        title: "Fout",
        description: "Kon GTIN registratie niet verwijderen",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (registry: GtinRegistry) => {
    setSelectedRegistry(registry);
    setIsEditing(true);
    form.reset({
      gtin: registry.gtin,
      productName: registry.productName,
      brandName: registry.brandName || "",
      modelNumber: registry.modelNumber || "",
      productCategory: registry.productCategory || "",
      productDescription: registry.productDescription || "",
      uniqueProductId: registry.uniqueProductId || "",
      batchNumber: registry.batchNumber || "",
      serialNumber: registry.serialNumber || "",
      countryOfOrigin: registry.countryOfOrigin || "",
      productionDate: registry.productionDate || "",
      economicOperatorId: registry.economicOperatorId || "",
      productionFacilityId: registry.productionFacilityId || "",
      registrationId: registry.registrationId || "",
      productWeight: registry.productWeight || undefined,
      productSize: registry.productSize || "",
      productColor: registry.productColor || "",
      fiberComposition: registry.fiberComposition ? JSON.stringify(registry.fiberComposition, null, 2) : "",
      recycledContent: registry.recycledContent ? JSON.stringify(registry.recycledContent, null, 2) : "",
      materialOrigins: registry.materialOrigins ? JSON.stringify(registry.materialOrigins, null, 2) : "",
      materialCertifications: registry.materialCertifications ? JSON.stringify(registry.materialCertifications, null, 2) : "",
      productionCountry: registry.productionCountry || "",
      productionFacilities: registry.productionFacilities ? JSON.stringify(registry.productionFacilities, null, 2) : "",
      productionProcesses: registry.productionProcesses || "",
      supplierInformation: registry.supplierInformation ? JSON.stringify(registry.supplierInformation, null, 2) : "",
      sustainabilityData: registry.sustainabilityData ? JSON.stringify(registry.sustainabilityData, null, 2) : "",
      chemicalCompliance: registry.chemicalCompliance ? JSON.stringify(registry.chemicalCompliance, null, 2) : "",
      socialCompliance: registry.socialCompliance ? JSON.stringify(registry.socialCompliance, null, 2) : "",
      circularityData: registry.circularityData ? JSON.stringify(registry.circularityData, null, 2) : "",
      careInstructions: registry.careInstructions || "",
      endOfLifeInstructions: registry.endOfLifeInstructions || "",
      intendedMarkets: registry.intendedMarkets ? JSON.stringify(registry.intendedMarkets, null, 2) : "",
      regulatoryCompliance: registry.regulatoryCompliance ? JSON.stringify(registry.regulatoryCompliance, null, 2) : "",
    });
  };

  const handleSubmit = (data: GtinRegistryFormData) => {
    if (isEditing && selectedRegistry) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: number) => {
    if (confirm("Weet je zeker dat je deze GTIN registratie wilt verwijderen?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleNewRegistry = () => {
    setSelectedRegistry(null);
    setIsEditing(true);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gwc-primary mx-auto mb-4"></div>
          <p>GTIN registraties laden...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">GTIN Register</h1>
          <p className="text-gray-600">
            Uitgebreide productregistratie conform DPP vereisten voor textiel
          </p>
        </div>
        <Button onClick={handleNewRegistry} className="bg-gwc-primary hover:bg-gwc-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Nieuwe Registratie
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registry List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Geregistreerde GTIN's</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {registries?.map((registry) => (
                  <div
                    key={registry.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedRegistry?.id === registry.id
                        ? "border-gwc-primary bg-gwc-primary/5"
                        : "border-gray-200 hover:border-gwc-primary/50"
                    }`}
                    onClick={() => setSelectedRegistry(registry)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{registry.gtin}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {registry.productName}
                        </div>
                      </div>
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(registry);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(registry.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Registry Form/Details */}
        <div className="lg:col-span-2">
          {isEditing ? (
            /* Edit/Create Form */
            <Card>
              <CardHeader>
                <CardTitle>
                  {selectedRegistry ? "GTIN Registratie Bewerken" : "Nieuwe GTIN Registratie"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                      <TabsTrigger value="basic" className="flex items-center">
                        <FileText className="h-4 w-4 mr-1" />
                        Basis
                      </TabsTrigger>
                      <TabsTrigger value="production" className="flex items-center">
                        <Factory className="h-4 w-4 mr-1" />
                        Productie
                      </TabsTrigger>
                      <TabsTrigger value="materials" className="flex items-center">
                        <Recycle className="h-4 w-4 mr-1" />
                        Materialen
                      </TabsTrigger>
                      <TabsTrigger value="sustainability" className="flex items-center">
                        <Leaf className="h-4 w-4 mr-1" />
                        Duurzaamheid
                      </TabsTrigger>
                      <TabsTrigger value="compliance" className="flex items-center">
                        <Shield className="h-4 w-4 mr-1" />
                        Compliance
                      </TabsTrigger>
                      <TabsTrigger value="market" className="flex items-center">
                        <Globe className="h-4 w-4 mr-1" />
                        Markt
                      </TabsTrigger>
                    </TabsList>

                    {/* Basic Information Tab */}
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="gtin">GTIN *</Label>
                          <Input
                            id="gtin"
                            {...form.register("gtin")}
                            placeholder="1234567890123"
                          />
                          {form.formState.errors.gtin && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.gtin.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Label htmlFor="productName">Productnaam *</Label>
                          <Input
                            id="productName"
                            {...form.register("productName")}
                            placeholder="Duurzaam Katoenen T-shirt"
                          />
                          {form.formState.errors.productName && (
                            <p className="text-sm text-red-500 mt-1">
                              {form.formState.errors.productName.message}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="brandName">Merknaam</Label>
                          <Input
                            id="brandName"
                            {...form.register("brandName")}
                            placeholder="EcoBrand"
                          />
                        </div>
                        <div>
                          <Label htmlFor="modelNumber">Modelnummer</Label>
                          <Input
                            id="modelNumber"
                            {...form.register("modelNumber")}
                            placeholder="TX-550"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="productCategory">Productcategorie</Label>
                        <Select onValueChange={(value) => form.setValue("productCategory", value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecteer categorie" />
                          </SelectTrigger>
                          <SelectContent>
                            {productCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="productDescription">Productbeschrijving</Label>
                        <Textarea
                          id="productDescription"
                          {...form.register("productDescription")}
                          rows={3}
                          placeholder="Unisex T-shirt van biologisch katoen met ronde hals."
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label htmlFor="productWeight">Gewicht (gram)</Label>
                          <Input
                            id="productWeight"
                            type="number"
                            {...form.register("productWeight", { valueAsNumber: true })}
                            placeholder="150"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productSize">Maat</Label>
                          <Input
                            id="productSize"
                            {...form.register("productSize")}
                            placeholder="M"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productColor">Kleur</Label>
                          <Input
                            id="productColor"
                            {...form.register("productColor")}
                            placeholder="Marineblauw"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    {/* Production Tab */}
                    <TabsContent value="production" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="uniqueProductId">Unieke Product ID (URI)</Label>
                          <Input
                            id="uniqueProductId"
                            {...form.register("uniqueProductId")}
                            placeholder="https://id.gs1.org/01/01234567890128"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productionDate">Productiedatum</Label>
                          <Input
                            id="productionDate"
                            type="date"
                            {...form.register("productionDate")}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="batchNumber">Batch/Lotnummer</Label>
                          <Input
                            id="batchNumber"
                            {...form.register("batchNumber")}
                            placeholder="LOT2024Q1A"
                          />
                        </div>
                        <div>
                          <Label htmlFor="serialNumber">Serienummer</Label>
                          <Input
                            id="serialNumber"
                            {...form.register("serialNumber")}
                            placeholder="SN0012345"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="countryOfOrigin">Land van Herkomst</Label>
                          <Select onValueChange={(value) => form.setValue("countryOfOrigin", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer land" />
                            </SelectTrigger>
                            <SelectContent>
                              {countryCodes.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name} ({country.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="productionCountry">Productieland</Label>
                          <Select onValueChange={(value) => form.setValue("productionCountry", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecteer land" />
                            </SelectTrigger>
                            <SelectContent>
                              {countryCodes.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name} ({country.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="economicOperatorId">Economische Operator ID (GLN)</Label>
                          <Input
                            id="economicOperatorId"
                            {...form.register("economicOperatorId")}
                            placeholder="urn:epc:id:sgln:0614141.00000.0"
                          />
                        </div>
                        <div>
                          <Label htmlFor="productionFacilityId">Productiefaciliteit ID (GLN)</Label>
                          <Input
                            id="productionFacilityId"
                            {...form.register("productionFacilityId")}
                            placeholder="urn:epc:id:sgln:0614141.00001.0"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="productionProcesses">Productieprocessen</Label>
                        <Textarea
                          id="productionProcesses"
                          {...form.register("productionProcesses")}
                          rows={3}
                          placeholder="Geverfd met waterbesparende technieken, genaaid in een Fair Wear gecertificeerde fabriek."
                        />
                      </div>
                    </TabsContent>

                    {/* Materials Tab */}
                    <TabsContent value="materials" className="space-y-4">
                      <div>
                        <Label htmlFor="fiberComposition">Vezelsamenstelling (JSON)</Label>
                        <Textarea
                          id="fiberComposition"
                          {...form.register("fiberComposition")}
                          rows={3}
                          placeholder='[{"vezel": "CO", "percentage": 95}, {"vezel": "EL", "percentage": 5}]'
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          JSON formaat: Array van objecten met vezel en percentage
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="recycledContent">Gerecycled Materiaal (JSON)</Label>
                        <Textarea
                          id="recycledContent"
                          {...form.register("recycledContent")}
                          rows={3}
                          placeholder='{"vezel": "Polyester", "percentage_gerecycled": 70, "type_gerecycled": "Post-consumer"}'
                        />
                      </div>

                      <div>
                        <Label htmlFor="materialOrigins">Materiaalherkomst (JSON)</Label>
                        <Textarea
                          id="materialOrigins"
                          {...form.register("materialOrigins")}
                          rows={3}
                          placeholder='{"katoen": "IN", "polyester": "CN"}'
                        />
                      </div>

                      <div>
                        <Label htmlFor="materialCertifications">Materiaalsertificeringen (JSON)</Label>
                        <Textarea
                          id="materialCertifications"
                          {...form.register("materialCertifications")}
                          rows={3}
                          placeholder='[{"certificatienaam": "GOTS", "certificaat_id": "GOTS123", "gecertificeerd_materiaal": "Biologisch Katoen"}]'
                        />
                      </div>
                    </TabsContent>

                    {/* Sustainability Tab */}
                    <TabsContent value="sustainability" className="space-y-4">
                      <div>
                        <Label htmlFor="sustainabilityData">Duurzaamheidsdata (JSON)</Label>
                        <Textarea
                          id="sustainabilityData"
                          {...form.register("sustainabilityData")}
                          rows={3}
                          placeholder='{"co2_footprint": "2.1 kg CO2e", "water_usage": "1200L", "energy_consumption": "15 kWh"}'
                        />
                      </div>

                      <div>
                        <Label htmlFor="circularityData">Circulariteitsdata (JSON)</Label>
                        <Textarea
                          id="circularityData"
                          {...form.register("circularityData")}
                          rows={3}
                          placeholder='{"recycleerbaarheid": "95%", "repareerbaarheid": "Hoog", "gerecycled_materiaal": "70%"}'
                        />
                      </div>

                      <div>
                        <Label htmlFor="careInstructions">Verzorgingsinstructies</Label>
                        <Textarea
                          id="careInstructions"
                          {...form.register("careInstructions")}
                          rows={3}
                          placeholder="40°C normaal wassen, Hangend drogen, Gemiddelde temperatuur strijken"
                        />
                      </div>

                      <div>
                        <Label htmlFor="endOfLifeInstructions">Einde Levensduur Instructies</Label>
                        <Textarea
                          id="endOfLifeInstructions"
                          {...form.register("endOfLifeInstructions")}
                          rows={3}
                          placeholder="Geschikt voor textielrecycling, Inleveren bij textielinzamelpunt"
                        />
                      </div>
                    </TabsContent>

                    {/* Compliance Tab */}
                    <TabsContent value="compliance" className="space-y-4">
                      <div>
                        <Label htmlFor="chemicalCompliance">Chemische Compliance (JSON)</Label>
                        <Textarea
                          id="chemicalCompliance"
                          {...form.register("chemicalCompliance")}
                          rows={3}
                          placeholder='{"reach_compliant": true, "restricted_substances": [], "oeko_tex": "Standard 100"}'
                        />
                      </div>

                      <div>
                        <Label htmlFor="socialCompliance">Sociale Compliance (JSON)</Label>
                        <Textarea
                          id="socialCompliance"
                          {...form.register("socialCompliance")}
                          rows={3}
                          placeholder='{"fair_trade": true, "labor_standards": "ILO", "certifications": ["Fair Wear Foundation"]}'
                        />
                      </div>

                      <div>
                        <Label htmlFor="regulatoryCompliance">Regelgevingscompliance (JSON)</Label>
                        <Textarea
                          id="regulatoryCompliance"
                          {...form.register("regulatoryCompliance")}
                          rows={3}
                          placeholder='{"eu_ecolabel": false, "textile_regulation": "compliant", "dpp_ready": true}'
                        />
                      </div>

                      <div>
                        <Label htmlFor="registrationId">DPP Registratie ID</Label>
                        <Input
                          id="registrationId"
                          {...form.register("registrationId")}
                          placeholder="DPP-EU-2024-123456"
                        />
                      </div>
                    </TabsContent>

                    {/* Market Tab */}
                    <TabsContent value="market" className="space-y-4">
                      <div>
                        <Label htmlFor="intendedMarkets">Beoogde Markten (JSON)</Label>
                        <Textarea
                          id="intendedMarkets"
                          {...form.register("intendedMarkets")}
                          rows={3}
                          placeholder='["NL", "DE", "BE", "FR"]'
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Array van ISO 3166-1 alpha-2 landcodes
                        </p>
                      </div>

                      <div>
                        <Label htmlFor="supplierInformation">Leveranciersinformatie (JSON)</Label>
                        <Textarea
                          id="supplierInformation"
                          {...form.register("supplierInformation")}
                          rows={3}
                          placeholder='[{"tier": 1, "naam": "Kledingfabrikant BV", "id": "NL123456789"}]'
                        />
                      </div>

                      <div>
                        <Label htmlFor="productionFacilities">Productiefaciliteiten (JSON)</Label>
                        <Textarea
                          id="productionFacilities"
                          {...form.register("productionFacilities")}
                          rows={3}
                          placeholder='[{"processtap": "Spinnen", "faciliteitsnaam": "Spinnerij Noord", "gln": "1234567890123"}]'
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Form Actions */}
                  <div className="flex space-x-4">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="bg-gwc-primary hover:bg-gwc-primary/90"
                    >
                      {createMutation.isPending || updateMutation.isPending ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Opslaan...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          {selectedRegistry ? "Bijwerken" : "Aanmaken"}
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEditing(false);
                        setSelectedRegistry(null);
                        form.reset();
                      }}
                    >
                      Annuleren
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : selectedRegistry ? (
            /* Registry Details View */
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedRegistry.productName}</CardTitle>
                    <p className="text-sm text-gray-500">GTIN: {selectedRegistry.gtin}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={() => handleEdit(selectedRegistry)} size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Bewerken
                    </Button>
                    <Button
                      onClick={() => handleDelete(selectedRegistry.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Verwijderen
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList>
                    <TabsTrigger value="overview">Overzicht</TabsTrigger>
                    <TabsTrigger value="production">Productie</TabsTrigger>
                    <TabsTrigger value="materials">Materialen</TabsTrigger>
                    <TabsTrigger value="sustainability">Duurzaamheid</TabsTrigger>
                    <TabsTrigger value="compliance">Compliance</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Merk</Label>
                        <p>{selectedRegistry.brandName || "Niet opgegeven"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Categorie</Label>
                        <p>{selectedRegistry.productCategory || "Niet opgegeven"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Gewicht</Label>
                        <p>{selectedRegistry.productWeight ? `${selectedRegistry.productWeight}g` : "Niet opgegeven"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Kleur</Label>
                        <p>{selectedRegistry.productColor || "Niet opgegeven"}</p>
                      </div>
                    </div>
                    
                    {selectedRegistry.productDescription && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Beschrijving</Label>
                        <p className="text-sm">{selectedRegistry.productDescription}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="production" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Land van Herkomst</Label>
                        <p>{selectedRegistry.countryOfOrigin || "Niet opgegeven"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Productieland</Label>
                        <p>{selectedRegistry.productionCountry || "Niet opgegeven"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Batch Nummer</Label>
                        <p>{selectedRegistry.batchNumber || "Niet opgegeven"}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Serie Nummer</Label>
                        <p>{selectedRegistry.serialNumber || "Niet opgegeven"}</p>
                      </div>
                    </div>
                    
                    {selectedRegistry.productionProcesses && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Productieprocessen</Label>
                        <p className="text-sm">{selectedRegistry.productionProcesses}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="materials" className="space-y-4">
                    {selectedRegistry.fiberComposition && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Vezelsamenstelling</Label>
                        <pre className="text-xs bg-gray-50 p-2 rounded">
                          {JSON.stringify(selectedRegistry.fiberComposition, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {selectedRegistry.recycledContent && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Gerecycled Materiaal</Label>
                        <pre className="text-xs bg-gray-50 p-2 rounded">
                          {JSON.stringify(selectedRegistry.recycledContent, null, 2)}
                        </pre>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="sustainability" className="space-y-4">
                    {selectedRegistry.sustainabilityData && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Duurzaamheidsdata</Label>
                        <pre className="text-xs bg-gray-50 p-2 rounded">
                          {JSON.stringify(selectedRegistry.sustainabilityData, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {selectedRegistry.careInstructions && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Verzorgingsinstructies</Label>
                        <p className="text-sm">{selectedRegistry.careInstructions}</p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="compliance" className="space-y-4">
                    {selectedRegistry.chemicalCompliance && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Chemische Compliance</Label>
                        <pre className="text-xs bg-gray-50 p-2 rounded">
                          {JSON.stringify(selectedRegistry.chemicalCompliance, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {selectedRegistry.registrationId && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">DPP Registratie ID</Label>
                        <p className="text-sm font-mono">{selectedRegistry.registrationId}</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            /* No Selection State */
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Geen registratie geselecteerd
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Selecteer een GTIN registratie uit de lijst of maak een nieuwe aan
                  </p>
                  <Button onClick={handleNewRegistry} className="bg-gwc-primary hover:bg-gwc-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Nieuwe Registratie
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}