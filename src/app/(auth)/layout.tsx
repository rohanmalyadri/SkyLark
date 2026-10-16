import Image from "next/image";
import Link from "next/link";
import { Logo } from "@/components/ui/marks";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <Link href="/" className="self-start" aria-label="Skylark home">
          <Logo />
        </Link>
        <main id="main" className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-14">
          {children}
        </main>
        <p className="text-center text-xs text-subtle lg:text-left">Protected by row-level security and signed sessions.</p>
      </div>

      <aside className="relative isolate hidden overflow-hidden bg-[#D6D6D4] lg:block" aria-hidden>
        <div className="absolute left-[18%] top-[22%] -z-10 aspect-square w-[44%] rounded-full bg-sky" />
        <Image src="/art/print.png" alt="" fill sizes="50vw" className="-z-10 object-cover mix-blend-multiply" />
        <div className="flex h-full flex-col justify-between p-12 xl:p-16">
          <p className="meta-label text-fg/70">Skylark</p>
          <div>
            <p className="display text-[clamp(56px,6vw,96px)] text-fg">
              <span className="block">Fewer forms.</span>
              <span className="block pl-[0.42em]">Better</span>
              <span className="block pl-[0.84em]">applications.</span>
            </p>
            <p className="mt-10 max-w-[360px] text-[16px] leading-relaxed text-fg/80">
              Share your profile once. We match, tailor and — with a specialist — submit, while you prepare for the interviews.
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
