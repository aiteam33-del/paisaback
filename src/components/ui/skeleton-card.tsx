import { cn } from "@/lib/utils";

export const SkeletonCard = ({ className }: { className?: string }) => (
  <div className={cn("rounded-2xl border border-border/50 bg-card p-6 animate-pulse", className)}>
    <div className="flex items-start justify-between mb-4">
      <div className="w-12 h-12 rounded-xl bg-muted" />
      <div className="w-16 h-6 rounded-full bg-muted" />
    </div>
    <div className="h-8 w-24 bg-muted rounded mb-2" />
    <div className="h-4 w-20 bg-muted rounded" />
  </div>
);

export const SkeletonExpenseRow = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-card animate-pulse", className)}>
    <div className="w-10 h-10 rounded-lg bg-muted" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-32 bg-muted rounded" />
      <div className="h-3 w-24 bg-muted rounded" />
    </div>
    <div className="text-right space-y-2">
      <div className="h-5 w-20 bg-muted rounded ml-auto" />
      <div className="h-4 w-16 bg-muted rounded ml-auto" />
    </div>
  </div>
);

export const SkeletonForm = ({ className }: { className?: string }) => (
  <div className={cn("rounded-2xl border border-border/50 bg-card overflow-hidden animate-pulse", className)}>
    <div className="p-6 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-3 w-32 bg-muted rounded" />
        </div>
      </div>
    </div>
    <div className="p-6 space-y-6">
      <div className="h-32 rounded-2xl bg-muted" />
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-10 bg-muted rounded-xl" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-10 bg-muted rounded-xl" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-10 bg-muted rounded-xl" />
      </div>
      <div className="h-12 bg-muted rounded-xl" />
    </div>
  </div>
);

export const SkeletonDashboard = () => (
  <div className="space-y-8 animate-pulse">
    {/* Header Skeleton */}
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-32 bg-muted rounded" />
      </div>
      <div className="flex gap-2">
        <div className="h-10 w-24 bg-muted rounded-xl" />
        <div className="h-10 w-24 bg-muted rounded-xl" />
      </div>
    </div>

    {/* Stats Skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>

    {/* Content Skeleton */}
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3">
        <SkeletonForm />
      </div>
      <div className="lg:col-span-2 space-y-3">
        <SkeletonExpenseRow />
        <SkeletonExpenseRow />
        <SkeletonExpenseRow />
      </div>
    </div>
  </div>
);
