import ts from "typescript";

export type AstValidationError = {
  message: string;
  line: number;
  column: number;
};

export type AstValidationResult = {
  ok: boolean;
  errors: AstValidationError[];
};

export type AstValidationOptions = {
  requireDefaultExport?: boolean;
  allowImports?: boolean;
  bannedIdentifiers?: string[];
};

const defaultBanned = new Set([
  "process",
  "global",
  "globalThis",
  "window",
  "document",
  "require",
  "Buffer",
  "Deno",
  "Bun",
]);

const addError = (sourceFile: ts.SourceFile, node: ts.Node, message: string, errors: AstValidationError[]) => {
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
  errors.push({ message, line: line + 1, column: character + 1 });
};

export function validateModuleSource(
  source: string,
  options: AstValidationOptions = {},
): AstValidationResult {
  const errors: AstValidationError[] = [];
  const requireDefaultExport = options.requireDefaultExport ?? true;
  const allowImports = options.allowImports ?? false;
  const bannedIdentifiers = new Set(options.bannedIdentifiers ?? Array.from(defaultBanned));

  const sourceFile = ts.createSourceFile("babulus.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let hasDefaultExport = false;

  const visit = (node: ts.Node) => {
    if (ts.isExportAssignment(node)) {
      hasDefaultExport = true;
    }
    if (!allowImports && (ts.isImportDeclaration(node) || ts.isImportEqualsDeclaration(node))) {
      addError(sourceFile, node, "Imports are not allowed.", errors);
    }
    if (ts.isCallExpression(node)) {
      if (ts.isIdentifier(node.expression)) {
        if (node.expression.text === "require") {
          addError(sourceFile, node, "require() is not allowed.", errors);
        }
        if (node.expression.text === "eval") {
          addError(sourceFile, node, "eval() is not allowed.", errors);
        }
      }
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        addError(sourceFile, node, "Dynamic import() is not allowed.", errors);
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Function") {
      addError(sourceFile, node, "new Function() is not allowed.", errors);
    }
    if (ts.isIdentifier(node) && bannedIdentifiers.has(node.text)) {
      addError(sourceFile, node, `Identifier "${node.text}" is not allowed.`, errors);
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);

  if (requireDefaultExport && !hasDefaultExport) {
    errors.push({ message: "Module must have a default export.", line: 1, column: 1 });
  }

  return { ok: errors.length === 0, errors };
}
