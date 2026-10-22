# Autenticação por e-mail do Bingeo

## Fluxo ativo em produção

Enquanto o Bingeo usa o serviço padrão de e-mail do Supabase, a autenticação funciona por **links enviados pelo próprio Supabase**:

- Cadastro: link de confirmação de conta.
- Login: Magic Link após a etapa de login do Bingeo.
- Recuperação: link de recuperação que volta ao Bingeo para definir uma nova senha.

O frontend ativo está em `public/js/modules/00-auth.js` e usa `detectSessionInUrl: true` para consumir a sessão retornada pelo link.

Os redirects de cadastro, Magic Link e recuperação apontam para a origem do Bingeo por meio de `authRedirectUrl()`.

## Templates OTP arquivados

Os arquivos HTML deste diretório com `{{ .Token }}` foram preparados para um possível fluxo OTP futuro. Eles **não devem ser aplicados enquanto o projeto estiver usando o SMTP padrão do Supabase**.

Quando houver SMTP próprio e a personalização de templates estiver disponível, esses arquivos poderão ser revisados e usados para migrar novamente para código OTP.
