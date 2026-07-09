#!/usr/bin/env bash
# Mirror the live GreenVac Services site into ./site/
#
# The live site is a static-HTML Vercel deployment (project "greenvac-services")
# with no git source behind it. This script rebuilds the source tree by
# downloading every page and asset from the production deployment and
# verifying each file's md5 checksum against the ETag Vercel serves
# (for Vercel static files the ETag IS the md5 of the file content).
#
# Usage:   bash scripts/mirror-live-site.sh
# Needs:   outbound HTTPS access to greenvac-services.vercel.app
# Output:  ./site/            the recovered site files
#          ./mirror-report.txt what was fetched, verified, or missed

set -u

BASE="https://greenvac-services.vercel.app"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/site"
HDRS="$ROOT/.mirror-headers"
REPORT="$ROOT/mirror-report.txt"
CA="${CURL_CA_BUNDLE:-/root/.ccr/ca-bundle.crt}"

CURL=(curl -sS --retry 3 --retry-delay 2 --max-time 60)
[ -f "$CA" ] && CURL+=(--cacert "$CA")

mkdir -p "$OUT" "$HDRS"
: > "$REPORT"

note() { echo "$*" | tee -a "$REPORT"; }

# fetch URL_PATH REL_DEST  -> downloads $BASE$URL_PATH to $OUT/$REL_DEST
# Verifies md5 against the ETag header. Returns 1 on HTTP failure.
fetch() {
  local path="$1" rel="$2"
  local dest="$OUT/$rel"
  [ -f "$dest" ] && return 0
  mkdir -p "$(dirname "$dest")"
  local hdr="$HDRS/$(echo "$rel" | tr '/' '_').h"
  local code
  code=$("${CURL[@]}" -D "$hdr" -o "$dest" -w '%{http_code}' "$BASE$path" 2>>"$REPORT") || code="000"
  if [ "$code" != "200" ]; then
    note "MISS $code  $path"
    rm -f "$dest"
    return 1
  fi
  local etag md5
  etag=$(grep -i '^etag:' "$hdr" | tail -1 | sed -e 's/^[Ee][Tt][Aa][Gg]:[[:space:]]*//' -e 's|^W/||' -e 's/"//g' | tr -d '\r')
  md5=$(md5sum "$dest" | awk '{print $1}')
  if [ -n "$etag" ] && [ "$etag" = "$md5" ]; then
    note "OK         $rel  ($(wc -c <"$dest") bytes, md5 verified)"
  else
    note "OK-NOMATCH $rel  ($(wc -c <"$dest") bytes) etag=$etag md5=$md5  <-- INVESTIGATE"
  fi
  return 0
}

note "== GreenVac site mirror: $(date -u '+%Y-%m-%d %H:%M UTC') =="
note "== Source: $BASE =="
note ""

# ---- 1. Pages from sitemap.xml + known non-sitemap pages -------------------
# Stored as <route>.html: both /services and /services.html serve 200 on the
# live site (Vercel default static handling), so plain .html files reproduce
# current behaviour with no vercel.json routing config needed.
PAGES="
/:index.html
/services:services.html
/get-a-quote:get-a-quote.html
/portfolio:portfolio.html
/service-area:service-area.html
/contact:contact.html
/blog:blog.html
/info/non-destructive-digging:info/non-destructive-digging.html
/info/utility-potholing:info/utility-potholing.html
/info/trenching:info/trenching.html
/info/leak-detection-support:info/leak-detection-support.html
/info/pit-cattle-grid-cleaning:info/pit-cattle-grid-cleaning.html
/info/tight-access-excavation:info/tight-access-excavation.html
/locations/canberra:locations/canberra.html
/locations/queanbeyan:locations/queanbeyan.html
/locations/gungahlin:locations/gungahlin.html
/locations/belconnen:locations/belconnen.html
/locations/tuggeranong:locations/tuggeranong.html
/locations/woden-valley:locations/woden-valley.html
/locations/braidwood:locations/braidwood.html
/locations/bungendore:locations/bungendore.html
/locations/goulburn:locations/goulburn.html
/locations/yass:locations/yass.html
/blog/compact-hydrovac-vs-truck-hydrovac:blog/compact-hydrovac-vs-truck-hydrovac.html
/blog/dbyd-explained:blog/dbyd-explained.html
/blog/hydrovac-vs-mechanical:blog/hydrovac-vs-mechanical.html
/blog/5-signs-you-need-ndd:blog/5-signs-you-need-ndd.html
/blog/potholing-compacted-ground-canberra:blog/potholing-compacted-ground-canberra.html
/blog/cattle-grid-cleanout-southern-tablelands:blog/cattle-grid-cleanout-southern-tablelands.html
"

for entry in $PAGES; do
  fetch "${entry%%:*}" "${entry##*:}"
done

# 404 page (served for unknown routes; stored by Vercel convention as 404.html)
fetch "/404.html" "404.html" || fetch "/404" "404.html"

