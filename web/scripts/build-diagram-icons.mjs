#!/usr/bin/env node
// Build web/data/diagramIcons.json: the icon symbols lesson diagrams reference
// with <use href="#aws-lambda" .../>. The lesson page injects only the symbols
// a lesson uses (lib/diagramIcons.ts), so this file's size never reaches the browser.
//
//   node scripts/build-diagram-icons.mjs <unzipped AWS Architecture Icons package>
//
// Package: https://aws.amazon.com/architecture/icons/ (AWS allows the icons in
// architecture diagrams; we do not alter their shapes). Neutral "ic-*" icons come
// from lucide-react (ISC) and use currentColor, so they follow the theme.

import fs from "node:fs";
import path from "node:path";

const pkg = process.argv[2];
if (!pkg) {
  console.error("usage: build-diagram-icons.mjs <unzipped-aws-icon-package>");
  process.exit(1);
}
const here = path.dirname(new URL(import.meta.url).pathname);
const out = path.join(here, "../data/diagramIcons.json");

const find = (dir, re) => {
  const hits = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith("__")) hits.push(...find(p, re));
    else if (re.test(e.name)) hits.push(p);
  }
  return hits;
};
const top = (re) => {
  const d = fs.readdirSync(pkg).find((n) => re.test(n));
  if (!d) throw new Error(`missing ${re} in ${pkg}`);
  return path.join(pkg, d);
};

