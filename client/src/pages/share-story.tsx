import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Camera, 
  Share2, 
  Facebook, 
  Twitter, 
  Instagram, 
  Linkedin,
  Heart,
  MessageCircle,
  Eye,
  Plus,
  Trash2,
  Package,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import type { Product } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

const storySchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  content: z.string().min(10, "Verhaal moet minstens 10 karakters bevatten"),
  tags: z.string().optional(),
  isPublic: z.boolean().default(true),
  productId: z.number().optional(),
});

type StoryFormData = z.infer<typeof storySchema>;

export default function ShareStory() {
  const [location, setLocation] = useLocation();
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Parse URL parameters for product-linked stories
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const productId = urlParams.get('productId');
  const gtin = urlParams.get('gtin');

  // Fetch product data if productId is provided
  const { data: product } = useQuery<Product>({
    queryKey: [`/api/products/${productId}`],
    enabled: !!productId,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      isPublic: true,
    },
  });

  // Handle photo selection
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedPhotos(prev => [...prev, ...files]);
      
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPhotoPreviews(prev => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  // Create story mutation
  const createStoryMutation = useMutation({
    mutationFn: async (data: StoryFormData) => {
      const formData = new FormData();
      
      // Add story data
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });

      // Add author info
      formData.append("authorName", (currentUser as any)?.fullName || "Anonymous");
      formData.append("authorId", (currentUser as any)?.id?.toString() || "");

      // Add photos
      selectedPhotos.forEach((photo, index) => {
        formData.append(`photos`, photo);
      });

      return fetch("/api/stories", {
        method: "POST",
        body: formData,
        credentials: "include",
      }).then(async (response) => {
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Failed to create story");
        }
        return response.json();
      });
    },
    onSuccess: (story) => {
      toast({
        title: "Verhaal gedeeld!",
        description: "Je verhaal is succesvol gedeeld.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      setShowShareOptions(true);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Er is een fout opgetreden bij het delen van je verhaal.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StoryFormData) => {
    // Add productId if available
    if (productId) {
      data.productId = parseInt(productId);
    }
    createStoryMutation.mutate(data);
  };

  // Social media sharing functions
  const shareOnFacebook = (title: string, url: string) => {
    const fullUrl = `${window.location.origin}/stories`;
    const shareText = `${title} - Bekijk meer verhalen over circulaire economie`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(fullUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = (title: string, url: string) => {
    const fullUrl = `${window.location.origin}/stories`;
    const text = `Ik heb zojuist een verhaal gedeeld: "${title}" 🌱 Ontdek meer circulaire verhalen op Groningen Werkt Circulair! #GroningenWerktCirculair #Duurzaamheid #CirculaireEconomie`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(fullUrl)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareOnLinkedIn = (title: string, url: string) => {
    const fullUrl = `${window.location.origin}/stories`;
    const summary = `Ontdek inspirerende verhalen over circulaire economie en duurzaamheid in Groningen. "${title}" en meer verhalen op het Groningen Werkt Circulair platform.`;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}&title=${encodeURIComponent('Groningen Werkt Circulair - Verhalen')}&summary=${encodeURIComponent(summary)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const copyToClipboard = () => {
    const shareUrl = `${window.location.origin}/stories`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link gekopieerd!",
        description: "De link naar de verhalen pagina is naar het klembord gekopieerd.",
      });
    });
  };

  if (showShareOptions) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-xl font-medium mb-2">Verhaal Gedeeld!</h1>
            <p className="text-gray-600">Je verhaal is nu zichtbaar voor anderen. Deel het op sociale media!</p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Share2 className="h-5 w-5" />
                <span>Deel op sociale media</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => shareOnFacebook("Mijn circulaire verhaal", window.location.href)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Facebook className="h-4 w-4 mr-2" />
                  Facebook
                </Button>
                <Button
                  onClick={() => shareOnTwitter("Mijn circulaire verhaal", window.location.href)}
                  className="bg-sky-500 hover:bg-sky-600 text-white"
                >
                  <Twitter className="h-4 w-4 mr-2" />
                  Twitter
                </Button>
                <Button
                  onClick={() => shareOnLinkedIn("Mijn circulaire verhaal", window.location.href)}
                  className="bg-blue-700 hover:bg-blue-800 text-white"
                >
                  <Linkedin className="h-4 w-4 mr-2" />
                  LinkedIn
                </Button>
                <Button
                  onClick={copyToClipboard}
                  variant="outline"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Link kopiëren
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-center space-x-4">
            <Button
              onClick={() => setLocation("/stories")}
              variant="outline"
            >
              <Eye className="h-4 w-4 mr-2" />
              Bekijk verhalen
            </Button>
            <Button
              onClick={() => {
                setShowShareOptions(false);
                setSelectedPhotos([]);
                setPhotoPreviews([]);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nieuw verhaal
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-medium">Verhaal Delen</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Product Information */}
        {product && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Package className="h-5 w-5 text-gwc-primary" />
                <div>
                  <CardTitle className="text-lg">Gekoppeld aan Product</CardTitle>
                  <p className="text-sm text-gray-600">
                    {product.name} • GTIN: {product.gtin}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>{product ? "Deel je product ervaring" : "Deel je circulaire verhaal"}</span>
            </CardTitle>
            <p className="text-sm text-gray-600">
              {product 
                ? "Vertel anderen over je ervaring met dit product - reparaties, gebruik, tips of duurzame toepassingen."
                : "Vertel anderen over je ervaring met circulaire economie, hergebruik, of duurzaamheid."
              }
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <div>
                <Label htmlFor="title">Titel *</Label>
                <Input
                  id="title"
                  {...register("title")}
                  placeholder="Geef je verhaal een pakkende titel..."
                />
                {errors.title && (
                  <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
                )}
              </div>

              {/* Content */}
              <div>
                <Label htmlFor="content">Verhaal *</Label>
                <Textarea
                  id="content"
                  {...register("content")}
                  placeholder="Vertel je verhaal... Wat heb je hergebruikt? Hoe draag je bij aan de circulaire economie?"
                  className="h-32"
                />
                {errors.content && (
                  <p className="text-sm text-red-600 mt-1">{errors.content.message}</p>
                )}
              </div>

              {/* Tags */}
              <div>
                <Label htmlFor="tags">Tags (optioneel)</Label>
                <Input
                  id="tags"
                  {...register("tags")}
                  placeholder="hergebruik, duurzaam, circulair, upcycling..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Gescheiden door komma's
                </p>
              </div>

              {/* Photo Upload */}
              <div>
                <Label className="block text-sm font-medium mb-2">Foto's (optioneel)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      Tap om foto's toe te voegen
                    </p>
                  </label>
                </div>

                {/* Photo Previews */}
                {photoPreviews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 h-6 w-6 p-0"
                          onClick={() => removePhoto(index)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Public/Private Toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  {...register("isPublic")}
                  className="rounded"
                />
                <Label htmlFor="isPublic" className="text-sm">
                  Publiek maken (anderen kunnen je verhaal zien)
                </Label>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/")}
                >
                  Annuleren
                </Button>
                <Button 
                  type="submit"
                  disabled={createStoryMutation.isPending}
                >
                  {createStoryMutation.isPending ? "Delen..." : "Verhaal Delen"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* MVP Disclaimer */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-700 text-center">
            <strong>MVP Disclaimer:</strong> Dit is een proof-of-concept voor het Groningen Werkt Circulair pilot project. 
            Voor meer informatie bezoek{" "}
            <a 
              href="https://groningenwerktcirculair.info" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:text-blue-800"
            >
              groningenwerktcirculair.info
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}