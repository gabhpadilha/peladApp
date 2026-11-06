import type { ReactNode } from "react";
import Link from "next/link";
import { BackLink } from "@/app/_components/back-link";
import { BrandLogo } from "@/components/brand-logo";
import { CONTACT_EMAIL, TERMS_DATE_LABEL, TERMS_VERSION } from "@/lib/terms";

type LegalSection = { title: string; body: ReactNode };

/** Página de texto legal (Termos, Privacidade): pública, legível no celular, com a versão e a data. */
export function LegalPage({ title, intro, sections }: { title: string; intro: ReactNode; sections: LegalSection[] }) {
  return (
    <>
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-2xl items-center px-4">
          <Link href="/" aria-label="Cancha Club, início">
            <BrandLogo />
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <BackLink />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl leading-none font-extrabold uppercase">{title}</h1>
          <p className="text-sm text-muted-foreground">
            Versão {TERMS_VERSION} · atualizada em {TERMS_DATE_LABEL}
          </p>
          <div className="text-base leading-relaxed text-muted-foreground">{intro}</div>
        </div>
        <ol className="flex flex-col gap-6">
          {sections.map((section, index) => (
            <li key={section.title} className="flex flex-col gap-2">
              <h2 className="font-display text-xl font-bold tracking-wide uppercase">
                {index + 1}. {section.title}
              </h2>
              <div className="flex flex-col gap-3 text-base leading-relaxed text-muted-foreground">{section.body}</div>
            </li>
          ))}
        </ol>
        <nav aria-label="Documentos" className="flex flex-wrap gap-x-4 gap-y-1 border-t pt-4 text-sm">
          <Link href="/termos" className="text-primary hover:underline">Termos de Uso</Link>
          <Link href="/privacidade" className="text-primary hover:underline">Política de Privacidade</Link>
        </nav>
      </main>
    </>
  );
}

/** Como falar com a gente: e-mail quando configurado; senão, pelo administrador da pelada. */
export function ContactInfo() {
  return CONTACT_EMAIL ? (
    <p>
      Fale com a gente pelo e-mail{" "}
      <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
        {CONTACT_EMAIL}
      </a>
      .
    </p>
  ) : (
    <p>Por enquanto, fale com o administrador da sua pelada, que encaminha o seu pedido a quem opera o Cancha Club.</p>
  );
}
