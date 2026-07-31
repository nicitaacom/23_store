"use strict"

const path = require("path")

const { findAppRoot } = require("./utils/sharedFolderBuckets")
const { getRouteGroupAliases } = require("./utils/routeGroupAliases")
const { getOwnerKey } = require("./utils/routeScopedOwner")

// A route group ((routes)/<feature>/...), a widget (widgets/<Name>/...), or a module
// (modules/<Name>/...) is a self-contained feature - going DEEP inside your OWN one of these is
// always fine, however many folders down, but reaching into a DIFFERENT one's own files at all -
// store, hooks, actions, components, anything past its own 2 identifying segments - is reaching
// for something HIGH-level (owned by that other feature, not meant to be shared) when a genuinely
// LOW-level, reusable thing (app/components/shared/Button.tsx, a flat app/store/useXxx.ts with no
// feature sub-grouping, app/utils/xxx.ts, etc) would do instead. None of these 3 kinds have a
// sanctioned way to reach past their own name from outside except a widget/module's own index.ts
// (see import-encapsulated-module-widget, which owns the "@/widgets/X"/"@/modules/X" alias-import
// case) - a RELATIVE-path reach past a widget/module's own 2 segments is this rule's own job,
// since import-encapsulated-module-widget only ever looks at "@/widgets/..."/"@/modules/..."
// sources, never a relative "../../Modals/AccountModal/..." climb.
//
// Bad (Navbar.tsx, 3 folders deep under modules/EnvWrapper/, reaching 7 folders deep into a
// DIFFERENT module's own tab-specific component by relative path):
//   import { VpsStatsChart } from "../../Modals/AccountModal/AccountTabs/AccountSettingsTab/components/VpsStatsChart/VpsStatsChart"
// Good (VpsStatsChart promoted to its own top-level module, imported through its own front door):
//   import { VpsStatsChart } from "@/modules/VpsStatsChart"
//
// The direction is symmetric - a generic, low-level file reaching INTO a feature is the same
// mistake as one feature reaching into another:
//
// Bad (a generic components/ file reaching into a specific feature's own components/):
//   app/components/SendEmailButton.tsx imports app/(routes)/emails/components/...
// Bad (one feature's module reaching into a DIFFERENT feature's own store):
//   import { useSecretKey } from "@secret-key/store/useSecretKey"
// Good (the DEPENDENCY direction reversed - a feature reaching OUT to something low-level/shared,
// or something the feature doesn't own is instead hoisted OUT to where it's actually reusable):
//   app/(routes)/emails/components/... imports app/components/shared/Button.tsx
//   app/(routes)/emails/components/... imports app/components/SendEmailButton.tsx (SendEmailButton
//     itself was moved OUT to the generic app/components/ because it's reused outside /emails too)
//
// A widget/module TARGET reached via its own "@/widgets/X"/"@/modules/X" absolute alias is
// import-encapsulated-module-widget's job instead (it additionally understands each one's own
// index.ts public API, a concept route groups don't have) - checking that shape here too would
// just re-report the same file twice with two different messages, the same "single-importer
// suppression" reasoning no-single-importer already documents for require-isolated-module-folder.
// A RELATIVE-path reach into a widget/module target is this rule's own job (see the
// isAbsoluteWidgetOrModuleImport check below) - getOwnerKey treats an "umbrella" widget/module
// (Modals, AIDecisions, etc) as 3 segments deep (its own real child, e.g. "modules/Modals/
// AccountModal"), not 2, so a relative reach from one umbrella child into a DIFFERENT one is
// caught the same as any other cross-feature reach - see routeScopedOwner.js's own getOwnerKey
// comment for the concrete before/after.
//
// Three cases this rule does not fire on, all real architecture in this codebase:
// 1. Type-only imports (`import type`) - a TS type is erased at compile time, it creates no
//    runtime coupling the way importing a live store/action/component does, and sharing type
//    definitions across features is normal, expected, and already how this codebase works
//    (see api/emails/api.d.ts and friends).
// 2. An app/api/<folder> importer whose OWN top-level folder name is literally the same name as
//    a route group's own alias (app/api/emails/** <-> "@emails", the SAME tsconfig.json alias
//    getRouteGroupAliases already reads) - that api folder genuinely IS that feature's own data
//    layer, so reaching into "@emails/..." from inside app/api/emails/** is the normal, expected
//    relationship (api-folder-owning-feature.js documents the same "app/api/emails/ belongs to
//    the emails feature" idea). An api folder whose name does NOT match any route-group alias
//    (app/api/social/**, no "@social" alias exists - the real feature is "@publish") gets checked
//    exactly like any other importer instead - reaching 2+ segments into a DIFFERENT feature's own
//    store/consts (app/api/social/channels/route.ts importing "@publish/store/const/
//    initialSocialChannels") is exactly the cross-feature reach this rule exists to catch, api/
//    route or not. This is a plain name match against tsconfig's own real aliases, never a
//    hand-typed "this api folder belongs to that feature" guess (see api-folder-owning-feature.js's
//    own DECIDED AGAINST entry in dev_readme-eslint.md for why that guessing approach is rejected).
// 3. Any importer whose own path has a "*Modal"/"*Modals" segment (DeleteEmailAccountModal/,
//    AreYouSureModals/, etc.) - a modal can be opened from anywhere in the app, so unlike a normal
//    route-scoped file it genuinely needs to reach into whichever feature's state it's confirming/
//    editing/re-verifying (e.g. EADeletionConfirmation.tsx re-checking secret-key credentials
//    before letting an account-deletion modal proceed). Decided 2026-07-17 after finding every
//    real cross-feature reach flagged in this codebase traced back to a modal file.
// 4. ModalsProvider.tsx and ScreensProvider.tsx (app/components/Providers/) - their whole job is
//    rendering every modal/screen in the app, so importing each one by name is exactly what they
//    exist to do (the same reasoning as case 3, from the other side: case 3 is a file living
//    INSIDE a modal, case 4 is the file that RENDERS every modal). Listed by exact file path, not
//    the whole Providers/ folder - ToastProvider.tsx (same folder) only touches the shared toast
//    store and stays checked normally, same shape as no-effect-in-large-component.js's own
//    EXEMPT_FILE_SUFFIXES list. Decided 2026-07-19.
// 5. Any importer whose own path has a "*Screen"/"*Screens" segment (VerificationEnvsScreen/,
//    LambdaSetupScreen/, the modules/Screens/ bucket itself) - same reasoning as case 3, for
//    Screens instead of Modals: a Screen is a full-page surface shown from anywhere in the app, so
//    it genuinely needs to reach into whichever feature's state it's presenting (e.g.
//    VerificationEmailsPanel.tsx, inside modules/Screens/VerificationEnvsScreen/, calling
//    useCtrlZEmails from (routes)/emails/modules/ScheduledTab). Decided 2026-07-23.
//
// Not autofixable - moving the target to a real shared location (or exposing it some other
// sanctioned way) is a design decision, not a mechanical rewrite.
const COMPOSITION_ROOT_IMPORTER_FILE_SUFFIXES = [
  "/app/components/Providers/ModalsProvider.tsx",
  "/app/components/Providers/ScreensProvider.tsx",
  "/app/providers/ModalsQueryProvider.tsx",
]

