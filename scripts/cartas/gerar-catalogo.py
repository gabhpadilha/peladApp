"""Gera as fichas das cartas a partir de docs/cartas/catalogo.json.

    python3 scripts/cartas/gerar-catalogo.py

Saídas (sobrescreve):
- docs/cartas/README.md: regras, índice de todas as cartas (com miniatura) e o que está em andamento e por vir;
- docs/cartas/LINHA-DO-TEMPO.md: tudo que já foi feito, por data, juntando o histórico de cada carta;
- docs/cartas/<chave>/README.md: a ficha da carta;
- docs/cartas/<chave>/montada/<chave>-2d.webp: a carta montada como o app mostra (fundo + moldura, sem foto).
  É uma montagem aproximada (o app ainda põe neon, enfeites e flutuantes em código); a fonte da verdade é o app.
Edite só o catalogo.json; as peças de cada carta nova ficam em docs/cartas/<chave>/pecas/.
"""
import json
import os
from collections import defaultdict

from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DOCS = os.path.join(ROOT, "docs", "cartas")
FUNDOS = os.path.join(ROOT, "public", "cartas", "fundos")
P = "docs/superpowers/specs/2026-10-28-cartas-assets/prototipos/"
ESTADO = {"no-app": "no app", "guardada": "guardada", "descartada": "descartada", "saiu": "saiu do app"}
RARIDADE = {"comum": "Comum", "rara": "Rara", "epica": "Épica", "lendaria": "Lendária", None: "—"}
TIPO = {"skin": "Skins", "premio": "Visuais de prêmio"}


def caminho(p):
    return p.replace("P/", P)


def montar(c):
    """Fundo na caixa da carta (8% de sobra por lado, como TRIMMED_CARD) e a moldura por cima."""
    app = c.get("app", {})
    fundo = os.path.join(FUNDOS, app.get("fundo", "") + ".webp")
    if not os.path.exists(fundo):
        return None
    H = 1000
    ow = round(H * 5 / 7)
    vaza = os.path.join(FUNDOS, app["vaza"] + ".webp") if app.get("vaza") else None
    largura = app.get("largura_vaza", 1.0)
    W = max(ow, round(ow * largura))
    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bx0, by0, bx1, by1 = round(ow * 0.08), round(H * 0.08), round(ow * 0.92), round(H * 0.92)
    bg = Image.open(fundo).convert("RGBA").resize((bx1 - bx0, by1 - by0), Image.LANCZOS)
    mask = Image.new("L", bg.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, bg.size[0] - 1, bg.size[1] - 1), radius=round(bg.size[0] * 0.075), fill=255)
    out.paste(bg, (bx0, by0), mask)
    if vaza and os.path.exists(vaza):
        v = Image.open(vaza).convert("RGBA")
        v = v.resize((round(ow * largura), H) if app.get("largura_vaza") else (ow, H), Image.LANCZOS)
        out.alpha_composite(v, (0, 0))
    return out


def ficha(c, tem_montada):
    k = c["chave"]
    linhas = [f"# {c['nome']}", "", "> Ficha gerada de `docs/cartas/catalogo.json` por `scripts/cartas/gerar-catalogo.py`. Edite o JSON, não este arquivo.", ""]
    dados = [
        ("Chave", f"`{k}`"),
        ("Tipo", "skin" if c["tipo"] == "skin" else "visual de prêmio"),
        ("Raridade", RARIDADE.get(c.get("raridade"))),
        ("Onde aparece", c.get("onde") or "—"),
        ("Evento", c.get("evento") or "—"),
        ("Nível e preço", f"nível {c['nivel']}, {c['preco']} CC" if c.get("nivel") is not None and c.get("preco") is not None else "—"),
        ("Estado", ESTADO.get(c["estado"], c["estado"])),
        ("Roupa no código", f"`{c.get('roupa')}` em `components/cancha-card.tsx`" if c.get("roupa") else "—"),
    ]
    linhas += ["| | |", "| --- | --- |"] + [f"| {a} | {b} |" for a, b in dados] + [""]
    if tem_montada or c.get("versao_3d"):
        linhas.append("## Montada")
        linhas.append("")
        if tem_montada:
            linhas.append(f"![{c['nome']}](montada/{k}-2d.webp)")
        if c.get("versao_3d"):
            linhas.append(f"![{c['nome']} em 3D](montada/{k}-3d.webp)")
        linhas.append("")
    app = c.get("app", {})
    linhas += ["## Arquivos no app (`public/cartas/fundos/`)", ""]
    for rot, chave in (("Fundo", "fundo"), ("Moldura e o que vaza", "vaza"), ("Flutuantes", "flutuantes")):
        if app.get(chave):
            linhas.append(f"- {rot}: `{app[chave]}{'.webp' if chave != 'flutuantes' else ''}`")
    if app.get("raios"):
        linhas.append("- Raios que acendem: " + ", ".join(f"`{r}.webp`" for r in app["raios"]))
    linhas.append("")
    linhas += ["## Peças originais (do Gemini, como o dono mandou)", ""]
    linhas += [f"- `{caminho(p)}`" for p in c.get("pecas", [])] or ["- nenhuma separada (feita em código ou arte achatada)"]
    linhas += ["", "## Scripts", ""]
    linhas += [f"- `{caminho(s)}`" for s in c.get("scripts", [])] or ["- —"]
    linhas += ["", "## Histórico", ""]
    linhas += [f"- **{d}**: {t}" for d, t in c.get("historico", [])]
    if c.get("notas"):
        linhas += ["", "## Notas", "", c["notas"]]
    return "\n".join(linhas) + "\n"


