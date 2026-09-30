  /* Bingeo Pro expansion layer: Listas Pro + molduras e insígnias. */
  var PRO_AVATAR_FRAMES=[
    {id:'none',label:'Sem moldura'},{id:'violet',label:'Violeta'},{id:'gold',label:'Dourada'},
    {id:'pulse',label:'Pulse'},{id:'aurora',label:'Aurora'}
  ];
  var PRO_PROFILE_BADGES=[
    {id:'pro',label:'✦ PRO'},{id:'maratonista',label:'Maratonista'},{id:'critico',label:'Crítico'},
    {id:'colecionador',label:'Colecionador'},{id:'noturno',label:'Noturno'}
  ];

  function proStyleObject(profile){
    if(!profile)return {};
    return profile.nameStyle&&typeof profile.nameStyle==='object'?profile.nameStyle:
      (profile.name_style&&typeof profile.name_style==='object'?profile.name_style:{});
  }
  function getProProfileSettings(profile){
    var ns=proStyleObject(profile),p=ns.pro&&typeof ns.pro==='object'?ns.pro:{};
    var frame=String(p.frame||'none'),badge=String(p.badge||'pro');
    if(!PRO_AVATAR_FRAMES.some(function(x){return x.id===frame;}))frame='none';
    if(!PRO_PROFILE_BADGES.some(function(x){return x.id===badge;}))badge='pro';
    return {
      frame:frame,
      badge:badge,
      highlightedListId:String(p.highlightedListId||''),
      theme:String(p.theme||'default')
    };
  }
  function ensureOwnProProfileSettings(){
    state.profile.nameStyle=state.profile.nameStyle&&typeof state.profile.nameStyle==='object'?state.profile.nameStyle:{color:null,effect:'none',theme:'dark'};
    var cfg=getProProfileSettings(state.profile);
    state.profile.nameStyle.pro=cfg;
    return cfg;
  }
  function updateOwnProProfileSettings(patch){
    if(!hasPro())return;
    var cfg=ensureOwnProProfileSettings();
    Object.keys(patch||{}).forEach(function(k){cfg[k]=patch[k];});
    state.profile.nameStyle.pro=cfg;
    saveData();syncProfileToSupabase();
  }
  function proAvatarFrameClass(profile){
    if(!profile||profile.plan!=='pro')return '';
    var f=getProProfileSettings(profile).frame;
    return f&&f!=='none'?'pro-avatar-frame frame-'+f:'';
  }
  function proProfileBadgeHtml(profile){
    if(!profile||profile.plan!=='pro')return '';
    var cfg=getProProfileSettings(profile),b=PRO_PROFILE_BADGES.find(function(x){return x.id===cfg.badge;})||PRO_PROFILE_BADGES[0];
    return '<span class="pro-profile-badge badge-'+escapeHtml(cfg.badge)+'">'+escapeHtml(b.label)+'</span>';
  }
  function proProfileCustomizationEditorHtml(){
    if(!hasPro())return '';
    var cfg=ensureOwnProProfileSettings();
    return '<section class="profile-edit-section pro-customization-editor">'+
      '<div class="pro-editor-head"><div><h3>Identidade Pro</h3><p>Escolha uma moldura de avatar e uma insígnia para o seu perfil.</p></div><span class="pro-active-chip">✦ PRO</span></div>'+
      '<div class="pro-editor-two-col"><div><div class="field-label">Moldura do avatar</div><div class="pro-choice-row">'+
        PRO_AVATAR_FRAMES.map(function(f){return '<button type="button" class="pro-choice '+(cfg.frame===f.id?'selected':'')+'" data-action="set-pro-avatar-frame" data-value="'+f.id+'"><span class="pro-frame-preview frame-'+f.id+'">B</span>'+escapeHtml(f.label)+'</button>';}).join('')+
      '</div></div><div><div class="field-label">Insígnia</div><div class="pro-choice-row">'+
        PRO_PROFILE_BADGES.map(function(b){return '<button type="button" class="pro-choice '+(cfg.badge===b.id?'selected':'')+'" data-action="set-pro-profile-badge" data-value="'+b.id+'">'+escapeHtml(b.label)+'</button>';}).join('')+
      '</div></div></div></section>';
  }

  function normalizeListProSettings(v){v=v&&typeof v==='object'?v:{};return {bannerUrl:/^https?:\/\//i.test(String(v.bannerUrl||v.banner_url||''))?String(v.bannerUrl||v.banner_url):'',ranked:v.ranked===true,manualOrder:Array.isArray(v.manualOrder||v.manual_order)?(v.manualOrder||v.manual_order).map(String).slice(0,200):[],formattedDescription:String(v.formattedDescription||v.formatted_description||'').slice(0,1600)};}
  function ensureListProSettings(list){if(!list)return normalizeListProSettings({});list.proSettings=normalizeListProSettings(list.proSettings);return list.proSettings;}
  function proListOrderedIds(list){var ids=(list&&list.showIds||[]).slice(),s=normalizeListProSettings(list&&list.proSettings);if(!s.manualOrder.length)return ids;var present={};ids.forEach(function(id){present[id]=1;});var o=s.manualOrder.filter(function(id){return present[id];});ids.forEach(function(id){if(o.indexOf(id)===-1)o.push(id);});return o;}
  function proListHeroStyle(list){var s=normalizeListProSettings(list&&list.proSettings),u=s.bannerUrl||list&&list.coverUrl||'';return u?'background-image:url(\''+String(u).replace(/'/g,'%27')+'\');':'';}
  function proRichText(t){var s=escapeHtml(String(t||''));s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');return s.replace(/\n/g,'<br>');}
  function proListDescriptionHtml(list){var s=normalizeListProSettings(list&&list.proSettings);return s.formattedDescription?'<div class="pro-list-rich-description">'+proRichText(s.formattedDescription)+'</div>':'<p>'+escapeHtml(list&&list.description||'')+'</p>';}
  function proListMemberCardHtml(list,html,i){return normalizeListProSettings(list&&list.proSettings).ranked?'<div class="pro-list-ranked-item"><span class="pro-list-rank">#'+(i+1)+'</span>'+html+'</div>':html;}
  function proListToolsHtml(list){
    if(!list||!hasPro())return '';var s=ensureListProSettings(list),ids=proListOrderedIds(list),cfg=ensureOwnProProfileSettings();
    return '<section class="pro-list-tools"><div class="pro-editor-head"><div><h3>Ferramentas Pro da lista</h3><p>Banner, ranking, ordem manual, descrição formatada e destaque no perfil.</p></div><span class="pro-active-chip">✦ PRO</span></div><div class="pro-list-tool-actions"><button class="btn btn-ghost btn-sm" data-action="choose-pro-list-banner" data-list="'+escapeHtml(list.id)+'">'+(s.bannerUrl?'Trocar banner':'Adicionar banner')+'</button>'+(s.bannerUrl?'<button class="btn btn-ghost btn-sm" data-action="remove-pro-list-banner" data-list="'+escapeHtml(list.id)+'">Remover banner</button>':'')+'<button class="btn btn-ghost btn-sm" data-action="toggle-pro-list-ranking" data-list="'+escapeHtml(list.id)+'">'+(s.ranked?'Desativar ranking':'Ranking numerado')+'</button><button class="btn btn-ghost btn-sm" data-action="set-pro-highlight-list" data-list="'+escapeHtml(list.id)+'">'+(cfg.highlightedListId===list.id?'Remover destaque':'Destacar no perfil')+'</button></div>'+
      '<div class="pro-list-format-grid"><div><label class="field-label">Descrição formatada</label><textarea id="proListDescription" class="qa-input pro-list-description-input" maxlength="1600">'+escapeHtml(s.formattedDescription||'')+'</textarea><button class="btn btn-primary btn-sm" data-action="save-pro-list-description" data-list="'+escapeHtml(list.id)+'">Salvar</button></div><div><div class="field-label">Ordem manual</div><div class="pro-list-order">'+(ids.length?ids.map(function(cid,i){var c=getCatalog(cid);return '<div class="pro-list-order-row"><span>'+(i+1)+'</span><strong>'+escapeHtml(c?c.title:'Série')+'</strong><div><button class="top5-mini-btn" data-action="pro-list-move" data-list="'+escapeHtml(list.id)+'" data-catalog="'+escapeHtml(cid)+'" data-dir="up" '+(i===0?'disabled':'')+'>↑</button><button class="top5-mini-btn" data-action="pro-list-move" data-list="'+escapeHtml(list.id)+'" data-catalog="'+escapeHtml(cid)+'" data-dir="down" '+(i===ids.length-1?'disabled':'')+'>↓</button></div></div>';}).join(''):'<div class="pro-list-empty">Adicione títulos para ordenar.</div>')+'</div></div></div></section>';
  }
  function proOwnHighlightedListHtml(){if(!hasPro())return '';var id=ensureOwnProProfileSettings().highlightedListId;if(!id)return '';var l=state.lists.find(function(x){return x.id===id;});if(!l)return '';var a=normalizeListProSettings(l.proSettings).bannerUrl||l.coverUrl||'';return '<section class="pro-highlighted-list" data-action="open-list" data-list="'+escapeHtml(l.id)+'"><div class="pro-highlighted-list-art" style="'+(a?'background-image:url(\''+String(a).replace(/'/g,'%27')+'\');':'')+'"></div><div><span>LISTA EM DESTAQUE</span><h3>'+escapeHtml(l.name||'Lista')+'</h3><p>'+l.showIds.length+' títulos</p></div><b>›</b></section>';}
  async function loadProPublicProfileExtras(u){if(!u||u.plan!=='pro'||u.pro_highlight_loading)return;var id=getProProfileSettings(u).highlightedListId;if(!id||u.pro_highlighted_list)return;u.pro_highlight_loading=true;try{var r=await supabaseClient.rpc('get_public_profile_highlighted_list',{p_user_id:u.user_id,p_client_id:id});if(r.error)throw r.error;u.pro_highlighted_list=r.data||null;}catch(e){console.warn('Lista destacada:',e);}finally{u.pro_highlight_loading=false;if(state.userProfileOpen===u.user_id)renderMainViewOnly();}}
  function proPublicHighlightedListHtml(u){var l=u&&u.pro_highlighted_list;if(!l)return '';var s=normalizeListProSettings(l.pro_settings),a=s.bannerUrl||l.cover_url||'';return '<section class="pro-highlighted-list" data-action="open-public-highlighted-list" data-slug="'+escapeHtml(l.share_slug||'')+'"><div class="pro-highlighted-list-art" style="'+(a?'background-image:url(\''+String(a).replace(/'/g,'%27')+'\');':'')+'"></div><div><span>LISTA EM DESTAQUE</span><h3>'+escapeHtml(l.name||'Lista')+'</h3><p>'+Number(l.item_count||0)+' títulos</p></div><b>›</b></section>';}

  function handleProFeatureAction(action,el){
    if(action==='set-pro-avatar-frame'){
      if(hasPro()){updateOwnProProfileSettings({frame:String(el.dataset.value||'none')});render();}
      return true;
    }
    if(action==='set-pro-profile-badge'){
      if(hasPro()){updateOwnProProfileSettings({badge:String(el.dataset.value||'pro')});render();}
      return true;
    }
    if(action==='set-pro-highlight-list'){
      if(!hasPro()){openProView('lista-destaque');return true;}
      var list=state.lists.find(function(l){return l.id===el.dataset.list;});if(!list)return true;
      var cfg=ensureOwnProProfileSettings(),turningOn=cfg.highlightedListId!==list.id;
      if(turningOn&&list.visibility!=='public'){
        if(!confirm('Para aparecer para outras pessoas, a lista destacada precisa ser pública. Tornar pública agora?'))return true;
        list.visibility='public';list.updatedAt=new Date().toISOString();saveData();syncListToSupabase(list);
      }
      updateOwnProProfileSettings({highlightedListId:turningOn?list.id:''});
      renderMainViewOnly();return true;
    }
    if(action==='choose-pro-list-banner'){
      if(!hasPro()){openProView('lista-banner');return true;}
      state.proListBannerTarget=el.dataset.list;
      var input=document.getElementById('listBannerInput');if(input)input.click();
      return true;
    }
    if(action==='remove-pro-list-banner'){
      var bl=state.lists.find(function(l){return l.id===el.dataset.list;});
      if(bl&&hasPro()){ensureListProSettings(bl).bannerUrl='';bl.updatedAt=new Date().toISOString();saveData();syncListToSupabase(bl);renderMainViewOnly();}
      return true;
    }
    if(action==='toggle-pro-list-ranking'){
      var rl=state.lists.find(function(l){return l.id===el.dataset.list;});
      if(rl&&hasPro()){var rs=ensureListProSettings(rl);rs.ranked=!rs.ranked;rl.updatedAt=new Date().toISOString();saveData();syncListToSupabase(rl);renderMainViewOnly();}
      return true;
    }
    if(action==='pro-list-move'){
      var ml=state.lists.find(function(l){return l.id===el.dataset.list;});if(!ml||!hasPro())return true;
      var ms=ensureListProSettings(ml),order=proListOrderedIds(ml),idx=order.indexOf(el.dataset.catalog),swap=el.dataset.dir==='up'?idx-1:idx+1;
      if(idx<0||swap<0||swap>=order.length)return true;
      var tmp=order[idx];order[idx]=order[swap];order[swap]=tmp;ms.manualOrder=order;ml.updatedAt=new Date().toISOString();saveData();syncListToSupabase(ml);renderMainViewOnly();return true;
    }
    if(action==='save-pro-list-description'){
      var dl=state.lists.find(function(l){return l.id===el.dataset.list;}),ta=document.getElementById('proListDescription');
      if(dl&&ta&&hasPro()){ensureListProSettings(dl).formattedDescription=String(ta.value||'').slice(0,1600);dl.updatedAt=new Date().toISOString();saveData();syncListToSupabase(dl);renderMainViewOnly();}
      return true;
    }
    if(action==='open-public-highlighted-list'){
      var slug=String(el.dataset.slug||'');if(!slug)return true;
      loadPublicSharedList(slug).then(function(list){
        if(list){state.userProfileOpen=null;state.userProfileData=null;state.listOpen=list.id;state.view='listas';render();}
      }).catch(function(e){alert(e.message||'Não foi possível abrir a lista.');});
      return true;
    }
    return false;
  }
