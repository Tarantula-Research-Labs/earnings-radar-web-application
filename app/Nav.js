"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [["/", "Overview"], ["/radar", "Radar"]];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="nav">
      <div className="nav-in">
        <Link href="/" className="brand" aria-label="Tremor home">
          <span className="brand-lab">Tarantula Research Labs</span>
          <span className="brand-sep" aria-hidden="true">/</span>
          <span className="brand-name">Tremor</span>
        </Link>
        <nav className="nav-links" aria-label="Main">
          {LINKS.map(([href, label]) => (
            <Link key={href} href={href} className="nav-link" aria-current={path === href ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
