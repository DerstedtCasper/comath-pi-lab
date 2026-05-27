export type LeanStatementSignature = {
  theorem_name: string;
  normalized_signature: string;
  normalized_type: string;
};

export type LeanStatementSignatureExtraction =
  | {
      result: "ok";
      signature: LeanStatementSignature;
      matches: string[];
    }
  | {
      result: "missing" | "ambiguous";
      matches: string[];
    };

export type LeanTheoremDeclarationSignatureExtraction = LeanStatementSignatureExtraction;

function normalizeSignature(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function signaturePattern(theoremName: string): RegExp {
  const escapedTheorem = theoremName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escapedTheorem}\\b.*:\\s*.+$`);
}

function typeFromSignature(signature: string, theoremName: string): string {
  return normalizeSignature(signature.slice(theoremName.length));
}

function unqualifiedTheoremName(theoremName: string): string {
  return theoremName.split(".").at(-1) ?? theoremName;
}

function stripLineComment(line: string): string {
  const index = line.indexOf("--");
  return index >= 0 ? line.slice(0, index) : line;
}

function declarationPrefixForLine(line: string): string | undefined {
  const match = line.match(/^\s*(theorem|lemma)\s+(.+)$/);
  return match?.[2];
}

function normalizeDeclarationHeader(value: string): string {
  const beforeTerm = value.split(":=")[0]?.split(/\bby\b/)[0] ?? value;
  return normalizeSignature(beforeTerm);
}

export function extractLeanTheoremDeclarationSignature(input: {
  lean_source: string;
  theorem_name: string;
}): LeanTheoremDeclarationSignatureExtraction {
  const targetLocalName = unqualifiedTheoremName(input.theorem_name);
  const matches: string[] = [];
  const lines = input.lean_source.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const firstLine = stripLineComment(lines[index]);
    const initial = declarationPrefixForLine(firstLine);
    if (!initial) {
      continue;
    }
    const parts = [initial];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const current = stripLineComment(lines[cursor]);
      if (/^\s*(theorem|lemma|namespace|end)\b/.test(current)) {
        break;
      }
      parts.push(current);
      if (current.includes(":=") || /\bby\b/.test(current)) {
        break;
      }
    }
    const header = normalizeDeclarationHeader(parts.join(" "));
    if (!header.startsWith(`${targetLocalName} `) && header !== targetLocalName) {
      continue;
    }
    const normalized_signature = normalizeSignature(`${input.theorem_name}${header.slice(targetLocalName.length)}`);
    if (!matches.includes(normalized_signature)) {
      matches.push(normalized_signature);
    }
  }

  if (matches.length === 0) {
    return { result: "missing", matches };
  }
  if (matches.length > 1) {
    return { result: "ambiguous", matches };
  }
  return {
    result: "ok",
    signature: {
      theorem_name: input.theorem_name,
      normalized_signature: matches[0],
      normalized_type: typeFromSignature(matches[0], input.theorem_name)
    },
    matches
  };
}

export function extractLeanStatementSignature(input: {
  lean_check_output: string;
  theorem_name: string;
}): LeanStatementSignatureExtraction {
  const pattern = signaturePattern(input.theorem_name);
  const matches = input.lean_check_output
    .split(/\r?\n/)
    .map((line) => normalizeSignature(line))
    .filter((line) => pattern.test(line));
  const uniqueMatches = matches.filter((line, index, all) => all.indexOf(line) === index);

  if (uniqueMatches.length === 0) {
    return { result: "missing", matches };
  }
  if (uniqueMatches.length > 1) {
    return { result: "ambiguous", matches };
  }

  const normalized_signature = uniqueMatches[0];
  return {
    result: "ok",
    signature: {
      theorem_name: input.theorem_name,
      normalized_signature,
      normalized_type: typeFromSignature(normalized_signature, input.theorem_name)
    },
    matches
  };
}
