import type { Lesson, Chapter, CourseId } from "@/lib/types";

// =====================================================================
// FOUNDATIONS — Nền tảng Cloud & Hệ phân tán (knowledge track, không thi)
// =====================================================================
const foundLessons: Lesson[] = [
  // Chương 1 — Nhập môn Cloud
  { slug: "intro-01-virtualization", courseId: "FOUNDATIONS", title: "Từ máy chủ vật lý đến ảo hoá & container", shortTitle: "Ảo hoá & Container", chapter: "found-ch1", order: 1, available: true,
    description: "Datacenter, hypervisor, VM vs container, Docker, orchestration, serverless — và map sang EC2/ECS/Lambda.", file: "foundations/intro-01-virtualization.md" },
  { slug: "intro-02-networking", courseId: "FOUNDATIONS", title: "Mạng cơ bản cho Cloud", shortTitle: "Networking 101", chapter: "found-ch1", order: 2, available: true,
    description: "IP/CIDR, DNS, HTTP/TLS, firewall stateful vs stateless, load balancer L4/L7, CDN.", file: "foundations/intro-02-networking.md" },
  { slug: "intro-03-cloud-101", courseId: "FOUNDATIONS", title: "Cloud Computing 101", shortTitle: "Cloud 101", chapter: "found-ch1", order: 3, available: true,
    description: "IaaS/PaaS/SaaS, region & AZ, elasticity, pay-as-you-go, shared responsibility, multi-tenancy.", file: "foundations/intro-03-cloud-101.md" },
  { slug: "intro-04-storage-db", courseId: "FOUNDATIONS", title: "Lưu trữ & Cơ sở dữ liệu 101", shortTitle: "Storage & DB 101", chapter: "found-ch1", order: 4, available: true,
    description: "Block vs file vs object, durability, SQL vs NoSQL, index, cache, backup vs snapshot.", file: "foundations/intro-04-storage-db.md" },
  // Chương 2 — Thiết kế hệ thống
  { slug: "design-01-scaling", courseId: "FOUNDATIONS", title: "Scaling & Stateless Design", shortTitle: "Scaling", chapter: "found-ch2", order: 5, available: true,
    description: "Vertical vs horizontal, stateless tier, caching layers, read replicas, auto scaling.", file: "foundations/design-01-scaling.md" },
  { slug: "design-02-ha", courseId: "FOUNDATIONS", title: "High Availability & Redundancy", shortTitle: "HA & Redundancy", chapter: "found-ch2", order: 6, available: true,
    description: "SPOF, active-passive vs active-active, health check, nines, RTO/RPO nhập môn.", file: "foundations/design-02-ha.md" },
  { slug: "design-03-messaging", courseId: "FOUNDATIONS", title: "Async & Messaging Patterns", shortTitle: "Messaging", chapter: "found-ch2", order: 7, available: true,
    description: "Queue vs pub/sub, event-driven, backpressure, idempotency, ordering.", file: "foundations/design-03-messaging.md" },
  { slug: "design-04-observability", courseId: "FOUNDATIONS", title: "Observability cơ bản", shortTitle: "Observability", chapter: "found-ch2", order: 8, available: true,
    description: "Logs/metrics/traces, percentile, alerting, SLI/SLO/SLA.", file: "foundations/design-04-observability.md" },
  // Chương 3 — Hệ phân tán (advanced)
  { slug: "foundations-01-cap-theorem", courseId: "FOUNDATIONS", title: "Định lý CAP & PACELC", shortTitle: "CAP Theorem", chapter: "found-ch3", order: 9, available: true,
    description: "CAP, PACELC, map DynamoDB/Aurora/RDS vào CP/AP.", file: "foundations/01-cap-theorem.md" },
  { slug: "foundations-02-consistency-models", courseId: "FOUNDATIONS", title: "Consistency Models", shortTitle: "Consistency", chapter: "found-ch3", order: 10, available: true,
    description: "Strong / eventual / causal / read-your-writes — và mỗi AWS service rơi vào mức nào.", file: "foundations/02-consistency-models.md" },
  { slug: "foundations-03-replication-and-quorum", courseId: "FOUNDATIONS", title: "Replication & Quorum", shortTitle: "Replication", chapter: "found-ch3", order: 11, available: true,
    description: "Single-leader, multi-leader, quorum (W+R>N). Vì sao Aurora dùng 4/6, Raft/Paxos cơ bản.", file: "foundations/03-replication-and-quorum.md" },
  { slug: "foundations-04-latency-vs-consistency", courseId: "FOUNDATIONS", title: "Latency vs Consistency", shortTitle: "Multi-Region", chapter: "found-ch3", order: 12, available: true,
    description: "Vì sao Multi-Region khó: RTT vật lý, spectrum patterns, bẫy active-active.", file: "foundations/04-latency-vs-consistency.md" },
  { slug: "foundations-05-partitioning-and-sharding", courseId: "FOUNDATIONS", title: "Partitioning & Sharding", shortTitle: "Partitioning", chapter: "found-ch3", order: 13, available: true,
    description: "Range/hash/consistent hashing, DynamoDB partition key, hot partition, RDS sharding.", file: "foundations/05-partitioning-and-sharding.md" },
  { slug: "foundations-06-failure-modes", courseId: "FOUNDATIONS", title: "Failure Modes & Cascading", shortTitle: "Failure Modes", chapter: "found-ch3", order: 14, available: true,
    description: "Retry storm, thundering herd, circuit breaker, bulkhead, idempotency, chaos.", file: "foundations/06-failure-modes.md" },
  // Phụ lục
  { slug: "appendix-aws-vs-gcp", courseId: "FOUNDATIONS", title: "AWS ↔ GCP — Bảng đối chiếu", shortTitle: "AWS vs GCP", chapter: "found-ch4", order: 15, available: true,
    description: "Map service AWS sang GCP cho người đã quen GCP — kèm các điểm khác căn bản.", file: "foundations/aws-vs-gcp.md" },
];

