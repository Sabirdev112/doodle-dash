const SERVER_ENV_KEYS = [
  "PUSHER_APP_ID",
  "PUSHER_KEY",
  "PUSHER_SECRET",
  "PUSHER_CLUSTER",
] as const;

const PUBLIC_ENV_KEYS = [
  "NEXT_PUBLIC_PUSHER_KEY",
  "NEXT_PUBLIC_PUSHER_CLUSTER",
] as const;

export type ServerEnv = {
  PUSHER_APP_ID: string;
  PUSHER_KEY: string;
  PUSHER_SECRET: string;
  PUSHER_CLUSTER: string;
  SESSION_SECRET: string;
};

export type PublicEnv = {
  NEXT_PUBLIC_PUSHER_KEY: string;
  NEXT_PUBLIC_PUSHER_CLUSTER: string;
};

function missingKeys(keys: readonly string[]): string[] {
  return keys.filter((key) => !process.env[key]?.trim());
}

export function getServerEnv(): ServerEnv {
  const missing = missingKeys(SERVER_ENV_KEYS);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  const sessionSecret =
    process.env.SESSION_SECRET?.trim() ?? process.env.PUSHER_SECRET!.trim();

  return {
    PUSHER_APP_ID: process.env.PUSHER_APP_ID!.trim(),
    PUSHER_KEY: process.env.PUSHER_KEY!.trim(),
    PUSHER_SECRET: process.env.PUSHER_SECRET!.trim(),
    PUSHER_CLUSTER: process.env.PUSHER_CLUSTER!.trim(),
    SESSION_SECRET: sessionSecret,
  };
}

export function getPublicEnv(): PublicEnv {
  const missing = missingKeys(PUBLIC_ENV_KEYS);
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(", ")}`);
  }

  return {
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY!.trim(),
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!.trim(),
  };
}

export function validateDeploymentEnv(): {
  ok: true;
  server: ServerEnv;
  public: PublicEnv;
} {
  const server = getServerEnv();
  const pub = getPublicEnv();

  if (server.PUSHER_KEY !== pub.NEXT_PUBLIC_PUSHER_KEY) {
    throw new Error(
      "PUSHER_KEY must match NEXT_PUBLIC_PUSHER_KEY (same Pusher app key)."
    );
  }
  if (server.PUSHER_CLUSTER !== pub.NEXT_PUBLIC_PUSHER_CLUSTER) {
    throw new Error(
      "PUSHER_CLUSTER must match NEXT_PUBLIC_PUSHER_CLUSTER (same Pusher cluster)."
    );
  }

  return { ok: true, server, public: pub };
}
