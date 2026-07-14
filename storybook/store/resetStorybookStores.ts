import { resetStorybookServices } from "../mocks/services";
import { useAnonCategoryViewsStore } from "@/store/categories/useAnonCategoryViewsStore";
import { useAreYouSureClearCartModal } from "@/store/ui/areYouSureClearCartModal";
import { useAreYouSureDeleteProductModal } from "@/store/ui/areYouSureDeleteProductModal";
import { useAreYouSureMarkTicketAsCompletedSupportModal } from "@/store/ui/areYouSureMarkTicketAsCompletedSupportModal";
import { useAvatarDropdown } from "@/store/ui/useAvatarDropdown";
import useCartStore from "@/store/user/cartStore";
import { useCategoryPreferences } from "@/store/categories/useCategoryPreferences";
import { useContactDropdown } from "@/store/ui/useContactDropdown";
import { useCtrlKModal } from "@/store/ui/useCtrlKModal";
import useDarkModeStore from "@/store/ui/useDarkModeStore";
import { useGlobalImagePreview } from "@/store/ui/useGlobalImagePreview";
import useLikedProductsStore from "@/store/user/useLikedProductsStore";
import { useLoading } from "@/store/ui/useLoading";
import { useMessages } from "@/store/ui/useMessages";
import { useProductDetail } from "@/store/ui/useProductDetail";
import usePurchasedProductsStore from "@/store/user/usePurchasedProductsStore";
import useRatedProductsStore from "@/store/user/useRatedProductsStore";
import { useSidebar } from "@/store/ui/useSidebar";
import { useSupportDropdown } from "@/store/ui/useSupportDropdown";
import { useSupportPrefilledMessage } from "@/store/ui/useSupportPrefilledMessage";
import { useToast } from "@/store/ui/useToast";
import { useUpdateAvatarModal } from "@/store/ui/useUpdateAvatarModal";
import useUser from "@/store/user/useUser";

interface IStorybookStore {
  getState: () => unknown;
  setState: (state: unknown, replace: true) => void;
}

const storybookStores = [
  useAnonCategoryViewsStore,
  useCategoryPreferences,
  useAreYouSureClearCartModal,
  useAreYouSureDeleteProductModal,
  useAreYouSureMarkTicketAsCompletedSupportModal,
  useAvatarDropdown,
  useContactDropdown,
  useCtrlKModal,
  useDarkModeStore,
  useGlobalImagePreview,
  useLoading,
  useMessages,
  useProductDetail,
  useSidebar,
  useSupportDropdown,
  useSupportPrefilledMessage,
  useToast,
  useUpdateAvatarModal,
  useCartStore,
  useLikedProductsStore,
  usePurchasedProductsStore,
  useRatedProductsStore,
  useUser,
] as unknown as IStorybookStore[];

const initialStates = storybookStores.map(store => store.getState());

export function resetStorybookStores() {
  for (const [index, store] of storybookStores.entries()) store.setState(initialStates[index], true);
  resetStorybookServices();
}