const foundChapters: Chapter[] = [
  { id: "found-ch1", courseId: "FOUNDATIONS", title: "Chương 1 — Nhập môn Cloud", lessonSlugs: ["intro-01-virtualization", "intro-02-networking", "intro-03-cloud-101", "intro-04-storage-db"], category: "foundation" },
  { id: "found-ch2", courseId: "FOUNDATIONS", title: "Chương 2 — Thiết kế hệ thống", lessonSlugs: ["design-01-scaling", "design-02-ha", "design-03-messaging", "design-04-observability"], category: "compute" },
  { id: "found-ch3", courseId: "FOUNDATIONS", title: "Chương 3 — Hệ phân tán (nâng cao)", lessonSlugs: ["foundations-01-cap-theorem", "foundations-02-consistency-models", "foundations-03-replication-and-quorum", "foundations-04-latency-vs-consistency", "foundations-05-partitioning-and-sharding", "foundations-06-failure-modes"], category: "database" },
  { id: "found-ch4", courseId: "FOUNDATIONS", title: "Phụ lục", lessonSlugs: ["appendix-aws-vs-gcp"], category: "foundation" },
];


// =====================================================================
// ENGINEER — Kỹ năng nền Kỹ sư Cloud (knowledge track, không thi)
// =====================================================================
const engLessons: Lesson[] = [
  { slug: "eng-01-linux-terminal", courseId: "ENGINEER", title: "Linux & Terminal cho kỹ sư Cloud", shortTitle: "Linux & Terminal", chapter: "eng-ch1", order: 1, available: true,
    description: "Filesystem, permissions, process, systemd, SSH, log & grep/awk, Bash scripting căn bản.", file: "engineering/eng-01-linux-terminal.md" },
  { slug: "eng-02-cidr-subnetting", courseId: "ENGINEER", title: "CIDR & Subnetting thực hành", shortTitle: "CIDR & Subnetting", chapter: "eng-ch2", order: 2, available: true,
    description: "Tính network/broadcast/hosts bằng tay, chia subnet VPC, overlap, longest-prefix match, IPv6 cơ bản.", file: "engineering/eng-02-cidr-subnetting.md" },
  { slug: "eng-03-tcp-tls", courseId: "ENGINEER", title: "TCP/UDP & TLS — HTTPS thật sự hoạt động thế nào", shortTitle: "TCP & TLS", chapter: "eng-ch2", order: 3, available: true,
    description: "TCP vs UDP, HTTP/1.1→/3 (QUIC), TLS 1.3 handshake, certificate chain, SNI, mTLS, debug bằng curl/openssl.", file: "engineering/eng-03-tcp-tls.md" },
  { slug: "eng-04-identity-crypto", courseId: "ENGINEER", title: "Mật mã & Danh tính hiện đại", shortTitle: "Identity & Crypto", chapter: "eng-ch3", order: 4, available: true,
    description: "AES/RSA, hashing, PKI; OAuth 2.1 (Auth Code + PKCE), OIDC, JWT đúng cách, SAML, passkeys/WebAuthn.", file: "engineering/eng-04-identity-crypto.md" },
  { slug: "eng-05-docker", courseId: "ENGINEER", title: "Docker thực hành cho kỹ sư Cloud", shortTitle: "Docker", chapter: "eng-ch4", order: 5, available: true,
    description: "Dockerfile, layer & cache, multi-stage build, compose (LocalStack), healthcheck, best practices bảo mật image.", file: "engineering/eng-05-docker.md" },
  { slug: "eng-06-automation", courseId: "ENGINEER", title: "Scripting & Automation: Bash + Python boto3", shortTitle: "Automation", chapter: "eng-ch4", order: 6, available: true,
    description: "Bash nâng cao (set -euo pipefail, jq), AWS CLI --query, Python boto3 (paginator, waiter), cron vs EventBridge.", file: "engineering/eng-06-automation.md" },
];


const engChapters: Chapter[] = [
  { id: "eng-ch1", courseId: "ENGINEER", title: "Hệ điều hành & Terminal", lessonSlugs: ["eng-01-linux-terminal"], category: "compute" },
  { id: "eng-ch2", courseId: "ENGINEER", title: "Mạng thực hành", lessonSlugs: ["eng-02-cidr-subnetting", "eng-03-tcp-tls"], category: "network" },
  { id: "eng-ch3", courseId: "ENGINEER", title: "Mật mã & Danh tính", lessonSlugs: ["eng-04-identity-crypto"], category: "security" },
  { id: "eng-ch4", courseId: "ENGINEER", title: "Container & Tự động hoá", lessonSlugs: ["eng-05-docker", "eng-06-automation"], category: "compute" },
];

