  var SUPABASE_URL='https://bazujvpppbxxiymxweiq.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY='sb_publishable_y6uiZr53J-ZtPCWDRNEvjw_x-ZGU-mi';
  var supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}
  });
  var AUTH_REMEMBER_EMAIL_KEY='bingeo.rememberEmail.v1';
  var AUTH_EMAIL_STEP_KEY='bingeo.emailSecondStep.v1';
  var AUTH_SIGNUP_CONFIRM_KEY='bingeo.signupConfirm.v1';
  var AUTH_EMAIL_STEP_TTL=10*60*1000;
  var authMode='login',appBooted=false,currentUserId=null;
  var emailSecondStepVerifying=false,otpCooldownTimer=null,otpCooldownUntil=0;

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
  function readJsonStorage(key){
    try{
      var raw=authStorageGet(key);if(!raw)return null;
      var value=JSON.parse(raw);
      if(value&&value.expiresAt&&Number(value.expiresAt)<Date.now()){authStorageSet(key,'');return null;}
      return value&&typeof value==='object'?value:null;
    }catch(_e){authStorageSet(key,'');return null;}
  }
  function writePendingEmailStep(email,stage){
    var row={email:String(email||'').trim().toLowerCase(),stage:stage||'email_sent',expiresAt:Date.now()+AUTH_EMAIL_STEP_TTL};
    authStorageSet(AUTH_EMAIL_STEP_KEY,JSON.stringify(row));
    return row;
  }
  function readPendingEmailStep(){return readJsonStorage(AUTH_EMAIL_STEP_KEY);}
  function clearPendingEmailStep(){authStorageSet(AUTH_EMAIL_STEP_KEY,'');}
  function setSignupConfirmMarker(email){
    authStorageSet(AUTH_SIGNUP_CONFIRM_KEY,JSON.stringify({email:String(email||'').trim().toLowerCase(),expiresAt:Date.now()+24*60*60*1000}));
  }
  function clearSignupConfirmMarker(){authStorageSet(AUTH_SIGNUP_CONFIRM_KEY,'');}

  function showAuthCredentials(){
    var credentials=document.getElementById('authCredentialsStep'),otp=document.getElementById('authOtpStep');
    if(credentials)credentials.hidden=false;
    if(otp)otp.hidden=true;
  }
  function showEmailSecondStep(email){
    var credentials=document.getElementById('authCredentialsStep'),otp=document.getElementById('authOtpStep');
    if(credentials)credentials.hidden=true;
    if(otp)otp.hidden=false;
    var safeEmail=String(email||'').trim();
    var message=document.getElementById('authOtpMessage');
    if(message)message.textContent='Enviamos uma verificação para '+safeEmail+'. Digite o código recebido para concluir o login.';
    var code=document.getElementById('authOtpCode');
    if(code){code.value='';setTimeout(function(){code.focus();},0);}
    var error=document.getElementById('authOtpError');if(error){error.textContent='';error.style.color='#ff8f8f';}
  }
  function setAuthMode(mode){
    authMode=mode;
    showAuthCredentials();
    var signup=mode==='signup';
    document.getElementById('authUsernameField').style.display=signup?'block':'none';
    document.getElementById('authConfirmField').style.display=signup?'block':'none';
    document.getElementById('authLegalField').style.display=signup?'grid':'none';
    document.getElementById('authRememberField').style.display=signup?'none':'flex';
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
    document.getElementById('authSubtitle').textContent=signup?'Crie sua conta para salvar estante, avaliações, diário e listas em um só lugar.':'Entre com sua senha e confirme o acesso pelo e-mail.';
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
      btn.textContent=left>0?'Reenviar em '+left+'s':'Reenviar verificação';
      if(left<=0&&otpCooldownTimer){clearInterval(otpCooldownTimer);otpCooldownTimer=null;}
    }
    paint();otpCooldownTimer=setInterval(paint,1000);
  }
  async function sendEmailSecondStep(email){
    var pending=writePendingEmailStep(email,'sending');
    var result=await supabaseClient.auth.signInWithOtp({
      email:pending.email,
      options:{shouldCreateUser:false,emailRedirectTo:authRedirectUrl()}
    });
    if(result.error){clearPendingEmailStep();throw result.error;}
    writePendingEmailStep(pending.email,'email_sent');
    showEmailSecondStep(pending.email);
    startOtpCooldown(60);
  }
  function holdAppForPendingEmailStep(session){
    var pending=readPendingEmailStep();
    if(!pending||!session||!session.user)return false;
    var sessionEmail=String(session.user.email||'').trim().toLowerCase();
    if(!pending.email||pending.email!==sessionEmail)return false;
    if(pending.stage==='verified'||emailSecondStepVerifying){clearPendingEmailStep();return false;}
    if(pending.stage==='email_sent'){
      // The password session was already closed before this stage. A new session now
      // comes from the email OTP/magic-link confirmation.
      clearPendingEmailStep();
      return false;
    }
    return true;
  }

  document.getElementById('authLoginTab').onclick=function(){clearPendingEmailStep();setAuthMode('login');};
  document.getElementById('authSignupTab').onclick=function(){clearPendingEmailStep();setAuthMode('signup');};

  document.getElementById('authForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value,err=document.getElementById('authError'),btn=document.getElementById('authSubmit');
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
        setSignupConfirmMarker(email);
        if(!result.data.session){
          err.style.color='#9ca3af';
          err.textContent='Conta criada. Confira seu e-mail para confirmar o cadastro e depois faça login.';
        }
      }else{
        persistRememberedEmail(email);
        writePendingEmailStep(email,'password_check');
        result=await supabaseClient.auth.signInWithPassword({email:email,password:password});
        if(result.error)throw result.error;
        if(!result.data||!result.data.session)throw new Error('Não foi possível validar a senha.');
        await supabaseClient.auth.signOut({scope:'local'});
        await sendEmailSecondStep(email);
      }
    }catch(ex){
      if(authMode==='login')clearPendingEmailStep();
      showAuthCredentials();
      err.style.color='#ff8f8f';
      err.textContent=ex.message||'Não foi possível autenticar.';
    }finally{
      btn.disabled=false;
      btn.textContent=authMode==='signup'?'Criar conta':'Entrar';
    }
  });

  document.getElementById('authOtpForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var pending=readPendingEmailStep(),input=document.getElementById('authOtpCode'),err=document.getElementById('authOtpError'),btn=document.getElementById('authOtpSubmit');
    var code=String(input&&input.value||'').replace(/\D/g,'');
    err.style.color='#ff8f8f';err.textContent='';
    if(!pending||pending.stage!=='email_sent'){err.textContent='Esta verificação expirou. Faça login novamente.';return;}
    if(code.length<6||code.length>8){err.textContent='Digite o código recebido no e-mail.';return;}
    btn.disabled=true;btn.textContent='Verificando…';emailSecondStepVerifying=true;
    try{
      var result=await supabaseClient.auth.verifyOtp({email:pending.email,token:code,type:'email'});
      if(result.error)throw result.error;
      writePendingEmailStep(pending.email,'verified');
      clearSignupConfirmMarker();
      if(result.data&&result.data.session)await applySession(result.data.session);
    }catch(ex){
      err.textContent=ex.message||'Código inválido ou expirado.';
    }finally{
      emailSecondStepVerifying=false;btn.disabled=false;btn.textContent='Verificar código';
    }
  });
  document.getElementById('authOtpResend').onclick=async function(){
    var pending=readPendingEmailStep(),err=document.getElementById('authOtpError'),btn=document.getElementById('authOtpResend');
    if(!pending||!pending.email){showAuthCredentials();return;}
    if(Date.now()<otpCooldownUntil)return;
    btn.disabled=true;err.textContent='';
    try{await sendEmailSecondStep(pending.email);}
    catch(ex){err.textContent=ex.message||'Não foi possível reenviar a verificação.';btn.disabled=false;}
  };
  document.getElementById('authOtpBack').onclick=async function(){
    clearPendingEmailStep();
    try{await supabaseClient.auth.signOut({scope:'local'});}catch(_e){}
    setAuthMode('login');
    var email=document.getElementById('authEmail');if(email)email.focus();
  };

  restoreRememberedEmail();
  var initialPendingEmailStep=readPendingEmailStep();
  if(initialPendingEmailStep&&initialPendingEmailStep.stage==='email_sent')showEmailSecondStep(initialPendingEmailStep.email);
  var loadedAccountId=null;
  document.getElementById('logoutBtn').onclick=async function(){
    await supabaseClient.auth.signOut();
  };
  async function applySession(session){
    var logged=!!(session&&session.user);
    var nextUserId=logged?session.user.id:null;
    var accountChanged=nextUserId!==loadedAccountId;

    if(logged&&holdAppForPendingEmailStep(session)){
      currentUserId=null;
      loadedAccountId=null;
      appBooted=false;
      resetAccountRuntime();
      document.getElementById('authGate').style.display='flex';
      document.getElementById('appShell').style.display='none';
      var waiting=readPendingEmailStep();
      if(waiting&&waiting.stage==='email_sent')showEmailSecondStep(waiting.email);
      return;
    }

    if(!logged){
      currentUserId=null;
      loadedAccountId=null;
      appBooted=false;
      resetAccountRuntime();
      document.getElementById('authGate').style.display='flex';
      document.getElementById('appShell').style.display='none';
      var pending=readPendingEmailStep();
      if(pending&&pending.stage==='email_sent')showEmailSecondStep(pending.email);
      else showAuthCredentials();
      return;
    }

    clearSignupConfirmMarker();
    currentUserId=nextUserId;
    document.getElementById('authGate').style.display='none';
    document.getElementById('appShell').style.display='block';

    if(accountChanged||!appBooted){
      loadedAccountId=nextUserId;
      appBooted=false;
      resetAccountRuntime();
      // Give immediate account identity while the authoritative profile loads.
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
  supabaseClient.auth.onAuthStateChange(function(_event,session){setTimeout(function(){applySession(session);},0);});
  supabaseClient.auth.getSession().then(function(r){applySession(r.data.session);});

  