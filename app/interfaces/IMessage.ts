export interface IMessage {
  id: string
  created_at: string
  ticket_id: string
  sender_id: string
  sender_username: string
  body: string
  images?: string[] | null
}
