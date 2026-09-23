$ErrorActionPreference = "Stop"

Write-Host "Signing in to Cloudflare..." -ForegroundColor Cyan
npx --yes wrangler@4.92.0 login

$migrations = @(
  "drizzle/0000_glossy_lorna_dane.sql",
  "drizzle/0001_watery_amphibian.sql",
  "drizzle/0002_sturdy_red_ghost.sql",
  "drizzle/0003_steep_the_liberteens.sql"
)

foreach ($migration in $migrations) {
  Write-Host "Applying $migration..." -ForegroundColor Cyan
  npx --yes wrangler@4.92.0 d1 execute stayaxis-cardamom-test --remote --file $migration
}

Write-Host "Deploying StayAxis..." -ForegroundColor Cyan
npx --yes wrangler@4.92.0 deploy --config dist/server/wrangler.json

Write-Host "Deployment completed. Enable Cloudflare Access before sharing the URL." -ForegroundColor Green
