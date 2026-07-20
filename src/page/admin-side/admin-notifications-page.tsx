import React, { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ChevronLeft, Loader2, MessageCircle, RefreshCw, Send, Search,
} from "lucide-react";
import moment from "moment";
import toast from "react-hot-toast";
import { MobileAdminNav } from "../../components/layout/mobile-admin-nav";
import { BASE_URL } from "../../common/Constant";
import { setBaseUrl } from "../../services/HttpService";
import { queryClient } from "../../lib/queryClient";
import {
  IPendingMealQuery,
  IMealQuery,
  getPendingQueriesForCoach,
  getMealQueriesForClient,
  replyMealQuery,
} from "../../services/MealQueryService";
import { getUserListForACoach } from "../../services/AdminServices";
import { IUser } from "../../interface/models/User";

// ── helpers ──────────────────────────────────────────────────────────────────

function fullName(u: IUser) {
  return [u.FirstName, u.LastName].filter(Boolean).join(" ") || `User #${u.IdUser}`;
}

function initials(u: IUser) {
  const f = u.FirstName?.[0] ?? "";
  const l = u.LastName?.[0] ?? "";
  return (f + l).toUpperCase() || "?";
}

function timeAgo(dt?: string) {
  if (!dt) return "";
  return moment(dt).fromNow();
}

// ── flatten Q&A pairs into a chronological message stream ────────────────────

interface ChatMsg {
  key: string;
  text: string;
  sender: 'client' | 'coach';
  time: string;
  idQuery: number;      // which query record this belongs to (needed for sending reply)
}

function buildMessages(thread: IMealQuery[]): ChatMsg[] {
  const msgs: ChatMsg[] = [];
  for (const q of thread) {
    if (q.Question) msgs.push({ key: `q-${q.IdQuery}`, text: q.Question, sender: 'client', time: q.CreatedAt ?? '', idQuery: q.IdQuery! });
    if (q.Answer)   msgs.push({ key: `a-${q.IdQuery}`, text: q.Answer,   sender: 'coach',  time: q.AnsweredAt ?? '', idQuery: q.IdQuery! });
  }
  return msgs.sort((a, b) => a.time.localeCompare(b.time));
}

// ── ThreadView ────────────────────────────────────────────────────────────────

interface ThreadViewProps {
  client: IUser;
  onBack: () => void;
}

