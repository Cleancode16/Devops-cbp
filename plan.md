# EventPass — Build Plan & Action Log

> Living reference for building EventPass. Every action, its result and output is appended here.
> Future work: read this file first, then continue from the last completed phase.

## Goal
Minimal MERN app (create/list events, register → signed QR pass, verify pass once) with full DevOps:
Docker + Compose, Jest tests (≥70% coverage), GitHub Actions CI/CD, Kubernetes (minikube),
Terraform (AWS EC2), Prometheus + Grafana, pino JSON logs.

## Constraints / decisions
- **No auth, no admin, no email, no CSV.** Only the 3 features.
- User runs tests/apps themselves (saved preference). Claude writes code, installs deps, runs
  formatter/linter (static tools only), and does **not** run Jest or launch the app.
- Project folder is `C:\Users\bhara\Downloads\Event-pass generator` (= `eventpass/` in the spec).
  It currently sits inside a git repo rooted at `C:\Users\bhara` → for GitHub Actions the user must
  create a dedicated repo here (`git init`, see README).
- Existing scaffold had extra deps from an earlier bigger plan (bcryptjs, jsonwebtoken, zod,
  cookie-parser, express-rate-limit, html5-qrcode, vitest + testing-library). Removed to match scope.

## Phases
| # | Phase | Status |
|---|---|---|
| 1 | Backend + tests | done |
| 2 | Frontend | done |
| 3 | Docker + Compose + monitoring | done |
| 4 | CI/CD | done |
| 5 | Kubernetes | done |
| 6 | Terraform | done |
| 7 | README | done |

---

## Action log

### 2026-10-20 — Session start
- Inspected folder: found `client/` (Vite scaffold: index.html, package.json, src/App.jsx, index.css,
  main.jsx, vite.config.js, public/favicon.svg, node_modules installed) and `server/package.json`
  (+ lockfile, no node_modules).
- Created this `plan.md`.

### Phase 1 — Backend + tests (done)
**Files written**
- `server/package.json` — rewritten: removed bcryptjs, cookie-parser, express-rate-limit,
  jsonwebtoken, zod and the `seed` script. Added inline Jest config (ESM via
  `--experimental-vm-modules`, `setupFiles: tests/setup.js`, coverage threshold 70% on
  branches/functions/lines/statements, `src/server.js` excluded from coverage as it is the
  process entrypoint).
- `server/src/logger.js` — pino JSON to stdout, level from `LOG_LEVEL`.
- `server/src/metrics.js` — prom-client registry, default metrics, `http_requests_total`,
  `http_request_duration_seconds`, `registrations_total`, `checkins_total`,
  `checkin_failures_total{reason}` (reasons pre-initialised to 0), `metricsMiddleware`
  (route label = matched route pattern, `unmatched` for 404s).
- `server/src/token.js` — `signToken` / `verifyToken`, HMAC-SHA256, `timingSafeEqual`.
  Compares the base64url *strings* (not decoded bytes) so a changed last character can't
  slip through base64 padding bits.
- `server/src/models.js` — `Event`, `Registration` (unique index `{event, email}`).
- `server/src/routes.js` — `GET/POST /api/events`, `POST /api/register`, `POST /api/verify`.
  Register: 400 validation → 404 unknown event → 409 duplicate (pre-check) → atomic seat
  reservation with `$expr: {$lt: [registeredCount, capacity]}` (409 full) → pre-generated
  ObjectId used as `rid` so the token is signed before the single insert → on insert
  failure the seat is released (E11000 race → 409). Verify: 401 invalid → atomic
  `findOneAndUpdate({_id, checkedIn:false})` → 404 not found / 409 already used.
- `server/src/app.js` — helmet, cors, json(10kb), pino-http (skips /health & /metrics logs),
  metrics middleware, `/health` (503 when Mongo readyState ≠ 1), `/metrics`, `/api`, JSON 404 +
  JSON error handler (CastError/ValidationError → 400, 5xx hides details).
- `server/src/server.js` — dotenv, fail-fast if `QR_SIGNING_SECRET` missing, connect Mongo,
  listen, SIGTERM/SIGINT graceful shutdown (10 s forced exit).
