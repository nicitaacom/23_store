"use strict"

const fs = require("fs")
const path = require("path")

const { findAppRoot } = require("./utils/sharedFolderBuckets")
const { getMainExportLineLoc } = require("./utils/mainExportLoc")
const { getOwnerKey, getExportedNames, findImporterFiles } = require("./utils/routeScopedOwner")
const { DID_YOU_MEAN_EMOJI } = require("./utils/messages")

// A file living inside one NAMED CHILD of an umbrella widget/module (Notifications, Modals,
// AIDecisions, Screens, AreYouSureModals - see import-encapsulated-module-widget's own header
// comment for what "umbrella" means here) implicitly promises it belongs to that child alone -
// app/widgets/Notifications/NotificationEnvs/hooks/useSetNotifySchedules.ts reads as "a
// NotificationEnvs concern." This rule checks who ACTUALLY imports it and reports when reality
// disagrees - but ONLY compares against that SAME umbrella's OTHER named children (e.g.
// NotificationRules, a sibling of NotificationEnvs under the SAME Notifications umbrella), never
// against unrelated parts of the app. A completely different umbrella/module/route importing this
// file is already no-high-level-import's/import-encapsulated-module-widget's own concern, not
// this rule's - conflating the two produced ~100 false positives across totally unrelated features
// the first time this rule was tried unscoped (every AccountModal tab, every AIDecisions screen)
// before this constraint was added. Scoped to files sitting in an implementation bucket (hooks/
// actions/functions/utils/store/stores/consts/types/interfaces) at least one folder below the
// child's own boundary - a child's own MAIN component (NotificationRules.tsx, WarmUpTab.tsx) is
// expected to be referenced from all kinds of unrelated places (tab switchers, type enums,
// breadcrumbs) and saying nothing about misplacement, so it's out of scope entirely.
//
// import-encapsulated-module-widget already catches the SAME reach for actions/functions/hooks/
// utils files - this rule deliberately overlaps there (a second, more specific message pointing at
// WHERE the file should move IS more useful, not noise), but it's the only rule that also covers
// stores/consts/types reached the same way, since import-encapsulated-module-widget's own bucket
// list never included those.
//
// Five distinct answers, decided by WHO (among this SAME umbrella's siblings) actually imports it:
//
// 0. No importer ANYWHERE in the repo (not even its own child) -> this export looks unused, full
//    stop - report it. findImporterFiles already greps the WHOLE repo (excluding the file's own
//    declaration), so "zero hits" means no other file references it by name at all, not just no
//    sibling reach. This is a heuristic (bare word-boundary grep, not a real import graph) - a
//    dynamic import, a type-only re-export elsewhere, or a name that also happens to appear in a
//    comment/string can hide the real usage or produce one; suppress with a comment if it fires on
//    a genuine one.
//
// 1. No sibling-child importer, but at least one real importer somewhere (its own child, or
//    outside the umbrella entirely) -> silent. Genuinely private to its own child, exactly where
//    it should be. This is the common case - most files never get reported.
//
// 2. Exactly ONE sibling child imports it, and NO file inside its own current child does -> it was
//    never actually this child's own file. Move it to live beside its one real owner.
//    Bad:  app/widgets/Notifications/NotificationEnvs/hooks/useSetNotifySchedules.ts
//          (only real importer: NotificationRules/NotificationSchedule/NtfcnRuleConfig.tsx)
//    Good: app/widgets/Notifications/NotificationRules/NotificationSchedule/hooks/useSetNotifySchedules.ts
//    (mirrors setRedisSpamCheckEmailsAction's move into its one real caller's own api route folder)
//
// 3. 2+ DIFFERENT sibling children need it, and its own child does NOT -> still a genuinely shared
//    concept born inside the wrong child by accident, but there's no single destination to move it
//    beside either. Move it (and any close relatives - its own store/type) into app/features/<name>/,
//    a real low-level home every sibling can reach via `@/features/<name>/...` without any one of
//    them owning the other. See dev_readme-eslint.md's "SOP: fixing a deep cross-feature type/value
//    import" for the full worked example (TVerificationEnvsDB) and exactly how to do the move.
//
// 4. Its own child ALSO uses it, AND 1+ sibling children reach into it too -> moving the whole file
//    anywhere would break its own child, so relocating it isn't the fix. Usually only PART of what
//    it exports is actually the sibling's concern - report exactly which destructured fields each
//    sibling pulls out (parsed straight from the call site, e.g. `const { isBlastingMode } =
//    useAccountModal()`) and suggest splitting just those into the sibling's own store instead.
//    Bad:  app/modules/Modals/AccountModal/store/useAccountModal.ts
//          (used inside AccountModal itself; FollowUpModal/FollowUpScheduleContent.tsx destructures
//          isBlastingMode from it)
//    Good: extract isBlastingMode into app/modules/Modals/FollowUpModal/stores/useFollowUpModal.ts -
//    a modal reading another modal's own state is the actual signal here, not the file's location
//    (see dev_readme-eslint.md's "SOP: fixing a deep cross-feature type/value import"'s sibling
//    section, or if it's exception of wrong - document it instead of blindly trusting this rule)
//
// Bad (a bucket file, sibling-child reach - fires):
//   app/widgets/SomeUmbrella/ChildA/store/useSharedThing.ts, only ever used from ChildB's own files
// Good (a child's own MAIN component, out of scope regardless of who references it):
//   app/widgets/SomeUmbrella/ChildA/ChildA.tsx referenced by ChildA's own umbrella index.ts,
//   a tab-switcher enum, breadcrumbs, etc - none of that means ChildA.tsx is misplaced
//
// Not autofixable - deciding which destination (move vs app/features/ vs "it's exception of
// wrong - document it") is a judgment call, not a mechanical transform.
const IMPLEMENTATION_BUCKET_NAMES = new Set([
  "hooks",
  "actions",
  "functions",
  "utils",
  "store",
  "stores",
  "consts",
  "types",
  "interfaces",
])

