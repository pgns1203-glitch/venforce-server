# MAPA_DO_SISTEMA — Venforce Scanner X1

Análise **conservadora** baseada somente em leitura das pastas `server`, `Portal` e `extension`.  
Escopo desta entrega: **mapear estrutura, arquivos principais, rotas e relações**, apontar potenciais legados/sensíveis e riscos de quebra de produção.

---

## Estrutura de pastas (alto nível)

- **`server/`**: API HTTP (Express) + acesso a Postgres (`pg`) + upload/parse de planilhas + integração OAuth/ML.
  - **`server/index.js`**: arquivo central; define *todas as rotas em uso* e middlewares.
  - **`server/config/database.js`**: pool Postgres via `DATABASE_URL` (SSL com `rejectUnauthorized:false`).
  - **`server/utils/`**
    - **`server/utils/fechamento/process.js`**: processamento de planilhas de performance (conversão/curvas/insights).
    - **`server/utils/mlClient.js`**: cliente de chamadas ao Mercado Livre + refresh de token.
  - **`server/auth/`**: conjunto alternativo/legado de auth por arquivo JSON (**não usado pelo `index.js` atual**).
  - **`server/downloads/`**: referenciado por `/downloads` e por `/download-ferramenta-or` (conteúdo não foi inspecionado aqui).
  - **`server/node_modules/`**: dependências (presente no repo; aumenta tamanho e risco operacional).

- **`Portal/`**: front-end estático (HTML/CSS/JS) do “painel administrativo”.
  - Páginas HTML: `index.html`, `dashboard.html`, `clientes.html`, `callbacks.html`, `ml-tokens.html`, `usuarios.html`, `scans.html`, `fechamento.html`, `financeiro.html`, `ferramenta-or.html`, `extensao.html`
  - Scripts JS correspondentes: `login.js`, `layout.js`, `dashboard.js`, `clientes.js`, `callbacks.js`, `ml-tokens.js`, `usuarios.js`, `scans.js`, `fechamento.js`, `financeiro.js`, `ferramenta-or.js`, `extensao.js`
  - **`Portal/style.css`**: UI/estilos.

- **`extension/`**: extensão Chrome MV3 (service worker + content script + UI local).
  - **`extension/manifest.json`**: permissões; `host_permissions` para `https://venforce-server.onrender.com/*`.
  - **`extension/content.js`**: content script injetado em `mercadolivre.com.br` (overlay + cálculo de MC/LC).
  - **`extension/background.js`**: abre `options.html` ao clicar no ícone.
  - **`extension/popup.html` + `extension/popup.js`**: UI/fluxo principal de login/base/import/scan.
  - **`extension/options.html`**: também inclui `popup.js` (UI alternativa/duplicada).
  - **`extension/options.js`**: tela antiga de “selecionar base” (parece legado).
  - **`extension/custos.json`**: fallback local de custos (no estado atual está vazio `{}`).

---

## Principais arquivos e para que servem

### Backend (`server/`)

- **`server/index.js`**
  - **Auth**: `/auth/register`, `/auth/login`, `/auth/me` via JWT.
  - **Admin / gestão**: usuários, clientes, tokens ML, callbacks, scans.
  - **Bases e custos**: upload/importação de planilha para popular tabela `custos`; leitura por slug.
  - **Integração Mercado Livre**: iniciar OAuth (`/ml/conectar/:clienteSlug`), receber callback (`/callback`), usar tokens em chamadas ao ML (`/ml/teste/:clienteId`, `/ml/items/:clienteId`).
  - **Fechamentos**:
    - “Análise de conversão” (Shopee): upload/compilação usando `utils/fechamento/process.js`
    - “Fechamento financeiro” (MELI/Shopee): processamento de vendas+custos e geração de XLSX em base64.

- **`server/utils/mlClient.js`**
  - Busca token ML por `cliente_id` no Postgres, faz refresh se perto de expirar, e chama endpoints do `api.mercadolibre.com`.
  - Indício de **duplicação/legado**: comentário “DUPLICATE” e TODO de extração.

- **`server/utils/fechamento/process.js`**
  - Lê planilha (aba “Produtos com Melhor Desempenho”), calcula métricas, curva ABC, listas de prioridade, etc.

