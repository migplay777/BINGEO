const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const TMDB_READ_TOKEN = process.env.TMDB_READ_TOKEN;
const THETVDB_API_KEY = process.env.THETVDB_API_KEY;
const THETVDB_PIN = process.env.THETVDB_PIN || '';
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bazujvpppbxxiymxweiq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_y6uiZr53J-ZtPCWDRNEvjw_x-ZGU-mi';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';
const ASAAS_WEBHOOK_TOKEN = process.env.ASAAS_WEBHOOK_TOKEN || '';
const ASAAS_ENV = process.env.ASAAS_ENV === 'production' ? 'production' : 'sandbox';
const ASAAS_API_BASE = ASAAS_ENV === 'production' ? 'https://api.asaas.com/v3' : 'https://api-sandbox.asaas.com/v3';
const BINGEO_BASE_URL = String(process.env.BINGEO_BASE_URL || 'https://bingeo.onrender.com').replace(/\/$/,'');
const BINGEO_PRO_MONTHLY_PRICE = Number(process.env.BINGEO_PRO_MONTHLY_PRICE || '14.90');
const BINGEO_LEGAL_NAME = String(process.env.BINGEO_LEGAL_NAME || '').trim();
const BINGEO_LEGAL_TAX_ID = String(process.env.BINGEO_LEGAL_TAX_ID || '').trim();
const BINGEO_LEGAL_ADDRESS = String(process.env.BINGEO_LEGAL_ADDRESS || '').trim();
const BINGEO_LEGAL_CITY = String(process.env.BINGEO_LEGAL_CITY || '').trim();
const BINGEO_LEGAL_STATE = String(process.env.BINGEO_LEGAL_STATE || '').trim();
const BINGEO_LEGAL_POSTAL_CODE = String(process.env.BINGEO_LEGAL_POSTAL_CODE || '').trim();
const BINGEO_SUPPORT_EMAIL = String(process.env.BINGEO_SUPPORT_EMAIL || '').trim();
const BINGEO_PRIVACY_EMAIL = String(process.env.BINGEO_PRIVACY_EMAIL || BINGEO_SUPPORT_EMAIL).trim();
const BINGEO_AUDIT_SALT = String(process.env.BINGEO_AUDIT_SALT || '').trim();
const BILLING_TERMS_VERSION = '2026-10-01';
const BILLING_PRIVACY_VERSION = '2026-10-01';
const BILLING_REFUND_VERSION = '2026-10-01';
let theTvdbToken = null;
let theTvdbTokenExpiresAt = 0;

app.disable('x-powered-by');
app.set('trust proxy', 1);

const securityHeaders = (_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://bazujvpppbxxiymxweiq.supabase.co wss://bazujvpppbxxiymxweiq.supabase.co",
      'upgrade-insecure-requests'
    ].join('; ')
  );
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};
app.use(securityHeaders);

const rateBuckets = new Map();
const RATE_BUCKET_MAX_KEYS = 10000;
function fixedWindowRateLimit({windowMs, max, prefix}) {
  return (req, res, next) => {
    const now = Date.now();
    const key = prefix + ':' + (req.ip || req.socket.remoteAddress || 'unknown');
    let bucket = rateBuckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = {count:0, resetAt:now + windowMs};
      rateBuckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({error:'Muitas requisições. Tente novamente em instantes.'});
    }
    if (rateBuckets.size > RATE_BUCKET_MAX_KEYS) {
      for (const [k, v] of rateBuckets) {
        if (now >= v.resetAt) rateBuckets.delete(k);
        if (rateBuckets.size <= RATE_BUCKET_MAX_KEYS) break;
      }
    }
    next();
  };
}
const apiRateLimiter = fixedWindowRateLimit({windowMs:60 * 1000, max:180, prefix:'api'});
const asaasWebhookRateLimiter = fixedWindowRateLimit({windowMs:60 * 1000, max:600, prefix:'asaas-webhook'});
app.use('/api', (req,res,next) => {
  if (req.path === '/billing/webhooks/asaas') return next();
  return apiRateLimiter(req,res,next);
});
app.use('/api/billing/webhooks/asaas', asaasWebhookRateLimiter);
app.use('/api/billing', express.json({
  limit:'96kb',
  verify(req,_res,buf){ req.rawBody=Buffer.from(buf); }
}));

