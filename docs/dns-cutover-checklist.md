# DNS Cutover Checklist (`9h41.org`)

## 1) Before switching

- In GitHub repository settings, enable **Pages** and point to **GitHub Actions**.
- Ensure workflow `Deploy to GitHub Pages` has succeeded at least once.
- At DNS provider, set TTL to `300` at least 24h before migration.

## 2) DNS records to apply

### Apex (`@`) records

- `185.199.108.153`
- `185.199.109.153`
- `185.199.110.153`
- `185.199.111.153`

### `www` host

- `www` -> `<your-github-username>.github.io`

### staging host

- `stg` -> `<your-github-username>.github.io`

## 3) Validation after switch

```bash
dig +short 9h41.org A
dig +short www.9h41.org CNAME
curl -I https://9h41.org
curl -I https://www.9h41.org
```

Expected: apex resolves to Pages IPs, `www` points to GitHub Pages host, HTTPS valid, and apex redirects to `www`.
