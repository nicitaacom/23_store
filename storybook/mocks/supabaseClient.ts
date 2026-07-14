import { fn } from "storybook/test";

interface ISupabaseResult {
  data: unknown;
  error: null;
}

class SupabaseQueryMock implements PromiseLike<ISupabaseResult> {
  private result: ISupabaseResult = { data: [], error: null };

  delete = fn(() => this);
  eq = fn(() => this);
  in = fn(() => this);
  insert = fn(() => this);
  limit = fn(() => this);
  maybeSingle = fn(() => this);
  order = fn(() => this);
  select = fn(() => this);
  single = fn(() => this);
  update = fn(() => this);
  upsert = fn(() => this);

  then<TResult1 = ISupabaseResult, TResult2 = never>(
    fulfilled?: ((value: ISupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    rejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(fulfilled, rejected);
  }
}

export const supabaseClient = {
  auth: {
    getSession: fn(async () => ({ data: { session: null }, error: null })),
    getUser: fn(async () => ({ data: { user: null }, error: null })),
    signInWithOAuth: fn(async () => ({ data: { provider: null, url: null }, error: null })),
    signOut: fn(async () => ({ error: null })),
  },
  from: fn(() => new SupabaseQueryMock()),
  storage: {
    from: fn(() => ({
      remove: fn(async () => ({ data: [], error: null })),
      upload: fn(async () => ({ data: { path: "storybook/upload.png" }, error: null })),
    })),
  },
};

export default supabaseClient;