// A SECOND, separate case this rule also checks - a file sitting in a bare widget/module's OWN
// top-level bucket (2-segment owner, e.g. "modules/EnvWrapper" - not nested inside any named
// child) that has exactly ONE importer, belonging to a completely different top-level
// feature/widget/module. Same underlying signal as
// the umbrella-sibling check above (this file promises "EnvWrapper's own concern" by where it
// sits, but only one unrelated feature actually uses it) - just comparing against the WHOLE repo
// instead of only this umbrella's own other named children, since there's no named child here to
// compare siblings against in the first place.
// Bad:
//   app/modules/EnvWrapper/hooks/actions/setBackupSettingsAction.ts, only ever imported by
//   app/modules/Modals/AccountModal/AccountTabs/BackupTab/hooks/useBackupSettingsHandlers.ts
// Good: app/modules/Modals/AccountModal/AccountTabs/BackupTab/actions/setBackupSettingsAction.ts
// Whether ANY exported thing in this file is referenced anywhere in the repo doesn't depend on
// resolving a scoped feature owner - a file inside a generic top-level bucket
// (app/components/SendEmailForm/AttachButton/hooks/useShowLoadingStep.ts) can be just as unused
// as one inside a widget/module. Checks every directory segment (not just relative to a myOwner
// boundary, which is null for anything under app/components/) - still only implementation-bucket
// files (hooks/actions/functions/utils/store/stores/consts/types/interfaces), never a plain entry
// component, so a route's own page.tsx (never grep-referenced by name, mounted by file-system
// routing) stays out of scope exactly like before.
function pathHasImplementationBucket(appRoot, filename) {
  const dirSegments = path.relative(appRoot, filename).split(path.sep).slice(0, -1)
  return dirSegments.some(segment => IMPLEMENTATION_BUCKET_NAMES.has(segment))
}

