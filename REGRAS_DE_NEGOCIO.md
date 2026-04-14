# REGRAS_DE_NEGOCIO — Venforce

Documento de referência **oficial** para orientar decisões e mudanças futuras no projeto.

---

## Princípios oficiais

1. **Portal é de uso interno**: o `Portal/` é destinado à equipe (operações/administração), não ao público final.
2. **Acesso uniforme às bases**: todo usuário autenticado da equipe deve **ver as mesmas bases**.
3. **Bases globais (sem segregação por usuário)**: as bases são **globais** e **não devem** ser segregadas por usuário **neste momento**.
4. **API em produção deve ser preservada**: a API atual (rotas, autenticação, contratos e comportamento) já está em produção e deve ser mantida.
5. **Melhorias incrementais e conservadoras**:
   - Não quebrar **rotas** existentes.
   - Não quebrar **payloads** (request/response).
   - Não quebrar **banco de dados** (tabelas, colunas, constraints, índices e semântica dos dados).
   - Não quebrar a **integração Mercado Livre** (OAuth, tokens, chamadas e fluxos).
6. **Sem refatoração estrutural grande agora**: evitar mudanças amplas de arquitetura, reorganização massiva de pastas, reescritas ou migrações grandes.
7. **Prioridade para segurança e compatibilidade** em qualquer mudança futura:
   - Segurança primeiro (princípio do menor privilégio, proteção de credenciais/tokens, validações).
   - Compatibilidade retroativa (mudanças devem ser “safe by default” para clientes internos e automações).

---

## Regras operacionais para mudanças futuras

- **Compatibilidade como contrato**: toda mudança deve assumir que existem consumidores (Portal, extensão e integrações) dependentes do comportamento atual.
- **Mudanças devem ser pequenas e reversíveis**: preferir alterações pontuais, com rollback simples.
- **Evolução sem ruptura**: quando houver necessidade de novo comportamento, preferir adicionar sem remover/alterar o existente (ex.: novos campos opcionais, novas rotas versionadas quando indispensável).

