import { listCitations } from "../literature/index.js";

function escapeBibTeX(value: string): string {
  return value.replace(/[{}]/g, "").trim();
}

export function buildPaperBibTeX(projectRoot: string, projectId: string): string {
  const entries = listCitations(projectRoot, projectId)
    .filter((citation) => citation.bibtex_key)
    .map((citation) => {
      const fields = [
        `  title = {${escapeBibTeX(citation.title)}}`,
        citation.authors.length ? `  author = {${escapeBibTeX(citation.authors.join(" and "))}}` : undefined,
        citation.year ? `  year = {${citation.year}}` : undefined,
        citation.doi ? `  doi = {${escapeBibTeX(citation.doi)}}` : undefined,
        citation.arxiv_id ? `  eprint = {${escapeBibTeX(citation.arxiv_id)}}` : undefined
      ].filter(Boolean);
      return `@article{${citation.bibtex_key},\n${fields.join(",\n")}\n}`;
    });
  return entries.length ? `${entries.join("\n\n")}\n` : "";
}
