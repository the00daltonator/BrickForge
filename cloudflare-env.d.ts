declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    OWNER_EMAIL?: string;
    APP_SECRET?: string;
    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    BUCKET?: R2Bucket;
  }
}
