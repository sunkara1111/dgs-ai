# Custom domain checklist — DGS AI

DGS AI is a **static** GitHub Pages site. Pages deploys from the `main` branch **root** (`/`). No paid host is required.

## Live URL

**https://sunkara1111.github.io/dgs-ai/**

Do **not** commit a repo-root `CNAME` while `dgsai.sunkaraops.com` DNS does not resolve. GitHub Pages treats that file as a custom domain and **301s** the github.io URL to it. That takes the public site down.

`sunkaraops.com` Netlify DNS is on another team. This repo cannot create the record.

## When DNS exists — then re-add CNAME

Intended hostname (not live today): `dgsai.sunkaraops.com`

1. In Netlify / NSONE for `sunkaraops.com`, add a **CNAME**:
   - **Host / name:** `dgsai`
   - **Target / value:** `sunkara1111.github.io`
   - Do **not** target `sunkara1111.github.io/dgs-ai` — DNS is a host, not a path.
2. Confirm `dgsai.sunkaraops.com` resolves (`dig +short CNAME dgsai.sunkaraops.com`).
3. Copy `docs/CNAME.example` to a repo-root file named `CNAME` (hostname only, no `https://`).
4. GitHub → repo **Settings → Pages → Custom domain** → `dgsai.sunkaraops.com` → Save.
5. Wait for free Let’s Encrypt TLS. Enforce HTTPS when ready.
6. Add `dgsai.sunkaraops.com` to **Firebase Auth → Settings → Authorized domains**. Keep `sunkara1111.github.io`.
7. Point canonical, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml`, and README at the new origin.

Until those steps are done, keep using https://sunkara1111.github.io/dgs-ai/ and leave the root `CNAME` **out** of the repo.

## GitHub Pages (current host)

- Source: `main` branch, site root (`/`) — not `/docs`
- **No** root `CNAME` until DNS is live
- `.nojekyll` so `css/` and `js/` are served as-is
- `404.html` for unknown paths
- Asset URLs are **relative**, so the same files will also work at `/` on a custom domain later

## Netlify / Vercel (optional later)

Not required. The parent site `sunkaraops.com` is on Netlify; DGS AI stays on free GitHub Pages.

## Cutover checklist

- [x] Live site is https://sunkara1111.github.io/dgs-ai/ (no root `CNAME`)
- [ ] DNS CNAME `dgsai` → `sunkara1111.github.io` exists and resolves
- [ ] Repo-root `CNAME` copied from `docs/CNAME.example` **after** DNS
- [ ] HTTPS lock is valid on https://dgsai.sunkaraops.com/
- [ ] Firebase authorized domains include `dgsai.sunkaraops.com`
- [ ] Canonical, sitemap, robots, and README updated to the new origin
- [ ] No “Powered by” platform badges on the public app
- [ ] Paper default · not financial advice · no guaranteed profit still visible

The product stays a **free agent bot**. A custom domain does not change the Free forever agent path.