- **`server/config/database.js`**
  - Pool Postgres com SSL permissivo (`rejectUnauthorized:false`).

### Portal (`Portal/`)

- **`Portal/index.html` + `Portal/login.js`**
  - Login e cadastro chamando a API e armazenando `vf-token` e `vf-user` em `localStorage`.
  - Envia mensagem `VENFORCE_SET_TOKEN` à extensão (quando disponível) após login.

- **`Portal/layout.js`**
  - Sidebar/rotas do portal (navegação) e controle simples de sessão.

- **`Portal/dashboard.html` + `Portal/dashboard.js`**
  - Listagem de bases e fluxo de importação de base (preview + confirmar).

- **`Portal/clientes.html` + `Portal/clientes.js`**
  - CRUD de clientes e vínculo/estado de conta Mercado Livre por cliente.

- **`Portal/callbacks.html` + `Portal/callbacks.js`**
  - Visualização paginada/filtrada do histórico de callbacks (requisições do endpoint público por API Key).

- **`Portal/usuarios.html` + `Portal/usuarios.js`**
  - Gestão de usuários (admin): ativar/desativar e remover.

- **`Portal/ml-tokens.html` + `Portal/ml-tokens.js`**
  - “Cofre” de tokens ML (admin): lista `access_token`/`refresh_token` e expiração.

- **`Portal/fechamento.html` + `Portal/fechamento.js`**
  - “Painel de análise de conversão”: envia arquivos para o backend processar e renderiza as tabelas/insights.

- **`Portal/financeiro.html` + `Portal/financeiro.js`**
  - “Fechamento financeiro”: envia vendas+custos e baixa XLSX resultante (base64 → Blob).

- **`Portal/ferramenta-or.html` + `Portal/ferramenta-or.js`**
  - Solicita um ZIP “ferramenta OR” ao backend com configuração gerada a partir de uma lista de MLBs.

- **`Portal/extensao.html` + `Portal/extensao.js`**
  - Página informativa; oferece link direto para um ZIP no GitHub (não chama a API).
  - `extensao.js` está essencialmente vazio (só `initLayout()`).

### Extensão (`extension/`)

- **`extension/popup.js`**
  - UI principal: login, restaurar sessão, listar bases, escolher base, desabilitar/excluir base, criar/importar base.
  - Contém um comando de “scan” que **lê dados do overlay** injetado pelo content script para contabilizar MC por anúncio (o “scan” no popup não chama a API de scans no trecho observado).

- **`extension/content.js`**
  - Injeta overlay na página do Mercado Livre e calcula MC/LC por anúncio.
  - Carrega custos via API `GET /bases/:baseId` com Bearer token do usuário; fallback para `custos.json` (atualmente vazio).
  - Escuta mensagens do popup (`VENFORCE_SET_TOKEN`, `VENFORCE_EXPAND_ALL`).

- **`extension/options.js`**
  - Tela simples que chama `GET /bases` **sem Authorization** e tenta renderizar como se fosse lista direta (parece incompatível com o backend atual). Forte indício de **legado**.

---

## Principais rotas da API (`server/index.js`)

Legenda:
- **Auth**: `Bearer <JWT>` em `Authorization`
- **Admin**: exige `req.user.role === "admin"`
- **API Key**: `x-api-key` header **ou** `?api_key=...`

### Rotas básicas / infra

- **GET `/`**: texto “API ... rodando”.
- **GET `/health`**: healthcheck.
- **GET `/setup`**: cria/ajusta tabelas no banco (**muito sensível**; ver riscos).
- **GET `/downloads/*`**: static files em `server/downloads/`.

### Autenticação (JWT)

- **POST `/auth/register`**: cria usuário.
- **POST `/auth/login`**: autentica; retorna `{ token, user }`.
- **GET `/auth/me`** (**Auth**): valida token e retorna user.

### Bases e custos (uso interno: Portal + extensão)

- **GET `/bases`** (**Auth**): lista bases.
- **GET `/bases/:baseId`** (**Auth**): retorna custos da base (map `produto_id` → custos/imposto/taxa).
- **POST `/importar-base`** (**Auth**, multipart)
  - Sem `confirmar=true`: retorna preview dos primeiros itens.
  - Com `confirmar=true`: persiste base e custos (deleta custos antigos da base e reinserre).
