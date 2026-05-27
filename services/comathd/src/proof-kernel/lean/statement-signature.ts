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
