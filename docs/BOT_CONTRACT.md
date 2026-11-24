# Research bot contract

The app sends the bot a job by webhook. The bot does the research, then posts the result back to a callback URL.

```
user -> POST /api/research -> app -> POST RESEARCH_WEBHOOK_URL -> bot
                                     POST callbackUrl          <- bot
```

## 1. Webhook: app to bot

`POST {RESEARCH_WEBHOOK_URL}`

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {RESEARCH_WEBHOOK_TOKEN}`, only sent if the variable is set |

```json
{
  "requestId": "3f0c1a9e-7a54-4f7e-9d0b-2c1e5b8a6d10",
  "ticker": "AAPL",
  "exchange": "NASDAQ",
  "callbackUrl": "https://app.example.com/api/reports/3f0c1a9e-7a54-4f7e-9d0b-2c1e5b8a6d10"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `requestId` | UUID string | Report id. |
| `ticker` | string | Uppercase. Matches `[A-Z0-9][A-Z0-9&.\-]{0,19}`, for example `AAPL`, `BRK.B`, `7203`, `0700`. The format is checked, but not whether the ticker is listed. |
| `exchange` | string | One of `NYSE`, `NASDAQ`, `LSE`, `TSX`, `XETRA`, `EURONEXT`, `SIX`, `TSE`, `HKEX`, `ASX`, `SGX`, `KRX` (see `EXCHANGES` in `lib/ticker.ts`). |
| `callbackUrl` | URL string | Where to post the result. Use it as given. |

**The bot must reply with a 2xx within 15 seconds and do the research after replying.** The app doesn't read the response body.

| Outcome | Report status | `error` |
| --- | --- | --- |
| 2xx | `researching` | none |
| Any other status (3xx responses count) | `failed` | `Research webhook responded with HTTP {code}.` |
| Network error or 15 second timeout | `failed` | `Research webhook request failed or timed out.` |
| `RESEARCH_WEBHOOK_URL` not set | `failed` | `RESEARCH_WEBHOOK_URL is not configured.` |
| `APP_URL` not set | `failed` | `APP_URL is not configured.` |

The app sends each webhook once and doesn't retry. A callback still applies after a `failed` status, so a bot that was slow to reply can post `done` and the report recovers.

## 2. Callback: bot to app

`POST {callbackUrl}`

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `Authorization` | `Bearer {REPORT_CALLBACK_SECRET}`, required |

```json
{
  "status": "done",
  "report_html": "<h1>AAPL</h1><p>Summary</p>",
  "report_url": "https://bot.example.com/reports/aapl.html",
  "report_json": { "rating": "hold" }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `status` | string, required | `researching`, `done` or `failed`. `pending` isn't accepted. |
| `report_html` | string | Shown on the report page after sanitizing. Takes priority over `report_url`. |
| `report_url` | string | Must be `http` or `https`. Shown as a link, and also in an iframe if there's no `report_html`. |
| `report_json` | any JSON | Stored as is. When it matches the optional structured schema below, the app renders a Market Pulse report view. Otherwise shown as raw JSON only if there's no HTML or URL. HTML (when present) remains the download/print artifact alongside the structured view. |
| `error` | string | Shown when `status` is `failed`. |
| `ticker` | string | Echo the webhook value. Used if the callback reaches an instance that doesn't hold the report; otherwise it shows as `Unknown`. An invalid value is ignored. |
| `exchange` | string | One of the exchanges above. Echo the webhook value. Same fallback, defaulting to `Unknown`. |

`done` must include at least one of `report_html`, `report_url` or `report_json`.

### Optional structured `report_json` (v2 additive)

The app owns this shape. Send it in addition to `report_html` when you want the in-app Market Pulse layout. Unknown fields are ignored. Partial objects still render whatever fields parse; if nothing usable is present, the UI falls back as before.

```json
{
  "rating": "buy",
  "summary": "Apple remains a hold: services growth is priced in.",
  "metrics": [
    { "label": "Target", "value": "$250" },
    { "label": "Upside", "value": "12%" }
  ],
  "sections": [
    { "title": "Thesis", "body": "…" },
    { "title": "Fundamentals", "body": "…" }
  ],
  "risks": ["Customer concentration", "Working-capital stretch"]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `rating` | string | Commonly `buy`, `hold`, or `sell`; any string is shown. |
| `summary` | string | Lead paragraph above metrics. |
| `metrics` | `{ label, value }[]` | Short key figures; both fields required per item. |
| `sections` | `{ title, body }[]` | Plain text; escaped on render (not HTML). |
| `risks` | `string[]` | Bullet list under a Risks heading. |

v1 bots that only send `report_html` keep working unchanged.

### `dl-equity-report/v1` and `v1.1`: currencies and exchanges

The full terminal report (`"schema": "dl-equity-report/v1"` or `v1.1`, see `lib/dl-equity-report-v1.ts`) works in the stock's own trading currency. Use one currency throughout a report.

| Field | Format | Examples |
| --- | --- | --- |
| `chrome.companyLine` | `Name (EXCHANGE: TICKER)` | `Apple Inc (NASDAQ: AAPL)`, `Toyota Motor (TSE: 7203)` |
| `chrome.target` | currency + amount, or `U` | `$250`, `€820`, `HK$520`, `CHF 98` |
| `chrome.price` | currency + amount + `(date)`, or `U` | `$231.40 (21 Nov 2026)` |
| F6, F7, F12 table titles | `(<currency> mn, …)` | `P&L ($ mn, consolidated)`, `FY27E BOTTOM-UP REVENUE (€ mn, EST)` |
| F12 revenue scenario columns | `EPS <currency>`, `Value <currency>` | `EPS $`, `Value HK$`, `EPS CHF` |

A currency is a symbol, optionally with a letter prefix (`$`, `US$`, `HK$`, `€`, `£`, `¥`, `₩`, `₹`), or a three-letter ISO code (`CHF`, `EUR`). An ISO code needs a space before the amount (`CHF 98`). Report money tables in millions (`mn`). Use `bn` only where millions would be unreadable, such as yen.

The footer field is still named `asOfIst` for compatibility. Put the as-of time in any time zone and name the zone, for example `21 Nov 2026 16:00 ET`.

### Update rules

- Omitted or empty `report_html`, `report_url` and `report_json` keep their stored value. A JSON `null` counts as omitted.
- `error` is replaced on every applied callback, so a `done` without `error` clears an earlier one.
- `done` and `failed` set `completed_at` to the server's current time. `researching` clears it.
- `researching` only applies while the report is `pending` or `researching`. On a finished report it changes nothing and still returns 200 with the stored row.
- `done` and `failed` always apply, so retrying them is safe and the last one wins. The bot can also call back before the webhook reply arrives, and that result is kept.

### Cancelling

When a user presses Stop, the report becomes `failed` ("Stopped by user.") and, if `RESEARCH_CANCEL_URL` is set, the app sends one best-effort `POST` there (same `Authorization` header as the webhook, 5 second timeout, no retry):

```json
{ "action": "cancel", "requestId": "3f0c1a9e-...", "ticker": "AAPL", "exchange": "NASDAQ" }
```

The bot should abort that run. Without a cancel URL, the bot can poll `GET {callbackUrl}` and stop when `status` is `failed`. A callback that arrives anyway still applies (`done` always wins), so the bot should not post after a cancel.

### Responses

| Status | Body | Meaning |
| --- | --- | --- |
| 200 | Full report row | Accepted. |
| 400 | `{"error": "..."}` | Invalid body. Fix it before retrying. |
| 401 | `{"error": "Unauthorized."}` | Wrong or missing secret, or `REPORT_CALLBACK_SECRET` isn't set on the app. |
| 503 | `{"error": "Report could not be saved. Retry."}` | Blob write failed on a `done` callback. Retry with backoff. |
| 5xx | Varies | Server error. Retry with backoff. |

An authenticated callback never gets a 404: if the id is unknown, the report is created from the callback. The secret is checked first, so a request without it can't change anything.

### HTML sanitizing

`report_html` is stored as sent and sanitized with DOMPurify each time it's displayed. These are removed:

- Scripts, event handlers and `javascript:` URLs
- `<iframe>` and `<object>` elements
- `<form>` elements. The text inside a `<form>` stays.

`<style>` is kept. The report renders in a sandboxed iframe that blocks scripts and sizes itself to the content, so its CSS applies exactly as sent and can't affect the app, and the app's CSS doesn't reach the report. Send a fragment: a `<style>` scoped under `.rpt`, then `<article class='rpt'>`. Links open in a new tab, so in-page `#anchor` links don't scroll within the report. DOMPurify removes a whole `<style>` block if its text looks like a tag, so keep `<b>` and the like out of CSS comments and `content` values.

The Download HTML file wraps the same sanitized fragment in a full HTML document and adds the disclaimer.

Reports in an iframe (`report_url` without `report_html`) run sandboxed with `allow-scripts allow-popups`. The host must allow framing through `X-Frame-Options` and `frame-ancestors`. If it doesn't, readers can still use the link above the frame.

## 3. Reading reports

`GET /api/reports` returns an array holding only the latest report: the last completed one, or the newest request if none has completed. It's empty if there are no reports. `GET /api/reports/{id}` returns one report, or 404. Neither needs authentication. With Blob configured, the last completed report is readable from every instance; in-flight reports are visible only on the instance that holds them.

```json
{
  "id": "3f0c1a9e-7a54-4f7e-9d0b-2c1e5b8a6d10",
  "ticker": "AAPL",
  "exchange": "NASDAQ",
  "status": "done",
  "requested_at": "2026-11-04T18:02:11.000Z",
  "completed_at": "2026-11-04T18:09:40.000Z",
  "report_url": null,
  "report_html": "<h1>AAPL</h1>",
  "report_json": null,
  "error": null
}
```

## Example callback

```bash
curl -X POST "$CALLBACK_URL" \
  -H "Authorization: Bearer $REPORT_CALLBACK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"status":"done","report_html":"<h1>AAPL</h1><p>Summary</p>"}'
```
