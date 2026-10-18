#!/usr/bin/env bash
# Stop hook: roda type-check + lint ao fim de cada turno do Claude.
# Se falhar, devolve o erro ao Claude (exit 2) para ele corrigir.
# Evita loop: se o hook já forçou a continuação uma vez, deixa parar.

input="$(cat)"
if printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# Carrega o nvm (shell não interativo não o carrega sozinho)
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

command -v npm >/dev/null 2>&1 || exit 0
[ -d node_modules ] || exit 0

# Só roda se algo mudou em código/config (evita custo em turnos só de conversa)
if command -v git >/dev/null 2>&1 && [ -z "$(git status --porcelain -- app components lib types hooks '*.ts' '*.tsx' '*.css' '*.mjs' 2>/dev/null)" ]; then
  exit 0
fi

out="$(npm run type-check 2>&1 && npm run lint 2>&1)"
status=$?
if [ $status -ne 0 ]; then
  printf 'type-check/lint falhou. Corrija antes de finalizar:\n%s\n' "$out" >&2
  exit 2
fi
exit 0
