interface ProcessEnv {
  [key: string]: string | undefined
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_PRODUCTION_URL: string

      NEXT_PUBLIC_SUPABASE_URL: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string
      SUPABASE_SERVICE_ROLE_KEY: string

      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
      NEXT_STRIPE_SECRET_KEY: string

      UPSTASH_REDIS_REST_URL: string
      UPSTASH_REDIS_REST_TOKEN: string
      UPSTASH_REDIS_URL: string

      NEXT_RESEND_SECRET: string
      NEXT_PUBLIC_SUPPORT_EMAIL: string
      NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL: string

      NEXT_PAYPAL_PUBLIC: string
      NEXT_PAYPAL_SECRET: string

      NEXT_PUBLIC_CLOUDFLARE_SITE_KEY: string
      TURNSTILE_SECRET_KEY: string

      PINECONE_INDEX: string
      PINECONE_HOST: string
      PINECONE_ENVIRONMENT: string
      PINECONE_API_KEY: string

      NEXT_PUBLIC_METAMASK_ADRESS_ETH: string
      NEXT_PUBLIC_METAMASK_ADRESS_BNB: string
      NEXT_PUBLIC_METAMASK_ADRESS_MATIC: string

      OPENAI_API_KEY: string

      NEXT_COINMARKETCAP_SECRET: string

      PUSHER_APP_ID: string
      NEXT_PUBLIC_PUSHER_APP_KEY: string
      PUSHER_SECRET: string

      TELEGRAM_BOT_TOKEN: string
      TELEGRAM_CHAT_ID: string
      NEXT_PUBLIC_TELEGRAM_URL: string

      NEXT_PUBLIC_IS_DEBUG: string
    }
  }
}

/* for metamask detecting */

declare global {
  interface Window {
    ethereum: any
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

export {}
