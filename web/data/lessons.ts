import type { Lesson, Chapter, CourseId } from "@/lib/types";

// =====================================================================
// CLF-C02 — Full content available
// =====================================================================
const clfLessons: Lesson[] = [
  { slug: "01-cloud-concepts",       courseId: "CLF-C02", title: "Cloud Concepts",            shortTitle: "Cloud Concepts",       chapter: "clf-ch1", order: 1, available: true,
    description: "Cloud computing là gì, 6 lợi ích, IaaS/PaaS/SaaS, deployment models.",
    file: "clf-c02/01-cloud-concepts.md" },
  { slug: "02-shared-responsibility", courseId: "CLF-C02", title: "Shared Responsibility",     shortTitle: "Shared Responsibility", chapter: "clf-ch1", order: 2, available: true,
    description: "Security of vs in the cloud — AWS chịu gì, khách hàng chịu gì.",
    file: "clf-c02/02-shared-responsibility.md" },
  { slug: "03-iam",                   courseId: "CLF-C02", title: "IAM",                       shortTitle: "IAM",                   chapter: "clf-ch2", order: 3, available: true,
    description: "Users, groups, roles, policies, MFA, best practices.",
    file: "clf-c02/03-iam.md" },
  { slug: "04-ec2",                   courseId: "CLF-C02", title: "EC2",                       shortTitle: "EC2",                   chapter: "clf-ch3", order: 4, available: true,
    description: "Virtual machines: instance types, pricing, AMI, EBS, security groups.",
    file: "clf-c02/04-ec2.md" },
  { slug: "05-s3",                    courseId: "CLF-C02", title: "S3",                        shortTitle: "S3",                    chapter: "clf-ch4", order: 5, available: true,
    description: "Object storage, buckets, storage classes, lifecycle, versioning.",
    file: "clf-c02/05-s3.md" },
  { slug: "06-vpc",                   courseId: "CLF-C02", title: "VPC",                       shortTitle: "VPC",                   chapter: "clf-ch5", order: 6, available: true,
    description: "Subnets, route tables, IGW, NAT, security groups vs NACL.",
    file: "clf-c02/06-vpc.md" },
  { slug: "07-databases",             courseId: "CLF-C02", title: "Databases",                 shortTitle: "Databases",             chapter: "clf-ch6", order: 7, available: true,
    description: "RDS, DynamoDB, Aurora, ElastiCache — chọn DB phù hợp use case.",
    file: "clf-c02/07-databases.md" },
  { slug: "08-billing",               courseId: "CLF-C02", title: "Billing & Pricing",         shortTitle: "Billing",               chapter: "clf-ch7", order: 8, available: true,
    description: "Pricing models, AWS Budgets, Cost Explorer, Free Tier.",
    file: "clf-c02/08-billing.md" },
];

const clfChapters: Chapter[] = [
  { id: "clf-ch1", courseId: "CLF-C02", title: "Cloud Foundations",   lessonSlugs: ["01-cloud-concepts", "02-shared-responsibility"], category: "foundation" },
  { id: "clf-ch2", courseId: "CLF-C02", title: "Security & Identity", lessonSlugs: ["03-iam"],            category: "security" },
  { id: "clf-ch3", courseId: "CLF-C02", title: "Compute",             lessonSlugs: ["04-ec2"],            category: "compute" },
  { id: "clf-ch4", courseId: "CLF-C02", title: "Storage",             lessonSlugs: ["05-s3"],             category: "storage" },
  { id: "clf-ch5", courseId: "CLF-C02", title: "Networking",          lessonSlugs: ["06-vpc"],            category: "network" },
  { id: "clf-ch6", courseId: "CLF-C02", title: "Databases",           lessonSlugs: ["07-databases"],      category: "database" },
  { id: "clf-ch7", courseId: "CLF-C02", title: "Billing & Pricing",   lessonSlugs: ["08-billing"],        category: "billing" },
];

