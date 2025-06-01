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
  User
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { nl } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

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
  createdAt: string;
  updatedAt: string;
}

export default function Stories() {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const { user: currentUser } = useAuth();

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
  const allTags = [...new Set(stories?.flatMap(story => story.tags) || [])];

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