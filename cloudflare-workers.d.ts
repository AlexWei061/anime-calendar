declare module "cloudflare:workers" {
  import type { AnyD1Database } from "drizzle-orm/d1";

  type AvatarObject = {
    body: ReadableStream<Uint8Array>;
    httpEtag?: string;
  };

  type AvatarBucket = {
    get(key: string): Promise<AvatarObject | null>;
    put(
      key: string,
      value: Uint8Array,
      options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
    ): Promise<unknown>;
    delete(key: string): Promise<void>;
  };

  export const env: { DB?: AnyD1Database; AVATARS?: AvatarBucket };
}
