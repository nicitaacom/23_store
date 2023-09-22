/* for import.meta.env */

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}



/* for metamask detecting */

/// <reference types="vite/client" />

interface Window {
  ethereum: any;
}