- `server/tests/setup.js` — sets LOG_LEVEL=silent, QR_SIGNING_SECRET, APP_BASE_URL.
- `server/tests/token.test.js` — sign/verify, tampered payload, tampered signature, wrong
  secret, malformed, valid-signature-bad-payload, missing secret.
- `server/tests/api.test.js` — create/list, 400 validation, register (token + QR data URL),
  full → 409, duplicate email (case-insensitive) → 409, 400/404 register, verify 200, reuse
  409, tampered/garbage/missing token 401, unknown rid 404, /health 200, /metrics, 404 route,
  malformed JSON 400, /health 503 after DB disconnect (last test).
- `server/eslint.config.js`, `server/.prettierrc.json`, `server/.prettierignore`,
  `server/.dockerignore`.

**Commands run**
- `npm install` in server → lockfile synced ("removed 17 packages"). Note: local npm 11 warns
  that the `mongodb-memory-server` postinstall wasn't run; harmless — it downloads the mongod
  binary on first test run instead.
- `npx prettier --write .` → all files unchanged (already formatted).
- `npx eslint .` → no errors.
- Jest NOT run (user runs tests).

**Verify it yourself**
```bash
cd server
npm ci
npm run lint && npm run format:check
npm run test:coverage        # first run downloads MongoDB 7.0.14 binary (~100 MB)
# run against a local Mongo:
cp ../.env.example .env      # (created in Phase 3) then edit QR_SIGNING_SECRET
npm run dev
curl http://localhost:5000/health
```

