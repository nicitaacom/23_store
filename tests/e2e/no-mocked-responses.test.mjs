import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import path from "node:path"
import test from "node:test"
import ts from "typescript"

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const coverageMap = JSON.parse(await readFile(path.join(repositoryRoot, "cypress/coverage/request-map.json"), "utf8"))
const weeklySpecs = coverageMap.requiredSpecs.map(specName => path.join(repositoryRoot, "cypress/monthly", specName))

function getCallName(expression) {
  if (ts.isPropertyAccessExpression(expression)) return expression.name.text
  if (ts.isElementAccessExpression(expression) && ts.isStringLiteral(expression.argumentExpression)) {
    return expression.argumentExpression.text
  }
  return ts.isIdentifier(expression) ? expression.text : ""
}

function getReceiverName(expression) {
  if (ts.isPropertyAccessExpression(expression) || ts.isElementAccessExpression(expression)) {
    return getCallName(expression.expression)
  }
  return ""
}

function isHttpMethodExpression(expression) {
  if (ts.isStringLiteralLike(expression)) return /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/i.test(expression.text)
  return /^(http)?method$/i.test(getCallName(expression))
}

function parseSpec(specPath, sourceText) {
  const sourceFile = ts.createSourceFile(specPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  assert.equal(sourceFile.parseDiagnostics.length, 0, `${path.basename(specPath)} must parse before its network behavior can be checked`)
  return sourceFile
}

test("weekly real-service specs do not fabricate intercepted API or provider responses", async () => {
  const absentSpecs = []
  const violations = []

  for (const specPath of weeklySpecs) {
    let sourceText
    try {
      sourceText = await readFile(specPath, "utf8")
    } catch {
      absentSpecs.push(path.relative(repositoryRoot, specPath))
      continue
    }

    const sourceFile = parseSpec(specPath, sourceText)
    const displayPath = path.relative(repositoryRoot, specPath)

    function visit(node) {
      if (ts.isCallExpression(node)) {
        const callName = getCallName(node.expression)
        const receiverName = getReceiverName(node.expression)

        if (receiverName === "cy" && callName === "intercept") {
          const args = [...node.arguments]
          const validMethodAndUrl = args.length === 2 && isHttpMethodExpression(args[0])
          const validHandler = args.length === 2 && (ts.isArrowFunction(args[1]) || ts.isFunctionExpression(args[1]))
          const validMethodUrlAndHandler = args.length === 3
            && isHttpMethodExpression(args[0])
            && (ts.isArrowFunction(args[2]) || ts.isFunctionExpression(args[2]))

          if (args.length > 3 || (args.length === 2 && !validMethodAndUrl && !validHandler) || (args.length === 3 && !validMethodUrlAndHandler)) {
            violations.push(`${displayPath}: cy.intercept must observe a real request; static response arguments are forbidden`)
          }
        }

        if (["reply", "respond", "fulfill", "respondWith"].includes(callName)) {
          violations.push(`${displayPath}: ${callName}() can fabricate a network response`)
        }

        if (receiverName === "cy" && callName === "stub") {
          const targetText = node.arguments.map(argument => argument.getText(sourceFile)).join(" ")
          if (/fetch|XMLHttpRequest|axios|openai|stripe|supabase|pusher|telegram|resend|yandex|lambda|s3/i.test(targetText)) {
            violations.push(`${displayPath}: cy.stub() targets a network/provider API`)
          }
        }
      }

      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const assignmentTarget = node.left.getText(sourceFile)
        if (/\b(fetch|XMLHttpRequest|axios|openai|stripe|supabase|pusher|telegram|resend|yandex|lambda|s3)\b/i.test(assignmentTarget)) {
          violations.push(`${displayPath}: replaces network/provider implementation at ${assignmentTarget}`)
        }
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  assert.deepEqual(absentSpecs, [], "every required weekly real-service spec must exist")
  assert.deepEqual(violations, [], "weekly acceptance tests must use actual server and provider responses")
})
