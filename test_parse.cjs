const { XMLParser } = require("fast-xml-parser");
const parser = new XMLParser({
  ignoreAttributes: false,
  isArray: (name) => name === "PubmedArticle" || name === "AbstractText" || name === "Keyword",
});
const xml = '<PubmedArticleSet><PubmedArticle><MedlineCitation><PMID Version="1">12345</PMID><Article><Journal><Title>Test Journal</Title><JournalIssue><PubDate><Year>2026</Year><Month>May</Month></PubDate></JournalIssue></Journal><ArticleTitle>Test Title</ArticleTitle><Abstract><AbstractText Label="BG">Some text</AbstractText></Abstract></Article></MedlineCitation></PubmedArticle></PubmedArticleSet>';
const result = parser.parse(xml);
console.log(JSON.stringify(result.PubmedArticleSet.PubmedArticle[0], null, 2));