// SYSTEM-DESIGN — outline (coming soon)
const sysdChapters: Chapter[] = [
  { id: "sysd-ch1", courseId: "SYSTEM-DESIGN", title: "Tư duy thiết kế & Trade-off Analysis", lessonSlugs: [], category: "foundation" },
  { id: "sysd-ch2", courseId: "SYSTEM-DESIGN", title: "Case Studies: Scale thực tế", lessonSlugs: [], category: "compute" },
  { id: "sysd-ch3", courseId: "SYSTEM-DESIGN", title: "Cost-aware & Multi-account Architecture", lessonSlugs: [], category: "billing" },
  { id: "sysd-ch4", courseId: "SYSTEM-DESIGN", title: "Build vs Buy & Technology Strategy", lessonSlugs: [], category: "security" },
];


// =====================================================================
// BACKEND — Backend Engineering (knowledge track, không thi)
// =====================================================================
const beLessons: Lesson[] = [
  { slug: "be-01-api-design", courseId: "BACKEND", title: "API Design: REST, gRPC, GraphQL & Webhooks", shortTitle: "API Design", chapter: "be-ch1", order: 1, available: true,
    description: "REST đúng nghĩa, pagination, versioning, idempotency key, rate limit, gRPC vs GraphQL, webhooks, OpenAPI.", file: "backend/be-01-api-design.md" },
  { slug: "be-02-database-engineering", courseId: "BACKEND", title: "Database Engineering: Index, Transaction & Migration", shortTitle: "Database Eng", chapter: "be-ch1", order: 2, available: true,
    description: "B-tree index, composite/covering, EXPLAIN, isolation levels, deadlock, optimistic locking, migration expand-contract.", file: "backend/be-02-database-engineering.md" },
  { slug: "be-03-caching", courseId: "BACKEND", title: "Caching Patterns trong thực tế", shortTitle: "Caching", chapter: "be-ch1", order: 3, available: true,
    description: "Cache-aside/write-through, invalidation, stampede, hot key, negative caching, hit ratio.", file: "backend/be-03-caching.md" },
  { slug: "be-04-async-jobs", courseId: "BACKEND", title: "Async Processing & Background Jobs", shortTitle: "Async & Jobs", chapter: "be-ch2", order: 4, available: true,
    description: "Queue worker, at-least-once → idempotent consumer, outbox pattern, saga, DLQ, backpressure.", file: "backend/be-04-async-jobs.md" },
  { slug: "be-07-resilience-code", courseId: "BACKEND", title: "Resilience trong code: Timeout, Retry, Circuit Breaker", shortTitle: "Resilience", chapter: "be-ch2", order: 5, available: true,
    description: "Timeout budget, retry đúng cách, retry storm, circuit breaker, bulkhead, load shedding.", file: "backend/be-07-resilience-code.md" },
  { slug: "be-05-testing", courseId: "BACKEND", title: "Testing Strategy cho Backend", shortTitle: "Testing", chapter: "be-ch3", order: 6, available: true,
    description: "Test pyramid, mock ở ranh giới, integration với testcontainers/LocalStack, contract testing, flaky tests.", file: "backend/be-05-testing.md" },
  { slug: "be-06-twelve-factor", courseId: "BACKEND", title: "12-Factor App & Configuration hiện đại", shortTitle: "12-Factor", chapter: "be-ch3", order: 7, available: true,
    description: "Config qua env, secrets manager, graceful shutdown, liveness vs readiness, feature flags.", file: "backend/be-06-twelve-factor.md" },
  { slug: "be-08-performance", courseId: "BACKEND", title: "Performance & Profiling", shortTitle: "Performance", chapter: "be-ch3", order: 8, available: true,
    description: "p50/p95/p99, profiling, N+1, connection pool sizing, benchmark đúng cách, tail latency.", file: "backend/be-08-performance.md" },
];

const beChapters: Chapter[] = [
  { id: "be-ch1", courseId: "BACKEND", title: "API & Dữ liệu", lessonSlugs: ["be-01-api-design", "be-02-database-engineering", "be-03-caching"], category: "database" },
  { id: "be-ch2", courseId: "BACKEND", title: "Bất đồng bộ & Resilience", lessonSlugs: ["be-04-async-jobs", "be-07-resilience-code"], category: "network" },
  { id: "be-ch3", courseId: "BACKEND", title: "Chất lượng & Vận hành code", lessonSlugs: ["be-05-testing", "be-06-twelve-factor", "be-08-performance"], category: "foundation" },
];


