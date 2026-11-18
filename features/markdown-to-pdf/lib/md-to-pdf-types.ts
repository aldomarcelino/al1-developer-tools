export type PageSize = "a4" | "letter" | "legal";
export type Orientation = "portrait" | "landscape";
export type MarginOption = "normal" | "compact" | "wide";
export type DocumentTheme = "modern" | "github" | "academic" | "minimal";

export interface DocumentSettings {
  title: string;
  pageSize: PageSize;
  orientation: Orientation;
  margin: MarginOption;
  theme: DocumentTheme;
  showPageNumbers: boolean;
  showHeader: boolean;
  headerText: string;
  fontSize: "small" | "medium" | "large";
}

export interface MarkdownStats {
  words: number;
  characters: number;
  charactersNoSpaces: number;
  lines: number;
  readingTimeMinutes: number;
}

export interface ConversionProgress {
  status: "idle" | "rendering" | "compiling" | "done" | "error";
  message: string;
  percent: number;
}

export const PAGE_SIZE_OPTIONS = [
  { value: "a4", label: "A4 (210 x 297 mm)" },
  { value: "letter", label: "Letter (8.5 x 11 in)" },
  { value: "legal", label: "Legal (8.5 x 14 in)" },
] as const;

export const ORIENTATION_OPTIONS = [
  { value: "portrait", label: "Portrait (Vertical)" },
  { value: "landscape", label: "Landscape (Horizontal)" },
] as const;

export const MARGIN_OPTIONS = [
  { value: "normal", label: "Normal (22 mm)" },
  { value: "compact", label: "Compact (14 mm)" },
  { value: "wide", label: "Wide (32 mm)" },
] as const;

export const THEME_OPTIONS = [
  { value: "modern", label: "Modern Clean" },
  { value: "github", label: "GitHub Standard" },
  { value: "academic", label: "Academic / Formal" },
  { value: "minimal", label: "Minimalist" },
] as const;

export const FONT_SIZE_OPTIONS = [
  { value: "small", label: "Small (10 pt)" },
  { value: "medium", label: "Medium (11 pt)" },
  { value: "large", label: "Large (12 pt)" },
] as const;

export const DEFAULT_SETTINGS: DocumentSettings = {
  title: "Document",
  pageSize: "a4",
  orientation: "portrait",
  margin: "normal",
  theme: "modern",
  showPageNumbers: true,
  showHeader: true,
  headerText: "",
  fontSize: "medium",
};

