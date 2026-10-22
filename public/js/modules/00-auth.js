  var authInitialCallback=(function(){
    try{
      var hash=new URLSearchParams(String(window.location.hash||'').replace(/^#/,''));
      var query=new URLSearchParams(String(window.location.search||'').replace(/^\?/,''));
      var type=String(hash.get('type')||query.get('type')||'').toLowerCase();
      var error=hash.get('error')||query.get('error')||'';
      var errorCode=hash.get('error_code')||query.get('error_code')||'';
      var errorDescription=hash.get('error_description')||query.get('error_description')||'';
      return {
        type:type,
        error:String(error||''),
        errorCode:String(errorCode||''),
        errorDescription:String(errorDescription||'').replace(/\+/g,' '),
        hasAuthPayload:!!(hash.get('access_token')||hash.get('refresh_token')||query.get('code')||type),
        fromEmail:['magiclink','signup','recovery','email'].indexOf(type)>-1
      };
    }catch(_e){
      return {type:'',error:'',errorCode:'',errorDescription:'',hasAuthPayload:false,fromEmail:false};
    }
  })();
  var authCallbackConsumed=false;

  var SUPABASE_URL='https://bazujvpppbxxiymxweiq.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY='sb_publishable_y6uiZr53J-ZtPCWDRNEvjw_x-ZGU-mi';
  var supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}
  });

  var AUTH_REMEMBER_EMAIL_KEY='bingeo.rememberEmail.v1';
  var AUTH_FLOW_KEY='bingeo.authFlow.v2';
  var AUTH_FLOW_TTL=60*60*1000;
  var authMode='login',appBooted=false,currentUserId=null;
  var authOtpPurpose='login',otpCooldownTimer=null,otpCooldownUntil=0;
  var loadedAccountId=null;

  function authRedirectUrl(){
    var origin=window.location.origin||'';
    if(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)){
      return 'https://bingeo.onrender.com/';
    }
    return origin.replace(/\/$/,'')+'/';
  }
  function authStorageGet(key){
    try{return window.localStorage.getItem(key)||'';}catch(_e){return '';}
  }
  function authStorageSet(key,value){
    try{
      if(value==null||value==='')window.localStorage.removeItem(key);
      else window.localStorage.setItem(key,String(value));
    }catch(_e){}
  }
  function readAuthFlow(){
    try{
      var raw=authStorageGet(AUTH_FLOW_KEY);
      if(!raw)return null;
      var flow=JSON.parse(raw);
      if(!flow||typeof flow!=='object'||!flow.email||!flow.purpose){authStorageSet(AUTH_FLOW_KEY,'');return null;}
      if(flow.expiresAt&&Number(flow.expiresAt)<Date.now()){authStorageSet(AUTH_FLOW_KEY,'');return null;}
      return flow;
    }catch(_e){authStorageSet(AUTH_FLOW_KEY,'');return null;}
  }
  function writeAuthFlow(purpose,email,stage,extra){
    var current=readAuthFlow()||{};
    var row={
      purpose:String(purpose||current.purpose||'login'),
      email:String(email||current.email||'').trim().toLowerCase(),
      stage:String(stage||current.stage||'email_sent'),
      expiresAt:Date.now()+AUTH_FLOW_TTL
    };
    Object.keys(current).forEach(function(k){if(row[k]===undefined)row[k]=current[k];});
    Object.keys(extra||{}).forEach(function(k){row[k]=extra[k];});
    authStorageSet(AUTH_FLOW_KEY,JSON.stringify(row));
    return row;
  }
  function clearAuthFlow(){authStorageSet(AUTH_FLOW_KEY,'');}
  function cleanAuthCallbackUrl(){
    try{
      if(!window.history||!window.history.replaceState)return;
      var url=new URL(window.location.href);
      ['code','type','error','error_code','error_description'].forEach(function(key){url.searchParams.delete(key);});
      url.hash='';
      window.history.replaceState({},document.title,url.pathname+(url.searchParams.toString()?'?'+url.searchParams.toString():''));
    }catch(_e){}
  }
  function emailCallbackCanComplete(flow){
    if(!flow||!authInitialCallback.hasAuthPayload||authInitialCallback.error)return false;
    var type=authInitialCallback.type;
    if(flow.purpose==='recovery')return type==='recovery';
    if(flow.purpose==='signup')return type==='signup'||type==='magiclink'||type==='email';
    if(flow.purpose==='login')return type==='magiclink'||type==='email'||(!type&&authInitialCallback.hasAuthPayload);
    return false;
  }
  function hideAuthSteps(){
    ['authCredentialsStep','authOtpStep','authRecoveryStep','authNewPasswordStep'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.hidden=true;
    });
  }
  function showAuthCredentials(){
    hideAuthSteps();
    var credentials=document.getElementById('authCredentialsStep');
    if(credentials)credentials.hidden=false;
  }
  function showRecoveryRequest(){
    hideAuthSteps();
    var step=document.getElementById('authRecoveryStep');if(step)step.hidden=false;
    var loginEmail=document.getElementById('authEmail'),email=document.getElementById('authRecoveryEmail');
    var saved=authStorageGet(AUTH_REMEMBER_EMAIL_KEY);
    if(email&&!email.value)email.value=(loginEmail&&loginEmail.value.trim())||saved||'';
    var err=document.getElementById('authRecoveryError');if(err){err.textContent='';err.style.color='#ff8f8f';}
    setTimeout(function(){if(email)email.focus();},0);
  }
  function otpCopyFor(purpose){
    if(purpose==='signup')return {
      title:'Confirme sua conta',
      message:'Enviamos um link de confirmação para ',
      note:'Abra o e-mail e clique no link para confirmar sua conta. Ao voltar ao Bingeo, o acesso será liberado automaticamente.'
    };
    if(purpose==='recovery')return {
      title:'Confira seu e-mail',
      message:'Enviamos um link de recuperação para ',
      note:'Clique no link do e-mail para voltar ao Bingeo e criar uma nova senha.'
    };
    return {
      title:'Confirme seu acesso',
      message:'Enviamos um link de acesso para ',
      note:'Abra o e-mail e clique no link. O Bingeo concluirá o login automaticamente.'
    };
  }
  function showOtpStep(purpose,email){
    authOtpPurpose=purpose||'login';
    hideAuthSteps();
    var step=document.getElementById('authOtpStep');if(step)step.hidden=false;
    var copy=otpCopyFor(authOtpPurpose);
    var title=document.getElementById('authOtpTitle');if(title)title.textContent=copy.title;
    var message=document.getElementById('authOtpMessage');if(message)message.textContent=copy.message+String(email||'').trim()+'.';
    var note=document.getElementById('authOtpNote');if(note)note.textContent=copy.note;
    var error=document.getElementById('authOtpError');if(error){error.textContent='';error.style.color='#ff8f8f';}
  }
  function showNewPasswordStep(email){
    hideAuthSteps();
    var step=document.getElementById('authNewPasswordStep');if(step)step.hidden=false;
    var msg=document.getElementById('authNewPasswordMessage');
    if(msg)msg.textContent='Link confirmado para '+String(email||'seu e-mail')+'. Agora escolha uma nova senha.';
    var a=document.getElementById('authNewPassword'),b=document.getElementById('authNewPasswordConfirm');
    if(a)a.value='';if(b)b.value='';
    var err=document.getElementById('authNewPasswordError');if(err){err.textContent='';err.style.color='#ff8f8f';}
    setTimeout(function(){if(a)a.focus();},0);
  }
  function setAuthMode(mode){
    authMode=mode;
    showAuthCredentials();
    var signup=mode==='signup';
    document.getElementById('authUsernameField').style.display=signup?'block':'none';
    document.getElementById('authConfirmField').style.display=signup?'block':'none';
    document.getElementById('authLegalField').style.display=signup?'grid':'none';
    document.getElementById('authRememberField').style.display=signup?'none':'flex';
    document.getElementById('authForgotPassword').style.display=signup?'none':'inline-block';
    document.getElementById('authUsername').required=signup;
    document.getElementById('authConfirmPassword').required=signup;
    document.getElementById('authTermsConsent').required=signup;
    document.getElementById('authPrivacyConsent').required=signup;
    document.getElementById('authSubmit').textContent=signup?'Criar conta':'Entrar';
    var passwordInput=document.getElementById('authPassword'),confirmInput=document.getElementById('authConfirmPassword');
    passwordInput.autocomplete=signup?'new-password':'current-password';
    passwordInput.minLength=signup?8:1;
    confirmInput.minLength=signup?8:1;
    document.getElementById('authLoginTab').classList.toggle('active',!signup);
    document.getElementById('authSignupTab').classList.toggle('active',signup);
    document.getElementById('authSubtitle').textContent=signup
      ?'Crie sua conta e confirme seu e-mail pelo link enviado pelo Supabase.'
      :'Entre com sua senha e confirme o acesso pelo link enviado ao seu e-mail.';
    var err=document.getElementById('authError');err.style.color='#ff8f8f';err.textContent='';
  }
  function restoreRememberedEmail(){
    var saved=authStorageGet(AUTH_REMEMBER_EMAIL_KEY),email=document.getElementById('authEmail'),remember=document.getElementById('authRememberEmail');
    if(saved&&email){email.value=saved;if(remember)remember.checked=true;}
  }
  function persistRememberedEmail(email){
    var remember=document.getElementById('authRememberEmail');
    authStorageSet(AUTH_REMEMBER_EMAIL_KEY,remember&&remember.checked?String(email||'').trim().toLowerCase():'');
  }
  function startOtpCooldown(seconds){
    seconds=Math.max(1,Number(seconds)||60);
    otpCooldownUntil=Date.now()+seconds*1000;
    if(otpCooldownTimer)clearInterval(otpCooldownTimer);
    function paint(){
      var btn=document.getElementById('authOtpResend');if(!btn)return;
      var left=Math.max(0,Math.ceil((otpCooldownUntil-Date.now())/1000));
      btn.disabled=left>0;
      btn.textContent=left>0?'Reenviar em '+left+'s':'Reenviar link';
      if(left<=0&&otpCooldownTimer){clearInterval(otpCooldownTimer);otpCooldownTimer=null;}
    }
    paint();otpCooldownTimer=setInterval(paint,1000);
  }
  async function sendLoginOtp(email,purpose){
    var p=purpose||'login';
    writeAuthFlow(p,email,'sending',{method:'magic_link'});
    var result=await supabaseClient.auth.signInWithOtp({
      email:String(email||'').trim().toLowerCase(),
      options:{shouldCreateUser:false,emailRedirectTo:authRedirectUrl()}
    });
    if(result.error){clearAuthFlow();throw result.error;}
    var flow=writeAuthFlow(p,email,'email_sent',{method:'magic_link'});
    showOtpStep(p,flow.email);
    startOtpCooldown(60);
  }
  async function resendCurrentOtp(flow){
    if(!flow||!flow.email)throw new Error('A verificação expirou. Inicie novamente.');
    var result;
    if(flow.purpose==='signup'&&flow.method==='signup_confirmation'){
      result=await supabaseClient.auth.resend({
        type:'signup',
        email:flow.email,
        options:{emailRedirectTo:authRedirectUrl()}
      });
    }else if(flow.purpose==='recovery'){
      result=await supabaseClient.auth.resetPasswordForEmail(flow.email,{redirectTo:authRedirectUrl()});
    }else{
      result=await supabaseClient.auth.signInWithOtp({
        email:flow.email,
        options:{shouldCreateUser:false,emailRedirectTo:authRedirectUrl()}
      });
    }
    if(result&&result.error)throw result.error;
    writeAuthFlow(flow.purpose,flow.email,'email_sent',{method:flow.method});
    showOtpStep(flow.purpose,flow.email);
    startOtpCooldown(60);
  }
  function holdAppForAuthFlow(session){
    var flow=readAuthFlow();
    if(!flow||!session||!session.user)return false;
    var sessionEmail=String(session.user.email||'').trim().toLowerCase();
    if(!flow.email||flow.email!==sessionEmail)return false;

    // A sessão criada pelo link do próprio e-mail já comprova a segunda etapa.
    // Antes, o Bingeo mantinha o fluxo em "email_sent" e devolvia o usuário
    // para a tela de confirmação mesmo depois de um Magic Link válido.
    if(!authCallbackConsumed&&emailCallbackCanComplete(flow)){
      authCallbackConsumed=true;
      if(flow.purpose==='recovery'){
        writeAuthFlow('recovery',flow.email,'password_change',{method:'recovery'});
        cleanAuthCallbackUrl();
        showNewPasswordStep(flow.email);
        return true;
      }
      clearAuthFlow();
      cleanAuthCallbackUrl();
      return false;
    }

    if(flow.purpose==='recovery'&&flow.stage==='password_change'){
      showNewPasswordStep(flow.email);
      return true;
    }
    if(flow.purpose==='login'&&['password_check','sending','email_sent'].indexOf(flow.stage)>-1){
      if(flow.stage==='email_sent')showOtpStep('login',flow.email);
      return true;
    }
    return false;
  }
  function restorePendingAuthUi(){
    var flow=readAuthFlow();
    if(!flow)return false;
    if(flow.purpose==='recovery'&&flow.stage==='password_change'){showNewPasswordStep(flow.email);return true;}
    if(flow.stage==='email_sent'){showOtpStep(flow.purpose,flow.email);startOtpCooldown(1);return true;}
    return false;
  }

  document.getElementById('authLoginTab').onclick=function(){clearAuthFlow();setAuthMode('login');};
  document.getElementById('authSignupTab').onclick=function(){clearAuthFlow();setAuthMode('signup');};
  document.getElementById('authForgotPassword').onclick=function(){clearAuthFlow();showRecoveryRequest();};
  document.getElementById('authRecoveryBack').onclick=function(){clearAuthFlow();setAuthMode('login');};

  document.getElementById('authForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var email=document.getElementById('authEmail').value.trim().toLowerCase();
    var password=document.getElementById('authPassword').value;
    var err=document.getElementById('authError'),btn=document.getElementById('authSubmit');
    err.style.color='#ff8f8f';err.textContent='';
    if(authMode==='signup'){
      var confirmPassword=document.getElementById('authConfirmPassword').value;
      var username=document.getElementById('authUsername').value.trim();
      var termsAccepted=document.getElementById('authTermsConsent').checked;
      var privacyAccepted=document.getElementById('authPrivacyConsent').checked;
      if(username.length<3||username.length>30){err.textContent='O nome de usuário precisa ter entre 3 e 30 caracteres.';return;}
      if(password.length<8){err.textContent='A senha precisa ter pelo menos 8 caracteres.';return;}
      if(password!==confirmPassword){err.textContent='As senhas não coincidem.';return;}
      if(!termsAccepted||!privacyAccepted){err.textContent='Para criar a conta, aceite os Termos de Uso e Serviço e a Política de Privacidade.';return;}
    }
    btn.disabled=true;btn.textContent='Aguarde…';
    try{
      var result;
      if(authMode==='signup'){
        result=await supabaseClient.auth.signUp({
          email:email,
          password:password,
          options:{
            data:{
              username:username,
              legal_accepted:true,
              terms_accepted:true,
              privacy_accepted:true,
              terms_version:'2026-10-01',
              privacy_version:'2026-10-01',
              signup_source:'bingeo_web'
            },
            emailRedirectTo:authRedirectUrl()
          }
        });
        if(result.error)throw result.error;
        if(result.data&&result.data.session){
          clearAuthFlow();
          await applySession(result.data.session);
        }else{
          writeAuthFlow('signup',email,'email_sent',{method:'signup_confirmation'});
          showOtpStep('signup',email);
          startOtpCooldown(60);
        }
      }else{
        persistRememberedEmail(email);
        writeAuthFlow('login',email,'password_check',{method:'magic_link'});
        result=await supabaseClient.auth.signInWithPassword({email:email,password:password});
        if(result.error)throw result.error;
        if(!result.data||!result.data.session)throw new Error('Não foi possível validar a senha.');
        await supabaseClient.auth.signOut({scope:'local'});
        await sendLoginOtp(email,'login');
      }
    }catch(ex){
      clearAuthFlow();
      showAuthCredentials();
      err.style.color='#ff8f8f';
      err.textContent=ex.message||'Não foi possível autenticar.';
    }finally{
      btn.disabled=false;
      btn.textContent=authMode==='signup'?'Criar conta':'Entrar';
    }
  });

  document.getElementById('authRecoveryForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var email=document.getElementById('authRecoveryEmail').value.trim().toLowerCase();
    var err=document.getElementById('authRecoveryError'),btn=document.getElementById('authRecoverySubmit');
    err.style.color='#ff8f8f';err.textContent='';
    if(!email){err.textContent='Informe o e-mail da sua conta.';return;}
    btn.disabled=true;btn.textContent='Enviando…';
    try{
      writeAuthFlow('recovery',email,'sending',{method:'recovery'});
      var result=await supabaseClient.auth.resetPasswordForEmail(email,{redirectTo:authRedirectUrl()});
      if(result.error)throw result.error;
      writeAuthFlow('recovery',email,'email_sent',{method:'recovery'});
      showOtpStep('recovery',email);
      startOtpCooldown(60);
    }catch(ex){
      clearAuthFlow();
      err.textContent=ex.message||'Não foi possível enviar o link de recuperação.';
    }finally{
      btn.disabled=false;btn.textContent='Enviar link';
    }
  });

  document.getElementById('authOtpResend').onclick=async function(){
    var flow=readAuthFlow(),err=document.getElementById('authOtpError'),btn=document.getElementById('authOtpResend');
    if(!flow||!flow.email){setAuthMode('login');return;}
    if(Date.now()<otpCooldownUntil)return;
    btn.disabled=true;err.textContent='';
    try{await resendCurrentOtp(flow);}
    catch(ex){err.textContent=ex.message||'Não foi possível reenviar o link.';btn.disabled=false;}
  };
  document.getElementById('authOtpBack').onclick=async function(){
    var flow=readAuthFlow();
    clearAuthFlow();
    try{await supabaseClient.auth.signOut({scope:'local'});}catch(_e){}
    if(flow&&flow.purpose==='recovery')showRecoveryRequest();
    else setAuthMode(flow&&flow.purpose==='signup'?'signup':'login');
  };

  document.getElementById('authNewPasswordForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var flow=readAuthFlow(),password=document.getElementById('authNewPassword').value,confirmPassword=document.getElementById('authNewPasswordConfirm').value;
    var err=document.getElementById('authNewPasswordError'),btn=document.getElementById('authNewPasswordSubmit');
    err.style.color='#ff8f8f';err.textContent='';
    if(!flow||flow.purpose!=='recovery'||flow.stage!=='password_change'){err.textContent='A recuperação expirou. Solicite um novo link.';return;}
    if(password.length<8){err.textContent='A nova senha precisa ter pelo menos 8 caracteres.';return;}
    if(password!==confirmPassword){err.textContent='As senhas não coincidem.';return;}
    btn.disabled=true;btn.textContent='Salvando…';
    try{
      var result=await supabaseClient.auth.updateUser({password:password});
      if(result.error)throw result.error;
      clearAuthFlow();
      await supabaseClient.auth.signOut({scope:'local'});
      setAuthMode('login');
      var loginEmail=document.getElementById('authEmail');if(loginEmail)loginEmail.value=flow.email;
      var loginErr=document.getElementById('authError');
      loginErr.style.color='#8bd38b';
      loginErr.textContent='Senha redefinida com sucesso. Entre com sua nova senha.';
    }catch(ex){
      err.textContent=ex.message||'Não foi possível atualizar sua senha.';
    }finally{
      btn.disabled=false;btn.textContent='Salvar nova senha';
    }
  });

  restoreRememberedEmail();
  // Remove chaves antigas do fluxo anterior para evitar estados presos após a atualização.
  authStorageSet('bingeo.emailSecondStep.v1','');
  authStorageSet('bingeo.signupConfirm.v1','');

  var restoredPendingUi=restorePendingAuthUi();
  if(!restoredPendingUi)setAuthMode('login');
  if(authInitialCallback.error){
    var callbackFlow=readAuthFlow();
    if(callbackFlow&&callbackFlow.email){
      showOtpStep(callbackFlow.purpose,callbackFlow.email);
      var callbackErr=document.getElementById('authOtpError');
      if(callbackErr){
        callbackErr.style.color='#ffb36b';
        callbackErr.textContent='Esse link já foi usado ou expirou. Toque em Reenviar link para receber um novo.';
      }
    }else{
      setAuthMode('login');
      var loginCallbackErr=document.getElementById('authError');
      if(loginCallbackErr){
        loginCallbackErr.style.color='#ffb36b';
        loginCallbackErr.textContent='Esse link de acesso já foi usado ou expirou. Faça login novamente para receber um novo link.';
      }
    }
    cleanAuthCallbackUrl();
  }

  document.getElementById('logoutBtn').onclick=async function(){
    clearAuthFlow();
    await supabaseClient.auth.signOut();
  };

  async function applySession(session){
    var logged=!!(session&&session.user);
    var nextUserId=logged?session.user.id:null;
    var accountChanged=nextUserId!==loadedAccountId;

    if(logged&&holdAppForAuthFlow(session)){
      currentUserId=null;
      loadedAccountId=null;
      appBooted=false;
      resetAccountRuntime();
      document.getElementById('authGate').style.display='flex';
      document.getElementById('appShell').style.display='none';
      return;
    }

    if(!logged){
      currentUserId=null;
      loadedAccountId=null;
      appBooted=false;
      resetAccountRuntime();
      document.getElementById('authGate').style.display='flex';
      document.getElementById('appShell').style.display='none';
      if(!restorePendingAuthUi())showAuthCredentials();
      return;
    }

    var activeFlow=readAuthFlow();
    if(activeFlow&&activeFlow.email===String(session.user.email||'').trim().toLowerCase()&&activeFlow.purpose!=='recovery'){
      clearAuthFlow();
    }

    currentUserId=nextUserId;
    document.getElementById('authGate').style.display='none';
    document.getElementById('appShell').style.display='block';

    if(accountChanged||!appBooted){
      loadedAccountId=nextUserId;
      appBooted=false;
      resetAccountRuntime();
      state.profile.username=(session.user.user_metadata&&session.user.user_metadata.username)||'';
      await loadData();
      if(currentUserId!==nextUserId)return;
      await Promise.allSettled([
        loadOwnProfileFromSupabase(),
        loadLibraryFromSupabase(),
        loadListsFromSupabase(),
        loadFollowingFeed(),
        loadOwnPeopleFavorites()
      ]);
      if(currentUserId!==nextUserId)return;
      await refreshBillingEntitlement();
      if(currentUserId!==nextUserId)return;
      var billingSuccessReturn=handleBillingReturn();
      appBooted=true;
      render();
      scheduleDiscoverPopularPreload();
      if(billingSuccessReturn)pollBillingConfirmation();
      setTimeout(indexCharactersFromLibrary,700);
      if(!billingSuccessReturn&&!(await openSharedListTarget()))await openSharedProfileTarget();
    }else{
      var billingSuccessExisting=handleBillingReturn();
      if(billingSuccessExisting){render();pollBillingConfirmation();return;}
      if(!(await openSharedListTarget()))await openSharedProfileTarget();
    }
  }

  supabaseClient.auth.onAuthStateChange(function(event,session){
    setTimeout(function(){
      if(event==='PASSWORD_RECOVERY'){
        var flow=readAuthFlow();
        if(flow&&flow.purpose==='recovery'){
          writeAuthFlow('recovery',flow.email,'password_change',{method:'recovery'});
          showNewPasswordStep(flow.email);
          document.getElementById('authGate').style.display='flex';
          document.getElementById('appShell').style.display='none';
          return;
        }
      }
      applySession(session);
    },0);
  });
  supabaseClient.auth.getSession().then(function(r){applySession(r.data.session);});

