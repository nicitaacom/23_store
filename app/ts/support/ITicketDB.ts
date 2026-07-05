export interface ITicketDB {
  id: string
  created_at: string
  is_open: boolean
  owner_username: string
  owner_id: string
  last_message_body: string
  owner_avatar_url: string | undefined
  last_message_at?: string
}
