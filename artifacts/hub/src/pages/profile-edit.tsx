import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useGetMe, getGetMeQueryKey, useUpdateProfile } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Loader2, User, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  displayName: z.string().min(1, "Display name is required").max(50),
  bio: z.string().max(200, "Bio must be 200 characters or less").optional(),
  avatarUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

export default function ProfileEdit({ user }: { user: any }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: me, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const updateProfile = useUpdateProfile();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      displayName: "",
      bio: "",
      avatarUrl: "",
    },
  });

  useEffect(() => {
    if (me) {
      form.reset({
        displayName: (me as any).displayName || "",
        bio: (me as any).bio || "",
        avatarUrl: (me as any).avatarUrl || "",
      });
    }
  }, [me]);

  function onSubmit(values: z.infer<typeof formSchema>) {
    updateProfile.mutate(
      {
        data: {
          displayName: values.displayName,
          bio: values.bio || undefined,
          avatarUrl: values.avatarUrl || undefined,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
          toast({
            title: "Profile updated",
            description: "Your profile has been saved successfully.",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Update failed",
            description: error?.message || "Failed to update profile.",
            variant: "destructive",
          });
        },
      }
    );
  }

  const watchedAvatar = form.watch("avatarUrl");
  const watchedName = form.watch("displayName");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your public profile information</p>
          </div>
          {(me as any)?.id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation(`/profile/${(me as any).id}`)}
              className="shrink-0"
            >
              View Profile
            </Button>
          )}
        </div>

        {/* Avatar Preview */}
        <div className="flex items-center gap-4 mb-8 p-4 bg-card/40 rounded-2xl border border-border/50">
          <Avatar className="h-20 w-20 border-2 border-primary/30 shadow-lg">
            <AvatarImage src={watchedAvatar || ""} />
            <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
              {watchedName?.substring(0, 2).toUpperCase() || <User className="h-8 w-8" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-lg">{watchedName || "Your Name"}</p>
            <p className="text-sm text-muted-foreground">@{(me as any)?.username}</p>
          </div>
        </div>

        <Card className="border-border/50 bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
            <CardDescription>This information is visible to other users</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="displayName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Display Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Your display name"
                          {...field}
                          className="bg-background/50"
                          data-testid="input-display-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell people a bit about yourself..."
                          className="resize-none bg-background/50 min-h-[100px]"
                          {...field}
                          data-testid="input-bio"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        {field.value?.length || 0}/200 characters
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avatar URL</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://example.com/avatar.jpg"
                          {...field}
                          className="bg-background/50"
                          data-testid="input-avatar-url"
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Paste a direct link to an image
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-11 shadow-md shadow-primary/20"
                  disabled={updateProfile.isPending}
                  data-testid="button-save-profile"
                >
                  {updateProfile.isPending
                    ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    : <Save className="h-4 w-4 mr-2" />
                  }
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
