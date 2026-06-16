## Commands

```bash
# Local dev
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn main:app --reload --port 8000

# Tests
pytest tests/

# Docker (production image)
docker buildx build --attest type=provenance,mode=max,version=v1 --sbom true --push -t image2-server . && docker run -p 8000:8000 image2-server
```

## Key Files
- `main.py` — FastAPI app, CORS, rate limiting, endpoints
- `converters.py` — image analysis + ASCII/ANSI conversion logic
- `VERSION` — independent semver; bump on server changes

## Architecture Decisions
- Deploys independently from frontend (Railway/Docker). Version mismatch expected.
- `VERSION` carries independent semver. Bump on server changes; Railway appends git SHA.

## Versioning (`VERSION` file)

Bump `VERSION` on every PR that changes server behavior. Use semver:

| Change type | Bump |
|-------------|------|
| Breaking API change (removed/renamed endpoint, changed response shape) | major |
| New endpoint or new optional field added | minor |
| Bug fix, internal refactor, dependency update, config tweak | patch |

- **Do not bump** for docs-only or CI-only changes.
- Bump as part of the same commit as the code change — not a follow-up.

## Runtime Gotchas
- CORS allowlist in `main.py` — update when adding new frontend origins.
- `LOG_LEVEL` env var controls logging verbosity (default: `INFO`).
- Rate limiting via slowapi — per-IP on `/convert` and `/analyze`. 429 = too many requests.
- `image2` dep installs from GitHub (not PyPI) — first `pip install` slow.
- Requires Python 3.14 (matches Dockerfile).