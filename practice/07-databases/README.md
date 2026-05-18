# Practice 07 — Databases

Liên kết bài: [lessons/07-databases.md](../../lessons/07-databases.md)

## Exercise 1 — RDS MySQL free tier (AWS thật)
```bash
cd practice/07-databases/aws-cli && ./create-rds.sh
```
Tạo `db.t3.micro` MySQL single-AZ (free tier), backup 7 ngày.

Verify từ EC2 cùng VPC: `mysql -h <endpoint> -u admin -p`.

## Exercise 2 — Snapshot + restore + PITR
```bash
./snapshot.sh
./restore-from-snapshot.sh
./restore-pitr.sh   # PITR đến 5 phút trước
```

## Exercise 3 — Read Replica + promote
```bash
./create-read-replica.sh
./promote-replica.sh
```

## Exercise 4 — DynamoDB CRUD + GSI (no-cost on-demand)
```bash
cd practice/07-databases/aws-cli && ./create-ddb.sh
./ddb-crud.sh
./ddb-add-gsi.sh
```

## Exercise 5 — DynamoDB single-table design (giấy)
E-commerce: User, Product, Order, OrderItem. Thiết kế single table:
- PK/SK pattern.
- GSI cho query "Order theo Status".
- Access pattern: getUserOrders, getOrderItems, getProductsByCategory.

→ [solution.md](solution.md)

## Exercise 6 — ElastiCache Redis (cost ~$0.02/h)
```bash
./create-redis.sh
# Test cache-aside pattern bằng app Node/Python:
# 1. GET key → miss → query RDS → SET key TTL 300
# 2. GET key → hit
```

## Exercise 7 — Athena query S3
1. Upload CSV order vào `s3://learn-athena/orders/`.
2. Athena CREATE EXTERNAL TABLE.
3. Query: top 10 product by revenue, group by month.
4. Convert CSV → Parquet (Glue ETL hoặc CTAS) → re-run query → so sánh cost.

## Exercise 8 — Migration với DMS (advanced)
- Source: PostgreSQL on EC2.
- Target: Aurora PostgreSQL.
- Mode: full load + CDC.
- Verify row count + lag.

## Exercise 9 — Decision exercise (giấy)
Cho 5 workload, chọn DB phù hợp + giải thích:
1. Banking ledger immutable.
2. Real-time leaderboard 100k user.
3. Social graph friend-of-friend.
4. IoT 1M sensor/s.
5. Multi-tenant SaaS với multi-region active-active eventual OK.

→ [solution.md](solution.md)

## Teardown ⚠️
```bash
./teardown.sh
```
RDS phải có `--skip-final-snapshot` mới delete được nhanh.
