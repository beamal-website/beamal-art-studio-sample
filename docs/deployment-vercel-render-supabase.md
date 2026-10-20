# Vercel + Render + Supabase

This repository includes a Render Blueprint at [`render.yaml`](../render.yaml). It deploys the Node API on Render; Vercel serves the Vite frontend; Supabase PostgreSQL stores application records.

## Required settings

1. Create a Supabase PostgreSQL project. Copy its PostgreSQL connection string from the Supabase database connection settings. Use the PostgreSQL URL, not the Supabase REST project URL.
2. Create a Render Blueprint from the `test` branch and review its Starter web service and 1 GB persistent disk. Render service and disk charges may apply when deployed.
3. In Render, set `DATABASE_URL` to the Supabase PostgreSQL connection string and `BEAMAL_ALLOWED_ORIGINS` to the exact Vercel production origin, such as `https://your-site.vercel.app` (no path or trailing slash). Keep `DATABASE_URL` secret; never commit it or send it in chat. Confirm the startup log says PostgreSQL is ready; a log saying the service is initializing with SQLite means it is not using the Supabase database.
4. Set the Vercel project root directory to `sample`. The `sample/vercel.json` rewrite proxies `/api/*` to the Render service's current primary URL, so update its destination if Render gives the service a different URL. Leave `VITE_BEAMAL_API_BASE_URL` unset for production; browser requests and session cookies stay on the Vercel origin. Redeploy Vercel after changing this configuration.

The Render service enables HTTPS-only session cookies and listens on Render's port. The persistent disk is mounted at `/var/data`; private material attachments use `/var/data/beamal.sqlite.attachments`.

In PostgreSQL mode, expired temporary uploads are cleaned when the API starts rather than by a recurring timer. This avoids blocking Render's HTTP health checks while a synchronous PostgreSQL query runs; expired uploads are still rejected, and their unused files are removed on the next service start.

The Render listener now runs as a lightweight gateway separate from the database-backed application worker. `/api/health` stays responsive while the worker is busy with a PostgreSQL query, and reports `503` during worker startup instead of timing out. A worker restart is logged and retried with a short backoff; check the worker startup lines for PostgreSQL initialization errors if the health endpoint remains unavailable.

Slow API responses log only the HTTP method, a privacy-safe route label and duration. Slow login and session requests also report gateway-to-worker queue delay and timings for body reading, password verification and authentication database operations; these logs never include credentials or SQL parameters. PostgreSQL slow-query logs include the operation and duration. If clients disconnect while waiting, the gateway logs that separately from worker-forwarding errors.

## Integrated trial and lesson workflows

The public course enquiry form saves an unreserved enquiry in `trial_inquiries`. It does not reserve a seat. The exact-slot application flow uses `trial_applications`, applicant records, reservation records and teacher follow-up. Its `trialFormPolicy` remains explicit; the default does not open new exact-slot submissions.

On startup, an older cloud `trial_applications` table containing the enquiry form's `student_name_zh` columns is renamed to `trial_inquiries` without changing its rows or IDs. The reserved-slot schema is then initialized separately. Existing local slot-backed tables keep their original names and records. The importer likewise maps old enquiry rows to `trial_inquiries` and refuses overlapping enquiry sources rather than overwriting them.

When an administrator resolves a student lesson request by assigning another lesson, the original attendance, internal annotations and any Pending arrangement are archived in the assignment audit. The replacement retains the original paid order, increments the student-session version, starts with unmarked attendance and closes the original Pending task atomically. This does not enable the separate unfinished teacher Make Up confirmation action.

## Import the current SQLite database

The importer defaults to `sample/.data/local-demo/beamal.sqlite`. Set `DATABASE_URL` in your local terminal from a secure password manager or shell secret prompt, then run:

```sh
npm run migrate:sqlite-to-postgres --prefix sample
```

To import another SQLite file, set `SQLITE_SOURCE_PATH` before running the same command. The importer initializes the current PostgreSQL schema, permits only known unchanged bootstrap values (including the default availability settings), and refuses a target that already contains application data. It then imports table rows in foreign-key order while preserving IDs, versions, audit records, password hashes, and course records. It uses one database transaction and does not modify the SQLite source. Do not run it again after the import has completed; the target will no longer be considered empty.

The SQLite attachment files are stored beside the database, not inside it. The row importer does **not** copy those files; copy `sample/.data/local-demo/beamal.sqlite.attachments/` to Render's `/var/data/beamal.sqlite.attachments/` using a secure transfer before relying on existing attachment records.

No cloud import has been run from this workspace because Supabase credentials are intentionally not collected in chat. The local SQLite data remains unchanged until you run the importer with your own `DATABASE_URL`.
