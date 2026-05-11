#!/usr/bin/env node

import { writeFileSync, readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { XMLParser } from "fast-xml-parser";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PUBMED_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_FETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

const SEARCH_QUERIES = [
  {
    name: "core-people-pleasing",
    terms: `"people pleasing"[tiab] OR "people-pleasing"[tiab] OR "approval seeking"[tiab] OR "approval-seeking"[tiab] OR "need for approval"[tiab] OR "fear of disapproval"[tiab] OR "conflict avoidance"[tiab] OR "boundary setting"[tiab] OR "difficulty saying no"[tiab] OR "inability to say no"[tiab]`,
  },
  {
    name: "fawn-appeasement",
    terms: `"fawn response"[tiab] OR fawning[tiab] OR "appeasement response"[tiab] OR appeasement[tiab] OR submissiveness[tiab] OR "social appeasement"[tiab]`,
  },
  {
    name: "sociotropy-dependency",
    terms: `sociotropy[tiab] OR sociotropic[tiab] OR "interpersonal dependency"[tiab] OR "dependent personality"[tiab] OR "dependent personality disorder"[tiab] OR "dependent personality traits"[tiab] OR "excessive reassurance seeking"[tiab] OR "reassurance seeking"[tiab]`,
  },
  {
    name: "self-silencing",
    terms: `"self silencing"[tiab] OR "self-silencing"[tiab] OR "silencing the self"[tiab] OR "self sacrifice"[tiab] OR "self-sacrifice"[tiab] OR "subjugation schema"[tiab] OR "self-sacrifice schema"[tiab] OR "unmitigated communion"[tiab] OR "pathological altruism"[tiab]`,
  },
  {
    name: "attachment-rejection",
    terms: `"attachment anxiety"[tiab] OR "anxious attachment"[tiab] OR "preoccupied attachment"[tiab] OR "rejection sensitivity"[tiab] OR "interpersonal sensitivity"[tiab] OR "fear of abandonment"[tiab] OR "relational insecurity"[tiab]`,
  },
  {
    name: "codependency",
    terms: `codependency[tiab] OR co-dependency[tiab] OR "compulsive caregiving"[tiab] OR enabling[tiab]`,
  },
];

const OUTCOME_TERMS = `depression[tiab] OR anxiety[tiab] OR "social anxiety"[tiab] OR trauma[tiab] OR PTSD[tiab] OR "complex PTSD"[tiab] OR CPTSD[tiab] OR "personality disorder"[tiab] OR "eating disorder"[tiab] OR burnout[tiab] OR "somatic symptoms"[tiab] OR suicidality[tiab] OR "intimate partner violence"[tiab] OR "emotion regulation"[tiab] OR shame[tiab]`;

function getDateDaysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split("T")[0].replace(/-/g, "/");
}

function loadSummarizedPmids() {
  const path = resolve(__dirname, "..", "docs", "summarized_pmids.json");
  if (!existsSync(path)) return new Set();
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return new Set(Object.keys(data.pmids || {}));
  } catch {
    return new Set();
  }
}

async function searchPubMed(query, retmax = 40) {
  const url = `${PUBMED_SEARCH}?db=pubmed&term=${encodeURIComponent(query)}&retmax=${retmax}&sort=date&retmode=json`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "PeoplePleasingResearchBot/1.0" },
      signal: AbortSignal.timeout(30000),
    });
    const data = await resp.json();
    return data?.esearchresult?.idlist || [];
  } catch (e) {
    console.error(`[ERROR] PubMed search failed: ${e.message}`);
    return [];
  }
}

async function fetchDetails(pmids) {
  if (!pmids.length) return [];
  const ids = pmids.join(",");
  const url = `${PUBMED_FETCH}?db=pubmed&id=${ids}&retmode=xml`;
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "PeoplePleasingResearchBot/1.0" },
      signal: AbortSignal.timeout(60000),
    });
    const xml = await resp.text();
    return parsePubMedXml(xml);
  } catch (e) {
    console.error(`[ERROR] PubMed fetch failed: ${e.message}`);
    return [];
  }
}

function parsePubMedXml(xml) {
  const papers = [];
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (name) => {
      if (name === "PubmedArticle" || name === "AbstractText" || name === "Keyword") return true;
      return false;
    },
  });
  const result = parser.parse(xml);
  const articles = result?.PubmedArticleSet?.PubmedArticle || [];

  for (const article of articles) {
    try {
      const medline = article.MedlineCitation;
      const art = medline?.Article;
      if (!art) continue;

      const titleEl = art.ArticleTitle;
      const title = typeof titleEl === "string" ? titleEl : titleEl?.["#text"] || "";

      let abstract = "";
      const abstractTexts = art?.Abstract?.AbstractText || [];
      const parts = [];
      for (const abs of abstractTexts) {
        const label = abs?.["@_Label"] || "";
        const text = typeof abs === "string" ? abs : abs?.["#text"] || "";
        if (label && text) parts.push(`${label}: ${text}`);
        else if (text) parts.push(text);
      }
      abstract = parts.join(" ").slice(0, 2000);

      const journal = art?.Journal?.Title || "";
      const pubDate = art?.Journal?.JournalIssue?.PubDate;
      let dateStr = "";
      if (pubDate) {
        const y = pubDate.Year || "";
        const m = pubDate.Month || "";
        const d = pubDate.Day || "";
        dateStr = [y, m, d].filter(Boolean).join(" ");
      }

      const pmid = String(medline?.PMID?.["#text"] || medline?.PMID || "");
      const url = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "";

      const keywords = [];
      const kwList = medline?.KeywordList?.Keyword || [];
      for (const kw of (Array.isArray(kwList) ? kwList : [kwList])) {
        const t = typeof kw === "string" ? kw : kw?.["#text"];
        if (t) keywords.push(t.trim());
      }

      papers.push({ pmid, title, journal, date: dateStr, abstract, url, keywords });
    } catch (e) {
      console.error(`[WARN] Failed to parse article: ${e.message}`);
    }
  }
  return papers;
}

async function main() {
  const targetDate = process.env.TARGET_DATE || new Date().toISOString().split("T")[0];
  const lookback = getDateDaysAgo(7);
  const dateFilter = `"${lookback}"[Date - Publication] : "3000"[Date - Publication]`;

  console.error(`[INFO] Searching PubMed for people-pleasing papers (last 7 days)...`);

  const allPmids = new Set();
  for (const q of SEARCH_QUERIES) {
    const fullQuery = `(${q.terms}) AND (${OUTCOME_TERMS}) AND ${dateFilter}`;
    console.error(`[INFO] Query: ${q.name}`);
    const pmids = await searchPubMed(fullQuery, 40);
    pmids.forEach((id) => allPmids.add(id));
    console.error(`[INFO]   Found ${pmids.length} results`);
  }

  console.error(`[INFO] Total unique PMIDs: ${allPmids.size}`);

  const summarized = loadSummarizedPmids();
  const newPmids = [...allPmids].filter((id) => !summarized.has(id));
  console.error(`[INFO] Already summarized: ${summarized.size}, New: ${newPmids.length}`);

  let papers = [];
  if (newPmids.length > 0) {
    papers = await fetchDetails(newPmids);
    console.error(`[INFO] Fetched details for ${papers.length} papers`);
  }

  const output = {
    date: targetDate,
    count: papers.length,
    papers,
  };

  const outPath = resolve(__dirname, "..", "papers.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.error(`[INFO] Saved to ${outPath}`);
}

main().catch((e) => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});
