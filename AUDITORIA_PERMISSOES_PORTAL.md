# AUDITORIA_PERMISSOES_PORTAL — Menu x Permissões da API

Auditoria **conservadora** (somente leitura) cruzando:
- menu do Portal em `Portal/layout.js`
- rotas chamadas por `Portal/clientes.js`, `Portal/callbacks.js`, `Portal/usuarios.js`, `Portal/ml-tokens.js`, `Portal/scans.js`
- permissões reais no backend (`server/index.js`)

Critério:
- **coerente**: menu/guarda no frontend condiz com a permissão exigida na API (usuário comum não “cai” em rota admin).
- **incoerente**: usuário comum vê/entra numa página que depende de rota **admin** (tende a dar 403/erro/UX quebrada).

---

## 1) Páginas que aparecem no menu para usuário comum

Conforme `Portal/layout.js`, para usuário **não-admin** aparecem:
- `extensao.html` (Extensão)
- `ferramenta-or.html` (Ferramenta OR)
- `dashboard.html` (Dashboard)
- `fechamento.html` (Painel de análise de conversão)
- `financeiro.html` (Fechamento Financeiro)
- `clientes.html` (Clientes)
- `callbacks.html` (Callbacks)

Não aparecem (apenas admin):
- `ml-tokens.html` (Tokens ML)
- `usuarios.html` (Usuários)

Observação: `scans.html` **não está no menu** (mesmo existindo a página/JS).

---

## 2) Tabela de consistência (frontend x backend)

| Página | Aparece para quem no frontend | Permissão exigida no backend (rotas usadas) | Status | Recomendação conservadora |
|---|---|---|---|---|
| `clientes.html` | Usuário comum **e** admin (no menu) | **Admin**: `GET /clientes`, `POST /clientes`, `DELETE /clientes/:slug`, `GET /clientes/:slug/ml-status`, `DELETE /clientes/:slug/ml-token` (todas `authMiddleware + requireAdmin`) | **Incoerente** | Marcar `Clientes` como `adminOnly` no menu **ou** adicionar “guarda” no carregamento da página (redirecionar não-admin para `dashboard.html`) mantendo rotas intactas. |
| `callbacks.html` | Usuário comum **e** admin (no menu) | **Admin**: `GET /callbacks` (`authMiddleware + requireAdmin`). A página também chama `GET /bases` (Auth) para filtro. | **Incoerente** | Marcar `Callbacks` como `adminOnly` no menu **ou** bloquear/redirect no frontend quando `vf-user.role !== "admin"`. |
| `usuarios.html` | **Somente admin** (no menu) | **Admin**: `GET /usuarios`, `PATCH /usuarios/:id`, `DELETE /usuarios/:id` (todas `authMiddleware + requireAdmin`) | **Coerente** | Manter como está. (Já existe redirect no JS se não-admin.) |
| `ml-tokens.html` | **Somente admin** (no menu) | **Admin**: `GET /admin/ml-tokens` (`authMiddleware + requireAdmin`) | **Coerente** | Manter como está. (Já existe redirect no JS se não-admin.) |
| `scans.html` | **Não aparece no menu** (mas pode ser acessada por URL) | **Auth** para leitura: `GET /scans` (apenas `authMiddleware`). **Admin** para ações: `DELETE /scans/:id` e `DELETE /scans?conta=...` (ambas `requireAdmin`). | **Parcial / incoerência de UX** | Se a página for destinada a todos: esconder/desabilitar botões de exclusão para não-admin. Se for admin-only: adicionar ao menu como `adminOnly` e/ou redirect no JS (sem mudar rotas). |

---

## 3) Conclusão objetiva

- **Incoerências para usuário comum** (menu mostra, mas backend exige admin):
  - `clientes.html`
  - `callbacks.html`
- **Coerentes** (menu/admin gate e backend batem):
  - `usuarios.html`
  - `ml-tokens.html`
- **Fora do menu + risco de UX por permissão mista**:
  - `scans.html` (listar OK para qualquer autenticado; deletar só admin)

