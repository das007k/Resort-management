# StayAxis Cardamom — Cloudflare test deployment

This package is configured for:

- Worker: `stayaxis-cardamom`
- D1 database: `stayaxis-cardamom-test`
- Owner/Admin: `das007k@gmail.com`
- Tester/Manager: `sinson.vc@gmail.com`

## Deploy from Windows

1. Extract the ZIP file.
2. Open PowerShell inside the extracted folder.
3. Run:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\cloudflare-deploy-test.ps1
   ```

4. Complete the Cloudflare login/authorization in the browser when prompted.
5. Wait for the script to apply the four database migrations and deploy the Worker.
6. Copy the `workers.dev` URL printed by Wrangler.

## Protect the testing URL

Do not share the URL until Cloudflare Access is enabled.

1. Cloudflare Dashboard → **Workers & Pages**.
2. Open **stayaxis-cardamom**.
3. Open **Settings → Domains & Routes**.
4. For the `workers.dev` URL, choose **Enable Cloudflare Access**.
5. Create an Allow policy containing only:
   - `das007k@gmail.com`
   - `sinson.vc@gmail.com`
6. Save the policy.
7. First open the application using `das007k@gmail.com` to initialize the Admin account.
8. The tester can then sign in using `sinson.vc@gmail.com` and will receive Manager access.

Use test reservations and dummy payment data only.
