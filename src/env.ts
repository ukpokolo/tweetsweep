import { z } from "zod";

const base64Key = z
  .string()
  .refine((v) => Buffer.from(v, "base64").length === 32, {
    message: "must be 32 bytes, base64-encoded (openssl rand -base64 32)",
  });

const schema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  X_CLIENT_ID: z.string().min(1),
  X_CLIENT_SECRET: z.string().optional(),
  X_REDIRECT_URI: z.string().url(),
  ENCRYPTION_KEY: base64Key,
  SESSION_SECRET: z.string().min(32),
  TWEET_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  // Not needed until the embeddings / classification steps.
  VOYAGE_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Parses and caches process.env. Throws a readable error on bad config. */
export function getEnv(): Env {
  if (cached) return cached;
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = result.data;
  return cached;
}
