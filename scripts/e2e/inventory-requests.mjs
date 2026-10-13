import { execFileSync } from "node:child_process"
import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import ts from "typescript"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const artifactDirectory = path.resolve(repositoryRoot, process.env.E2E_ARTIFACT_DIR ?? "artifacts/e2e")
const mappingPath = path.join(repositoryRoot, "cypress/coverage/request-map.json")
const networkMethodNames = new Set([
  "fetch", "request", "send", "rpc", "select", "insert", "update", "upsert", "delete", "remove",
  "create", "retrieve", "confirm", "cancel", "capture", "refund", "expire", "list", "generate",
  "complete", "upload", "download", "copy", "move", "trigger", "publish", "subscribe", "invoke",
  "query", "queryRaw", "execute", "set", "get", "del", "incr", "hset", "hget", "search", "embed",
  "post", "put", "patch", "head", "describeIndex", "signInWithPassword", "signUp", "signOut",
  "resetPasswordForEmail", "updateUser", "getUser", "getSession", "createUser", "deleteUser",
  "single", "maybeSingle", "eq", "neq", "in", "like", "ilike", "gt", "gte", "lt", "lte",
  "bind", "unbind", "unsubscribe", "addListener", "removeListener", "eval", "hgetall", "lpush", "deleteOne", "inspect",
  "order", "limit", "range", "contains", "containedBy", "overlaps", "match", "filter",
])
const sdkOperationNamePattern = /^(get|post|put|patch|delete|create|retrieve|update|insert|select|search|send|mark|open|close|rate|verify|reset|recover|sign|sync|translate|generate|suggest|complete|fetch|upload|download|remove|increment|decrement|check|add|track|query|chat|propose|approve|reject)/i
const networkClientNames = /supabase|stripe|openai|pusher|redis|pinecone|resend|s3|lambda|storage|coinmarketcap|paypal|klarna|axios|httpclient|sdk|provider|backend|limiter/i
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"])
const excludedDirectories = new Set([".git", ".next", "node_modules", "coverage", "test-results", "storybook-static"])

export function isPrivateEnvironmentFileName(name) {
  return name === ".env.local" || name.startsWith(".env.local.")
}

function getStableId(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16)
}

async function listSourceFiles(directoryPath, sourcePaths = []) {
  let entries = []
  try {
    entries = await readdir(path.join(repositoryRoot, directoryPath), { withFileTypes: true })
  } catch {
    return sourcePaths
  }

  for (const entry of entries) {
    if (isPrivateEnvironmentFileName(entry.name)) continue
    const sourcePath = path.posix.join(directoryPath, entry.name)
    if (entry.isDirectory()) {
      if (excludedDirectories.has(entry.name) || /(^|\/)(tests?|stories|__tests__|cypress)(\/|$)/i.test(sourcePath)
        || sourcePath === "scripts/e2e") continue
      await listSourceFiles(sourcePath, sourcePaths)
      continue
    }

    const sourceExtension = path.extname(entry.name)
    if (!entry.isFile() || !sourceExtensions.has(sourceExtension)
      || /\.(test|spec)\.[cm]?[jt]sx?$/.test(entry.name)
      || /(^|\/)dev_readme[^/]*$/i.test(sourcePath)) continue
    sourcePaths.push(sourcePath)
  }
  return sourcePaths
}

async function getSourceFiles() {
  const sourcePaths = await listSourceFiles("app")
  await listSourceFiles("scripts", sourcePaths)
  for (const sourceName of ["middleware.ts", "proxy.ts", "instrumentation.ts", "next.config.ts", "next.config.mjs", "next.config.js"]) {
    try {
      await readFile(path.join(repositoryRoot, sourceName), "utf8")
      sourcePaths.push(sourceName)
    } catch {
      // An absent optional entrypoint contributes no runtime source.
    }
  }
  return [...new Set(sourcePaths)].sort()
}

function getRootIdentifier(node) {
  let currentNode = node
  while (ts.isPropertyAccessExpression(currentNode) || ts.isElementAccessExpression(currentNode)) {
    currentNode = currentNode.expression
  }
  if (ts.isCallExpression(currentNode)) return getRootIdentifier(currentNode.expression)
  return ts.isIdentifier(currentNode) ? currentNode.text : ""
}

