"use strict"

// An error message the user reads has to answer 3 questions: what actually failed, what they lost
// because of it, and what to do now. "Unexpected system error." answers none of the 3 - the user
// sees a wall with no handle on it and the only step left is guessing.
//
// Bad:
//   setErrorMessage("Unexpected system error.")
//   toast.show("error", "Failed to fetch raw JSON data", "")
// Good:
//   setErrorMessage("Internet connection lost. DNC results not fetched. Please retry or contact support")
//   toast.show("error", "Internet connection lost", "Emails not fetched - please retry or contact support")
//
// Fires on the 3 places a user actually reads an error in this codebase:
//   1. the 5-states error state - setError / setErrorMessage / setLocalError / setPhoneError (any
//      set<Something>Error<Something> name), see require-5-states
//   2. toast.show("error", title, description) - the toast renders both halves at once, so they are
//      read as ONE message here: a next step in either half counts for the whole thing
//   3. JSX styled className="text-danger" - <p className="text-danger">Something went wrong</p>,
//      including a {message ? message : "..."} fallback the way NoCodeFoundError.tsx reads it
//
// 3 checks, reported highest-priority-first so one call site produces one message, never three:
//   1. fillerMessage  - the whole message is filler ("something went wrong", "unknown error")
//   2. developerTerm  - it shows a word out of the code, not out of the user's world (JSON, null,
//      connectionRef, NEXT_PUBLIC_WS_URL)
//   3. noNextStep     - nothing in it says what to do (retry / reload the page / contact support /
//      the exact value to enter)
//
// Only STATIC text gets checked - a `${}` interpolation or a variable (error.message, response) is
// whatever the server returned at runtime and this rule has no way to read it. A toast whose
// description is a variable still gets checks 1 and 2 on its static title (filler is filler either
// way) but skips check 3 - the runtime half is exactly where a server's own next step would sit.

// Filler: the message names no real cause, so rewriting the words around it changes nothing - the
// whole sentence has to be replaced with what actually failed. `oc+ur+ed` on purpose: "occured" and
// "occcured" are both already in this codebase's own messages, and a typo is still filler.
const FILLER_PHRASES = [
  /\bunexpected (system |server )?(error|failure)\b/,
  /\bsomething went wrong\b/,
  /\berror\s+(has\s+)?oc+ur+ed\b/,
  /\b(an?|the)\s+(unknown|unexpected)\s+error\b/,
  /\bunknown error\b/,
  /\binternal (server )?error\b/,
  /\b(operation|request|action) failed\b/,
  /\bfailed unexpectedly\b/,
]

// The entire message is one bare word - no cause, no effect, no step out. Checked separately from
// FILLER_PHRASES because "error"/"failed" ALONE is filler while "Error checking attachments" at
// least names the thing that failed (that one lands on noNextStep instead, a smaller rewrite).
const FILLER_WHOLE_MESSAGES = new Set(["error", "error!", "failed", "failure", "unknown", "invalid", "critical", "warning"])

// Words the user has no idea about because they only exist in the code or the infrastructure. Kept
// tight on purpose - each one here would be gibberish on screen to someone who just wants their
// emails. Deliberately NOT in this list:
//   - "lambda" / "SID" / "API key" - real labels this app puts on screen (LambdaControlPanel, the
//     Twilio setup fields), so a message naming them is speaking the user's own vocabulary
//   - "email"/"account"/"subscription" - the user's world already, that's the whole point
const DEVELOPER_TERMS = [
  "json",
  "xml",
  "http",
  "https",
  "websocket",
  "socket",
  "endpoint",
  "payload",
  "null",
  "undefined",
  "nan",
  "regex",
  "sql",
  "redis",
  "supabase",
  "dynamodb",
  "s3",
  "stack trace",
  "promise",
  "callback",
  "mutex",
  "boolean",
  "enum",
  "props",
  "dom",
  "response body",
  "request body",
  "status code",
]

