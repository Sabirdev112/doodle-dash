"use client";



import Link from "next/link";

import { use, useEffect, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import Canvas, { type CanvasHandle } from "@/components/Canvas";

import LeaveRoomButton from "@/components/LeaveRoomButton";

import Podium from "@/components/Podium";

import GuessChat from "@/components/GuessChat";

import PlayerList from "@/components/PlayerList";

import ReactionBar from "@/components/ReactionBar";

import RoundTimer from "@/components/RoundTimer";

import Scoreboard from "@/components/Scoreboard";

import ToolPanel, { type Tool } from "@/components/ToolPanel";

import TurnOverlay from "@/components/TurnOverlay";

import WaitingRoom from "@/components/WaitingRoom";

import { tryReconnectRoom, useGameStore } from "@/lib/store";

import ButtonSpinner from "@/components/ButtonSpinner";

import { usePusher } from "@/lib/usePusher";

import { checkRoomExists } from "@/lib/roomInvite";



export default function RoomPage({

  params,

}: {

  params: Promise<{ roomId: string }>;

}) {

  const { roomId } = use(params);

  const router = useRouter();

  const canvasRef = useRef<CanvasHandle>(null);

  const gateChecked = useRef(false);



  const {
    player,
    joinedRoomId,
    phase,
    settings,
    players,
    drawerId,
    secretWord,
    revealedWord,
    turnPointAwards,
    wordChoices,
    wordChoiceDeadline,
    wordLength,
    wordDisplay,
    turnEndTime,
    canvasActions,
    chatMessages,
    currentRound,
    totalRounds,
    finalStandings,
    connectionState,
    drawerName,
    sessionToken,
    applyRoomSnapshot,
  } = useGameStore();



  const [booting, setBooting] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  const [color, setColor] = useState("#000000");

  const [brushSize, setBrushSize] = useState(8);

  const [tool, setTool] = useState<Tool>("pencil");



  const inLobby = Boolean(player && joinedRoomId === roomId);



  usePusher(inLobby ? roomId : "", player?.id ?? "", sessionToken ?? "");



  useEffect(() => {
    if (gateChecked.current) return;
    gateChecked.current = true;

    const gate = async () => {
      const { player: currentPlayer, joinedRoomId: currentRoomId } =
        useGameStore.getState();

      if (currentPlayer && currentRoomId === roomId) {
        setBooting(false);
        return;
      }

      const reconnect = await tryReconnectRoom(roomId);
      if (reconnect.ok) {
        if (reconnect.data.snapshot) {
          applyRoomSnapshot(reconnect.data.snapshot as never);
        }
        setBooting(false);
        return;
      }

      useGameStore.getState().clearSession();
      setRedirecting(true);
      const exists = await checkRoomExists(roomId);
      router.replace(exists ? `/?room=${roomId}` : "/?expired=1");
    };

    void gate();
  }, [roomId, router, applyRoomSnapshot]);

  if (booting || redirecting || !player || joinedRoomId !== roomId) {

    return (

      <main className="flex min-h-screen items-center justify-center gap-3 font-sketch text-xl">

        <ButtonSpinner className="h-6 w-6" />

        Loading…

      </main>

    );

  }



  const me = players.find((p) => p.id === player.id);

  const isOwner = me?.isOwner ?? false;

  const isDrawer = drawerId === player.id;

  const hasGuessed = me?.hasGuessedCorrectly ?? false;

  const activeDrawerName =

    players.find((p) => p.id === drawerId)?.name ?? drawerName;

  const inGameBoard =

    phase === "word_select" || phase === "drawing" || phase === "turn_end";

  const displayWord = revealedWord ?? secretWord;



  return (

    <main className="min-h-screen px-4 py-6">

      <div className="mx-auto max-w-7xl">

        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">

          <div>

            <Link

              href="/"

              className="font-sketch text-2xl text-doodle-ink hover:text-doodle-grape"

            >

              Doodle Dash

            </Link>

            <span className="ml-2 font-body text-sm font-normal text-doodle-muted">

              · {roomId}

            </span>

            {phase !== "waiting" && phase !== "ended" && (

              <p className="text-sm text-doodle-muted">

                Round {currentRound}/{totalRounds}

                {activeDrawerName && phase === "drawing" && (

                  <> · {activeDrawerName} is drawing</>

                )}

              </p>

            )}

          </div>

          <div className="flex flex-wrap items-center gap-3">

            {connectionState === "disconnected" && (

              <span className="rounded-lg border-2 border-doodle-ink/30 bg-doodle-yellow/40 px-3 py-1 font-sketch text-sm">

                Reconnecting…

              </span>

            )}

            {connectionState === "connecting" && (

              <span className="rounded-lg border-2 border-doodle-ink/30 bg-doodle-sky/30 px-3 py-1 font-sketch text-sm">

                Connecting…

              </span>

            )}

            {phase === "drawing" && <RoundTimer endTime={turnEndTime} />}

            {phase !== "waiting" && <LeaveRoomButton variant="ghost" />}

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



        {inGameBoard && (

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

            <div className="space-y-4">

              {phase === "drawing" && isDrawer && secretWord && (
                <div className="doodle-card px-4 py-3 text-center">
                  <p className="font-sketch text-sm uppercase tracking-wide text-doodle-muted">
                    Draw this
                  </p>
                  <p className="mt-1 font-sketch text-3xl text-doodle-grape">
                    {secretWord}
                  </p>
                </div>
              )}

              <div className="relative">

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

                {(phase === "turn_end" || phase === "word_select") && (

                  <TurnOverlay

                    phase={phase}

                    revealedWord={displayWord}

                    turnPointAwards={turnPointAwards}

                    roomId={roomId}

                    playerId={player.id}

                    wordChoices={wordChoices}

                    wordChoiceDeadline={wordChoiceDeadline}

                    isDrawer={isDrawer}

                    drawerName={activeDrawerName}

                  />

                )}

              </div>

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

              {phase === "drawing" && (

                <ReactionBar roomId={roomId} playerId={player.id} />

              )}

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

                  wordDisplay={wordDisplay}

                  secretWord={secretWord}

                  disabled={phase !== "drawing"}

                />

              </div>

              <div className="doodle-card p-4">

                <PlayerList players={players} showTurnOrder />

              </div>

            </div>

          </div>

        )}



        {phase === "ended" && finalStandings && (

          <div className="space-y-4">

            <Podium standings={finalStandings} />

            <div className="mx-auto max-w-xs">

              <LeaveRoomButton className="w-full" />

            </div>

          </div>

        )}

      </div>

    </main>

  );

}

