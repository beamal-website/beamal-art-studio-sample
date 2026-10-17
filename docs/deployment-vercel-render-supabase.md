# Vercel + Render + Supabase

This repository includes a Render Blueprint at [`render.yaml`](../render.yaml). It deploys the Node API on Render; Vercel serves the Vite frontend; Supabase PostgreSQL stores application records.

## Required settings

1. Create a Supabase PostgreSQL project. Copy its PostgreSQL connection string from the Supabase database connection settings. Use the PostgreSQL URL, not the Supabase REST project URL.
2. Create a Render Blueprint from the `test` branch and review its Starter web service and 1 GB persistent disk. Render service and disk charges may apply when deployed.
3. In Render, set `DATABASE_URL` to the Supabase PostgreSQL connection string and `BEAMAL_ALLOWED_ORIGINS` to the exact Vercel production origin, such as `https://your-site.vercel.app` (no path or trailing slash). Keep `DATABASE_URL` secret; never commit it or send it in chat.
4. Set the Vercel project root directory to `sample`. The `sample/vercel.json` rewrite proxies `/api/*` to the Render service, so leave `VITE_BEAMAL_API_BASE_URL` unset for production; browser requests and session cookies stay on the Vercel origin. Redeploy Vercel after changing this configuration.

The Render service enables HTTPS-only session cookies and listens on Render's port. The persistent disk is mounted at `/var/data`; private material attachments use `/var/data/beamal.sqlite.attachments`.

In PostgreSQL mode, expired temporary uploads are cleaned when the API starts rather than by a recurring timer. This avoids blocking Render's HTTP health checks while a synchronous PostgreSQL query runs; expired uploads are still rejected, and their unused files are removed on the next service start.

## Import the current SQLite database

The importer defaults to `sample/.data/local-demo/beamal.sqlite`. Set `DATABASE_URL` in your local terminal from a secure password manager or shell secret prompt, then run:

```sh
npm run migrate:sqlite-to-postgres --prefix sample
```

To import another SQLite file, set `SQLITE_SOURCE_PATH` before running the same command. The importer initializes the current PostgreSQL schema, permits only known unchanged bootstrap values (including the default availability settings), and refuses a target that already contains application data. It then imports table rows in foreign-key order while preserving IDs, versions, audit records, password hashes, and course records. It uses one database transaction and does not modify the SQLite source. Do not run it again after the import has completed; the target will no longer be considered empty.

The SQLite attachment files are stored beside the database, not inside it. The row importer does **not** copy those files; copy `sample/.data/local-demo/beamal.sqlite.attachments/` to Render's `/var/data/beamal.sqlite.attachments/` using a secure transfer before relying on existing attachment records.

No cloud import has been run from this workspace because Supabase credentials are intentionally not collected in chat. The local SQLite data remains unchanged until you run the importer with your own `DATABASE_URL`.