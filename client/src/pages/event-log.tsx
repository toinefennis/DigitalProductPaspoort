import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Package, Wrench, Clock, RotateCcw, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertEventSchema, type Product } from "@shared/schema";

const formSchema = insertEventSchema.extend({
  photo: z.instanceof(File).optional(),
  // Add loan duration helper field
  loanDurationWeeks: z.number().min(1).max(52).default(3),
}).omit({
  productId: true,
  photoUrl: true,
});

type FormData = z.infer<typeof formSchema>;

export default function EventLog() {
  const params = useParams();
  const [location, setLocation] = useLocation();
  const [selectedEventType, setSelectedEventType] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const productId = parseInt(params.productId || "0");
  const urlSearchParams = new URLSearchParams(location.split("?")[1] || "");
  const suggestedType = urlSearchParams.get("type") || "";

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    reset,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      eventType: suggestedType,
      description: "",
    },
  });

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  useEffect(() => {
    if (suggestedType) {
      setSelectedEventType(suggestedType);
      setValue("eventType", suggestedType);
    }
  }, [suggestedType, setValue]);

  // Calculate default return date when loan is selected
  useEffect(() => {
    if (selectedEventType === "uitleen") {
      const defaultWeeks = 3;
      const returnDate = new Date();
      returnDate.setDate(returnDate.getDate() + (defaultWeeks * 7));
      setValue("expectedReturn", returnDate);
      setValue("loanDurationWeeks", defaultWeeks);
    }
  }, [selectedEventType, setValue]);

  const createEventMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const formData = new FormData();
      
      // Add productId
      formData.append("productId", productId.toString());
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === "photo") return;
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            formData.append(key, value.toISOString());
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Add photo if selected
      if (selectedPhoto) {
        formData.append("photo", selectedPhoto);
      }

      const response = await fetch("/api/events", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create event");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Event succesvol opgeslagen!",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/activities"] });
      setLocation(`/product/${productId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Er is een fout opgetreden bij het opslaan van het event.",
        variant: "destructive",
      });
    },
  });

  const handleEventTypeSelect = (eventType: string) => {
    setSelectedEventType(eventType);
    setValue("eventType", eventType);
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: FormData) => {
    createEventMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-lg font-medium mb-2">Product niet gevonden</h2>
            <Button onClick={() => setLocation("/")}>
              Terug naar Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium">Nieuw Event</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation(`/product/${productId}`)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Product Info */}
        <Card className="mb-6 bg-gray-50">
          <CardContent className="p-4 flex items-center space-x-3">
            <Package className="h-5 w-5 text-gwc-primary" />
            <div>
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-gray-600">GTIN: {product.gtin}</p>
            </div>
          </CardContent>
        </Card>

        {/* Event Type Selection */}
        <div className="mb-6">
          <Label className="block text-sm font-medium mb-3">Event Type</Label>
          <div className="grid grid-cols-3 gap-3">
            <Button
              type="button"
              variant="outline"
              className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                selectedEventType === "reparatie"
                  ? "border-gwc-primary bg-gwc-primary bg-opacity-10"
                  : "border-gray-200 hover:border-gwc-primary"
              }`}
              onClick={() => handleEventTypeSelect("reparatie")}
            >
              <Wrench className="h-6 w-6 text-gwc-primary" />
              <span className="text-sm font-medium">Reparatie</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                selectedEventType === "uitleen"
                  ? "border-gwc-warning bg-gwc-warning bg-opacity-10"
                  : "border-gray-200 hover:border-gwc-warning"
              }`}
              onClick={() => handleEventTypeSelect("uitleen")}
            >
              <Clock className="h-6 w-6 text-gwc-warning" />
              <span className="text-sm font-medium">Uitleen</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              className={`p-4 h-auto flex flex-col items-center space-y-2 ${
                selectedEventType === "retour"
                  ? "border-gwc-success bg-gwc-success bg-opacity-10"
                  : "border-gray-200 hover:border-gwc-success"
              }`}
              onClick={() => handleEventTypeSelect("retour")}
            >
              <RotateCcw className="h-6 w-6 text-gwc-success" />
              <span className="text-sm font-medium">Retour</span>
            </Button>
          </div>
        </div>

        {/* Dynamic Form Based on Event Type */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Repair Form Fields */}
          {selectedEventType === "reparatie" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Reparatie Omschrijving *</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  rows={3}
                  placeholder="Beschrijf wat er gerepareerd is..."
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>
              
              <div>
                <Label className="block text-sm font-medium mb-2">Foto van reparatie</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center bg-gray-50 relative overflow-hidden">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-1" />
                      <p className="text-xs text-gray-600">Optioneel</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Loan Form Fields */}
          {selectedEventType === "uitleen" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="borrowerName">Naam uitlener *</Label>
                  <Input
                    id="borrowerName"
                    {...register("borrowerName")}
                    placeholder="Voor- en achternaam"
                    className={errors.borrowerName ? "border-red-500" : ""}
                  />
                  {errors.borrowerName && (
                    <p className="text-sm text-red-500 mt-1">{errors.borrowerName.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="borrowerPhone">Telefoonnummer</Label>
                  <Input
                    id="borrowerPhone"
                    {...register("borrowerPhone")}
                    placeholder="06-12345678"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="borrowerEmail">Email adres *</Label>
                <Input
                  id="borrowerEmail"
                  type="email"
                  {...register("borrowerEmail")}
                  placeholder="email@voorbeeld.com"
                  className={errors.borrowerEmail ? "border-red-500" : ""}
                />
                {errors.borrowerEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.borrowerEmail.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="borrowerAddress">Adres</Label>
                <Textarea
                  id="borrowerAddress"
                  {...register("borrowerAddress")}
                  rows={2}
                  placeholder="Straat, huisnummer, postcode, plaats"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="loanDurationWeeks">Uitleentermijn (weken)</Label>
                  <Input
                    id="loanDurationWeeks"
                    type="number"
                    min="1"
                    max="52"
                    defaultValue="3"
                    {...register("loanDurationWeeks", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label htmlFor="loanReference">Referentie</Label>
                  <Input
                    id="loanReference"
                    {...register("loanReference")}
                    placeholder="Naam of referentie nummer"
                    className={errors.loanReference ? "border-red-500" : ""}
                  />
                  {errors.loanReference && (
                    <p className="text-sm text-red-500 mt-1">{errors.loanReference.message}</p>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="expectedReturn">Verwachte retour datum</Label>
                <Input
                  id="expectedReturn"
                  type="date"
                  {...register("expectedReturn", {
                    setValueAs: (value) => value ? new Date(value) : undefined,
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Omschrijving</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  rows={2}
                  placeholder="Eventuele opmerkingen over de uitleen..."
                />
              </div>
            </div>
          )}

          {/* Return Form Fields */}
          {selectedEventType === "retour" && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="returnCondition">Staat bij retour</Label>
                <Select onValueChange={(value) => setValue("returnCondition", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecteer staat..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">Goede staat</SelectItem>
                    <SelectItem value="worn">Normaal gebruik</SelectItem>
                    <SelectItem value="damaged">Beschadigd</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="returnNotes">Opmerkingen</Label>
                <Textarea
                  id="returnNotes"
                  {...register("returnNotes")}
                  rows={2}
                  placeholder="Eventuele opmerkingen over de staat..."
                />
              </div>
              
              <div>
                <Label htmlFor="description">Beschrijving retour *</Label>
                <Input
                  id="description"
                  {...register("description")}
                  placeholder="Korte beschrijving van de retour"
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          {selectedEventType && (
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setLocation(`/product/${productId}`)}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gwc-primary hover:bg-gwc-primary/90 text-white"
                disabled={createEventMutation.isPending}
              >
                {createEventMutation.isPending ? "Opslaan..." : "Event Opslaan"}
              </Button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
