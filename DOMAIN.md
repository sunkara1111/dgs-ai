# Custom domain checklist — DGS AI

DGS AI is a **static** GitHub Pages site. Pages deploys from the `main` branch **root** (`/`). No paid host is required.

## Live URLs

| Role | URL |
|------|-----|
| **Live GitHub Pages** | https://sunkara1111.github.io/dgs-ai/ |
| **Custom domain** | https://dgsai.sunkaraops.com/ |

A repo-root `CNAME` file is committed with:

```
dgsai.sunkaraops.com
```

GitHub Pages is already bound to that hostname. When a custom domain is set, GitHub **redirects** `https://sunkara1111.github.io/dgs-ai/` to the custom domain. The custom hostname only answers after DNS exists.

`sunkaraops.com` is on Netlify DNS (NSONE). Add the subdomain there — this repo cannot publish DNS records.

## DNS (required for dgsai.sunkaraops.com)

In Netlify Domain management (or NSONE) for `sunkaraops.com`:

1. Add a **CNAME** record:
   - **Host / name:** `dgsai`
   - **Target / value:** `sunkara1111.github.io`
   - TTL: 300–3600 is fine
2. Do **not** CNAME to `sunkara1111.github.io/dgs-ai` — DNS targets a host, not a path.
3. Apex (`sunkaraops.com` itself) stays on Netlify. Only the `dgsai` subdomain should point at GitHub Pages.

## GitHub Pages (current host)

Already configured:

- Source: `main` branch, site root (`/`) — not `/docs`
- `CNAME` at repo root
- `.nojekyll` so `css/` and `js/` are served as-is
- `404.html` for unknown paths
- Asset URLs in the app are **relative**, so the same files work at `/dgs-ai/` (github.io) and `/` (custom domain)

After DNS is live:

1. GitHub → repo **Settings → Pages → Custom domain** should already show `dgsai.sunkaraops.com`.
2. Wait for DNS + TLS. GitHub issues a free Let’s Encrypt certificate. Enforce HTTPS when the lock is ready.
3. Add `dgsai.sunkaraops.com` to **Firebase Auth → Settings → Authorized domains** (sign-in is optional; still required if you use Google / email). Keep `sunkara1111.github.io`.
4. Public URLs in this repo already list both origins (`index.html` canonical, Open Graph, JSON-LD `sameAs`, `robots.txt`, `sitemap.xml`, README).
5. In Search Console, add the custom-domain property and recrawl. Keep the paper-default / not-financial-advice disclaimers.

## Netlify (optional later)

Not required. The parent site `sunkaraops.com` is already on Netlify; DGS AI stays on free GitHub Pages.

If you ever publish this repo on Netlify instead:

1. Import this repo. Publish directory = repo root (static site, no build).
2. Site → Domain management → add `dgsai.sunkaraops.com`.
3. DNS: CNAME `dgsai` → `YOUR_SITE.netlify.app` **or** use Netlify DNS.
4. HTTPS is automatic. Add the hostname to Firebase authorized domains.

## Vercel (optional later)

1. Import this repo. Framework preset: Other. Output: static root.
2. Project → Domains → add the hostname you own.
3. DNS: CNAME to `cname.vercel-dns.com` (or the target Vercel shows).
4. Add the hostname to Firebase authorized domains.

## After cutover

- [x] Repo-root `CNAME` is `dgsai.sunkaraops.com`
- [x] GitHub Pages source is `main` `/` (not `/docs`)
- [x] Canonical, sitemap, robots, and README list github.io **and** the custom domain
- [ ] DNS CNAME `dgsai` → `sunkara1111.github.io` at Netlify / NSONE
- [ ] HTTPS lock is valid on https://dgsai.sunkaraops.com/
- [ ] Firebase authorized domains include `dgsai.sunkaraops.com`
- [ ] Search Console property for the custom domain
- [ ] No “Powered by” platform badges on the public app
- [ ] Paper default · not financial advice · no guaranteed profit still visible

The product stays a **free agent bot**. A custom domain does not change the Free forever agent path.
