# Asian Le POS Admin

Internal admin panel for the Asian Le point-of-sale system. Manages menu, tables, credits, customers, order history, rewards members, and staff users. Built with Next.js 15 and Firebase, deployed on Firebase App Hosting (pos-admin.asianle.ca).

Uses the shared **`asianlepos`** Firebase project with the POS, KDS, Orders app, website and rewards. All data is under `businesses/{businessId}/…`, and only admins can sign in (custom claims `{ businessId, role: "admin" }`; the business comes from the claim). Security rules live in the `asian-le-firebase` repo.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, Radix UI (same look as website-admin) |
| State | Zustand with Firestore `onSnapshot` |
| Database | Firebase Firestore |
| Auth | Firebase Auth (custom claims, role-based) |
| Server ops | Firebase Admin SDK via Next.js API routes |
| Drag & drop | dnd-kit |

## Getting Started

### Prerequisites

- Node.js 18+
- Access to the shared `asianlepos` Firebase project, and an account with admin claims

### Environment variables

Copy `.env.example` to `.env.local`:

```env
# Firebase Admin SDK (server-side only): the whole service account JSON, on one line
ADMIN_SERVICE_ACCOUNT_KEY=

# Firebase client SDK (asianlepos web app config)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

### Deploying

Firebase App Hosting, backend `asianlepos-backend` (`firebase.json`). Pushing deploys it.
The production env vars and the service-account secret are set on the backend in the
Firebase console (there's no `apphosting.yaml`).

### Running locally

```bash
npm install
npm run dev      # http://localhost:3000
```

### Other commands

```bash
npm run build    # Production build
npm run lint     # ESLint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and API routes
│   ├── (app)/              # Auth-protected pages (menu, orders, credits, etc.)
│   ├── login/
│   └── api/                # Admin SDK routes; _auth.ts checks the admin's ID token + business
│       ├── users/          # Create/update/delete staff accounts
│       └── rewards/        # Read-only rewards members and their history
├── features/               # UI grouped by domain
│   ├── add-extras/
│   ├── credits/
│   ├── customers/
│   ├── menu/
│   │   ├── categories/
│   │   ├── items/
│   │   ├── option-groups/
│   │   ├── options/
│   │   └── publish/
│   ├── menu-changes/
│   ├── orders/
│   ├── rewards/
│   ├── tables/
│   └── users/
├── stores/                 # Zustand stores (one per domain, + useModalStore for popups)
├── providers/              # AuthProvider
├── services/               # Calls to the API routes (callAdminApi) and rewards functions
├── lib/                    # Shared utilities, business paths, linked menu writes
├── components/             # ui/ (Radix primitives) and layout/ (Navbar, RowParts, EntityFormDialog, ...)
└── types/                  # global.d.ts (all domain types, global) and enum.ts
```

## Key Patterns

### Real-time data

Zustand stores open Firestore `onSnapshot` listeners via a `subscribe()` method. Each route layout under `src/app/(app)/` subscribes to the stores it needs — components just read from the store, they never subscribe themselves.

```ts
// Reading store state in a component
const { credits, loading } = useCreditStore();
```

### Privileged operations

User management (create, update, delete, role assignment) and the rewards member list go through Next.js API routes that use the Firebase Admin SDK. Every call sends the admin's ID token; `src/app/api/_auth.ts` verifies it and always takes the business from the token. Creating or updating a user sets the claims `{ businessId, role }` (`staff` = POS, KDS; `admin` = everything) and writes a display copy to `businesses/{id}/users`. All other Firestore writes happen client-side via store actions.

### Other conventions

- **One form per entity** for add and edit (`EntityFormDialog`): no entity prop = add, entity prop = edit.
- **Linked menu data** (categories ↔ items ↔ option groups ↔ options) is changed only through `src/lib/linked-writes.ts`, one batched write each, so both sides stay in sync. Completing or cancelling a dine-in order updates its table in the same write.
- **Popups:** use `alertDialog` / `confirmDialog` from `useModalStore`, never `window.alert` / `confirm`.

### Adding a new feature

1. **Type** — add the interface to `src/types/global.d.ts` (enums go in `src/types/enum.ts`)
2. **Store** — create `src/stores/useXStore.ts` with a `subscribe()` method; subscribe to it in the route's layout
3. **Feature** — create `src/features/<domain>/` with list, card/row, and form components (named exports)
4. **Page** — add a page under `src/app/(app)/(standard)/<route>/page.tsx`

### Formatting helpers (`src/lib/formatters.ts`)

| Function | Use for |
|----------|---------|
| `formatTimestamp(value)` | Firestore Timestamp → locale string, safe for legacy docs |
| `formatCurrency(amount)` | `$x.xx` display |
| `formatOrderedAt(date)` | Date with month/day/year/time |
| `formatDiscountLabel(discount)` | Discount type + value label |
| `formatDiscountAmount(discount)` | Formatted discount amount string |
| `formatReadyIn(fulfillment)` | Takeout ready-in display |

### List utilities (`src/lib/list-utils.ts`)

| Function | Use for |
|----------|---------|
| `matchesQuery(q, ...fields)` | Client-side search across string fields |
| `sortByAlphabet(array)` | Alphabetical sort (used in stores on snapshot) |
| `sortByNameAndCreated(rows, sortBy, nameSort, createdSort)` | Two-column sortable table |

## Features

| Page | Description |
|------|-------------|
| `/` | Dashboard |
| `/menu` | Manage categories, items, option groups, and options (with an **Unused** filter). Publish to POS. |
| `/orders` | Order history by date and channel (dine-in / takeout), with rewards badges. Complete or cancel orders; cancelling reverses rewards points |
| `/tables` | Tables: add, edit, delete |
| `/credits` | Manage customer credit entries |
| `/customers` | Customers from the POS: add/edit, notes, blocked status, order count and total spent, sort and filter |
| `/rewards` | Read-only Asian Le Rewards members: stats, search, and each member's points history |
| `/menu-changes` | Track item substitution records |
| `/add-extras` | Add-extra items for the POS |
| `/users` | Manage staff accounts and roles |
