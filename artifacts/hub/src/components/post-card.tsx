import { useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Heart, ThumbsDown, MessageCircle, MoreHorizontal, Send, Share2 } from "lucide-react";
import {
  useLikePost,
  useDislikePost,
  useSharePost,
  useListComments,
  useAddComment,
  useDeletePost,
  getListPostsQueryKey,
  getListCommentsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function PostCard({
  post,
  currentUserId,
  currentUser,
}: {
  post: any;
  currentUserId: number;
  currentUser?: any;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const likePost = useLikePost();
  const dislikePost = useDislikePost();
  const sharePost = useSharePost();
  const deletePost = useDeletePost();
  const addComment = useAddComment();

  const { data: comments = [], isLoading: isLoadingComments } = useListComments(post.id, {
    query: {
      enabled: showComments,
      queryKey: getListCommentsQueryKey(post.id),
    },
  });

  const handleLike = () => {
    likePost.mutate(
      { postId: post.id },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getListPostsQueryKey(), (old: any) => {
            if (!old) return old;
            return old.map((p: any) => {
              if (p.id === post.id) {
                return {
                  ...p,
                  isLiked: data.liked,
                  likeCount: data.likeCount,
                  isDisliked: data.liked ? false : p.isDisliked,
                  dislikeCount: data.dislikeCount,
                };
              }
              return p;
            });
          });
        },
        onError: () => {
          toast({
            title: "Like failed",
            description: "Your like could not be saved. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDislike = () => {
    dislikePost.mutate(
      { postId: post.id },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(getListPostsQueryKey(), (old: any) => {
            if (!old) return old;
            return old.map((p: any) => {
              if (p.id === post.id) {
                return {
                  ...p,
                  isDisliked: data.disliked,
                  dislikeCount: data.dislikeCount,
                  isLiked: data.disliked ? false : p.isLiked,
                  likeCount: data.likeCount,
                };
              }
              return p;
            });
          });
        },
        onError: () => {
          toast({
            title: "Dislike failed",
            description: "Your dislike could not be saved. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleShare = async () => {
    const shareUrl = new URL(`/feed?post=${post.id}`, window.location.origin).toString();
    const navigatorWithShare = navigator as Navigator & { share?: Navigator["share"] };
    const canNativeShare = typeof navigatorWithShare.share === "function";

    try {
      if (canNativeShare) {
        await navigatorWithShare.share!({
          title: `${post.author.displayName}'s post`,
          text: post.content,
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement("textarea");
        input.value = shareUrl;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }

      sharePost.mutate(
        { postId: post.id },
        {
          onSuccess: (data) => {
            queryClient.setQueryData(getListPostsQueryKey(), (old: any) => {
              if (!old) return old;
              return old.map((p: any) =>
                p.id === post.id
                  ? { ...p, isShared: data.shared, shareCount: data.shareCount }
                  : p,
              );
            });
            toast({
              title: canNativeShare ? "Post shared" : "Link copied",
              description: canNativeShare
                ? "The post was shared successfully."
                : "The post link is ready to paste.",
            });
          },
          onError: () => {
            toast({
              title: "Share failed",
              description: "The post could not be recorded as shared. Please try again.",
              variant: "destructive",
            });
          },
        },
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast({
        title: "Share failed",
        description: "The share link could not be copied. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    addComment.mutate(
      { postId: post.id, data: { content: commentText.trim() } },
      {
        onSuccess: () => {
          setCommentText("");
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(post.id) });
          queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
        },
        onError: () => {
          toast({
            title: "Comment failed",
            description: "Your comment could not be posted. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this post?")) {
      deletePost.mutate(
        { postId: post.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
          },
        }
      );
    }
  };

  const isOwner = currentUserId === post.author.id;

  return (
    <Card className="mb-6 overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm shadow-sm transition-all hover:shadow-md hover:border-border duration-300">
      <CardHeader className="p-4 flex flex-row items-start space-y-0 gap-3">
        <Link href={`/profile/${post.author.id}`}>
          <Avatar className="h-10 w-10 cursor-pointer border border-primary/10">
            <AvatarImage src={post.author.avatarUrl || ""} />
            <AvatarFallback className="bg-secondary text-secondary-foreground">
              {post.author.displayName?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <Link href={`/profile/${post.author.id}`}>
              <span className="font-semibold text-base cursor-pointer hover:underline">{post.author.displayName}</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
              </span>
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground -mr-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 border-border/50 bg-popover/95 backdrop-blur-xl">
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer"
                    >
                      Delete Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          <span className="text-sm text-muted-foreground">@{post.author.username}</span>
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-0 space-y-4">
        <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">{post.content}</p>

        {post.mediaUrl && (
          <div className="rounded-xl overflow-hidden border border-border/50 bg-black/20 mt-3 max-h-[500px] flex items-center justify-center">
            {post.mediaType?.startsWith("video/") ? (
              <video src={post.mediaUrl} controls className="max-h-[500px] max-w-full object-contain" />
            ) : (
              <img src={post.mediaUrl} alt="Post attachment" className="max-h-[500px] max-w-full object-contain" />
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="p-0 flex flex-col items-stretch">
        <Separator className="bg-border/50" />
        <div className="flex items-center justify-between p-2">
          <Button
            variant="ghost"
            className={cn(
              "flex-1 flex gap-2 h-10 transition-colors",
              post.isLiked
                ? "text-primary hover:text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            onClick={handleLike}
            disabled={likePost.isPending}
          >
            <Heart className={cn("h-5 w-5 transition-transform active:scale-75", post.isLiked && "fill-current")} />
            <span className="font-medium">{post.likeCount > 0 ? post.likeCount : "Like"}</span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "flex-1 flex gap-2 h-10 transition-colors",
              post.isDisliked
                ? "text-orange-400 hover:text-orange-400 hover:bg-orange-400/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            onClick={handleDislike}
            disabled={dislikePost.isPending}
          >
            <ThumbsDown
              className={cn("h-5 w-5 transition-transform active:scale-75", post.isDisliked && "fill-current")}
            />
            <span className="font-medium">{post.dislikeCount > 0 ? post.dislikeCount : "Dislike"}</span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "flex-1 flex gap-2 h-10 transition-colors",
              showComments
                ? "text-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">{post.commentCount > 0 ? post.commentCount : "Comment"}</span>
          </Button>

          <Button
            variant="ghost"
            className={cn(
              "flex-1 flex gap-2 h-10 transition-colors",
              post.isShared
                ? "text-primary hover:text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5",
            )}
            onClick={handleShare}
            disabled={sharePost.isPending}
          >
            <Share2 className="h-5 w-5" />
            <span className="font-medium">{post.shareCount > 0 ? post.shareCount : "Share"}</span>
          </Button>
        </div>

        {showComments && (
          <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <Separator className="mb-4 bg-border/30" />

            <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {isLoadingComments ? (
                <div className="flex justify-center p-4">
                  <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3 group">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={comment.author.avatarUrl || ""} />
                      <AvatarFallback className="text-[10px]">
                        {comment.author.displayName?.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 bg-secondary/50 rounded-2xl rounded-tl-sm px-4 py-2">
                      <div className="flex items-baseline justify-between mb-1 gap-2">
                        <Link href={`/profile/${comment.author.id}`}>
                          <span className="font-semibold text-sm cursor-pointer hover:underline">
                            {comment.author.displayName}
                          </span>
                        </Link>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(comment.createdAt))}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/90">{comment.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-sm text-muted-foreground">No comments yet. Be the first!</div>
              )}
            </div>

            <form onSubmit={handleAddComment} className="flex gap-2 items-end">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={currentUser?.avatarUrl || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-xs">
                  {currentUser?.displayName?.substring(0, 2).toUpperCase() ?? "ME"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative flex items-center">
                <Input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="rounded-full bg-secondary/30 border-transparent focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary pr-10 h-10"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1 h-8 w-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-transform active:scale-95"
                  disabled={!commentText.trim() || addComment.isPending}
                >
                  <Send className="h-4 w-4 ml-[-2px]" />
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
