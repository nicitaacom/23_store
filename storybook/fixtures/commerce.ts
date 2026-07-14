import type { TRecordCartProduct } from "@/ts/product/TRecordCartProduct";
import type { TMessageDB } from "@/ts/support/TMessageDB";
import type { ITicketDB } from "@/ts/support/ITicketDB";
import type { TCategory } from "@/ts/categories/TCategory";
import { FIXTURE_DATE, FIXTURE_IDS, FIXTURE_IMAGES } from "./constants";

export const fixtureCategories: TCategory[] = [
  { id: "category-featured", name: "FEATURED", parent_id: null },
  { id: FIXTURE_IDS.category, name: "AUDIO", parent_id: null },
  { id: "category-headphones", name: "HEADPHONES", parent_id: FIXTURE_IDS.category },
];

export const fixtureCart: TRecordCartProduct = {
  [`${FIXTURE_IDS.product}:${FIXTURE_IDS.variant}`]: {
    id: FIXTURE_IDS.product,
    quantity: 2,
    variantId: FIXTURE_IDS.variant,
  },
};

export const fixtureTicket: ITicketDB = {
  id: FIXTURE_IDS.ticket,
  created_at: FIXTURE_DATE,
  is_open: true,
  owner_username: "customer",
  owner_id: FIXTURE_IDS.user,
  last_message_body: "Could you help me choose a variant?",
  owner_avatar_url: FIXTURE_IMAGES.avatar,
  last_message_at: FIXTURE_DATE,
};

export const fixtureMessages: TMessageDB[] = [
  {
    id: FIXTURE_IDS.message,
    body: "Could you help me choose a variant?",
    created_at: "2026-02-13T17:30:00.000Z",
    images: null,
    seen: true,
    sender_avatar_url: FIXTURE_IMAGES.avatar,
    sender_id: FIXTURE_IDS.user,
    sender_username: "customer",
    ticket_id: FIXTURE_IDS.ticket,
  },
  {
    id: "message-support-1",
    body: "The black variant is available and ready to ship.",
    created_at: FIXTURE_DATE,
    images: [FIXTURE_IMAGES.product],
    seen: false,
    sender_avatar_url: FIXTURE_IMAGES.avatar,
    sender_id: "support-agent-23",
    sender_username: "support",
    ticket_id: FIXTURE_IDS.ticket,
  },
];
