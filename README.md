# Projeto 1

Aplicação web em **Next.js (App Router)**, criada para o curso de Claude Code.
Estado atual: projeto recém-criado com `create-next-app` — ainda só existe a página inicial padrão.

## Tecnologias

| Tecnologia | Versão | Para quê |
| --- | --- | --- |
| [Next.js](https://nextjs.org) | 16.4.0 | Framework (App Router, Server Components) |
| [React](https://react.dev) | 19.3.0 | Interface |
| TypeScript | 5 | Tipagem |
| Tailwind CSS | 4 | Estilização |
| ESLint | 9 | Qualidade de código |
| Geist (`next/font`) | — | Fontes |

Planejado (ainda não instalado): shadcn/ui, React Hook Form + Zod, Supabase (autenticação), Jest + React Testing Library.

## Como rodar

Pré-requisito: Node.js 20+.

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm start` | Roda o build de produção |
| `npm run lint` | Verifica o código com ESLint |
| `npm run type-check` | Checa tipos com TypeScript |

## Estrutura

```
app/
├── layout.tsx    # Layout raiz (fontes e <html>)
├── page.tsx      # Página inicial (rota "/")
├── globals.css   # Estilos globais + Tailwind
└── favicon.ico
public/           # Arquivos estáticos (imagens, SVGs)
.claude/          # Regras e skills do Claude Code
AGENTS.md         # Instruções para agentes de IA
```

## Padrão para novas páginas

Cada rota deve seguir esta organização (detalhes em `.claude/rules/rules-global.md`):

```
app/nome-da-pagina/
├── page.tsx          # Server Component: busca dados e valida acesso
├── _components/      # Componentes só desta página (client quando precisar)
├── _actions/         # Server Actions ("use server") com validação Zod
└── _data-access/     # Funções de leitura de dados (só no servidor)
```

Regras principais:
- Server Components por padrão; `"use client"` só com estado, eventos ou APIs do navegador.
- Sem acesso a banco ou lógica de negócio dentro de componentes.
- Formulários: shadcn/ui + React Hook Form + Zod.
- Componentes usados em várias páginas ficam em `src/components`.

## Próximos passos

- Trocar a página inicial padrão e o `metadata` do `layout.tsx`.
- Instalar shadcn/ui, React Hook Form e Zod.
- Configurar autenticação (Supabase) e variáveis de ambiente em `.env`.
- Configurar testes (Jest + React Testing Library).

## Saiba mais

- [Documentação do Next.js](https://nextjs.org/docs)
- [Documentação do Tailwind CSS](https://tailwindcss.com/docs)
