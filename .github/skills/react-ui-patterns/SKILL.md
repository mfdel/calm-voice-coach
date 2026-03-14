---
name: react-ui-patterns
description: Component structure, React Query hooks, shadcn/ui usage, and mobile-first patterns for ParentPilot
---

# React UI Patterns — ParentPilot

## 1. React Query Hook Pattern

All data fetching lives in `src/hooks/`. Pages and components call hooks, not Supabase directly.

```typescript
// src/hooks/useChildProfiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ChildProfile = Database['public']['Tables']['child_profiles']['Row'];

export function useChildProfiles() {
  return useQuery({
    queryKey: ['child_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChildProfile[];
    },
  });
}

export function useUpdateChildProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: Partial<ChildProfile> & { id: string }) => {
      const { data, error } = await supabase
        .from('child_profiles')
        .update(update)
        .eq('id', update.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['child_profiles'] });
    },
  });
}
```

---

## 2. Page Structure (Thin Orchestrator)

Pages should be thin. Logic in hooks, UI in components.

```typescript
// src/pages/ProfilePage.tsx
export default function ProfilePage() {
  const { data: profiles, isLoading, error } = useChildProfiles();
  const updateProfile = useUpdateChildProfile();

  if (isLoading) return <PageSkeleton />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="flex flex-col min-h-screen pb-[env(safe-area-inset-bottom)]">
      {/* content */}
      <BottomTabBar />
    </div>
  );
}
```

---

## 3. Mobile-First Layout

```tsx
// Full-screen mobile page with safe areas
<div className="flex flex-col min-h-[100dvh] bg-background">
  {/* Scrollable content area */}
  <main className="flex-1 overflow-y-auto px-4 pt-4 pb-24">
    {/* page content */}
  </main>

  {/* Fixed bottom bar — above home indicator */}
  <div className="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] bg-background border-t">
    <BottomTabBar />
  </div>
</div>
```

### Touch Target Rule
All interactive elements: minimum `h-11 w-11` (44×44px):
```tsx
<Button className="h-11 px-6">Tap Me</Button>
<button className="h-11 w-11 flex items-center justify-center" aria-label="Close">
  <X className="h-5 w-5" />
</button>
```

---

## 4. shadcn/ui Component Usage

### Bottom Sheet (mobile modal)
```tsx
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

<Drawer open={open} onOpenChange={setOpen}>
  <DrawerContent>
    <DrawerHeader>
      <DrawerTitle>Select Child</DrawerTitle>
    </DrawerHeader>
    <div className="px-4 pb-[env(safe-area-inset-bottom)]">
      {/* content */}
    </div>
  </DrawerContent>
</Drawer>
```

### Form with validation (Zod + React Hook Form)
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  display_name: z.string().min(1, 'Name is required').max(50),
});

export function ChildProfileForm({ onSubmit }: { onSubmit: (v: z.infer<typeof schema>) => void }) {
  const form = useForm({ resolver: zodResolver(schema) });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="display_name" render={({ field }) => (
          <FormItem>
            <FormLabel>Child's name</FormLabel>
            <FormControl>
              <Input className="h-11 text-base" placeholder="e.g. Leo" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full h-11">Save</Button>
      </form>
    </Form>
  );
}
```

---

## 5. SOS Mode Palette

Use CSS variables defined in `src/App.css`:
```tsx
// SOS background
<div className="bg-[var(--sos-bg)] text-[var(--sos-fg)]">
  <button className="bg-[var(--sos-accent)]">Get Help</button>
</div>
```

Never hardcode SOS colors — always use the CSS vars.

---

## 6. Loading & Error States

```tsx
// Loading skeleton
function PageSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
    </div>
  );
}

// Error state with toast
import { toast } from 'sonner';

// In mutation onError:
onError: (error) => {
  toast.error('Something went wrong', { description: error.message });
}
```