// =====================================================================
// SAA-C03 — Placeholder outline (Coming soon)
// =====================================================================
const saaLessons: Lesson[] = [
  { slug: "foundations-01-cap-theorem", courseId: "SAA-C03", title: "Định lý CAP & PACELC", shortTitle: "CAP Theorem", chapter: "saa-ch1", order: 1, available: true,
    description: "Distributed systems foundations: CAP, PACELC, map DynamoDB/Aurora/RDS vào CP/AP.",
    file: "foundations/01-cap-theorem.md" },
  { slug: "foundations-02-consistency-models", courseId: "SAA-C03", title: "Consistency Models", shortTitle: "Consistency", chapter: "saa-ch1", order: 2, available: true,
    description: "Strong / eventual / causal / read-your-writes — và mỗi AWS service rơi vào mức nào.",
    file: "foundations/02-consistency-models.md" },
  { slug: "foundations-03-replication-and-quorum", courseId: "SAA-C03", title: "Replication & Quorum", shortTitle: "Replication", chapter: "saa-ch1", order: 3, available: true,
    description: "Single-leader, multi-leader, quorum (W+R>N). Vì sao Aurora dùng 4/6, Raft/Paxos cơ bản.",
    file: "foundations/03-replication-and-quorum.md" },
  { slug: "foundations-04-latency-vs-consistency", courseId: "SAA-C03", title: "Latency vs Consistency", shortTitle: "Multi-Region", chapter: "saa-ch1", order: 4, available: true,
    description: "Vì sao Multi-Region khó: RTT vật lý, spectrum patterns, bẫy active-active.",
    file: "foundations/04-latency-vs-consistency.md" },
  { slug: "foundations-05-partitioning-and-sharding", courseId: "SAA-C03", title: "Partitioning & Sharding", shortTitle: "Partitioning", chapter: "saa-ch1", order: 5, available: true,
    description: "Range/hash/consistent hashing, DynamoDB partition key, hot partition, RDS sharding.",
    file: "foundations/05-partitioning-and-sharding.md" },
  { slug: "foundations-06-failure-modes", courseId: "SAA-C03", title: "Failure Modes & Cascading", shortTitle: "Failure Modes", chapter: "saa-ch1", order: 6, available: true,
    description: "Retry storm, thundering herd, circuit breaker, bulkhead, idempotency, chaos.",
    file: "foundations/06-failure-modes.md" },
  // Chapter 2 — Design High-Performing Architectures
  { slug: "ch2-01-compute-performance", courseId: "SAA-C03", title: "Compute Performance & Autoscaling", shortTitle: "Compute Perf", chapter: "saa-ch2", order: 7, available: true,
    description: "EC2 family, Lambda, Fargate, purchase options, autoscaling strategies, cold start.",
    file: "saa-c03/ch2-01-compute-performance.md" },
  { slug: "ch2-02-storage-performance", courseId: "SAA-C03", title: "Storage Performance", shortTitle: "Storage Perf", chapter: "saa-ch2", order: 8, available: true,
    description: "EBS gp3/io2, instance store, EFS, FSx Lustre, S3 throughput, lifecycle.",
    file: "saa-c03/ch2-02-storage-performance.md" },
  { slug: "ch2-03-database-performance", courseId: "SAA-C03", title: "Database Performance & Caching", shortTitle: "DB Perf", chapter: "saa-ch2", order: 9, available: true,
    description: "Aurora tuning, DynamoDB throughput, ElastiCache, DAX, RDS Proxy, cache patterns.",
    file: "saa-c03/ch2-03-database-performance.md" },
  { slug: "ch2-04-network-performance", courseId: "SAA-C03", title: "Network & Edge Performance", shortTitle: "Network Perf", chapter: "saa-ch2", order: 10, available: true,
    description: "CloudFront, Global Accelerator, VPC endpoints, Direct Connect, API Gateway.",
    file: "saa-c03/ch2-04-network-performance.md" },
  // Chapter 3 — Design Secure Architectures
  { slug: "ch3-01-iam-deep-dive", courseId: "SAA-C03", title: "IAM Deep Dive & Identity Federation", shortTitle: "IAM Deep", chapter: "saa-ch3", order: 11, available: true,
    description: "Policy evaluation, STS, federation (IdC, SAML, OIDC), Permission Boundary, SCP, ABAC.",
    file: "saa-c03/ch3-01-iam-deep-dive.md" },
  { slug: "ch3-02-network-security", courseId: "SAA-C03", title: "Network Security", shortTitle: "Net Security", chapter: "saa-ch3", order: 12, available: true,
    description: "SG vs NACL deep, WAF, Shield, Network Firewall, VPC endpoint security, defense in depth.",
    file: "saa-c03/ch3-02-network-security.md" },
  { slug: "ch3-03-data-protection", courseId: "SAA-C03", title: "Data Protection & Encryption", shortTitle: "Data Protection", chapter: "saa-ch3", order: 13, available: true,
    description: "KMS envelope encryption, CloudHSM, S3/EBS/RDS encryption, Secrets Manager, ACM.",
    file: "saa-c03/ch3-03-data-protection.md" },
  { slug: "ch3-04-detective-controls", courseId: "SAA-C03", title: "Detective Controls & Compliance", shortTitle: "Detective", chapter: "saa-ch3", order: 14, available: true,
    description: "CloudTrail, Config, GuardDuty, Inspector, Macie, Security Hub, Detective, incident response.",
    file: "saa-c03/ch3-04-detective-controls.md" },
  // Chapter 4 — Design Cost-Optimized Architectures
  { slug: "ch4-01-compute-cost", courseId: "SAA-C03", title: "Compute Cost Optimization", shortTitle: "Compute Cost", chapter: "saa-ch4", order: 15, available: true,
    description: "Savings Plan vs RI vs Spot, right-sizing, Graviton, serverless cost, container cost.",
    file: "saa-c03/ch4-01-compute-cost.md" },
  { slug: "ch4-02-storage-cost", courseId: "SAA-C03", title: "Storage Cost Optimization", shortTitle: "Storage Cost", chapter: "saa-ch4", order: 16, available: true,
    description: "S3 storage classes, lifecycle, Intelligent-Tiering, EBS snapshot, Glacier, EFS cost.",
    file: "saa-c03/ch4-02-storage-cost.md" },
  { slug: "ch4-03-db-network-cost", courseId: "SAA-C03", title: "Database & Network Cost", shortTitle: "DB & Net Cost", chapter: "saa-ch4", order: 17, available: true,
    description: "RDS/Aurora/DynamoDB cost, data transfer trap, CloudWatch cost, NAT/CloudFront optimization.",
    file: "saa-c03/ch4-03-db-network-cost.md" },
  { slug: "ch4-04-cost-visibility", courseId: "SAA-C03", title: "Cost Visibility & Governance", shortTitle: "Cost Visibility", chapter: "saa-ch4", order: 18, available: true,
    description: "Cost Explorer, Budgets, Anomaly Detection, CUR, tagging, SCP guardrail, FinOps basics.",
    file: "saa-c03/ch4-04-cost-visibility.md" },
];

