import { expect, test } from "vitest"

import { isSaveChord } from "./isSaveChord"

const enter = { key: "Enter", ctrlKey: false, metaKey: false, altKey: false, shiftKey: false }

test("ctrl+enter and cmd+enter save", () => {
  expect(isSaveChord({ ...enter, ctrlKey: true })).toBe(true)
  expect(isSaveChord({ ...enter, metaKey: true })).toBe(true)
})

test("enter alone does not save", () => {
  expect(isSaveChord(enter)).toBe(false)
  expect(isSaveChord({ ...enter, ctrlKey: true, shiftKey: true })).toBe(false)
  expect(isSaveChord({ ...enter, ctrlKey: true, key: "s" })).toBe(false)
})
