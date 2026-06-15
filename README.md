# Creator Cards API

A small **Creator Card** microservice — shareable "link-in-bio" profile cards with attached
service rate cards. Built on the Resilience 17 Node.js backend template (Express + MongoDB,
the template's VSL validator, repository factory, ULID ids and `throwAppError` utilities).

[![CI](https://github.com/OWNER/REPO/actions/workflows/ci.yml/badge.svg)](https://github.com/OWNER/REPO/actions/workflows/ci.yml)

> Replace `OWNER/REPO` in the badge URL with your GitHub path once pushed.
> The template's own reference docs remain in `documentation.md`.

## Endpoints

All endpoints live at the **root** of the base URL (no versioning) and require **no auth**.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/creator-cards` | Create a card (validates + business rules) |
| `GET` | `/creator-cards/:slug` | Public retrieval (draft/private access control) |
| `DELETE` | `/creator-cards/:slug` | Soft-delete; returns the deleted card |
| `PATCH` | `/creator-cards/:slug` | *(extra)* Update / publish a draft / rotate access code |
| `GET` | `/creator-cards?creator_reference=` | *(extra)* List a creator's cards (paginated) |
| `GET` | `/creator-cards/:slug/stats` | *(extra)* View analytics |
| `GET` | `/health` | *(extra)* Readiness probe |

The identifier is always serialized as **`id`** (never `_id`). `access_code` is returned on
create/delete but **never** on retrieval.

### Interactive API docs

When the app is running, browse the live Swagger UI and raw spec:

- **Swagger UI:** `GET /docs` (e.g. `http://localhost:3000/docs`)
- **Raw OpenAPI JSON:** `GET /openapi.json`

The spec source is [`openapi.yaml`](./openapi.yaml).

### Quick start with curl

```bash
BASE=http://localhost:3000

# Create
curl -s -X POST "$BASE/creator-cards" -H 'Content-Type: application/json' -d '{
  "title": "George Cooks",
  "description": "Weekly cooking podcast",
  "slug": "george-cooks",
  "creator_reference": "crt_8f2k1m9x4p7w3q5z",
  "links": [{"title": "YouTube", "url": "https://youtube.com/@georgecooks"}],
  "service_rates": {
    "currency": "NGN",
    "rates": [{"name": "IG Story Post", "description": "One story mention", "amount": 5000000}]
  },
  "status": "published"
}'

# Retrieve (public)
curl -s "$BASE/creator-cards/george-cooks"

# Retrieve (private card with pin)
curl -s "$BASE/creator-cards/vip-rate-card?access_code=A1B2C3"

# Delete
curl -s -X DELETE "$BASE/creator-cards/george-cooks" \
  -H 'Content-Type: application/json' -d '{"creator_reference": "crt_8f2k1m9x4p7w3q5z"}'

# Idempotent create (replays return the original card, no duplicate)
curl -s -X POST "$BASE/creator-cards" -H 'Idempotency-Key: abc-123' \
  -H 'Content-Type: application/json' -d '{ ... }'
```

## Error codes

Field-level validation failures (wrong type, length, enum, missing required) return **HTTP 400**
in the validator's native format. Business-rule errors return `{ "status": "error", "message",
"code" }`:

| Code | HTTP | Meaning |
|------|------|---------|
| `SL02` | 400 | Slug already taken |
| `AC01` | 400 | access_code required when private |
| `AC05` | 400 | access_code set on a public card |
| `NF01` | 404 | Card not found (or deleted) |
| `NF02` | 404 | Card exists but is a draft |
| `AC03` | 403 | Private card, no access code supplied |
| `AC04` | 403 | Private card, wrong access code |
| `OW01` | 403 | *(extra)* creator_reference is not the card owner (PATCH) |
| `ID01` | 409 | *(extra)* Idempotency-Key reused with a different payload |

## Local development

```bash
npm install
cp .env.example .env          # set MONGODB_URI and PORT
npm start                     # node bootstrap.js
```

Required env vars: `PORT`, `MONGODB_URI`. Redis/queue and email are optional and stay dormant
when their env vars are unset.

## Testing

```bash
npm test          # unit + integration (spins up an in-memory MongoDB — no Docker needed)
npm run test:unit # pure unit tests only
```

Integration tests use `mongodb-memory-server` (a real `mongod` in-process), so the unique slug
index and paranoid soft-delete behave exactly as in production. The suite covers all 16 contract
test cases plus the additional features.

## Deployment (Render / Heroku)

1. `Procfile` already declares `web: node bootstrap.js`; the app reads `process.env.PORT`.
2. Provision **MongoDB Atlas** (free tier) and set `MONGODB_URI`.
3. **Atlas → Network Access → allow `0.0.0.0/0`** (Render/Heroku dynos have no fixed egress IP).
4. Deploy. Verify `GET /health` and the three creator-card endpoints at the **base URL root**.

## Project structure (follows the template)

```
endpoints/creator-cards/   # createHandler route definitions (thin)
services/creator-cards/    # business logic + VSL specs + serializer + slug generator
models/creator-card.js     # Mongoose schema (ULID _id, unique slug, paranoid soft-delete)
repository/creator-card/   # repositoryFactory binding
messages/creator-cards.js  # user-facing strings
test/                      # unit + integration
```

See `openapi.yaml` for the full API contract.
