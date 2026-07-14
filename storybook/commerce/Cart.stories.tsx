import { useLayoutEffect } from "react";
import { HttpResponse, delay, http } from "msw";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import type { TRecordCartProduct } from "@/ts/product/TRecordCartProduct";
import type { TProductAfterDB } from "@/ts/product/TProductAfterDB";
import { cartHeadphonesProduct, customerUser, FIXTURE_IDS, headphonesProduct } from "../fixtures";
import { storybookServices } from "../mocks/services";
import useCartStore from "@/store/user/cartStore";
import useToast from "@/store/ui/useToast";
import useUser from "@/store/user/useUser";
import EmptyCart from "@/components/ui/Modals/CartModal/EmptyCart";
import { ProductsInCart } from "@/components/ui/Modals/CartModal/ProductsInCart";
import Toast from "@/components/ui/Toast";

const secondCartProduct: TProductAfterDB = {
  ...headphonesProduct,
  id: "product-speaker-23",
  price_id: "price-speaker-23",
  translations: {
    en: { title: "Compact Joki speaker with a long product name", description: "Portable sound for small spaces." },
    fi: { title: "Kompakti Joki-kaiutin", description: "Kannettava ääni pieniin tiloihin." },
    ru: { title: "Компактная колонка Joki", description: "Портативный звук для небольших помещений." },
    se: { title: "Kompakt Joki-högtalare", description: "Bärbart ljud för mindre utrymmen." },
  },
  variants: null,
  img_url: ["/projects/J.png"],
  on_stock: 14,
  basePrice: 79,
  cartKey: "product-speaker-23",
  price: 79,
  quantity: 1,
  selectedVariant: null,
  variantId: null,
};

const successfulPriceHandlers = [
  http.post("/api/rate-limit", () => HttpResponse.json({ allowed: true, remaining: 4 })),
  http.post("/api/send-email", async ({ request }) => {
    storybookServices.email(await request.json());
    return HttpResponse.json({ id: "storybook-email-23" });
  }),
  http.post("/api/telegram", async ({ request }) => {
    storybookServices.email(await request.json());
    return HttpResponse.json({ success: true });
  }),
];

const failedPriceHandlers = [
  http.post("/api/rate-limit", () => HttpResponse.json({ message: "Price request unavailable" }, { status: 500 })),
];

const pendingPriceHandlers = [
  http.post("/api/rate-limit", async () => {
    await delay("infinite");
    return HttpResponse.json({ allowed: true });
  }),
];

interface ICartCompositionProps {
  authenticated?: boolean;
  products?: TProductAfterDB[];
}

function createCartRecord(products: TProductAfterDB[]): TRecordCartProduct {
  return Object.fromEntries(
    products.map(product => [
      product.cartKey,
      { id: product.id, quantity: product.quantity, variantId: product.variantId },
    ]),
  );
}

function CartComposition({ authenticated = false, products = [cartHeadphonesProduct] }: ICartCompositionProps) {
  const isToastOpen = useToast(store => store.isOpen);

  useLayoutEffect(() => {
    useUser.setState({ user: authenticated ? customerUser : null });
    useCartStore.setState({ products: createCartRecord(products), productsData: products });
  }, [authenticated, products]);

  if (products.length === 0) return <EmptyCart />;

  return (
    <div className="h-[680px] p-3">
      <ProductsInCart />
      {isToastOpen && <Toast />}
    </div>
  );
}

const meta = {
  title: "Commerce/Cart/Cart compositions",
  component: CartComposition,
  args: { products: [cartHeadphonesProduct] },
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof CartComposition>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = { args: { products: [] } };
export const OneLine: Story = {};
export const MultipleLines: Story = { args: { products: [cartHeadphonesProduct, secondCartProduct] } };
export const VariantLine: Story = {};
export const LongProductName: Story = { args: { products: [secondCartProduct] } };
export const QuantityAndTotals: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const total = canvasElement.querySelector("[data-cy='cart-total']");
    if (!total) throw new Error("Cart total was not rendered");
    await waitFor(() => expect(total).toHaveTextContent("$299.98"));
    const productArticle = canvas.getByRole("article");
    await userEvent.click(within(productArticle).getByRole("button", { name: "+" }));
    await waitFor(() => expect(total).toHaveTextContent("$449.97"));
    await expect(useCartStore.getState().products[`${FIXTURE_IDS.product}::${FIXTURE_IDS.variant}`].quantity).toBe(3);
  },
};
export const Removal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await waitFor(() => canvas.getByRole("button", { name: "Clear" })));
    await waitFor(() => expect(canvas.queryByRole("article")).not.toBeInTheDocument());
    await expect(useCartStore.getState().products).toEqual({});
  },
};
export const AnonymousPriceRequest: Story = {
  parameters: { msw: { handlers: successfulPriceHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await waitFor(() => canvas.getByRole("button", { name: /request better prices/i })));
    await waitFor(() => expect(canvas.getByText("Request sent!")).toBeVisible());
    await expect(storybookServices.email).toHaveBeenCalled();
  },
};
export const AuthenticatedPriceRequest: Story = {
  args: { authenticated: true },
  parameters: { msw: { handlers: successfulPriceHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await waitFor(() => canvas.getByRole("button", { name: /request better prices/i })));
    await waitFor(() => expect(canvas.getByText("Request sent!")).toBeVisible());
    const emailRequest = storybookServices.email.mock.calls.find(call => "html" in (call[0] as object));
    await expect(emailRequest?.[0]).toMatchObject({ subject: "New Better Price Request" });
    await expect((emailRequest?.[0] as { html: string }).html).toContain(customerUser.email);
  },
};
export const PendingPriceRequest: Story = {
  parameters: { msw: { handlers: pendingPriceHandlers } },
  play: async ({ canvasElement }) => {
    const requestButton = await waitFor(() => within(canvasElement).getByRole("button", { name: /request better prices/i }));
    await userEvent.click(requestButton);
    await waitFor(() => expect(requestButton).toBeDisabled());
  },
};
export const FailedPriceRequest: Story = {
  parameters: { msw: { handlers: failedPriceHandlers } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await waitFor(() => canvas.getByRole("button", { name: /request better prices/i })));
    await waitFor(() => expect(canvas.getByText("Request failed")).toBeVisible());
    await expect(useToast.getState().variant).toBe("error");
  },
};