const verifiedApiTokens = new Map();
const API_TOKEN_CACHE_MAX = 5000;
async function requireAuthenticatedApiUser(req, res, next) {
  if (req.path === '/health' || req.path === '/legal/config' || req.path === '/billing/webhooks/asaas') return next();

  const token = String(req.get('x-bingeo-session') || '');
  if (token.length < 20 || token.length > 4096 || /\s/.test(token)) {
    return res.status(401).json({error:'Autenticação necessária.'});
  }
  const cacheKey = crypto.createHash('sha256').update(token).digest('hex');
  const now = Date.now();
  const cached = verifiedApiTokens.get(cacheKey);
  if (cached && cached.expiresAt > now && cached.user) {
    req.bingeoUser = cached.user;
    req.bingeoToken = token;
    return next();
  }

  try {
    const response = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: 'Bearer ' + token,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!response.ok) return res.status(401).json({error:'Sessão inválida ou expirada.'});
    const user = await response.json().catch(() => null);
    if (!user || !user.id) return res.status(401).json({error:'Sessão inválida.'});

    verifiedApiTokens.set(cacheKey, {expiresAt:now + 60000,user});
    if (verifiedApiTokens.size > API_TOKEN_CACHE_MAX) {
      for (const [key, value] of verifiedApiTokens) {
        if (!value || value.expiresAt <= now) verifiedApiTokens.delete(key);
        if (verifiedApiTokens.size <= API_TOKEN_CACHE_MAX) break;
      }
    }
    req.bingeoUser = user;
    req.bingeoToken = token;
    return next();
  } catch (error) {
    console.error('Falha ao validar sessão da API:', error && error.message ? error.message : 'erro desconhecido');
    return res.status(503).json({error:'Não foi possível validar a sessão agora.'});
  }
}
app.use('/api', requireAuthenticatedApiUser);

function billingLegalConfig() {
  const legalReady = !!(
    BINGEO_LEGAL_NAME && BINGEO_LEGAL_TAX_ID && BINGEO_LEGAL_ADDRESS &&
    BINGEO_LEGAL_CITY && BINGEO_LEGAL_STATE && BINGEO_LEGAL_POSTAL_CODE &&
    BINGEO_SUPPORT_EMAIL && BINGEO_PRIVACY_EMAIL
  );
  const technicalReady = !!(ASAAS_API_KEY && ASAAS_WEBHOOK_TOKEN && SUPABASE_SECRET_KEY && BINGEO_AUDIT_SALT);
  const fullAddress = [
    BINGEO_LEGAL_ADDRESS,
    BINGEO_LEGAL_CITY && BINGEO_LEGAL_STATE ? BINGEO_LEGAL_CITY + ' - ' + BINGEO_LEGAL_STATE : '',
    BINGEO_LEGAL_POSTAL_CODE ? 'CEP ' + BINGEO_LEGAL_POSTAL_CODE : ''
  ].filter(Boolean).join(', ');
  return {
    provider:'asaas',
    environment:ASAAS_ENV,
    price:BINGEO_PRO_MONTHLY_PRICE,
    currency:'BRL',
    interval:'month',
    legalReady,
    technicalReady,
    ready:legalReady && technicalReady && Number.isFinite(BINGEO_PRO_MONTHLY_PRICE) && BINGEO_PRO_MONTHLY_PRICE > 0,
    supplier:{
      legalName:BINGEO_LEGAL_NAME || null,
      taxId:BINGEO_LEGAL_TAX_ID || null,
      address:fullAddress || null,
      city:BINGEO_LEGAL_CITY || null,
      state:BINGEO_LEGAL_STATE || null,
      postalCode:BINGEO_LEGAL_POSTAL_CODE || null,
      supportEmail:BINGEO_SUPPORT_EMAIL || null,
      privacyEmail:BINGEO_PRIVACY_EMAIL || null
    },
    versions:{
      terms:BILLING_TERMS_VERSION,
      privacy:BILLING_PRIVACY_VERSION,
      refunds:BILLING_REFUND_VERSION
    }
  };
}

