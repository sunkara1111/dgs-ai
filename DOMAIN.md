# Custom domain checklist — DGS AI

DGS AI ships on GitHub Pages today:

**https://sunkara1111.github.io/dgs-ai/**

Do **not** invent or assume a purchased domain. Use a hostname you already own. Example *patterns* only (not claims that these are live):

- `dgsai.sunkaraops.com` (subdomain of a domain you control)
- `dgsai.com` (apex you purchased yourself)

Until you attach a real hostname, keep using the GitHub Pages URL. A root `CNAME` file is **not** committed here on purpose — adding one would point Pages at a domain you have not configured.

## Placeholder CNAME

When you own the hostname, create a repo-root file named `CNAME` with **only** that hostname (no `https://`, no path):

```
YOUR_CUSTOM_DOMAIN
```

Example after you own a subdomain:

```
dgsai.sunkaraops.com
```

A copy of this placeholder lives at `docs/CNAME.example`. Copy it to `/CNAME` only after DNS is yours.

## GitHub Pages (recommended, current host)

1. Buy or pick a hostname you already control. Do not use a placeholder in production DNS.
2. In your DNS host, add a **CNAME** record:
   - **Host / name:** `dgsai` (or `www`)
   - **Target / value:** `sunkara1111.github.io`
   - TTL: 300–3600 is fine
3. Apex (`dgsai.com` → site) needs **A/AAAA** records that GitHub publishes for Pages, or an ALIAS/ANAME if your DNS supports it. Confirm the current IPs on [GitHub Pages custom-domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).
4. Add the `CNAME` file at the repo root with the hostname.
5. GitHub → repo **Settings → Pages → Custom domain** → enter the same hostname → Save.
6. Wait for DNS + TLS. GitHub issues a Let’s Encrypt certificate. Enforce HTTPS when it is ready.
7. Add the custom hostname to **Firebase Auth → Settings → Authorized domains** (sign-in is optional; still required if you use Google / email).
8. Update public URLs after cutover:
   - `index.html` canonical, Open Graph, Twitter, JSON-LD
   - `robots.txt` Sitemap line
   - `sitemap.xml` `<loc>`
   - `README.md` live link
9. In Search Console, add the new property and recrawl. Keep the paper-default / not-financial-advice disclaimers.

## Netlify (optional later)

1. Import this repo. Publish directory = repo root (this is a static site, not a build).
2. Site → Domain management → add the hostname you own.
3. DNS: CNAME `dgsai` (or `www`) → `YOUR_SITE.netlify.app` **or** use Netlify DNS.
4. Do not leave `YOUR_CUSTOM_DOMAIN` in a live CNAME.
5. HTTPS is automatic. Add the hostname to Firebase authorized domains.
6. Update canonical / sitemap / robots to the new origin.

## Vercel (optional later)

1. Import this repo. Framework preset: Other. Output: static root.
2. Project → Domains → add the hostname you own.
3. DNS: CNAME to `cname.vercel-dns.com` (or the target Vercel shows).
4. Add the hostname to Firebase authorized domains.
5. Update canonical / sitemap / robots to the new origin.

## After cutover

- [ ] DNS CNAME/ALIAS points at GitHub Pages, Netlify, or Vercel — not a guessed host
- [ ] Repo-root `CNAME` matches the hostname (GitHub Pages only)
- [ ] HTTPS lock is valid
- [ ] Firebase authorized domains include the hostname
- [ ] Canonical, sitemap, robots, and README use the new origin
- [ ] No “Powered by” platform badges on the public app
- [ ] Paper default · not financial advice · no guaranteed profit still visible

The product stays a **free agent bot**. A custom domain does not change the Free forever agent path.