- **POST `/bases/:baseId/desabilitar`** (**Auth**): marca base inativa.
- **DELETE `/bases/:baseId`** (**Auth**): exclui base (admin pode excluir por id ou slug; não-admin exige vínculo).

### Endpoint público por API key (uso “externo”)

- **GET `/api/bases/:baseSlug`** (**API Key**): retorna custos da base e registra linha em `callbacks`.

### Clientes + vínculo Mercado Livre (admin)

- **GET `/clientes`** (**Auth + Admin**): lista clientes com `api_key`.
- **POST `/clientes`** (**Auth + Admin**): cria cliente e gera `api_key`.
- **DELETE `/clientes/:slug`** (**Auth + Admin**): remove cliente.
- **GET `/clientes/:slug/ml-status`** (**Auth + Admin**): status de token ML por cliente.
- **DELETE `/clientes/:slug/ml-token`** (**Auth + Admin**): desvincula token ML.

### Mercado Livre (admin para consumir dados / público para iniciar OAuth)

- **GET `/ml/teste/:clienteId`** (**Auth + Admin**): chama ML `/users/me`.
- **GET `/ml/items/:clienteId`** (**Auth + Admin**): lista itens ativos do usuário ML (usa ml_user_id salvo).
- **GET `/ml/conectar`**: retorna 410 com instrução.
- **GET `/ml/conectar/:clienteSlug`**: redireciona para OAuth do ML (gera `state` assinado).
- **GET `/callback`**: callback OAuth; troca `code` por tokens e salva em `ml_tokens`.

### Callbacks (admin)

- **GET `/callbacks`** (**Auth + Admin**): lista registros de callbacks com filtros (base/status/de/ate/page).

### Usuários (admin)

- **GET `/usuarios`** (**Auth + Admin**): lista usuários.
- **PATCH `/usuarios/:id`** (**Auth + Admin**): altera `ativo` e/ou `role`.
- **DELETE `/usuarios/:id`** (**Auth + Admin**): remove usuário.
- (**Também existe `GET /admin/users` e `GET /admin/ml-tokens`; o Portal usa as rotas “sem /admin” para usuários e “/admin/ml-tokens” para tokens**.)

### Scans (admin para delete; leitura geral autenticada)

- **POST `/scans`** (**Auth**): salva um “scan” no banco.
- **GET `/scans`** (**Auth**): lista últimos 500 scans.
- **DELETE `/scans/:id`** (**Auth + Admin**): remove scan por id.
- **DELETE `/scans?conta=...`** (**Auth + Admin**): remove scans por conta.

### Fechamentos (análises)

- **POST `/fechamentos/upload`** (**Auth**, multipart `file`): processa “planilha de performance” (retorna `data`).
- **POST `/fechamentos/compilar`** (**Auth**, multipart `files[]`): compila múltiplas planilhas (retorna `data`).
- **POST `/fechamentos/financeiro`** (**Auth**, multipart `sales`, `costs`, e campos): calcula fechamento financeiro e retorna `excelBase64`.

### Ferramenta OR (download ZIP)

- **POST `/download-ferramenta-or`** (**Auth**): retorna ZIP com scripts Python + `config.json` gerado.

---

## Quais páginas do Portal usam quais rotas

Base de API hardcoded no Portal: `https://venforce-server.onrender.com`.

- **`Portal/index.html` (`Portal/login.js`)**
  - `POST /auth/login`
  - `POST /auth/register`

- **`Portal/dashboard.html` (`Portal/dashboard.js`)**
  - `GET /bases`
  - `GET /bases/:slug` (para visualizar/usar custos de uma base específica)
  - `POST /importar-base` (preview e confirmação)
  - `DELETE /bases/:slug` (excluir base)

- **`Portal/clientes.html` (`Portal/clientes.js`)**
  - `GET /clientes`
  - `POST /clientes`
  - `DELETE /clientes/:slug`
  - `GET /clientes/:slug/ml-status`
  - `DELETE /clientes/:slug/ml-token`
  - Link externo (abre em nova aba): `GET /ml/conectar/:clienteSlug` (inicia OAuth)

