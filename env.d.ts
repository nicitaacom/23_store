interface ProcessEnv {
  [key: string]: string | undefined
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PRODUCTION_URL: string

      NEXT_PUBLIC_SUPABASE_URL: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string
      SUPABASE_SERVICE_ROLE_KEY: string

      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
      NEXT_STRIPE_SECRET_KEY: string

      NEXT_RESEND_SECRET: string
      NEXT_PUBLIC_SUPPORT_EMAIL: string

      NEXT_PAYPAL_PUBLIC: string
      NEXT_PAYPAL_SECRET: string

      NEXT_PUBLIC_METAMASK_ADRESS: string

      NEXT_COINMARKETCAP_SECRET: string

      PUSHER_APP_ID: string
      NEXT_PUBLIC_PUSHER_APP_KEY: string
      PUSHER_SECRET: string

      NEXT_TELEGRAM_BOT_TOKEN: string
      NEXT_TELEGRAM_CHAT_ID: string
    }
  }
}

/* for metamask detecting */

declare global {
  interface Window {
    ethereum: any
  }
}

export {}
