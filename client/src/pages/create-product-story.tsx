import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams, useRoute } from "wouter";
import { z } from "zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  Camera, 
  Upload, 
  X, 
  Package, 
  Share2, 
  Eye, 
  EyeOff,
  QrCode,
  ArrowLeft,
  Tag
} from "lucide-react";
import type { Product } from "@shared/schema";

const storySchema = z.object({
  title: z.string().min(3, "Titel moet minimaal 3 karakters bevatten"),
  content: z.string().min(10, "Inhoud moet minimaal 10 karakters bevatten"),
  tags: z.string().optional(),
  isPublic: z.boolean().default(true),
});

type StoryFormData = z.infer<typeof storySchema>;

export default function CreateProductStory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoURLs, setPhotoURLs] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get route parameters
  const [matchProduct, paramsProduct] = useRoute("/create-product-story/:productId");
  const [matchGtin, paramsGtin] = useRoute("/create-product-story/gtin/:gtin");
  
  const productId = paramsProduct?.productId;
  const gtin = paramsGtin?.gtin;

  // Get product data if we have a productId
  const { data: product, isLoading: productLoading } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  // Find product by GTIN if no productId provided
  const { data: products } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    enabled: !productId && !!gtin,
  });

  const productFromGtin = products?.find(p => p.gtin === gtin);
  const targetProduct = product || productFromGtin;

  const form = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      title: "",
      content: "",
      tags: "",
      isPublic: true,
    },
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data: StoryFormData & { photos: File[] }) => {
      const formData = new FormData();
      
      // Add photos
      data.photos.forEach((photo, index) => {
        formData.append("photos", photo);
      });

      // Add story data
      formData.append("title", data.title);
      formData.append("content", data.content);
      formData.append("authorName", (user as any)?.fullName || (user as any)?.username || "Onbekende gebruiker");
      formData.append("authorId", (user as any)?.id?.toString() || "");
      formData.append("tags", data.tags || "");
      formData.append("isPublic", data.isPublic.toString());
      
      if (targetProduct) {
        formData.append("productId", targetProduct.id.toString());
      }

      return await apiRequest("/api/stories", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Story aangemaakt",
        description: "Je product story is succesvol aangemaakt en kan nu gedeeld worden!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      navigate("/stories");
    },
    onError: (error) => {
      toast({
        title: "Fout bij aanmaken",
        description: error.message || "Er ging iets mis bij het aanmaken van de story",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: StoryFormData) => {
    createStoryMutation.mutate({ ...data, photos });
  };

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 photos total
    const totalPhotos = photos.length + files.length;
    if (totalPhotos > 5) {
      toast({
        title: "Te veel foto's",
        description: "Je kunt maximaal 5 foto's uploaden",
        variant: "destructive",
      });
      return;
    }

    const newPhotos = [...photos, ...files];
    setPhotos(newPhotos);

    // Create preview URLs
    const newURLs = files.map(file => URL.createObjectURL(file));
    setPhotoURLs(prev => [...prev, ...newURLs]);
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    const newURLs = photoURLs.filter((_, i) => i !== index);
    
    // Revoke the URL to prevent memory leaks
    if (photoURLs[index]) {
      URL.revokeObjectURL(photoURLs[index]);
    }
    
    setPhotos(newPhotos);
    setPhotoURLs(newURLs);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (productLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Terug
          </Button>
          <div>
            <h1 className="text-xl font-medium">Product Story Maken</h1>
            <p className="text-sm text-gray-600">
              Deel je ervaring met dit product
            </p>
          </div>
        </div>

        {/* Product Info */}
        {targetProduct && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-gwc-primary" />
                <div>
                  <CardTitle className="text-lg">{targetProduct.name}</CardTitle>
                  <CardDescription>
                    GTIN: {targetProduct.gtin} • {targetProduct.brand}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        {/* Story Form */}
        <Card>
          <CardHeader>
            <CardTitle>Je Story</CardTitle>
            <CardDescription>
              Vertel je verhaal over dit product - reparaties, gebruik, tips of ervaringen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Bijvoorbeeld: 'Mijn reparatie van deze trui' of 'Waarom ik dit product erg fijn vind'"
                  className={form.formState.errors.title ? "border-red-500" : ""}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500">{form.formState.errors.title.message}</p>
                )}
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">Verhaal *</Label>
                <Textarea
                  id="content"
                  {...form.register("content")}
                  placeholder="Vertel je verhaal... Wat heb je gedaan? Hoe ging het? Wat leerde je ervan?"
                  rows={6}
                  className={form.formState.errors.content ? "border-red-500" : ""}
                />
                {form.formState.errors.content && (
                  <p className="text-sm text-red-500">{form.formState.errors.content.message}</p>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <div className="flex items-center space-x-2">
                  <Tag className="h-4 w-4 text-gray-500" />
                  <Input
                    id="tags"
                    {...form.register("tags")}
                    placeholder="Bijvoorbeeld: reparatie, duurzaam, tips (gescheiden door komma's)"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Voeg tags toe om je story makkelijker vindbaar te maken
                </p>
              </div>

              {/* Photo Upload */}
              <div className="space-y-4">
                <Label>Foto's</Label>
                
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-4">
                    Voeg foto's toe om je verhaal te illustreren
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={triggerFileInput}
                    disabled={photos.length >= 5}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {photos.length > 0 ? "Meer foto's toevoegen" : "Foto's uploaden"}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    Maximaal 5 foto's • JPG, PNG
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                {/* Photo Previews */}
                {photoURLs.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {photoURLs.map((url, index) => (
                      <div key={index} className="relative">
                        <img
                          src={url}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2 h-6 w-6 p-0"
                          onClick={() => removePhoto(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Privacy Settings */}
              <div className="space-y-4">
                <Label>Privacy & Delen</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {form.watch("isPublic") ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {form.watch("isPublic") ? "Openbaar" : "Privé"}
                      </p>
                      <p className="text-sm text-gray-600">
                        {form.watch("isPublic") 
                          ? "Iedereen kan je story zien en delen"
                          : "Alleen moderators kunnen je story zien"
                        }
                      </p>
                    </div>
                  </div>
                  <Switch
                    {...form.register("isPublic")}
                    checked={form.watch("isPublic")}
                    onCheckedChange={(checked) => form.setValue("isPublic", checked)}
                  />
                </div>
              </div>

              {/* Share Preview */}
              {form.watch("isPublic") && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Share2 className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-blue-900">Sociaal Delen</p>
                      <p className="text-sm text-blue-700">
                        Je story wordt gekoppeld aan het product GTIN en kan gedeeld worden via een speciale link. 
                        Anderen kunnen via de QR-code of GTIN jouw ervaring met dit product vinden.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex space-x-3">
                <Button
                  type="submit"
                  disabled={createStoryMutation.isPending}
                  className="flex-1"
                >
                  {createStoryMutation.isPending ? "Aanmaken..." : "Story Publiceren"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                >
                  Annuleren
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}