// =====================================================================
// CLF-C02 — Full content available
// =====================================================================
const clfLessons: Lesson[] = [
  { slug: "01-cloud-concepts",       courseId: "CLF-C02", title: "Cloud Concepts",            shortTitle: "Cloud Concepts",       chapter: "clf-d1", order: 1, available: true,
    description: "Cloud computing là gì, 6 lợi ích, IaaS/PaaS/SaaS, deployment models.",
    file: "clf-c02/01-cloud-concepts.md" },
  { slug: "02-shared-responsibility", courseId: "CLF-C02", title: "Shared Responsibility",     shortTitle: "Shared Responsibility", chapter: "clf-d2", order: 4, available: true,
    description: "Security of vs in the cloud — AWS chịu gì, khách hàng chịu gì.",
    file: "clf-c02/02-shared-responsibility.md" },
  { slug: "03-iam",                   courseId: "CLF-C02", title: "IAM",                       shortTitle: "IAM",                   chapter: "clf-d2", order: 5, available: true,
    description: "Users, groups, roles, policies, MFA, best practices.",
    file: "clf-c02/03-iam.md" },
  { slug: "04-ec2",                   courseId: "CLF-C02", title: "EC2",                       shortTitle: "EC2",                   chapter: "clf-d3", order: 8, available: true,
    description: "Virtual machines: instance types, pricing, AMI, EBS, security groups.",
    file: "clf-c02/04-ec2.md" },
  { slug: "05-s3",                    courseId: "CLF-C02", title: "S3",                        shortTitle: "S3",                    chapter: "clf-d3", order: 9, available: true,
    description: "Object storage, buckets, storage classes, lifecycle, versioning.",
    file: "clf-c02/05-s3.md" },
  { slug: "06-vpc",                   courseId: "CLF-C02", title: "VPC",                       shortTitle: "VPC",                   chapter: "clf-d3", order: 10, available: true,
    description: "Subnets, route tables, IGW, NAT, security groups vs NACL.",
    file: "clf-c02/06-vpc.md" },
  { slug: "07-databases",             courseId: "CLF-C02", title: "Databases",                 shortTitle: "Databases",             chapter: "clf-d3", order: 11, available: true,
    description: "RDS, DynamoDB, Aurora, ElastiCache — chọn DB phù hợp use case.",
    file: "clf-c02/07-databases.md" },
  { slug: "08-billing",               courseId: "CLF-C02", title: "Billing & Pricing",         shortTitle: "Billing",               chapter: "clf-d4", order: 18, available: true,
    description: "Pricing models, AWS Budgets, Cost Explorer, Free Tier.",
    file: "clf-c02/08-billing.md" },
  { slug: "09-well-architected",      courseId: "CLF-C02", title: "Well-Architected Framework", shortTitle: "Well-Architected",     chapter: "clf-d1", order: 2, available: true,
    description: "6 pillar: Operational Excellence, Security, Reliability, Performance, Cost, Sustainability + WAF Tool.",
    file: "clf-c02/09-well-architected.md" },
  { slug: "10-migration-caf",         courseId: "CLF-C02", title: "Migration & Cloud Adoption Framework", shortTitle: "Migration & CAF", chapter: "clf-d1", order: 3, available: true,
    description: "CAF 6 perspectives, 7 R migration strategies, Snow Family, MGN, DMS, SCT, DRS, MAP.",
    file: "clf-c02/10-migration-caf.md" },
  { slug: "11-compute-extended",      courseId: "CLF-C02", title: "Compute Extended",          shortTitle: "Compute Extended",      chapter: "clf-d3", order: 12, available: true,
    description: "Containers (ECS/EKS/Fargate), Lambda, Beanstalk, Lightsail, Batch, Auto Scaling, ELB.",
    file: "clf-c02/11-compute-extended.md" },
  { slug: "12-storage-extended",      courseId: "CLF-C02", title: "Storage Extended",          shortTitle: "Storage Extended",      chapter: "clf-d3", order: 13, available: true,
    description: "EBS, Instance Store, EFS, FSx (Windows/Lustre/ONTAP/OpenZFS), Storage Gateway, Backup, DRS.",
    file: "clf-c02/12-storage-extended.md" },
  { slug: "13-deploy-iac",            courseId: "CLF-C02", title: "Deploy & IaC",              shortTitle: "Deploy & IaC",          chapter: "clf-d3", order: 14, available: true,
    description: "Console / CLI / SDK / CloudFormation / CDK / SAM, Systems Manager, deployment models, connectivity.",
    file: "clf-c02/13-deploy-iac.md" },
  { slug: "14-app-integration",       courseId: "CLF-C02", title: "Application Integration",   shortTitle: "App Integration",       chapter: "clf-d3", order: 15, available: true,
    description: "SNS, SQS, EventBridge, Step Functions, Amazon MQ — pattern decouple.",
    file: "clf-c02/14-app-integration.md" },
  { slug: "15-ai-ml",                 courseId: "CLF-C02", title: "AI/ML Services",            shortTitle: "AI/ML",                 chapter: "clf-d3", order: 16, available: true,
    description: "SageMaker, Bedrock, Rekognition, Polly, Transcribe, Translate, Comprehend, Lex, Kendra, Personalize.",
    file: "clf-c02/15-ai-ml.md" },
  { slug: "16-analytics",             courseId: "CLF-C02", title: "Analytics Services",        shortTitle: "Analytics",             chapter: "clf-d3", order: 17, available: true,
    description: "Athena, Redshift, EMR, Glue, Kinesis, MSK, OpenSearch, QuickSight, Data Exchange, Lake Formation.",
    file: "clf-c02/16-analytics.md" },
  { slug: "17-monitoring-governance", courseId: "CLF-C02", title: "Monitoring & Governance",   shortTitle: "Monitoring",            chapter: "clf-d2", order: 6, available: true,
    description: "CloudWatch, CloudTrail, Config, X-Ray, Trusted Advisor, Organizations, Control Tower, Service Catalog, Audit Manager.",
    file: "clf-c02/17-monitoring-governance.md" },
  { slug: "18-security-extended",     courseId: "CLF-C02", title: "Security Extended",         shortTitle: "Security Extended",     chapter: "clf-d2", order: 7, available: true,
    description: "KMS, CloudHSM, Secrets Manager, ACM, Cognito, Directory Service, WAF, Shield, GuardDuty, Inspector, Macie, Detective, Security Hub, RAM, Artifact.",
    file: "clf-c02/18-security-extended.md" },
  { slug: "19-other-services",        courseId: "CLF-C02", title: "Other Services & Support",  shortTitle: "Other Services",        chapter: "clf-d4", order: 19, available: true,
    description: "Dev Tools (Code*), WorkSpaces, AppStream, IoT Core/Greengrass, Amplify, AppSync, SES, Connect, Marketplace, Partner Network.",
    file: "clf-c02/19-other-services.md" },
];

