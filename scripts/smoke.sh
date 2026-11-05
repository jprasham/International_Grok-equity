#!/usr/bin/env bash
# Checks the research flow against a running server started with:
#   REPORT_CALLBACK_SECRET=test-secret, and RESEARCH_WEBHOOK_URL unset.
# Usage: scripts/smoke.sh [base-url] [secret]
set -u
BASE=${1:-http://localhost:3000}
SECRET=${2:-test-secret}
fails=0

# check <label> <expected substring> <actual>
check() {
  case "$3" in
    *"$2"*) echo "PASS $1: $3" ;;
    *) echo "FAIL $1: expected '$2', got: $3"; fails=$((fails + 1)) ;;
  esac
}
post() { # post <url> <secret-or-empty> <json>, prints "<http code> <body>"
  local auth=()
  [ -n "$2" ] && auth=(-H "Authorization: Bearer $2")
  curl -s -w ' HTTP_%{http_code}' -X POST "$1" -H 'Content-Type: application/json' "${auth[@]}" -d "$3"
}

check "bad ticker rejected" HTTP_400 "$(post "$BASE/api/research" "" '{"ticker":"$$$","exchange":"NSE"}')"

created=$(post "$BASE/api/research" "" '{"ticker":"HFCL","exchange":"NSE"}')
check "webhook unset -> failed" '"status":"failed"' "$created"
check "webhook unset -> clear error" 'RESEARCH_WEBHOOK_URL is not configured' "$created"
id=$(echo "$created" | sed -E 's/.*"id":"([^"]+)".*/\1/')
url="$BASE/api/reports/$id"

done='{"status":"done","report_html":"<h1>HFCL</h1><img src=x onerror=alert(1)><script>alert(2)</script><style>body{display:none}</style><p>SAFE_TEXT</p>"}'
check "no secret -> 401" HTTP_401 "$(post "$url" "" "$done")"
check "wrong secret -> 401" HTTP_401 "$(post "$url" "wrong-secret" "$done")"
check "wrong secret left row alone" '"status":"failed"' "$(curl -s "$url")"
check "javascript: url rejected" HTTP_400 "$(post "$url" "$SECRET" '{"status":"done","report_url":"javascript:alert(1)"}')"
check "done without content rejected" HTTP_400 "$(post "$url" "$SECRET" '{"status":"done"}')"
check "unknown id -> 404" HTTP_404 "$(post "$BASE/api/reports/00000000-0000-4000-8000-000000000000" "$SECRET" "$done")"
check "traversal id -> 404" HTTP_404 "$(curl -s -w ' HTTP_%{http_code}' "$BASE/api/reports/..%2F..%2Fpackage")"
check "right secret -> 200" HTTP_200 "$(post "$url" "$SECRET" "$done")"

row=$(curl -s "$url")
check "row is done" '"status":"done"' "$row"
check "completed_at set" '"completed_at":"2' "$row"
check "error cleared by done" '"error":null' "$row"
check "late researching can't reopen" '"status":"done"' "$(post "$url" "$SECRET" '{"status":"researching"}')"
check "listed" "$id" "$(curl -s "$BASE/api/reports")"

page=$(curl -s "$BASE/reports/$id")
check "page shows report" SAFE_TEXT "$page"
check "page has disclaimer" 'Paper analysis only, not investment advice.' "$page"
# Only the report markup counts: Next's own <script> tags are always in the page.
for bad in 'onerror=' 'alert(2)' 'display:none}'; do
  case "$page" in
    *"$bad"*) echo "FAIL sanitized: found '$bad'"; fails=$((fails + 1)) ;;
    *) echo "PASS sanitized: no '$bad'" ;;
  esac
done

echo "failures: $fails"
exit "$fails"
