# Staging Subdomain Checklist (`stg.9h41.org`)

## 1) GitHub setup

- Push `staging` branch.
- Ensure Pages source is GitHub Actions.
- Run workflow once on `staging`.

## 2) DNS record

- `CNAME`: `stg` -> `<your-github-username>.github.io`

## 3) Validate

```bash
dig +short stg.9h41.org CNAME
curl -I https://stg.9h41.org
```

Expected: valid CNAME and TLS.
