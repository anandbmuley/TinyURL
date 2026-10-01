# TinyURL System Architecture & Implementation Plan

## 1. Executive Summary & Problem Definition

The objective is to design and build a high-performance, scalable, and resilient URL Shortener (TinyURL) system tailored to a global English-speaking audience. The system translates long URLs into compact aliases, seamlessly handles high-throughput redirection, and automatically manages link lifecycles.

### Requirements & Constraints
* **Target Audience:** Global, English language.
* **User Base:** 2,000,000 total / daily active users.
* **Concurrency:** 2% concurrent users = **40,000 concurrent active connections** at peak.
* **Link Retention (TTL):** Default **7 days** Time-To-Live. Expired links must no longer redirect and should be purged.
* **Target Tech Stack:** Java, MongoDB, Docker, API Gateway, ReactJS.

---

## 2. Capacity Planning & Quantitative Estimations

### 2.1 Traffic Projections
* **Assumed Write Rate:** If 2M active users generate an average of 1 short link every 2 days:
  * Total Writes per Day: $\approx 1,000,000 \text{ writes/day}$
  * Average Write QPS: $\frac{1,000,000}{86,400} \approx \mathbf{12 \text{ writes/sec}}$
  * Peak Write QPS (burst factor $\times 5$): $\approx \mathbf{60 - 100 \text{ writes/sec}}$
* **Read:Write Ratio:** Typical URL shortener traffic is heavily read-dominant ($\approx 20:1$ to $50:1$).
  * Total Reads per Day: $20,000,000 - 50,000,000 \text{ redirects/day}$
  * Average Read QPS: $\approx \mathbf{250 - 600 \text{ reads/sec}}$
  * Peak Read QPS: $\approx \mathbf{3,000 - 6,000 \text{ reads/sec}}$
  * **Peak Concurrent Connections:** **40,000 concurrent connections** (predominantly read requests needing sub-15ms response latency).

### 2.2 Storage & Memory Calculations
* **Active Working Set (7-Day TTL):**
  $$\text{Active Links} = 1,000,000 \text{ writes/day} \times 7 \text{ days} = \mathbf{7,000,000 \text{ active documents}}$$
* **Storage per Document:**
  * `_id` (ObjectId): 12 bytes
  * `shortCode` (7 ASCII chars): 7 bytes
  * `originalUrl` (UTF-8, average): ~500 bytes
  * `createdAt` + `expiresAt` (timestamps): 16 bytes
  * `clickCount` / metadata: ~50 bytes
  * Indexes & MongoDB BSON overhead: ~400 bytes
  * **Total per document:** $\approx 1 \text{ KB}$
* **Total Database Storage:**
  $$7,000,000 \times 1 \text{ KB} \approx \mathbf{7 \text{ GB}}$$
* **Cache Sizing (80/20 Pareto Principle):**
  * 20% of the URLs will account for 80% of redirect requests.
  * Cache memory needed: $20\% \times 7 \text{ GB} \approx \mathbf{1.4 \text{ GB}}$ of RAM.
  * An entry-level Redis instance (e.g., 2 GB–4 GB RAM) will easily cache all hot URLs in memory.

---

## 3. Architecture & Tech Stack Evaluation

```mermaid
graph TD
    User([Global Users / Browsers]) -->|HTTP/HTTPS 40k Concurrency| Gateway[API Gateway: Rate Limiting & Routing]

    subgraph Client Layer
        Gateway -->|Serve SPA| Frontend[ReactJS + Vite UI]
    end

    subgraph Application Layer
        Gateway -->|POST /api/v1/urls| UrlService[Java Spring Boot URL Service]
        Gateway -->|GET /{shortCode}| RedirectService[Java Spring Boot Redirect Engine]
        Gateway -->|GET /api/v1/analytics| AnalyticsService[Analytics Engine]
    end

    subgraph Caching Layer
        RedirectService -->|1. Fast Cache Read < 2ms| RedisCache[(Redis In-Memory Cache)]
    end

    subgraph Database Layer
        RedirectService -->|2. Cache Miss Fallback| MongoDB[(MongoDB with TTL Index)]
        UrlService -->|Save URL + expiresAt| MongoDB
        UrlService -->|Warm Cache| RedisCache
    end

    subgraph Asynchronous Tracking
        RedirectService -.->|Async Event| EventQueue[Internal Event Bus / Queue]
        EventQueue -.->|Batch Update| MongoDB
    end
```

### Component Details