function ThreadView({ client, onBack }: ThreadViewProps) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const { data: thread = [], isFetching, refetch } = useQuery<IMealQuery[]>({
    queryKey: ["admin-thread", client.IdUser],
    queryFn: async () => {
      const res = await getMealQueriesForClient({ IdUser: client.IdUser! }) as any;
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });

  const messages = buildMessages(thread);

  // first unanswered client message — the reply target
  const nextUnanswered = thread.find(q => !q.Answer);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const sendMutation = useMutation({
    mutationFn: (msg: string) => {
      if (!nextUnanswered) {
        return Promise.reject(new Error("no_pending"));
      }
      return replyMealQuery({ IdQuery: nextUnanswered.IdQuery!, Answer: msg });
    },
    onSuccess: () => {
      setText("");
      queryClient.invalidateQueries({ queryKey: ["admin-thread", client.IdUser] });
      queryClient.invalidateQueries({ queryKey: ["admin-pending-queries"] });
    },
    onError: (err: Error) => {
      if (err.message === "no_pending") {
        toast("Waiting for client to send a message first", { icon: "💬" });
      } else {
        toast.error("Failed to send");
      }
    },
  });

  const handleSend = () => {
    if (!text.trim()) return;
    sendMutation.mutate(text.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">
      {/* header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 flex-shrink-0">
        <button onClick={onBack} className="p-1.5 text-white/80 hover:text-white">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold">{initials(client)}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{fullName(client)}</p>
          <p className="text-blue-200 text-[10px]">
            {isFetching ? "updating…" : `${messages.length} message${messages.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button onClick={() => refetch()} className="p-2 text-white/70 hover:text-white">
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1 bg-gray-50 dark:bg-gray-950">
        {messages.length === 0 && !isFetching && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <MessageCircle className="h-14 w-14 text-gray-200 dark:text-gray-700" />
            <p className="text-sm text-gray-400">No messages yet</p>
          </div>
        )}

        {messages.map((msg, i) => {
          const isCoach = msg.sender === 'coach';
          const prevMsg = messages[i - 1];
          // show date divider when day changes
          const showDate = !prevMsg || moment(msg.time).format('YYYY-MM-DD') !== moment(prevMsg.time).format('YYYY-MM-DD');
          return (
            <React.Fragment key={msg.key}>
              {showDate && msg.time && (
                <div className="flex justify-center py-2">
                  <span className="text-[10px] bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-3 py-0.5 rounded-full">
                    {moment(msg.time).calendar(null, { sameDay: '[Today]', lastDay: '[Yesterday]', other: 'ddd, MMM D' })}
                  </span>
                </div>
              )}
              <div className={`flex ${isCoach ? "justify-end" : "justify-start"} items-end gap-1.5`}>
                {!isCoach && (
                  <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 mb-0.5">
                    <span className="text-[9px] font-bold text-gray-500 dark:text-gray-300">{initials(client)}</span>
                  </div>
                )}
                <div className={`max-w-[75%] px-3.5 py-2.5 text-sm shadow-sm ${
                  isCoach
                    ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                    : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm"
                }`}>
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.time && (
                    <p className={`text-[10px] mt-0.5 ${isCoach ? "opacity-60 text-right" : "text-gray-400"}`}>
                      {moment(msg.time).format("h:mm a")}
                    </p>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* input — always visible */}
      <div className="flex-shrink-0 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 py-3 flex items-end gap-2 relative">
        {!nextUnanswered && thread.length > 0 && (
          <div className="absolute left-0 right-0 bottom-full mb-1 px-4">
            <p className="text-[10px] text-center text-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-full py-1 px-3">
              Waiting for client's next message to reply
            </p>
          </div>
        )}
        <textarea
          className="flex-1 min-h-[44px] max-h-[120px] px-3.5 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none focus:ring-2 focus:ring-blue-300 outline-none"
          placeholder={nextUnanswered ? "Type a message…" : "Waiting for client to message first…"}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <button
          disabled={!text.trim() || sendMutation.isPending}
          onClick={handleSend}
          className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white transition-all active:scale-95"
        >
          {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ── ClientRow ─────────────────────────────────────────────────────────────────

interface ClientRowProps {
  client: IUser;
  unreadCount: number;
  lastMessage?: IPendingMealQuery;
  onClick: () => void;
}

function ClientRow({ client, unreadCount, lastMessage, onClick }: ClientRowProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 active:bg-gray-100 transition-colors border-b border-gray-100 dark:border-gray-800"
    >
      {/* avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <span className="text-sm font-bold text-blue-600 dark:text-blue-300">{initials(client)}</span>
        </div>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white dark:border-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </div>
      {/* info */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-semibold truncate ${unreadCount > 0 ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
            {fullName(client)}
          </p>
          {lastMessage?.CreatedAt && (
            <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
              {timeAgo(lastMessage.CreatedAt)}
            </span>
          )}
        </div>
        <p className={`text-xs truncate mt-0.5 ${unreadCount > 0 ? "text-gray-700 dark:text-gray-200 font-medium" : "text-gray-400 dark:text-gray-500"}`}>
          {lastMessage ? lastMessage.Question : "No messages yet"}
        </p>
      </div>
      {/* chevron */}
      <ChevronLeft className="h-4 w-4 text-gray-300 rotate-180 flex-shrink-0" />
    </button>
  );
}

// ── Messenger Panel — reusable client-list + thread UI ─────────────────────────
// Used both by the standalone route below (AdminNotificationsPage) and embedded
// directly inside a floating dialog from the admin dashboard, so it doesn't
// assume it owns the whole viewport/route.

export function MessengerPanel() {
  const [selectedClient, setSelectedClient] = useState<IUser | null>(null);
  const [search, setSearch] = useState("");

  const { data: clients = [], isLoading: clientsLoading } = useQuery<IUser[]>({
    queryKey: ["coach-userlist-messenger"],
    queryFn: () => getUserListForACoach(null).then((res: any) => res.data.data ?? []),
    staleTime: 60000,
  });

  const { data: pendingQueries = [], isFetching: pendingFetching, refetch: refetchPending } = useQuery<IPendingMealQuery[]>({
    queryKey: ["admin-pending-queries"],
    queryFn: async () => {
      const res = await getPendingQueriesForCoach() as any;
      const d = res.data?.data;
      return Array.isArray(d) ? d : [];
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 30000,
  });

  // group pending queries by IdUser
  const pendingByUser = pendingQueries.reduce<Record<number, IPendingMealQuery[]>>((acc, q) => {
    if (!q.IdUser) return acc;
    acc[q.IdUser] = acc[q.IdUser] ?? [];
    acc[q.IdUser].push(q);
    return acc;
  }, {});

  const totalUnread = pendingQueries.length;

  const filteredClients = clients.filter(c => {
    const name = fullName(c).toLowerCase();
    return name.includes(search.toLowerCase());
  });

  // sort: clients with pending messages first, then by last message time
  const sortedClients = [...filteredClients].sort((a, b) => {
    const ua = pendingByUser[a.IdUser!]?.length ?? 0;
    const ub = pendingByUser[b.IdUser!]?.length ?? 0;
    if (ua !== ub) return ub - ua;
    const la = pendingByUser[a.IdUser!]?.[0]?.CreatedAt ?? "";
    const lb = pendingByUser[b.IdUser!]?.[0]?.CreatedAt ?? "";
    return lb.localeCompare(la);
  });

  if (selectedClient) {
    return <ThreadView client={selectedClient} onBack={() => setSelectedClient(null)} />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950">
      {/* header */}
      <header className="bg-blue-600 px-4 flex-shrink-0">
        <div className="pt-5 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-white text-xl font-bold">Messages</h1>
              {totalUnread > 0 && (
                <p className="text-blue-200 text-xs mt-0.5">{totalUnread} unanswered question{totalUnread > 1 ? "s" : ""}</p>
              )}
            </div>
            <button
              onClick={() => refetchPending()}
              className="p-2 rounded-full bg-white/10 text-white"
            >
              <RefreshCw className={`h-4 w-4 ${pendingFetching ? "animate-spin" : ""}`} />
            </button>
          </div>
          {/* search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300" />
            <input
              type="text"
              placeholder="Search clients…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/15 text-white placeholder-blue-200 text-sm outline-none focus:bg-white/25 transition-colors"
            />
          </div>
        </div>
      </header>

      {/* client list */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 mt-2 rounded-t-2xl shadow-sm">
        {(clientsLoading) && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        )}

        {!clientsLoading && sortedClients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle className="h-10 w-10 text-gray-200 dark:text-gray-700 mb-3" />
            <p className="text-sm text-gray-400">No clients found</p>
          </div>
        )}

        {!clientsLoading && sortedClients.map(client => {
          const userPending = pendingByUser[client.IdUser!] ?? [];
          const lastMsg = userPending[0];
          return (
            <ClientRow
              key={client.IdUser}
              client={client}
              unreadCount={userPending.length}
              lastMessage={lastMsg}
              onClick={() => setSelectedClient(client)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Standalone route — full-page shell around MessengerPanel ───────────────────

export default function AdminNotificationsPage() {
  useEffect(() => {
    setBaseUrl(BASE_URL);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <MessengerPanel />
      <MobileAdminNav />
    </div>
  );
}