const clfChapters: Chapter[] = [
  { id: "clf-d1", courseId: "CLF-C02", title: "Domain 1 — Cloud Concepts (24%)",            lessonSlugs: ["01-cloud-concepts", "09-well-architected", "10-migration-caf"], category: "foundation" },
  { id: "clf-d2", courseId: "CLF-C02", title: "Domain 2 — Security & Compliance (30%)",      lessonSlugs: ["02-shared-responsibility", "03-iam", "17-monitoring-governance", "18-security-extended"], category: "security" },
  { id: "clf-d3", courseId: "CLF-C02", title: "Domain 3 — Cloud Technology & Services (34%)", lessonSlugs: ["04-ec2", "05-s3", "06-vpc", "07-databases", "11-compute-extended", "12-storage-extended", "13-deploy-iac", "14-app-integration", "15-ai-ml", "16-analytics"], category: "compute" },
  { id: "clf-d4", courseId: "CLF-C02", title: "Domain 4 — Billing, Pricing & Support (12%)", lessonSlugs: ["08-billing", "19-other-services"], category: "billing" },
];

// =====================================================================
// SAA-C03 — Placeholder outline (Coming soon)
// =====================================================================
const saaLessons: Lesson[] = [
  // Domain 2 — Design Resilient Architectures (26%)
  { slug: "resilient-01-decoupling", courseId: "SAA-C03", title: "Decoupling & Loosely Coupled", shortTitle: "Decoupling", chapter: "saa-ch-res", order: 5, available: true,
    description: "SQS, SNS, EventBridge, queue-based load leveling, stateless — thiết kế tách rời, chống lỗi lan.",
    file: "saa-c03/resilient-01-decoupling.md" },
  { slug: "resilient-02-ha-fault-tolerance", courseId: "SAA-C03", title: "High Availability & Fault Tolerance", shortTitle: "HA & FT", chapter: "saa-ch-res", order: 6, available: true,
    description: "Multi-AZ, ELB, Route 53 failover/health checks, Auto Scaling cho HA, phân biệt HA vs fault tolerance.",
    file: "saa-c03/resilient-02-ha-fault-tolerance.md" },
  { slug: "resilient-03-dr-strategies", courseId: "SAA-C03", title: "Disaster Recovery Strategies", shortTitle: "DR Strategies", chapter: "saa-ch-res", order: 7, available: true,
    description: "Backup&Restore, Pilot Light, Warm Standby, Multi-Site theo RTO/RPO; Aurora Global, DynamoDB Global Tables, CRR.",
    file: "saa-c03/resilient-03-dr-strategies.md" },
  { slug: "resilient-04-scalability", courseId: "SAA-C03", title: "Designing for Scalability", shortTitle: "Scalability", chapter: "saa-ch-res", order: 8, available: true,
    description: "Auto Scaling policies, read replicas, caching (CloudFront/ElastiCache/DAX), hấp thụ traffic spike.",
    file: "saa-c03/resilient-04-scalability.md" },
  // Domain 3 — Design High-Performing Architectures (24%)
  { slug: "ch2-01-compute-performance", courseId: "SAA-C03", title: "Compute Performance & Autoscaling", shortTitle: "Compute Perf", chapter: "saa-ch2", order: 9, available: true,
    description: "EC2 family, Lambda, Fargate, purchase options, autoscaling strategies, cold start.",
    file: "saa-c03/ch2-01-compute-performance.md" },
  { slug: "ch2-02-storage-performance", courseId: "SAA-C03", title: "Storage Performance", shortTitle: "Storage Perf", chapter: "saa-ch2", order: 10, available: true,
    description: "EBS gp3/io2, instance store, EFS, FSx Lustre, S3 throughput, lifecycle.",
    file: "saa-c03/ch2-02-storage-performance.md" },
  { slug: "ch2-03-database-performance", courseId: "SAA-C03", title: "Database Performance & Caching", shortTitle: "DB Perf", chapter: "saa-ch2", order: 11, available: true,
    description: "Aurora tuning, DynamoDB throughput, ElastiCache, DAX, RDS Proxy, cache patterns.",
    file: "saa-c03/ch2-03-database-performance.md" },
  { slug: "ch2-04-network-performance", courseId: "SAA-C03", title: "Network & Edge Performance", shortTitle: "Network Perf", chapter: "saa-ch2", order: 12, available: true,
    description: "CloudFront, Global Accelerator, VPC endpoints, Direct Connect, API Gateway.",
    file: "saa-c03/ch2-04-network-performance.md" },
  // Domain 1 — Design Secure Architectures (30%)
  { slug: "ch3-01-iam-deep-dive", courseId: "SAA-C03", title: "IAM Deep Dive & Identity Federation", shortTitle: "IAM Deep", chapter: "saa-ch3", order: 1, available: true,
    description: "Policy evaluation, STS, federation (IdC, SAML, OIDC), Permission Boundary, SCP, ABAC.",
    file: "saa-c03/ch3-01-iam-deep-dive.md" },
  { slug: "ch3-02-network-security", courseId: "SAA-C03", title: "Network Security", shortTitle: "Net Security", chapter: "saa-ch3", order: 2, available: true,
    description: "SG vs NACL deep, WAF, Shield, Network Firewall, VPC endpoint security, defense in depth.",
    file: "saa-c03/ch3-02-network-security.md" },
  { slug: "ch3-03-data-protection", courseId: "SAA-C03", title: "Data Protection & Encryption", shortTitle: "Data Protection", chapter: "saa-ch3", order: 3, available: true,
    description: "KMS envelope encryption, CloudHSM, S3/EBS/RDS encryption, Secrets Manager, ACM.",
    file: "saa-c03/ch3-03-data-protection.md" },
  { slug: "ch3-04-detective-controls", courseId: "SAA-C03", title: "Detective Controls & Compliance", shortTitle: "Detective", chapter: "saa-ch3", order: 4, available: true,
    description: "CloudTrail, Config, GuardDuty, Inspector, Macie, Security Hub, Detective, incident response.",
    file: "saa-c03/ch3-04-detective-controls.md" },
  // Domain 4 — Design Cost-Optimized Architectures (20%)
  { slug: "ch4-01-compute-cost", courseId: "SAA-C03", title: "Compute Cost Optimization", shortTitle: "Compute Cost", chapter: "saa-ch4", order: 13, available: true,
    description: "Savings Plan vs RI vs Spot, right-sizing, Graviton, serverless cost, container cost.",
    file: "saa-c03/ch4-01-compute-cost.md" },
  { slug: "ch4-02-storage-cost", courseId: "SAA-C03", title: "Storage Cost Optimization", shortTitle: "Storage Cost", chapter: "saa-ch4", order: 14, available: true,
    description: "S3 storage classes, lifecycle, Intelligent-Tiering, EBS snapshot, Glacier, EFS cost.",
    file: "saa-c03/ch4-02-storage-cost.md" },
  { slug: "ch4-03-db-network-cost", courseId: "SAA-C03", title: "Database & Network Cost", shortTitle: "DB & Net Cost", chapter: "saa-ch4", order: 15, available: true,
    description: "RDS/Aurora/DynamoDB cost, data transfer trap, CloudWatch cost, NAT/CloudFront optimization.",
    file: "saa-c03/ch4-03-db-network-cost.md" },
  { slug: "ch4-04-cost-visibility", courseId: "SAA-C03", title: "Cost Visibility & Governance", shortTitle: "Cost Visibility", chapter: "saa-ch4", order: 16, available: true,
    description: "Cost Explorer, Budgets, Anomaly Detection, CUR, tagging, SCP guardrail, FinOps basics.",
    file: "saa-c03/ch4-04-cost-visibility.md" },
];