function isCompositionRootImporter(filename) {
  return COMPOSITION_ROOT_IMPORTER_FILE_SUFFIXES.some(suffix => filename.endsWith(suffix))
}
function isRelativeImport(source) {
  return source.startsWith("../") || source === ".." || source.startsWith("./") || source === "."
}

// Matches a path segment ending in "Modal" or "Modals" (DeleteEmailAccountModal,
// AreYouSureModals, AddEAModal, etc) - see the case-3 skip note above.
const MODAL_PATH_SEGMENT = /Modals?$/

// Same reasoning as modals (case 3), from the Screens side: a Screen (VerificationEnvsScreen,
// LambdaSetupScreen, the modules/Screens/ bucket itself) is a full-page surface that can be shown
// from anywhere in the app, so it genuinely needs to reach into whichever feature's state it's
// presenting - unlike a normal route-scoped file. Decided 2026-07-23 after VerificationEmailsPanel
// (inside modules/Screens/VerificationEnvsScreen/) needed useCtrlZEmails from
// (routes)/emails/modules/ScheduledTab.
const SCREEN_PATH_SEGMENT = /Screens?$/

// True if the importer itself lives inside (or is named as) a modal - checks every directory
// segment plus the file's own basename, since some modals sit as a flat file directly inside a
// same-named-suffix parent (UpdateEmailUsernameModal.tsx inside AreYouSureModals/) while others
// get their own folder (EADeletionConfirmation.tsx inside DeleteEmailAccountModal/).
function isModalImporter(ownSegments, filename) {
  if (ownSegments.some(segment => MODAL_PATH_SEGMENT.test(segment))) return true
  return MODAL_PATH_SEGMENT.test(path.basename(filename, path.extname(filename)))
}

