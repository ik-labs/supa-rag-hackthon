"use client";
import React, { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import Image from 'next/image';
import { useSearchParams } from "next/navigation";
// Removed Card and CardContent for seamless look
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { useAuth } from "@/components/AuthProvider";

type MarkdownCodeProps = React.ComponentProps<'code'> & { inline?: boolean };

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function ChatDetailInner() {
  const searchParams = useSearchParams();
  const { user, session } = useAuth();
  const initialMessage = searchParams?.get("query") || "";
  const [messages, setMessages] = useState<{type: "user"|"bot", text: string}[]>(
    initialMessage
      ? [
          { type: "user", text: initialMessage },
          { type: "bot", text: "[Supabase Bot is thinking...]" }
        ]
      : []
  );
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // User avatar logic
  const avatarUrl = user?.user_metadata?.avatar_url;
  const userName = user?.user_metadata?.name || user?.email || "User";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Generate embedding for the initial query and fetch Gemini answer
  // Shared function to fetch embedding and LLM answer for any query
  const fetchEmbeddingAndGeminiForQuery = useCallback(
    async (query: string, accessToken: string | undefined, messagesForHistory: {type: "user"|"bot", text: string}[]) => {
      try {
        const embedRes = await fetch('/api/embed-supabase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const embedData = await embedRes.json();
        if (!embedData.embedding) throw new Error('No embedding returned');

        // Prepare chat history for LLM (exclude the last 'thinking...' message)
        const history = messagesForHistory.filter(
          (msg, idx) => !(idx === messagesForHistory.length - 1 && msg.type === 'bot' && msg.text === '[Supabase Bot is thinking...]')
        );

        // Call /api/search with the embedding and chat history
        const searchRes = await fetch('/api/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({ embedding: embedData.embedding, topN: 5, query, history }),
        });
        const searchData = await searchRes.json();

        // Detect Gemini rate limit or quota errors
        const errorText = (searchData.error || searchData.message || '').toLowerCase();
        if (
          errorText.includes('rate limit') ||
          errorText.includes('quota') ||
          errorText.includes('exceeded') ||
          errorText.includes('too many requests')
        ) {
          window.alert('Gemini API rate limit or quota exceeded. Please try again later.');
          setMessages(prev => [
            ...prev,
            { type: 'bot', text: 'Gemini API rate limit or quota exceeded. Please try again later.' }
          ]);
          return;
        }

        // Show only Gemini LLM answer as bot response
        if (searchData.answer) {
          setMessages(prev => [
            ...prev,
            { type: 'bot', text: searchData.answer }
          ]);
        } else {
          setMessages(prev => [
            ...prev,
            { type: 'bot', text: 'No answer found.' }
          ]);
        }
      } catch (err) {
        setMessages(prev => [
          ...prev,
          { type: 'bot', text: 'Error fetching results.' }
        ]);
        console.error('Error fetching embedding/search:', err);
      }
    },
    []
  );

  // Initial query effect
  useEffect(() => {
    if (initialMessage && session?.access_token) {
      fetchEmbeddingAndGeminiForQuery(
        initialMessage,
        session?.access_token,
        [
          { type: "user", text: initialMessage }
        ]
      );
    }
    // Only run on mount or when initialMessage changes
  }, [initialMessage, session?.access_token, fetchEmbeddingAndGeminiForQuery]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const query = input.trim();
    if (!query) return;
    setMessages(prev => [
      ...prev,
      { type: "user", text: query },
      { type: "bot", text: "[Supabase Bot is thinking...]" }
    ]);
    setInput("");
    await fetchEmbeddingAndGeminiForQuery(query, session?.access_token, [
      ...messages,
      { type: "user", text: query },
      { type: "bot", text: "[Supabase Bot is thinking...]" }
    ]);
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-blue-100 px-0 py-2">
      <div className="w-full max-w-3xl mx-auto flex flex-col h-[95vh]">
        <div className="font-semibold text-xl text-zinc-800 px-0 pt-4 pb-2 text-center">Supabase Bot Chat</div>
        <div className="flex-1 overflow-y-auto px-0 pb-2">
          <div className="overflow-x-auto max-w-full">
            <div className="flex flex-col gap-6 max-w-full sm:max-w-2xl mx-auto break-words">
              {messages.length === 0 && (
                <div className="text-zinc-400 text-center">No messages yet. Start the conversation!</div>
              )}
              {messages.map((msg, i) => (
                msg.type === "user" ? (
                  <div key={i} className="flex items-end justify-end gap-2">
                    <div className="flex flex-col items-end">
                      <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-br-sm shadow max-w-[60vw] break-words">
                        {msg.text}
                      </div>
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={userName}
                          width={36}
                          height={36}
                          className="w-9 h-9 rounded-full border object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-muted text-muted-foreground rounded-full flex items-center justify-center font-bold">
                          {getInitials(userName)}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex items-end justify-start gap-2">
                    <div className="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center">
                      <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2L2 7l10 5 10-5-10-5zm0 7.5L4.21 7 12 3.5 19.79 7 12 9.5zm10 2.5l-10 5-10-5v6l10 5 10-5v-6z"></path></svg>
                    </div>
                    <div className="bg-zinc-100 px-4 py-2 rounded-2xl rounded-bl-sm shadow text-zinc-800 max-w-[60vw] break-words">
                      <ReactMarkdown
                        components={{
                          code(props: MarkdownCodeProps) {
  const { inline, className, children, ...rest } = props;
  const match = /language-(\w+)/.exec(className || '');
  if (!inline) {
    // Block code: wrap in <pre> to avoid <div> inside <p>
    return (
      <pre style={{ padding: 0, margin: 0, background: 'none' }}>
        <SyntaxHighlighter
          language={match?.[1] || 'plaintext'}
          PreTag="div"
          style={oneDark}
          customStyle={{
            borderRadius: '0.5rem',
            padding: '1rem',
            fontSize: '0.95em',
            background: '#18181b',
            overflowX: 'auto',
            ...(rest && rest.style ? rest.style : {})
          }}
          {...Object.fromEntries(Object.entries(rest || {}).filter(([k]) => k !== 'style'))}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      </pre>
    );
  }
  // Inline code
  return (
    <code className="bg-zinc-200 px-1 rounded font-mono text-sm">{children}</code>
  );
}
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    </div>
                  </div>
                )
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
        <form onSubmit={handleSend} className="flex gap-2 items-end max-w-2xl mx-auto w-full py-4 sticky bottom-0 bg-transparent">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                const form = e.currentTarget.closest('form');
                if (form) form.requestSubmit();
              }
            }}
            placeholder="Type your message..."
            className="flex-1 min-h-[40px] max-h-32 resize-y"
            rows={2}
          />
          <Button type="submit" className="h-10 px-6 cursor-pointer">Send</Button>
        </form>
      </div>
    </div>
  );
}

export default function ChatDetailPage() {
  return (
    <Suspense fallback={<div>Loading chat...</div>}>
      <ChatDetailInner />
    </Suspense>
  );
}