// Xếp theo trọng số blueprint SAA-C03: Secure 30% → Resilient 26% → High-Performing 24% → Cost 20%,
// foundations (lý thuyết hệ phân tán) để cuối làm phụ lục.
const saaChapters: Chapter[] = [
  { id: "saa-ch3", courseId: "SAA-C03", title: "Domain 1 — Design Secure Architectures (30%)", lessonSlugs: ["ch3-01-iam-deep-dive", "ch3-02-network-security", "ch3-03-data-protection", "ch3-04-detective-controls"], category: "security" },
  { id: "saa-ch-res", courseId: "SAA-C03", title: "Domain 2 — Design Resilient Architectures (26%)", lessonSlugs: ["resilient-01-decoupling", "resilient-02-ha-fault-tolerance", "resilient-03-dr-strategies", "resilient-04-scalability"], category: "network" },
  { id: "saa-ch2", courseId: "SAA-C03", title: "Domain 3 — Design High-Performing Architectures (24%)", lessonSlugs: ["ch2-01-compute-performance", "ch2-02-storage-performance", "ch2-03-database-performance", "ch2-04-network-performance"], category: "compute" },
  { id: "saa-ch4", courseId: "SAA-C03", title: "Domain 4 — Design Cost-Optimized Architectures (20%)", lessonSlugs: ["ch4-01-compute-cost", "ch4-02-storage-cost", "ch4-03-db-network-cost", "ch4-04-cost-visibility"], category: "billing" },
];

