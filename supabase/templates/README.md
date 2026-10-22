# Templates de autenticação do Bingeo

Estes templates foram preparados para o fluxo OTP do Bingeo e não contêm links de autenticação.

- `confirmation.html`: **Confirm signup**
- `magic-link.html`: **Magic Link / OTP**
- `recovery.html`: **Reset password**

Todos usam `{{ .Token }}` e foram feitos para o frontend em `public/js/modules/00-auth.js`.

## Projeto hospedado no Supabase

No projeto hospedado, os templates precisam ser aplicados em **Authentication > Email Templates** após habilitar um SMTP próprio.

Projetos Free criados após a mudança de junho de 2026 não podem personalizar templates usando o SMTP padrão do Supabase. Portanto, o SMTP próprio precisa estar configurado antes de colar estes conteúdos no Dashboard.