### Phase 2 — Frontend (done)
**Files written / changed**
- `client/package.json` — removed html5-qrcode, vitest, jsdom, @testing-library/* and the
  `test` scripts (spec: Jest is server-only; no camera scanner feature).
- `client/vite.config.js` — dev proxy `/api` + `/health` → `http://localhost:5000`.
- `client/tailwind.config.js`, `client/postcss.config.js` (Tailwind v3).
- `client/src/index.css` — replaced Vite demo CSS with Tailwind directives + `.card/.input/.btn/.label`.
- `client/index.html` — title → "EventPass".
- `client/src/api.js` — axios instance `baseURL: '/api'` + `errorMessage()` helper.
- `client/src/main.jsx` — wraps App in `BrowserRouter`.
- `client/src/App.jsx` — replaced Vite demo; dark layout, nav, routes `/`, `/events/:id/register`,
  `/pass`, `/verify`, 404.
- `client/src/pages/Events.jsx` — list (`GET /api/events`) + create form (`POST /api/events`),
  loading/error/empty states, "Full" badge.
- `client/src/pages/Register.jsx` — loads event from `GET /api/events` (no single-event route
  exists, by design), `POST /api/register`, navigates to `/pass` with `{token, qr, name, event}`
  in router state.
- `client/src/pages/Pass.jsx` — QR image (data URL), token textarea, copy button. Shows a
  friendly message if opened without state (e.g. after refresh).
- `client/src/pages/Verify.jsx` — paste token or auto-verify `?token=` (useRef guard so React
  StrictMode's double effect doesn't check in twice in dev). Green = 200, amber = 409,
  red = 401/404/other.
- `client/eslint.config.js` (flat config: react, hooks, refresh, prettier),
  `client/.prettierrc.json`, `client/.prettierignore`, `client/.dockerignore`.

**Frontend → backend route check**
| Frontend call | Backend route |
|---|---|
| `api.get('/events')` (Events, Register) | `GET /api/events` ✓ |
| `api.post('/events')` | `POST /api/events` ✓ |
| `api.post('/register')` | `POST /api/register` ✓ |
| `api.post('/verify')` | `POST /api/verify` ✓ |

**Commands run**
- `npm install` → lockfile synced (removed packages no longer present).
- `npx prettier --write .` → reformatted `src/pages/Events.jsx` only.
- `npx eslint .` → clean (after converting `load` to `useCallback` to satisfy exhaustive-deps).
- `npx vite build` → compiled OK (228 kB JS / 11 kB CSS); `dist/` deleted afterwards.
  App was NOT launched.

**Verify it yourself**
```bash
# terminal 1 (needs local MongoDB on 27017)
cd server && npm run dev
# terminal 2
cd client && npm ci && npm run dev     # http://localhost:5173
npm run lint && npm run format:check && npm run build
```

### Phase 3 — Docker + Compose + monitoring (done)
**Files written**
- `server/Dockerfile` — multi-stage `node:20-alpine`: `deps` stage copies `package*.json` first
  and runs `npm ci --omit=dev` (cached layer); `runtime` stage removes npm/corepack (smaller
  image, fewer CVEs for Trivy), copies node_modules + src owned by `node`, `USER node`,
  `EXPOSE 5000`, `HEALTHCHECK` via busybox `wget` on `/health`.
- `client/Dockerfile` — `node:20-alpine` build stage (`npm ci && npm run build`) →
  `nginxinc/nginx-unprivileged:1.27-alpine` (non-root, port 8080) + HEALTHCHECK.
- `client/nginx.conf` — SPA fallback (`try_files … /index.html`), proxies `/api/`, `/health`,
  `/metrics` to `http://server:5000`, long cache for `/assets/`.
- `docker-compose.yml` — services mongo (healthcheck `mongosh ping`, named volume
  `mongo-data`), server (healthcheck, `depends_on mongo: service_healthy`), client
  (`8080:8080`, waits for healthy server), prometheus (`9090`), grafana (`3000`); custom
  `eventpass` bridge network; `restart: unless-stopped` everywhere; `env_file: .env` with
  `required: false`.
  - Decision: so `docker compose up --build` works from a **fresh clone without .env**, the
    server's `QR_SIGNING_SECRET` falls back to `dev-only-change-me`. Any real deployment sets
    it in `.env` (Terraform writes a real one on EC2). `MONGO_URI` is always forced to
    `mongodb://mongo:27017/eventpass` inside Compose.
  - Images are named `${DOCKER_USERNAME:-eventpass}/eventpass-{server,client}:${IMAGE_TAG:-latest}`
    so the same file works for local builds and for `docker compose pull` on a server.
- `monitoring/prometheus.yml` — scrape `server:5000/metrics` every 15s (+ Prometheus itself).
- `monitoring/grafana/provisioning/datasources/prometheus.yml` — datasource uid `prometheus`.
- `monitoring/grafana/provisioning/dashboards/dashboards.yml` — file provider →
  `/var/lib/grafana/dashboards`.
- `monitoring/grafana/dashboards/eventpass.json` — panels: request rate by route, p95 latency,
  total registrations, check-ins, check-in failures by reason.
- `.env.example` — every server env var (PORT, MONGO_URI, QR_SIGNING_SECRET, APP_BASE_URL,
  LOG_LEVEL) + DOCKER_USERNAME, IMAGE_TAG, Grafana admin creds.
- `.gitignore` (root) — node_modules, .env*, dist, coverage, terraform state/.terraform/tfvars,
  `k8s/secret.yaml`.

**Commands run**
- `node -e JSON.parse(...)` on the dashboard → valid JSON.
- `docker compose config --quiet` → valid (Docker Compose v2.39.4). No images built, nothing started.

**Verify it yourself**
```bash
cp .env.example .env          # optional; edit QR_SIGNING_SECRET
docker compose up --build -d
docker compose ps             # mongo/server/client should be "healthy"
docker compose logs -f server # JSON logs
curl http://localhost:8080/health
# App http://localhost:8080 · Prometheus http://localhost:9090/targets · Grafana http://localhost:3000 (admin/admin)
docker compose down -v
```

### Phase 4 — CI/CD (done)
**Files written**
- `.github/workflows/ci-cd.yml` — triggers: push to `main`, `dev`, `feature/**`; PRs to
  `main`/`dev`. Jobs chained with `needs` (each runs only if the previous passed):
  1. `lint` (matrix server/client): `npm ci`, `npm run lint`, `npm run format:check`.
  2. `test`: `npm run test:coverage` (Jest threshold 70%), MongoDB binary cached via
     `MONGOMS_DOWNLOAD_DIR` + `actions/cache`, coverage uploaded as artifact `coverage-report`.
  3. `security`: `npm audit --omit=dev --audit-level=high` for both apps (blocking) +
     full-tree audit (report only) + Trivy filesystem scan (vuln+secret, HIGH/CRITICAL,
     ignore-unfixed, exit-code 1).
  4. `build-push` (push to `main` only, matrix server/client): Buildx + GHA cache
     (`scope` per app) → build & load `sha-<short>` → Trivy image scan (CRITICAL, fails job) →
     push `latest` + `sha-<short>` to Docker Hub (`DOCKER_USERNAME`/`DOCKER_PASSWORD`).
  5. `deploy` (push to `main` only): if `SSH_HOST` secret is empty → prints a notice and the
     job succeeds; otherwise `appleboy/ssh-action` runs
     `cd /opt/eventpass && docker compose pull && docker compose up -d && docker image prune -f`.
- Pinned versions: checkout v4.2.2, setup-node v4.1.0, cache v4.1.2, upload-artifact v4.4.3,
  setup-buildx v3.7.1, login v3.3.0, build-push v6.9.0, ssh-action v1.2.0, Trivy image
  `aquasec/trivy:0.56.2`, runners `ubuntu-22.04`.

**Decisions**
- Trivy runs from the pinned `aquasec/trivy` Docker image instead of
  `aquasecurity/trivy-action`, whose mutable tags were hit by a supply-chain compromise.
  (Even stronger: pin all actions to full commit SHAs.)
- `npm audit` deviation from the spec's literal command: local run showed
  **server 30 high / client 5 high**, all in dev-only tooling, rooted in `braces`
  (advisory covers *every* version — no upgrade fixes it) via Jest 29, nodemon/chokidar and
  Tailwind v3/fast-glob. Tailwind v3 is a spec requirement, so a full-tree gate could never
  pass. Gate = `--omit=dev` (what ships), full audit kept as a non-blocking warning.
  Trivy fs ignores npm dev deps by default, so it agrees with this.
- Removed `nodemon`; `npm run dev` now uses Node 20's built-in `node --watch src/server.js`.
- Upgraded `react-router-dom` 6.30.6 → **7.18.4** to fix moderate runtime advisories
  (open redirect / SSR constructor injection). APIs used (BrowserRouter, Routes, Route,
  NavLink, Link, useNavigate, useParams, useSearchParams, useLocation) are unchanged in v7.

**Commands run**
- `npx yaml valid < .github/workflows/ci-cd.yml` → valid.
- `npm audit` (both apps): before → server 35 vulns (30 high), client 9 (5 high);
  after changes → `--omit=dev`: server 0, client 0 (exit 0).
- server: `npm install` (nodemon removed, "removed 18 packages"), eslint + prettier check OK.
- client: `npm install react-router-dom@7.18.4 --save-exact`, eslint + prettier OK,
  `vite build` OK (244 kB JS), `dist/` deleted.

**GitHub secrets needed**: `DOCKER_USERNAME`, `DOCKER_PASSWORD` (Docker Hub access token),
optional `SSH_HOST`, `SSH_USER` (default `ubuntu`), `SSH_KEY` (private key).

**Verify it yourself**
```bash
# this folder must be its own repo for Actions to run
git init -b main && git add . && git commit -m "chore: initial EventPass project"
git remote add origin https://github.com/<you>/eventpass.git && git push -u origin main
# then watch: GitHub → Actions → "CI/CD"
```

### Phase 5 — Kubernetes (done)
**Files written (`k8s/`)**
- `namespace.yaml` — namespace `eventpass`.
- `configmap.yaml` — PORT, `MONGO_URI=mongodb://mongo:27017/eventpass`,
  `APP_BASE_URL=http://eventpass.local`, LOG_LEVEL.
- `secret.example.yaml` — **fully commented** template + the `kubectl create secret` command.
  Commented on purpose so `kubectl apply -f k8s/` never overwrites the real secret with a
  placeholder. `k8s/secret.yaml` is git-ignored if the user prefers a file.
- `mongo.yaml` — headless Service `mongo` + StatefulSet (mongo:7.0, mongosh ping probes,
  resources) with `volumeClaimTemplates` → PVC `mongo-data-mongo-0` (1Gi).
- `server.yaml` — Deployment, **2 replicas**, RollingUpdate (maxSurge 1, maxUnavailable 0),
  `imagePullPolicy: IfNotPresent` (for `minikube image load`), envFrom ConfigMap + Secret,
  readiness/liveness `GET /health`, requests 100m/128Mi limits 500m/256Mi, non-root uid 1000,
  read-only root FS, drop ALL caps + Service `server:5000` (name matches nginx upstream).
- `client.yaml` — Deployment (nginx-unprivileged uid 101) + Service `client:8080`.
- `ingress.yaml` — class `nginx`, host `eventpass.local` → client:8080.
- `hpa.yaml` — autoscaling/v2, server 2–5 replicas at 70% CPU.

**Notes**
- `kubectl apply -f k8s/` processes files alphabetically, so `namespace.yaml` comes after
  `client.yaml`. Steps therefore apply the namespace first, create the secret, then apply the folder.
- Rollout demo: `latest` tag + `minikube image load` doesn't trigger a rollout; README uses
  version tags (`:v1`, `:v2`) with `kubectl set image` for rollout/undo.

**Commands run**
- `npx yaml valid` on every manifest → all valid.
- `kubectl apply --dry-run=client --validate=false -f k8s/` → no cluster configured
  (`current-context is not set`), so it can't validate fully. It did confirm all files parse, and
  `secret.example.yaml` was skipped (no error line for it).

**Verify it yourself**
```bash
minikube start --cpus=4 --memory=6g
minikube addons enable ingress
minikube addons enable metrics-server
docker build -t eventpass-server:latest ./server
docker build -t eventpass-client:latest ./client
minikube image load eventpass-server:latest
minikube image load eventpass-client:latest
kubectl apply -f k8s/namespace.yaml
kubectl -n eventpass create secret generic eventpass-secret --from-literal=QR_SIGNING_SECRET="$(openssl rand -hex 32)"
kubectl apply -f k8s/
kubectl -n eventpass rollout status deployment/server
kubectl -n eventpass get pods,svc,ingress,hpa
```

### Phase 6 — Terraform (done)
**Files written (`terraform/`)**
- `main.tf` — AWS provider `~> 5.80` (default tags), default VPC lookup, latest Ubuntu 22.04
  AMI (Canonical), `aws_key_pair` from `public_key_path`, security group (22 from `ssh_cidr`;
  80, 8080, 3000, 9090 from `allowed_cidr`), `aws_eip` + `aws_eip_association` (EIP created
  without an instance reference so its IP can go into user_data as `APP_BASE_URL` with no
  dependency cycle), `aws_instance` t2.micro, 20 GiB encrypted gp3, IMDSv2 required,
  `user_data_replace_on_change = true`.
- `variables.tf` — aws_region, project, instance_type (t2.micro), public_key_path, **ssh_cidr
  (required)**, allowed_cidr, docker_username (required), image_tag, qr_signing_secret
  (sensitive, ≥32 chars validation), grafana_admin_password (sensitive, required).
- `outputs.tf` — public_ip, app_url, grafana_url, prometheus_url, ssh_command.
- `user_data.sh` (templatefile) — 2 GiB swap (t2.micro has 1 GiB RAM), Docker + Compose
  plugin via get.docker.com, `ubuntu` added to docker group, writes `/opt/eventpass/.env`
  (chmod 600), a production `docker-compose.yml` (images only, client on 80 and 8080) and the
  monitoring files (pulled from the repo's `monitoring/` folder via `file()`, one source of
  truth), then `docker compose pull && up -d` with 10 retries (images may not be pushed yet).
  Grafana receives only its two GF_* vars, not the whole .env.
- `terraform.tfvars.example`.
- `.gitattributes` (root) — `* text=auto eol=lf` so `user_data.sh`/YAML keep LF on Windows
  checkouts (CRLF would break bash on the instance).

**Decisions / caveats**
- user_data values (incl. the QR secret) are readable via instance metadata by anyone with
  shell access on the box — fine for a course project; production would use SSM Parameter Store.
- If GitHub Actions should deploy over SSH, port 22 must be reachable from GitHub runners
  (`ssh_cidr = "0.0.0.0/0"`, key-only auth) — documented trade-off.

**Commands run**
- Checked that the only unescaped `${…}` in user_data.sh are template variables (the comment
  that literally contained `${...}` was reworded; it would have broken templatefile).
- Estimated rendered user_data size ≈ 8.2 KB (EC2 limit 16 KB).
- `terraform` is **not installed** on this machine → `terraform fmt/validate` not run. Map
  alignment hand-adjusted to fmt style.

**Verify it yourself**
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # fill in; never commit it
terraform init
terraform fmt -check && terraform validate
terraform plan
terraform apply
terraform output
# when done — avoid charges:
terraform destroy
```

### Phase 7 — README (done)
**File written**: `README.md` — overview, Mermaid architecture (Browser → nginx → Express →
MongoDB; Prometheus → Express; Grafana → Prometheus; GitHub Actions → Docker Hub → EC2), tech
table, folder tree, local run without Docker, Docker Compose commands + URL table, API table
+ design notes, env var table, test commands, Git branching (`main`/`dev`/`feature/*`) +
Conventional Commit examples, CI/CD job table + secrets table, Kubernetes steps
(minikube image load, apply, rollout status/history/undo, scale, ingress/tunnel/hosts),
Terraform steps with **destroy** and **never commit terraform.tfvars** warnings, monitoring
(metrics list + PromQL), 10-minute demo script.

### Final checks (2026-10-20)
- Frontend → backend routes: all 4 calls map to real routes (table in Phase 2). ✓
- Every env var read in `server/src` (APP_BASE_URL, LOG_LEVEL, MONGO_URI, PORT,
  QR_SIGNING_SECRET) is in `.env.example`. ✓
- No hardcoded secrets in code. The only fallback is Compose's dev-only
  `QR_SIGNING_SECRET=dev-only-change-me`, so a fresh clone runs (documented). ✓
- Fresh clone `docker compose up --build`: lockfiles in sync with package.json (both
  re-installed), Dockerfiles copy `package*.json` that exist, `.env` optional, nginx upstream
  `server:5000` matches the Compose service name, `docker compose config` valid. ✓ (static check only)
- server + client: `prettier --check` and `eslint` clean; all YAML files parse. ✓
- NOT run (user does this): Jest, `docker compose up`, minikube, terraform.
- Git: project is still inside the repo rooted at `C:\Users\bhara`. Run `git init -b main`
  in this folder before pushing to GitHub (nothing was committed by Claude).

## Full file inventory
```
.env.example  .gitattributes  .gitignore  README.md  plan.md  docker-compose.yml
.github/workflows/ci-cd.yml
client/  Dockerfile .dockerignore nginx.conf package.json package-lock.json index.html
         vite.config.js tailwind.config.js postcss.config.js eslint.config.js
         .prettierrc.json .prettierignore .gitignore public/favicon.svg
         src/{api.js,App.jsx,main.jsx,index.css,pages/{Events,Register,Pass,Verify}.jsx}
server/  Dockerfile .dockerignore package.json package-lock.json eslint.config.js
         .prettierrc.json .prettierignore
         src/{app.js,server.js,models.js,routes.js,token.js,metrics.js,logger.js}
         tests/{setup.js,token.test.js,api.test.js}
monitoring/prometheus.yml
monitoring/grafana/provisioning/{datasources/prometheus.yml,dashboards/dashboards.yml}
monitoring/grafana/dashboards/eventpass.json
k8s/{namespace,configmap,secret.example,mongo,server,client,ingress,hpa}.yaml
terraform/{main.tf,variables.tf,outputs.tf,user_data.sh,terraform.tfvars.example}
```

## Next steps for the user
1. `cd server && npm run test:coverage` — confirm tests pass and coverage ≥ 70%.
2. `docker compose up --build -d` → walk the demo script.
3. `git init -b main`, push to GitHub, add secrets, watch the pipeline.
4. minikube steps, then Terraform (and `terraform destroy` afterwards).

### 2026-10-20 — Troubleshooting: `RefreshRuntime.register is not a function` (Events.jsx)
- Cause: the Vite dev server process (started 22:17) was older than the
  `@vitejs/plugin-react` files on disk (reinstalled 22:40). The running process still had the
  old plugin in memory and generated `RefreshRuntime.register(...)`, but served the new
  `refresh-runtime.js` from disk (4.7.0 exports `getRefreshReg`, no `register`). A leftover
  `node_modules/.vite/deps_temp_*` folder showed an interrupted pre-bundle.
- Not a code bug; no source changed.
- Fix: stop Vite (Ctrl+C) → delete `client/node_modules/.vite` → `npm run dev` →
  hard-reload the browser (Ctrl+Shift+R). Rule: restart dev servers after any `npm install`.
- Follow-up ("still not working"): the stale Vite process (PID 11392, started 22:17) was still
  running on :5173. The restart hadn't happened, probably because Ctrl+C went to another terminal.
  Claude stopped PID 11392, deleted `client/node_modules/.vite` (incl. `deps_temp_*`),
  started Vite briefly to check it, then stopped it again. Result: `/src/pages/Events.jsx` now
  compiles with `RefreshRuntime.getRefreshReg` (no `.register`) and the `/api/events` proxy →
  200. The user starts `npm run dev` themselves.

### 2026-10-20 — Frontend UI redesign (polished, responsive, lucide-react icons)
**Request**: proper, fully polished, responsive UI; use lucide-react icons instead of emoji/text glyphs.
Scope unchanged: same 3 features, same routes, same API calls.

**Dependency**
- `lucide-react@1.52.0` (exact pin). The newest release (1.60.0) was published the same day,
  so I picked the latest release that was at least two weeks old (published 2026-10-04).
  Peer deps allow React 18. Verified every icon used is exported (lucide renamed several
  icons; using current names: CircleCheck, CircleCheckBig, TriangleAlert, CircleX, LoaderCircle).

**Files**
- `client/index.html` — Inter font (Google Fonts), theme-color, meta description.
- `client/tailwind.config.js` — Inter as default sans; `animate-fade-in` keyframes.
- `client/src/index.css` — base (dark `color-scheme` for native date pickers, body bg,
  selection) + component classes `.card .icon-tile .label .input .btn .btn-primary
  .btn-secondary .btn-ghost .skeleton`.
- NEW `client/src/lib/format.js` — Intl date/time formatters, `localDateTimeInputValue`
  (min for datetime-local), `capacityInfo` (seats left, %, status open/almost/full).
- NEW `client/src/components/ui.jsx` — Spinner, PageHeader, Alert (with retry), EmptyState,
  Field (label + leading icon), DateBadge, StatusBadge, CapacityBar (accessible progressbar).
- `client/src/App.jsx` — sticky blurred header with gradient logo, pill nav (icons; labels
  hidden < 400px), Events tab stays active on register/pass pages, radial glow background,
  footer, scroll-to-top on route change, styled 404.
- `client/src/pages/Events.jsx` — stats row (events / registered / seats left), responsive
  card grid (1 col → 2 cols), cards with date badge, time, venue, status badge, capacity bar,
  "Get a pass" / "Sold out"; skeleton loading; error with retry; empty state. Create form is a
  sticky right sidebar on ≥lg and a toggled panel ("New event" button) on mobile/tablet; past
  dates blocked via `min`; success message auto-hides; list refreshes silently after create.
- `client/src/pages/Register.jsx` — back link, 2-column layout on ≥md (event summary + form),
  inputs with icons, autocomplete attrs, disabled + alert when full, spinner while submitting,
  skeleton / not-found / error states.
- `client/src/pages/Pass.jsx` — ticket design: gradient header, date/time/venue grid,
  perforation divider, QR on white card, token with copy (clipboard API + execCommand fallback
  for non-HTTPS hosts like the EC2 IP), "Save QR" (downloads the PNG data URL) and link to the
  verify page (deliberately without the token, so it doesn't consume the pass).
- `client/src/pages/Verify.jsx` — paste button (only shown where the clipboard API exists),
  clear button, result card per outcome: success (green CircleCheckBig), already used (amber
  TriangleAlert), invalid (red CircleX), not found (red SearchX), network error (WifiOff); details
  list (attendee, event, date, venue, checked-in time). After auto-verify from `?token=`, the
  token is removed from the URL so a refresh doesn't re-submit and show "already used".

**Commands run**
- `npm install --save-exact lucide-react@1.52.0` (lockfile updated, so Docker `npm ci` stays in sync).
- `npx prettier --write .` (reformatted 6 files), `npx eslint .` → clean,
  `npx vite build` → OK (280 kB JS / 27 kB CSS), `dist/` removed. App not launched.

**Verify it yourself**: restart the dev server (new dependency + Tailwind config change):
Ctrl+C → `npm run dev` → Ctrl+Shift+R. Check widths 375px / 768px / 1280px in DevTools.

### 2026-10-20 — UI v2: "make it cool, good and responsive"
**Feedback**: the create-event sidebar looked cramped and flat (screenshot); the user wanted a
more striking, responsive UI.

**Changes**
- `client/tailwind.config.js` — new animations: `overlay-in`, `sheet-in`, `float`.
- `client/src/index.css` — deeper background (#05060f), body `overflow-x-hidden`, fixed 44px
  input/button heights, translucent inputs with hover/focus states, gradient primary button
  with press effect, date-picker indicator styling, `.text-gradient` utility.
- `client/src/components/ui.jsx` — NEW `Modal` (bottom sheet on phones, centred dialog on ≥sm;
  Escape/backdrop close, body scroll lock), NEW `Toast`; EmptyState with glow + floating icon;
  DateBadge solid (so it can overlap covers) with `className` prop; bolder badges/progress bar.
- `client/src/lib/format.js` — `coverFor(id)`: stable gradient per event (6 palettes).
- `client/src/pages/Events.jsx` — rewritten: hero (badge, gradient headline, CTA "Create
  event" + "Verify a pass", 3 stat tiles: a column on lg, a row on mobile); create form moved into
  the Modal (title, venue, date + capacity side by side on ≥sm, Cancel/Create); success Toast;
  event cards with gradient cover band, overlapping date badge, status badge on cover, capacity
  bar, CTA pinned to card bottom; grid 1 / 2 (sm) / 3 (xl) columns; empty state CTA opens modal.
- `client/src/pages/Register.jsx` — event summary card gets the same gradient cover + overlapping
  date badge (needed `relative` on the body so the badge sits above the cover).
- `client/src/pages/Verify.jsx` — detail rows: narrower label column on phones so values don't wrap.
- `client/src/App.jsx` — background: masked grid pattern + indigo glow; nav labels shown from
  360px (were hidden below 400px, i.e. on most phones).

**Visual check (new practice for UI work)**
- Installed `puppeteer-core@25.12.0` in the session scratchpad only (not a project dep). It drives
  the local Chrome against the running Vite dev server with **mocked `/api` responses**, so no
  data was written to the local MongoDB.
- Captured events (desktop 1280 / mobile 390), empty state, modal (desktop + mobile sheet),
  register, pass (via mocked register submit), verify success/used/invalid.
- Every capture: `horizontal-overflow=0px`. Fixed issues found by the captures (nav labels hidden
  on phones, register date badge hidden behind cover, verify rows wrapping).
- Note: plain `chrome --headless --window-size=390,…` is unreliable for mobile (minimum ~500px
  layout width, then cropped), hence puppeteer with `isMobile`.

**Commands run**: prettier --write, eslint (clean), `vite build` OK (dist removed).

### 2026-10-20 — Professional README with DevOps concepts, HLD, LLD, flowcharts
**File**: `README.md` fully rewritten for GitHub readers and course evaluators. Sections: badges,
TOC, overview, **27 DevOps concepts table (concept / where / why EventPass needs it)**,
**HLD** (system context, runtime architecture, 3 deployment views, delivery pipeline),
**flowcharts** (user journey, register logic, verify logic, Compose startup order),
**LLD** (backend module diagram + table, ER diagram + invariants, registration state diagram,
token format, sequence diagrams for register and verify, frontend component tree, K8s object
design, CI/CD job design, metrics design table), tech stack, structure, getting started,
API, configuration, testing, Git workflow (gitGraph + Conventional Commits), CI/CD + secrets,
Kubernetes, Terraform (destroy / never-commit warnings), monitoring + PromQL, security
controls, 10-minute demo script, troubleshooting (incl. the Vite refresh-runtime issue).

**Validation**: extracted all 17 ```mermaid blocks and rendered each in headless Chrome
(puppeteer-core in scratchpad) with mermaid **12.1.0** and **11.4.1** → 17/17 OK in both
(flowchart ×12, erDiagram, stateDiagram-v2, sequenceDiagram ×2, gitGraph).

**⚠ Found during this step (not changed by Claude)**: `docker-compose.yml` server
`MONGO_URI` was edited by the user to a hardcoded MongoDB Atlas `mongodb+srv://` URI that
contains a username and password. Recommended: move it to `.env`
(`MONGO_URI: ${MONGO_URI:-mongodb://mongo:27017/eventpass}` in compose), and rotate the Atlas
password if this file was ever committed or pushed. README still documents the default local
`mongo` container.
