import { ICartProduct } from "./ICartProduct"

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          img_url: string[]
          on_stock: number
          owner_username: string
          price: number
          sub_title: string
          title: string
        }
        Insert: {
          id: string
          img_url: string[]
          on_stock: number
          owner_username: string
          price: number
          sub_title: string
          title?: string
        }
        Update: {
          id?: string
          img_url?: string[]
          on_stock?: number
          owner_username?: string
          price?: number
          sub_title?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_username_fkey"
            columns: ["owner_username"]
            referencedRelation: "users"
            referencedColumns: ["username"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string | null
          id: string
          profile_picture_url: string | null
          username: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          profile_picture_url?: string | null
          username: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          profile_picture_url?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users_cart: {
        Row: {
          cart_products: ICartProduct[]
          cart_quantity: number | null
          created_at: string
          id: string
          owner_username: string
        }
        Insert: {
          cart_products: ICartProduct[]
          cart_quantity?: number | null
          created_at?: string
          id: string
          owner_username: string
        }
        Update: {
          cart_products?: ICartProduct[]
          cart_quantity?: number | null
          created_at?: string
          id?: string
          owner_username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_cart_owner_username_fkey"
            columns: ["owner_username"]
            referencedRelation: "users"
            referencedColumns: ["username"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