- **`Portal/callbacks.html` (`Portal/callbacks.js`)**
  - `GET /bases` (para preencher filtro de base)
  - `GET /callbacks?base=&status=&de=&ate=&page=`

- **`Portal/usuarios.html` (`Portal/usuarios.js`)**
  - `GET /usuarios`
  - `PATCH /usuarios/:id`
  - `DELETE /usuarios/:id`

- **`Portal/ml-tokens.html` (`Portal/ml-tokens.js`)**
  - `GET /admin/ml-tokens`

- **`Portal/scans.html` (`Portal/scans.js`)**
  - `GET /scans`
  - `DELETE /scans?conta=...`
  - `DELETE /scans/:id`

- **`Portal/fechamento.html` (`Portal/fechamento.js`)**
  - `POST /fechamentos/upload`
  - `POST /fechamentos/compilar`

- **`Portal/financeiro.html` (`Portal/financeiro.js`)**
  - `POST /fechamentos/financeiro`

- **`Portal/ferramenta-or.html` (`Portal/ferramenta-or.js`)**
  - `POST /download-ferramenta-or`

- **`Portal/extensao.html` (`Portal/extensao.js`)**
  - **Não chama API**; link direto para ZIP em GitHub (`raw.githubusercontent.com`).

---

## Quais arquivos da extensão usam quais rotas

Base de API hardcoded na extensão: `https://venforce-server.onrender.com`.

### `extension/popup.js`

- **Sessão / auth**
  - `POST /auth/login`
  - `GET /auth/me` (restaurar sessão)
- **Bases**
  - `GET /bases`
  - `POST /importar-base` (criar base e importar)
  - `POST /bases/:baseId/desabilitar`
  - `DELETE /bases/:baseId`

> Observação: o popup também usa `chrome.scripting.executeScript` para ler o overlay na página e compor números de scan; não foi observado aqui um `POST /scans` direto do popup (apesar de a API existir).

### `extension/content.js`

- **Custos**
  - `GET /bases/:baseId` (carrega custos para cálculo do overlay; exige Bearer token)
- **Fallback**
  - `GET chrome.runtime.getURL("custos.json")` (arquivo local da extensão; atualmente vazio)

### `extension/options.js` (aparenta legado)

- `GET /bases` (**sem Authorization**) e espera uma estrutura diferente (usa `base.id`/`base.nome` diretamente).  
  No backend atual, `GET /bases` exige JWT e responde `{ ok: true, bases: [...] }`. Isso sugere que `options.js` ficou de uma versão anterior.

---

## Arquivos que parecem duplicados, legados ou sensíveis

### Duplicados/legados (alto risco de confusão)

- **`server/auth/*` vs `server/index.js`**
  - `server/index.js` implementa auth e registro via Postgres (`users`).
  - `server/auth/authController.js` implementa auth via `server/data/clients.json` (arquivo local) e usa `bcryptjs`.
  - **Indício forte**: a pasta `server/auth/` parece **legado/não utilizado** no fluxo atual (mas pode confundir manutenção).

- **`extension/options.js`** e **dois “layouts” de UI**
  - `options.js` parece incompatível com o backend atual.
  - `options.html` e `popup.html` compartilham `popup.js`, mas têm UIs diferentes → risco de comportamento divergente e “tela antiga” ainda acessível.

- **`Portal/extensao.js`**
  - Praticamente vazio; existe apenas para manter padrão/placeholder.

### Sensíveis (credenciais, dados pessoais, efeitos irreversíveis)

- **`server/index.js`**
  - Default `JWT_SECRET = "venforce_secret_local"` quando não configurado (perigoso se rodar assim em produção).
  - `ML_CLIENT_ID/SECRET` e fluxo OAuth (`/callback`) lidam com tokens e refresh tokens.
  - Rotas destrutivas: `DELETE /bases/:baseId`, `DELETE /clientes/:slug`, `DELETE /usuarios/:id`, `DELETE /scans...`.
  - **`GET /setup`**: cria/alter tables e índices — pode afetar dados e performance.