1. **Backend Service — Java 21 / Spring Boot 3:**
   * **Why Java 21:** Utilizing **Virtual Threads (Project Loom)** enables the JVM to handle 40,000 concurrent blocking I/O network calls (DB reads, Redis lookups) with minimal OS thread overhead and high CPU efficiency.
   * Structured via Clean/Hexagonal Architecture: separation of controller, domain services, caching layer, and data repositories.

2. **Database — MongoDB:**
   * **Native TTL Collections:** Uses MongoDB's built-in TTL indexes (`expireAfterSeconds: 0` on `expiresAt`) to automatically remove expired records in the background, eliminating the need for custom batch cleanup scripts.
   * **High Performance Indexing:** Unique index on `shortCode` provides $O(1)$ indexed lookups.
   * **Horizontal Scale:** Easy to shard across multiple replica sets if data volume scales beyond 7-day windows in the future.

3. **In-Memory Cache — Redis (Recommended Layer):**
   * Placed in front of MongoDB to absorb 90%+ of read traffic.
   * Redis keys are stored with a 7-day matching TTL (`EX 604800`).
   * Guarantees single-digit millisecond redirect latencies for peak 40k concurrency.

4. **API Gateway (Spring Cloud Gateway or Nginx):**
   * **Rate Limiting:** Token-bucket rate limiter per IP address to safeguard the service from scrapers, bots, and DDoS.
   * **SSL/TLS Termination & Routing:** Routes `/{shortCode}` directly to the high-speed redirect endpoint and `/api/*` to management endpoints.
   * **CORS & Security:** Manages cross-origin headers, request sanitization, and security policies.

5. **Frontend — ReactJS (Vite):**
   * Modern, responsive interface.
   * **Features:** Instant short-link generation, custom alias validation, QR code creation and download, copy-to-clipboard, real-time expiration countdown (TTL indicator), and click analytics.

6. **Containerization — Docker & Docker Compose:**
   * Multi-container environment running: `api-gateway`, `url-backend`, `url-frontend`, `mongodb`, and `redis`.
   * Standardized configuration for local testing and cloud deployment.

---

## 4. Key Architectural Decisions

### 4.1 Short Code Generation Algorithm
* **Length & Character Set:**
  * 7-character string using **Base62** (`[0-9a-zA-Z]`).
  * $62^7 = 3,521,614,606,208$ (over **3.5 Trillion unique combinations**), ensuring zero risk of key exhaustion.
* **Generation Strategy: Distributed Counter / Snowflake ID + Base62:**
  * A 64-bit unique sequential or Snowflake ID is encoded into Base62 characters.
  * **Pros:** Guarantees absolute uniqueness with zero hash collisions; $O(1)$ computation time; no costly DB collision check-and-retry loops.
  * **Alternative:** MurmurHash3 / MD5 truncated to 7 chars with DB uniqueness collision fallback.

### 4.2 HTTP 302 (Found) vs HTTP 301 (Moved Permanently)
* **Decision:** We will use **HTTP 302 (Temporary Redirect)**.
* **Rationale:**
  * A **301** redirect is aggressively cached by web browsers. If a user clicks the link repeatedly, subsequent requests never reach the server, meaning click analytics are lost. More critically, if the 7-day TTL expires, users with cached 301s would continue redirecting rather than seeing an "Expired" page.
  * A **302** ensures every visit reaches the API Gateway / Redis cache, allowing exact TTL validation and real-time click metrics.

### 4.3 7-Day TTL Lifecycle Management
1. **Creation:** When a URL is shortened, `expiresAt = createdAt + 7 days`.
2. **Database:** MongoDB Index:
   ```javascript
   db.urls.createIndex({ "expiresAt": 1 }, { expireAfterSeconds: 0 })
   ```
3. **Cache:** Redis key set with dynamic TTL:
   ```text
   SET url:{shortCode} {originalUrl} EX 604800
   ```
4. **Lookup Handling:** If a shortCode is requested after 7 days:
   * Redis returns `nil` (key expired).
   * MongoDB returns `null` (document removed by TTL thread or query filter `expiresAt > now`).
   * Service returns a clean `404 Not Found` or `410 Gone (Link Expired)` response page.

### 4.4 High Concurrency & Asynchronous Analytics
* To maintain low latency during redirect bursts (up to 40,000 concurrent sessions):
  * The redirect path immediately returns the 302 response upon fetching the URL from Redis/MongoDB.
  * Click counter increments and access logs are dispatched asynchronously via an in-memory event publisher (`ApplicationEventPublisher` / CompletableFuture / worker queue) to avoid blocking the user's redirect request.

---

## 5. Data Model & API Specifications

### 5.1 MongoDB Schemas

