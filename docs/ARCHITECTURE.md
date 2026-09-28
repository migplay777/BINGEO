# Arquitetura do Bingeo

O frontend foi separado por responsabilidade para facilitar leitura e manutenção no GitHub.

## Frontend

- public/index.html: estrutura HTML e referências aos assets.
- public/css/: estilos separados por área visual, incluindo o tema claro em 05-theme.css.
- public/js/theme-bootstrap.js: aplica a última preferência de tema antes da interface aparecer.
- public/js/modules/: JavaScript separado por domínio.
- public/assets/: imagens e arquivos estáticos.

## JavaScript

- 00-auth.js: autenticação e sessão.
- 10-catalog.js: catálogo.
- 20-state-data.js: estado, storage, ícones e dados.
- 30-integrations.js: TMDB, TVmaze, TheTVDB e AniList.
- 40-ui-components.js: helpers e componentes.
- 50-discover-library.js: Descobrir e Estante.
- 60-lists.js: listas.
- 70-profile.js: perfil, favoritos, Top 5 e Top 3.
- 80-evaluations-modal.js: avaliações e modal.
- 90-render-uploads.js: render e uploads.
- 95-events.js: eventos.
- 99-boot.js: inicialização.

## Bundle

O server.js concatena os módulos na ordem de APP_MODULE_FILES e entrega /js/app.bundle.js dentro de uma única IIFE. Isso preserva o escopo compartilhado do código original.

Ao criar ou renomear um módulo, atualize APP_MODULE_FILES no server.js.

## Segurança

Chaves privadas continuam somente no backend/Render; nunca devem ir para public/.