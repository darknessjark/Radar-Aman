# Radar Aman (رادار أمان)

**AI-assisted early warning against online scam ads in the UAE.** Built for the SCAMSHIELD AI hackathon.

Live demo: https://radar-aman.vercel.app  ·  Officer dashboard: `/admin` (password protected)

> رادار أمان: افحص الإعلان أو الرسالة قبل ما تدفع. ويحوّل بلاغات الناس إلى ملفات جاهزة للضابط.

---

## 1. The problem

Scam ads (fake chalet rentals, "confiscated" cars, fake visas and maid-recruitment offers, guaranteed-profit trading, fake government payment pages) spread faster than they can be reviewed. Two things make this hard:

- **Residents** see an ad and have no quick way to tell whether it is safe before they pay a deposit.
- **Investigators** receive reports one at a time, as screenshots, with no link between cases. The same phone number, IBAN or stolen photo can sit behind dozens of ads and nobody sees the pattern.

## 2. The solution

Radar Aman has two sides that share one case file.

**Public side (`/`)**: a resident pastes the ad text or link, or uploads a screenshot (it also works from the Android share sheet). In seconds they get a plain-language verdict (low risk, suspicious, likely scam), a 0-100 risk score, 2 to 4 short reasons, and advice on what to do. One tap reports the ad to Radar Aman.

**Officer side (`/admin`)**: every scan becomes a case. The officer sees:

- the full AI analysis, extracted entities (phones, IBANs, domains, accounts, emails) and a price-vs-market check;
- a **deep check** that searches the web to verify the account, phone number, price and site reputation, with sources;
- **linked cases**: cases that share a phone, IBAN, domain, account, email or a near-identical image are grouped into networks;
- a ready-to-paste **platform report** (English, with evidence and a SHA-256 evidence hash) and a full case report;
- **warning posts**: the AI drafts an awareness post for Instagram, the officer reviews it, hides private data on the screenshot, and approves it. Nothing is published without officer approval, and only for cases scoring 65% or higher;
- a **watchlist** of keywords. A daily monitor searches the Meta Ad Library (Instagram and Facebook, UAE) and submits up to 3 ads per day for scanning.

Everything works in Arabic (RTL) and English, and the site installs as a PWA.

## 3. How it works

```
Resident ──► /api/scan ──► quickScan (Claude, vision + text) ──┐
                           + linkCheck (domain heuristics)     ├─► case in Redis ──► linked-case matching
Meta Ad Library monitor ─► /api/auto (3/day, deduped) ─────────┘            │
                                                                            ▼
Officer ──► /admin ──► deep check (Claude + web search) · report · warning post (human approval) ──► Instagram
```

| Piece | What it does | Where |
|---|---|---|
| Quick scan | Claude reads the ad text and up to 3 screenshots and returns structured JSON: score, verdict, reasons, entities, price analysis, account signals (age, followers vs engagement, closed comments, verification) | `lib/ai.js` |
| Link check | Rule-based, offline: lookalike of official UAE bodies (e.g. `tamm`, `adpolice`), fake `gov`, raw IPs, punycode, link shorteners, risky TLDs, WhatsApp redirects | `lib/linkcheck.js` |
| Deep check | Claude with the web search tool (max 8 searches), told to rely only on what it finds and to say "none" when it finds nothing. Returns findings by area with sources and a re-scored risk | `lib/ai.js` |
| Case linking | Shared entities are normalised into keys (phone last 9 digits, IBAN, domain, handle, email). Screenshots get a 64-bit difference hash in the browser and match at Hamming distance 8 or less. Union-find groups cases into networks | `lib/networks.js`, `lib/clientImage.js` |
| Warning posts | Claude drafts the post and finds regions of the screenshot to cover (faces, names, phones, links, QR codes) and a crop. Officer edits and approves, then it is published through the Instagram Graph API | `lib/post.js`, `lib/postImage.js` |
| Daily monitor | Receives ads found in the Meta Ad Library, dedupes by ad id, hard cap per day | `app/api/auto/route.js` |

## 4. Technical choices and trade-offs

**Next.js (App Router) on Vercel, Upstash Redis for storage.** One small codebase for UI and API, no servers to run, and a free tier that fits a prototype. Redis is enough because a case is one JSON document plus a sorted set for ordering. The trade-off is that there is no real querying: listing and linking load the latest 300 to 500 cases into memory. This is fine for a prototype and would need a proper database at scale.

**One strong model call plus deterministic checks, rather than a trained classifier.** We have no labelled UAE scam dataset, and scam wording changes weekly. A general model that can read Arabic, English and screenshots and *explain* its verdict works from day one, and the explanation matters because an officer has to trust and act on it. The rule-based link check runs first and its result is passed into the prompt, so the model does not have to guess whether `tamm-fines-pay.top` is official.

