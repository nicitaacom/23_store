## If you got one of 2 erros

1. Invalid auth flow found
2. AuthApiError: invalid request: both auth code and code verifier should be non-empty

Try

```ts
return NextResponse.redirect(`${getURL()}auth/completed?code=${code}`)
```

And try do it in `(auth)/auth/callback/smth/route.ts`
Just create `smth` folder and change it in `Continue with button`
