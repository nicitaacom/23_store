import type { TProductAfterDB } from "@/ts/product/TProductAfterDB";
import type { TProductVariant } from "@/ts/product/TProductVariant";
import type { TProductDB } from "@/ts/product/TProductDB";
import { FIXTURE_DATE, FIXTURE_IDS, FIXTURE_IMAGES } from "./constants";

export const productVariants: TProductVariant[] = [
  {
    id: FIXTURE_IDS.variant,
    label: "Midnight black",
    image_url: FIXTURE_IMAGES.product,
    price: 149.99,
    quantity: 8,
  },
  {
    id: "variant-headphones-silver",
    label: "Silver",
    image_url: FIXTURE_IMAGES.productAlternative,
    price: 159.99,
    quantity: 0,
  },
];

export const headphonesProduct: TProductDB = {
  id: FIXTURE_IDS.product,
  price_id: "price-headphones-23",
  owner_id: FIXTURE_IDS.owner,
  translations: {
    en: { title: "Joki wireless headphones", description: "Comfortable headphones with balanced sound." },
    fi: { title: "Joki langattomat kuulokkeet", description: "Mukavat kuulokkeet tasapainoisella äänellä." },
    ru: { title: "Беспроводные наушники Joki", description: "Удобные наушники со сбалансированным звуком." },
    se: { title: "Joki trådlösa hörlurar", description: "Bekväma hörlurar med balanserat ljud." },
  },
  price: 139.99,
  img_url: [FIXTURE_IMAGES.product, FIXTURE_IMAGES.productAlternative],
  variants: productVariants,
  on_stock: 8,
  category_id: FIXTURE_IDS.category,
  created_at: FIXTURE_DATE,
  likes_count: 42,
  rating_sum: 92,
  rating_count: 20,
};

export const soldOutProduct: TProductDB = {
  ...headphonesProduct,
  id: "product-sold-out-23",
  on_stock: 0,
  variants: productVariants.map(variant => ({ ...variant, quantity: 0 })),
};

export const cartHeadphonesProduct: TProductAfterDB = {
  ...headphonesProduct,
  basePrice: headphonesProduct.price,
  cartKey: `${headphonesProduct.id}:${FIXTURE_IDS.variant}`,
  price: productVariants[0].price,
  quantity: 2,
  selectedVariant: productVariants[0],
  variantId: FIXTURE_IDS.variant,
};