# ---- 2. Known root files and assets ----------------------------------------
KNOWN="
/robots.txt:robots.txt
/sitemap.xml:sitemap.xml
/favicon.ico:favicon.ico
/favicon.svg:favicon.svg
/favicon-48x48.png:favicon-48x48.png
/apple-touch-icon.png:apple-touch-icon.png
/site.webmanifest:site.webmanifest
/css/styles.min.css:css/styles.min.css
/js/main.min.js:js/main.min.js
/fonts/montserrat-latin.woff2:fonts/montserrat-latin.woff2
/compress.js:compress.js
/compress_all.py:compress_all.py
"
# compress.js / compress_all.py / get-a-quote-src are named in robots.txt
# Disallow rules, so they exist in the deployment even though nothing links
# to them. get-a-quote-src/ contents can't be listed; probe common names.
PROBES="
/get-a-quote-src/index.html:get-a-quote-src/index.html
/get-a-quote-src/main.js:get-a-quote-src/main.js
/get-a-quote-src/app.js:get-a-quote-src/app.js
/get-a-quote-src/quote.js:get-a-quote-src/quote.js
/get-a-quote-src/style.css:get-a-quote-src/style.css
/get-a-quote-src/styles.css:get-a-quote-src/styles.css
/get-a-quote-src/README.md:get-a-quote-src/README.md
"

for entry in $KNOWN $PROBES; do
  fetch "${entry%%:*}" "${entry##*:}" || true
done

# ---- 3. Asset discovery: scan HTML/CSS for local references ----------------
# Repeats until no new files appear (HTML -> CSS -> fonts/images chains).
extract_refs() {
  local f="$1"
  {
    grep -ohE '(src|href|content|data-src)="[^"]+"' "$f" 2>/dev/null | sed -E 's/^[a-z-]+="//; s/"$//'
    grep -ohE "url\((\"|')?[^)\"']+(\"|')?\)" "$f" 2>/dev/null | sed -E "s/^url\((\"|')?//; s/(\"|')?\)$//"
    grep -ohE 'srcset="[^"]+"' "$f" 2>/dev/null | sed -E 's/^srcset="//; s/"$//' | tr ',' '\n' | awk '{print $1}'
  } | sort -u
}

for pass in 1 2 3; do
  new=0
  for f in $(find "$OUT" -name '*.html' -o -name '*.css'); do
    fdir=$(dirname "${f#"$OUT"/}")
    [ "$fdir" = "." ] && fdir=""
    while IFS= read -r ref; do
      [ -z "$ref" ] && continue
      # keep only same-site refs; strip domain, query string, fragment
      case "$ref" in
        https://www.greenvac.com.au/*) ref="${ref#https://www.greenvac.com.au/}" ;;
        https://greenvac.com.au/*)     ref="${ref#https://greenvac.com.au/}" ;;
        https://greenvac-services.vercel.app/*) ref="${ref#https://greenvac-services.vercel.app/}" ;;
        http*|//*|mailto:*|tel:*|data:*|javascript:*|\#*) continue ;;
      esac
      ref="${ref%%\?*}"; ref="${ref%%#*}"
      # only fetch things that look like files (pages are handled above)
      echo "$ref" | grep -qiE '\.(png|jpe?g|webp|gif|svg|ico|css|js|mjs|woff2?|ttf|otf|eot|mp4|webm|pdf|xml|txt|json|webmanifest|py)$' || continue
      if [ "${ref#/}" != "$ref" ]; then
        cand="${ref#/}"                       # root-relative
        if [ ! -f "$OUT/$cand" ]; then
          fetch "/$cand" "$cand" && new=1
        fi
      else
        # relative ref: try root first (site convention), then page-relative
        if [ ! -f "$OUT/$ref" ] && { [ -z "$fdir" ] || [ ! -f "$OUT/$fdir/$ref" ]; }; then
          if fetch "/$ref" "$ref"; then
            new=1
          elif [ -n "$fdir" ]; then
            fetch "/$fdir/$ref" "$fdir/$ref" && new=1
          fi
        fi
      fi
    done < <(extract_refs "$f")
  done
  [ "$new" = "0" ] && break
done

# ---- 4. Behaviour probes (for reconstructing vercel.json) ------------------
note ""
note "== Routing behaviour probes (for vercel.json reconstruction) =="
for p in /services /services.html /services/ /info/trenching/ /nonexistent-page; do
  res=$("${CURL[@]}" -o /dev/null -w '%{http_code} redirect=%{redirect_url}' "$BASE$p" 2>/dev/null)
  note "  $p -> $res"
done

note ""
note "== Done. Files in site/: $(find "$OUT" -type f | wc -l) =="
note "Review any OK-NOMATCH or MISS lines above before committing."
note "Reminder: vercel.json is never served by Vercel and must be reconstructed"
note "manually (security headers seen live are recorded in .mirror-headers/)."
