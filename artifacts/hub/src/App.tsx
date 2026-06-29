import { useEffect, useRef } from "react";
import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import { ClerkProvider, SignIn, SignUp, useClerk } from "@clerk/react";
import { dark } from "@clerk/themes";
import NotFound from "@/pages/not-found";
import Layout from "@/components/layout";
import { Spinner } from "@/components/ui/spinner";

import Feed from "@/pages/feed";
import Messages from "@/pages/messages";
import Profile from "@/pages/profile";
import ProfileEdit from "@/pages/profile-edit";
import Admin from "@/pages/admin";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false, refetchOnWindowFocus: false },
  },
});

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "top" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "hsl(320, 80%, 55%)",
    colorForeground: "hsl(210, 40%, 98%)",
    colorMutedForeground: "hsl(240, 20%, 75%)",
    colorDanger: "hsl(0, 72%, 51%)",
    colorBackground: "hsl(240, 60%, 12%)",
    colorInput: "hsl(240, 50%, 20%)",
    colorInputForeground: "hsl(210, 40%, 98%)",
    colorNeutral: "hsl(240, 50%, 20%)",
    fontFamily: "inherit",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(240,60%,12%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-black/60 border border-white/10",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-bold",
    headerSubtitle: "text-[hsl(240,20%,75%)]",
    socialButtonsBlockButtonText: "text-white font-medium",
    formFieldLabel: "text-[hsl(210,40%,98%)]",
    footerActionLink: "text-[hsl(320,80%,55%)] font-medium",
    footerActionText: "text-[hsl(240,20%,75%)]",
    dividerText: "text-[hsl(240,20%,75%)]",
    identityPreviewEditButton: "text-[hsl(320,80%,55%)]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-white",
    logoBox: "flex justify-center py-2",
    logoImage: "h-10 w-10",
    socialButtonsBlockButton: "border border-white/10 bg-white/5 text-white",
    formButtonPrimary:
      "bg-[hsl(320,80%,55%)] text-white font-semibold shadow-md shadow-[hsl(320,80%,55%)]/20",
    formFieldInput: "bg-[hsl(240,50%,20%)] border-white/10 text-white",
    footerAction: "border-t border-white/10",
    dividerLine: "bg-white/10",
    alert: "border-red-500/30 bg-red-500/10",
    otpCodeFieldInput: "bg-[hsl(240,50%,20%)] border-white/10 text-white",
    formFieldRow: "",
    main: "",
  },
};

function RootRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation("/feed"); }, []);
  return null;
}

function LoginRedirect() {
  return <Redirect to="/sign-in" />;
}

function RegisterRedirect() {
  return <Redirect to="/sign-up" />;
}

function ProfileMeRedirect() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();

  useEffect(() => {
    if (!isLoading && error) {
      setLocation("/sign-in");
    }
  }, [isLoading, error, setLocation]);

  useEffect(() => {
    if (!isLoading && user) {
      setLocation(`/profile/${(user as any).id}`);
    }
  }, [isLoading, user, setLocation]);

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

function ProtectedRoute({ component: Component, adminOnly = false, ...rest }: any) {
  const [, setLocation] = useLocation();
  const { data: user, isLoading, error } = useGetMe();

  useEffect(() => {
    if (!isLoading && error) {
      setLocation("/sign-in");
    }
  }, [isLoading, error, setLocation]);

  useEffect(() => {
    if (!isLoading && user && adminOnly && !(user as any).isAdmin) {
      setLocation("/feed");
    }
  }, [isLoading, user, adminOnly, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !user) return null;
  if (adminOnly && !(user as any).isAdmin) return null;

  return (
    <Layout>
      <Component {...rest} user={user} />
    </Layout>
  );
}

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
      <div className="relative z-10 w-full">
        <SignIn
          routing="path"
          path={`${basePath}/sign-in`}
          signUpUrl={`${basePath}/sign-up`}
          forceRedirectUrl={`${basePath}/feed`}
        />
      </div>
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="relative z-10 w-full">
        <SignUp
          routing="path"
          path={`${basePath}/sign-up`}
          signInUrl={`${basePath}/sign-in`}
          forceRedirectUrl={`${basePath}/feed`}
        />
      </div>
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, qc]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={RootRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/login" component={LoginRedirect} />
      <Route path="/register" component={RegisterRedirect} />
      <Route path="/feed">
        {(params) => <ProtectedRoute component={Feed} {...params} />}
      </Route>
      <Route path="/messages">
        {(params) => <ProtectedRoute component={Messages} {...params} />}
      </Route>
      <Route path="/profile/me/edit">
        {(params) => <ProtectedRoute component={ProfileEdit} {...params} />}
      </Route>
      <Route path="/profile/me">
        {() => <ProfileMeRedirect />}
      </Route>
      <Route path="/profile/:userId">
        {(params) => <ProtectedRoute component={Profile} params={params} />}
      </Route>
      <Route path="/admin">
        {(params) => <ProtectedRoute component={Admin} adminOnly {...params} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
