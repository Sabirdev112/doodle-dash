"use client";

import { useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { sendAction } from "@/lib/store";

interface GuessChatProps {
  roomId: string;
  playerId: string;
  messages: ChatMessage[];
  isDrawer: boolean;
  hasGuessed: boolean;
  wordLength: number;
  secretWord: string | null;
  disabled?: boolean;
}

export default function GuessChat({
  roomId,
  playerId,
  messages,
  isDrawer,
  hasGuessed,
  wordLength,
  secretWord,
  disabled,
}: GuessChatProps) {
  const [text, setText] = useState("");

  const sendGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    await sendAction({ type: "guess", roomId, playerId, text: text.trim() });
    setText("");
  };

  const underscores =
    secretWord && isDrawer
      ? secretWord
          .split("")
          .map((c) => (c === " " ? " " : "_"))
          .join(" ")
      : "_ ".repeat(wordLength).trim();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/80">
      <div className="border-b border-slate-800 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-300">Chat</h3>
        {!isDrawer && wordLength > 0 && (
          <p className="mt-1 font-mono text-lg tracking-widest text-brand-300">
            {hasGuessed ? "✔️ You guessed it!" : underscores}
          </p>
        )}
        {isDrawer && secretWord && (
          <p className="mt-1 text-sm text-brand-300">
            Draw: <span className="font-bold">{secretWord}</span>
          </p>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 text-sm ${
              msg.kind === "correct"
                ? "text-green-400"
                : msg.kind === "close"
                  ? "text-amber-400"
                  : msg.kind === "system"
                    ? "text-slate-500 italic"
                    : "text-slate-200"
            }`}
          >
            <img
              src={`/avatars/${msg.avatar}.svg`}
              alt=""
              className="mt-0.5 h-6 w-6 shrink-0 rounded bg-slate-700"
            />
            <div>
              <span className="font-medium">{msg.playerName}: </span>
              <span>{msg.text}</span>
              {msg.kind === "close" && (
                <span className="ml-1 text-xs">🔥 close!</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isDrawer && !hasGuessed && !disabled && (
        <form onSubmit={sendGuess} className="border-t border-slate-800 p-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your guess..."
              maxLength={50}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              Send
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