// DVA-C02 — Developer Associate. Chapters ordered by blueprint weight:
// D1 Development 32% / D2 Security 26% / D3 Deployment 24% / D4 Troubleshooting & Optimization 18%.
const dvaLessons: Lesson[] = [
  // Domain 1 — Development with AWS Services (32%)
  { slug: "dva-d1-01-sdk-api", courseId: "DVA-C02", title: "SDK, CLI & API Calls", shortTitle: "SDK & API", chapter: "dva-ch1", order: 1, available: true,
    description: "AWS SDK & CLI, programmatic access, pagination, retries/exponential backoff, error handling, credential chain.", file: "dva-c02/d1-01-sdk-api.md" },
  { slug: "dva-d1-02-lambda", courseId: "DVA-C02", title: "Developing AWS Lambda", shortTitle: "Lambda", chapter: "dva-ch1", order: 2, available: true,
    description: "Config (memory/timeout/concurrency/layers/extensions/env vars), VPC access, lifecycle, destinations/DLQ, cold start, tuning.", file: "dva-c02/d1-02-lambda.md" },
  { slug: "dva-d1-03-api-gateway", courseId: "DVA-C02", title: "Amazon API Gateway", shortTitle: "API Gateway", chapter: "dva-ch1", order: 3, available: true,
    description: "REST/HTTP/WebSocket, stages, integrations, request/response transform, validation, authorizers, throttling, caching.", file: "dva-c02/d1-03-api-gateway.md" },
  { slug: "dva-d1-04-dynamodb", courseId: "DVA-C02", title: "DynamoDB for Developers", shortTitle: "DynamoDB", chapter: "dva-ch1", order: 4, available: true,
    description: "Partition/sort keys, GSI/LSI, query vs scan, consistency, capacity modes, DAX, Streams, TTL, transactions.", file: "dva-c02/d1-04-dynamodb.md" },
  { slug: "dva-d1-05-app-integration", courseId: "DVA-C02", title: "App Integration & Messaging", shortTitle: "Integration", chapter: "dva-ch1", order: 5, available: true,
    description: "SQS, SNS, EventBridge, Step Functions, Kinesis, fan-out, event-driven & async patterns, Amazon Q Developer.", file: "dva-c02/d1-05-app-integration.md" },
  // Domain 2 — Security (26%)
  { slug: "dva-d2-01-auth", courseId: "DVA-C02", title: "Authentication & Authorization", shortTitle: "Auth", chapter: "dva-ch2", order: 6, available: true,
    description: "Cognito user/identity pools, JWT/bearer tokens, IAM roles, STS AssumeRole, federation, fine-grained access.", file: "dva-c02/d2-01-auth.md" },
  { slug: "dva-d2-02-encryption", courseId: "DVA-C02", title: "Encryption with KMS & ACM", shortTitle: "Encryption", chapter: "dva-ch2", order: 7, available: true,
    description: "KMS envelope encryption, at rest/in transit, client vs server-side, ACM, key rotation, cross-account keys.", file: "dva-c02/d2-02-encryption.md" },
  { slug: "dva-d2-03-secrets", courseId: "DVA-C02", title: "Secrets & Sensitive Data", shortTitle: "Secrets", chapter: "dva-ch2", order: 8, available: true,
    description: "Secrets Manager vs SSM Parameter Store, env var encryption, PII/PHI, masking & sanitization.", file: "dva-c02/d2-03-secrets.md" },
  // Domain 3 — Deployment (24%)
  { slug: "dva-d3-01-packaging-iac", courseId: "DVA-C02", title: "Packaging & IaC", shortTitle: "IaC", chapter: "dva-ch3", order: 9, available: true,
    description: "AWS SAM, CloudFormation, CDK, AppConfig, artifacts, Lambda layers, container images, dependency packaging.", file: "dva-c02/d3-01-packaging-iac.md" },
  { slug: "dva-d3-02-cicd", courseId: "DVA-C02", title: "CI/CD Pipeline", shortTitle: "CI/CD", chapter: "dva-ch3", order: 10, available: true,
    description: "CodePipeline, CodeBuild (buildspec), CodeDeploy (appspec), CodeArtifact, commit-triggered build/test/deploy.", file: "dva-c02/d3-02-cicd.md" },
  { slug: "dva-d3-03-deploy-strategies", courseId: "DVA-C02", title: "Deployment Strategies & Rollbacks", shortTitle: "Deploy Strategies", chapter: "dva-ch3", order: 11, available: true,
    description: "Blue/green, canary, rolling, Lambda versions/aliases, traffic shifting, rollbacks, API Gateway stage variables.", file: "dva-c02/d3-03-deploy-strategies.md" },
  { slug: "dva-d3-04-beanstalk", courseId: "DVA-C02", title: "Elastic Beanstalk & Environments", shortTitle: "Beanstalk", chapter: "dva-ch3", order: 12, available: true,
    description: "Elastic Beanstalk deployment policies (all-at-once, rolling, immutable), environments, .ebextensions.", file: "dva-c02/d3-04-beanstalk.md" },
  // Domain 4 — Troubleshooting & Optimization (18%)
  { slug: "dva-d4-01-observability", courseId: "DVA-C02", title: "Observability: CloudWatch", shortTitle: "Observability", chapter: "dva-ch4", order: 13, available: true,
    description: "CloudWatch Logs, metrics, alarms, EMF custom metrics, Logs Insights, dashboards, structured logging.", file: "dva-c02/d4-01-observability.md" },
  { slug: "dva-d4-02-xray", courseId: "DVA-C02", title: "Tracing with AWS X-Ray", shortTitle: "X-Ray", chapter: "dva-ch4", order: 14, available: true,
    description: "X-Ray segments/subsegments, annotations vs metadata, service map, SDK instrumentation, sampling.", file: "dva-c02/d4-02-xray.md" },
  { slug: "dva-d4-03-optimization", courseId: "DVA-C02", title: "Optimization & Caching", shortTitle: "Optimization", chapter: "dva-ch4", order: 15, available: true,
    description: "Lambda concurrency/performance, ElastiCache, DAX, API Gateway & CloudFront caching, resource optimization.", file: "dva-c02/d4-03-optimization.md" },
];

