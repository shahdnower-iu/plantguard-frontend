"use client"

import { useState, useRef, useEffect } from "react"
import {
  Send, Bot, User, Leaf, Plus, Trash2,
  ChevronDown, Check
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { chat, type ChatSession, type ChatMessage } from "@/lib/api"
import { useApp } from "@/context/AppContext"

const suggestedQuestions = [
  { id: "q1",      text: "What causes grape leaves to turn brown at the edges?" },
  { id: "q2",      text: "How do I prevent apple scab on my apple tree?" },
  { id: "q3",      text: "How do I prevent corn smut?" },
  { id: "q4",      text: "Best practices for growing oranges in pots?" },
]

const models = [
  { id: "gemini_flash", name: "Gemini 2.5 Flash",      icon: "⚡" },
  { id: "gemini_lite",  name: "Gemini 2.5 Flash-Lite", icon: "🌟" },
   { id: "gemma_31b",    name: "Gemma 4 31B",            icon: "🔷" },
  { id: "gpt_oss",      name: "GPT OSS 20B",            icon: "🤖" },
  { id: "ring",         name: "Ring 2.6 1T",            icon: "💎" },
] as const

type ModelId = (typeof models)[number]["id"]

// Static array outside render — avoids inline array literals in JSX maps
// which is the root cause of the "missing key" warning when used with .map()
const TYPING_DOTS = [
  { key: "dot-0", delay: "0ms" },
  { key: "dot-1", delay: "150ms" },
  { key: "dot-2", delay: "300ms" },
]

export default function ChatPage() {
  const { isAuthenticated } = useApp()

  const [sessions, setSessions]             = useState<ChatSession[]>([])
  const [activeSession, setActiveSession]   = useState<ChatSession | null>(null)
  const [messages, setMessages]             = useState<ChatMessage[]>([])
  const [input, setInput]                   = useState("")
  const [isTyping, setIsTyping]             = useState(false)
  const [sessionsLoaded, setSessionsLoaded] = useState(false)
  const [selectedModel, setSelectedModel]   = useState<ModelId>("gemini_flash")
  const [modelOpen, setModelOpen]           = useState(false)

  const scrollRef   = useRef<HTMLDivElement>(null)
  const inputRef    = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated) loadSessions()
  }, [isAuthenticated])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping])

  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = Math.min(el.scrollHeight, 140) + "px"
  }, [input])

  const getSessionId = (s: any): string => s?.chat_session_id || s?.id || ""
  const currentModel = models.find(m => m.id === selectedModel)!

  const loadSessions = async () => {
    try {
      const res = await chat.getSessions()
      setSessions(res.sessions ?? [])
    } catch (err) {
      console.error("Failed to load sessions:", err)
    } finally {
      setSessionsLoaded(true)
    }
  }

  const loadSession = async (session: any) => {
    const sessionId = getSessionId(session)
    if (!sessionId) return
    setActiveSession({ ...session, id: sessionId })
    try {
      const data = await chat.getMessages(sessionId)
      setMessages(data.messages ?? [])
    } catch (err) {
      console.error("Failed to load messages:", err)
    }
  }

  const createNewSession = async () => {
    try {
      const res = await chat.createSession({ title: "New Chat", model: selectedModel ?? "gemini_flash" })
      const newSession = { ...res.session, id: getSessionId(res.session) }
      setSessions(prev => [newSession, ...prev])
      setActiveSession(newSession)
      setMessages([])
    } catch (err) {
      console.error("Failed to create session:", err)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      sessionId: getSessionId(activeSession) || "",
      role: "user",
      content: text.trim(),
      createdAt: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg])
    setInput("")
    setIsTyping(true)

    try {
      const sessionId = getSessionId(activeSession)
      // Always send model as a plain non-null string that exactly matches
      // a backend MODELS[].id — prevents null/undefined reaching the server
      const modelToSend: string = selectedModel ?? "gemini_flash"

      const result = await chat.sendMessage({
        message:   text.trim(),
        ...(sessionId ? { sessionId } : {}),
        model:     modelToSend,
      })

      const assistantMsg: ChatMessage = {
        id: result.messageId || `ai-${Date.now()}`,
        sessionId: result.sessionId,
        role: "assistant",
        content: result.reply,
        createdAt: new Date().toISOString(),
      }

      if (!activeSession && result.sessionId) {
        const newSession = {
          id: result.sessionId,
          chat_session_id: result.sessionId,
          title: "New Chat",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        setActiveSession(newSession)
        await loadSessions()
      }

      setMessages(prev => [...prev, assistantMsg])
    } catch (err: any) {
      console.error(err)
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        sessionId: "",
        role: "assistant",
        content: "Sorry, I couldn't process that. Please try again.",
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setIsTyping(false)
    }
  }

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await chat.deleteSession(id)
      setSessions(prev => prev.filter(s => getSessionId(s) !== id))
      if (getSessionId(activeSession) === id) {
        setActiveSession(null)
        setMessages([])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex h-[calc(110vh-4rem)] overflow-hidden bg-background">

      {/* ══════════ SIDEBAR ══════════ */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col h-full bg-card border-r border-border">

        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Leaf className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">PlantGuard AI</p>
            <p className="text-[11px] text-muted-foreground">Plant care assistant</p>
          </div>
        </div>

        <div className="px-3 pt-3 pb-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="w-full justify-start gap-2 h-9 text-sm"
            onClick={createNewSession}
          >
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>
        </div>

        <div className="px-4 pb-1 shrink-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
            Recent
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-4 space-y-0.5">
          {!sessionsLoaded ? (
            // key is index-based here — acceptable for static skeleton placeholders
            Array.from({ length: 5 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="h-9 rounded-md bg-muted animate-pulse mx-1 mb-1" />
            ))
          ) : sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-xs">No chats yet</p>
          ) : (
            sessions.map((s, i) => {
              const sid = getSessionId(s)
              const isActive = getSessionId(activeSession) === sid
              return (
                <div
                  key={sid || `session-fallback-${i}`}
                  onClick={() => loadSession(s)}
                  className={cn(
                    "group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <span className="flex-1 truncate text-[13px]">{s.title || "New Chat"}</span>
                  <button
                    onClick={e => deleteSession(sid, e)}
                    className={cn(
                      "shrink-0 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity",
                      "hover:text-destructive hover:bg-destructive/10"
                    )}
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </aside>

      {/* ══════════ MAIN COLUMN ══════════ */}
      <div className="flex flex-1 flex-col min-w-0 min-h-0">

        <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Leaf className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {activeSession?.title || "PlantGuard AI"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {currentModel.name}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" aria-label="Online" />
        </header>

        {/* scrollable messages — flex-1 + min-h-0 + overflow-y-auto is the correct trio */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-1">
                  <Leaf className="h-7 w-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold">Hello! 👋</h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  How can I help with your plants today?
                </p>
                <div className="grid grid-cols-2 gap-2 mt-4 w-full max-w-sm">
                  {suggestedQuestions.map(q => (
                    <button
                      key={q.id}
                      onClick={() => sendMessage(q.text)}
                      className={cn(
                        "flex items-start gap-2.5 p-3 rounded-xl text-left",
                        "border border-border bg-card hover:bg-accent/60 hover:border-primary/40",
                        "transition-colors duration-150"
                      )}
                    >
                      <ChevronDown className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-[12.5px] leading-snug text-foreground">{q.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={msg.id || `msg-fallback-${i}`}
                className={cn(
                  "flex gap-3 items-end",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                  msg.role === "user" ? "bg-primary" : "bg-muted"
                )}>
                  {msg.role === "user"
                    ? <User className="h-3.5 w-3.5 text-primary-foreground" />
                    : <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                  }
                </div>

                <div className={cn(
                  "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border rounded-bl-sm"
                )}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={cn(
                    "text-[10px] mt-1.5",
                    msg.role === "user" ? "opacity-70 text-right" : "text-muted-foreground"
                  )}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-3 items-end">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1.5 items-center h-4">
                    {TYPING_DOTS.map(dot => (
                      <span
                        key={dot.key}
                        className="block w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
                        style={{ animationDelay: dot.delay }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* input bar */}
        <div className="shrink-0 px-4 py-3 bg-background border-t border-border">
          <div className="max-w-2xl mx-auto">
            <div className={cn(
              "flex flex-col rounded-2xl border border-border bg-card",
              "focus-within:border-primary/50 transition-colors duration-150 shadow-sm"
            )}>
              <div className="flex items-end gap-2 px-4 pt-3 pb-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your plants… (Enter to send, Shift+Enter for new line)"
                  disabled={isTyping}
                  rows={1}
                  className={cn(
                    "flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground",
                    "outline-none leading-relaxed min-h-[24px] max-h-[140px] py-0",
                    "disabled:opacity-50"
                  )}
                />
              </div>

              <div className="flex items-center justify-between px-3 pb-2.5">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setModelOpen(o => !o)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px]",
                      "border border-border text-muted-foreground",
                      "hover:bg-accent hover:text-foreground transition-colors duration-150",
                      modelOpen && "bg-accent text-foreground"
                    )}
                  >
                    <span>{currentModel.icon}</span>
                    <span>{currentModel.name}</span>
                    <ChevronDown className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      modelOpen && "rotate-180"
                    )} />
                  </button>

                  {modelOpen && (
                    <div className={cn(
                      "absolute bottom-full left-0 mb-2 w-48 py-1",
                      "bg-popover border border-border rounded-xl shadow-lg z-50"
                    )}>
                      {models.map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => { setSelectedModel(m.id as ModelId); setModelOpen(false) }}
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left",
                            "hover:bg-accent transition-colors",
                            selectedModel === m.id ? "text-primary font-medium" : "text-foreground"
                          )}
                        >
                          <span className="text-base">{m.icon}</span>
                          <span className="flex-1">{m.name}</span>
                          {selectedModel === m.id && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isTyping}
                  className="h-8 w-8 rounded-xl shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}