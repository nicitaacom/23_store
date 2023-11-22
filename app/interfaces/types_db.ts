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
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          images: string[] | null
          seen: boolean
          sender_avatar_url: string | null
          sender_id: string
          sender_username: string
          ticket_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          images?: string[] | null
          seen?: boolean
          sender_avatar_url?: string | null
          sender_id: string
          sender_username: string
          ticket_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          images?: string[] | null
          seen?: boolean
          sender_avatar_url?: string | null
          sender_id?: string
          sender_username?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
        ]
      }
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
      tickets: {
        Row: {
          created_at: string
          id: string
          is_open: boolean
          last_message_body: string
          owner_avatar_url: string | null
          owner_id: string
          owner_username: string
          rate: number | null
        }
        Insert: {
          created_at?: string
          id: string
          is_open?: boolean
          last_message_body?: string
          owner_avatar_url?: string | null
          owner_id: string
          owner_username: string
          rate?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_open?: boolean
          last_message_body?: string
          owner_avatar_url?: string | null
          owner_id?: string
          owner_username?: string
          rate?: number | null
        }
        Relationships: []
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          email_confirmed_at: string | null
          id: string
          providers: string[] | null
          role: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          email_confirmed_at?: string | null
          id: string
          providers?: string[] | null
          role?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_confirmed_at?: string | null
          id?: string
          providers?: string[] | null
          role?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_id_fkey"
            columns: ["id"]
            isOneToOne: true
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