function safeCompareSecret(a,b) {
  const left=Buffer.from(String(a||''),'utf8'),right=Buffer.from(String(b||''),'utf8');
  return left.length===right.length && left.length>0 && crypto.timingSafeEqual(left,right);
}

function hmacAudit(value) {
  return crypto.createHmac('sha256',BINGEO_AUDIT_SALT).update(String(value||'')).digest('hex');
}

async function supabaseServiceRpc(name,payload) {
  if (!SUPABASE_SECRET_KEY) throw new Error('SUPABASE_SECRET_KEY não configurada.');
  const headers={
    apikey:SUPABASE_SECRET_KEY,
    Accept:'application/json',
    'Content-Type':'application/json'
  };
  if (!String(SUPABASE_SECRET_KEY).startsWith('sb_secret_')) {
    headers.Authorization='Bearer '+SUPABASE_SECRET_KEY;
  }
  const response=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+encodeURIComponent(name),{
    method:'POST',
    headers,
    body:JSON.stringify(payload||{}),
    signal:AbortSignal.timeout(10000)
  });
  const textBody=await response.text();
  let body=null;try{body=textBody?JSON.parse(textBody):null;}catch(_e){body=textBody;}
  if(!response.ok){
    const message=body&&body.message?body.message:('Supabase RPC '+response.status);
    const error=new Error(message);error.statusCode=502;throw error;
  }
  return body;
}

async function asaasRequest(method,resource,body) {
  if (!ASAAS_API_KEY) throw new Error('ASAAS_API_KEY não configurada.');
  const response=await fetch(ASAAS_API_BASE+resource,{
    method,
    headers:{
      access_token:ASAAS_API_KEY,
      Accept:'application/json',
      'Content-Type':'application/json',
      'User-Agent':'Bingeo/1.0'
    },
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(12000)
  });
  const textBody=await response.text();
  let data=null;try{data=textBody?JSON.parse(textBody):null;}catch(_e){data={raw:textBody};}
  if(!response.ok){
    const providerMessage=data&&data.errors&&data.errors[0]&&data.errors[0].description
      ? data.errors[0].description
      : (data&&data.message)||('Asaas HTTP '+response.status);
    const error=new Error(providerMessage);error.statusCode=response.status;error.providerBody=data;throw error;
  }
  return data;
}

const ASAAS_BILLING_EVENTS=[
  'CHECKOUT_CREATED','CHECKOUT_CANCELED','CHECKOUT_EXPIRED','CHECKOUT_PAID',
  'SUBSCRIPTION_CREATED','SUBSCRIPTION_UPDATED','SUBSCRIPTION_INACTIVATED','SUBSCRIPTION_DELETED',
  'PAYMENT_CREATED','PAYMENT_UPDATED','PAYMENT_CONFIRMED','PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE','PAYMENT_CREDIT_CARD_CAPTURE_REFUSED',
  'PAYMENT_REFUNDED','PAYMENT_PARTIALLY_REFUNDED','PAYMENT_REFUND_IN_PROGRESS',
  'PAYMENT_CHARGEBACK_REQUESTED','PAYMENT_CHARGEBACK_DISPUTE'
];

async function ensureAsaasWebhook() {
  if(!billingLegalConfig().ready)return {configured:false,reason:'missing_config'};
  const targetUrl=BINGEO_BASE_URL+'/api/billing/webhooks/asaas';
  try{
    const list=await asaasRequest('GET','/webhooks?offset=0&limit=100');
    const rows=Array.isArray(list)?list:(Array.isArray(list&&list.data)?list.data:[]);
    const existing=rows.find(item=>item&&String(item.url||'')===targetUrl);
    const payload={
      name:'Bingeo Billing',
      url:targetUrl,
      email:BINGEO_SUPPORT_EMAIL,
      enabled:true,
      interrupted:false,
      apiVersion:3,
      authToken:ASAAS_WEBHOOK_TOKEN,
      sendType:'SEQUENTIALLY',
      events:ASAAS_BILLING_EVENTS
    };
    if(existing&&existing.id){
      await asaasRequest('PUT','/webhooks/'+encodeURIComponent(existing.id),payload);
      return {configured:true,mode:'updated',id:existing.id};
    }
    const created=await asaasRequest('POST','/webhooks',payload);
    return {configured:true,mode:'created',id:created&&created.id||null};
  }catch(error){
    console.error('Não foi possível configurar o webhook Asaas:',error&&error.message?error.message:error);
    return {configured:false,reason:'provider_error'};
  }
}