// A SECOND way a file can be in scope, alongside pathHasImplementationBucket - a SECONDARY
// self-named-subfolder component (e.g. modules/SendEmailForm/AttachButton/AttachButton.tsx,
// basename matches its own containing folder) whose name is NOT the module's own name. This is
// deliberately narrow: a real umbrella child's own main file (e.g.
// widgets/Notifications/NotificationRules/NotificationRules.tsx) has the EXACT same self-eponymous
// shape but its folder name DOES equal myOwner's own last segment ("NotificationRules" is
// literally what widgets/Notifications/NotificationRules IS) - that case must stay excluded, it's
// the genuinely-expected-broad-reach main component the header comment above already carves out.
// A SECONDARY component's folder name is something else entirely ("AttachButton" inside
// "SendEmailForm") - it was never the module's own eponymous entry point, so the same "who really
// imports this" scrutiny that applies to a hooks/actions/utils file applies here too.
function isSecondarySelfNamedComponent(filename, myOwner) {
  const dirBasename = path.basename(path.dirname(filename))
  const fileBasenameNoExt = path.basename(filename).replace(/\.tsx?$/, "")
  if (dirBasename !== fileBasenameNoExt) return false
  const moduleName = myOwner.split("/").pop()
  return dirBasename !== moduleName
}

function findLastBucketName(appRoot, filename) {
  const dirSegments = path.relative(appRoot, filename).split(path.sep).slice(0, -1)
  for (let i = dirSegments.length - 1; i >= 0; i--) {
    if (IMPLEMENTATION_BUCKET_NAMES.has(dirSegments[i])) return dirSegments[i]
  }
  return null
}

// The importer's own containing folder, with its OWN bucket segment dropped (if its last
// directory segment is itself a recognized bucket like "hooks") - so the suggestion lands next to
// the importer's real feature folder (e.g. ".../BackupTab/"), not inside the importer's own
// "hooks/" bucket specifically.
function getImporterFeatureDir(appRoot, importerFile) {
  const dirSegments = path.relative(appRoot, importerFile).split(path.sep).slice(0, -1)
  if (dirSegments.length > 0 && IMPLEMENTATION_BUCKET_NAMES.has(dirSegments[dirSegments.length - 1])) {
    return dirSegments.slice(0, -1)
  }
  return dirSegments
}

// The importer genuinely belongs to a different top-level feature - not myOwner itself, not
// myOwner's own nested child, and not an ancestor myOwner is nested inside (both of those are
// normal same-feature reach, not misplacement).
function isDifferentTopLevelOwner(myOwner, importerOwner) {
  if (!importerOwner || importerOwner === myOwner) return false
  if (importerOwner.startsWith(`${myOwner}/`)) return false
  if (myOwner.startsWith(`${importerOwner}/`)) return false
  return true
}

// Reads the sibling's own call site(s) straight off disk (these files live outside the one file
// ESLint gave us an AST for) and pulls out exactly which fields it destructures off a hook call
// like `const { isBlastingMode } = useAccountModal()` OR the outside-a-component form `const {
// openModal } = useAccountModal.getState()` - so the report can point at the SPECIFIC field the
// sibling actually needs instead of just saying "someone else uses this file." A selector-style
// call (`useAccountModal(s => s.isBlastingMode)`) won't match this - no-zustand-selector already
// bans that pattern repo-wide, so destructuring is the call shape in practice.
// The `{` MUST be anchored right after "const"/"let" - an unanchored `\{([^}]*?)\}` will happily
// latch onto ANY earlier unmatched `{` with no `}` before the real one (e.g. a function body's own
// opening brace), silently pulling in everything in between as a false "destructured field."
function getDestructuredPropsAtCallSites(fileContent, hookNames) {
  const props = new Set()
  for (const hookName of hookNames) {
    if (!/^use[A-Z]/.test(hookName)) continue
    const callRegex = new RegExp(`(?:const|let)\\s*\\{\\s*([^}]*?)\\s*\\}\\s*=\\s*${hookName}(?:\\.getState\\(\\)|\\(\\))`, "g")
    let match
    while ((match = callRegex.exec(fileContent))) {
      for (const rawField of match[1].split(",")) {
        // keep the STORE's own field name (`foo: bar` -> "foo", the LHS) - "bar" is only this one
        // importer's local alias, and it's the store's own field that actually needs to move; also
        // strip a default (`foo = x` -> "foo")
        const fieldName = rawField.trim().split(":")[0].split("=")[0].trim()
        if (fieldName) props.add(fieldName)
      }
    }
  }
  return props
}

function readFilesJoined(files) {
  return files
    .map(file => {
      try {
        return fs.readFileSync(file, "utf8")
      } catch {
        return ""
      }
    })
    .join("\n")
}

