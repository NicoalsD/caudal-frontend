# CLAUDE.md

Este archivo guía a Claude Code en este repositorio. Las reglas del proyecto están en `AGENTS.md`, que es la fuente única; no las dupliques aquí:

@AGENTS.md

## Notas específicas para Claude Code

- **Idioma:** código en inglés; textos de la UI en español centralizados en `src/i18n/es.ts`; documentación, commits y PR en español.
- **Commits:** `tipo: descripción` en español, uno por unidad lógica. **Nunca** agregues `Co-Authored-By` de Claude ni "Generated with Claude Code"; el hook lo rechaza.
- **Cuentas:** cambia a la cuenta del integrante dueño de la tarea antes de commitear (`gh auth switch` + identidad git) y verifica con `gh api user --jq .login`. Solo `NicoalsD`, `Drako2305` y `nicomora70`.
- **Diseño:** antes de diseñar o cambiar la UI usa las skills `frontend-design`, `web-design-guidelines`, `ui-ux-pro-max`, `emil-design-eng`, `vercel-react-best-practices`, `vercel-composition-patterns`, `break-ui` y `ask-sonner`, y sigue `.agents/design-theme.md`.
- **Subagentes:** se puede delegar a Claude Haiku o a OpenCode Go, pero solo Claude hace los commits después de revisar el diff.
- **Diagramas:** usa el MCP de draw.io y exporta el `.png` junto al `.drawio` en `docs/images/`.