export const TEMPLATES = {
  documentation: `# Project Architecture & API Documentation

A modern technical specification document prepared with Ramupod.

> [!NOTE]
> This document is converted directly from Markdown into a high-fidelity PDF inside your browser. No data leaves your machine.

---

## 1. System Overview

The platform uses a client-side compilation architecture:

- **Parsing Layer**: GitHub Flavored Markdown (GFM) compiler.
- **Rendering Layer**: High-DPI canvas & vector print stylesheet.
- **Export Engine**: In-browser PDF generation via \`pdf-lib\`.

### Core Architecture Components

\`\`\`typescript
interface PipelineConfig {
  inputFormat: "markdown" | "gfm";
  outputFormat: "pdf";
  dimensions: { width: number; height: number };
  dpiScale: 2;
}

async function compileDocument(config: PipelineConfig): Promise<Uint8Array> {
  const parsed = await parseMarkdown(config);
  return generatePdf(parsed);
}
\`\`\`

---

## 2. API Endpoints & Payload Schema

| Endpoint | Method | Description | Status |
| :--- | :---: | :--- | :---: |
| \`/api/v1/health\` | \`GET\` | Service uptime check | \`200 OK\` |
| \`/api/v1/auth\` | \`POST\` | Issue scoped access token | \`201 Created\` |
| \`/api/v1/metrics\` | \`GET\` | Real-time usage statistics | \`200 OK\` |

---

## 3. Milestones & Task Progress

- [x] Establish design system and token variables
- [x] Build live split-screen editor and previewer
- [x] Implement multi-page slicing algorithm
- [ ] Add custom header watermark options

> [!TIP]
> Use the **Print to PDF** button for vector-quality text rendering, or **Download PDF** for an instant file download.
`,

  resume: `# Alex Morgan
**Senior Full-Stack Software Engineer**  
San Francisco, CA | alex.morgan@example.com | github.com/alexmorgan | linkedin.com/in/alexmorgan

---

## 💼 Professional Experience

### Staff Software Engineer — CloudScale Inc.
*2022 – Present | San Francisco, CA*
- Architected and delivered real-time analytics pipeline processing 50M+ events daily with sub-second latency.
- Mentored 8 junior and mid-level engineers, establishing team code quality standards and CI/CD best practices.
- Reduced cloud infrastructure costs by 32% through optimized memory allocation and container bin-packing.

### Senior Frontend Engineer — WebFlow Labs
*2019 – 2022 | Austin, TX*
- Led frontend redesign of the core dashboard using Next.js, TypeScript, and Tailwind CSS.
- Improved Core Web Vitals across all metrics: LCP dropped from 3.8s to 1.1s, INP maintained under 80ms.
- Implemented accessible design system compliant with WCAG 2.1 AA standards.

---

## 🛠 Technical Skills

- **Languages**: TypeScript, JavaScript, Python, Go, SQL, HTML5/CSS3
- **Frameworks & Libraries**: React, Next.js, Node.js, Express, Tailwind CSS, TanStack Query
- **Databases & DevOps**: PostgreSQL, Redis, Docker, Kubernetes, AWS, GitHub Actions

---

## 🎓 Education

**Bachelor of Science in Computer Science**  
University of California, Berkeley | *2015 – 2019*  
*Magna Cum Laude, Dean's Honors List*
`,

  report: `# Quarterly Technology & Security Audit Report

**Prepared by**: Systems & Infrastructure Team  
**Date**: Fourth Quarter, 2026  
**Confidentiality**: Internal Distribution Only

---

## Executive Summary

During the final quarter of 2026, the technology infrastructure underwent comprehensive evaluation covering security compliance, application latency, and hardware utilization.

Key findings indicate an overall **99.98% uptime** across production clusters with zero critical vulnerabilities identified during third-party penetration testing.

---

## Performance Metrics Comparison

| Metric Tracked | Q3 Baseline | Q4 Result | Variance | Status |
| :--- | :---: | :---: | :---: | :---: |
| API P95 Latency | 142 ms | 88 ms | -38.0% | Exceeded |
| Database CPU Peak | 68% | 49% | -19.0% | Normal |
| Error Rate | 0.04% | 0.01% | -75.0% | Optimal |
| Cold Start Duration | 1.8s | 0.4s | -77.7% | Exceeded |

---

## Strategic Action Items

1. **Database Partitioning**: Transition older audit log tables to partitioned cold storage.
2. **Zero-Trust Network Access**: Finalize rollout of mutual TLS (mTLS) across microservices.
3. **Backup Recovery Drills**: Conduct bi-weekly automated failover tests for primary databases.
`,

  meeting: `# Executive Project Sync & Action Items

**Meeting Date**: November 18, 2026  
**Attendees**: Sarah Chen (PM), David Kim (Lead Arch), Maya Lin (Design), Liam Davis (DevOps)  
**Objective**: Review Sprint 44 Deliverables and Q1 Roadmap

---

## 📌 Agenda & Discussion Notes

### 1. Sprint 44 Retrospective
- All planned user stories completed on schedule.
- Performance audit demonstrated 40% reduction in client-side bundle size.
- User feedback indicated strong appreciation for browser-side local processing.

### 2. Technical Decisions
- **Decision A**: Adopt standard GFM specification across all markdown rendering pipelines.
- **Decision B**: Retain zero-server upload policy to ensure complete data sovereignty for users.

---

## 📋 Action Items Matrix

| Assignee | Task Description | Priority | Due Date |
| :--- | :--- | :---: | :--- |
| **David Kim** | Benchmark WebAssembly PDF compilation engine | High | Nov 25, 2026 |
| **Maya Lin** | Finalize high-contrast theme typography specs | Medium | Nov 27, 2026 |
| **Sarah Chen** | Draft Q1 product release notes and user guide | High | Dec 02, 2026 |
| **Liam Davis** | Deploy staging monitoring and error alerts | Medium | Dec 05, 2026 |

---

> [!TIP]
> Next sync is scheduled for Monday, December 1st at 10:00 AM PST.
`,
};
