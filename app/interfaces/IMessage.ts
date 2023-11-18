export interface IMessage {
  created_at: string
  conversation_id: string
  body: string
  sender_id: string
  is_closed_conversation: boolean
  id: string
}
