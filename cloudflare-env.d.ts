declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    STAYAXIS_OWNER_EMAIL?: string;
    STAYAXIS_TESTER_EMAILS?: string;
  }
}
