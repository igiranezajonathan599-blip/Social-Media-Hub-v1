import { useGetUserById, getGetUserByIdQueryKey, useListPosts, getListPostsQueryKey, useCreateConversation } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import PostCard from "@/components/post-card";
import { MessageCircle, Grid3X3, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Profile({ params, user }: { params: { userId: string }; user: any }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const userId = parseInt(params.userId, 10);

  const { data: profile, isLoading: profileLoading } = useGetUserById(userId, {
    query: { enabled: !!userId, queryKey: getGetUserByIdQueryKey(userId) }
  });

  const { data: posts = [], isLoading: postsLoading } = useListPosts(
    { userId },
    {
      query: {
        enabled: !!userId,
        queryKey: getListPostsQueryKey({ userId }),
      }
    }
  );

  const createConversation = useCreateConversation();

  const handleMessage = () => {
    createConversation.mutate(
      { data: { userId } },
      {
        onSuccess: () => {
          setLocation("/messages");
        }
      }
    );
  };

  const isOwnProfile = user.id === userId;

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <p className="text-lg font-semibold">User not found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <Avatar className="h-24 w-24 border-2 border-primary/30 shadow-xl shadow-primary/10">
            <AvatarImage src={(profile as any).avatarUrl || ""} />
            <AvatarFallback className="text-3xl font-bold bg-primary/20 text-primary">
              {(profile as any).displayName?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{(profile as any).displayName}</h1>
            <p className="text-muted-foreground text-sm mb-3">@{(profile as any).username}</p>

            {(profile as any).bio && (
              <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{(profile as any).bio}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-1.5">
                <Grid3X3 className="h-4 w-4" />
                <span className="font-semibold text-foreground">{(profile as any).postCount}</span>
                <span>posts</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>Joined {formatDistanceToNow(new Date((profile as any).createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            {!isOwnProfile && (
              <Button
                onClick={handleMessage}
                disabled={createConversation.isPending}
                className="rounded-full px-6 shadow-md shadow-primary/20"
                data-testid="button-send-message"
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
            )}

            {isOwnProfile && (
              <Button
                variant="outline"
                onClick={() => setLocation("/profile/me")}
                className="rounded-full px-6"
                data-testid="button-edit-profile"
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {/* Posts */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-primary" />
            Posts
          </h2>

          {postsLoading ? (
            <div className="flex justify-center py-10"><Spinner size="md" /></div>
          ) : (posts as any[]).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground bg-card/30 rounded-2xl border border-border/30">
              <Grid3X3 className="h-10 w-10 mb-3 opacity-30 mx-auto" />
              <p className="font-medium text-foreground/60">No posts yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {(posts as any[]).map((post: any) => (
                <PostCard key={post.id} post={post} currentUserId={user.id} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
