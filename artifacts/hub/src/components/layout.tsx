import { Link, useLocation } from "wouter";
import { useLogout, useGetMe } from "@workspace/api-client-react";
import { MessageCircle, Home, User, LogOut, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function Layout({ children, user }: { children: React.ReactNode; user?: any }) {
  const [location, setLocation] = useLocation();
  const logout = useLogout();
  
  const { data: me } = useGetMe();
  const currentUser = user || me;

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        localStorage.removeItem("hub_token");
        setLocation("/login");
      }
    });
  };

  const navItems = [
    { icon: Home, label: "Feed", path: "/feed" },
    { icon: MessageCircle, label: "Messages", path: "/messages" },
    { icon: User, label: "Profile", path: "/profile/me" },
  ];

  return (
    <div className="flex h-[100dvh] w-full bg-background overflow-hidden text-foreground">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-sidebar flex flex-col hidden md:flex">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <Sparkles className="w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-primary-foreground">Hub</span>
        </div>
        
        <nav className="flex-1 px-4 py-2 space-y-2">
          {navItems.map((item) => {
            const active = location.startsWith(item.path);
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-all duration-200",
                    active 
                      ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20" 
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 mt-auto">
          <Separator className="mb-4 bg-border" />
          {currentUser && (
            <div className="flex items-center gap-3 mb-4 px-2">
              <Avatar className="h-10 w-10 border border-primary/20">
                <AvatarImage src={currentUser.avatarUrl || ""} />
                <AvatarFallback className="bg-primary/20 text-primary">{currentUser.displayName?.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">{currentUser.displayName}</span>
                <span className="text-xs text-muted-foreground truncate">@{currentUser.username}</span>
              </div>
            </div>
          )}
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            {logout.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <LogOut className="w-4 h-4 mr-2" />}
            Log out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background">
        {children}
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-sidebar/90 backdrop-blur-md z-50 flex justify-around items-center p-2 pb-safe">
        {navItems.map((item) => {
          const active = location.startsWith(item.path);
          return (
            <Link key={item.path} href={item.path}>
              <div className={cn(
                "flex flex-col items-center p-2 rounded-lg",
                active ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="w-6 h-6" />
                <span className="text-[10px] mt-1 font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
