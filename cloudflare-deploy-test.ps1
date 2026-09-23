$ErrorActionPreference = "Stop"

Write-Host "Signing in to Cloudflare..." -ForegroundColor Cyan
npx --yes wrangler@4.92.0 login

Write-Host "Applying tracked database migrations..." -ForegroundColor Cyan
npx --yes wrangler@4.92.0 d1 migrations apply stayaxis-cardamom-test --remote --config dist/server/wrangler.json

Write-Host "Deploying StayAxis..." -ForegroundColor Cyan
npx --yes wrangler@4.92.0 deploy --config dist/server/wrangler.json

Write-Host "Deployment completed. Enable Cloudflare Access before sharing the URL." -ForegroundColor Green