function getCallName(node) {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) return node.name.text
  if (ts.isElementAccessExpression(node) && node.argumentExpression && ts.isStringLiteral(node.argumentExpression)) {
    return node.argumentExpression.text
  }
  return node.getText()
}

function getCallChainNames(callNode) {
  const names = []
  function visit(expression) {
    if (ts.isPropertyAccessExpression(expression)) {
      visit(expression.expression)
      names.push(expression.name.text)
    } else if (ts.isElementAccessExpression(expression)) {
      visit(expression.expression)
      if (expression.argumentExpression && ts.isStringLiteral(expression.argumentExpression)) {
        names.push(expression.argumentExpression.text)
      }
    } else if (ts.isCallExpression(expression)) {
      visit(expression.expression)
    }
  }
  visit(callNode.expression)
  return names
}

export function getSupabaseQueryDescriptor(callNode) {
  if (!/^supabase/i.test(getRootIdentifier(callNode.expression))) return null
  const callChainNames = getCallChainNames(callNode)
  const fromIndex = callChainNames.indexOf("from")
  if (fromIndex < 0) return null
  const queryAction = callChainNames.slice(fromIndex + 1)
    .find(name => ["select", "insert", "upsert", "update", "delete"].includes(name))
  if (!queryAction) return null
  return { callName: `supabase-${queryAction}`, queryAction }
}

function getFunctionName(node) {
  let currentNode = node.parent
  while (currentNode) {
    if ((ts.isFunctionDeclaration(currentNode) || ts.isMethodDeclaration(currentNode)) && currentNode.name) {
      return currentNode.name.getText()
    }
    if (ts.isArrowFunction(currentNode) || ts.isFunctionExpression(currentNode)) {
      const functionOwner = currentNode.parent
      if (ts.isVariableDeclaration(functionOwner) && ts.isIdentifier(functionOwner.name)) return functionOwner.name.text
      if (ts.isPropertyAssignment(functionOwner) || ts.isMethodDeclaration(functionOwner)) return functionOwner.name.getText()
    }
    currentNode = currentNode.parent
  }
  return "module"
}

export function isNetworkCall(callNode, sourceText) {
  const callName = getCallName(callNode.expression)
  const rootName = getRootIdentifier(callNode.expression)
  if (callName === "fetch" || callName === "XMLHttpRequest" || callName === "sendBeacon") return true
  if (getSdkRequestDescriptor(callNode)) return true
  if (getSupabaseQueryDescriptor(callNode)) return true
  if (/sdk/i.test(rootName) && sdkOperationNamePattern.test(callName)) return true
  if (["query", "requireAdmin"].includes(callName)) return true
  if (callName === "send" && /(?:S3Client|LambdaClient|InvokeCommand|PutObjectCommand|GetObjectCommand|DeleteObjectCommand)/.test(sourceText)) return true
  if (callName === "send" && /XMLHttpRequest/.test(sourceText)) return true
  if (networkClientNames.test(rootName) && networkMethodNames.has(callName)) return true
  if (/\brequest\s*\(/.test(callNode.getText()) && callName === "request") return true
  return false
}

function getSdkRequestDescriptor(callNode) {
  if (!ts.isPropertyAccessExpression(callNode.expression)) return null
  const callName = callNode.expression.name.text
  const requestMethods = new Map([
    ["getJson", "GET"],
    ["postJson", "POST"],
    ["postText", "POST"],
    ["postFormData", "POST"],
    ["postVoid", "POST"],
  ])
  if (!requestMethods.has(callName) || !callNode.arguments.length) return null
  const routeArgument = callNode.arguments[0]
  if (!ts.isStringLiteralLike(routeArgument) && !ts.isNoSubstitutionTemplateLiteral(routeArgument)) return null
  if (!routeArgument.text.startsWith("/api/")) return null
  return { method: requestMethods.get(callName), route: routeArgument.text }
}

function getOperationRoute(operation) {
  if (operation.operationKind === "http-route") return { method: operation.method, route: operation.route }
  if (operation.operationKind === "sdk-request") return { method: operation.method, route: operation.route }
  return null
}

function hasNetworkCallParent(callNode, sourceText) {
  const currentRoot = getRootIdentifier(callNode.expression)
  let parent = callNode.parent
  while (parent && (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent))) parent = parent.parent
  if (!parent || !ts.isCallExpression(parent) || !isNetworkCall(parent, sourceText)) return false
  return getRootIdentifier(parent.expression) === currentRoot
}

