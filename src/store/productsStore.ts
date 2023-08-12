import {create} from 'zustand'
import { devtools, persist } from "zustand/middleware"

export interface IProduct {
  id:string
  label:string
  price:number
  imgUrl:string
  quantity:number
}

interface Store {
  products:IProduct[]
  newProduct:{label:string,price:number,imgUrl:string,quantity:number}
  increaseItemQuantity: (id: string) => void;
  decreaseItemQuantity: (id: string) => void;
  setItemQuantity0: (id: string) => void;
}


export const increaseItemQuantity = (products: IProduct[], id: string): IProduct[] => {
  return products.map((product) => {
    if (product.id === id) {
      return {
        ...product,
        quantity: product.quantity ? product.quantity + 1 : 1,
      };
    }
    return product;
  });
}

export const decreaseItemQuantity = (products: IProduct[], id: string): IProduct[] => {
  return products.map((product) => {
    if (product.id === id) {
      return {
        ...product,
        quantity: product.quantity ? product.quantity - 1 : 0,
      };
    }
    return product;
  });
}

export const setItemQuantity0 = (products: IProduct[], id: string): IProduct[] => {
  return products.map((product) => {
    if (product.id === id) {
      return {
        ...product,
        quantity: product.quantity ? product.quantity=0 : 1,
      };
    }
    return product;
  });
}


type SetState = (fn: (prevState: Store) => Store) => void;

const productsStore = (set:SetState):Store => ({
  products:[],
  newProduct:{label:"",price:0,imgUrl:"",quantity:0},
  increaseItemQuantity(id: string) {
    set((state: Store) => ({
      ...state,
      products: increaseItemQuantity(state.products, id),
    }));
  },
  decreaseItemQuantity(id: string) {
    set((state: Store) => ({
      ...state,
      products: decreaseItemQuantity(state.products, id),
    }));
  },
  setItemQuantity0(id: string) {
    set((state: Store) => ({
      ...state,
      products: setItemQuantity0(state.products, id),
    }));
  },
 })

const useProductsStore = create(devtools(persist(productsStore, { name: "productsStore" })))


export default useProductsStore