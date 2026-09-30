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


  /* ---- Artes Pro de temporadas/episódios + Review Pro ---- */
  if(state.proMediaArtworkPicker===undefined)state.proMediaArtworkPicker=null;
  if(!state.proMediaArtworkOptions)state.proMediaArtworkOptions={};
  if(!state.proMediaArtworkLoading)state.proMediaArtworkLoading={};

  function normalizeProReview(value){
    value=value&&typeof value==='object'?value:{};
    var layout=['cinematic','editorial','minimal'].indexOf(value.layout)>-1?value.layout:'cinematic';
    var background=['backdrop','poster','none'].indexOf(value.background)>-1?value.background:'backdrop';
    return {
      enabled:value.enabled===true,
      title:String(value.title||'').slice(0,90),
      layout:layout,
      background:background,
      quote:String(value.quote||'').slice(0,220),
      section1Title:String(value.section1Title||value.section_1_title||'').slice(0,70),
      section1Body:String(value.section1Body||value.section_1_body||'').slice(0,1400),
      section2Title:String(value.section2Title||value.section_2_title||'').slice(0,70),
      section2Body:String(value.section2Body||value.section_2_body||'').slice(0,1400)
    };
  }
  function proReviewActive(value){return normalizeProReview(value).enabled===true;}
  function proReviewEditorHtml(entry,cat){
    if(!hasPro())return '';
    var pr=normalizeProReview(entry&&entry.proReview);
    return '<div class="pro-review-editor">'+
      '<div class="pro-review-editor-head"><div><strong>Review Pro</strong><small>Transforme sua resenha em uma publicação visual sem alterar a review tradicional.</small></div><span class="pro-active-chip">✦ PRO</span></div>'+
      '<label class="pro-review-enable"><input id="proReviewEnabled" type="checkbox" '+(pr.enabled?'checked':'')+'> Usar apresentação Review Pro</label>'+
      '<div class="pro-review-editor-grid">'+
        '<label><span>Título da review</span><input id="proReviewTitle" maxlength="90" value="'+escapeHtml(pr.title)+'" placeholder="Ex.: Uma temporada impossível de esquecer"></label>'+
        '<label><span>Layout</span><select id="proReviewLayout"><option value="cinematic" '+(pr.layout==='cinematic'?'selected':'')+'>Cinematográfico</option><option value="editorial" '+(pr.layout==='editorial'?'selected':'')+'>Editorial</option><option value="minimal" '+(pr.layout==='minimal'?'selected':'')+'>Minimalista</option></select></label>'+
        '<label><span>Imagem de fundo</span><select id="proReviewBackground"><option value="backdrop" '+(pr.background==='backdrop'?'selected':'')+'>Banner da série</option><option value="poster" '+(pr.background==='poster'?'selected':'')+'>Pôster da série</option><option value="none" '+(pr.background==='none'?'selected':'')+'>Sem imagem</option></select></label>'+
        '<label class="pro-review-wide"><span>Citação em destaque</span><input id="proReviewQuote" maxlength="220" value="'+escapeHtml(pr.quote)+'" placeholder="Uma frase que resume sua experiência"></label>'+
        '<label><span>Seção 1 — título</span><input id="proReviewSection1Title" maxlength="70" value="'+escapeHtml(pr.section1Title)+'" placeholder="Ex.: O que funcionou"></label>'+
        '<label><span>Seção 2 — título</span><input id="proReviewSection2Title" maxlength="70" value="'+escapeHtml(pr.section2Title)+'" placeholder="Ex.: O que poderia melhorar"></label>'+
        '<label><span>Seção 1</span><textarea id="proReviewSection1Body" maxlength="1400" placeholder="Texto opcional">'+escapeHtml(pr.section1Body)+'</textarea></label>'+
        '<label><span>Seção 2</span><textarea id="proReviewSection2Body" maxlength="1400" placeholder="Texto opcional">'+escapeHtml(pr.section2Body)+'</textarea></label>'+
      '</div>'+
      '<div class="pro-review-editor-note">A resenha normal continua sendo salva no campo principal. Estes dados controlam apenas a apresentação Pro.</div>'+
    '</div>';
  }
  function readProReviewForm(entry){
    if(!hasPro())return normalizeProReview(entry&&entry.proReview);
    var enabled=document.getElementById('proReviewEnabled');
    if(!enabled)return normalizeProReview(entry&&entry.proReview);
    function val(id){var el=document.getElementById(id);return el?String(el.value||''):'';}
    return normalizeProReview({
      enabled:!!enabled.checked,
      title:val('proReviewTitle'),
      layout:val('proReviewLayout'),
      background:val('proReviewBackground'),
      quote:val('proReviewQuote'),
      section1Title:val('proReviewSection1Title'),
      section1Body:val('proReviewSection1Body'),
      section2Title:val('proReviewSection2Title'),
      section2Body:val('proReviewSection2Body')
    });
  }
  function proReviewArtUrl(row,cat,pr){
    if(!pr||pr.background==='none')return '';
    var path='';
    if(pr.background==='poster')path=(row&&row.poster_path)||(cat&&cat.poster_path)||'';
    else path=(row&&row.backdrop_path)||(cat&&cat.backdrop_path)||'';
    if(!path&&pr.background==='backdrop')path=(row&&row.poster_path)||(cat&&cat.poster_path)||'';
    return path?tmdbImageUrl(path,pr.background==='poster'?'w500':'w1280'):'';
  }
  function proReviewContentHtml(pr,reviewText){
    var html='';
    if(pr.quote)html+='<blockquote class="pro-review-quote">“'+escapeHtml(pr.quote)+'”</blockquote>';
    if(reviewText)html+='<div class="pro-review-main-text">'+escapeHtml(reviewText)+'</div>';
    if(pr.section1Title||pr.section1Body)html+='<section class="pro-review-section">'+(pr.section1Title?'<h4>'+escapeHtml(pr.section1Title)+'</h4>':'')+(pr.section1Body?'<p>'+escapeHtml(pr.section1Body)+'</p>':'')+'</section>';
    if(pr.section2Title||pr.section2Body)html+='<section class="pro-review-section">'+(pr.section2Title?'<h4>'+escapeHtml(pr.section2Title)+'</h4>':'')+(pr.section2Body?'<p>'+escapeHtml(pr.section2Body)+'</p>':'')+'</section>';
    return html;
  }
  function proReviewProfileCardHtml(ev,cat){
    var pr=normalizeProReview(ev&&ev.pro_review);
    if(!pr.enabled)return '';
    var art=proReviewArtUrl(ev,cat,pr),style=art?'background-image:url(\''+art.replace(/'/g,'%27')+'\');':'';
    return '<article class="pro-review-card pro-review-profile layout-'+pr.layout+(art?' has-art':'')+'" data-action="open-show" data-catalog="'+escapeHtml(ev.catalog_id||'')+'" style="'+style+'">'+
      '<div class="pro-review-shade"></div><div class="pro-review-inner">'+
        '<div class="pro-review-topline"><span>✦ REVIEW PRO</span><b>'+(ev.rating!=null?'★ '+Number(ev.rating).toFixed(1):'Sem nota')+'</b></div>'+
        '<h3>'+escapeHtml(pr.title||ev.title||cat&&cat.title||'Review')+'</h3>'+
        proReviewContentHtml(pr,ev.review||'')+
        userEvaluationExtraHtml(ev)+
      '</div></article>';
  }
  function proReviewCommunityHtml(review,catalogId,top,tags,spoiler){
    var pr=normalizeProReview(review&&review.pro_review);
    if(review&&review.plan!=='pro'||!pr.enabled)return '';
    var cat=getCatalog(catalogId),art=proReviewArtUrl(review,cat,pr),style=art?'background-image:url(\''+art.replace(/'/g,'%27')+'\');':'';
    return '<article class="community-review pro-review-card layout-'+pr.layout+(art?' has-art':'')+'" style="'+style+'">'+
      '<div class="pro-review-shade"></div><div class="pro-review-inner">'+top+
        '<div class="pro-review-spoiler-label">'+escapeHtml(spoiler||'Sem spoilers')+'</div>'+
        '<h3>'+escapeHtml(pr.title||cat&&cat.title||'Review Pro')+'</h3>'+
        proReviewContentHtml(pr,review.review||'')+tags+
      '</div></article>';
  }

  function proMediaArtworkKey(kind,catalogId,season,episode){
    return [kind,catalogId,Number(season)||0,Number(episode)||0].join(':');
  }
  function proSeasonDefaultArtwork(cat,season){
    var rows=cat&&cat.tmdbData&&Array.isArray(cat.tmdbData.seasons)?cat.tmdbData.seasons:[];
    var row=rows.find(function(s){return Number(s.season_number)===Number(season);});
    return row&&row.poster_path||'';
  }
  function proEpisodeDefaultArtwork(cat,season,episode,meta){
    meta=meta||getEpisodeMeta(cat&&cat.id,season,episode);
    return meta&&meta.still_path||'';
  }
  function proMediaSelectedPath(entry,kind,season,episode){
    if(!entry)return '';
    if(kind==='season')return entry.seasonArtwork&&entry.seasonArtwork[String(season)]||'';
    return entry.episodeArtwork&&entry.episodeArtwork[String(season)+'-'+String(episode)]||'';
  }
  function proMediaPickerOpen(kind,catalogId,season,episode){
    var p=state.proMediaArtworkPicker;
    return !!(p&&p.kind===kind&&p.catalogId===catalogId&&Number(p.season)===Number(season)&&Number(p.episode||0)===Number(episode||0));
  }
  function proMediaArtworkPickerHtml(entry,cat,kind,season,episode,defaultPath){
    if(!proMediaPickerOpen(kind,cat.id,season,episode))return '';
    var key=proMediaArtworkKey(kind,cat.id,season,episode),rows=state.proMediaArtworkOptions[key]||[],loading=!!state.proMediaArtworkLoading[key],selected=proMediaSelectedPath(entry,kind,season,episode);
    var html='<div class="pro-media-art-picker"><div class="pro-media-art-picker-head"><div><strong>Escolher arte Pro</strong><small>'+(kind==='season'?'Capas alternativas para esta temporada.':'Stills alternativos para este episódio.')+'</small></div><button class="top5-mini-btn" data-action="close-pro-media-art">✕</button></div>';
    if(loading&&!rows.length)html+='<div class="pro-media-art-loading">Buscando imagens oficiais da TMDB…</div>';
    if(rows.length){
      html+='<div class="pro-media-art-grid">';
      rows.forEach(function(item){
        var url=tmdbImageUrl(item.path,kind==='season'?'w342':'w500');
        html+='<button class="pro-media-art-option '+(selected===item.path?'selected':'')+'" data-action="select-pro-media-art" data-kind="'+kind+'" data-catalog="'+escapeHtml(cat.id)+'" data-season="'+season+'" data-episode="'+(episode||'')+'" data-path="'+escapeHtml(item.path)+'" style="background-image:url(\''+url.replace(/'/g,'%27')+'\');"><span>'+(item.path===defaultPath?'Padrão':'Alternativa')+'</span></button>';
      });
      html+='</div>';
    }else if(!loading)html+='<div class="pro-media-art-loading">Nenhuma arte alternativa disponível para este item.</div>';
    html+='<button class="btn btn-ghost btn-sm" data-action="reset-pro-media-art" data-kind="'+kind+'" data-catalog="'+escapeHtml(cat.id)+'" data-season="'+season+'" data-episode="'+(episode||'')+'">Usar arte padrão</button></div>';
    return html;
  }
  function proSeasonArtworkControlHtml(entry,cat,season){
    if(!hasPro())return '';
    var selected=proMediaSelectedPath(entry,'season',season,0),fallback=proSeasonDefaultArtwork(cat,season),path=selected||fallback,url=path?tmdbImageUrl(path,'w342'):'';
    return '<div class="pro-season-art-control">'+
      (url?'<div class="pro-season-art-thumb" style="background-image:url(\''+url.replace(/'/g,'%27')+'\')"></div>':'')+
      '<button class="btn btn-ghost btn-sm" data-action="open-pro-media-art" data-kind="season" data-catalog="'+escapeHtml(cat.id)+'" data-season="'+season+'">'+(selected?'Trocar capa':'Escolher capa')+'</button>'+
      proMediaArtworkPickerHtml(entry,cat,'season',season,0,fallback)+
    '</div>';
  }
  function proEpisodeArtworkControlHtml(entry,cat,season,episode,meta){
    if(!hasPro())return '';
    var selected=proMediaSelectedPath(entry,'episode',season,episode),fallback=proEpisodeDefaultArtwork(cat,season,episode,meta),path=selected||fallback,url=path?tmdbImageUrl(path,'w500'):'';
    return '<div class="pro-episode-art-control">'+
      (url?'<div class="pro-episode-art-preview" style="background-image:url(\''+url.replace(/'/g,'%27')+'\')"></div>':'')+
      '<div class="pro-episode-art-actions"><span>'+(selected?'Arte personalizada':'Arte do episódio')+'</span><button class="btn btn-ghost btn-sm" data-action="open-pro-media-art" data-kind="episode" data-catalog="'+escapeHtml(cat.id)+'" data-season="'+season+'" data-episode="'+episode+'">'+(selected?'Trocar arte':'Escolher arte')+'</button></div>'+
      proMediaArtworkPickerHtml(entry,cat,'episode',season,episode,fallback)+
    '</div>';
  }
  function proDiaryArtworkHtml(diary,cat){
    if(!diary||diary.type!=='episode')return '';
    var entry=getEntry(diary.catalogId);if(!entry)return '';
    var path=proMediaSelectedPath(entry,'episode',diary.season,diary.episode)||proMediaSelectedPath(entry,'season',diary.season,0);
    if(!path)return '';
    var url=tmdbImageUrl(path,'w500');
    return '<div class="cal-pro-art" style="background-image:url(\''+url.replace(/'/g,'%27')+'\')"><span>✦</span></div>';
  }
  async function loadProMediaArtworkOptions(cat,kind,season,episode){
    if(!cat||!hasPro()||!tmdbConfigured())return;
    var key=proMediaArtworkKey(kind,cat.id,season,episode);
    if(state.proMediaArtworkOptions[key]||state.proMediaArtworkLoading[key])return;
    state.proMediaArtworkLoading[key]=true;
    try{
      await loadTmdbSeries(cat);
      var cacheKey='pro-media-art:'+kind+':'+cat.tmdbId+':'+season+':'+(episode||0),data=tmdbCacheGet(cacheKey,86400000);
      if(!data){
        var path=kind==='season'?('/tv/'+cat.tmdbId+'/season/'+season+'/images'):('/tv/'+cat.tmdbId+'/season/'+season+'/episode/'+episode+'/images');
        data=await tmdbFetch(path,{include_image_language:'null,en,pt-BR'});
        tmdbCacheSet(cacheKey,data);
      }
      var raw=kind==='season'?(data.posters||[]):((data.stills||data.backdrops)||[]);
      var defaultPath=kind==='season'?proSeasonDefaultArtwork(cat,season):proEpisodeDefaultArtwork(cat,season,episode);
      var seen={},rows=[];
      function add(path,w,h,votes){
        if(!path||seen[path])return;seen[path]=1;rows.push({path:path,width:Number(w||0),height:Number(h||0),votes:Number(votes||0)});
      }
      add(defaultPath,0,0,999);
      raw.slice().sort(function(a,b){return Number(b.vote_average||0)-Number(a.vote_average||0)||Number(b.vote_count||0)-Number(a.vote_count||0);}).forEach(function(x){add(x.file_path,x.width,x.height,x.vote_count);});
      state.proMediaArtworkOptions[key]=rows.slice(0,16);
    }catch(e){
      console.warn('Não foi possível carregar artes Pro:',e);
      state.proMediaArtworkOptions[key]=[];
    }finally{
      state.proMediaArtworkLoading[key]=false;
      if(proMediaPickerOpen(kind,cat.id,season,episode)&&state.modalCatalogId===cat.id)renderModalPreserveScroll();
    }
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
    if(action==='open-pro-media-art'){
      if(!hasPro()){openProView('artes-temporadas-episodios');return true;}
      var kind=String(el.dataset.kind||''),cat=getCatalog(el.dataset.catalog),season=Number(el.dataset.season)||0,episode=Number(el.dataset.episode)||0;
      if(!cat||!season||(kind!=='season'&&kind!=='episode'))return true;
      state.proMediaArtworkPicker={kind:kind,catalogId:cat.id,season:season,episode:episode};
      renderModalPreserveScroll();
      loadProMediaArtworkOptions(cat,kind,season,episode);
      return true;
    }
    if(action==='close-pro-media-art'){state.proMediaArtworkPicker=null;renderModalPreserveScroll();return true;}
    if(action==='select-pro-media-art'||action==='reset-pro-media-art'){
      if(!hasPro())return true;
      var artKind=String(el.dataset.kind||''),artCatId=String(el.dataset.catalog||''),artSeason=Number(el.dataset.season)||0,artEpisode=Number(el.dataset.episode)||0,artEntry=getEntry(artCatId);
      if(!artEntry)return true;
      artEntry.seasonArtwork=artEntry.seasonArtwork&&typeof artEntry.seasonArtwork==='object'?artEntry.seasonArtwork:{};
      artEntry.episodeArtwork=artEntry.episodeArtwork&&typeof artEntry.episodeArtwork==='object'?artEntry.episodeArtwork:{};
      var artPath=action==='reset-pro-media-art'?'':String(el.dataset.path||''),artKey=proMediaArtworkKey(artKind,artCatId,artSeason,artEpisode);
      if(artPath&&!(state.proMediaArtworkOptions[artKey]||[]).some(function(x){return x.path===artPath;}))return true;
      if(artKind==='season'){
        if(artPath)artEntry.seasonArtwork[String(artSeason)]=artPath;else delete artEntry.seasonArtwork[String(artSeason)];
      }else{
        var epArtKey=String(artSeason)+'-'+String(artEpisode);
        if(artPath)artEntry.episodeArtwork[epArtKey]=artPath;else delete artEntry.episodeArtwork[epArtKey];
      }
      artEntry.dateUpdated=new Date().toISOString();state.proMediaArtworkPicker=null;
      saveData();syncEntryToSupabase(artEntry);renderMainViewOnly();renderModalPreserveScroll();return true;
    }
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
