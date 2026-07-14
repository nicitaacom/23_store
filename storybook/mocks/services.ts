import { fn } from "storybook/test";

export const storybookServices = {
  ai: fn(),
  email: fn(),
  payment: fn(),
  upload: fn(),
};

export function resetStorybookServices() {
  for (const serviceMock of Object.values(storybookServices)) serviceMock.mockReset();
}
