#!/usr/bin/env ts-node

/**
 * Documentation Quality Check Script
 *
 * Detects common documentation quality issues:
 * - AI slop patterns (marketing jargon, filler phrases)
 * - Session-specific references (dates, "this morning", "as we discussed")
 * - Placeholder content without timelines
 * - Unexplained jargon on first use
 *
 * Usage: npm run docs:quality-check
 * or: ts-node scripts/docs-quality-check.ts
 */

import * as fs from "fs";
import * as path from "path";

// AI slop patterns to detect
const AI_SLOP_PATTERNS = [
  {
    pattern: /\bseamlessly\b/gi,
    message: "AI slop: 'seamlessly' - be specific about integration method",
  },
  {
    pattern: /\brobust\b/gi,
    message: "AI slop: 'robust' - describe actual capabilities instead",
  },
  {
    pattern: /\bleverage\b/gi,
    message: "AI slop: 'leverage' - use 'use' or be more specific",
  },
  {
    pattern: /\b(revolutionar(y|ize)|game-chang(er|ing))\b/gi,
    message: "AI slop: marketing hyperbole - remove or be specific",
  },
  {
    pattern: /\bcutting-edge\b/gi,
    message: "AI slop: 'cutting-edge' - describe the actual technology",
  },
  {
    pattern: /\bstate-of-the-art\b/gi,
    message: "AI slop: 'state-of-the-art' - be concrete about features",
  },
  {
    pattern: /\bempower(s|ing|ed)?\b/gi,
    message: "AI slop: 'empower' - describe what users can actually do",
  },
  {
    pattern: /\b(simply|just|easily) (create|build|make)\b/gi,
    message: "AI slop: minimizing complexity - be honest about effort required",
  },
  {
    pattern: /it'?s important to (note|understand|remember)/gi,
    message: "AI slop: filler phrase - state the information directly",
  },
  {
    pattern: /\bplethora\b/gi,
    message: "AI slop: 'plethora' - use simpler language",
  },
  {
    pattern: /\butilize\b/gi,
    message: "AI slop: 'utilize' - use 'use'",
  },
];

// Session-specific reference patterns
const SESSION_PATTERNS = [
  {
    pattern: /\b(this morning|this afternoon|this evening|today|yesterday|last week)\b/gi,
    message: "Session reference: temporal reference - remove or use absolute dates",
  },
  {
    pattern: /\b(as we discussed|as mentioned earlier|as we saw)\b/gi,
    message: "Session reference: conversational reference - make self-contained",
  },
  {
    pattern: /\b(let'?s|we'?ll|we'?ve)\b/gi,
    message: "Session reference: first-person plural - use second person ('you') or imperative",
  },
  {
    pattern: /\b20\d{2}-\d{2}-\d{2}\b/g,
    message: "Session reference: specific date in content - consider if this is appropriate",
  },
];

// Placeholder patterns
const PLACEHOLDER_PATTERNS = [
  {
    pattern: /\b(TODO|TBD|FIXME|XXX)\b/g,
    message: "Placeholder: remove before publishing",
  },
  {
    pattern: /coming soon/gi,
    message: "Placeholder: 'coming soon' without timeline - add date or remove",
  },
  {
    pattern: /\[.*?\]/g,
    message: "Placeholder: bracketed content may be incomplete",
  },
];

type Issue = {
  file: string;
  line: number;
  column: number;
  message: string;
  context: string;
};

function checkContent(content: string, filename: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split("\n");

  const allPatterns = [
    ...AI_SLOP_PATTERNS,
    ...SESSION_PATTERNS,
    ...PLACEHOLDER_PATTERNS,
  ];

  for (const { pattern, message } of allPatterns) {
    // Reset regex state
    pattern.lastIndex = 0;

    let match;
    while ((match = pattern.exec(content)) !== null) {
      const position = match.index;

      // Find line and column
      let line = 1;
      let column = 1;
      let charCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const lineLength = lines[i].length + 1; // +1 for newline
        if (charCount + lineLength > position) {
          line = i + 1;
          column = position - charCount + 1;
          break;
        }
        charCount += lineLength;
      }

      // Get context (the matching line)
      const contextLine = lines[line - 1];

      issues.push({
        file: filename,
        line,
        column,
        message,
        context: contextLine.trim().slice(0, 80) + (contextLine.length > 80 ? "..." : ""),
      });
    }
  }

  return issues;
}

function checkDocFile(filePath: string): Issue[] {
  const content = fs.readFileSync(filePath, "utf-8");

  // Extract HTML content from TypeScript doc files
  // Look for html: `...` or html: "..."
  const htmlMatch = content.match(/html:\s*[`"](.+?)[`"]/s);

  if (htmlMatch) {
    const htmlContent = htmlMatch[1];
    return checkContent(htmlContent, path.basename(filePath));
  }

  // For non-TS files, check entire content
  return checkContent(content, path.basename(filePath));
}

function main() {
  const docsDir = path.join(__dirname, "../apps/studio-web/lib/docs-content");

  if (!fs.existsSync(docsDir)) {
    console.error(`Documentation directory not found: ${docsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(docsDir).filter((f) => f.endsWith(".ts"));

  let totalIssues = 0;
  const issuesByFile = new Map<string, Issue[]>();

  for (const file of files) {
    const filePath = path.join(docsDir, file);
    const issues = checkDocFile(filePath);

    if (issues.length > 0) {
      issuesByFile.set(file, issues);
      totalIssues += issues.length;
    }
  }

  // Print results
  console.log("Documentation Quality Check Results");
  console.log("===================================\n");

  if (totalIssues === 0) {
    console.log("✅ No issues found! All documentation passes quality checks.");
    process.exit(0);
  }

  console.log(`❌ Found ${totalIssues} issue(s) across ${issuesByFile.size} file(s):\n`);

  for (const [file, issues] of issuesByFile.entries()) {
    console.log(`\n${file} (${issues.length} issue(s)):`);
    console.log("─".repeat(60));

    for (const issue of issues) {
      console.log(`  Line ${issue.line}:${issue.column}`);
      console.log(`  ${issue.message}`);
      console.log(`  Context: ${issue.context}`);
      console.log();
    }
  }

  console.log("\nRecommendation: Review and fix these issues before publishing.\n");

  // Exit with error code if issues found
  process.exit(1);
}

main();
