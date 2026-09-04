import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Bot,
  User,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Plus,
  Loader2,
  FolderGit2,
  Trash2,
  Download
} from "lucide-react";
import { Repository, ChatSession, ChatMessage, Citation } from "../types.js";
import { chatService } from "../services/api.js";
import { useToast } from "../context/ToastContext.js";

interface AskCodebaseProps {
  repositories: Repository[];
  selectedRepoId: string | null;
  onSelectRepo: (id: string) => void;
}

export const AskCodebase: React.FC<AskCodebaseProps> = ({
  repositories,
  selectedRepoId,
  onSelectRepo
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const selectedRepo = repositories.find(r => r.id === selectedRepoId);

  // Load chat sessions for selected repository
  useEffect(() => {
    if (!selectedRepoId) return;

    async function loadSessions() {
      try {
        const res = await chatService.getSessions(selectedRepoId);
        setSessions(res.sessions);
        if (res.sessions.length > 0) {
          setCurrentSessionId(res.sessions[0].id);
        } else {
          // Auto create first session
          const newSession = await chatService.createSession(selectedRepoId, `Discussion with ${selectedRepo?.github_repo}`);
          setSessions([newSession.session]);
          setCurrentSessionId(newSession.session.id);
        }
      } catch (err: any) {
        toast.error("Failed to load chat sessions", err.message);
      }
    }
    loadSessions();
  }, [selectedRepoId]);

  // Load messages for current session
  useEffect(() => {
    if (!currentSessionId) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      try {
        const res = await chatService.getMessages(currentSessionId);
        setMessages(res.messages);
      } catch (err: any) {
        toast.error("Failed to load messages", err.message);
      }
    }
    loadMessages();
  }, [currentSessionId]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleCreateSession = async () => {
    if (!selectedRepoId) return;
    try {
      const res = await chatService.createSession(selectedRepoId, `Chat ${sessions.length + 1}`);
      setSessions([res.session, ...sessions]);
      setCurrentSessionId(res.session.id);
      toast.info("Created new chat thread");
    } catch (e: any) {
      toast.error("Could not create thread", e.message);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, preset?: string) => {
    if (e) e.preventDefault();
    const query = (preset || inputQuestion).trim();
    if (!query || !currentSessionId || loading) return;

    setInputQuestion("");
    setLoading(true);

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: "temp-" + Date.now(),
      session_id: currentSessionId,
      user_id: "",
      role: "user",
      content: query,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await chatService.sendMessage(currentSessionId, query);
      setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), tempUserMsg, res.message]);
    } catch (err: any) {
      toast.error("RAG Query Failed", err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.info("Copied response to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleCitation = (key: string) => {
    setExpandedCitations(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      await chatService.deleteSession(sessionId);
      const remaining = sessions.filter(s => s.id !== sessionId);
      setSessions(remaining);
      toast.info("Chat thread deleted");
      if (currentSessionId === sessionId) {
        if (remaining.length > 0) {
          setCurrentSessionId(remaining[0].id);
        } else if (selectedRepoId) {
          const newSession = await chatService.createSession(selectedRepoId, `Discussion with ${selectedRepo?.github_repo}`);
          setSessions([newSession.session]);
          setCurrentSessionId(newSession.session.id);
        } else {
          setCurrentSessionId(null);
        }
      }
    } catch (err: any) {
      toast.error("Could not delete thread", err.message);
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const conversation = messages.map(m => {
      const header = m.role === "user" ? "### USER" : "### BUILDREX AI (RAG)";
      let citations = "";
      if (m.citations && m.citations.length > 0) {
        citations = "\n\nCitations:\n" + m.citations.map(c => `- ${c.file_path} (${c.line_reference})`).join("\n");
      }
      return `${header} [${new Date(m.created_at).toLocaleString()}]\n${m.content}${citations}\n`;
    }).join("\n---\n\n");

    const blob = new Blob([conversation], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `chat-${selectedRepo?.github_repo || "session"}-${new Date().toISOString().slice(0, 10)}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Chat exported as Markdown");
  };

  const sampleQuestions = [
    "What does this project do and what is the primary architecture?",
    "Where is request routing or API endpoints configured?",
    "Explain the folder structure and entry points",
    "Identify potential technical debt or security risks in this codebase"
  ];

  if (repositories.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-lg p-12 text-center max-w-md mx-auto mt-12">
        <FolderGit2 className="w-12 h-12 text-[#D4D4D8]/30 mx-auto mb-3" />
        <h3 className="serif-text text-xl font-light text-white mb-2">No repositories indexed</h3>
        <p className="text-xs text-[#D4D4D8]/60 font-light">Import a repository to start chatting with your codebase.</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex gap-4 pb-2 animate-fade-in">
      {/* Left Chat Sessions Column */}
      <div className="w-64 bg-white/[0.02] border border-white/10 rounded-lg p-3.5 flex flex-col shrink-0 hidden md:flex">
        {/* Repo Picker */}
        <div className="mb-3">
          <label className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/50 block mb-1.5">Target Repository</label>
          <select
            value={selectedRepoId || ""}
            onChange={(e) => onSelectRepo(e.target.value)}
            className="w-full text-xs font-mono bg-[#141417] border border-white/10 rounded px-2.5 py-1.5 text-[#D4D4D8] focus:outline-none focus:border-[#C5A059]"
          >
            {repositories.map(r => (
              <option key={r.id} value={r.id}>
                {r.github_owner}/{r.github_repo}
              </option>
            ))}
          </select>
        </div>

        {/* New Thread Button */}
        <button
          onClick={handleCreateSession}
          className="flex items-center justify-center gap-2 w-full py-2 px-3 rounded border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] transition-all cursor-pointer mb-3"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat Thread</span>
        </button>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          <div className="text-[9px] uppercase font-medium tracking-[0.2em] text-[#D4D4D8]/40 px-2 mb-1.5">Saved Sessions</div>
          {sessions.map((s) => {
            const isSelected = s.id === currentSessionId;
            return (
              <div
                key={s.id}
                onClick={() => setCurrentSessionId(s.id)}
                className={`w-full group px-2.5 py-2 rounded text-xs font-medium truncate transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "border gold-border gold-accent bg-[#C5A059]/10 font-medium"
                    : "text-[#D4D4D8]/60 hover:bg-white/[0.03] hover:text-white"
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                  <MessageSquareCode className="w-3.5 h-3.5 shrink-0 text-[#C5A059]" />
                  <span className="truncate">{s.title}</span>
                </div>
                {sessions.length > 1 && (
                  <button
                    onClick={(e) => handleDeleteSession(e, s.id)}
                    title="Delete thread"
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity shrink-0 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Center Main Chat Panel */}
      <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-lg flex flex-col overflow-hidden shadow-xl">
        {/* Chat Header */}
        <div className="px-6 py-3.5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-[#C5A059]/30 bg-[#C5A059]/10 flex items-center justify-center">
              <Bot className="w-4 h-4 text-[#C5A059]" />
            </div>
            <div>
              <h3 className="serif-text text-sm font-medium text-white flex items-center gap-2">
                <span>Ask My Codebase</span>
                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-mono">
                  RAG Active
                </span>
              </h3>
              <p className="text-[10px] text-[#D4D4D8]/50 font-mono">
                Repository: <b className="text-white font-normal">{selectedRepo?.github_owner}/{selectedRepo?.github_repo}</b>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={handleExportChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-white/10 hover:border-[#C5A059]/50 bg-white/[0.02] text-[10px] uppercase tracking-wider text-[#D4D4D8] hover:text-white transition-all cursor-pointer font-mono"
              >
                <Download className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="hidden sm:inline">Export Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="max-w-xl mx-auto text-center py-10 space-y-4">
              <div className="w-12 h-12 rounded border border-[#C5A059]/30 bg-[#C5A059]/10 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 text-[#C5A059]" />
              </div>
              <h3 className="serif-text text-2xl font-light text-white">Ask anything about this codebase</h3>
              <p className="text-xs text-[#D4D4D8]/70 leading-relaxed font-light">
                Buildrex AI queries vector embeddings of indexed source files to retrieve context and answer with line-level citations.
              </p>

              {/* Sample Prompt Pills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left pt-2">
                {sampleQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(undefined, q)}
                    className="p-3 rounded bg-white/[0.02] border border-white/10 hover:border-[#C5A059]/40 text-xs text-[#D4D4D8]/70 hover:text-white transition-all text-left font-light"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div key={msg.id} className={`flex gap-3.5 ${isUser ? "justify-end" : "justify-start"}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded border border-[#C5A059]/30 bg-[#C5A059]/10 flex items-center justify-center text-[#C5A059] shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-2xl rounded-lg p-4 text-xs leading-relaxed ${
                  isUser
                    ? "bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#D4D4D8] rounded-br-none shadow-sm"
                    : "bg-[#141417] border border-white/10 text-[#D4D4D8] rounded-bl-none shadow-inner"
                }`}>
                  {/* Message Content */}
                  <div className="whitespace-pre-wrap font-sans">
                    {msg.content}
                  </div>

                  {/* Citations Box */}
                  {!isUser && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-white/10 space-y-2">
                      <div className="text-[10px] uppercase font-medium text-[#C5A059] font-mono flex items-center gap-1.5 tracking-wider">
                        <FileCode className="w-3 h-3 text-[#C5A059]" />
                        <span>Source Citations ({msg.citations.length})</span>
                      </div>

                      <div className="space-y-1.5">
                        {msg.citations.map((cite, cIdx) => {
                          const key = `${msg.id}-${cIdx}`;
                          const isExpanded = expandedCitations[key];
                          return (
                            <div key={cIdx} className="bg-[#0F0F11] border border-white/10 rounded p-2 text-[11px] font-mono">
                              <div
                                onClick={() => toggleCitation(key)}
                                className="flex items-center justify-between cursor-pointer text-[#C5A059] hover:text-white transition-colors"
                              >
                                <span className="truncate font-medium">{cite.file_path} ({cite.line_reference})</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-[#D4D4D8]/40">sim: {Math.round(cite.score * 100)}%</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </div>
                              </div>

                              {isExpanded && (
                                <pre className="mt-2 p-2 rounded bg-black/60 text-[#D4D4D8]/80 text-[10px] overflow-x-auto whitespace-pre border border-white/5">
                                  {cite.snippet}
                                </pre>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Footer Action */}
                  {!isUser && (
                    <div className="mt-3 flex items-center justify-end">
                      <button
                        onClick={() => copyMessage(msg.id, msg.content)}
                        className="flex items-center gap-1 text-[10px] text-[#D4D4D8]/40 hover:text-[#C5A059] font-mono transition-colors"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedId === msg.id ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded border border-white/10 bg-white/[0.03] flex items-center justify-center text-[#D4D4D8] shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3.5 items-center text-xs text-[#D4D4D8]/50 font-mono p-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#C5A059]" />
              <span>Retrieving vectors & synthesizing answer...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02]">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder={`Ask a question about ${selectedRepo?.github_repo || 'the codebase'}...`}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              className="flex-1 bg-[#141417] border border-white/10 rounded px-4 py-2.5 text-xs text-[#D4D4D8] placeholder-[#D4D4D8]/30 focus:outline-none focus:border-[#C5A059] font-mono"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputQuestion.trim()}
              className="border gold-border gold-accent text-[10px] uppercase tracking-wider font-medium bg-[#C5A059]/10 hover:bg-[#C5A059] hover:text-[#0F0F11] disabled:opacity-40 px-5 py-2.5 rounded flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
