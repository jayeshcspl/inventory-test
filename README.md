# Remix Inventory Dashboard

A resilient inventory management dashboard built with **React Router 7** and **Shopify Polaris** that demonstrates advanced Remix patterns for handling unreliable backend APIs.

## 🎯 Project Overview

This application tackles the challenge of building a responsive UI on top of a legacy API with:
- **3-second latency** on data fetches
- **20% random failure rate**
- **1-second mutation delays**

Despite these constraints, the dashboard provides an **instant, unbreakable user experience** through streaming, optimistic UI, and robust error boundaries.

---

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Navigate to **http://localhost:5173/dashboard** to view the inventory dashboard.

---

## 📋 Features Implemented

### ✅ Task 1: Streaming & Performance

**Problem**: Without streaming, users stare at a blank screen for 3 seconds while data loads.

**Solution**: 
- Loader returns promise directly (React Router 7 automatic deferred loading)
- Page shell renders **immediately (0ms)**
- Skeleton loader appears while data streams in the background

**Implementation**:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  return {
    inventory: getInventory(), // No await - enables streaming!
  };
}
```

The component uses `<Suspense>` and `<Await>` to handle the promise:
```tsx
<Suspense fallback={<SkeletonBodyText lines={6} />}>
  <Await resolve={inventory}>
    {(data) => <DataTable ... />}
  </Await>
</Suspense>
```

**Why it works**: React Router 7 automatically streams deferred data. The page layout renders instantly while the promise resolves in the background.

---

### ✅ Task 2: Optimistic UI & Race Condition Prevention

**Problem**: 1-second mutation delay creates poor UX. Users click "Claim One" and wait, not knowing if it worked.

**Solution**: 
- **Instant feedback**: Stock count decreases immediately in the UI
- **Automatic rollback**: If server returns error, UI reverts to server state
- **Double-submit protection**: Button disabled during pending state

**Implementation**:
```typescript
function InventoryRow({ item }: { item: any }) {
  const fetcher = useFetcher();
  
  // Calculate optimistic stock before server responds
  const optimisticStock =
    fetcher.formData && fetcher.formData.get("itemId") === item.id
      ? Math.max(0, item.stock - 1)  // Optimistically decrease
      : item.stock;                   // Use server data
  
  return [
    item.name,
    <Badge>{`${optimisticStock} in stock`}</Badge>,
    <fetcher.Form method="post">
      <Button 
        disabled={fetcher.state !== "idle"}  // Prevent double-submit
        loading={fetcher.state !== "idle"}    // Show loading state
      >
        Claim One
      </Button>
    </fetcher.Form>
  ];
}
```

**Why it works**:
1. **`useFetcher`** tracks form submission state without navigation
2. **`fetcher.formData`** contains pending data before server responds
3. **Optimistic calculation**: If this row's form is pending, show `stock - 1`
4. **Automatic rollback**: When `fetcher` completes, it uses fresh server data
5. **Race condition fix**: `disabled={fetcher.state !== "idle"}` prevents multiple clicks

**Key Design Choice**: We use `fetcher.formData` to identify which specific row is being updated, enabling multiple concurrent mutations without conflicts.

---

### ✅ Task 3: Route-Level Error Boundaries

**Problem**: 20% API failure rate crashes the entire page.

**Solution**:
- Route-level `ErrorBoundary` export catches loader errors
- Page shell remains visible
- Error displayed in Polaris Banner with retry button

**Implementation**:
```typescript
export function ErrorBoundary() {
  const error = useRouteError();
  
  return (
    <Page title="Inventory Dashboard">
      <Banner tone="critical" title="Error Loading Inventory">
        <p>{error.message}</p>
        <Form method="get">
          <Button submit>Retry</Button>
        </Form>
      </Banner>
    </Page>
  );
}
```

**Retry Logic**:
```tsx
<Form method="get">
  <Button submit>Retry</Button>
</Form>
```

**Why it works**:
- **`<Form method="get">`** re-triggers the loader without full page refresh
- Acts like a soft reload - only re-runs the data fetch
- User stays on the same page, no navigation
- Maintains SPA experience

**Key Design Choice**: Using `method="get"` instead of `method="post"` ensures the retry is idempotent and triggers the loader, not the action.

---

## 🏗️ Architecture Decisions

### React Router 7 (Not Remix)
This project uses **React Router 7**, which is the evolution of Remix. Key differences:
- **No `defer()` function** - return promises directly from loaders
- **Automatic streaming** - React Router handles deferred promises natively
- **Type-safe routes** - `+types` convention for route types

### Shopify Polaris v12
- Installed with `--legacy-peer-deps` for React 19 compatibility
- All UI uses Polaris components (no plain HTML)
- `AppProvider` wraps the app in `root.tsx`

### File Structure
```
app/
├── models/
│   └── inventory.server.ts    # Chaos backend (DO NOT MODIFY)
├── routes/
│   ├── dashboard.tsx          # Main inventory route
│   └── home.tsx              # Default home route
├── routes.ts                  # Route configuration
└── root.tsx                   # App root with Polaris setup
```

---

## 🎨 Design System Compliance

✅ **All UI uses Shopify Polaris components**:
- `Page`, `Layout`, `Card` - Structure
- `DataTable` - Inventory display
- `Button` - Actions (with loading states)
- `Badge` - Stock status indicators
- `SkeletonBodyText` - Loading states
- `Banner` - Error messages

❌ **Anti-patterns avoided**:
- No `useEffect()` for data fetching
- No `useState()` for manual inventory management
- No `event.preventDefault()` with manual fetch
- No component-level try/catch blocks

---

## 🧪 Testing Verification

### Streaming Test
1. Navigate to `/dashboard`
2. ✅ Page shell appears instantly (0ms)
3. ✅ Skeleton loader shows for 3 seconds
4. ✅ Data streams in without blocking

### Optimistic UI Test
1. Click "Claim One" on Super Widget A
2. ✅ Stock decreases instantly (10 → 9)
3. ✅ Button shows loading spinner
4. ✅ Button disabled during mutation
5. ✅ Mega Widget B button disabled (0 stock)

### Error Boundary Test
1. Refresh page multiple times
2. ✅ ~20% chance of error banner
3. ✅ Page structure remains visible
4. ✅ Retry button re-triggers loader without full refresh

---

## 📦 Tech Stack

- **React Router 7** - Framework with streaming, actions, loaders
- **React 19** - Latest React with Suspense
- **TypeScript** - Type safety
- **Shopify Polaris 12** - Design system
- **Vite** - Build tool

---

## 🎯 Key Takeaways

### Streaming (No defer needed in RR7)
Return promises directly from loaders. React Router automatically handles streaming.

### Optimistic UI
`useFetcher` + `fetcher.formData` = instant UI updates with automatic rollback.

### Error Boundaries
Route-level exports + `<Form method="get">` = resilient retry without page refresh.

---

Built with ❤️ for the Remix Resilience Developer Assessment