- **`Portal/ml-tokens.html` + `Portal/ml-tokens.js`**
  - Exibe `access_token` e `refresh_token` (mesmo que mascarado, há botão para copiar token completo).

- **`server/config/database.js`**
  - SSL com `rejectUnauthorized:false` (tolerante; dependendo do ambiente pode facilitar MITM se rede/CA comprometida).

- **`server/node_modules/` versionado**
  - Aumenta risco de vazamento de arquivos indevidos no deploy e atrapalha auditoria (não é “sensível” por si, mas é um cheiro operacional).

- **`Portal/extensao.html`**
  - Link de download de extensão via GitHub raw. Se o repositório remoto mudar, o Portal passa a distribuir outro binário/zip sem controle adicional (cadeia de suprimentos).

---

## Riscos de quebrar produção (principais)

- **Risco alto: `GET /setup` exposto**
  - Executa DDL (CREATE/ALTER/DROP constraint/index). Se acessível publicamente, pode:
    - causar lock/perda de performance,
    - criar tabelas inesperadas em ambiente errado,
    - mascarar problemas de migração (mudanças não versionadas).

- **Risco alto: segredo default e configuração permissiva**
  - `JWT_SECRET` default no backend permite que um deploy mal configurado aceite tokens assinados por um segredo conhecido.

- **Risco alto: rotas destrutivas sem “soft delete”**
  - Exclusões (`DELETE /bases`, `/clientes`, `/usuarios`, `/scans`) são irreversíveis no nível do app; erros de permissão/UX podem gerar perda de dados.

- **Risco médio: extensão com múltiplas UIs/arquivos legados**
  - `options.js` e duas páginas (`popup.html` e `options.html`) com o mesmo JS podem gerar bugs “dependendo de qual tela abriu”.

- **Risco médio: dependência forte de URL fixa**
  - Portal e extensão têm `https://venforce-server.onrender.com` hardcoded em vários arquivos. Mudança de domínio/ambiente exige alteração em múltiplos lugares.

- **Risco médio: logs/callbacks e dados pessoais**
  - `callbacks` registra IP e timings; cuidado com LGPD e retenção.

- **Risco médio: token ML armazenado e exposto via painel**
  - Compromisso do painel/admin → acesso aos tokens ML e potencial impacto na conta do cliente.

- **Risco baixo/médio: `server/node_modules` no repo**
  - Facilita drift e diffs enormes; risco operacional (deploy lento, conflitos, auditabilidade).

---

## Notas rápidas de consistência observadas

- O **Portal** parece alinhado ao backend atual (usa Bearer token e estruturas esperadas).
- A **extensão** (fluxo principal em `popup.js` + `content.js`) está alinhada às rotas atuais (`/auth/*`, `/bases`, `/importar-base`, etc.).
- `extension/options.js` parece **desalinhado** (sem Bearer + payload diferente).

---

## Arquivos lidos nesta análise (exatos)

### `server/`

- `server/index.js`
- `server/package.json`
- `server/config/database.js`
- `server/utils/mlClient.js`
- `server/utils/fechamento/process.js`
- `server/auth/authRoutes.js`
- `server/auth/authController.js`
- `server/auth/authMiddleware.js`

### `Portal/`

- `Portal/layout.js`
- `Portal/login.js`
- `Portal/dashboard.js`
- `Portal/clientes.js`
- `Portal/callbacks.js`
- `Portal/usuarios.js`
- `Portal/scans.js`
- `Portal/ml-tokens.js`
- `Portal/financeiro.js`
- `Portal/fechamento.js`
- `Portal/ferramenta-or.js`
- `Portal/extensao.js`
- `Portal/index.html`
- `Portal/dashboard.html`
- `Portal/clientes.html`
- `Portal/callbacks.html`
- `Portal/usuarios.html`
- `Portal/scans.html`
- `Portal/financeiro.html`
- `Portal/fechamento.html`
- `Portal/ml-tokens.html`
- `Portal/ferramenta-or.html`
- `Portal/extensao.html`
- `Portal/style.css`

### `extension/`

- `extension/manifest.json`
- `extension/background.js`
- `extension/popup.js`
- `extension/content.js`
- `extension/options.js`
- `extension/popup.html`
- `extension/options.html`
- `extension/custos.json`

