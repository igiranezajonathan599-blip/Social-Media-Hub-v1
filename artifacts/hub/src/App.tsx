import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import { useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import Feed from "@/pages/feed";
import Messages from "@/pages/messages";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function RootRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/feed"); }, []);
  return null;
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();

  useEffect(() => {
    if (!isLoading && error) {
      localStorage.removeItem("hub_token");
      setLocation("/login");
    }
  }, [isLoading, error, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !user) {
    return null;
  }

  return (
    <Layout>
      <Component {...rest} user={user} />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/" component={RootRedirect} />

      <Route path="/feed">
        {(params) => <ProtectedRoute component={Feed} {...params} />}
      </Route>
      <Route path="/messages">
        {(params) => <ProtectedRoute component={Messages} {...params} />}
      </Route>
      <Route path="/profile/me">
        {(params) => <ProtectedRoute component={ProfileEdit} {...params} />}
      </Route>
      <Route path="/profile/:userId">
        {(params) => <ProtectedRoute component={Profile} {...params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