**Structured JSON output with strict prompt rules.** The model must quote entities verbatim, must not invent facts, must not claim a place or product does not exist (it says "needs verification"), and must lower confidence when information is thin. Output is parsed defensively (digits normalised, one retry, a repair pass for the deep check).

**Deep check is a separate, on-demand step.** Web search is slow and costs more, so the quick scan answers in seconds and the officer chooses which cases deserve the deep check.

**Human in the loop for anything public.** The AI drafts, the officer decides. Posts are scrubbed of phones, IBANs, links, emails and handles in code (not only in the prompt), and the officer must tick that the screenshot has been reviewed before approval.

**Cost and abuse limits.** Daily caps on quick scans (150), deep checks (40) and automatic monitor intake (3), all configurable. A public link cannot drain the API balance.

## 5. Privacy design

- **Image fingerprints are computed in the browser.** Matching uses an 8x8 hash, so near-duplicate detection does not need the original image.
- **Only small thumbnails (up to 3) are kept for every case.** A post-size copy of the first screenshot is stored for 30 days only so the officer can build a warning post.
- **Warning posts never name accounts, people, companies, phones, IBANs or links.** They describe the pattern ("we observed ads that..."), not a person.
- **Officer features need the admin password.** Public visitors can only scan, view their own result and report.
- **Errors never echo secrets.** Instagram token values are stripped from error messages.
- **Be aware:** screenshots and text are sent to the Anthropic API for analysis, and a case page is readable by anyone who holds its random 18-character id (it is meant to be shareable). Case records themselves have no expiry yet.

## 6. What we left out, and what we would do differently with more time

- **Authentication.** Admin access is a single shared password sent in a header. Next steps: individual officer accounts (UAE PASS), roles, an audit log of who approved what, and login rate limiting.
- **Retention.** Case records should expire or be anonymised on a schedule, and the 30-day image retention should be configurable.
- **Domain reputation.** The link check only looks at the domain name. It does not check domain age, WHOIS, or live blocklists. The deep check partly covers this through web search.
- **Monitor sees less than a person would.** The Meta Ad Library monitor analyses the page name and ad title only, not the ad image or landing page. It also depends on an external scheduled agent that is not part of this repo.
- **No evaluation yet.** We have no labelled test set, so we cannot report precision or recall. The score is a triage aid, not a verdict, and the UI says so. The first step would be to collect confirmed cases from officers and measure agreement.
- **No automated tests** for the parsing, linking and scrubbing code.
- **Platform reporting is manual.** We generate the report text, but an officer submits it through each platform's channel. Direct integrations with takedown channels would close the loop.
- **Scale.** Replace in-memory linking with an indexed store (entities as keys, image hashes in a similarity index).

## 7. Build and run

**Requirements:** Node.js 20 or newer, an Anthropic API key, and an Upstash Redis database (free tier is enough).

```bash
git clone https://github.com/darknessjark/radar-aman.git
cd radar-aman
npm install
```

Create a `.env.local` file:

```bash
ANTHROPIC_API_KEY=sk-ant-...
ADMIN_PASSWORD=choose-a-password
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...
```

Then:

```bash
npm run dev      # http://localhost:3000   (officer dashboard: /admin)
npm run build && npm start   # production mode
```

To deploy on Vercel, import the repo, add the same variables under Environment Variables (or add Upstash Redis from the Storage tab, which adds its variables for you), and deploy.

### Optional environment variables

| Variable | Purpose | Default |
|---|---|---|
| `CLAUDE_MODEL` | Model used for all AI calls | `claude-sonnet-5-5` |
| `DAILY_SCAN_LIMIT` | Quick scans per day | 150 |
| `DAILY_DEEP_LIMIT` | Deep checks per day | 40 |
| `AUTO_KEY` | Secret for `/api/auto` (daily Meta Ad Library monitor). Intake is disabled if unset | none |
| `AUTO_DAILY_LIMIT` | Ads the monitor may submit per day | 3 |
| `INGEST_KEY` | Secret for `/api/ingest` (future automatic collectors). Disabled if unset | none |
| `POST_MIN_SCORE` | Minimum risk score for a warning post | 65 |
| `IG_ACCESS_TOKEN`, `IG_USER_ID`, `IG_MODE`, `IG_GRAPH_VERSION` | Instagram publishing. Without a token, approved posts are saved but not published | none |

### Project layout

```
app/page.js            public scan page
app/admin/             officer dashboard (cases, networks, warning posts, watchlist)
app/api/               scan, deep, case, report, auto, ingest, admin/*
lib/ai.js              quick scan and deep check prompts
lib/linkcheck.js       offline domain heuristics
lib/networks.js        case linking and network grouping
lib/post.js           warning post drafting, scrubbing, Instagram publishing
lib/db.js              Redis access and daily limits
lib/i18n.js            Arabic and English strings
```
