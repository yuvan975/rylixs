import Link from "next/link";
import GoldDivider from "@/components/GoldDivider";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-32 text-center sm:px-6">
      <p className="eyebrow text-gold-600 mb-3">404</p>
      <h1 className="font-display text-5xl mb-6">Page Not Found</h1>
      <GoldDivider className="mb-8" />
      <p className="text-ink/50 mb-10">
        The page you&apos;re looking for has been moved, retired, or never
        existed.
      </p>
      <Link
        href="/"
        className="inline-block bg-ink px-8 py-3.5 eyebrow text-gold-300 hover:bg-black transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
