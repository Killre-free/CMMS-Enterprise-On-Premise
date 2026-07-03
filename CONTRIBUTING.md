// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-sm text-muted-foreground">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
        Back to Dashboard
      </Link>
    </div>
  );
}
