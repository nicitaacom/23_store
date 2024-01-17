export interface IMessage {
  id: string
  created_at: string
  ticket_id: string
  sender_id: string
  sender_avatar_url?: string | null | undefined
  sender_username: string
  body: string
  seen?: boolean
  images?: string[] | null
}
