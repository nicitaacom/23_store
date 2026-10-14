declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_PRODUCTION_URL: string

      NEXT_PUBLIC_SUPABASE_URL: string
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string
      SUPABASE_SERVICE_ROLE_KEY: string
      STORAGE_LEGACY_SUPABASE_ORIGINS: string
      SUPABASE_DATABASE_ALLOWANCE_BYTES: string
      SUPABASE_STORAGE_ALLOWANCE_BYTES: string

      UPSTASH_REDIS_REST_URL: string
      UPSTASH_REDIS_REST_TOKEN: string

      AWS_ACCESS_KEY_ID: string
      AWS_SECRET_ACCESS_KEY: string
      NEXT_PUBLIC_AWS_REGION: string

      R2_BUCKET: string
      NEXT_PUBLIC_R2_PUBLIC_URL: string
      CLOUDFLARE_R2_ANALYTICS_TOKEN: string
      R2_ACCOUNT_ID: string
      R2_ACCESS_KEY_ID: string
      R2_SECRET_ACCESS_KEY: string

      PUSHER_APP_ID: string
      NEXT_PUBLIC_PUSHER_APP_KEY: string
      PUSHER_SECRET: string

      NEXT_PUBLIC_PAYPAL_CLIENT_ID_TEST: string
      NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE: string
      PAYPAL_CLIENT_SECRET_TEST: string
      PAYPAL_CLIENT_SECRET_LIVE: string
      PAYPAL_WEBHOOK_ID_TEST: string
      PAYPAL_WEBHOOK_ID_LIVE: string


      NEXT_STRIPE_SECRET_KEY: string

      NEXT_RESEND_SECRET: string

      NEXT_PUBLIC_SUPPORT_EMAIL: string
      NEXT_PUBLIC_SUPPORT_NOTIFICATION_EMAIL: string


      NEXT_PUBLIC_TURNSTILE_SITE_KEY: string
      TURNSTILE_SECRET_KEY: string
      YANDEX_GEOCODING_API_KEY: string
      NEXT_PUBLIC_YANDEX_GEOCODING_API_KEY: string


      PINECONE_INDEX: string
      PINECONE_ENVIRONMENT: string
      PINECONE_API_KEY: string

      NEXT_PUBLIC_METAMASK_ADRESS_ETH: string
      NEXT_PUBLIC_METAMASK_ADRESS_BNB: string
      NEXT_PUBLIC_METAMASK_ADRESS_MATIC: string

      OPENAI_API_KEY: string
      PRICE_WEBHOOK_SECRET: string

      NEXT_COINMARKETCAP_SECRET: string

      NEXT_PUBLIC_SOLANA_ADDRESS: string
      NEXT_PUBLIC_SOLANA_CLUSTER: string

      TELEGRAM_BOT_TOKEN: string
      TELEGRAM_CHAT_ID: string
      NEXT_PUBLIC_TELEGRAM_URL: string

      TINIFY_API_KEY_ARR: string

      // eslint-disable-next-line local-rules/no-defined-unused-envs -- Read by Chromatic CI and the dynamic environment checks.
      CHROMATIC_PROJECT_TOKEN: string

      DEVICE_ID_ENCRYPTION_KEY: string

      CRON_SECRET: string

      NEXT_PUBLIC_IS_DEBUG: string

      STORAGE_PROVIDER: string
      STORAGE_MIGRATION_PAUSED: string
      STORAGE_CLEANUP_ENABLED: string
      R2_ACCOUNT_STANDARD_ONLY: string

      E2E_SUITE: string
      E2E_BASE_URL: string
      E2E_RUN_ID: string
      E2E_SEED: string
      E2E_TEST_PASSWORD: string
      // eslint-disable-next-line local-rules/no-defined-unused-envs -- derived by scripts/e2e/run-weekly.mjs from the production URL
      E2E_TEST_EMAIL_DOMAIN: string
      // eslint-disable-next-line local-rules/no-defined-unused-envs -- read by scripts/e2e/run-weekly.mjs and supplied by .github/workflows/cypress-weekly.yml
      E2E_BROWSER: string
      E2E_ARTIFACT_DIR: string
    }
  }
}

/* for metamask detecting */

interface TEthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on(event: "accountsChanged", handler: (accounts: string[]) => void): void
  on(event: "chainChanged", handler: (chainId: string) => void): void
  removeListener(event: "accountsChanged", handler: (accounts: string[]) => void): void
  removeListener(event: "chainChanged", handler: (chainId: string) => void): void
}

/* for phantom detecting */

interface TSolanaProvider {
  isPhantom?: boolean
  publicKey: import("@solana/web3.js").PublicKey | null
  connect: () => Promise<{ publicKey: import("@solana/web3.js").PublicKey }>
  signAndSendTransaction: (transaction: import("@solana/web3.js").Transaction) => Promise<{ signature: string }>
}

declare global {
  interface Window {
    ethereum: TEthereumProvider
    solana: TSolanaProvider
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback: (token: string) => void
          "error-callback"?: () => void
          "expired-callback"?: () => void
          theme?: "light" | "dark" | "auto"
          retry?: "auto" | "never"
          "retry-interval"?: number
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

export {}