function saoPauloDateTime(minutesAhead=2) {
  const d=new Date(Date.now()+minutesAhead*60000);
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',
    hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false
  }).formatToParts(d);
  const get=t=>parts.find(x=>x.type===t)?.value;
  return get('year')+'-'+get('month')+'-'+get('day')+' '+get('hour')+':'+get('minute')+':'+get('second');
}

function safeProxyPath(raw) {
  const value = String(raw || '');
  if (!value || value.length > 240) return null;
  if (value.includes('..') || value.includes('\\') || value.includes('?') || value.includes('#')) return null;
  if (!/^[A-Za-z0-9._/-]+$/.test(value)) return null;
  return value.replace(/^\/+/, '');
}
function safeProxyQuery(queryObject) {
  const entries = Object.entries(queryObject || {});
  if (entries.length > 24) return null;
  const query = new URLSearchParams();
  for (const [key, raw] of entries) {
    if (!/^[A-Za-z0-9_.-]{1,80}$/.test(key)) return null;
    const values = Array.isArray(raw) ? raw : [raw];
    if (values.length > 12) return null;
    for (const value of values) {
      if (value == null) continue;
      const text = String(value);
      if (text.length > 500) return null;
      query.append(key, text);
    }
  }
  return query.toString().length <= 2200 ? query : null;
}


const APP_MODULE_FILES = [
  'js/modules/00-auth.js',
  'js/modules/10-catalog.js',
  'js/modules/20-state-data.js',
  'js/modules/30-integrations.js',
  'js/modules/40-ui-components.js',
  'js/modules/50-discover-library.js',
  'js/modules/60-lists.js',
  'js/modules/65-pro-features.js',
  'js/modules/66-billing.js',
  'js/modules/67-review-system.js',
  'js/modules/70-profile.js',
  'js/modules/80-evaluations-modal.js',
  'js/modules/90-render-uploads.js',
  'js/modules/95-events.js',
  'js/modules/99-boot.js'
];

function buildAppBundle() {
  const parts = APP_MODULE_FILES.map((relativePath) => {
    const absolutePath = path.join(__dirname, 'public', relativePath);
    const source = fs.readFileSync(absolutePath, 'utf8');
    return '\n/* ===== ' + relativePath + ' ===== */\n' + source;
  });
  return '(function(){\n' + parts.join('\n') + '\n})();\n';
}

const APP_BUNDLE = buildAppBundle();