export function getExecutionForm(node) {
  let currentNode = node.parent
  while (currentNode && !ts.isStatement(currentNode)) {
    if (ts.isAwaitExpression(currentNode)) return "await"
    if (ts.isVoidExpression(currentNode)) return "void"
    if (ts.isCallExpression(currentNode) && ts.isPropertyAccessExpression(currentNode.expression)
      && ["then", "catch", "finally"].includes(currentNode.expression.name.text)) return currentNode.expression.name.text
    if (ts.isCallExpression(currentNode) && ts.isPropertyAccessExpression(currentNode.expression)
      && ts.isIdentifier(currentNode.expression.expression)
      && currentNode.expression.expression.text === "Promise"
      && ["all", "allSettled"].includes(currentNode.expression.name.text)) return "promise-all"
    currentNode = currentNode.parent
  }
  if (currentNode && ts.isReturnStatement(currentNode)) return "return"
  return "unawaited"
}

function normalizeRoutePath(sourcePath) {
  const apiPath = sourcePath.replace(/^app\/api\//, "").replace(/\/route\.[^/]+$/, "")
  return `/api/${apiPath.split("/").map(segment => {
    if (segment.startsWith("[[...") && segment.endsWith("]]")) return `:${segment.slice(5, -2)}*?`
    if (segment.startsWith("[...") && segment.endsWith("]")) return `:${segment.slice(4, -1)}*`
    if (segment.startsWith("[") && segment.endsWith("]")) return `:${segment.slice(1, -1)}`
    return segment
  }).join("/")}`
}

function normalizeRequestRoute(route) {
  return route.replace(/\$\{[^}]+\}/g, ":value")
    .replace(/\/\[([A-Za-z0-9_]+)\]/g, "/:$1")
}

function getRouteOperations(sourcePath, sourceFile, sourceText) {
  if (!sourcePath.startsWith("app/api/") || !sourcePath.includes("/route.")) return []
  const routePath = normalizeRoutePath(sourcePath)
  const routeOperations = []
  const routeMethods = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"])
  const handlers = []

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && routeMethods.has(statement.name.text)) {
      handlers.push({ method: statement.name.text, declaration: statement })
      continue
    }
    if (!ts.isVariableStatement(statement)) continue
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && routeMethods.has(declaration.name.text) && declaration.initializer) {
        handlers.push({ method: declaration.name.text, declaration })
      }
    }
  }

  for (const handler of handlers) {
    const operationId = `route-${getStableId(`${routePath}:${handler.method}`)}`
    routeOperations.push({
      operationId,
      operationKind: "http-route",
      sourcePath,
      line: sourceFile.getLineAndCharacterOfPosition(handler.declaration.getStart()).line + 1,
      sourceStart: handler.declaration.getStart(),
      sourceEnd: handler.declaration.getEnd(),
      functionName: handler.method,
      route: routePath,
      method: handler.method,
      fingerprint: `${handler.method} ${routePath}`,
      mapping: null,
      evidenceStatus: "not_exercised",
    })
  }

  return routeOperations
}

