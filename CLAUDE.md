# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

TinyURL URL-shortener assignment: Spring Boot 3.3 / Java 21 backend (`backend/`), React 19 + Vite frontend (`frontend/`), MongoDB, orchestrated by `docker-compose.yml`. Requirements (from `ReadME.md`): global English audience, 2M users, 2% concurrency (~40k concurrent), 7-day link TTL. `Plan.md` is the design doc (capacity math, architecture, roadmap).

**Plan.md vs. reality:** Plan.md describes Redis caching, an API gateway, a `click_analytics` collection, Snowflake/counter-based IDs, and a `config/`/`util/`/`CacheService` layout. None of that is implemented. Currently there is no Redis, no gateway (the frontend's nginx acts as the proxy), and short codes are random. Treat Plan.md as aspirational and check the code.

## Commands

Backend (run from `backend/`; needs a MongoDB at `localhost:27017` unless `SPRING_DATA_MONGODB_URI` is set):
- Run: `./mvnw spring-boot:run`
- Build jar: `./mvnw clean package -DskipTests`
- All tests: `./mvnw test`
- Single test: `./mvnw test -Dtest=UrlServiceTest` (or `-Dtest=UrlServiceTest#methodName`)

Frontend (run from `frontend/`):
- `npm run dev` (Vite dev server, port 5173), `npm run build`, `npm run lint` (oxlint). There is no frontend test setup.

Full stack: `docker compose up --build` — frontend on :5173 (nginx), backend on :8081, MongoDB on :27017.

## Architecture

**Backend (`com.tinyurl`)** — controller → `UrlService` → `UrlRepository` (Spring Data Mongo + `CustomUrlRepository`/`UrlRepositoryImpl` for atomic `$inc` of `clickCount`).
- `RedirectController` serves `GET /{shortCode:[a-zA-Z0-9_-]+}` with HTTP 302 (deliberately not 301, so TTL expiry and click analytics aren't bypassed by browser caching). It has a `RESERVED_KEYWORDS` set (`api`, `actuator`, ...) that must be extended if new top-level routes are added, since the redirect pattern is a catch-all.
- `UrlController` handles `/api/v1/urls` (create), `/api/v1/urls/{code}`, `/api/v1/urls/{code}/analytics`.
- Expiry is enforced in two places: a MongoDB TTL index on `expiresAt` (created in `MongoIndexConfig` on `ApplicationReadyEvent`, along with the unique `shortCode` index; failures there are only logged as warnings) and an explicit `expiresAt.isBefore(now)` check in `UrlService` (needed because the TTL reaper runs only ~every 60s). Expired → `UrlExpiredException`, missing → `UrlNotFoundException`; mapped to responses in `GlobalExceptionHandler`.
- Click tracking is fire-and-forget via `AnalyticsService.recordClickAsync` (`@EnableAsync` + `AsyncConfig`), so the redirect doesn't wait on the write.
- `ShortCodeGenerator` produces 7-char random Base62 codes using `SecureRandom`; `UrlService` retries up to 5 times with an `existsByShortCode` check (a check-then-insert race, backstopped by the unique index). `Base62Encoder` exists separately and is not used for code generation.
- Config is env-driven via `application.yml` (`SERVER_PORT`, `SPRING_DATA_MONGODB_URI`, `APP_BASE_URL`, `APP_DEFAULT_TTL_DAYS`, `ALLOWED_ORIGINS`). `APP_BASE_URL` determines the `shortUrl` returned to clients. Virtual threads are enabled by default.
- Lombok is used throughout (annotation processor configured in `pom.xml`).

**Frontend** — single-page Vite app. `src/services/api.js` is the only API layer; base URL comes from `VITE_API_BASE_URL` (defaults to `http://localhost:8081`, and is a build-time variable). Components live in `src/components/` (form, result card with QR via `qrcode.react`, analytics view, history list). In Docker, `nginx.conf` serves the SPA and proxies `/api/`, `/actuator/`, and short-code paths (`^/[a-zA-Z0-9_-]{3,25}$`) to `backend:8081`.

`backend/target/` and `frontend/dist/` are committed build outputs; don't edit them.
