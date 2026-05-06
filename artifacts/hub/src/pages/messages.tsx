import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  useListConversations, getListConversationsQueryKey,
  useListMessages, getListMessagesQueryKey,
  useSendMessage,
  useSearchUsers, getSearchUsersQueryKey,
  useCreateConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Send, Search, MessageSquarePlus, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Messages({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useListConversations({
    query: { queryKey: getListConversationsQueryKey(), refetchInterval: 5000 }
  });

  const activeConv = conversations.find((c: any) => c.id === activeConvId);

  const { data: messages = [], isLoading: msgsLoading } = useListMessages(
    activeConvId ?? 0,
    {},
    {
      query: {
        enabled: !!activeConvId,
        queryKey: getListMessagesQueryKey(activeConvId ?? 0),
        refetchInterval: 3000,
      }
    }
  );

  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();

  const { data: searchResults = [] } = useSearchUsers(
    { q: searchQuery },
    {
      query: {
        enabled: searchQuery.length > 1,
        queryKey: getSearchUsersQueryKey({ q: searchQuery }),
      }
    }
  );

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeConvId) return;
    const text = messageText.trim();
    setMessageText("");

    sendMessage.mutate(
      { conversationId: activeConvId, data: { content: text } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeConvId) });
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
        }
      }
    );
  };

  const handleStartConversation = (targetUser: any) => {
    createConversation.mutate(
      { data: { userId: targetUser.id } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setActiveConvId(conv.id);
          setShowSearch(false);
          setSearchQuery("");
        }
      }
    );
  };

  const filteredSearch = (searchResults as any[]).filter((u: any) => u.id !== user.id);

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversations sidebar */}
      <div className={cn(
        "w-full md:w-80 shrink-0 border-r border-border flex flex-col bg-sidebar",
        activeConvId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-border flex items-center justify-between gap-2">
          <h2 className="font-bold text-lg tracking-tight">Messages</h2>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground hover:text-primary"
            onClick={() => setShowSearch(!showSearch)}
            data-testid="button-new-conversation"
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </div>

        {showSearch && (
          <div className="p-3 border-b border-border space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background/50 border-border/50"
                data-testid="input-search-users"
                autoFocus
              />
            </div>
            {filteredSearch.map((u: any) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => handleStartConversation(u)}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatarUrl || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary text-sm">
                    {u.displayName?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{u.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{u.username}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {convsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Spinner size="md" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center text-muted-foreground">
              <MessageSquarePlus className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-medium text-foreground/70 mb-1">No conversations yet</p>
              <p className="text-sm">Search for users to start chatting</p>
            </div>
          ) : (
            (conversations as any[]).map((conv: any) => (
              <div
                key={conv.id}
                onClick={() => setActiveConvId(conv.id)}
                className={cn(
                  "flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-border/40",
                  activeConvId === conv.id
                    ? "bg-primary/10 border-l-2 border-l-primary"
                    : "hover:bg-white/5"
                )}
                data-testid={`conversation-item-${conv.id}`}
              >
                <div className="relative">
                  <Avatar className="h-11 w-11 border border-primary/10">
                    <AvatarImage src={conv.otherUser?.avatarUrl || ""} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">
                      {conv.otherUser?.displayName?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {conv.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between">
                    <p className="font-semibold text-sm truncate">{conv.otherUser?.displayName}</p>
                    {conv.lastMessage && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                        {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {conv.lastMessage
                      ? `${conv.lastMessage.senderId === user.id ? "You: " : ""}${conv.lastMessage.content}`
                      : "No messages yet"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat window */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0",
        !activeConvId ? "hidden md:flex" : "flex"
      )}>
        {!activeConvId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground px-6">
            <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <MessageSquarePlus className="h-9 w-9 opacity-40" />
            </div>
            <h3 className="text-xl font-semibold text-foreground/70 mb-2">Select a conversation</h3>
            <p className="text-sm max-w-xs">Choose an existing conversation or start a new one</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-sidebar/80 backdrop-blur-md">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden rounded-full text-muted-foreground"
                onClick={() => setActiveConvId(null)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-9 w-9 border border-primary/10">
                <AvatarImage src={activeConv?.otherUser?.avatarUrl || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {activeConv?.otherUser?.displayName?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm leading-tight">{activeConv?.otherUser?.displayName}</p>
                <p className="text-xs text-muted-foreground">@{activeConv?.otherUser?.username}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {msgsLoading ? (
                <div className="flex justify-center py-10"><Spinner size="md" /></div>
              ) : (messages as any[]).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              ) : (
                (messages as any[]).map((msg: any) => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div
                      key={msg.id}
                      className={cn("flex items-end gap-2", isMe ? "justify-end" : "justify-start")}
                      data-testid={`message-${msg.id}`}
                    >
                      {!isMe && (
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={msg.sender?.avatarUrl || ""} />
                          <AvatarFallback className="text-[10px] bg-secondary">
                            {msg.sender?.displayName?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className={cn(
                        "max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-secondary-foreground rounded-bl-sm"
                      )}>
                        <p className="break-words">{msg.content}</p>
                        <p className={cn(
                          "text-[10px] mt-1 text-right",
                          isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                        )}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-sidebar/50 backdrop-blur-md">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-background/50 border-border/50 focus-visible:ring-primary/50"
                  data-testid="input-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full w-10 h-10 shrink-0 shadow-md shadow-primary/20"
                  disabled={!messageText.trim() || sendMessage.isPending}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