// A code identifier pasted straight into the message - "connectionRef not found to mute",
// "Missing NEXT_PUBLIC_BACKEND_BEARER". camelCase has to START at a word boundary with a lowercase
// letter, so a product name that merely holds an inner capital (TwiML, PayPal) never trips it.
const CAMEL_CASE_IDENTIFIER = /\b[a-z][a-z0-9]*[A-Z][A-Za-z0-9]*\b/
const ENV_VAR_IDENTIFIER = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/

// A QUOTED identifier is the opposite of leaked code - it's the exact text the user has to type,
// which is the best kind of next step there is (`CSV column must be "zerobounceAPIKey"`). Quotes are
// the signal, so an unquoted one still fires and the fix is to quote it, which is what tells the
// user it's a value rather than a word. Only the identifier patterns skip quoted text - a word off
// DEVELOPER_TERMS is gibberish to the user quoted or not.
const QUOTED_VALUE = /"[^"]*"|'[^']*'|`[^`]*`/g

// The step out of the error, in the user's hands. A message holding one of these gives them
// something to do; a message without one leaves them holding a fact and nothing else. Matched on
// word boundaries, so "Wait!" counts and "settings"/"user"/"address" never stand in for
// "set"/"use"/"add". The base verb form only - "Error deleting metric" is the system reporting,
// "Delete the row first" is the user's move.
// "must"/"required" count - "End hour must be after start hour" IS the instruction, phrased as the
// rule. "please" counts - every "please X" in this codebase is followed by a real action.
const NEXT_STEP_WORDS = [
  "retry",
  "try again",
  "reload",
  "refresh",
  "contact support",
  "contact us",
  "contact",
  "report",
  "check",
  "select",
  "choose",
  "pick",
  "open",
  "edit",
  "enter",
  "type",
  "write",
  "fill",
  "add",
  "remove",
  "delete",
  "rename",
  "upload",
  "download",
  "resend",
  "verify",
  "confirm",
  "cancel",
  "close",
  "sign in",
  "log in",
  "re-login",
  "upgrade",
  "wait",
  "must",
  "required",
  "use",
  "set",
  "change",
  "fix",
  "connect",
  "reconnect",
  "restart",
  "switch",
  "enable",
  "disable",
  "allow",
  "update",
  "please",
]

// "Failed to select accounts" and "Error checking attachments" report what the SYSTEM tried, not
// what the user should do - the verb right behind "failed to"/"error" belongs to the code, so it
// comes out before the next-step scan. Without this, "Failed to select accounts" would read as if
// it were telling the user to select something and the message would pass with no step in it at all.
const SYSTEM_ACTION_PHRASE = /\b(?:failed|fails|failure|unable|error|errors)\s+(?:to\s+)?[a-z]+/g

// set<Something>Error<Something> - setError, setLocalError, setErrorMessage, setPhoneError,
// setAccountSidError. The name is what makes this an error the user reads, not the file it sits in.
const ERROR_SETTER_NAME = /^set[A-Za-z0-9]*Error[A-Za-z0-9]*$/

// The 3rd place a user reads an error, next to the setter state and the toast: JSX painted in the
// error color. `text-danger` is this codebase's own convention for it - EmailLinkInvalidOrExpired.tsx,
// AuthNotCompleted.tsx, NoCodeFoundError.tsx, ExchangeCookiesError.tsx, global-error.tsx all use it for
// exactly this and nothing else. A className check, not a component-name check, because the text sits
// directly in a <p>/<div>/<h1> - there is no dedicated ErrorMessage component in this codebase.
const TEXT_DANGER_CLASS = /\btext-danger\b/

// A string this rule can actually read at lint time: a string literal, or a template literal with
// zero `${}` in it (same text, backticks only for the newlines).
function getStaticText(node) {
  if (!node) return null
  if (node.type === "Literal" && typeof node.value === "string") return node.value
  if (node.type === "TemplateLiteral" && node.expressions.length === 0) return node.quasis[0].value.cooked
  return null
}