def main():
    cat = json.load(open(os.path.join(DOCS, "catalogo.json"), encoding="utf-8"))
    cartas = cat["cartas"]
    for c in cartas:
        pasta = os.path.join(DOCS, c["chave"])
        os.makedirs(os.path.join(pasta, "montada"), exist_ok=True)
        img = montar(c)
        if img:
            img.thumbnail((500, 700))
            img.save(os.path.join(pasta, "montada", f"{c['chave']}-2d.webp"), quality=86, method=6)
        with open(os.path.join(pasta, "README.md"), "w", encoding="utf-8") as f:
            # cartas ainda fora do app têm a prévia feita por previa-pecas.py
            existe = os.path.exists(os.path.join(pasta, "montada", f"{c['chave']}-2d.webp"))
            f.write(ficha(c, img is not None or existe))

    idx = ["# Cartas do Cancha Club", "",
           "> Gerado de `docs/cartas/catalogo.json` por `python3 scripts/cartas/gerar-catalogo.py`. Para consultar rápido, leia o JSON ou a ficha da carta; não precisa varrer o app.", "",
           "## Regras", ""] + [f"- {r}" for r in cat.get("regras", [])] + [
           "", "## Como cada carta é guardada", "",
           "```", "docs/cartas/<chave>/", "  README.md        ficha (gerada)", "  pecas/           imagens do Gemini como vieram: fundo, borda, enfeite-*, render-*, flutuante-*",
           "  montada/         <chave>-2d.webp (gerada) e <chave>-3d.webp (Blender, se houver)", "```", "",
           "As cartas anteriores a 2026-11-11 têm as peças na pasta de protótipos (`" + P + "`); a ficha aponta para elas.", ""]
    for tipo in ("skin", "premio"):
        grupo = [c for c in cartas if c["tipo"] == tipo]
        idx += [f"## {TIPO[tipo]} ({len(grupo)})", "", "| | Carta | Raridade | Onde | Evento | Estado |", "| --- | --- | --- | --- | --- | --- |"]
        for c in grupo:
            mini = f"![](./{c['chave']}/montada/{c['chave']}-2d.webp)" if os.path.exists(os.path.join(DOCS, c["chave"], "montada", f"{c['chave']}-2d.webp")) else ""
            mini = mini.replace("![](", '<img width="60" src="').replace(".webp)", '.webp">') if mini else ""
            idx.append(f"| {mini} | [{c['nome']}](./{c['chave']}/README.md) | {RARIDADE.get(c.get('raridade'))} | {c.get('onde') or '—'} | {c.get('evento') or '—'} | {ESTADO.get(c['estado'])} |")
        idx.append("")
    idx += ["## Em andamento", ""] + [f"- **{d}**: {t}" for d, t in cat.get("em_andamento", [])]
    idx += ["", "## Próximos", ""] + [f"- **{d}**: {t}" for d, t in cat.get("proximos", [])]
    idx += ["", "Linha do tempo completa: [LINHA-DO-TEMPO.md](LINHA-DO-TEMPO.md).", ""]
    with open(os.path.join(DOCS, "README.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(idx))

    por_data = defaultdict(list)
    for c in cartas:
        for d, t in c.get("historico", []):
            por_data[d].append(f"[{c['nome']}](./{c['chave']}/README.md): {t}")
    tl = ["# Linha do tempo das cartas", "", "> Gerada do histórico de cada carta em `docs/cartas/catalogo.json`.", ""]
    for d in sorted(por_data, reverse=True):
        tl += [f"## {d}", ""] + [f"- {x}" for x in por_data[d]] + [""]
    tl += ["## Em andamento", ""] + [f"- **{d}**: {t}" for d, t in cat.get("em_andamento", [])]
    tl += ["", "## Próximos", ""] + [f"- **{d}**: {t}" for d, t in cat.get("proximos", [])] + [""]
    with open(os.path.join(DOCS, "LINHA-DO-TEMPO.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(tl))
    print(len(cartas), "cartas")


if __name__ == "__main__":
    main()
