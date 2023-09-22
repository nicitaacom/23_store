interface ProcessEnv {
    [key: string]: string | undefined;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PRODUCTION_URL: string;

      NEXT_SUPABASE_URL: string;
      NEXT_SUPABASE_ANON_KEY: string;

      NEXT_STRIPE_PUBLIC: string;
      NEXT_STRIPE_SECRET: string;

      NEXT_RESEND_PUBLIC: string;

      NEXT_PAYPAL_PUBLIC: string;
      NEXT_PAYPAL_SECRET: string;

      NEXT_METAMASK_ADRESS: string;

      NEXT_COINMARKETCAP_SECRET: string;
    }
  }
}

export {}