function isErrorSetterCall(node) {
  return node.callee.type === "Identifier" && ERROR_SETTER_NAME.test(node.callee.name)
}

// toast.show("error", title, description) - also matches useToast.getState().show("error", ...),
// since both end in a `.show(` whose first argument is the literal "error".
function isErrorToastCall(node) {
  const callee = node.callee
  if (callee.type !== "MemberExpression" || callee.computed) return false
  if (callee.property.type !== "Identifier" || callee.property.name !== "show") return false
  return getStaticText(node.arguments[0]) === "error"
}

// The argument nodes holding what the user ends up reading - one for a setter, title + description
// for a toast. Everything else about the call (the "error" kind, a duration) is not a message.
function getMessageArguments(node) {
  if (isErrorSetterCall(node)) return node.arguments.slice(0, 1)
  if (isErrorToastCall(node)) return node.arguments.slice(1, 3)
  return null
}

function findDeveloperTerm(lowercasedText, rawText) {
  const term = DEVELOPER_TERMS.find(developerTerm => new RegExp(`\\b${developerTerm}\\b`).test(lowercasedText))
  if (term) return term
  const unquotedText = rawText.replace(QUOTED_VALUE, " ")
  const identifierMatch = ENV_VAR_IDENTIFIER.exec(unquotedText) || CAMEL_CASE_IDENTIFIER.exec(unquotedText)
  return identifierMatch ? identifierMatch[0] : null
}

function hasNextStep(lowercasedText) {
  const userFacingText = lowercasedText.replace(SYSTEM_ACTION_PHRASE, " ")
  return NEXT_STEP_WORDS.some(word => new RegExp(`\\b${word}\\b`).test(userFacingText))
}

// Long messages get cut in the report itself - the point of quoting the text back is recognizing
// WHICH message is meant, and the first 70 characters already do that.
function forReport(text) {
  return text.length > 70 ? `${text.slice(0, 70)}...` : text
}

// className="text-danger text-center" (a Literal) or className={`... ${x} ...`} (a template literal,
// dynamic classes and all - a name check only needs the parts that don't move).
function getClassNameText(jsxOpeningElement) {
  const classNameAttribute = jsxOpeningElement.attributes.find(
    attribute => attribute.type === "JSXAttribute" && attribute.name.name === "className",
  )
  if (!classNameAttribute || !classNameAttribute.value) return ""
  const { value } = classNameAttribute
  if (value.type === "Literal" && typeof value.value === "string") return value.value
  if (value.type === "JSXExpressionContainer" && value.expression.type === "TemplateLiteral") {
    return value.expression.quasis.map(quasi => quasi.value.cooked).join(" ")
  }
  return ""
}

// The static text a JSXElement's own children hold - a bare JSXText node, or one string side of a
// {message ? message : "No code found to exchange cookies for session"} fallback (NoCodeFoundError.tsx,
// ExchangeCookiesError.tsx both read this way: a prop when there is one, a hardcoded message when there
// isn't). Anything else in a JSXExpressionContainer (a prop by itself, {t(...)}, {error.message}) is a
// runtime value this rule has no way to read, same as a variable argument to a setter or a toast.
function getJSXStaticParts(jsxElement) {
  const staticParts = []
  let hasRuntimePart = false
  for (const child of jsxElement.children) {
    if (child.type === "JSXText") {
      if (child.value.trim().length > 0) staticParts.push({ node: child, text: child.value.trim() })
      continue
    }
    if (child.type !== "JSXExpressionContainer") continue
    const { expression } = child
    if (expression.type === "ConditionalExpression") {
      const consequentText = getStaticText(expression.consequent)
      const alternateText = getStaticText(expression.alternate)
      if (consequentText !== null) staticParts.push({ node: expression.consequent, text: consequentText.trim() })
      else hasRuntimePart = true
      if (alternateText !== null) staticParts.push({ node: expression.alternate, text: alternateText.trim() })
      else hasRuntimePart = true
      continue
    }
    const staticText = getStaticText(expression)
    if (staticText !== null) staticParts.push({ node: expression, text: staticText.trim() })
    else hasRuntimePart = true
  }
  return { staticParts: staticParts.filter(part => part.text.length > 0), hasRuntimePart }
}

