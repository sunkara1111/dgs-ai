#!/usr/bin/env bash
# Validate the static GitHub Pages site (root deploy, no paid host).
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "check-pages: $*" >&2; exit 1; }

test -f index.html || fail "missing index.html"
test -f 404.html || fail "missing 404.html"
test -f .nojekyll || fail "missing .nojekyll (needed so Pages serves css/js as-is)"
test -f CNAME || fail "missing root CNAME"
test -f robots.txt || fail "missing robots.txt"
test -f sitemap.xml || fail "missing sitemap.xml"
test -f css/styles.css || fail "missing css/styles.css"
test -f js/app.js || fail "missing js/app.js"
test -f js/gate.js || fail "missing js/gate.js"

host="$(tr -d '[:space:]' < CNAME)"
[[ "$host" == "dgsai.sunkaraops.com" ]] || fail "CNAME must be exactly dgsai.sunkaraops.com (got: ${host})"
[[ "$host" != http* ]] || fail "CNAME must not include a scheme"
[[ "$host" != */* ]] || fail "CNAME must not include a path"

grep -q 'href="css/styles.css' index.html || fail "index.html must use relative css path"
grep -q 'src="js/app.js' index.html || fail "index.html must use relative js path"
grep -q 'sunkara1111.github.io/dgs-ai' index.html || fail "index.html must document the github.io URL"
grep -q 'dgsai.sunkaraops.com' index.html || fail "index.html must document the custom domain"
grep -Eiq 'coming soon' index.html && fail "index.html must not say Coming soon" || true

if grep -E '(href|src)="/dgs-ai/' index.html 404.html; then
  fail "absolute /dgs-ai/ asset paths break the custom domain (served from /)"
fi

grep -q 'https://sunkara1111.github.io/dgs-ai/' sitemap.xml || fail "sitemap must list github.io"
grep -q 'https://dgsai.sunkaraops.com/' sitemap.xml || fail "sitemap must list custom domain"
grep -q 'sunkara1111.github.io/dgs-ai' robots.txt || fail "robots.txt must mention github.io"
grep -q 'dgsai.sunkaraops.com' robots.txt || fail "robots.txt must mention custom domain"

python3 - <<'PY'
from pathlib import Path
html = Path("index.html").read_text(encoding="utf-8")
for needle in ("Talk to DGS Agent — Free forever", "enterFreeBtn"):
    if needle not in html:
        raise SystemExit(f"check-pages: missing {needle!r} on the free-agent path")
print("check-pages: ok")
PY