app.get('/js/app.bundle.js', (_req, res) => {
  res.type('application/javascript');
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.send(APP_BUNDLE);
});
app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  setHeaders(res, filePath) {
    if (/\.(?:html|css|js)$/i.test(filePath)) {
      // HTML, CSS e JS precisam permanecer sincronizados entre deploys.
      // Revalidação evita que markup novo seja combinado com estilos/scripts antigos.
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

app.get('/api/legal/config', (_req,res) => {
  res.set('Cache-Control','no-store');
  res.json(billingLegalConfig());
});

app.get('/api/billing/config', (_req,res) => {
  res.set('Cache-Control','no-store');
  res.json(billingLegalConfig());
});

app.post('/api/billing/checkout', async (req,res) => {
  const cfg=billingLegalConfig();
  if(!cfg.ready){
    return res.status(503).json({error:'A contratação do Bingeo Pro ainda não foi liberada. A configuração comercial e jurídica precisa ser concluída.'});
  }
  const body=req.body||{};
  if(body.acceptTerms!==true || body.acceptPrivacy!==true || body.acceptRecurring!==true || body.acceptRefundPolicy!==true){
    return res.status(400).json({error:'Leia e aceite os Termos, a Política de Privacidade, a cobrança recorrente e a Política de Cancelamento e Reembolso.'});
  }
  const user=req.bingeoUser;
  if(!user||!user.id)return res.status(401).json({error:'Autenticação necessária.'});

  const externalReference='bingeo-pro-'+user.id+'-'+crypto.randomBytes(12).toString('hex');
  const callbackBase=BINGEO_BASE_URL+'/?billing=';
  const checkoutPayload={
    billingTypes:['CREDIT_CARD'],
    chargeTypes:['RECURRENT'],
    minutesToExpire:60,
    externalReference,
    callback:{
      successUrl:callbackBase+'success',
      cancelUrl:callbackBase+'cancel',
      expiredUrl:callbackBase+'expired'
    },
    items:[{
      externalReference:'bingeo-pro-monthly',
      name:'Bingeo Pro',
      description:'Assinatura mensal recorrente do Bingeo Pro',
      quantity:1,
      value:Number(BINGEO_PRO_MONTHLY_PRICE.toFixed(2))
    }],
    subscription:{
      cycle:'MONTHLY',
      nextDueDate:saoPauloDateTime(2)
    }
  };

  try{
    const checkout=await asaasRequest('POST','/checkouts',checkoutPayload);
    if(!checkout||!checkout.id)throw new Error('O Asaas não retornou o identificador do checkout.');
    const ip=req.ip||req.socket.remoteAddress||'';
    const ua=req.get('user-agent')||'';
    await supabaseServiceRpc('billing_record_checkout',{
      p_user_id:user.id,
      p_checkout_id:String(checkout.id),
      p_external_reference:externalReference,
      p_amount:Number(BINGEO_PRO_MONTHLY_PRICE.toFixed(2)),
      p_terms_version:BILLING_TERMS_VERSION,
      p_privacy_version:BILLING_PRIVACY_VERSION,
      p_refund_version:BILLING_REFUND_VERSION,
      p_recurring_accepted:true,
      p_ip_hash:hmacAudit(ip),
      p_user_agent_hash:hmacAudit(ua)
    });
    const checkoutUrl=checkout.link||('https://asaas.com/checkoutSession/show?id='+encodeURIComponent(checkout.id));
    res.set('Cache-Control','no-store');
    return res.json({ok:true,checkoutUrl,checkoutId:checkout.id,environment:ASAAS_ENV});
  }catch(error){
    console.error('Erro ao criar checkout Asaas:',error&&error.message?error.message:error);
    return res.status(error.statusCode>=400&&error.statusCode<500?400:502).json({error:'Não foi possível iniciar a assinatura agora. Tente novamente ou contate o suporte.'});
  }
});

app.post('/api/billing/webhooks/asaas', async (req,res) => {
  if(!ASAAS_WEBHOOK_TOKEN||!SUPABASE_SECRET_KEY){
    return res.status(503).json({error:'Webhook de cobrança não configurado.'});
  }
  if(!safeCompareSecret(req.get('asaas-access-token'),ASAAS_WEBHOOK_TOKEN)){
    return res.status(401).json({error:'Webhook não autorizado.'});
  }
  const event=req.body;
  if(!event||typeof event!=='object'||Array.isArray(event)||!event.id||!event.event){
    return res.status(400).json({error:'Evento inválido.'});
  }
  const raw=req.rawBody&&req.rawBody.length?req.rawBody:Buffer.from(JSON.stringify(event));
  const payloadHash=crypto.createHash('sha256').update(raw).digest('hex');
  try{
    const result=await supabaseServiceRpc('billing_process_asaas_event',{
      p_event:event,
      p_payload_sha256:payloadHash
    });
    return res.status(200).json({ok:true,duplicate:!!(result&&result.duplicate)});
  }catch(error){
    console.error('Erro ao processar webhook Asaas:',error&&error.message?error.message:error);
    return res.status(500).json({error:'Falha temporária ao processar evento.'});
  }
});

app.post('/api/billing/cancel', async (req,res) => {
  if(!billingLegalConfig().ready)return res.status(503).json({error:'Cobrança ainda não configurada.'});
  const user=req.bingeoUser;
  try{
    const context=await supabaseServiceRpc('billing_get_provider_context',{p_user_id:user.id})||{};
    if(context.cancel_at_period_end)return res.json({ok:true,alreadyCanceled:true,currentPeriodEnd:context.current_period_end||null});
    if(!context.subscription_id)return res.status(409).json({error:'A assinatura ainda está sendo sincronizada. Tente novamente em alguns instantes ou fale com o suporte.'});
    await asaasRequest('DELETE','/subscriptions/'+encodeURIComponent(context.subscription_id));
    await supabaseServiceRpc('billing_mark_cancel_requested',{p_user_id:user.id});
    return res.json({
      ok:true,
      currentPeriodEnd:context.current_period_end||null,
      message:'Renovação cancelada. Seu acesso Pro permanece até o fim do período já pago, quando aplicável.'
    });
  }catch(error){
    console.error('Erro ao cancelar assinatura:',error&&error.message?error.message:error);
    return res.status(502).json({error:'Não foi possível cancelar automaticamente. Sua solicitação não foi ignorada; contate o suporte se o erro persistir.'});
  }
});

app.post('/api/billing/refund-request', async (req,res) => {
  if(!billingLegalConfig().ready)return res.status(503).json({error:'Cobrança ainda não configurada.'});
  const user=req.bingeoUser,reason=String(req.body&&req.body.reason||'Direito de arrependimento / solicitação do consumidor').trim().slice(0,1200);
  try{
    const context=await supabaseServiceRpc('billing_get_provider_context',{p_user_id:user.id})||{};
    const paidAt=context.latest_payment_at?new Date(context.latest_payment_at):null;
    const withinWindow=!!(paidAt&&!Number.isNaN(paidAt.getTime())&&(Date.now()-paidAt.getTime())<=7*24*60*60*1000);
    if(!context.latest_payment_id){
      await supabaseServiceRpc('billing_create_refund_request',{
        p_user_id:user.id,p_payment_id:'',p_reason:reason,p_within_window:false,p_status:'manual_review'
      });
      return res.status(202).json({ok:true,automatic:false,message:'Solicitação registrada para análise pelo suporte.'});
    }

    if(!withinWindow){
      await supabaseServiceRpc('billing_create_refund_request',{
        p_user_id:user.id,p_payment_id:context.latest_payment_id,p_reason:reason,p_within_window:false,p_status:'manual_review'
      });
      return res.status(202).json({
        ok:true,automatic:false,
        message:'O pedido foi registrado para análise. Cancelamentos fora do prazo legal de arrependimento não geram estorno proporcional automático, sem prejuízo dos direitos previstos em lei.'
      });
    }

    await supabaseServiceRpc('billing_create_refund_request',{
      p_user_id:user.id,p_payment_id:context.latest_payment_id,p_reason:reason,p_within_window:true,p_status:'auto_eligible'
    });
    await asaasRequest('POST','/payments/'+encodeURIComponent(context.latest_payment_id)+'/refund',{
      description:'Bingeo Pro — exercício do direito de arrependimento'
    });
    if(context.subscription_id){
      try{await asaasRequest('DELETE','/subscriptions/'+encodeURIComponent(context.subscription_id));}catch(cancelError){
        console.warn('Estorno iniciado, mas cancelamento da recorrência exigirá reconciliação:',cancelError&&cancelError.message);
      }
    }
    await supabaseServiceRpc('billing_mark_refund_processing',{
      p_user_id:user.id,p_payment_id:context.latest_payment_id,p_note:'Estorno integral solicitado automaticamente ao Asaas dentro da janela de 7 dias.'
    });
    return res.json({
      ok:true,automatic:true,
      message:'Estorno integral solicitado. O acesso Pro foi encerrado e a recorrência foi cancelada. O prazo de exibição do crédito depende do meio de pagamento e do emissor.'
    });
  }catch(error){
    console.error('Erro ao solicitar reembolso:',error&&error.message?error.message:error);
    return res.status(502).json({error:'Não foi possível concluir o estorno automaticamente. Tente novamente ou contate o suporte.'});
  }
});

app.get(/^\/api\/tmdb\/(.*)/, async (req, res) => {
  if (!TMDB_READ_TOKEN) {
    return res.status(500).json({ error: 'TMDB não configurado no servidor.' });
  }

  const tmdbPath = safeProxyPath(req.params[0]);
  const query = safeProxyQuery(req.query);
  if (!tmdbPath || query === null) {
    return res.status(400).json({error:'Requisição TMDB inválida.'});
  }

  const url = 'https://api.themoviedb.org/3/' + tmdbPath + (query.toString() ? '?' + query.toString() : '');

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: 'Bearer ' + TMDB_READ_TOKEN,
        Accept: 'application/json'
      },
      signal: AbortSignal.timeout(10000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    if (response.ok) res.set('Cache-Control', 'private, max-age=300');
    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar TMDB:', error);
    res.status(502).json({ error: 'Não foi possível acessar a TMDB.' });
  }
});

app.get(/^\/api\/tvmaze\/(.*)/, async (req, res) => {
  const tvmazePath = safeProxyPath(req.params[0]);
  const query = safeProxyQuery(req.query);
  if (!tvmazePath || query === null) {
    return res.status(400).json({error:'Requisição TVmaze inválida.'});
  }

  const url = 'https://api.tvmaze.com/' + tvmazePath +
    (query.toString() ? '?' + query.toString() : '');

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Bingeo/1.0'
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(10000)
    });

    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');

    if (response.ok) {
      res.set('Cache-Control', 'private, max-age=3600');
    }

    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar TVmaze:', error);
    res.status(502).json({ error: 'Não foi possível acessar a TVmaze.' });
  }
});