// Every modal/panel-like store in this codebase carries the same open/close mechanics
// (isOpen/openModal/closeModal) - a button anywhere in the app calling `openModal()` to open THIS
// modal is normal and expected, not evidence that the store's OTHER state is misplaced. Without
// this filter, a generic "open the modal" trigger button would count as "evidence" toward moving
// unrelated fields (like isBlastingMode) into app/features/, alongside a Provider/registry file
// (ModalsProvider.tsx etc, matched via the Provider.tsx naming convention) that mounts every modal
// generically and says nothing about any ONE field's placement either.
const MODAL_LIFECYCLE_FIELDS = new Set(["isOpen", "openModal", "closeModal"])

function isGenericModalLifecycleOnlyImporter(file, hookNames) {
  if (/Provider\.tsx?$/.test(file)) return true
  let content
  try {
    content = fs.readFileSync(file, "utf8")
  } catch {
    return false
  }
  const props = getDestructuredPropsAtCallSites(content, hookNames)
  if (props.size === 0) return false // couldn't parse the call site - don't silently hide real evidence
  return [...props].every(prop => MODAL_LIFECYCLE_FIELDS.has(prop))
}

module.exports = {
  "check-importers": {
    meta: {
      type: "suggestion",
      docs: {
        description:
          "check who actually imports an implementation-bucket file living inside one umbrella-widget child, comparing ONLY against that same umbrella's other named children - warn when reality (single sibling owner, or shared across 2+ siblings) disagrees with where it currently lives",
      },
      schema: [],
      messages: {
        noRealImporter:
          '"{{basename}}" exports {{names}} but no other file in the repo references {{itThem}} by name - looks unused, safe to delete (or this grep-based check missed a dynamic import/type-only usage - suppress with a reason if so).',
        singleOutsideOwner:
          '"{{basename}}" lives inside "{{myOwner}}", but its only real importer among "{{umbrellaPrefix}}"\'s own children is "{{owner}}" ({{ownerFiles}}) - it was never actually this child\'s own file. Move it to live beside "{{owner}}" instead (see dev_readme-eslint.md\'s "SOP: fixing a deep cross-feature type/value import").',
        singleExternalOwner:
          '"{{basename}}" lives inside "{{myOwner}}", but its only real importer anywhere is "{{owner}}" ({{ownerFiles}}) - a completely different module, not even a sibling inside "{{umbrellaPrefix}}" - it was never actually "{{myOwner}}"\'s own file. Move it to live beside "{{owner}}" instead.',
        crossFeatureSingleImporter:
          `"{{basename}}" lives inside "{{myOwner}}", but its only importer is "{{importerFile}}" ({{importerOwner}}) - it was never actually shared. ${DID_YOU_MEAN_EMOJI}Did you mean to move it to "{{suggestedPath}}" instead?`,
        sharedAcrossChildren:
          '"{{basename}}" lives inside "{{myOwner}}", but {{reason}} - it\'s a genuinely shared concept born inside the wrong child by accident. Move it (and any close relatives - its own store/type) into "app/features/<name>/" so both sides can reach it without either owning the other (see dev_readme-eslint.md\'s "SOP: fixing a deep cross-feature type/value import"), or if it\'s exception of wrong - document it instead of blindly trusting this rule.',
        usedInternallyAndBySibling: "{{message}}",
      },
    },
    create(context) {
      const filename = context.filename ?? context.getFilename()
      const appRoot = findAppRoot(filename)
      if (!appRoot) return {}

      return {
        Program(node) {
          const sourceCode = context.sourceCode ?? context.getSourceCode()

          const names = getExportedNames(sourceCode)
          if (names.length === 0) return

          const repoRoot = path.dirname(appRoot)
          const myOwner = getOwnerKey(path.relative(appRoot, filename).split(path.sep), appRoot)

          // Case 0 (see header comment) runs independent of myOwner resolving - a generic top-level
          // bucket file (app/components/SendEmailForm/AttachButton/hooks/useShowLoadingStep.ts)
          // never resolves a myOwner at all (getOwnerKey returns null for anything starting in a
          // GENERIC_BUCKET_NAME). In scope either as a plain implementation-bucket file OR as a
          // SECONDARY self-named-subfolder component (see isSecondarySelfNamedComponent) - a child's
          // own MAIN component (myOwner's last segment matches its own folder name) still stays out
          // of scope, expected to be referenced from all kinds of unrelated places. Computed once
          // and reused below (same grep call would otherwise run twice).
          const isPlainImplementationBucketFile = pathHasImplementationBucket(appRoot, filename)
          const isSecondaryComponent = myOwner ? isSecondarySelfNamedComponent(filename, myOwner) : false
          const needsUnusedCheck = isPlainImplementationBucketFile || isSecondaryComponent
          // A widget/module's own index.ts re-exporting this file's name is never real "usage
          // evidence" for ANY case below - it's the barrel doing its job, not a consumption site
          // (same reasoning no-solo-importer.js already applies to index./Provider.tsx files). Left
          // in, it silently inflates "how many importers" for a file living directly at a
          // module's own root (e.g. AttachButton.tsx re-exported one line above from the same
          // module's index.ts) exactly the cases below need to count precisely.
          const importerFiles = needsUnusedCheck
            ? findImporterFiles(names, repoRoot, filename).filter(file => !/^index\.tsx?$/.test(path.basename(file)))
            : null

          if (needsUnusedCheck && importerFiles.length === 0) {
            const basename = path.basename(filename)
            const basenameNoExt = basename.replace(/\.tsx?$/, "")
            const loc = getMainExportLineLoc(node, sourceCode, basenameNoExt)
            context.report({
              loc,
              messageId: "noRealImporter",
              data: { basename, names: names.join(", "), itThem: names.length > 1 ? "them" : "it" },
            })
            return
          }

          if (!myOwner) return
          const myOwnerSegments = myOwner.split("/")

          // out of scope unless this file is a plain implementation-bucket file or a secondary
          // self-named component (see above) - also guarantees importerFiles is non-empty (the
          // block above already returned on empty) - no need to recheck either here.
          if (!isPlainImplementationBucketFile && !isSecondaryComponent) return

          // A bare widget/module (2-segment owner, e.g. "modules/EnvWrapper") has no named child
          // to compare siblings against - check instead whether its ONE importer belongs to a
          // completely different top-level feature (see findLastBucketName/
          // getImporterFeatureDir/isDifferentTopLevelOwner above for the full shape).
          if (myOwnerSegments.length < 3) {
            if (importerFiles.length !== 1) return
            const importerFile = importerFiles[0]
            const importerSegments = path.relative(appRoot, importerFile).split(path.sep)
            const importerOwner = getOwnerKey(importerSegments, appRoot)
            if (!isDifferentTopLevelOwner(myOwner, importerOwner)) return

            const basename = path.basename(filename)
            const basenameNoExt = basename.replace(/\.tsx?$/, "")
            const loc = getMainExportLineLoc(node, sourceCode, basenameNoExt)
            // A secondary self-named component (AttachButton/AttachButton.tsx) isn't a
            // hooks/actions/functions/utils file - findLastBucketName's "actions" fallback would
            // wrongly suggest treating a component like a plain function. Suggest a "components"
            // bucket instead, keeping its own self-named-subfolder shape (so a sibling like
            // AttachButton/actions-deprecated/ still reads as belonging beside it, not orphaned).
            const bucket = isSecondaryComponent && !isPlainImplementationBucketFile ? "components" : (findLastBucketName(appRoot, filename) ?? "actions")
            const suggestedBasename = isSecondaryComponent && !isPlainImplementationBucketFile ? `${basenameNoExt}/${basename}` : basename
            const featureDir = getImporterFeatureDir(appRoot, importerFile).join("/")
            const suggestedPath = `app/${featureDir}/${bucket}/${suggestedBasename}`
            context.report({
              loc,
              messageId: "crossFeatureSingleImporter",
              data: {
                basename,
                myOwner,
                importerOwner,
                importerFile: path.relative(repoRoot, importerFile),
                suggestedPath,
              },
            })
            return
          }

          // ONLY this umbrella's own other named children count - "widgets/Notifications" from
          // "widgets/Notifications/NotificationEnvs", never an unrelated top-level feature
          const umbrellaPrefix = myOwnerSegments.slice(0, 2).join("/")

          let hasInternalImporter = false
          const siblingOwners = new Set()
          const filesBySiblingOwner = new Map()
          // Not this rule's main trigger on their own (see header comment on why unscoped external
          // reach caused ~100 false positives before) - but once a file is ALREADY flagged for a
          // real sibling reason below, showing these too is exactly the "who else imports this"
          // evidence that decides whether the fix is "move beside the sibling" or "give it its own
          // app/features/ store instead" - so track them, don't just silently drop them.
          const externalImporterFiles = []

          for (const importerFile of importerFiles) {
            const importerSegments = path.relative(appRoot, importerFile).split(path.sep)
            const importerOwner = getOwnerKey(importerSegments, appRoot)
            if (importerOwner === myOwner) {
              hasInternalImporter = true
              continue
            }
            const isSameUmbrellaSibling =
              importerOwner !== null && importerOwner.split("/").length >= 3 && importerOwner.startsWith(`${umbrellaPrefix}/`)
            if (isSameUmbrellaSibling) {
              // a sibling that ONLY ever triggers this modal's generic open/close (e.g. a
              // "switch to this modal" navigation handoff) is the exact same non-issue as any
              // random button elsewhere in the app calling openModal() - not evidence this file's
              // OTHER state is misplaced, so it shouldn't count toward firing this rule at all
              if (!isGenericModalLifecycleOnlyImporter(importerFile, names)) {
                siblingOwners.add(importerOwner)
                if (!filesBySiblingOwner.has(importerOwner)) filesBySiblingOwner.set(importerOwner, [])
                filesBySiblingOwner.get(importerOwner).push(importerFile)
              }
              continue
            }
            externalImporterFiles.push(importerFile)
          }

          if (siblingOwners.size === 0) {
            // No sibling-child reach - but not necessarily fine. A named child (myOwnerSegments.length
            // >= 3, e.g. AttachButton inside modules/SendEmailForm) that's never used by its own
            // module at all, with its ONLY real importer anywhere belonging to one totally different
            // top-level module, is the exact same "this was never actually this child's own file"
            // signal as the sibling case above - just crossing a module boundary instead of a
            // sibling-child one. Reached through the module's own proper index.ts (so
            // import-encapsulated-module-widget stays silent) doesn't make it any less misplaced.
            // Real case: app/modules/SendEmailForm/AttachButton/AttachButton.tsx, re-exported from
            // SendEmailForm's own index.ts, but SendEmailForm itself never renders <AttachButton /> -
            // the only real importer anywhere is app/modules/EmailBodySection/EmailBodySection.tsx.
            if (!hasInternalImporter && externalImporterFiles.length > 0) {
              const realExternalFiles = externalImporterFiles.filter(file => !isGenericModalLifecycleOnlyImporter(file, names))
              const externalOwners = new Set(
                realExternalFiles.map(file => {
                  const segments = path.relative(appRoot, file).split(path.sep)
                  return getOwnerKey(segments, appRoot) ?? segments[0]
                }),
              )
              if (externalOwners.size === 1) {
                const owner = [...externalOwners][0]
                const basename = path.basename(filename)
                const basenameNoExt = basename.replace(/\.tsx?$/, "")
                const loc = getMainExportLineLoc(node, sourceCode, basenameNoExt)
                const ownerFiles = realExternalFiles.map(file => path.relative(repoRoot, file)).join(", ")
                context.report({
                  loc,
                  messageId: "singleExternalOwner",
                  data: { basename, myOwner, umbrellaPrefix, owner, ownerFiles },
                })
              }
            }
            return
          }

          const basename = path.basename(filename)
          const basenameNoExt = basename.replace(/\.tsx?$/, "")
          const loc = getMainExportLineLoc(node, sourceCode, basenameNoExt)

          // the owner key (e.g. "modules/Modals/FollowUpModal") is a FOLDER, not the actual file
          // that imports this - a reader looking at that folder's own obvious entry point (e.g.
          // FollowUpModal.tsx) won't find the import there at all if the real importer is buried
          // deep inside (e.g. .../scheduleBlast/awaitSupportConfirmFn.tsx), so always show the real
          // file(s) too, never just the owner name alone
          const describeOwnerFiles = owner =>
            (filesBySiblingOwner.get(owner) ?? []).map(file => path.relative(repoRoot, file)).join(", ")

          if (!hasInternalImporter && siblingOwners.size === 1) {
            const owner = [...siblingOwners][0]
            context.report({
              loc,
              messageId: "singleOutsideOwner",
              data: { basename, myOwner, umbrellaPrefix, owner, ownerFiles: describeOwnerFiles(owner) },
            })
            return
          }

          // used both inside its own child AND by 1+ siblings - moving the WHOLE file anywhere
          // would break its own child, so the fix is splitting out just the fields each sibling
          // actually reads, not relocating the file
          if (hasInternalImporter && siblingOwners.size >= 1) {
            const relFilePath = path.relative(repoRoot, filename)
            const numberedList = [myOwner, ...siblingOwners]
              .map((owner, i) => {
                const ownerFiles = describeOwnerFiles(owner)
                return ` ${i + 1}. ${owner}${ownerFiles ? ` → ${ownerFiles}` : ""}`
              })
              .join("\n")
            const umbrellaChildSingular = umbrellaPrefix.split("/").pop().replace(/s$/, "").toLowerCase()

            const suggestionLines = [...siblingOwners].map(owner => {
              const content = readFilesJoined(filesBySiblingOwner.get(owner) ?? [])
              const props = getDestructuredPropsAtCallSites(content, names)
              const childName = owner.split("/").pop()
              const suggestedHook = `use${childName}`
              return props.size > 0
                ? `${DID_YOU_MEAN_EMOJI}did you mean to move ${[...props].join(", ")} to ${suggestedHook}? (SRP)`
                : `${DID_YOU_MEAN_EMOJI}did you mean to move whatever "${describeOwnerFiles(owner)}" actually reads out of "${basenameNoExt}" into ${suggestedHook}? (SRP)`
            })

            let externalSection = ""
            // 2+ genuinely different places outside this umbrella entirely reaching straight into
            // it is the same signal that turned out to be right for isBlastingMode/useAccountModal:
            // moving it beside just ONE sibling would be wrong when 3 unrelated top-level places
            // ALSO depend on it directly - so surface them instead of quietly staying silent about it
            const realExternalImporterFiles = externalImporterFiles.filter(
              file => !isGenericModalLifecycleOnlyImporter(file, names),
            )
            const externalOwnerLabels = new Set(
              realExternalImporterFiles.map(file => {
                const segments = path.relative(appRoot, file).split(path.sep)
                return getOwnerKey(segments, appRoot) ?? segments[0]
              }),
            )
            if (externalOwnerLabels.size >= 2) {
              const externalList = realExternalImporterFiles
                .map((file, i) => ` ${i + 1}. ${path.relative(repoRoot, file)}`)
                .join("\n")
              const externalProps = getDestructuredPropsAtCallSites(readFilesJoined(realExternalImporterFiles), names)
              const propsDisplay = externalProps.size > 0 ? [...externalProps].join(", ") : names.join(", ")
              externalSection =
                `\n\nit's also imported outside "${umbrellaPrefix}" entirely:\n${externalList}\n\n` +
                `so is "${propsDisplay}" really "${myOwner}"'s own state, or does it deserve its own store in ` +
                `app/features/<name>/ that every one of these reaches the same way, none owning it?`
            }

            const message =
              `"${relFilePath}" importers:\n${numberedList}\n\n` +
              `so this is a cross-${umbrellaChildSingular} dependency - means it does not make sense to move ${names.join(", ")}\n` +
              ` from: ${relFilePath}\n` +
              ` to: any other folder\n\n` +
              `better would be to separate responsibilities - "${[...siblingOwners].map(describeOwnerFiles).join('", "')}" shouldn't be importer of "${basenameNoExt}"\n` +
              `${suggestionLines.join("\n")}` +
              externalSection +
              "\n(or if it's exception of wrong - document it instead of blindly trusting this rule)"

            context.report({ loc, messageId: "usedInternallyAndBySibling", data: { message } })
            return
          }

          const reason = `it has importers in ${siblingOwners.size} different sibling children ("${[...siblingOwners].join('", "')}")`
          context.report({ loc, messageId: "sharedAcrossChildren", data: { basename, myOwner, reason } })
        },
      }
    },
  },
}
