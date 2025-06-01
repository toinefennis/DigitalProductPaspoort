import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Story {
  id: number;
  title: string;
  content: string;
  authorName: string;
  authorId: string;
  photos: string[];
  tags: string[];
  likes: number;
  comments: number;
  views: number;
  isPublic: boolean;
  status?: string;
  moderatedBy?: string;
  moderationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export default function EditStory() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get story ID from URL
  const storyId = window.location.pathname.split('/').pop();
  
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    tags: "",
    isPublic: true,
  });

  // Fetch story data
  const { data: stories } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
  });

  const story = stories?.find(s => s.id === parseInt(storyId || "0"));

  // Update form when story loads
  useEffect(() => {
    if (story) {
      setFormData({
        title: story.title,
        content: story.content,
        tags: story.tags.join(", "),
        isPublic: story.isPublic,
      });
    }
  }, [story]);

  // Update story mutation
  const updateStoryMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest(`/api/stories/${storyId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Verhaal bijgewerkt!",
        description: "Je verhaal is succesvol aangepast.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      setLocation("/stories");
    },
    onError: (error) => {
      toast({
        title: "Fout bij bijwerken",
        description: "Er is iets misgegaan bij het bijwerken van je verhaal.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Velden vereist",
        description: "Titel en verhaal zijn verplichte velden.",
        variant: "destructive",
      });
      return;
    }

    updateStoryMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!story) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center py-8">
          <p className="text-gray-600">Verhaal niet gevonden</p>
          <Button
            onClick={() => setLocation("/stories")}
            className="mt-4"
          >
            Terug naar verhalen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/stories")}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Terug naar verhalen</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-gwc-primary">
            Verhaal Bewerken
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Titel *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Geef je verhaal een titel..."
                required
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content">Verhaal *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                placeholder="Vertel je verhaal..."
                className="min-h-[200px]"
                required
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => handleInputChange("tags", e.target.value)}
                placeholder="hergebruik, duurzaam, circulair (gescheiden door komma's)"
              />
              <p className="text-sm text-gray-600">
                Tags helpen anderen je verhaal te vinden
              </p>
            </div>

            {/* Privacy */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublic"
                checked={formData.isPublic}
                onCheckedChange={(checked) => handleInputChange("isPublic", checked)}
              />
              <Label htmlFor="isPublic" className="text-sm">
                Maak dit verhaal openbaar voor anderen
              </Label>
            </div>

            {/* MVP Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>MVP Versie:</strong> Dit is een vroege versie van de verhalen functie. 
                Foto uploaden en enkele andere functies worden nog verder ontwikkeld.
              </p>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/stories")}
              >
                Annuleren
              </Button>
              <Button
                type="submit"
                disabled={updateStoryMutation.isPending}
                className="bg-gwc-primary hover:bg-gwc-primary/90"
              >
                {updateStoryMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Bijwerken...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Bijwerken
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}