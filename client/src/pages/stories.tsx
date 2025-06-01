import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Eye,
  Plus,
  Filter,
  Search,
  Calendar,
  User,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
  Facebook,
  Twitter,
  Linkedin,
  Copy
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export default function Stories() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Check if user can moderate
  const canModerate = (currentUser as any)?.role === 'admin' || (currentUser as any)?.role === 'manager';

  // Moderation mutations
  const moderateStoryMutation = useMutation({
    mutationFn: async ({ id, status, moderationNotes }: { id: number; status: string; moderationNotes?: string }) => {
      const response = await fetch(`/api/stories/${id}/moderate`, {
        method: 'PATCH',
        body: JSON.stringify({ status, moderationNotes }),
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to moderate story');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      toast({
        title: "Verhaal gemodereerd",
        description: "Het verhaal is succesvol gemodereerd.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het modereren.",
        variant: "destructive",
      });
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/stories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to delete story');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      toast({
        title: "Verhaal verwijderd",
        description: "Het verhaal is succesvol verwijderd.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Fout",
        description: error.message || "Er is een fout opgetreden bij het verwijderen.",
        variant: "destructive",
      });
    },
  });

  const handleModerate = (story: Story, status: string) => {
    moderateStoryMutation.mutate({ id: story.id, status });
  };

  const handleDelete = (story: Story) => {
    if (confirm(`Weet je zeker dat je het verhaal "${story.title}" wilt verwijderen?`)) {
      deleteStoryMutation.mutate(story.id);
    }
  };

  const handleEdit = (story: Story) => {
    setLocation(`/edit-story/${story.id}`);
  };

  // Social media sharing functions
  const shareOnFacebook = (story: Story) => {
    const url = `${window.location.origin}/stories`;
    const text = `${story.title} - Bekijk meer verhalen over circulaire economie`;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareOnTwitter = (story: Story) => {
    const url = `${window.location.origin}/stories`;
    const text = `Inspirerend verhaal: "${story.title}" 🌱 Ontdek meer circulaire verhalen op Groningen Werkt Circulair! #GroningenWerktCirculair #Duurzaamheid #CirculaireEconomie`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const shareOnLinkedIn = (story: Story) => {
    const url = `${window.location.origin}/stories`;
    const summary = `Ontdek inspirerende verhalen over circulaire economie en duurzaamheid in Groningen. "${story.title}" en meer verhalen op het Groningen Werkt Circulair platform.`;
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Groningen Werkt Circulair - Verhalen')}&summary=${encodeURIComponent(summary)}`;
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const copyStoryLink = (story: Story) => {
    const shareUrl = `${window.location.origin}/stories`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast({
        title: "Link gekopieerd!",
        description: "De link naar de verhalen pagina is naar het klembord gekopieerd.",
      });
    });
  };

  // Fetch stories
  const { data: stories, isLoading } = useQuery<Story[]>({
    queryKey: ["/api/stories", { search: searchQuery, tag: selectedTag, sort: sortBy }],
    enabled: true,
  });

  // Filter and sort stories
  const filteredStories = stories?.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         story.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = selectedTag === "all" || story.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  }) || [];

  // Get unique tags
  const allTags = Array.from(new Set(stories?.flatMap(story => story.tags) || []));

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto pb-20">
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto pb-20">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-medium">Verhalen</h1>
            <p className="text-sm text-gray-600">
              Circulaire verhalen van de community
            </p>
          </div>
          <Button
            onClick={() => setLocation("/share-story")}
            className="bg-gwc-primary hover:bg-gwc-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Verhaal Delen
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Zoek verhalen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Tag and Sort filters */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter op tag" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle tags</SelectItem>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sorteer op" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recent">Nieuwste</SelectItem>
                      <SelectItem value="popular">Populair</SelectItem>
                      <SelectItem value="mostLiked">Meest geliked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stories Grid */}
        {filteredStories.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nog geen verhalen</h3>
                <p className="text-gray-600 mb-4">
                  Wees de eerste om een circulair verhaal te delen!
                </p>
                <Button
                  onClick={() => setLocation("/share-story")}
                  className="bg-gwc-primary hover:bg-gwc-primary/90"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Eerst Verhaal Delen
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredStories.map((story) => (
              <Card key={story.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>
                          {story.authorName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{story.title}</CardTitle>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <User className="h-3 w-3" />
                          <span>{story.authorName}</span>
                          <Calendar className="h-3 w-3 ml-2" />
                          <span>
                            {formatDistanceToNow(new Date(story.createdAt), { 
                              addSuffix: true, 
                              locale: nl 
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Story Content */}
                  <p className="text-gray-700 leading-relaxed">
                    {story.content.length > 200 
                      ? `${story.content.substring(0, 200)}...` 
                      : story.content}
                  </p>

                  {/* Photos */}
                  {story.photos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {story.photos.slice(0, 4).map((photo, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={photo} 
                            alt={`Story foto ${index + 1}`}
                            className="w-full h-32 object-cover rounded"
                          />
                          {index === 3 && story.photos.length > 4 && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                              <span className="text-white font-medium">
                                +{story.photos.length - 4} meer
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tags */}
                  {story.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {story.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Status Badge for Moderators */}
                  {canModerate && story.status && (
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={story.status === 'approved' ? 'default' : story.status === 'pending' ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {story.status === 'approved' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {story.status === 'pending' && <AlertTriangle className="h-3 w-3 mr-1" />}
                        {story.status === 'rejected' && <XCircle className="h-3 w-3 mr-1" />}
                        {story.status === 'approved' ? 'Goedgekeurd' : 
                         story.status === 'pending' ? 'In afwachting' : 'Afgewezen'}
                      </Badge>
                      {story.moderatedBy && (
                        <span className="text-xs text-gray-500">door {story.moderatedBy}</span>
                      )}
                    </div>
                  )}

                  {/* Stats and Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-4 w-4" />
                        <span>{story.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{story.comments}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Eye className="h-4 w-4" />
                        <span>{story.views}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm">
                        <Heart className="h-4 w-4 mr-1" />
                        Like
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="h-4 w-4 mr-1" />
                        Delen
                      </Button>
                    </div>
                  </div>

                  {/* Moderation Actions for Admin/Manager */}
                  {canModerate && (
                    <div className="border-t pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-600">Moderatie</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {story.status !== 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleModerate(story, 'approved')}
                              disabled={moderateStoryMutation.isPending}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Goedkeuren
                            </Button>
                          )}
                          {story.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleModerate(story, 'rejected')}
                              disabled={moderateStoryMutation.isPending}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Afwijzen
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(story)}
                            disabled={deleteStoryMutation.isPending}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Verwijderen
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

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