const dvaChapters: Chapter[] = [
  { id: "dva-ch1", courseId: "DVA-C02", title: "Domain 1 — Development with AWS Services (32%)", lessonSlugs: ["dva-d1-01-sdk-api", "dva-d1-02-lambda", "dva-d1-03-api-gateway", "dva-d1-04-dynamodb", "dva-d1-05-app-integration"], category: "compute" },
  { id: "dva-ch2", courseId: "DVA-C02", title: "Domain 2 — Security (26%)",                       lessonSlugs: ["dva-d2-01-auth", "dva-d2-02-encryption", "dva-d2-03-secrets"], category: "security" },
  { id: "dva-ch3", courseId: "DVA-C02", title: "Domain 3 — Deployment (24%)",                     lessonSlugs: ["dva-d3-01-packaging-iac", "dva-d3-02-cicd", "dva-d3-03-deploy-strategies", "dva-d3-04-beanstalk"], category: "foundation" },
  { id: "dva-ch4", courseId: "DVA-C02", title: "Domain 4 — Troubleshooting & Optimization (18%)", lessonSlugs: ["dva-d4-01-observability", "dva-d4-02-xray", "dva-d4-03-optimization"], category: "billing" },
];

const soaChapters: Chapter[] = [
  { id: "soa-ch1", courseId: "SOA-C02", title: "Monitoring, Logging & Remediation", lessonSlugs: [], category: "foundation" },
  { id: "soa-ch2", courseId: "SOA-C02", title: "Reliability & Business Continuity", lessonSlugs: [], category: "compute" },
  { id: "soa-ch3", courseId: "SOA-C02", title: "Deployment, Provisioning & Automation", lessonSlugs: [], category: "network" },
  { id: "soa-ch4", courseId: "SOA-C02", title: "Security & Compliance",              lessonSlugs: [], category: "security" },
  { id: "soa-ch5", courseId: "SOA-C02", title: "Networking & Content Delivery",      lessonSlugs: [], category: "network" },
  { id: "soa-ch6", courseId: "SOA-C02", title: "Cost & Performance Optimization",    lessonSlugs: [], category: "billing" },
];

const sapChapters: Chapter[] = [
  { id: "sap-ch1", courseId: "SAP-C02", title: "Design Solutions for Organizational Complexity", lessonSlugs: [], category: "foundation" },
  { id: "sap-ch2", courseId: "SAP-C02", title: "Design for New Solutions",                       lessonSlugs: [], category: "compute" },
  { id: "sap-ch3", courseId: "SAP-C02", title: "Continuous Improvement for Existing Solutions",  lessonSlugs: [], category: "billing" },
  { id: "sap-ch4", courseId: "SAP-C02", title: "Accelerate Workload Migration & Modernization",  lessonSlugs: [], category: "network" },
];

// =====================================================================
// Aggregate
// =====================================================================
export const lessons: Lesson[] = [...foundLessons, ...engLessons, ...beLessons, ...clfLessons, ...saaLessons, ...dvaLessons];
export const chapters: Chapter[] = [...foundChapters, ...engChapters, ...beChapters, ...clfChapters, ...saaChapters, ...dvaChapters, ...soaChapters, ...sapChapters, ...sysdChapters];

export function lessonsOfCourse(courseId: CourseId): Lesson[] {
  return lessons.filter((l) => l.courseId === courseId).sort((a, b) => a.order - b.order);
}

export function chaptersOfCourse(courseId: CourseId): Chapter[] {
  return chapters.filter((c) => c.courseId === courseId);
}

export function getLessonBySlug(courseId: CourseId, slug: string): Lesson | undefined {
  return lessons.find((l) => l.courseId === courseId && l.slug === slug);
}

export function getChapterById(id: string): Chapter | undefined {
  return chapters.find((c) => c.id === id);
}
