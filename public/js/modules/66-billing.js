/* ---------------- Bingeo Pro billing / Asaas ---------------- */
  if(state.billingConfig===undefined)state.billingConfig=null;
  if(state.billingStatus===undefined)state.billingStatus=null;
  if(state.billingLoading===undefined)state.billingLoading=false;
  if(state.billingError===undefined)state.billingError='';
  if(state.billingNotice===undefined)state.billingNotice='';

  function billingMoney(value){return Number(value||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});}
  function billingDate(value){
    if(!value)return '';
    try{return new Date(value).toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'});}catch(e){return '';}
  }
  async function billingHeaders(){
    var result=await supabaseClient.auth.getSession(),session=result&&result.data&&result.data.session;
    if(!session||!session.access_token)throw new Error('Sua sessão expirou. Entre novamente.');
    return {'Accept':'application/json','Content-Type':'application/json','X-Bingeo-Session':session.access_token};
  }
  async function billingApi(path,options){
    options=options||{};
    var response=await fetch('/api/billing'+path,{
      method:options.method||'GET',
      headers:await billingHeaders(),
      body:options.body===undefined?undefined:JSON.stringify(options.body)
    });
    var data=await response.json().catch(function(){return {};});
    if(!response.ok)throw new Error(data.error||'Não foi possível concluir a operação.');
    return data;
  }
  async function loadBillingConfig(force){
    if(state.billingConfig&&!force)return state.billingConfig;
    try{state.billingConfig=await billingApi('/config');return state.billingConfig;}
    catch(e){state.billingError=e.message||'Não foi possível carregar as informações de cobrança.';return null;}
  }
  async function loadBillingStatus(){
    if(!currentUserId)return null;
    try{
      var result=await supabaseClient.rpc('get_my_billing_status');
      if(result.error)throw result.error;
      state.billingStatus=result.data||{};
      return state.billingStatus;
    }catch(e){state.billingError=e.message||'Não foi possível consultar sua assinatura.';return null;}
  }
  async function refreshBillingEntitlement(){
    if(!currentUserId)return;
    try{
      var sync=await supabaseClient.rpc('sync_my_plan_from_billing');
      if(sync.error)throw sync.error;
      await Promise.allSettled([loadOwnProfileFromSupabase(),loadBillingStatus(),loadBillingConfig()]);
    }catch(e){
      console.warn('Não foi possível sincronizar o Bingeo Pro:',e);
      await Promise.allSettled([loadBillingStatus(),loadBillingConfig()]);
    }
  }
  function billingNoticeHtml(){
    if(!state.billingNotice&&!state.billingError)return '';
    var text=state.billingNotice||state.billingError,kind=state.billingError?'error':'ok';
    return '<div class="billing-notice '+kind+'">'+escapeHtml(text)+'</div>';
  }
  function billingLegalLinksHtml(){
    return '<div class="billing-legal-links">'+
      '<a href="/legal/termos.html" target="_blank" rel="noopener">Termos de Uso</a>'+
      '<a href="/legal/privacidade.html" target="_blank" rel="noopener">Privacidade</a>'+
      '<a href="/legal/reembolsos-cancelamento.html" target="_blank" rel="noopener">Cancelamento e Reembolso</a>'+
      '<a href="/legal/seguranca.html" target="_blank" rel="noopener">Segurança</a>'+
    '</div>';
  }
  function billingProPurchaseHtml(active){
    var cfg=state.billingConfig,status=state.billingStatus||{};
    if(!cfg){
      return '<section class="pro-purchase-card billing-purchase-card"><div><span class="pro-purchase-eyebrow">ASSINATURA</span><h2>Bingeo Pro</h2><p>Carregando condições da assinatura…</p></div></section>';
    }
    var price=billingMoney(cfg.price||14.90);
    if(active){
      var end=billingDate(status.current_period_end),canceled=!!status.cancel_at_period_end;
      var paymentIssue=status.subscription_status==='past_due'||status.latest_payment_status==='PAYMENT_OVERDUE'||status.latest_payment_status==='PAYMENT_CREDIT_CARD_CAPTURE_REFUSED';
      var issueHtml=paymentIssue?'<div class="billing-notice error">Não conseguimos confirmar a cobrança mais recente. Seu acesso pode permanecer temporariamente durante o período de tolerância. Atualize o pagamento pelo checkout ou contate o suporte para evitar a perda do Pro.</div>':'';
      return billingNoticeHtml()+issueHtml+
        '<section class="pro-purchase-card billing-purchase-card active">'+
          '<div class="billing-plan-copy"><span class="pro-purchase-eyebrow">SUA ASSINATURA</span><h2>Bingeo Pro</h2>'+
            '<div class="billing-price"><strong>'+price+'</strong><span>/ mês</span></div>'+
            '<p>'+(canceled?'A renovação automática está cancelada.':'Assinatura recorrente ativa e gerenciada com segurança pelo Asaas.')+'</p>'+
            (end?'<small>'+(canceled?'Acesso previsto até ':'Próximo ciclo previsto: ')+escapeHtml(end)+'</small>':'')+
          '</div>'+
          '<div class="billing-manage-actions">'+
            (!canceled?'<button class="btn btn-ghost" data-action="billing-cancel">Cancelar renovação</button>':'<span class="billing-status-chip">Cancelamento programado</span>')+
            (status.within_withdrawal_window?'<button class="btn btn-danger" data-action="billing-refund">Solicitar arrependimento e estorno</button>':'<button class="btn btn-ghost btn-sm" data-action="billing-refund">Solicitar reembolso</button>')+
          '</div>'+
          '<div class="billing-rights-note">Cancelar a renovação não apaga seu perfil ou suas avaliações. O pedido de reembolso é analisado sem limitar os direitos garantidos por lei.</div>'+
          billingLegalLinksHtml()+
        '</section>';
    }

    var ready=cfg.ready===true;
    return billingNoticeHtml()+
      '<section class="pro-purchase-card billing-purchase-card">'+
        '<div class="billing-plan-copy"><span class="pro-purchase-eyebrow">ASSINATURA MENSAL</span><h2>Bingeo Pro</h2>'+
          '<div class="billing-price"><strong>'+price+'</strong><span>/ mês</span></div>'+
          '<p>Renovação automática mensal no cartão até o cancelamento. Sem fidelidade e sem multa de cancelamento.</p>'+
          '<div class="billing-security-line"><span>◉</span><div><strong>Checkout hospedado pelo Asaas</strong><small>O Bingeo não recebe nem armazena número completo do cartão ou CVV.</small></div></div>'+
        '</div>'+
        '<div class="billing-contract-summary">'+
          '<strong>Resumo antes de contratar</strong>'+
          '<span>Plano: Bingeo Pro mensal</span>'+
          '<span>Preço: '+price+' por mês</span>'+
          '<span>Cobrança: recorrente, até você cancelar</span>'+
          '<span>Cancelamento: pelo próprio Bingeo, sem multa</span>'+
          '<span>Arrependimento: 7 dias nas hipóteses previstas no CDC</span>'+
        '</div>'+
        '<div class="billing-consents">'+
          '<label><input type="checkbox" id="billingAcceptTerms"> <span>Li e aceito os <a href="/legal/termos.html" target="_blank" rel="noopener">Termos de Uso</a>.</span></label>'+
          '<label><input type="checkbox" id="billingAcceptPrivacy"> <span>Li a <a href="/legal/privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a> e entendi como meus dados serão tratados.</span></label>'+
          '<label><input type="checkbox" id="billingAcceptRecurring"> <span>Entendo que a assinatura é de '+price+'/mês e será renovada automaticamente até o cancelamento.</span></label>'+
          '<label><input type="checkbox" id="billingAcceptRefund"> <span>Li a <a href="/legal/reembolsos-cancelamento.html" target="_blank" rel="noopener">Política de Cancelamento e Reembolso</a>, sem renunciar a direitos legais.</span></label>'+
        '</div>'+
        (ready?'<button class="btn btn-primary billing-checkout-btn" data-action="pro-checkout">Ir para o checkout seguro</button>':
          '<button class="btn btn-primary billing-checkout-btn" disabled>Pagamentos em configuração</button><div class="billing-pending-note">A contratação só será liberada quando os dados jurídicos e as credenciais de produção estiverem configurados no servidor.</div>')+
        billingLegalLinksHtml()+
      '</section>';
  }

  async function startProCheckout(button){
    if(button)button.disabled=true;
    state.billingError='';state.billingNotice='';
    try{
      var terms=document.getElementById('billingAcceptTerms'),privacy=document.getElementById('billingAcceptPrivacy');
      var recurring=document.getElementById('billingAcceptRecurring'),refund=document.getElementById('billingAcceptRefund');
      if(!terms||!privacy||!recurring||!refund||!terms.checked||!privacy.checked||!recurring.checked||!refund.checked){
        throw new Error('Marque as quatro confirmações antes de continuar.');
      }
      var data=await billingApi('/checkout',{method:'POST',body:{acceptTerms:true,acceptPrivacy:true,acceptRecurring:true,acceptRefundPolicy:true}});
      var url=new URL(data.checkoutUrl,window.location.origin);
      if(url.protocol!=='https:'||!(url.hostname==='asaas.com'||url.hostname.endsWith('.asaas.com')))throw new Error('O servidor de pagamento retornou um endereço inválido.');
      window.location.assign(url.href);
    }catch(e){
      state.billingError=e.message||'Não foi possível iniciar a assinatura.';
      renderMainViewOnly();
      if(button)button.disabled=false;
    }
  }
  async function cancelProBilling(button){
    if(!confirm('Cancelar a renovação automática do Bingeo Pro? Você continuará com o acesso pelo período já pago, quando aplicável.'))return;
    if(button)button.disabled=true;
    state.billingError='';state.billingNotice='';
    try{
      var data=await billingApi('/cancel',{method:'POST',body:{}});
      state.billingNotice=data.message||'Renovação cancelada.';
      await refreshBillingEntitlement();renderMainViewOnly();
    }catch(e){state.billingError=e.message||'Não foi possível cancelar.';renderMainViewOnly();}
    finally{if(button)button.disabled=false;}
  }
  async function requestProRefund(button){
    var within=!!(state.billingStatus&&state.billingStatus.within_withdrawal_window);
    var message=within?'Solicitar o cancelamento e o estorno integral desta cobrança? O acesso Pro será encerrado quando o pedido for processado.':'Registrar uma solicitação de reembolso para análise? O cancelamento comum continua disponível separadamente.';
    if(!confirm(message))return;
    if(button)button.disabled=true;
    state.billingError='';state.billingNotice='';
    try{
      var reason=prompt('Se quiser, descreva o motivo do pedido de reembolso:','')||'';
      var data=await billingApi('/refund-request',{method:'POST',body:{reason:reason}});
      state.billingNotice=data.message||'Solicitação registrada.';
      await refreshBillingEntitlement();renderMainViewOnly();
    }catch(e){state.billingError=e.message||'Não foi possível solicitar o reembolso.';renderMainViewOnly();}
    finally{if(button)button.disabled=false;}
  }
  function handleBillingAction(action,el){
    if(action==='pro-checkout'){startProCheckout(el);return true;}
    if(action==='billing-cancel'){cancelProBilling(el);return true;}
    if(action==='billing-refund'){requestProRefund(el);return true;}
    if(action==='billing-refresh'){refreshBillingEntitlement().then(render);return true;}
    return false;
  }
  function handleBillingReturn(){
    var params=new URLSearchParams(window.location.search),result=params.get('billing');
    if(!result)return false;
    if(result==='success')state.billingNotice='Checkout concluído. Estamos aguardando a confirmação segura do Asaas para liberar o Pro.';
    else if(result==='cancel')state.billingNotice='Checkout cancelado. Nenhuma assinatura foi ativada por este retorno.';
    else if(result==='expired')state.billingNotice='O checkout expirou. Você pode iniciar uma nova contratação.';
    state.view='pro';
    try{
      params.delete('billing');
      var clean=window.location.pathname+(params.toString()?'?'+params.toString():'')+window.location.hash;
      history.replaceState(null,'',clean);
    }catch(e){}
    return result==='success';
  }
  function pollBillingConfirmation(){
    var attempts=0;
    function check(){
      attempts++;
      refreshBillingEntitlement().then(function(){render();if(!hasPro()&&attempts<4)setTimeout(check,2500);});
    }
    check();
  }
