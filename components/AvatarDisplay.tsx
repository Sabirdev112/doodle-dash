"use client";

import { parseAvatar, type AvatarConfig } from "@/lib/avatars";

const INK = "#2c2416";
const STROKE = 1.5;

interface AvatarDisplayProps {
  avatar: string;
  className?: string;
  title?: string;
  /** Play idle animations (bob, blink, character-specific). Default true. */
  animated?: boolean;
}

export default function AvatarDisplay({
  avatar,
  className = "",
  title,
  animated = true,
}: AvatarDisplayProps) {
  const config = parseAvatar(avatar);
  const animClass = animated ? "avatar-svg avatar-idle" : "avatar-svg";

  return (
    <svg
      viewBox="0 0 64 72"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animClass} ${className}`.trim()}
      data-face={config.face}
      role="img"
      aria-label={title ?? `Avatar: ${config.face}`}
    >
      <g className="avatar-outfit">
        <OutfitLayer outfit={config.outfit} />
      </g>
      <g className="avatar-head-group">
        <FaceLayer face={config.face} />
      </g>
      <g className="avatar-headgear">
        <HeadgearLayer headgear={config.headgear} />
      </g>
    </svg>
  );
}

/* ── Shared drawing helpers ── */

function Eye({
  cx,
  cy,
  r,
  sclera = true,
}: {
  cx: number;
  cy: number;
  r: number;
  sclera?: boolean;
}) {
  return (
    <g className="avatar-eye-blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      {sclera && (
        <circle cx={cx} cy={cy} r={r + 1.2} fill="#fff" stroke={INK} strokeWidth="1.2" />
      )}
      <circle cx={cx} cy={cy} r={r} fill={INK} />
      <circle cx={cx + r * 0.3} cy={cy - r * 0.3} r={r * 0.28} fill="#fff" />
    </g>
  );
}

function BigEye({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g className="avatar-eye-blink" style={{ transformOrigin: `${cx}px ${cy}px` }}>
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={INK} strokeWidth="1.3" />
      <circle cx={cx} cy={cy} r={r * 0.55} fill={INK} />
      <circle cx={cx + r * 0.2} cy={cy - r * 0.25} r={r * 0.18} fill="#fff" />
    </g>
  );
}

function Neck() {
  return (
    <rect x="27" y="33" width="10" height="6" rx="2" fill="#fca5a5" stroke={INK} strokeWidth="1" />
  );
}

function Whiskers({ y = 28 }: { y?: number }) {
  return (
    <>
      <path d={`M18 ${y} L8 ${y - 2}`} stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <path d={`M18 ${y + 4} L7 ${y + 4}`} stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <path d={`M18 ${y + 8} L8 ${y + 10}`} stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <path d={`M46 ${y} L54 ${y - 2}`} stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <path d={`M46 ${y + 4} L55 ${y + 4}`} stroke={INK} strokeWidth="1" strokeLinecap="round" />
      <path d={`M46 ${y + 8} L54 ${y + 10}`} stroke={INK} strokeWidth="1" strokeLinecap="round" />
    </>
  );
}

function Sleeve({ side, fill }: { side: "left" | "right"; fill: string }) {
  const d =
    side === "left"
      ? "M14 38 Q8 48 6 58 L14 60 Q16 52 18 44 Z"
      : "M50 38 Q56 48 58 58 L50 60 Q48 52 46 44 Z";
  return <path d={d} fill={fill} stroke={INK} strokeWidth={STROKE} />;
}

function Torso({ fill, d = "M18 36 L46 36 L48 58 Q32 66 16 58 Z" }: { fill: string; d?: string }) {
  return (
    <>
      <Sleeve side="left" fill={fill} />
      <Sleeve side="right" fill={fill} />
      <path d={d} fill={fill} stroke={INK} strokeWidth={STROKE} />
    </>
  );
}

/* ── Outfit layer ── */

function OutfitLayer({ outfit }: { outfit: AvatarConfig["outfit"] }) {
  switch (outfit) {
    case "hoodie":
      return (
        <>
          <path d="M14 38 Q8 50 6 60 L14 62 Q18 52 20 44 Z" fill="#9b5de5" stroke={INK} strokeWidth={STROKE} />
          <path d="M50 38 Q56 50 58 60 L50 62 Q46 52 44 44 Z" fill="#9b5de5" stroke={INK} strokeWidth={STROKE} />
          <path d="M16 34 L48 34 L50 58 Q32 68 14 58 Z" fill="#9b5de5" stroke={INK} strokeWidth={STROKE} />
          <path d="M16 34 Q32 44 48 34" fill="#7c3aed" stroke={INK} strokeWidth={STROKE} />
          <ellipse cx="32" cy="38" rx="8" ry="5" fill="#7c3aed" stroke={INK} strokeWidth="1.2" />
          <circle cx="28" cy="42" r="1" fill={INK} />
          <circle cx="32" cy="43" r="1" fill={INK} />
          <circle cx="36" cy="42" r="1" fill={INK} />
          <path d="M26 34 L26 30 M38 34 L38 30" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
    case "overalls":
      return (
        <>
          <Torso fill="#06d6a0" d="M18 36 L46 36 L48 58 Q32 66 14 58 Z" />
          <rect x="20" y="36" width="7" height="24" fill="#059669" stroke={INK} strokeWidth="1.2" />
          <rect x="37" y="36" width="7" height="24" fill="#059669" stroke={INK} strokeWidth="1.2" />
          <rect x="26" y="46" width="12" height="5" rx="1.5" fill="#ffd166" stroke={INK} strokeWidth="1.2" />
          <circle cx="23" cy="38" r="1.5" fill="#ffd166" stroke={INK} strokeWidth="0.8" />
          <circle cx="41" cy="38" r="1.5" fill="#ffd166" stroke={INK} strokeWidth="0.8" />
        </>
      );
    case "dress":
      return (
        <>
          <path d="M16 38 Q8 50 6 62 L16 64 Q20 54 22 46 Z" fill="#ff6b6b" stroke={INK} strokeWidth={STROKE} />
          <path d="M48 38 Q56 50 58 62 L48 64 Q44 54 42 46 Z" fill="#ff6b6b" stroke={INK} strokeWidth={STROKE} />
          <path d="M22 36 L42 36 L50 60 Q32 70 14 60 Z" fill="#ff6b6b" stroke={INK} strokeWidth={STROKE} />
          <path d="M28 44 L30 50 L34 44 L38 50 L40 44" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M30 36 Q32 40 34 36" stroke="#ffd166" strokeWidth="1.5" fill="none" />
        </>
      );
    case "suit":
      return (
        <>
          <Torso fill="#334155" />
          <path d="M22 36 L32 50 L42 36" fill="#475569" stroke={INK} strokeWidth="1.2" />
          <path d="M30 36 L32 58" stroke="#fff" strokeWidth="1.8" />
          <path d="M32 36 L32 44" stroke="#ff6b6b" strokeWidth="2.5" />
          <path d="M31 44 L32 50 L33 44 Z" fill="#ff6b6b" stroke={INK} strokeWidth="0.8" />
          <circle cx="32" cy="52" r="1" fill="#ffd166" stroke={INK} strokeWidth="0.6" />
        </>
      );
    case "jersey":
      return (
        <>
          <Torso fill="#4cc9f0" />
          <path d="M20 36 L44 36" stroke="#fff" strokeWidth="2" />
          <path d="M24 36 L24 58 M40 36 L40 58" stroke="#fff" strokeWidth="1.5" opacity="0.5" />
          <text x="32" y="52" textAnchor="middle" fontSize="11" fill="#fff" fontFamily="var(--font-sketch), cursive" fontWeight="bold">
            7
          </text>
        </>
      );
    default:
      return (
        <>
          <Torso fill="#ffd166" />
          <path d="M26 42 L38 42" stroke={INK} strokeWidth="1" opacity="0.3" />
          <circle cx="32" cy="48" r="2" fill="#fff" stroke={INK} strokeWidth="0.8" opacity="0.6" />
        </>
      );
  }
}

/* ── Face layer ── */

function FaceLayer({ face }: { face: AvatarConfig["face"] }) {
  switch (face) {
    case "dog":
      return (
        <>
          <ellipse cx="32" cy="26" rx="16" ry="15" fill="#d97706" stroke={INK} strokeWidth={STROKE} />
          <ellipse cx="17" cy="24" rx="7" ry="11" fill="#b45309" stroke={INK} strokeWidth={STROKE} />
          <ellipse cx="47" cy="24" rx="7" ry="11" fill="#b45309" stroke={INK} strokeWidth={STROKE} />
          <ellipse cx="32" cy="32" rx="5" ry="4" fill="#92400e" stroke={INK} strokeWidth="1.2" />
          <ellipse cx="32" cy="30" rx="2" ry="1.5" fill="#1e293b" />
          <Eye cx={26} cy={22} r={2.2} />
          <Eye cx={38} cy={22} r={2.2} />
          <path
            d="M28 36 Q32 42 36 36"
            fill="#fca5a5"
            stroke={INK}
            strokeWidth="1.2"
          />
          <ellipse cx="32" cy="37" rx="3" ry="2" fill="#ef4444" stroke={INK} strokeWidth="1" />
        </>
      );
    case "fox":
      return (
        <>
          <path d="M16 16 L22 28 L12 26 Z" fill="#f97316" stroke={INK} strokeWidth={STROKE} />
          <path d="M48 16 L42 28 L52 26 Z" fill="#f97316" stroke={INK} strokeWidth={STROKE} />
          <path d="M18 18 L20 24 L16 22 Z" fill="#fff" stroke={INK} strokeWidth="0.8" />
          <path d="M46 18 L44 24 L48 22 Z" fill="#fff" stroke={INK} strokeWidth="0.8" />
          <circle cx="32" cy="26" r="15" fill="#fb923c" stroke={INK} strokeWidth={STROKE} />
          <path d="M22 34 L42 34 L40 42 Q32 46 24 42 Z" fill="#fff" stroke={INK} strokeWidth="1.2" />
          <circle cx="32" cy="36" r="2" fill={INK} />
          <Eye cx={26} cy={24} r={2} />
          <Eye cx={38} cy={24} r={2} />
          <path d="M30 28 L28 26 M34 28 L36 26" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        </>
      );
    case "owl":
      return (
        <>
          <ellipse cx="32" cy="28" rx="17" ry="16" fill="#92400e" stroke={INK} strokeWidth={STROKE} />
          <path d="M24 10 Q26 6 28 10" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M36 10 Q38 6 40 10" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="24" cy="26" r="9" fill="#fef3c7" stroke={INK} strokeWidth="1.5" />
          <circle cx="40" cy="26" r="9" fill="#fef3c7" stroke={INK} strokeWidth="1.5" />
          <BigEye cx={24} cy={26} r={5} />
          <BigEye cx={40} cy={26} r={5} />
          <path d="M28 34 L32 40 L36 34 Z" fill="#f59e0b" stroke={INK} strokeWidth="1.2" />
          <path d="M14 28 Q10 32 12 36" stroke="#78350f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M50 28 Q54 32 52 36" stroke="#78350f" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      );
    case "panda":
      return (
        <>
          <circle cx="32" cy="26" r="17" fill="#fff" stroke={INK} strokeWidth={STROKE} />
          <circle cx="18" cy="12" r="7" fill="#1e293b" stroke={INK} strokeWidth="1.2" />
          <circle cx="46" cy="12" r="7" fill="#1e293b" stroke={INK} strokeWidth="1.2" />
          <ellipse cx="23" cy="24" rx="6" ry="7" fill="#1e293b" />
          <ellipse cx="41" cy="24" rx="6" ry="7" fill="#1e293b" />
          <circle cx="23" cy="24" r="2.2" fill="#fff" />
          <circle cx="41" cy="24" r="2.2" fill="#fff" />
          <ellipse cx="32" cy="32" rx="3.5" ry="2.5" fill="#1e293b" />
          <circle cx="24" cy="30" r="2" fill="#fca5a5" opacity="0.6" />
          <circle cx="40" cy="30" r="2" fill="#fca5a5" opacity="0.6" />
        </>
      );
    case "robot":
      return (
        <>
          <rect x="14" y="10" width="36" height="30" rx="5" fill="#cbd5e1" stroke={INK} strokeWidth={STROKE} />
          <rect x="14" y="10" width="36" height="8" rx="5" fill="#94a3b8" stroke={INK} strokeWidth="1" />
          <rect x="10" y="20" width="6" height="10" rx="2" fill="#94a3b8" stroke={INK} strokeWidth="1.2" />
          <rect x="48" y="20" width="6" height="10" rx="2" fill="#94a3b8" stroke={INK} strokeWidth="1.2" />
          <circle cx="13" cy="25" r="1.5" fill="#64748b" stroke={INK} strokeWidth="0.8" />
          <circle cx="51" cy="25" r="1.5" fill="#64748b" stroke={INK} strokeWidth="0.8" />
          <g className="avatar-robot-eye">
            <rect x="20" y="20" width="10" height="8" rx="2" fill="#4cc9f0" stroke={INK} strokeWidth="1" />
            <rect x="34" y="20" width="10" height="8" rx="2" fill="#4cc9f0" stroke={INK} strokeWidth="1" />
          </g>
          <rect x="24" y="32" width="16" height="4" rx="1" fill="#64748b" stroke={INK} strokeWidth="1" />
          <line x1="26" y1="33" x2="26" y2="35" stroke="#475569" strokeWidth="0.8" />
          <line x1="30" y1="33" x2="30" y2="35" stroke="#475569" strokeWidth="0.8" />
          <line x1="34" y1="33" x2="34" y2="35" stroke="#475569" strokeWidth="0.8" />
          <line x1="38" y1="33" x2="38" y2="35" stroke="#475569" strokeWidth="0.8" />
          <line x1="32" y1="10" x2="32" y2="4" stroke={INK} strokeWidth="1.5" />
          <circle cx="32" cy="3" r="2.5" fill="#ff6b6b" stroke={INK} strokeWidth="1" className="avatar-antenna-dot" />
        </>
      );
    case "alien":
      return (
        <>
          <ellipse cx="32" cy="26" rx="18" ry="19" fill="#86efac" stroke={INK} strokeWidth={STROKE} className="avatar-alien-head" />
          <ellipse cx="23" cy="24" rx="6" ry="9" fill="#fff" stroke={INK} strokeWidth="1.2" />
          <ellipse cx="41" cy="24" rx="6" ry="9" fill="#fff" stroke={INK} strokeWidth="1.2" />
          <ellipse cx="23" cy="25" rx="2.5" ry="4" fill={INK} />
          <ellipse cx="41" cy="25" rx="2.5" ry="4" fill={INK} />
          <circle cx="24" cy="23" r="1" fill="#fff" />
          <circle cx="42" cy="23" r="1" fill="#fff" />
          <path d="M28 34 Q32 38 36 34" stroke={INK} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <circle cx="20" cy="32" r="2" fill="#4ade80" opacity="0.5" />
          <circle cx="44" cy="32" r="2" fill="#4ade80" opacity="0.5" />
        </>
      );
    case "ghost":
      return (
        <>
          <path
            d="M14 26 Q14 6 32 6 Q50 6 50 26 L50 42 Q46 38 42 42 Q38 38 34 42 Q30 38 26 42 Q22 38 18 42 Q14 38 14 42 Z"
            fill="#e2e8f0"
            stroke={INK}
            strokeWidth={STROKE}
            className="avatar-ghost-body"
          />
          <BigEye cx={26} cy={22} r={3.5} />
          <BigEye cx={38} cy={22} r={3.5} />
          <ellipse cx="32" cy="32" rx="4" ry="5" fill={INK} />
          <circle cx="22" cy="28" r="2.5" fill="#fca5a5" opacity="0.5" />
          <circle cx="42" cy="28" r="2.5" fill="#fca5a5" opacity="0.5" />
        </>
      );
    default:
      return (
        <>
          <path d="M18 12 L22 22 L16 20 Z" fill="#fb923c" stroke={INK} strokeWidth={STROKE} />
          <path d="M46 12 L42 22 L48 20 Z" fill="#fb923c" stroke={INK} strokeWidth={STROKE} />
          <path d="M20 14 L22 18 L18 17 Z" fill="#fda4af" stroke={INK} strokeWidth="0.8" />
          <path d="M44 14 L42 18 L46 17 Z" fill="#fda4af" stroke={INK} strokeWidth="0.8" />
          <circle cx="32" cy="26" r="16" fill="#fb923c" stroke={INK} strokeWidth={STROKE} />
          <path d="M29 30 L32 33 L35 30 Z" fill="#fda4af" stroke={INK} strokeWidth="1" />
          <Eye cx={26} cy={22} r={2.5} />
          <Eye cx={38} cy={22} r={2.5} />
          <Whiskers />
          <path
            d="M27 34 Q32 38 37 34"
            stroke={INK}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M30 28 L28 26 M34 28 L36 26" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
        </>
      );
  }
}

/* ── Headgear layer ── */

function HeadgearLayer({ headgear }: { headgear: AvatarConfig["headgear"] }) {
  switch (headgear) {
    case "cap":
      return (
        <>
          <path d="M12 22 Q32 6 52 22 L54 26 L10 26 Z" fill="#4cc9f0" stroke={INK} strokeWidth={STROKE} />
          <path d="M10 26 L6 28 L54 28 L50 26 Z" fill="#38bdf8" stroke={INK} strokeWidth={STROKE} />
          <ellipse cx="32" cy="22" rx="4" ry="2" fill="#fff" stroke={INK} strokeWidth="0.8" opacity="0.7" />
        </>
      );
    case "crown":
      return (
        <>
          <path
            d="M16 20 L20 8 L24 16 L32 4 L40 16 L44 8 L48 20 L48 24 L16 24 Z"
            fill="#ffd166"
            stroke={INK}
            strokeWidth={STROKE}
          />
          <circle cx="20" cy="14" r="1.5" fill="#ff6b6b" stroke={INK} strokeWidth="0.6" />
          <circle cx="32" cy="10" r="1.5" fill="#4cc9f0" stroke={INK} strokeWidth="0.6" />
          <circle cx="44" cy="14" r="1.5" fill="#06d6a0" stroke={INK} strokeWidth="0.6" />
        </>
      );
    case "headphones":
      return (
        <>
          <path
            d="M14 24 Q14 8 32 8 Q50 8 50 24"
            fill="none"
            stroke={INK}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <rect x="10" y="22" width="9" height="14" rx="4" fill="#9b5de5" stroke={INK} strokeWidth={STROKE} />
          <rect x="45" y="22" width="9" height="14" rx="4" fill="#9b5de5" stroke={INK} strokeWidth={STROKE} />
          <rect x="12" y="26" width="5" height="8" rx="2" fill="#7c3aed" stroke={INK} strokeWidth="0.8" />
          <rect x="47" y="26" width="5" height="8" rx="2" fill="#7c3aed" stroke={INK} strokeWidth="0.8" />
        </>
      );
    case "bow":
      return (
        <>
          <path d="M20 12 L32 18 L20 24 Z" fill="#ff6b6b" stroke={INK} strokeWidth="1.2" />
          <path d="M44 12 L32 18 L44 24 Z" fill="#ff6b6b" stroke={INK} strokeWidth="1.2" />
          <circle cx="32" cy="18" r="3.5" fill="#ef4444" stroke={INK} strokeWidth="1.2" />
          <path d="M32 14 L32 22" stroke="#fff" strokeWidth="1" opacity="0.4" />
        </>
      );
    case "party":
      return (
        <>
          <path d="M26 6 L32 0 L38 6 L32 14 Z" fill="#ff6b6b" stroke={INK} strokeWidth="1.2" className="avatar-party-hat" />
          <circle cx="22" cy="10" r="2" fill="#ffd166" stroke={INK} strokeWidth="1" className="avatar-confetti" style={{ animationDelay: "0s" }} />
          <circle cx="42" cy="8" r="2" fill="#4cc9f0" stroke={INK} strokeWidth="1" className="avatar-confetti" style={{ animationDelay: "0.3s" }} />
          <circle cx="38" cy="14" r="1.5" fill="#06d6a0" stroke={INK} strokeWidth="1" className="avatar-confetti" style={{ animationDelay: "0.6s" }} />
          <circle cx="46" cy="12" r="1.5" fill="#9b5de5" stroke={INK} strokeWidth="1" className="avatar-confetti" style={{ animationDelay: "0.9s" }} />
        </>
      );
    default:
      return null;
  }
}