function getOperationMapping(mappingDocument, operation) {
  const explicitMapping = mappingDocument.operations?.[operation.operationId]
  if (explicitMapping) return explicitMapping
  const requestRoute = getOperationRoute(operation)
  if (requestRoute) {
    const exactRouteMapping = mappingDocument.routes?.[`${requestRoute.method} ${requestRoute.route}`]
    if (exactRouteMapping) return exactRouteMapping
    for (const routeRule of mappingDocument.routePatterns ?? []) {
      if (routeRule.method && routeRule.method !== requestRoute.method) continue
      if (new RegExp(routeRule.pattern).test(requestRoute.route)) return routeRule
    }
  }
  const sourceMapping = (mappingDocument.sourceRules ?? [])
    .filter(sourceRule => new RegExp(sourceRule.pattern).test(operation.sourcePath))
    .sort((firstRule, secondRule) => secondRule.pattern.length - firstRule.pattern.length)[0] ?? null
  if (operation.operationKind === "async-expression" && operation.classification === "needs-review") {
    const asyncRule = (mappingDocument.asyncRules ?? [])
      .filter(rule => new RegExp(rule.sourcePattern).test(operation.sourcePath)
        && new RegExp(rule.expressionPattern).test(operation.fingerprint))
      .sort((firstRule, secondRule) =>
        (secondRule.sourcePattern.length + secondRule.expressionPattern.length)
        - (firstRule.sourcePattern.length + firstRule.expressionPattern.length))[0]
    if (asyncRule) return { ...sourceMapping, ...asyncRule }
  }
  return sourceMapping
}