// Same shape as isModalImporter, for the Screens exception above.
function isScreenImporter(ownSegments, filename) {
  if (ownSegments.some(segment => SCREEN_PATH_SEGMENT.test(segment))) return true
  return SCREEN_PATH_SEGMENT.test(path.basename(filename, path.extname(filename)))
}

// The imported thing's own name(s) - what the importer is actually reaching for, e.g.
// "useSecretKey" - shown in the message so "specific thing X, general place Y" both name real
// identifiers, not just paths.
function getImportedNames(node) {
  return node.specifiers.map(specifier => specifier.local.name).join(", ")
}

// A trailing "index" segment IS the target's own front door (its index.ts), not a reach past it -
// "../../VpsStatsChart/index" resolves to the exact same real file as the bare "@/modules/
// VpsStatsChart" the `<= 2` check below already allows, so it must not count as a 3rd segment.
// The absolute "@/widgets/X"/"@/modules/X" alias form never even reaches this far (skipped
// separately below, deferred to import-encapsulated-module-widget) - this only matters for the
// RELATIVE-path spelling of the same front-door import, which that other rule can't see at all
// (it only resolves the "@/" alias form).
function stripIndexSegment(segments) {
  const last = segments[segments.length - 1]
  return last === "index" ? segments.slice(0, -1) : segments
}

function resolveImportToSegments(source, importerFilename, appRoot, aliasToFeatureKey) {
  if (isRelativeImport(source)) {
    const resolved = path.resolve(path.dirname(importerFilename), source)
    return stripIndexSegment(path.relative(appRoot, resolved).split(path.sep))
  }
  if (source.startsWith("@/")) return source.slice(2).split("/")

  const aliasMatch = /^(@[^/]+)\/(.*)$/.exec(source)
  if (!aliasMatch) return null
  const [, alias, rest] = aliasMatch
  const featureKey = aliasToFeatureKey[alias]
  if (!featureKey) return null
  return [...featureKey.split("/"), ...rest.split("/")]
}