// Keep the drawing, drop XML noise. Symbols share one document, so ids that the
// icon references (gradients, masks) get the symbol id as prefix; the rest go.
function clean(svg, pfx) {
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1] ?? "0 0 64 64";
  let body = svg
    .replace(/<\?xml[^>]*>/, "")
    .replace(/^[\s\S]*?<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "")
    .replace(/<title>[\s\S]*?<\/title>/g, "")
    .replace(/<desc>[\s\S]*?<\/desc>/g, "")
    .replace(/xlink:href=/g, "href=");
  const used = new Set([...body.matchAll(/(?:url\(#|href="#)([^)"]+)/g)].map((m) => m[1]));
  body = body
    .replace(/\s(id)="([^"]*)"/g, (_, k, v) => (used.has(v) ? ` id="${pfx}-${slug(v)}"` : ""))
    .replace(/url\(#([^)]+)\)/g, (_, v) => `url(#${pfx}-${slug(v)})`)
    .replace(/href="#([^"]+)"/g, (_, v) => `href="#${pfx}-${slug(v)}"`)
    .replace(/\s(xmlns:xlink|xmlns)="[^"]*"/g, "")
    .replace(/<(rect|path|g|polygon|circle|ellipse|line|polyline|stop)([^>]*)><\/\1>/g, "<$1$2/>")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/(\d+\.\d{2})\d+/g, "$1") // 64-unit icons: 0.01 is invisible
    .trim();
  return { viewBox, body };
}

const slug = (s) =>
  s.toLowerCase().replace(/&/g, "and").replace(/^(amazon|aws)-/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const icons = {};
const add = (id, icon) => {
  if (icons[id]) throw new Error(`duplicate icon id ${id}`);
  icons[id] = icon;
};

// 1. Service icons (48 px set), all categories an AWS cert or system-design lesson may draw.
const SKIP_CATEGORIES = /Blockchain|Quantum|Satellite|Games|Media-Services|Customer-Enablement|Internet-of-Things/;
for (const f of find(top(/^Architecture-Service-Icons/), /_48\.svg$/)) {
  if (SKIP_CATEGORIES.test(f)) continue;
  const name = path.basename(f).replace(/^Arch_/, "").replace(/_48\.svg$/, "");
  if (/_Dark$/.test(name)) continue;
  const id = `aws-${slug(name.replace(/_Light$/, ""))}`;
  if (!icons[id]) add(id, clean(fs.readFileSync(f, "utf8"), id));
}

// 2. Group icons (VPC, subnet, region, ...): the label badge in a group's corner.
for (const f of find(top(/^Architecture-Group-Icons/), /_32\.svg$/)) {
  const name = path.basename(f).replace(/_32\.svg$/, "");
  const id = `aws-group-${slug(name)}`;
  add(id, clean(fs.readFileSync(f, "utf8"), id));
}

// 3. General resource icons (user, client, server, ...): recoloured to currentColor.
for (const f of find(top(/^Resource-Icons/), /^Res_.*_48_Light\.svg$/)) {
  if (!f.includes("General-Icons")) continue;
  const name = path.basename(f).replace(/^Res_/, "").replace(/_48_Light\.svg$/, "");
  const id = `aws-res-${slug(name)}`;
  const icon = clean(fs.readFileSync(f, "utf8"), id);
  icon.body = icon.body.replace(/(fill|stroke)="#[0-9a-f]{3,6}"/gi, '$1="currentColor"'); // monochrome glyphs
  add(id, icon);
}

// 3b. Networking resource icons that architecture diagrams draw as their own box
// (NAT gateway, internet gateway, ALB/NLB, ...). Kept in AWS colours.
const NET_RES = /^Res_(Amazon-VPC_(NAT-Gateway|Internet-Gateway|Endpoints|Router|VPN-Gateway|Customer-Gateway|Peering-Connection|Network-Access-Control-List|Flow-Logs)|Elastic-Load-Balancing_(Application|Network|Gateway)-Load-Balancer|Amazon-Route-53-Hosted-Zone|Amazon-CloudFront_Edge-Location)_48\.svg$/;
for (const f of find(top(/^Resource-Icons/), NET_RES)) {
  const name = path.basename(f).replace(/^Res_/, "").replace(/_48\.svg$/, "");
  const id = `aws-res-${slug(name)}`;
  add(id, clean(fs.readFileSync(f, "utf8"), id));
}

// Short names people actually type.
const aliases = {
  "aws-s3": "aws-simple-storage-service",
  "aws-s3-glacier": "aws-simple-storage-service-glacier",
  "aws-sqs": "aws-simple-queue-service",
  "aws-sns": "aws-simple-notification-service",
  "aws-ses": "aws-simple-email-service",
  "aws-ebs": "aws-elastic-block-store",
  "aws-ecs": "aws-elastic-container-service",
  "aws-eks": "aws-elastic-kubernetes-service",
  "aws-ecr": "aws-elastic-container-registry",
  "aws-vpc": "aws-virtual-private-cloud",
  "aws-elb": "aws-elastic-load-balancing",
  "aws-iam": "aws-identity-and-access-management",
  "aws-kms": "aws-key-management-service",
  "aws-acm": "aws-certificate-manager",
  "aws-msk": "aws-managed-streaming-for-apache-kafka",
  "aws-firehose": "aws-data-firehose",
  "aws-opensearch": "aws-opensearch-service",
  "aws-dms": "aws-database-migration-service",
  "aws-identity-center": "aws-iam-identity-center",
  "aws-flink": "aws-managed-service-for-apache-flink",
  "aws-mwaa": "aws-managed-workflows-for-apache-airflow",
  "aws-nat-gateway": "aws-res-vpc-nat-gateway",
  "aws-internet-gateway": "aws-res-vpc-internet-gateway",
  "aws-alb": "aws-res-elastic-load-balancing-application-load-balancer",
  "aws-nlb": "aws-res-elastic-load-balancing-network-load-balancer",
};
for (const [a, target] of Object.entries(aliases)) {
  if (!icons[target]) throw new Error(`alias ${a} -> missing ${target}`);
}

// 4. Neutral icons for vendor-free system design, from lucide (stroke icons).
const LUCIDE = [
  "user", "users", "monitor", "smartphone", "laptop", "globe", "server", "database", "hard-drive", "cpu",
  "memory-stick", "layers", "network", "router", "shield", "shield-check", "lock", "key-round", "fingerprint",
  "cloud", "container", "box", "boxes", "file", "file-text", "folder", "mail", "bell", "message-square",
  "activity", "gauge", "timer", "hourglass", "zap", "git-branch", "split", "shuffle", "list-ordered", "inbox",
  "archive", "search", "settings", "workflow", "radio-tower", "app-window", "code", "terminal", "cookie",
  "credit-card", "bar-chart-3", "refresh-cw", "repeat", "clock", "calendar", "trash-2", "ticket", "image",
  "video", "map-pin", "store", "building-2", "warehouse", "truck", "bot", "brain", "scale", "filter",
  "rss", "webhook", "plug", "power", "circle-check", "circle-x", "triangle-alert", "eye", "link",
];
const lucideDir = path.join(here, "../node_modules/lucide-react/dist/esm/icons");
for (const name of LUCIDE) {
  const file = path.join(lucideDir, `${name}.js`);
  if (!fs.existsSync(file)) throw new Error(`lucide icon ${name} not found`);
  let src = fs.readFileSync(file, "utf8").replace(/\s+/g, " ");
  const reexport = /export \{ default \} from '\.\/([\w-]+)\.js'/.exec(src);
  if (reexport) src = fs.readFileSync(path.join(lucideDir, `${reexport[1]}.js`), "utf8").replace(/\s+/g, " ");
  const nodes = [...src.matchAll(/\[ ?"(\w+)", \{([^}]*)\} ?\]/g)].map(([, tag, attrs]) => {
    const a = [...attrs.matchAll(/(\w+): "([^"]*)"/g)]
      .filter(([, k]) => k !== "key")
      .map(([, k, v]) => `${k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}="${v}"`);
    return `<${tag} ${a.join(" ")}/>`;
  });
  if (!nodes.length) throw new Error(`lucide icon ${name}: no nodes parsed`);
  add(`ic-${name}`, {
    viewBox: "0 0 24 24",
    body: `<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${nodes.join("")}</g>`,
  });
}

fs.writeFileSync(out, JSON.stringify({ aliases, icons }, null, 0) + "\n");
const kb = (fs.statSync(out).size / 1024).toFixed(0);
const count = (p) => Object.keys(icons).filter((k) => k.startsWith(p)).length;
console.log(
  `${Object.keys(icons).length} icons (${count("aws-res-")} res, ${count("aws-group-")} group, ${count("ic-")} neutral), ` +
    `${Object.keys(aliases).length} aliases, ${kb} KB -> ${path.relative(process.cwd(), out)}`,
);