// The 3 checks (filler/developer-term/no-next-step), reported highest-priority-first, shared by every
// place a user reads an error - a setter call, a toast call, or text-danger JSX.
function checkStaticParts(context, staticParts, hasRuntimePart) {
  if (staticParts.length === 0) return

  const text = staticParts.map(part => part.text).join(" ")
  const lowercasedText = text.toLowerCase()
  const reportNode = staticParts[0].node

  const isWholeMessageFiller = FILLER_WHOLE_MESSAGES.has(lowercasedText.replace(/[.!\s]+$/, ""))
  if (isWholeMessageFiller || FILLER_PHRASES.some(phrase => phrase.test(lowercasedText))) {
    return context.report({ node: reportNode, messageId: "fillerMessage", data: { text: forReport(text) } })
  }

  const developerTerm = findDeveloperTerm(lowercasedText, text)
  if (developerTerm) {
    return context.report({ node: reportNode, messageId: "developerTerm", data: { text: forReport(text), term: developerTerm } })
  }

  // The next-step check needs the WHOLE message in hand - when part of it is a runtime value, the
  // step out could be sitting in the part this rule never gets to read.
  if (hasRuntimePart) return
  if (!hasNextStep(lowercasedText)) {
    context.report({ node: reportNode, messageId: "noNextStep", data: { text: forReport(text) } })
  }
}

module.exports = {
  "no-vague-error-msg": {
    meta: {
      type: "problem",
      docs: {
        description: "require a user-facing error message to name what failed, what it cost the user, and what to do now",
      },
      schema: [],
      messages: {
        fillerMessage:
          'Error message "{{text}}" says nothing the user can act on - name what actually failed, what they lost, and what to do now (e.g. "Internet connection lost. Emails not fetched. Please retry or contact support").',
        developerTerm:
          'Error message "{{text}}" shows "{{term}}" - a word out of the code, not out of the user\'s world. Rewrite it in what they see on screen (e.g. "Internet connection lost. Emails not fetched. Please retry or contact support").',
        noNextStep:
          'Error message "{{text}}" never says what to do next - end it with the step out: retry, reload the page, contact support, or the exact value to enter.',
      },
    },
    create(context) {
      return {
        CallExpression(node) {
          const messageArguments = getMessageArguments(node)
          if (!messageArguments || messageArguments.length === 0) return

          // Every readable half, plus whether any half is a runtime value. An empty string is a
          // reset (setErrorMessage("") clears the error state), not a message - it counts as
          // neither, so clearing the state stays silent.
          const staticParts = []
          let hasRuntimePart = false
          for (const messageArgument of messageArguments) {
            const staticText = getStaticText(messageArgument)
            if (staticText === null) hasRuntimePart = true
            else if (staticText.trim().length > 0) staticParts.push({ node: messageArgument, text: staticText.trim() })
          }
          checkStaticParts(context, staticParts, hasRuntimePart)
        },

        // <p className="text-danger">Something went wrong</p> - the 3rd place a user reads an error,
        // next to the setter state and the toast. Only the element's OWN text children are read, not
        // nested elements' text - a <p className="text-danger"><Link>retry</Link></p> would otherwise
        // get the child's text checked twice, once here and once at the child's own JSXOpeningElement.
        JSXOpeningElement(node) {
          if (!TEXT_DANGER_CLASS.test(getClassNameText(node))) return
          const jsxElement = node.parent
          const { staticParts, hasRuntimePart } = getJSXStaticParts(jsxElement)
          checkStaticParts(context, staticParts, hasRuntimePart)
        },
      }
    },
  },
}
