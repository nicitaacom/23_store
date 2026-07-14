import { fn } from "storybook/test";

const channel = {
  bind: fn(),
  unbind: fn(),
};

export const pusherServer = {
  trigger: fn(async () => undefined),
};

export const pusherClient = {
  bind: fn(),
  channels: {
    find: fn(() => channel),
  },
  subscribe: fn(() => channel),
  unsubscribe: fn(),
  unbind: fn(),
};

export const getPusherClient = fn(() => pusherClient);
export const subscribePusherChannel = fn(() => channel);