module.exports = {
  "no-high-level-import": {
    meta: {
      type: "problem",
      docs: {
        description:
          "disallow importing a file from outside a route group/widget/module by relative path past its own 2 identifying segments - only a genuinely low-level, shared import is allowed across that boundary",
      },
      schema: [],
      messages: {
        highLevelImport:
          'LOW-level "{{importerPath}}" uses a HIGH-level import "{{source}}" - like using something specific inside something meant to stay abstract. "{{importedName}}" is specific to "{{targetFeature}}", but this file sits in a lower-level, more abstract/reusable location.\n\n' +
          'Only a LOW-level, genuinely abstract (reusable) import (e.g. "@/components/shared/Button") is allowed inside a HIGH-level file like "{{targetFeature}}/...".\n\n' +
          "⚠️ Editing a low-level import is more dangerous than editing a high-level one - it will affect the entire website (see the architecture video linked in the root dev_readme.md).",
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      const appRoot = findAppRoot(filename)
      if (!appRoot) return {}

      const ownSegments = path.relative(appRoot, path.dirname(filename)).split(path.sep)
      if (isModalImporter(ownSegments, filename)) return {}
      if (isScreenImporter(ownSegments, filename)) return {}
      if (isCompositionRootImporter(filename)) return {}

      const aliases = getRouteGroupAliases(appRoot)
      const aliasToFeatureKey = {}
      for (const [featureKey, alias] of Object.entries(aliases)) aliasToFeatureKey[alias] = featureKey

      // An app/api/<folder> file's "feature" is whichever route group shares its folder name via
      // tsconfig's own alias (app/api/emails/** -> "@emails" -> "(routes)/emails") - see case 2
      // above. No match (app/api/social/**, no "@social" alias) means null, same as any other
      // importer with no recognized owner - every cross-feature check below already handles null
      // correctly (targetFeature !== null always fails the equality/ancestor checks against it).
      const ownFeature = ownSegments[0] === "api" ? (aliasToFeatureKey[`@${ownSegments[1]}`] ?? null) : getOwnerKey(ownSegments, appRoot)

      return {
        ImportDeclaration(node) {
          if (node.importKind === "type") return

          const source = node.source.value
          const targetSegments = resolveImportToSegments(source, filename, appRoot, aliasToFeatureKey)
          if (!targetSegments) return

          const targetFeature = getOwnerKey(targetSegments, appRoot)
          if (!targetFeature) return
          if (targetFeature === ownFeature) return

          // The target's owner is an ANCESTOR of my own owner (e.g. importer owned by
          // "widgets/Notifications/NotificationRules", target owned by "widgets/Notifications" -
          // the umbrella's own top-level bucket, sitting outside any single named child). That's
          // the same "reaching OUT to something more general/shared" shape this rule already
          // treats as fine (the emails->components/shared/Button example above), not a cross-
          // feature reach - a widget's own children are always allowed to use what sits at the
          // widget's own level, one folder up from their own boundary.
          if (typeof ownFeature === "string" && ownFeature.startsWith(`${targetFeature}/`)) return

          // The reverse direction - the target's owner is a DESCENDANT of my own owner (e.g.
          // importer owned by "widgets/Notifications/NotificationRules", target owned by
          // "widgets/Notifications/NotificationRules/NotificationSchedule" - a real nested child ONE
          // level inside my own boundary, per getOwnerKey's own second-level recognition). Reaching
          // INTO my own nested child's files is completely normal internal organization, not a
          // boundary crossing - only a genuine SIBLING (neither a prefix of the other) is a real
          // cross-feature reach. Missed before this - NotificationRules.tsx importing its own
          // NotificationSchedule/NtfcnRuleConfig.tsx got flagged the moment getOwnerKey started
          // giving NotificationSchedule its own distinct owner key.
          if (typeof targetFeature === "string" && targetFeature.startsWith(`${ownFeature}/`)) return

          // A "@/widgets/X/..."/"@/modules/X/..." source reaching past a widget/module's own name
          // is already import-encapsulated-module-widget's job (it understands the index.ts front
          // door, e.g. "@/widgets/X/index" resolves to the SAME thing as the bare "@/widgets/X" -
          // this rule doesn't know that equivalence, so checking this shape here would both
          // double-report the real violations AND false-positive on the index-file spelling
          // itself). This rule only needs to catch the RELATIVE-path version of the same reach.
          const isAbsoluteWidgetOrModuleImport = /^@\/(widgets|modules)\//.test(source)
          if ((targetSegments[0] === "widgets" || targetSegments[0] === "modules") && isAbsoluteWidgetOrModuleImport) return

          // Reaching past the feature's own identifying segments at all - no bucket allow-list,
          // nothing past the bare feature name is a sanctioned "front door" for a route group; for
          // a widget/module the bare name IS its front door (its index.ts), already handled by
          // import-encapsulated-module-widget for the "@/widgets/X"/"@/modules/X" alias form - this
          // check only needs to catch the RELATIVE-path version of the same reach here
          if (targetSegments.length <= targetFeature.split("/").length) return

          const importerPath = ownSegments.concat(path.basename(filename)).join("/")

          context.report({
            node: node.source,
            messageId: "highLevelImport",
            data: { source, targetFeature, importerPath, importedName: getImportedNames(node) },
          })
        },
      }
    },
  },
}
