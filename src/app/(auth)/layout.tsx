import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-secondary/40">
      <header className="border-b bg-card/90 px-4 py-4 backdrop-blur sm:px-6">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 font-heading text-[1.05rem] font-bold"
        >
          <BrandMark className="text-primary" />
          MaghrebVoyage
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
