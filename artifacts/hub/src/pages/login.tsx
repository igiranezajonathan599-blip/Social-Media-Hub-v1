import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    login.mutate({ data: values }, {
      onSuccess: (data) => {
        localStorage.setItem("hub_token", data.token);
        setLocation("/feed");
      },
      onError: (error: any) => {
        toast({
          title: "Login failed",
          description: error?.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      },
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background overflow-hidden relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none" />
      
      <Card className="w-full max-w-md border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl shadow-primary/5 z-10">
        <CardHeader className="space-y-3 pb-6">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground mx-auto mb-2 shadow-lg shadow-primary/30">
            <Sparkles className="w-7 h-7" />
          </div>
          <CardTitle className="text-2xl text-center font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Enter your credentials to access your hub
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background/50" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full h-11 text-base shadow-md shadow-primary/20" disabled={login.isPending}>
                {login.isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                Sign In
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-border/50 pt-6 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/register">
            <span className="text-primary hover:underline ml-1 font-medium cursor-pointer">Sign up</span>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
