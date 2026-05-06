import { useState, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  useListConversations, getListConversationsQueryKey,
  useListMessages, getListMessagesQueryKey,
  useSendMessage, useEditMessage, useDeleteMessage,
  useSearchUsers, getSearchUsersQueryKey,
  useCreateConversation,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Send, Search, MessageSquarePlus, ChevronLeft,
  Image as ImageIcon, Video, Smile, Pencil, Trash2, X, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { STICKERS, STICKER_CATEGORIES } from "@/data/stickers";

function MediaPreview({ url }: { url: string }) {
  const isVideo = /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.includes("video");
  if (isVideo) {
    return (
      <video
        src={url}
        controls
        className="max-w-[240px] rounded-lg mt-1 border border-white/10"
        style={{ maxHeight: 180 }}
      />
    );
  }
  return (
    <img
      src={url}
      alt="media"
      className="max-w-[240px] rounded-lg mt-1 border border-white/10 object-cover"
      style={{ maxHeight: 200 }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

function StickerPicker({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  const [activeCategory, setActiveCategory] = useState<string>(STICKER_CATEGORIES[0]);
  const filtered = STICKERS.filter((s) => s.category === activeCategory);
  return (
    <div className="absolute bottom-full mb-2 left-0 w-72 bg-sidebar border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Stickers</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex gap-1 px-2 py-1.5 overflow-x-auto border-b border-border scrollbar-none">
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "text-[10px] px-2 py-1 rounded-full whitespace-nowrap shrink-0 transition-colors",
              activeCategory === cat
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-white/10"
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-6 gap-1 p-2 max-h-48 overflow-y-auto">
        {filtered.map((sticker) => (
          <button
            key={sticker.id}
            title={sticker.label}
            onClick={() => { onSelect(sticker.emoji); onClose(); }}
            className="text-2xl p-1 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
          >
            {sticker.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Messages({ user }: { user: any }) {
  const queryClient = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messageText, setMessageText] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const stickerRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convsLoading } = useListConversations({
    query: { queryKey: getListConversationsQueryKey(), refetchInterval: 5000 }
  });

  const activeConv = (conversations as any[]).find((c: any) => c.id === activeConvId);

  const { data: messages = [], isLoading: msgsLoading } = useListMessages(
    activeConvId ?? 0, {},
    { query: { enabled: !!activeConvId, queryKey: getListMessagesQueryKey(activeConvId ?? 0), refetchInterval: 3000 } }
  );

  const sendMessage = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const createConversation = useCreateConversation();

  const { data: searchResults = [] } = useSearchUsers(
    { q: searchQuery },
    { query: { enabled: searchQuery.length > 1, queryKey: getSearchUsersQueryKey({ q: searchQuery }) } }
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close sticker picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stickerRef.current && !stickerRef.current.contains(e.target as Node)) {
        setShowStickerPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(activeConvId!) });
    queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId) return;
    if (!messageText.trim() && !mediaUrl.trim()) return;
    const payload: any = {};
    if (messageText.trim()) payload.content = messageText.trim();
    if (mediaUrl.trim()) { payload.mediaUrl = mediaUrl.trim(); payload.mediaType = mediaType; }
    setMessageText("");
    setMediaUrl("");
    setShowMediaInput(false);
    sendMessage.mutate({ conversationId: activeConvId, data: payload }, { onSuccess: invalidate });
  };

  const handleStickerSend = (emoji: string) => {
    if (!activeConvId) return;
    sendMessage.mutate(
      { conversationId: activeConvId, data: { content: emoji } },
      { onSuccess: invalidate }
    );
  };

  const handleStartConversation = (targetUser: any) => {
    createConversation.mutate(
      { data: { userId: targetUser.id } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          setActiveConvId((conv as any).id);
          setShowSearch(false);
          setSearchQuery("");
        }
      }
    );
  };

  const handleDeleteMessage = (msgId: number) => {
    if (!activeConvId) return;
    deleteMessage.mutate(
      { conversationId: activeConvId, messageId: msgId },
      { onSuccess: invalidate }
    );
  };

  const handleEditSave = (msgId: number) => {
    if (!activeConvId || !editText.trim()) return;
    editMessage.mutate(
      { conversationId: activeConvId, messageId: msgId, data: { content: editText.trim() } },
      {
        onSuccess: () => {
          invalidate();
          setEditingMsgId(null);
          setEditText("");
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
            variant="ghost" size="icon"
            className="rounded-full text-muted-foreground hover:text-primary"
            onClick={() => setShowSearch(!showSearch)}
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
            <div className="flex items-center justify-center py-10"><Spinner size="md" /></div>
          ) : (conversations as any[]).length === 0 ? (
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
                      ? (conv.lastMessage.isDeleted
                        ? "Message deleted"
                        : `${conv.lastMessage.senderId === user.id ? "You: " : ""}${conv.lastMessage.content || "[media]"}`)
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
                variant="ghost" size="icon"
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
                  const isEditing = editingMsgId === msg.id;
                  const isDeleted = msg.isDeleted;

                  return (
                    <div
                      key={msg.id}
                      className={cn("group flex items-end gap-2", isMe ? "justify-end" : "justify-start")}
                    >
                      {!isMe && (
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={msg.sender?.avatarUrl || ""} />
                          <AvatarFallback className="text-[10px] bg-secondary">
                            {msg.sender?.displayName?.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}

                      <div className="max-w-[70%]">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="text-sm rounded-xl bg-background/70 border-primary/40 h-8 px-3"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSave(msg.id);
                                if (e.key === "Escape") { setEditingMsgId(null); setEditText(""); }
                              }}
                              autoFocus
                            />
                            <Button size="icon" className="h-8 w-8 rounded-full bg-primary" onClick={() => handleEditSave(msg.id)}>
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" onClick={() => { setEditingMsgId(null); setEditText(""); }}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className={cn(
                            "px-4 py-2.5 rounded-2xl text-sm leading-relaxed relative",
                            isMe
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-secondary text-secondary-foreground rounded-bl-sm",
                            isDeleted && "opacity-50 italic"
                          )}>
                            {isDeleted ? (
                              <p className="text-xs">Message deleted</p>
                            ) : (
                              <>
                                {msg.content && <p className="break-words">{msg.content}</p>}
                                {msg.mediaUrl && <MediaPreview url={msg.mediaUrl} />}
                              </>
                            )}
                            <div className={cn(
                              "flex items-center gap-1 mt-1",
                              isMe ? "justify-end" : "justify-start"
                            )}>
                              <p className={cn(
                                "text-[10px]",
                                isMe ? "text-primary-foreground/60" : "text-muted-foreground"
                              )}>
                                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                                {msg.isEdited && " · edited"}
                              </p>
                            </div>

                            {/* Action buttons (my messages only) */}
                            {isMe && !isDeleted && (
                              <div className="absolute -top-7 right-0 hidden group-hover:flex items-center gap-0.5 bg-sidebar border border-border rounded-full px-1.5 py-0.5 shadow-lg">
                                <button
                                  onClick={() => { setEditingMsgId(msg.id); setEditText(msg.content || ""); }}
                                  className="p-1 rounded-full hover:text-primary transition-colors text-muted-foreground"
                                  title="Edit message"
                                >
                                  <Pencil className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="p-1 rounded-full hover:text-destructive transition-colors text-muted-foreground"
                                  title="Delete message"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Media URL input panel */}
            {showMediaInput && (
              <div className="px-4 py-2 border-t border-border/50 bg-sidebar/30 flex items-center gap-2">
                <div className="flex gap-1 mr-1">
                  <Button
                    size="sm"
                    variant={mediaType === "image" ? "default" : "outline"}
                    className="h-7 text-xs px-2 rounded-full"
                    onClick={() => setMediaType("image")}
                  >
                    <ImageIcon className="h-3 w-3 mr-1" />Image
                  </Button>
                  <Button
                    size="sm"
                    variant={mediaType === "video" ? "default" : "outline"}
                    className="h-7 text-xs px-2 rounded-full"
                    onClick={() => setMediaType("video")}
                  >
                    <Video className="h-3 w-3 mr-1" />Video
                  </Button>
                </div>
                <Input
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder={mediaType === "image" ? "Paste image URL..." : "Paste video URL..."}
                  className="flex-1 h-8 text-sm rounded-full bg-background/50 border-border/50"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 rounded-full shrink-0"
                  onClick={() => { setShowMediaInput(false); setMediaUrl(""); }}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Input bar */}
            <div className="p-4 border-t border-border bg-sidebar/50 backdrop-blur-md">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                {/* Sticker picker */}
                <div className="relative shrink-0" ref={stickerRef}>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="rounded-full text-muted-foreground hover:text-primary h-9 w-9"
                    onClick={() => setShowStickerPicker((v) => !v)}
                    title="Stickers"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  {showStickerPicker && (
                    <StickerPicker
                      onSelect={handleStickerSend}
                      onClose={() => setShowStickerPicker(false)}
                    />
                  )}
                </div>

                {/* Media toggle */}
                <Button
                  type="button" variant="ghost" size="icon"
                  className={cn(
                    "rounded-full h-9 w-9 shrink-0",
                    showMediaInput ? "text-primary" : "text-muted-foreground hover:text-primary"
                  )}
                  onClick={() => setShowMediaInput((v) => !v)}
                  title="Send image or video"
                >
                  <ImageIcon className="h-5 w-5" />
                </Button>

                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-background/50 border-border/50 focus-visible:ring-primary/50"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full w-10 h-10 shrink-0 shadow-md shadow-primary/20"
                  disabled={(!messageText.trim() && !mediaUrl.trim()) || sendMessage.isPending}
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