async function buildRequestInventory() {
  const mappingDocument = JSON.parse(await readFile(mappingPath, "utf8"))
  const inventory = []
  const asyncExpressions = []
  const asyncSummary = { awaitExpressions: 0, returnedCalls: 0, promiseChains: 0, promiseAllGroups: 0, voidCalls: 0, subscriptionCalls: 0 }
  const sourceFiles = await getSourceFiles()

  for (const sourcePath of sourceFiles) {
    const absolutePath = path.join(repositoryRoot, sourcePath)
    const sourceText = await readFile(absolutePath, "utf8")
    const sourceFile = ts.createSourceFile(sourcePath, sourceText, ts.ScriptTarget.Latest, true,
      sourcePath.endsWith(".tsx") || sourcePath.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
    const routeOperations = getRouteOperations(sourcePath, sourceFile, sourceText)
    inventory.push(...routeOperations)
    const serviceRequestOperations = []

    function addCallOperation(callNode, executionForm) {
      const supabaseQuery = getSupabaseQueryDescriptor(callNode)
      const callName = supabaseQuery?.callName ?? getCallName(callNode.expression)
      const sdkRequest = getSdkRequestDescriptor(callNode)
      if (!isNetworkCall(callNode, sourceText)) return
      if (hasNetworkCallParent(callNode, sourceText)) return
      const functionName = getFunctionName(callNode)
      const fingerprint = callNode.getText().replace(/\s+/g, " ").trim()
      const isRealtimeSubscription = ["subscribe", "bind", "unbind", "unsubscribe", "addListener", "removeListener"].includes(callName)
        && networkClientNames.test(getRootIdentifier(callNode.expression))
      const operationKind = sdkRequest ? "sdk-request" : isRealtimeSubscription ? "realtime-subscription" : "service-request"
      const route = sdkRequest ? normalizeRequestRoute(sdkRequest.route) : null
      const method = sdkRequest?.method ?? null
      const matchingRouteOperations = routeOperations.filter(routeOperation => routeOperation.method
        && sourcePath.startsWith("app/api/")
        && callNode.getStart() >= routeOperation.sourceStart
        && callNode.getEnd() <= routeOperation.sourceEnd)
      const directRouteDependency = route && `route-${getStableId(`${route}:${method}`)}`
      const operationId = `call-${getStableId(`${sourcePath}:${functionName}:${operationKind}:${fingerprint}`)}`
      const operation = {
        operationId,
        operationKind,
        sourcePath,
        line: sourceFile.getLineAndCharacterOfPosition(callNode.getStart()).line + 1,
        functionName,
        callName,
        receiver: getRootIdentifier(callNode.expression),
        ...(supabaseQuery ? { provider: "supabase", queryAction: supabaseQuery.queryAction } : {}),
        route,
        method,
        executionForm,
        dependencyOperationIds: directRouteDependency
          ? [directRouteDependency]
          : matchingRouteOperations.map(routeOperation => routeOperation.operationId),
        dependencyReviewStatus: directRouteDependency || matchingRouteOperations.length ? "source_linked" : "needs_review",
        fingerprint,
        mapping: null,
        evidenceStatus: "not_exercised",
      }
      serviceRequestOperations.push({ start: callNode.getStart(), end: callNode.getEnd(), operation })
      inventory.push(operation)
    }

    function visit(node) {
      if (ts.isAwaitExpression(node)) {
        asyncSummary.awaitExpressions += 1
      } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ["then", "catch", "finally"].includes(node.expression.name.text)) {
        asyncSummary.promiseChains += 1
      }
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Promise"
        && ["all", "allSettled"].includes(node.expression.name.text)) asyncSummary.promiseAllGroups += 1
      if (ts.isCallExpression(node)) {
        const callName = getCallName(node.expression)
        const receiver = getRootIdentifier(node.expression)
        if (["subscribe", "bind", "addEventListener", "on"].includes(callName)
          && networkClientNames.test(receiver)) asyncSummary.subscriptionCalls += 1
        addCallOperation(node, getExecutionForm(node))
      }
      node.forEachChild(visit)
    }

    visit(sourceFile)
    asyncSummary.returnedCalls += serviceRequestOperations.filter(({ operation }) => operation.executionForm === "return").length
    asyncSummary.voidCalls += serviceRequestOperations.filter(({ operation }) => operation.executionForm === "void").length

    const asyncExpressionOccurrences = new Map()
    function recordAsyncExpressions(node) {
      let expressionNode = null
      let executionForm = null
      if (ts.isAwaitExpression(node)) {
        expressionNode = node.expression
        executionForm = "await"
      } else if (ts.isReturnStatement(node) && node.expression && ts.isCallExpression(node.expression)) {
        expressionNode = node.expression
        executionForm = "return"
      } else if (ts.isVoidExpression(node) && ts.isCallExpression(node.expression)) {
        expressionNode = node.expression
        executionForm = "void"
      } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ["then", "catch", "finally"].includes(node.expression.name.text)) {
        expressionNode = node
        executionForm = node.expression.name.text
      } else if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Promise"
        && ["all", "allSettled"].includes(node.expression.name.text)) {
        expressionNode = node
        executionForm = "promise-all"
      }

      if (expressionNode && executionForm) {
        const enclosedRequests = serviceRequestOperations
          .filter(({ start, end }) => start >= expressionNode.getStart() && end <= expressionNode.getEnd())
          .map(({ operation }) => operation)
        const expressionText = expressionNode.getText().replace(/\s+/g, " ").trim()
        const isPromiseGroup = /\bPromise\.(?:all|allSettled|race|resolve)\s*\(/.test(expressionText)
        const isPromiseChain = ["then", "catch", "finally"].includes(executionForm)
        const isBackgroundPromise = executionForm === "void" && /\.(?:then|catch|finally)\s*\(/.test(expressionText)
        const shouldRecord = executionForm === "await" || executionForm === "promise-all"
          || enclosedRequests.length > 0 || isPromiseGroup || isPromiseChain || isBackgroundPromise
        if (!shouldRecord) {
          node.forEachChild(recordAsyncExpressions)
          return
        }
        const localAsync = /\b(json|text|blob|arrayBuffer|formData|parse|readFile|writeFile|readdir|mkdir|stat|setTimeout|Promise\.resolve|Promise\.race|Promise\.all|Promise\.allSettled|cookies|headers|params)\s*\(/.test(expressionText)
          || /\b(params|paramsPromise|searchParams|searchParamsPromise|getScopedI18n|getI18n|supabaseServer|supabaseRouteHandler|supabaseServerAction|toast\.show|requestKey|persist|storageFailure|responseError|NextResponse\.redirect|Array\.from|Object\.fromEntries|JSON\.stringify|String|Math\.(?:max|min|floor|ceil|round)|Intl\.DateTimeFormat|uniqueCaseInsensitive|normalizeProduct|sortByViews|format(?:Currency|Title|Description|BackupTransfer)|getCookie|twMerge)\b/.test(expressionText)
        const inferredClassification = enclosedRequests.length ? "request-or-provider"
          : localAsync ? "local-or-framework-work" : "needs-review"
        const functionName = getFunctionName(expressionNode)
        const fingerprint = expressionText
        const occurrenceKey = `${sourcePath}:${functionName}:${executionForm}:${fingerprint}`
        const occurrenceIndex = asyncExpressionOccurrences.get(occurrenceKey) ?? 0
        asyncExpressionOccurrences.set(occurrenceKey, occurrenceIndex + 1)
        const operationId = `async-${getStableId(`${occurrenceKey}:${occurrenceIndex}`)}`
        const asyncOperation = {
          operationId,
          operationKind: "async-expression",
          sourcePath,
          line: sourceFile.getLineAndCharacterOfPosition(expressionNode.getStart()).line + 1,
          functionName,
          executionForm,
          classification: inferredClassification,
          requestOperationIds: enclosedRequests.map(operation => operation.operationId),
          dependencyOperationIds: [...new Set(enclosedRequests.flatMap(operation => operation.dependencyOperationIds))],
          fingerprint,
          mapping: null,
          mappingStatus: "unmapped",
        }
        asyncOperation.mapping = getOperationMapping(mappingDocument, asyncOperation)
        if (["request-or-provider", "local-or-framework-work", "background-request", "needs-review"].includes(asyncOperation.mapping?.classification)) {
          asyncOperation.classification = asyncOperation.mapping.classification
          asyncOperation.classificationReason = asyncOperation.mapping.classificationReason ?? null
        }
        asyncOperation.mappingStatus = asyncOperation.mapping ? "mapped" : "unmapped"
        asyncExpressions.push(asyncOperation)
      }
      node.forEachChild(recordAsyncExpressions)
    }

    recordAsyncExpressions(sourceFile)
  }

  const uniqueOperations = [...new Map(inventory.map(operation => [operation.operationId, operation])).values()]
    .sort((firstOperation, secondOperation) => firstOperation.operationId.localeCompare(secondOperation.operationId))

  for (const operation of uniqueOperations) {
    operation.mapping = getOperationMapping(mappingDocument, operation)
    operation.mappingStatus = operation.mapping ? "mapped" : "unmapped"
    operation.scenarioId = operation.mapping?.scenarioId ?? null
    operation.required = operation.mapping?.required ?? ["http-route", "sdk-request", "service-request", "realtime-subscription"].includes(operation.operationKind)
    operation.disposition = operation.mapping?.disposition ?? "not_exercised"
    operation.evidenceStatus = operation.mapping?.disposition ?? "not_exercised"
  }

  const routesByScenario = new Map()
  const sdkRequestIds = uniqueOperations.filter(operation => operation.operationKind === "sdk-request")
    .map(operation => operation.operationId)
  for (const routeOperation of uniqueOperations.filter(operation => operation.operationKind === "http-route" && operation.scenarioId)) {
    const scenarioRoutes = routesByScenario.get(routeOperation.scenarioId) ?? []
    scenarioRoutes.push(routeOperation.operationId)
    routesByScenario.set(routeOperation.scenarioId, scenarioRoutes)
  }
  for (const operation of uniqueOperations) {
    if (operation.dependencyReviewStatus !== "needs_review" || operation.mapping?.dependencyReviewStatus !== "scenario_linked") continue
    const scenarioRouteIds = routesByScenario.get(operation.scenarioId) ?? []
    const wrapperRequestIds = operation.sourcePath === "app/sdk/BaseSDK.ts" ? sdkRequestIds : []
    operation.dependencyOperationIds = [...new Set([...operation.dependencyOperationIds, ...scenarioRouteIds, ...wrapperRequestIds])]
    operation.dependencyScenarioId = operation.scenarioId
    operation.dependencyReviewStatus = "source_linked"
  }

  const uniqueAsyncExpressions = [...new Map(asyncExpressions.map(operation => [operation.operationId, operation])).values()]
    .map(operation => ({
      ...operation,
      scenarioId: operation.mapping?.scenarioId ?? null,
      disposition: operation.mapping?.disposition ?? "not_exercised",
      required: operation.classification !== "local-or-framework-work",
    }))

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).trim(),
    sourceFiles: sourceFiles.length,
    operationCount: uniqueOperations.length,
    routeCount: uniqueOperations.filter(operation => operation.operationKind === "http-route").length,
    requestCount: uniqueOperations.filter(operation => ["service-request", "sdk-request"].includes(operation.operationKind)).length,
    unmappedCount: uniqueOperations.filter(operation => operation.mappingStatus === "unmapped").length,
    dependencyReviewCount: uniqueOperations.filter(operation => operation.dependencyReviewStatus === "needs_review").length,
    asyncSummary,
    asyncExpressionCount: uniqueAsyncExpressions.length,
    unmappedAsyncCount: uniqueAsyncExpressions.filter(operation => operation.mappingStatus === "unmapped").length,
    unclassifiedAsyncCount: uniqueAsyncExpressions.filter(operation => operation.classification === "needs-review").length,
    externalWorkers: mappingDocument.externalWorkers ?? [],
    operations: uniqueOperations,
    asyncExpressions: uniqueAsyncExpressions,
  }
}

