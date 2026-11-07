# LightFix

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

- The existing published system at `https://linghtfix.netlify.app/` uses a static HTML/CSS/JavaScript frontend, a Netlify function at `/api`, and a Google Apps Script backend with Sheets records and Drive photos.
- The replacement system is to use Cloudflare for hosting, application code, domain routing, records, and photos. The planned implementation uses a Worker with static assets, D1 for structured records, and R2 for photos. The final domain has not been chosen; a `workers.dev` address can be used for initial validation.
- Both administrators and electricians use the LightFix username/password login. The user removed the planned Cloudflare Access requirement on 31 October 2026.

## Users

- People in the community report streetlight problems and check repair progress.
- Electricians receive assigned work and update repairs.
- Administrators approve staff accounts and manage work.

These roles were confirmed by the user on 31 October 2026.

## Product Purpose

LightFix lets residents report a problem at a numbered streetlight without creating an account, then follow that report through repair. Staff use authenticated areas to process reports and record repair outcomes.

## Positioning

The workflow centers on the pole number: a resident enters it when reporting, and the public progress board and individual tracking link show the resulting repair status and before and after photos. No broader market claim has been confirmed.

## Operating Context

- A resident finds the pole number on its label or QR code, selects or describes the symptom, supplies one reporter information field, and may attach a photo.
- The public site offers a community progress board and a link to an individual report.
- Technician and administrator areas require sign-in. New staff registrations require administrator approval.
- The backend stores reports, jobs, poles, accounts, registrations, notifications, and audit records in Sheets; it stores photos in Drive.

## Capabilities and Constraints

- Public reporting supports pole numbers, symptoms, one of name/phone/email/LINE ID, and an optional before photo. The UI says symptoms and photos are public while reporter information is visible to staff.
- The public board shows report status, date, and photo availability. Individual report pages show repair progress and available before and after photos.
- The live technician area has a dashboard, jobs, pole history, and messages. The administrator area additionally manages assignments, poles, account approvals, roles, activation, and temporary passwords. The current app does not record or expose an activity log; do not promise one in the UI.
- Administrators may permanently delete poles and accounts only when no report or repair history references them. Otherwise, they deactivate the pole or account to preserve work history. New staff accounts can be created with a one-time temporary password that must be changed at first sign-in.
- Residents may choose link-only tracking or provide phone/LINE/email for callback. Link-only preference is explicitly stored using the existing name contact type with a tracking-preference value; legacy names remain intact. Hazardous pole/wire symptoms show a warning and request a reachable contact if convenient, without blocking reporting. No local emergency phone has been supplied as of 2 November 2026.
- Electricians land on My Work, separating assigned waiting poles from active jobs. Queue cards group reports by pole, preserving each report for tracking. Hazard labels are inferred from reported symptoms, not an official emergency severity assessment. Work mutations use per-pole revisions and a single-active-job constraint; stale writes require an explicit refresh. Browser filter preferences are scoped to user and role.
- My Work opens on active repairs. Waiting and active cards share symptoms, reported-hazard wording, before-photo access, location and work instructions. Administrators assign or cancel from the relevant pole card. The overview distinguishes unique pole counts from complaint counts. Technician navigation combines overlapping work views while retaining pole information, history and messages.
- Work-note and completion text drafts survive reload in account-scoped session storage for up to 24 hours. Prepared photos survive closing/reopening the dialog in the same page only; the interface explains reselection after reload. Photos are never stored in browser session storage. Revision-conflict recovery preserves the form, presents the latest work context, and asks the staff member to review before retrying.
- The source includes a clearly marked fictional demo mode. Demo records must remain distinguishable from real reports.
- The confirmed migration scope is the 50 pole records in `LinghtFix 3 - Poles.csv` and usernames with roles from the three accounts in `LinghtFix 3 - Accounts.csv`. Repair history, reports, photos, display names, and all old password hashes stay behind. Staff set new passwords before using the replacement. The CSV exports were provided on 31 October 2026.
- Open decision: whether reporter information must permit a reply. The current form accepts a name alone, while its copy says staff may follow up.
- Open decision: the official emergency advice and contact channel for damaged or hanging electrical wires.
- The supplied frontend archive does not include the Netlify function referenced by its `/api` redirect, even though that function is running on the published site. The function's source and its connection to Apps Script remain unverified, so this copy is not a complete deployable project.

## Brand Commitments

- Product name: LightFix. The public interface is Thai-first, with an English option in source code.
- The selected visual direction is “ศูนย์ประสานงาน” (Coordination Centre): a deep teal command header, pale green-gray working ground, white records, and selective yellow action cues. Residents and staff share a visual grammar for pole number, status, and next action.
- The only logo symbol is the yellow outline lightbulb. “LightFix” is separate interface text rendered in self-hosted Urbanist; Thai interface text uses self-hosted IBM Plex Sans Thai.
- The public first priority remains completing a report quickly without an account. Status and progress must remain understandable in words as well as color.

## Evidence on Hand

- User-supplied `deploy-nelify 3.zip` (frontend and Netlify configuration) and `Code.gs.txt` (Apps Script backend), received 31 October 2026.
- Live public interface at `https://linghtfix.netlify.app/`, inspected 31 October 2026. The live version and supplied source both identify themselves as LightFix 3.1.
- The user signed in to the live technician and administrator areas for a read-only inspection on 31 October 2026. No confirmed service-level target, official emergency contact, or customer quote has been provided.

## Product Principles

1. Make it quick for a resident to report a specific streetlight without an account.
2. Keep repair status understandable through a report-specific link and public progress view.
3. Keep reporter contact information out of public views.
4. Give staff role-appropriate access to assign, complete, and document repairs.
5. Keep fictional demonstration data clearly separated from live records.

## Pole details — 7 November 2026

Both authenticated roles can open a pole dossier from the pole-number button in the pole registry. It loads independent per-pole totals on demand, not from the workspace500-record snapshot: completed repairs, waiting/working complaints, all complaints including cancellations, latest report/repair and average start-to-completion duration. The screen ranks non-canceled complaint symptoms and completed repair causes, shows registry metadata, technician/public notes and before/after photo links when available. Repair and complaint histories are each paged20 rows at a time. Counts describe retained records, not a lifetime estimate. The endpoint excludes reporter contacts and requires an active staff session.
