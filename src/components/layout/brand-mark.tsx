import { cn } from "@/lib/utils";

/**
 * Custom mark — a horizon arch over a dune line, standing in for the generic
 * lucide "Compass" icon every other travel-brand redesign reaches for first.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={cn("size-6", className)}
      aria-hidden
    >
      <path
        d="M4 22c3-4 6-6 12-6s9 2 12 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M9 22a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="16" cy="9" r="2.6" fill="currentColor" />
    </svg>
  );
}