function toMarkdown(inventory) {
  const tableRows = inventory.operations.map(operation => {
    const call = operation.method ? `${operation.method} ${operation.route}` : operation.fingerprint
    return `| ${operation.operationId} | ${operation.operationKind} | ${operation.sourcePath}:${operation.line} | ${call.replaceAll("|", "\\|")} | ${operation.mappingStatus} | ${operation.evidenceStatus} |`
  })
  return [
    "# Request inventory",
    "",
    `Source commit: \`${inventory.sourceCommit}\`  `,
    `Generated: ${inventory.generatedAt}  `,
    `Files: ${inventory.sourceFiles}; routes: ${inventory.routeCount}; service requests: ${inventory.requestCount}; unmapped: ${inventory.unmappedCount}.`,
    "",
    `Async expressions scanned: ${inventory.asyncSummary.awaitExpressions} awaits, ${inventory.asyncSummary.returnedCalls} returned calls, ${inventory.asyncSummary.promiseChains} promise chains, ${inventory.asyncSummary.promiseAllGroups} Promise.all groups, ${inventory.asyncSummary.voidCalls} void calls.`,
    `Async expressions recorded: ${inventory.asyncExpressionCount}; unmapped: ${inventory.unmappedAsyncCount}; needing source review: ${inventory.unclassifiedAsyncCount}; subscriptions: ${inventory.asyncSummary.subscriptionCalls}.`,
    `Provider/realtime calls needing a link to their caller: ${inventory.dependencyReviewCount}.`,
    "",
    "Every HTTP route and detected service request begins as unexercised. A source match is not runtime coverage.",
    "",
    "| Operation ID | Kind | Source | Expression | Mapping | Evidence |",
    "| --- | --- | --- | --- | --- | --- |",
    ...tableRows,
    "",
    "## Await expressions and background work",
    "",
    "Each await, returned call, promise chain, background call, and Promise.all group is listed. A source classification is not runtime evidence.",
    "",
    "| Operation ID | Source | Classification | Request dependencies | Mapping |",
    "| --- | --- | --- | --- | --- |",
    ...inventory.asyncExpressions.map(operation => `| ${operation.operationId} | ${operation.sourcePath}:${operation.line} | ${operation.classification} | ${(operation.requestOperationIds ?? []).join(", ") || "—"} | ${operation.mappingStatus} |`),
    "",
    "## External workers",
    "",
    ...(inventory.externalWorkers.length
      ? inventory.externalWorkers.map(worker => `- ${worker.name}: ${worker.evidenceStatus ?? "not_exercised"} — ${worker.evidence ?? "evidence required"}`)
      : ["- No external worker mapping is configured." ]),
    "",
  ].join("\n")
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const inventory = await buildRequestInventory()
  await mkdir(artifactDirectory, { recursive: true })
  await writeFile(path.join(artifactDirectory, "request-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`)
  await writeFile(path.join(artifactDirectory, "request-inventory.md"), toMarkdown(inventory))
  console.log(JSON.stringify({
    sourceFiles: inventory.sourceFiles,
    operations: inventory.operationCount,
    routes: inventory.routeCount,
    serviceRequests: inventory.requestCount,
    unmapped: inventory.unmappedCount,
    output: artifactDirectory,
  }, null, 2))
}
