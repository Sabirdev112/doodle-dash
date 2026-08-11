"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Canvas, { type CanvasHandle } from "@/components/Canvas";
import EndGamePodium from "@/components/EndGamePodium";
import GuessChat from "@/components/GuessChat";
import PlayerList from "@/components/PlayerList";
import RoundTimer from "@/components/RoundTimer";
import Scoreboard from "@/components/Scoreboard";
import ToolPanel, { type Tool } from "@/components/ToolPanel";
import WaitingRoom from "@/components/WaitingRoom";
import WordSelect from "@/components/WordSelect";
import { sendAction, useGameStore } from "@/lib/store";
import { usePusher } from "@/lib/usePusher";

export default function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const canvasRef = useRef<CanvasHandle>(null);

  const {
    player,
    phase,
    settings,
    players,
    drawerId,
    secretWord,
    wordChoices,
    wordChoiceDeadline,
    wordLength,
    turnEndTime,
    canvasActions,
    chatMessages,
    currentRound,
    totalRounds,
    finalStandings,
    connectionState,
    drawerName,
    applySnapshot,
    setRoomId,
  } = useGameStore();

  const [joined, setJoined] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [color, setColor] = useState("#000000");
  const [brushSize, setBrushSize] = useState(8);
  const [tool, setTool] = useState<Tool>("brush");

  usePusher(joined ? roomId : "", player?.id ?? "");

  useEffect(() => {
    if (!player) {
      router.replace(`/?room=${roomId}`);
      return;
    }

    const join = async () => {
      try {
        const res = await fetch("/api/room/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId,
            playerId: player.id,
            name: player.name,
            avatar: player.avatar,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setJoinError(data.error ?? "Could not join room");
          return;
        }
        setRoomId(roomId);
        applySnapshot({
          settings: data.settings,
          phase: data.phase,
          players: data.players ?? [],
        });
        setJoined(true);
      } catch {
        setJoinError("Network error");
      }
    };

    void join();
  }, [roomId, player, router, applySnapshot, setRoomId]);

  useEffect(() => {
    const handleUnload = () => {
      if (player) {
        navigator.sendBeacon(
          "/api/room/action",
          JSON.stringify({ type: "leave", roomId, playerId: player.id })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [roomId, player]);

  if (!player) return null;

  if (joinError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="doodle-card max-w-md p-8 text-center">
          <p className="text-doodle-coral">{joinError}</p>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="doodle-btn-primary mt-4"
          >
            Go home
          </button>
        </div>
      </main>
    );
  }

  if (!joined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-doodle-ink border-t-transparent" />
      </main>
    );
  }

  const me = players.find((p) => p.id === player.id);
  const isOwner = me?.isOwner ?? false;
  const isDrawer = drawerId === player.id;
  const hasGuessed = me?.hasGuessedCorrectly ?? false;

  return (
    <main className="min-h-screen px-4 py-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-sketch text-2xl text-doodle-ink">
              Doodle Dash
              <span className="ml-2 font-body text-sm font-normal text-doodle-muted">
                · {roomId}
              </span>
            </h1>
            {phase !== "waiting" && phase !== "ended" && (
              <p className="text-sm text-doodle-muted">
                Round {currentRound}/{totalRounds}
                {drawerName && ` · ${drawerName} is drawing`}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {connectionState !== "connected" && (
              <span className="rounded-lg border-2 border-doodle-ink/30 bg-doodle-yellow/40 px-3 py-1 font-sketch text-sm">
                {connectionState === "connecting" ? "Connecting…" : "Reconnecting…"}
              </span>
            )}
            {phase === "drawing" && <RoundTimer endTime={turnEndTime} />}
          </div>
        </header>

        {phase === "waiting" && (
          <WaitingRoom
            roomId={roomId}
            playerId={player.id}
            players={players}
            isOwner={isOwner}
            maxPlayers={settings?.maxPlayers ?? 8}
          />
        )}

        {phase === "word_select" && (
          <WordSelect
            roomId={roomId}
            playerId={player.id}
            choices={isDrawer ? wordChoices : []}
            deadline={wordChoiceDeadline}
            isDrawer={isDrawer}
            drawerName={
              players.find((p) => p.id === drawerId)?.name ?? drawerName
            }
          />
        )}

        {(phase === "drawing" || phase === "turn_end") && (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              {phase === "turn_end" && (
                <div className="doodle-card px-4 py-3 text-center font-sketch text-lg text-doodle-ink">
                  Time&apos;s up! It was{" "}
                  <strong className="text-doodle-grape">{secretWord ?? "???"}</strong>
                </div>
              )}
              <Canvas
                ref={canvasRef}
                roomId={roomId}
                playerId={player.id}
                actions={canvasActions}
                isDrawer={isDrawer}
                color={color}
                size={brushSize}
                tool={tool}
                disabled={phase !== "drawing"}
              />
              <ToolPanel
                color={color}
                size={brushSize}
                tool={tool}
                disabled={!isDrawer || phase !== "drawing"}
                onColorChange={setColor}
                onSizeChange={setBrushSize}
                onToolChange={setTool}
                onUndo={() => canvasRef.current?.undo()}
              />
            </div>
            <div className="flex flex-col gap-4">
              <div className="doodle-card p-4">
                <Scoreboard players={players} />
              </div>
              <div className="min-h-[300px] flex-1">
                <GuessChat
                  roomId={roomId}
                  playerId={player.id}
                  messages={chatMessages}
                  isDrawer={isDrawer}
                  hasGuessed={hasGuessed}
                  wordLength={wordLength}
                  secretWord={secretWord}
                  disabled={phase !== "drawing"}
                />
              </div>
              <div className="doodle-card p-4">
                <PlayerList players={players} />
              </div>
            </div>
          </div>
        )}

        {phase === "ended" && finalStandings && (
          <EndGamePodium standings={finalStandings} />
        )}
      </div>
    </main>
  );
}
