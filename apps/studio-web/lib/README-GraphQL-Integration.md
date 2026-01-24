# GraphQL Control-Plane Integration

## Overview

This document describes how to integrate the GraphQL control-plane client into the studio-web application.

## Current Architecture

**File:** `app/page.tsx`

The current implementation uses an in-memory control-plane store:

```typescript
const seedControlPlane = (): { orgs: Org[]; userId: string; store: ControlPlaneStore } => {
  // Creates in-memory store with seed data
  const store = createControlPlaneStore({ orgs, orgMembers, ... });
  return { store, userId };
};

// In component:
const seedRef = useRef<ReturnType<typeof seedControlPlane> | null>(null);
if (!seedRef.current) {
  seedRef.current = seedControlPlane();
}
const { store, userId } = seedRef.current;
```

All operations use the in-memory store:
- `listOrgs(store, userId)` - sync operation
- `createProject(store, input, orgId)` - sync operation
- `listVideos(store, orgId)` - sync operation

## Target Architecture

**File:** `lib/control-plane-graphql.ts`

The GraphQL client provides async operations:

```typescript
const orgs = await listOrgs(userId);  // async operation
const project = await createProject(input, orgId);  // async operation
const videos = await listVideos(orgId);  // async operation
```

## Integration Approaches

### Approach 1: React Server Components (Recommended for New Apps)

Convert `app/page.tsx` from `"use client"` to a Server Component:

**Pros:**
- Can use async/await directly in component
- No loading states needed
- Data fetched on server before render

**Cons:**
- Cannot use React hooks (useState, useRef, etc.)
- Cannot use browser APIs (audio playback, canvas)
- Renderer components (Player, StoryboardRenderer) use browser APIs

**Verdict:** Not viable - the current page uses Player component which requires browser APIs.

### Approach 2: Client Component with useEffect (Current Approach)

Keep `"use client"` and fetch data in useEffect:

```typescript
"use client";

export default function Home() {
  const [userId, setUserId] = useState<string | null>(null);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Get authenticated user
        const user = await getCurrentUser();
        setUserId(user.userId);

        // Load orgs for user
        const userOrgs = await listOrgs(user.userId);
        setOrgs(userOrgs);
      } catch (error) {
        console.error("Failed to load data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  // Render UI with loaded data
}
```

**Pros:**
- Works with existing "use client" components
- Preserves React hooks and browser API usage

**Cons:**
- Requires loading states
- Initial render shows loading UI
- More complex state management

### Approach 3: Hybrid - Server Actions (Recommended)

Use Next.js Server Actions to bridge server and client:

**File:** `app/actions.ts`
```typescript
"use server";

import { getCurrentUser } from "aws-amplify/auth/server";
import * as cp from "../lib/control-plane-graphql";

export async function getInitialData() {
  const user = await getCurrentUser();
  const orgs = await cp.listOrgs(user.userId);
  const projects = await cp.listProjects(orgs[0]?.id);
  return { userId: user.userId, orgs, projects };
}

export async function createProjectAction(input: CreateProjectInput, orgId: string) {
  return cp.createProject(input, orgId);
}
```

**File:** `app/page.tsx`
```typescript
"use client";

import { getInitialData, createProjectAction } from "./actions";

export default function Home() {
  const [data, setData] = useState<Awaited<ReturnType<typeof getInitialData>> | null>(null);

  useEffect(() => {
    getInitialData().then(setData);
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  // Use server actions for mutations
  const handleCreateProject = async (name: string) => {
    const project = await createProjectAction({ name }, data.orgs[0].id);
    // Update local state
  };
}
```

**Pros:**
- Clean separation of server/client code
- Server actions handle auth automatically
- Client components can still use hooks

**Cons:**
- Requires Next.js 13+ with app router (already using it)
- Need to manage client-side state updates after mutations

## Recommended Implementation Plan

### Phase 1: Add Server Actions Layer

1. Create `app/actions.ts` with server actions for all control-plane operations
2. Use `"use server"` directive
3. Import GraphQL client functions
4. Handle auth with `getCurrentUser()` from Amplify

### Phase 2: Update Client Component

1. Replace `seedControlPlane()` with `useEffect` that calls server actions
2. Add loading state while data fetches
3. Use server actions for all mutations (create, update, delete)
4. Update local state after mutations complete

### Phase 3: Gradual Migration

Start with read-only operations:
- Load orgs, projects, videos (Phase 3.1)
- Then add create operations (Phase 3.2)
- Then add update operations (Phase 3.3)

This allows testing at each stage without breaking existing functionality.

## Example: Minimal Working Integration

**File:** `app/actions.ts`
```typescript
"use server";

import { getCurrentUser } from "aws-amplify/auth";
import * as cp from "../lib/control-plane-graphql.js";

export async function getOrgsForUser() {
  const user = await getCurrentUser();
  return {
    userId: user.userId,
    orgs: await cp.listOrgs(user.userId),
  };
}
```

**File:** `app/page.tsx` (simplified)
```typescript
"use client";

import { useEffect, useState } from "react";
import { getOrgsForUser } from "./actions.js";

export default function Home() {
  const [data, setData] = useState<{ userId: string; orgs: Org[] } | null>(null);

  useEffect(() => {
    getOrgsForUser().then(setData);
  }, []);

  if (!data) {
    return <div>Loading studio...</div>;
  }

  return (
    <div>
      <h1>Orgs for {data.userId}</h1>
      <ul>
        {data.orgs.map((org) => (
          <li key={org.id}>{org.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Testing Strategy

1. **Unit tests** - Test server actions in isolation (mock GraphQL client)
2. **Integration tests** - Test GraphQL client against real Amplify backend (already created)
3. **E2E tests** - Test full flow with Playwright

## Next Steps

1. ✓ Create GraphQL client (`lib/control-plane-graphql.ts`)
2. ✓ Create integration tests (`tests/control-plane-graphql.test.ts`)
3. Create server actions layer (`app/actions.ts`)
4. Update client component to use server actions
5. Add loading/error states
6. Test with real Amplify backend (requires amplify_outputs.json)

## Notes

- The in-memory store will remain available for:
  - Local development without backend
  - BDD tests that need deterministic data
  - Storybook stories

- The GraphQL client is a drop-in replacement with same interface:
  ```typescript
  // In-memory version
  const orgs = listOrgs(store, userId);

  // GraphQL version
  const orgs = await listOrgs(userId);
  ```

- Both implementations use the same types from `@babulus/shared`
