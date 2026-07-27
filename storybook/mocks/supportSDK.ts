import { fn } from "storybook/test";

import { fixtureMessages, FIXTURE_IDS } from "../fixtures";

export class SupportSDK {
  sendMessage = fn(async () => ({ status: "success" }));
  markMessagesAsSeen = fn(async () => ({ status: "success" }));
  getMessages = fn(async () => fixtureMessages);
  openTicket = fn(async () => ({ status: "success" }));
  closeTicket = fn(async () => ({ id: FIXTURE_IDS.ticket }));
  rateTicket = fn(async () => ({ id: FIXTURE_IDS.ticket }));
  getTicketId = fn(async () => FIXTURE_IDS.ticket);
}

export const supportSDK = new SupportSDK();
