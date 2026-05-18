# Solution — Practice 07

## Exercise 5 — DynamoDB single-table design

Pattern Rick Houlihan: 1 table, generic `PK`/`SK`.

| Entity | PK | SK | Attributes |
|--------|----|----|-----|
| User | `USER#u1` | `PROFILE` | name, email |
| User Order | `USER#u1` | `ORDER#2026-05-12#o100` | total, status |
| Order | `ORDER#o100` | `META` | userId, total, status |
| OrderItem | `ORDER#o100` | `ITEM#p1` | qty, price |
| Product | `PRODUCT#p1` | `META` | name, category, price |
| Product by category | `CAT#electronics` | `PRODUCT#p1` | name, price |

**Access patterns:**
- `getUserOrders(u1)` → Query `PK=USER#u1, SK begins_with ORDER#`.
- `getOrderItems(o100)` → Query `PK=ORDER#o100`.
- `getProductsByCategory(electronics)` → Query `PK=CAT#electronics`.
- `getOrdersByStatus(pending)` → cần **GSI**:
  - GSI1: `GSI1PK = STATUS#pending`, `GSI1SK = ORDER#timestamp`.

## Exercise 9 — Decision

1. **Banking ledger immutable** → **QLDB** (cryptographic verifiable, immutable).
2. **Real-time leaderboard 100k user** → **ElastiCache Redis** (ZSET sorted set, sub-ms).
3. **Social graph** → **Neptune** (Gremlin/SPARQL).
4. **IoT 1M sensor/s** → **Timestream** (time-series) hoặc **DynamoDB + Kinesis**.
5. **Multi-tenant SaaS multi-region active-active** → **DynamoDB Global Tables** (eventual consistent acceptable).
