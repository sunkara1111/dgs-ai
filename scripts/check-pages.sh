#!/usr/bin/env bash
# Validate the static GitHub Pages site (root deploy, no paid host).
set -euo pipefail
cd "$(dirname "$0")/.."

fail() { echo "check-pages: $*" >&2; exit 1; }

test -f index.html || fail "missing index.html"
test -f 404.html || fail "missing 404.html"
test -f .nojekyll || fail "missing .nojekyll (needed so Pages serves css/js as-is)"
test -f robots.txt || fail "missing robots.txt"
test -f sitemap.xml || fail "missing sitemap.xml"
test -f css/styles.css || fail "missing css/styles.css"
test -f js/app.js || fail "missing js/app.js"
test -f js/gate.js || fail "missing js/gate.js"

# A root CNAME 301s github.io to that host. dgsai.sunkaraops.com DNS is not
# available from this repo — do not enforce a custom domain until it resolves.
if [[ -e CNAME ]]; then
  fail "root CNAME present; remove it until dgsai.sunkaraops.com DNS resolves (it 301s github.io to a dead host)"
fi
test -f docs/CNAME.example || fail "missing docs/CNAME.example (copy to /CNAME only after DNS)"

grep -q 'href="css/styles.css' index.html || fail "index.html must use relative css path"
grep -q 'src="js/app.js' index.html || fail "index.html must use relative js path"
grep -q 'sunkara1111.github.io/dgs-ai' index.html || fail "index.html must document the github.io URL"
grep -q 'canonical" href="https://sunkara1111.github.io/dgs-ai/' index.html || fail "canonical must be the live github.io URL"
grep -Eiq 'coming soon' index.html && fail "index.html must not say Coming soon" || true

if grep -E '(href|src)="/dgs-ai/' index.html 404.html; then
  fail "absolute /dgs-ai/ asset paths break GitHub Pages project URLs"
fi

grep -q 'https://sunkara1111.github.io/dgs-ai/' sitemap.xml || fail "sitemap must list github.io"
if grep -q 'https://dgsai.sunkaraops.com/' sitemap.xml; then
  fail "sitemap must not list dgsai.sunkaraops.com until DNS resolves"
fi
grep -q 'sunkara1111.github.io/dgs-ai' robots.txt || fail "robots.txt must mention github.io"
grep -q 're-add' README.md || fail "README must say to re-add CNAME only after DNS exists"

python3 - <<'PY'
from pathlib import Path
html = Path("index.html").read_text(encoding="utf-8")
for needle in ("Talk to DGS Agent — Free forever", "enterFreeBtn"):
    if needle not in html:
        raise SystemExit(f"check-pages: missing {needle!r} on the free-agent path")
print("check-pages: ok")
PY
