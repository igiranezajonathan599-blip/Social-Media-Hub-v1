import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  useGetAdminStats, getGetAdminStatsQueryKey,
  useListAdminUsers, getListAdminUsersQueryKey, useAdminDeleteUser, useAdminToggleAdmin,
  useListAdminPosts, getListAdminPostsQueryKey, useAdminDeletePost,
  useListAdminComments, getListAdminCommentsQueryKey, useAdminDeleteComment,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, MessageSquare, Heart, Shield, ShieldOff, Trash2,
  BarChart3, TrendingUp, UserCheck, Search, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-5 flex items-start gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

type Tab = "overview" | "users" | "posts" | "comments";

export default function Admin({ user }: { user: any }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [userSearch, setUserSearch] = useState("");
  const [userQuery, setUserQuery] = useState("");
  const [usersPage, setUsersPage] = useState(1);
  const [commentsPage, setCommentsPage] = useState(1);
  const qc = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUserQuery(userSearch.trim());
      setUsersPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [userSearch]);

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: usersData, isLoading: usersLoading } = useListAdminUsers(
    { page: usersPage, q: userQuery || undefined },
    {
      query: {
        enabled: tab === "users",
        queryKey: getListAdminUsersQueryKey({ page: usersPage, q: userQuery || undefined }),
      },
    }
  );
  const { data: postsData, isLoading: postsLoading } = useListAdminPosts(
    undefined,
    { query: { enabled: tab === "posts", queryKey: getListAdminPostsQueryKey() } }
  );
  const { data: commentsData, isLoading: commentsLoading } = useListAdminComments(
    { page: commentsPage },
    { query: { enabled: tab === "comments", queryKey: getListAdminCommentsQueryKey({ page: commentsPage }) } }
  );

  const deleteUser = useAdminDeleteUser();
  const toggleAdmin = useAdminToggleAdmin();
  const deletePost = useAdminDeletePost();
  const deleteComment = useAdminDeleteComment();

  const handleDeleteUser = (userId: number, displayName: string) => {
    if (!confirm(`Delete user "${displayName}"? This cannot be undone.`)) return;
    deleteUser.mutate({ userId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        toast({ title: "User deleted", description: `${displayName} has been removed.` });
      },
      onError: (error: any) => toast({
        title: "Could not delete user",
        description: error?.message || "Please try again.",
        variant: "destructive",
      }),
    });
  };

  const handleToggleAdmin = (userId: number, isAdmin: boolean) => {
    const action = isAdmin ? "remove admin access from" : "grant admin access to";
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    toggleAdmin.mutate({ userId }, {
      onSuccess: (updatedUser) => {
        qc.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        toast({
          title: updatedUser.isAdmin ? "Admin access granted" : "Admin access removed",
          description: `${updatedUser.displayName} was updated successfully.`,
        });
      },
      onError: (error: any) => toast({
        title: "Could not update admin access",
        description: error?.message || "Please try again.",
        variant: "destructive",
      }),
    });
  };

  const handleDeletePost = (postId: number) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    deletePost.mutate({ postId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
        qc.invalidateQueries({ queryKey: getListAdminCommentsQueryKey() });
        toast({ title: "Post deleted" });
      },
    });
  };

  const handleDeleteComment = (commentId: number) => {
    if (!confirm("Remove this comment? This cannot be undone.")) return;
    deleteComment.mutate({ commentId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListAdminCommentsQueryKey() });
        qc.invalidateQueries({ queryKey: getListAdminPostsQueryKey() });
        toast({ title: "Comment removed" });
      },
      onError: (error: any) => toast({
        title: "Could not remove comment",
        description: error?.message || "Please try again.",
        variant: "destructive",
      }),
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "posts", label: "Posts", icon: FileText },
    { id: "comments", label: "Comments", icon: MessageSquare },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-sidebar/80 backdrop-blur-md flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <Shield className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">Signed in as {user.displayName}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-1 border-b border-border bg-sidebar/40">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "overview" && (
          <div className="space-y-6 max-w-3xl">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Platform Stats</h2>
            {statsLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
            ) : !stats ? null : (
              <div className="grid grid-cols-2 gap-4">
                <StatCard icon={Users} label="Total Users" value={(stats as any).totalUsers ?? 0} color="bg-blue-500/20 text-blue-400" />
                <StatCard icon={FileText} label="Total Posts" value={(stats as any).totalPosts ?? 0} color="bg-violet-500/20 text-violet-400" />
                <StatCard icon={MessageSquare} label="Total Messages" value={(stats as any).totalMessages ?? 0} color="bg-primary/20 text-primary" />
                <StatCard icon={Heart} label="Total Conversations" value={stats.totalConversations ?? 0} color="bg-red-500/20 text-red-400" />
                <StatCard icon={TrendingUp} label="New Posts Today" value={stats.newPostsToday ?? 0} color="bg-green-500/20 text-green-400" />
                <StatCard icon={UserCheck} label="New Users Today" value={stats.newUsersToday ?? 0} color="bg-yellow-500/20 text-yellow-400" />
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3 max-w-3xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">All Users</h2>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  placeholder="Search name, username, or email"
                  className="pl-9"
                  aria-label="Search users"
                />
              </div>
            </div>
            {usersLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
            ) : (usersData?.users ?? []).length > 0 ? (
              ((usersData as any)?.users ?? []).map((u: any) => (
                <div
                  key={u.id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/30 transition-colors"
                >
                  <Avatar className="h-10 w-10 border border-primary/10">
                    <AvatarImage src={u.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {u.displayName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{u.displayName}</p>
                      {u.isAdmin && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">@{u.username} · {u.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                      {u.postCount != null && ` · ${u.postCount} posts`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {u.id !== user.id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs gap-1.5"
                          onClick={() => handleToggleAdmin(u.id, u.isAdmin)}
                          disabled={toggleAdmin.isPending}
                        >
                          {u.isAdmin
                            ? <><ShieldOff className="h-3.5 w-3.5" />Revoke Admin</>
                            : <><Shield className="h-3.5 w-3.5" />Make Admin</>}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteUser(u.id, u.displayName)}
                          disabled={deleteUser.isPending}
                          title="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {u.id === user.id && (
                      <Badge variant="outline" className="text-[10px] px-2">You</Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-secondary/20 px-4 py-12 text-center text-sm text-muted-foreground">
                {userQuery ? `No users found for “${userQuery}”.` : "No users to display."}
              </div>
            )}
            {!usersLoading && (usersData?.total ?? 0) > 0 && (
              <div className="flex items-center justify-between pt-3">
                <span className="text-xs text-muted-foreground">
                  Page {usersPage} of {Math.max(1, Math.ceil((usersData?.total ?? 0) / (usersData?.pageSize ?? 20)))}
                  {" · "}{usersData?.total ?? 0} users
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsersPage((page) => Math.max(1, page - 1))}
                    disabled={usersPage <= 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsersPage((page) => page + 1)}
                    disabled={usersPage >= Math.ceil((usersData?.total ?? 0) / (usersData?.pageSize ?? 20))}
                  >
                    Next<ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "posts" && (
          <div className="space-y-3 max-w-3xl">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">All Posts</h2>
            {postsLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
            ) : (
              ((postsData as any)?.posts ?? []).map((p: any) => (
                <div
                  key={p.id}
                  className="flex gap-4 p-4 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/30 transition-colors"
                >
                  <Avatar className="h-9 w-9 shrink-0 border border-primary/10">
                    <AvatarImage src={p.author?.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {p.author?.displayName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium">{p.author?.displayName}</p>
                      <p className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(p.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <p className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{p.content}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Heart className="h-3 w-3" />{p.likeCount ?? 0}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />{p.commentCount ?? 0}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeletePost(p.id)}
                    disabled={deletePost.isPending}
                    title="Delete post"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "comments" && (
          <div className="space-y-3 max-w-3xl">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">
              Comment Moderation
            </h2>
            {commentsLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
            ) : (commentsData?.comments ?? []).length > 0 ? (
              commentsData?.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex items-start gap-3 p-4 rounded-xl border border-border bg-secondary/20"
                >
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={comment.author.avatarUrl || ""} />
                    <AvatarFallback>{comment.author.displayName.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-semibold">{comment.author.displayName}</p>
                      <time className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </time>
                    </div>
                    <p className="mt-1 text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground line-clamp-2">
                      On post: {comment.post.content}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDeleteComment(comment.id)}
                    disabled={deleteComment.isPending}
                    title="Remove comment"
                    aria-label="Remove comment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-border bg-secondary/20 px-4 py-12 text-center text-sm text-muted-foreground">
                No comments to moderate.
              </div>
            )}
            {!commentsLoading && (commentsData?.total ?? 0) > 0 && (
              <div className="flex items-center justify-between pt-3">
                <span className="text-xs text-muted-foreground">
                  Page {commentsPage} of {Math.max(1, Math.ceil((commentsData?.total ?? 0) / (commentsData?.pageSize ?? 20)))}
                  {" · "}{commentsData?.total ?? 0} comments
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCommentsPage((page) => Math.max(1, page - 1))}
                    disabled={commentsPage <= 1}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCommentsPage((page) => page + 1)}
                    disabled={commentsPage >= Math.ceil((commentsData?.total ?? 0) / (commentsData?.pageSize ?? 20))}
                  >
                    Next<ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
