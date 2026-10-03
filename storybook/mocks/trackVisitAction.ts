import { fn } from "storybook/test"

export const trackVisitAction = fn(async () => ({ storedDeviceId: "storybook-device-id" }))
