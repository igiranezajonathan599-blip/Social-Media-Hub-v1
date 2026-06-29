import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  useGetAdminStats, getGetAdminStatsQueryKey,
  useListAdminUsers, getListAdminUsersQueryKey, useAdminDeleteUser, useAdminToggleAdmin,
  useListAdminPosts, getListAdminPostsQueryKey, useAdminDeletePost,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Users, FileText, MessageSquare, Heart, Shield, ShieldOff, Trash2,
  BarChart3, TrendingUp, UserCheck,
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

type Tab = "overview" | "users" | "posts";

export default function Admin({ user }: { user: any }) {
  const [tab, setTab] = useState<Tab>("overview");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useGetAdminStats();
  const { data: usersData, isLoading: usersLoading } = useListAdminUsers(
    undefined,
    { query: { enabled: tab === "users", queryKey: getListAdminUsersQueryKey() } }
  );
  const { data: postsData, isLoading: postsLoading } = useListAdminPosts(
    undefined,
    { query: { enabled: tab === "posts", queryKey: getListAdminPostsQueryKey() } }
  );

  const deleteUser = useAdminDeleteUser();
  const toggleAdmin = useAdminToggleAdmin();
  const deletePost = useAdminDeletePost();

  const handleDeleteUser = (userId: number, displayName: string) => {
    if (!confirm(`Delete user "${displayName}"? This cannot be undone.`)) return;
    deleteUser.mutate({ userId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["listAdminUsers"] });
        toast({ title: "User deleted", description: `${displayName} has been removed.` });
      },
    });
  };

  const handleToggleAdmin = (userId: number, isAdmin: boolean) => {
    toggleAdmin.mutate({ userId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: ["listAdminUsers"] }),
    });
  };

  const handleDeletePost = (postId: number) => {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    deletePost.mutate({ postId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["listAdminPosts"] });
        toast({ title: "Post deleted" });
      },
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users", icon: Users },
    { id: "posts", label: "Posts", icon: FileText },
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
                <StatCard icon={Heart} label="Total Conversations" value={(stats as any).totalConversations ?? 0} color="bg-red-500/20 text-red-400" />
                <StatCard icon={TrendingUp} label="New Posts Today" value={(stats as any).newPostsToday ?? 0} color="bg-green-500/20 text-green-400" />
                <StatCard icon={UserCheck} label="New Users Today" value={(stats as any).newUsersToday ?? 0} color="bg-yellow-500/20 text-yellow-400" />
              </div>
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="space-y-3 max-w-3xl">
            <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">All Users</h2>
            {usersLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
            ) : (
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
      </div>
    </div>
  );
}