#### Collection: `urls`
```json
{
  "_id": ObjectId("65e0..."),
  "shortCode": "aB3x9Z1",
  "originalUrl": "https://example.com/very/long/deep/link/resource",
  "customAlias": false,
  "createdAt": ISODate("2026-09-03T10:00:00Z"),
  "expiresAt": ISODate("2026-09-10T10:00:00Z"),
  "clickCount": 142,
  "lastAccessedAt": ISODate("2026-09-03T12:30:00Z")
}
```
* **Indexes:**
  * `{ "shortCode": 1 }` (Unique)
  * `{ "expiresAt": 1 }` (ExpireAfterSeconds: 0)

#### Collection: `click_analytics` (Optional detailed tracking)
```json
{
  "_id": ObjectId("65e1..."),
  "shortCode": "aB3x9Z1",
  "timestamp": ISODate("2026-09-03T12:30:00Z"),
  "referrer": "https://twitter.com",
  "userAgent": "Mozilla/5.0 ...",
  "country": "US"
}
```

### 5.2 Core REST Endpoints

| Method | Endpoint | Description | Expected Status |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/urls` | Create short URL (optional custom alias) | `201 Created` |
| `GET` | `/{shortCode}` | Resolve & redirect to long URL | `302 Found` / `404 Not Found` / `410 Gone` |
| `GET` | `/api/v1/urls/{shortCode}` | Retrieve URL details and expiration countdown | `200 OK` |
| `GET` | `/api/v1/urls/{shortCode}/analytics` | Retrieve click statistics | `200 OK` |
| `GET` | `/actuator/health` | Healthcheck for container orchestrators | `200 OK` |

---

## 6. Project Directory Layout

```
TinyURL/
├── docker-compose.yml              # Multi-container orchestration (App, Mongo, Redis, Gateway, UI)
├── ReadME.md                       # Project problem statement
├── Plan.md                         # Architecture and implementation design plan
├── api-gateway/                    # API Gateway (Nginx / Spring Cloud Gateway)
│   ├── Dockerfile
│   └── nginx.conf / application.yml
├── backend/                        # Java 21 & Spring Boot 3 Service
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/tinyurl/
│       │   ├── TinyUrlApplication.java
│       │   ├── config/             # RedisConfig, MongoConfig, VirtualThreadsConfig
│       │   ├── controller/         # UrlController, RedirectController, AnalyticsController
│       │   ├── dto/                # Request & Response DTOs
│       │   ├── exception/          # GlobalExceptionHandler, UrlExpiredException
│       │   ├── model/              # UrlEntity, ClickRecord
│       │   ├── repository/         # MongoUrlRepository
│       │   ├── service/            # UrlService, Base62Service, CacheService, AnalyticsService
│       │   └── util/               # Constants, ValidationUtils
│       └── main/resources/
│           └── application.yml
└── frontend/                       # ReactJS + Vite SPA
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── App.jsx
        ├── index.css
        ├── components/
        │   ├── Header.jsx
        │   ├── UrlShortenerForm.jsx
        │   ├── ResultCard.jsx
        │   ├── QrCodeDisplay.jsx
        │   └── AnalyticsView.jsx
        └── services/
            └── api.js
```

---

## 7. Phased Implementation Roadmap

### Phase 1: Environment & Infrastructure Setup
- Create `docker-compose.yml` configuring MongoDB with replica set/standalone storage, Redis cache, and networking.
- Set up project boilerplates for backend (Spring Boot 3 + Java 21) and frontend (React + Vite).

### Phase 2: Core URL Engine & Base62 Generation
- Implement Base62 encoding/decoding and unique ID counter generator.
- Implement MongoDB entity mapping with TTL index (`expiresAt`).
- Implement `POST /api/v1/urls` with input validation (RFC 3986 URL format, length limits, custom alias availability).

### Phase 3: High-Performance Redirection & Redis Caching
- Implement `GET /{shortCode}` redirect handler with HTTP 302.
- Configure Redis cache-aside pattern: Check Redis $\rightarrow$ if miss, query Mongo $\rightarrow$ populate Redis with 7-day TTL.
- Implement asynchronous click count incrementing via non-blocking events.

### Phase 4: Frontend Development
- Build a modern React UI featuring:
  - Long URL input with custom alias option.
  - One-click copy, QR code display, and 7-day expiration countdown badge.
  - Real-time click count and analytics view.

### Phase 5: API Gateway, Rate Limiting & Concurrency Testing
- Configure rate limiting to prevent spamming and abuse.
- Run load testing with `k6` or `wrk` targeting the redirect endpoint to benchmark throughput against the 40,000 concurrency requirement.