async function getTheTvdbToken(forceRefresh = false) {
  if (!THETVDB_API_KEY) {
    const error = new Error('TheTVDB não configurado no servidor.');
    error.statusCode = 500;
    throw error;
  }

  if (!forceRefresh && theTvdbToken && Date.now() < theTvdbTokenExpiresAt) {
    return theTvdbToken;
  }

  const payload = { apikey: THETVDB_API_KEY };
  if (THETVDB_PIN) payload.pin = THETVDB_PIN;

  const response = await fetch('https://api4.thetvdb.com/v4/login', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Bingeo/1.0'
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000)
  });

  const body = await response.json().catch(() => null);
  const token = body && body.data && body.data.token;

  if (!response.ok || !token) {
    const error = new Error(
      (body && (body.message || body.error)) ||
      'Não foi possível autenticar na TheTVDB.'
    );
    error.statusCode = response.status || 502;
    throw error;
  }

  theTvdbToken = token;
  // TheTVDB documents a one-month token lifetime. Refresh a little earlier.
  theTvdbTokenExpiresAt = Date.now() + (27 * 24 * 60 * 60 * 1000);
  return theTvdbToken;
}

async function fetchTheTvdb(url, forceRefresh = false) {
  const token = await getTheTvdbToken(forceRefresh);
  return fetch(url, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json',
      'User-Agent': 'Bingeo/1.0'
    },
    signal: AbortSignal.timeout(12000)
  });
}

