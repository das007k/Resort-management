import { readFileSync, writeFileSync } from "node:fs";

const configPath = new URL("../dist/server/wrangler.json", import.meta.url);
const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID?.trim();

if (!databaseId) {
  throw new Error("Set CLOUDFLARE_D1_DATABASE_ID to the StayAxis test D1 database ID before deployment.");
}

const config = JSON.parse(readFileSync(configPath, "utf8"));
config.name = "stayaxis-cardamom";
config.topLevelName = "stayaxis-cardamom";
config.vars = {
  ...config.vars,
  STAYAXIS_OWNER_EMAIL: process.env.STAYAXIS_OWNER_EMAIL || "das007k@gmail.com",
  STAYAXIS_TESTER_EMAILS: process.env.STAYAXIS_TESTER_EMAILS || "sinson.vc@gmail.com",
};
config.d1_databases = [{
  binding: "DB",
  database_name: "stayaxis-cardamom-test",
  database_id: databaseId,
}];

writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
console.log("Configured Cloudflare Worker: stayaxis-cardamom");
