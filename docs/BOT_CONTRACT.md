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
  "ticker": "HFCL",
  "exchange": "NSE",
  "callbackUrl": "https://app.example.com/api/reports/3f0c1a9e-7a54-4f7e-9d0b-2c1e5b8a6d10"
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `requestId` | UUID string | Report id. |
| `ticker` | string | Uppercase. Matches `[A-Z0-9][A-Z0-9&.\-]{0,19}`, for example `M&M`, `BAJAJ-AUTO`, `500325`. The format is checked, but not whether the ticker is listed. |
| `exchange` | string | `NSE` or `BSE`. |
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
  "report_html": "<h1>HFCL</h1><p>Summary</p>",
  "report_url": "https://bot.example.com/reports/hfcl.html",
  "report_json": { "rating": "hold" }
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `status` | string, required | `researching`, `done` or `failed`. `pending` isn't accepted. |
| `report_html` | string | Shown on the report page after sanitizing. Takes priority over `report_url`. |
| `report_url` | string | Must be `http` or `https`. Shown as a link, and also in an iframe if there's no `report_html`. |
| `report_json` | any JSON | Stored as is. Shown as raw JSON only if there's no HTML or URL. |
| `error` | string | Shown when `status` is `failed`. |

`done` must include at least one of `report_html`, `report_url` or `report_json`.

### Update rules

- Omitted or empty `report_html`, `report_url` and `report_json` keep their stored value. A JSON `null` counts as omitted.
- `error` is replaced on every applied callback, so a `done` without `error` clears an earlier one.
- `done` and `failed` set `completed_at` to the server's current time. `researching` clears it.
- `researching` only applies while the report is `pending` or `researching`. On a finished report it changes nothing and still returns 200 with the stored row.
- `done` and `failed` always apply, so retrying them is safe and the last one wins. The bot can also call back before the webhook reply arrives, and that result is kept.

### Responses

| Status | Body | Meaning |
| --- | --- | --- |
| 200 | Full report row | Accepted. |
| 400 | `{"error": "..."}` | Invalid body. Fix it before retrying. |
| 401 | `{"error": "Unauthorized."}` | Wrong or missing secret, or `REPORT_CALLBACK_SECRET` isn't set on the app. |
| 404 | `{"error": "Report not found."}` | Unknown or malformed id, or the report is no longer in memory. Reports live in one server process, so a restart or another instance loses them, and a newer completed report replaces an older one. Retrying won't help unless the request reaches the original instance. |
| 5xx | Varies | Server error. Retry with backoff. |

The secret is checked first, so a request without it can't find out whether a report exists.

### HTML sanitizing

`report_html` is stored as sent and sanitized with DOMPurify each time it's displayed. These are removed:

- Scripts, event handlers and `javascript:` URLs
- `<iframe>` and `<object>` elements
- `<style>` and `<form>` elements. The text inside a `<form>` stays.

The Download HTML file gets the same sanitizing, except that `<style>` is kept.

Send semantic HTML (`h1`-`h3`, `p`, `ul`, `ol`, `table`, `a`). The app styles those to match its theme. Inline `style` attributes are allowed.

Reports in an iframe (`report_url` without `report_html`) run sandboxed with `allow-scripts allow-popups`. The host must allow framing through `X-Frame-Options` and `frame-ancestors`. If it doesn't, readers can still use the link above the frame.

## 3. Reading reports

`GET /api/reports` returns an array holding only the latest report: the last completed one, or the newest request if none has completed. It's empty if there are no reports. `GET /api/reports/{id}` returns one report, or 404. Neither needs authentication.

```json
{
  "id": "3f0c1a9e-7a54-4f7e-9d0b-2c1e5b8a6d10",
  "ticker": "HFCL",
  "exchange": "NSE",
  "status": "done",
  "requested_at": "2026-11-04T18:02:11.000Z",
  "completed_at": "2026-11-04T18:09:40.000Z",
  "report_url": null,
  "report_html": "<h1>HFCL</h1>",
  "report_json": null,
  "error": null
}
```

## Example callback

```bash
curl -X POST "$CALLBACK_URL" \
  -H "Authorization: Bearer $REPORT_CALLBACK_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"status":"done","report_html":"<h1>HFCL</h1><p>Summary</p>"}'
```
