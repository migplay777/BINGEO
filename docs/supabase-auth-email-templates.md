# Templates de e-mail do Supabase Auth para o Bingeo

Estes templates devem ser configurados em **Supabase → Authentication → Emails → Email Templates**.
O frontend do Bingeo espera códigos OTP digitáveis, não links.

## Confirm signup

**Subject**

```
Confirme sua conta no Bingeo
```

**Body**

```html
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
  <h2>Confirme sua conta no Bingeo</h2>
  <p>Digite o código abaixo no Bingeo para confirmar seu e-mail:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">
    {{ .Token }}
  </div>
  <p style="color:#777;font-size:13px">
    Se você não criou uma conta no Bingeo, ignore este e-mail.
  </p>
</div>
```

## Magic Link / Email OTP

**Subject**

```
Seu código de acesso ao Bingeo
```

**Body**

```html
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
  <h2>Seu código de acesso ao Bingeo</h2>
  <p>Use o código abaixo para concluir seu login:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">
    {{ .Token }}
  </div>
  <p style="color:#777;font-size:13px">
    Nunca compartilhe este código. Se você não tentou entrar no Bingeo, ignore este e-mail.
  </p>
</div>
```

## Reset password / Recovery

**Subject**

```
Código para redefinir sua senha do Bingeo
```

**Body**

```html
<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
  <h2>Redefinição de senha</h2>
  <p>Digite o código abaixo no Bingeo para continuar:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0">
    {{ .Token }}
  </div>
  <p style="color:#777;font-size:13px">
    Se você não solicitou uma nova senha, ignore este e-mail.
  </p>
</div>
```

## Regra importante

Não incluir `{{ .ConfirmationURL }}` nesses três templates. A presença de `{{ .Token }}` é o que permite ao frontend usar código OTP.
