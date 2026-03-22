# Voting Backend System

A robust, highly concurrent voting backend designed with Node.js, Express, Drizzle ORM (PostgreSQL), Redis, RabbitMQ, and Socket.io.

## 🏗 System Architecture

This project is built around decoupling the user-facing API from vote processing constraints.

### 1. API Server (`app.ts`)
- **WebSockets**: Utilizes Socket.io rooms named exactly `poll:{pollId}` (e.g., `poll:42`). Users emit `join-poll` to silently subscribe to updates.
- **Vote Intake**: `POST /polls/:id/vote` validates requests (verifying closed status & duplicates mapped locally), generates a universally unique `voteId`, guarantees options exist, and fires the payload into RabbitMQ (`votes.incoming`). It returns a non-blocking `202 Accepted`.
- **Cache-Aside Reads**: `GET /polls/getPoll/:id` performs a cache-aside Redis operation. Every request checks `EXISTS poll:{pollId}`. High traffic polls immediately return cached hash structures (`HGETALL`). Cache misses seamlessly aggregate data sequentially via PostgreSQL, generating the Redis footprint (`HSET`) dynamically.

### 2. Background Worker (`src/worker.ts`)
- Runs as an entirely distinct process.
- Consumes from RabbitMQ sequentially.
- Inserts robustly into PostgreSQL via Drizzle.
- Uses `HINCRBY` to monotonically increment live vote totals resting inside Redis caches.
- Utilizes `HGETALL` to scrape full totals mapped against standard SQL `option` maps locally.
- Notifies the main API via an authenticated internal HTTP interface (`POST /internal/broadcast`) to dispatch WebSocket syncs out to browsers without direct WebSocket connections explicitly attached to the worker.

## 🚦 Internal Mechanisms

- **Broadcasting Internally**: `POST /internal/broadcast` securely funnels background worker processing to Socket.io adapters. The route checks a strict payload signature verified via `process.env.INTERNAL_SECRET`.
- **Reliable Networking (RabbitMQ)**: In the case of DB downtime, message NACKs (`channel.nack(msg, false, true)`) loop dynamically indefinitely pending PostgreSQL restoration. Unique Constraint violations (duplicate votes) trigger immediate ACK dismissals silently preventing deadlock.
- **Cache Invalidation**: On poll closure (`POST /updatePoolStatus/:id` closed condition), Redis executes a `DEL poll:{id}` discarding the state, and WebSockets propagate `poll-closed` allowing end consumers to lock visual interfaces securely. Modifying (`DELETE`) inherently cascade-deletes underlying traces automatically.

## 🚀 Running Locally

You'll need `PostgreSQL`, `RabbitMQ`, and `Redis` instances running respectively.

1. **Clone & Install packages**
```bash
pnpm install
```

2. **Migrate existing Database**
```bash
npx drizzle-kit push
```

3. **Provide Environment Setup** (`.env` file)
```env
APP_PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://localhost
INTERNAL_SECRET=your_super_secret_internal_key
```

4. **Boot Up Server**
```bash
npm run dev
```

5. **Start Background Worker**
Start your worker completely separated using watch mode!
```bash
npm run worker
```
