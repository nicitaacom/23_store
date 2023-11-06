export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          img_url: string[]
          on_stock: number
          owner_id: string
          price: number
          price_id: string
          sub_title: string
          title: string
        }
        Insert: {
          id: string
          img_url: string[]
          on_stock: number
          owner_id: string
          price: number
          price_id: string
          sub_title: string
          title: string
        }
        Update: {
          id?: string
          img_url?: string[]
          on_stock?: number
          owner_id?: string
          price?: number
          price_id?: string
          sub_title?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users_cart: {
        Row: {
          cart_products: Json
          created_at: string
          id: string
        }
        Insert: {
          cart_products?: Json
          created_at?: string
          id: string
        }
        Update: {
          cart_products?: Json
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_cart_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
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
