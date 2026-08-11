"use client";

import { useEffect, useRef, useState } from "react";
import AvatarDisplay from "@/components/AvatarDisplay";
import WordSelect from "@/components/WordSelect";
import type { GamePhase, TurnPointAward } from "@/lib/types";

const EXIT_ANIMATIONS = [
  "overlay-exit-up",
  "overlay-exit-flip",
  "overlay-exit-peel",
  "overlay-exit-zoom",
] as const;

interface TurnOverlayProps {
  phase: GamePhase;
  revealedWord: string | null;
  turnPointAwards: TurnPointAward[];
  roomId: string;
  playerId: string;
  wordChoices: string[];
  wordChoiceDeadline: number | null;
  isDrawer: boolean;
  drawerName: string;
}

export default function TurnOverlay({
  phase,
  revealedWord,
  turnPointAwards,
  roomId,
  playerId,
  wordChoices,
  wordChoiceDeadline,
  isDrawer,
  drawerName,
}: TurnOverlayProps) {
  const prevPhase = useRef<GamePhase>(phase);
  const [visible, setVisible] = useState(false);
  const [scoresMinDone, setScoresMinDone] = useState(false);
  const [exitAnim, setExitAnim] = useState<string | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showTurnSummary =
    visible &&
    !exitAnim &&
    (phase === "turn_end" ||
      (phase === "word_select" && !scoresMinDone && !!revealedWord));

  const showWordPick =
    visible &&
    !exitAnim &&
    phase === "word_select" &&
    (scoresMinDone || !revealedWord);

  useEffect(() => {
    if (phase === "turn_end") {
      setVisible(true);
      setExitAnim(null);
      setScoresMinDone(false);
      const timer = setTimeout(() => setScoresMinDone(true), 3000);
      return () => clearTimeout(timer);
    }

    if (phase === "word_select") {
      setVisible(true);
      setExitAnim(null);
      if (!revealedWord) {
        setScoresMinDone(true);
      }
    }

    if (
      phase === "drawing" &&
      (prevPhase.current === "word_select" || prevPhase.current === "turn_end")
    ) {
      const anim =
        EXIT_ANIMATIONS[Math.floor(Math.random() * EXIT_ANIMATIONS.length)];
      setExitAnim(anim);
      if (exitTimer.current) clearTimeout(exitTimer.current);
      exitTimer.current = setTimeout(() => {
        setVisible(false);
        setExitAnim(null);
      }, 650);
    }

    prevPhase.current = phase;
  }, [phase, revealedWord]);

  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    []
  );

  if (!visible) return null;

  return (
    <div
      className={`absolute inset-0 z-20 flex items-center justify-center p-4 ${
        exitAnim ? exitAnim : "comic-overlay-enter"
      }`}
      aria-live="polite"
    >
      <div className="absolute inset-0 bg-doodle-ink/25 backdrop-blur-[1px]" />

      <div
        className={`relative z-10 w-full max-w-md doodle-card border-doodle-ink p-5 shadow-sketch ${
          showWordPick ? "wobble-right" : "wobble-left"
        }`}
      >
        {showTurnSummary && (
          <div className="comic-panel-swap space-y-4">
            <div className="text-center">
              <p className="font-sketch text-sm uppercase tracking-wide text-doodle-muted">
                Turn over!
              </p>
              <h3 className="mt-1 font-sketch text-3xl text-doodle-ink">
                The word was
              </h3>
              <p className="mt-2 font-sketch text-4xl text-doodle-grape">
                {revealedWord ?? "???"}
              </p>
            </div>

            <div className="border-t-2 border-dashed border-doodle-ink/20 pt-4">
              <p className="mb-3 text-center font-sketch text-lg text-doodle-ink">
                Points this turn
              </p>
              {turnPointAwards.length > 0 ? (
                <ul className="space-y-2">
                  {turnPointAwards.map((award) => (
                    <li
                      key={award.playerId}
                      className="flex items-center gap-3 rounded-lg border-2 border-doodle-ink/15 bg-paper-dark px-3 py-2"
                    >
                      <AvatarDisplay
                        avatar={award.avatar}
                        className="h-9 w-9 rounded-md"
                      />
                      <span className="min-w-0 flex-1 truncate font-semibold text-doodle-ink">
                        {award.name}
                      </span>
                      <span className="font-sketch text-xl text-doodle-mint">
                        +{award.points}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-center text-sm text-doodle-muted">
                  Nobody scored this round.
                </p>
              )}
            </div>
          </div>
        )}

        {showWordPick && (
          <div className="comic-panel-swap">
            <WordSelect
              embedded
              roomId={roomId}
              playerId={playerId}
              choices={isDrawer ? wordChoices : []}
              deadline={wordChoiceDeadline}
              isDrawer={isDrawer}
              drawerName={drawerName}
            />
          </div>
        )}

        {visible &&
          !exitAnim &&
          phase === "turn_end" &&
          scoresMinDone &&
          !showWordPick && (
            <div className="py-8 text-center">
              <p className="font-sketch text-xl text-doodle-ink">
                Next up…
              </p>
              <div className="mx-auto mt-4 h-8 w-8 animate-spin rounded-full border-2 border-doodle-ink border-t-transparent" />
            </div>
          )}
      </div>
    </div>
  );
}
