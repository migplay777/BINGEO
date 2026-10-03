
  var SUPABASE_URL='https://bazujvpppbxxiymxweiq.supabase.co';
  var SUPABASE_PUBLISHABLE_KEY='sb_publishable_y6uiZr53J-ZtPCWDRNEvjw_x-ZGU-mi';
  var supabaseClient=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{
    auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}
  });
  var authMode='login', appBooted=false, currentUserId=null;
  function authRedirectUrl(){
    var origin=window.location.origin||'';
    if(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)){
      return 'https://bingeo.onrender.com/';
    }
    return origin.replace(/\/$/,'')+'/';
  }

  function setAuthMode(mode){
    authMode=mode;
    var signup=mode==='signup';
    document.getElementById('authUsernameField').style.display=signup?'block':'none';
    document.getElementById('authConfirmField').style.display=signup?'block':'none';
    document.getElementById('authLegalField').style.display=signup?'flex':'none';
    document.getElementById('authUsername').required=signup;
    document.getElementById('authConfirmPassword').required=signup;
    document.getElementById('authLegalConsent').required=signup;
    document.getElementById('authSubmit').textContent=signup?'Criar conta':'Entrar';
    var passwordInput=document.getElementById('authPassword'),confirmInput=document.getElementById('authConfirmPassword');
    passwordInput.autocomplete=signup?'new-password':'current-password';
    passwordInput.minLength=signup?8:1;
    confirmInput.minLength=signup?8:1;
    document.getElementById('authLoginTab').classList.toggle('active',!signup);
    document.getElementById('authSignupTab').classList.toggle('active',signup);
    document.getElementById('authSubtitle').textContent=signup?'Crie sua conta para salvar estante, avaliações, diário e listas em um só lugar.':'Entre para continuar acompanhando suas séries, avaliações, diário e listas.';
    var err=document.getElementById('authError');err.style.color='#ff8f8f';err.textContent='';
  }
  document.getElementById('authLoginTab').onclick=function(){setAuthMode('login');};
  document.getElementById('authSignupTab').onclick=function(){setAuthMode('signup');};
  document.getElementById('authForm').addEventListener('submit',async function(e){
    e.preventDefault();
    var email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value,err=document.getElementById('authError'),btn=document.getElementById('authSubmit');
    err.style.color='#ff8f8f';err.textContent='';
    if(authMode==='signup'){
      var confirmPassword=document.getElementById('authConfirmPassword').value;
      var username=document.getElementById('authUsername').value.trim();
      if(username.length<3||username.length>30){err.textContent='O nome de usuário precisa ter entre 3 e 30 caracteres.';return;}
      if(password.length<8){err.textContent='A senha precisa ter pelo menos 8 caracteres.';return;}
      if(password!==confirmPassword){err.textContent='As senhas não coincidem.';return;}
      if(!document.getElementById('authLegalConsent').checked){err.textContent='Leia e aceite os Termos de Uso e a Política de Privacidade para criar a conta.';return;}
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
              terms_version:'2026-10-01',
              privacy_version:'2026-10-01'
            },
            emailRedirectTo:authRedirectUrl()
          }
        });
      }else{
        result=await supabaseClient.auth.signInWithPassword({email:email,password:password});
      }
      if(result.error)throw result.error;
      if(authMode==='signup'&&!result.data.session){
        err.style.color='#9ca3af';
        err.textContent='Conta criada. Confira seu e-mail para confirmar o cadastro e depois faça login.';
      }
    }catch(ex){
      err.style.color='#ff8f8f';
      err.textContent=ex.message||'Não foi possível autenticar.';
    }finally{
      btn.disabled=false;
      btn.textContent=authMode==='signup'?'Criar conta':'Entrar';
    }
  });
  var loadedAccountId=null;
  document.getElementById('logoutBtn').onclick=async function(){
    await supabaseClient.auth.signOut();
  };
  async function applySession(session){
    var logged=!!(session&&session.user);
    var nextUserId=logged?session.user.id:null;
    var accountChanged=nextUserId!==loadedAccountId;

    if(!logged){
      currentUserId=null;
      loadedAccountId=null;
      appBooted=false;
      resetAccountRuntime();
      document.getElementById('authGate').style.display='flex';
      document.getElementById('appShell').style.display='none';
      return;
    }

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

  