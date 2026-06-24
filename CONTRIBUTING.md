# Contributing

> Contributors are welcome - DM me on linkedin if you have any questions
> https://www.linkedin.com/in/nicitaacom/

## 1. Setup

### Clone

```bash
git clone https://github.com/nicitaacom/23_store
cd 23_store
pnpm i
```

### Option A — Docker (recommended)

```bash
docker build -t joki .
docker run -dp 3000:3000 joki
```

To stop: `docker stop <container_id_or_name>`

Video guide for Docker install: https://www.youtube.com/watch?v=O2D6rPJI2oM

### Option B — Manual `.env`

Configure each service in order:

| #         | Service              | Notes                                                                                                |
| --------- | -------------------- | ---------------------------------------------------------------------------------------------------- |
| 2.1       | Google Cloud Console | OAuth credentials — [video guide](https://streamable.com/blib2f)                                     |
| 2.2–2.8   | Supabase             | Create project → copy `.env` → run SQL from [dev_readme-supbase-sql.md](./dev_readme-supbase-sql.md) |
| 2.9–2.11  | Stripe               | Create product + price keys                                                                          |
| 2.12–2.15 | Resend               | Add your domain, copy API key                                                                        |
| 2.16      | Support email        | `NEXT_PUBLIC_SUPPORT_EMAIL='you@yourdomain.com'`                                                     |
| 2.17–2.20 | PayPal               | Developer console → Create App → copy client ID + secret                                             |
| 2.21–2.22 | MetaMask             | Copy your wallet address into `.env`                                                                 |
| 2.23–2.24 | CoinMarketCap        | Developer portal → copy API key                                                                      |

Then:

```bash
pnpm dev
```

---

## 2. Workflow

### Fork + pick a task

1. Fork the repository

   ![fork repository](https://i.imgur.com/pjBCqGC.png)

2. Clone your fork

   ![clone forked repository](https://i.imgur.com/2IsIuv0.png)

3. Pick a task — https://github.com/users/nicitaacom/projects/5

   ![pick up any task](https://i.imgur.com/W2wxz9g.png)

4. Create a branch named after the task

   ![create branch](https://i.imgur.com/fcuUNur.png)

> ⚠️ PRs that put all changes in a single commit are rejected. Keep commits small — [why this matters](https://www.youtube.com/watch?v=Dy5t_H2PRrk&ab_channel=EricMurphy).

---

## 3. Naming conventions

### Branches

Name the branch the same as the task:

```
add-close_authModal_button
imp-close_avatarDropdown_onClickOutside
fix-sendEmailToUnauthorizedUser_afterPayment
```

- `add` — new feature
- `imp` — improvement to existing feature
- `fix` — bug fix

### Commits

```
style: mb-8 instead of pb-8
chore: AvatarDropdown.tsx encapsulated
upd: store for avatarDropdown created
feat: close avatarDropdown on DropdownItem click
docs: commit naming added
```

- `chore` — internal change, no user-visible effect
- `style` — styling only
- `upd` — small change leading toward a feature
- `feat` — complete feature
- `docs` — documentation

### Pull requests

Done: `[PR#59]-imp-close_avatar_dropdown_on_item_click`

In progress (daily update): `[PR#59-UPD]-imp-close_avatar_dropdown_on_item_click`

**PR description template:**

```md
# Changes

### 1. Change title

which problem was solved
video/screenshot (preferred)

---

# Result (n days)

video/screenshot

---

**Github task** -
This task is done — delete this branch and move task to 'Done'
This task is not done — don't delete this branch
```

Use `fix` / `feat` / `docs` prefixes — not `chore` / `style` — in PR section headings.

---

## 4. Codebase orientation

Each folder has a `dev_readme.md` explaining what lives there — read it only if the folder is relevant to your task. Imports follow the structure shown below:

![imports structure](https://i.imgur.com/1LEoZ8K.png)

### Writing your own docs

Lead with the problem the code solves, then show how to use it. Example:

> This file is needed to format price from `199999.99` to `$1,999.99`.

---

## 5. Keeping your branch up to date (GitHub Desktop)

1. `Ctrl+Shift+U`
2. Click **Push**
3. Click **History** → right-click the last commit → **Amend commit**
4. Change message to `Update from 'development'`
5. **Force push origin**

---

## 6. Feedback

Found a bug? [Open an issue](https://github.com/nicitaacom/23_store/issues/new).
