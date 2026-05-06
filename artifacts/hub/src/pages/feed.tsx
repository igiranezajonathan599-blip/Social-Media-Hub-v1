import { useState } from "react";
import { useListPosts, getListPostsQueryKey, useCreatePost, useGetFeedStats, getGetFeedStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageIcon, Send, Loader2, RefreshCw, Users, MessageSquare, FileText } from "lucide-react";
import PostCard from "@/components/post-card";
import { Spinner } from "@/components/ui/spinner";

export default function Feed({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  
  const { data: posts, isLoading, isFetching } = useListPosts({});
  const { data: stats } = useGetFeedStats({ query: { queryKey: getGetFeedStatsQueryKey() }});
  const createPost = useCreatePost();

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !mediaUrl.trim()) return;

    createPost.mutate({
      data: {
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || undefined,
      }
    }, {
      onSuccess: () => {
        setContent("");
        setMediaUrl("");
        setShowMediaInput(false);
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetFeedStatsQueryKey() });
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <h1 className="text-2xl font-bold tracking-tight">Home Feed</h1>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full text-muted-foreground hover:text-foreground"
          onClick={() => queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() })}
          disabled={isFetching}
        >
          <RefreshCw className={`h-5 w-5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="max-w-2xl mx-auto w-full p-4 pb-24 md:pb-8 space-y-6">
          
          {/* Stats Bar */}
          {stats && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
                <FileText className="h-5 w-5 text-primary mb-1" />
                <span className="text-2xl font-bold">{stats.totalPosts}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Posts</span>
              </div>
              <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
                <MessageSquare className="h-5 w-5 text-primary mb-1" />
                <span className="text-2xl font-bold">{stats.totalMessages}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Messages</span>
              </div>
              <div className="bg-card/40 border border-border/50 rounded-2xl p-4 flex flex-col items-center justify-center gap-1">
                <Users className="h-5 w-5 text-primary mb-1" />
                <span className="text-2xl font-bold">{stats.activeUsers}</span>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active</span>
              </div>
            </div>
          )}

          {/* Create Post */}
          <Card className="border-border/60 bg-card/60 backdrop-blur-md shadow-lg shadow-black/20 overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <form onSubmit={handleCreatePost} className="space-y-4">
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10 shrink-0 border border-primary/20 hidden sm:block">
                    <AvatarImage src={user?.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary">{user?.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-3">
                    <Textarea 
                      placeholder="What's happening?" 
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="min-h-[100px] resize-none border-none bg-black/20 focus-visible:ring-1 focus-visible:ring-primary/50 text-base p-4 rounded-xl"
                    />
                    
                    {showMediaInput && (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                        <Input
                          placeholder="Paste an image URL..."
                          value={mediaUrl}
                          onChange={(e) => setMediaUrl(e.target.value)}
                          className="bg-black/20 border-transparent focus-visible:ring-primary/50 rounded-lg"
                        />
                        {mediaUrl && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-border/50 max-h-48 bg-black/40">
                            <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }} />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={`rounded-full hover:bg-primary/10 ${showMediaInput ? 'text-primary' : 'text-muted-foreground'}`}
                        onClick={() => setShowMediaInput(!showMediaInput)}
                      >
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Image
                      </Button>
                      
                      <Button 
                        type="submit" 
                        disabled={(!content.trim() && !mediaUrl.trim()) || createPost.isPending}
                        className="rounded-full px-6 shadow-md shadow-primary/20 transition-transform active:scale-95"
                      >
                        {createPost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2 ml-[-4px]" />}
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Feed Content */}
          <div className="space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <Spinner size="lg" />
                <p>Loading feed...</p>
              </div>
            ) : posts && posts.length > 0 ? (
              posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={user.id} />
              ))
            ) : (
              <div className="py-20 text-center flex flex-col items-center justify-center text-muted-foreground bg-card/30 rounded-2xl border border-border/30">
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
                  <MessageSquare className="h-8 w-8 opacity-50" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No posts yet</h3>
                <p className="max-w-sm text-sm">Be the first to share something with the community!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