app.get(/^\/api\/thetvdb\/(.*)/, async (req, res) => {
  if (!THETVDB_API_KEY) {
    return res.status(503).json({ error: 'TheTVDB não configurado no servidor.' });
  }

  const tvdbPath = safeProxyPath(req.params[0]);
  const query = safeProxyQuery(req.query);
  if (!tvdbPath || query === null) {
    return res.status(400).json({error:'Requisição TheTVDB inválida.'});
  }

  const url = 'https://api4.thetvdb.com/v4/' + tvdbPath +
    (query.toString() ? '?' + query.toString() : '');

  try {
    let response = await fetchTheTvdb(url);

    // Token can be revoked/expired before our local cache expires.
    if (response.status === 401) {
      theTvdbToken = null;
      theTvdbTokenExpiresAt = 0;
      response = await fetchTheTvdb(url, true);
    }

    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');

    if (response.ok) {
      res.set('Cache-Control', 'private, max-age=3600');
    }

    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar TheTVDB:', error);
    res.status(error.statusCode || 502).json({
      error: error.message || 'Não foi possível acessar a TheTVDB.'
    });
  }
});

app.get('/api/anilist/search', async (req, res) => {
  const search = String(req.query.q || '').trim();

  if (!search || search.length > 120) {
    return res.status(400).json({ error: 'Título do anime é obrigatório.' });
  }

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        media(
          search: $search,
          type: ANIME,
          sort: SEARCH_MATCH
        ) {
          id
          idMal
          title {
            romaji
            english
            native
            userPreferred
          }
          synonyms
          seasonYear
          startDate {
            year
          }
          format
          countryOfOrigin
          coverImage {
            extraLarge
            large
            medium
          }
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'Bingeo/1.0'
      },
      body: JSON.stringify({
        query,
        variables: { search }
      }),
      signal: AbortSignal.timeout(12000)
    });

    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');

    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);

    if (response.ok) {
      res.set('Cache-Control', 'private, max-age=86400');
    }

    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar AniList:', error);
    res.status(502).json({ error: 'Não foi possível acessar a AniList.' });
  }
});