const saaChapters: Chapter[] = [
  { id: "saa-ch1", courseId: "SAA-C03", title: "Design Resilient Architectures", lessonSlugs: ["foundations-01-cap-theorem", "foundations-02-consistency-models", "foundations-03-replication-and-quorum", "foundations-04-latency-vs-consistency", "foundations-05-partitioning-and-sharding", "foundations-06-failure-modes"], category: "foundation" },
  { id: "saa-ch2", courseId: "SAA-C03", title: "Design High-Performing Architectures", lessonSlugs: ["ch2-01-compute-performance", "ch2-02-storage-performance", "ch2-03-database-performance", "ch2-04-network-performance"], category: "compute" },
  { id: "saa-ch3", courseId: "SAA-C03", title: "Design Secure Architectures", lessonSlugs: ["ch3-01-iam-deep-dive", "ch3-02-network-security", "ch3-03-data-protection", "ch3-04-detective-controls"], category: "security" },
  { id: "saa-ch4", courseId: "SAA-C03", title: "Design Cost-Optimized Architectures", lessonSlugs: ["ch4-01-compute-cost", "ch4-02-storage-cost", "ch4-03-db-network-cost", "ch4-04-cost-visibility"], category: "billing" },
];

const dvaChapters: Chapter[] = [
  { id: "dva-ch1", courseId: "DVA-C02", title: "Development with AWS Services", lessonSlugs: [], category: "compute" },
  { id: "dva-ch2", courseId: "DVA-C02", title: "Security",                       lessonSlugs: [], category: "security" },
  { id: "dva-ch3", courseId: "DVA-C02", title: "Deployment",                     lessonSlugs: [], category: "foundation" },
  { id: "dva-ch4", courseId: "DVA-C02", title: "Troubleshooting & Optimization", lessonSlugs: [], category: "billing" },
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
export const lessons: Lesson[] = [...clfLessons, ...saaLessons];
export const chapters: Chapter[] = [...clfChapters, ...saaChapters, ...dvaChapters, ...soaChapters, ...sapChapters];

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
