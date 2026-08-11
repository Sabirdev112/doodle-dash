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
    <div className="flex h-full flex-col doodle-card overflow-hidden">
      <div className="border-b-2 border-doodle-ink/10 bg-paper-dark px-4 py-3">
        <h3 className="font-sketch text-lg text-doodle-ink">Guesses</h3>
        {!isDrawer && wordLength > 0 && (
          <p className="mt-1 font-mono text-lg tracking-widest text-doodle-grape">
            {hasGuessed ? "✔️ nailed it!" : underscores}
          </p>
        )}
        {isDrawer && secretWord && (
          <p className="mt-1 text-sm text-doodle-muted">
            Draw: <strong className="text-doodle-ink">{secretWord}</strong>
          </p>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-doodle-muted/70">
            Type a guess…
          </p>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 text-sm ${
              msg.kind === "correct"
                ? "font-semibold text-doodle-mint"
                : msg.kind === "close"
                  ? "text-amber-600"
                  : "text-doodle-ink"
            }`}
          >
            <img
              src={`/avatars/${msg.avatar}.svg`}
              alt=""
              className="mt-0.5 h-6 w-6 shrink-0 rounded border border-doodle-ink/10 bg-paper-dark"
            />
            <div>
              <span className="font-semibold">{msg.playerName}: </span>
              <span>{msg.text}</span>
              {msg.kind === "close" && (
                <span className="ml-1 font-sketch text-xs">so close!</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isDrawer && !hasGuessed && !disabled && (
        <form
          onSubmit={sendGuess}
          className="border-t-2 border-doodle-ink/10 bg-white p-3"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="wild guess goes here…"
              maxLength={50}
              className="doodle-input flex-1 py-2 text-sm"
            />
            <button type="submit" className="doodle-btn-primary px-4 py-2 text-base">
              Go
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