app.get('/api/anilist/characters/search', async (req, res) => {
  const search = String(req.query.q || '').trim();
  if (!search || search.length > 120) return res.status(400).json({ error: 'Nome do personagem inválido.' });

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 10) {
        characters(search: $search, sort: SEARCH_MATCH) {
          id
          name { full native alternative alternativeSpoiler }
          image { large medium }
          favourites
        }
      }
    }
  `;

  try {
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'Bingeo/1.0' },
      body: JSON.stringify({ query, variables: { search } }),
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);
    if (response.ok) res.set('Cache-Control', 'private, max-age=86400');
    res.send(body);
  } catch (error) {
    console.error('Erro ao acessar personagens da AniList:', error);
    res.status(502).json({ error: 'Não foi possível acessar os personagens da AniList.' });
  }
});

app.get('/api/jikan/characters/search', async (req, res) => {
  const search = String(req.query.q || '').trim();
  if (!search || search.length > 120) return res.status(400).json({ error: 'Nome do personagem inválido.' });

  const params = new URLSearchParams({ q: search, limit: '10', order_by: 'favorites', sort: 'desc' });
  try {
    const response = await fetch('https://api.jikan.moe/v4/characters?' + params.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'Bingeo/1.0' },
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);
    if (response.ok) res.set('Cache-Control', 'private, max-age=86400');
    res.send(body);
  } catch (error) {
    console.error('Erro ao pesquisar personagem na Jikan:', error);
    res.status(502).json({ error: 'Não foi possível acessar a Jikan.' });
  }
});

app.get('/api/jikan/characters/:malId/pictures', async (req, res) => {
  const malId = String(req.params.malId || '').trim();
  if (!/^\d+$/.test(malId)) return res.status(400).json({ error: 'ID de personagem inválido.' });

  try {
    const response = await fetch('https://api.jikan.moe/v4/characters/' + encodeURIComponent(malId) + '/pictures', {
      headers: { Accept: 'application/json', 'User-Agent': 'Bingeo/1.0' },
      signal: AbortSignal.timeout(12000)
    });
    const body = await response.text();
    res.status(response.status);
    res.set('Content-Type', response.headers.get('content-type') || 'application/json');
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) res.set('Retry-After', retryAfter);
    if (response.ok) res.set('Cache-Control', 'private, max-age=86400');
    res.send(body);
  } catch (error) {
    console.error('Erro ao buscar imagens do personagem na Jikan:', error);
    res.status(502).json({ error: 'Não foi possível acessar as imagens da Jikan.' });
  }
});

app.get('/api/health', (_req, res) => {
  const billing=billingLegalConfig();
  res.json({
    ok:true,
    tmdbConfigured:!!TMDB_READ_TOKEN,
    tvmazeConfigured:true,
    thetvdbConfigured:!!THETVDB_API_KEY,
    anilistConfigured:true,
    jikanConfigured:true,
    billing:{
      provider:'asaas',
      environment:ASAAS_ENV,
      technicalReady:billing.technicalReady,
      legalReady:billing.legalReady,
      ready:billing.ready
    }
  });
});


app.listen(PORT, () => {
  console.log('Bingeo rodando na porta ' + PORT);
  ensureAsaasWebhook().then(result=>{
    if(result&&result.configured)console.log('Webhook Asaas pronto ('+result.mode+').');
  });
});
