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
          sub_title: string
          title: string
        }
        Insert: {
          id: string
          img_url: string[]
          on_stock: number
          owner_id: string
          price: number
          sub_title: string
          title?: string
        }
        Update: {
          id?: string
          img_url?: string[]
          on_stock?: number
          owner_id?: string
          price?: number
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
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          profile_picture_url: string | null
          username: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          profile_picture_url?: string | null
          username: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          profile_picture_url?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
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
          id?: string
        }
        Update: {
          cart_products?: Json
          created_at?: string
          id?: string
        }
        Relationships: []
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
