/* ---------------- reviews v2: resenhas + Editals ---------------- */
  state.reviewComposerModes=state.reviewComposerModes||{};
  state.reviewDrafts=state.reviewDrafts||{};
  state.reviewSpoilerDrafts=state.reviewSpoilerDrafts||{};
  state.editalDrafts=state.editalDrafts||{};
  state.reviewSaveNotice=state.reviewSaveNotice||{};
  state.editalArtworkOptions=state.editalArtworkOptions||{};
  state.editalArtworkLoading=state.editalArtworkLoading||{};
  state.editalComments=state.editalComments||{};
  state.editalCommentsOpen=state.editalCommentsOpen||{};
  state.editalCommentLoading=state.editalCommentLoading||{};

  function reviewComposerMode(catalogId){
    return hasPro()&&state.reviewComposerModes[catalogId]==='edital'?'edital':'review';
  }
  function normalizeEdital(value){
    value=value&&typeof value==='object'?value:{};
    var artworkType=['poster','backdrop'].indexOf(value.artworkType||value.artwork_type)>-1?(value.artworkType||value.artwork_type):
      ((value.background==='poster')?'poster':'backdrop');
    var visibility=(value.visibility==='followers'||value.visibility==='private')?'followers':'public';
    return {
      enabled:true,
      title:String(value.title||'').slice(0,100),
      lead:String(value.lead||value.quote||'').slice(0,320),
      positive:String(value.positive||value.section1Body||value.section_1_body||'').slice(0,1800),
      negative:String(value.negative||value.section2Body||value.section_2_body||'').slice(0,1800),
      conclusion:String(value.conclusion||'').slice(0,1200),
      artworkType:artworkType,
      artworkPath:String(value.artworkPath||value.artwork_path||'').slice(0,500),
      visibility:visibility
    };
  }
  function editalHasContent(value){
    var e=normalizeEdital(value);
    return !!(e.title.trim()&&(e.lead.trim()||e.positive.trim()||e.negative.trim()||e.conclusion.trim()));
  }
  function reviewSpoilerDraft(entry){
    var cid=entry&&entry.catalogId||'';
    var saved=state.reviewSpoilerDrafts[cid];
    if(saved)return saved;
    return {
      level:entry&&entry.spoilerLevel||'none',
      season:entry&&entry.spoilerSeason||null,
      episode:entry&&entry.spoilerEpisode||null
    };
  }
  function captureReviewComposerDraft(catalogId){
    var entry=getEntry(catalogId),mode=reviewComposerMode(catalogId);
    var sl=document.getElementById('spoilerLevel'),ss=document.getElementById('spoilerSeason'),se=document.getElementById('spoilerEpisode');
    state.reviewSpoilerDrafts[catalogId]={
      level:sl?sl.value:(entry&&entry.spoilerLevel||'none'),
      season:sl&&sl.value==='episode'&&ss&&ss.value?Number(ss.value):null,
      episode:sl&&sl.value==='episode'&&se&&se.value?Number(se.value):null
    };
    if(mode==='review'){
      var ta=document.getElementById('reviewText');
      if(ta)state.reviewDrafts[catalogId]=String(ta.value||'');
    }else{
      state.editalDrafts[catalogId]=readEditalForm(catalogId);
    }
  }
  function editalDraft(catalogId){
    return normalizeEdital(state.editalDrafts[catalogId]||{visibility:'public',artworkType:'backdrop'});
  }
  function readEditalForm(catalogId){
    var previous=editalDraft(catalogId);
    function val(id){var el=document.getElementById(id);return el?String(el.value||''):'';}
    var vis=document.getElementById('editalVisibility');
    return normalizeEdital({
      title:val('editalTitle'),
      lead:val('editalLead'),
      positive:val('editalPositive'),
      negative:val('editalNegative'),
      conclusion:val('editalConclusion'),
      artworkType:previous.artworkType,
      artworkPath:previous.artworkPath,
      visibility:vis?vis.value:previous.visibility
    });
  }
  function editalDefaultPath(cat,type){
    if(!cat)return '';
    return type==='poster'?(cat.poster_path||(cat.tmdbData&&cat.tmdbData.poster_path)||''):(cat.backdrop_path||(cat.tmdbData&&cat.tmdbData.backdrop_path)||'');
  }
  function editalArtUrl(value,cat){
    var e=normalizeEdital(value),path=e.artworkPath||editalDefaultPath(cat,e.artworkType);
    if(!path)return '';
    if(/^https?:\/\//i.test(path))return path;
    return tmdbImageUrl(path,e.artworkType==='poster'?'w500':'w1280');
  }
  async function loadEditalArtworkOptions(cat){
    if(!cat||!hasPro()||!tmdbConfigured())return;
    if(state.editalArtworkOptions[cat.id]||state.editalArtworkLoading[cat.id])return;
    state.editalArtworkLoading[cat.id]=true;
    if(state.modalCatalogId===cat.id)renderModalPreserveScroll();
    try{
      await loadTmdbSeries(cat);
      var key='edital-art-v1:'+cat.tmdbId,data=tmdbCacheGet(key,604800000);
      if(!data){
        data=await tmdbFetch('/tv/'+cat.tmdbId+'/images',{include_image_language:'pt,en,null'});
        tmdbCacheSet(key,data);
      }
      function rows(type,list,defaultPath){
        var seen={},out=[];
        function add(path,votes){if(!path||seen[path])return;seen[path]=1;out.push({path:path,votes:Number(votes||0),isDefault:path===defaultPath});}
        add(defaultPath,9999);
        (list||[]).slice().sort(function(a,b){return Number(b.vote_average||0)-Number(a.vote_average||0)||Number(b.vote_count||0)-Number(a.vote_count||0);}).forEach(function(x){add(x.file_path,x.vote_count);});
        return out.slice(0,18);
      }
      state.editalArtworkOptions[cat.id]={
        poster:rows('poster',data.posters,editalDefaultPath(cat,'poster')),
        backdrop:rows('backdrop',data.backdrops,editalDefaultPath(cat,'backdrop'))
      };
    }catch(e){
      console.warn('Não foi possível carregar artes do Edital:',e);
      state.editalArtworkOptions[cat.id]={poster:[],backdrop:[]};
    }finally{
      state.editalArtworkLoading[cat.id]=false;
      if(state.modalCatalogId===cat.id&&reviewComposerMode(cat.id)==='edital')renderModalPreserveScroll();
    }
  }
  function editalArtworkPickerHtml(cat,draft){
    draft=normalizeEdital(draft);
    var group=state.editalArtworkOptions[cat.id],loading=!!state.editalArtworkLoading[cat.id];
    var current=draft.artworkPath||editalDefaultPath(cat,draft.artworkType);
    var html='<div class="edital-art-box"><div class="edital-guide-label">Imagem do Edital</div><div class="edital-art-tabs">'+
      '<button type="button" class="edital-art-tab '+(draft.artworkType==='backdrop'?'active':'')+'" data-action="edital-art-type" data-catalog="'+escapeHtml(cat.id)+'" data-type="backdrop">Banner</button>'+
      '<button type="button" class="edital-art-tab '+(draft.artworkType==='poster'?'active':'')+'" data-action="edital-art-type" data-catalog="'+escapeHtml(cat.id)+'" data-type="poster">Pôster</button>'+
      '</div>';
    var preview=editalArtUrl(draft,cat);
    if(preview)html+='<div class="edital-art-preview '+(draft.artworkType==='poster'?'poster':'')+'" style="background-image:url(\''+preview.replace(/'/g,'%27')+'\')"></div>';
    if(loading)html+='<div class="pro-media-art-loading">Buscando artes oficiais da série…</div>';
    else if(!group)html+='<button type="button" class="btn btn-ghost btn-sm" data-action="load-edital-art" data-catalog="'+escapeHtml(cat.id)+'">Escolher outra arte</button>';
    else{
      var rows=group[draft.artworkType]||[];
      html+='<div class="edital-art-grid">'+rows.map(function(x){
        var url=tmdbImageUrl(x.path,draft.artworkType==='poster'?'w342':'w500');
        return '<button type="button" class="edital-art-choice '+(current===x.path?'selected':'')+' '+(draft.artworkType==='poster'?'poster':'')+'" data-action="edital-select-art" data-catalog="'+escapeHtml(cat.id)+'" data-type="'+draft.artworkType+'" data-path="'+escapeHtml(x.path)+'" style="background-image:url(\''+url.replace(/'/g,'%27')+'\')"><span>'+(x.isDefault?'Padrão':'Alternativa')+'</span></button>';
      }).join('')+'</div>';
    }
    return html+'</div>';
  }
  function editalEditorHtml(entry,cat){
    var d=editalDraft(cat.id);
    return '<div class="edital-editor">'+
      '<div class="edital-editor-head"><div><strong>Edital</strong><small>Uma crítica estruturada para praticar argumento, observação e conclusão sem complicar.</small></div><span class="pro-active-chip">✦ PRO</span></div>'+
      '<div class="edital-tip">Escreva como um resenhista: diga sua ideia principal, mostre exemplos do que funcionou e do que poderia melhorar, e termine amarrando sua opinião. Não precisa usar palavras difíceis.</div>'+
      '<div class="edital-editor-grid">'+
        '<label class="edital-wide"><span>Título <em>Qual é a sua ideia central?</em></span><input id="editalTitle" maxlength="100" value="'+escapeHtml(d.title)+'" placeholder="Ex.: Quando a ambição vale mais que a própria família"></label>'+
        '<label class="edital-wide"><span>Abertura <em>Apresente sua leitura em poucas linhas.</em></span><textarea id="editalLead" maxlength="320" placeholder="Comece situando o leitor e diga o que mais chamou sua atenção.">'+escapeHtml(d.lead)+'</textarea></label>'+
        '<label><span>O que funciona <em>Cite decisões, personagens, roteiro, direção ou visual.</em></span><textarea id="editalPositive" maxlength="1800" placeholder="Explique por que esses elementos funcionam e dê exemplos sem apenas dizer que gostou.">'+escapeHtml(d.positive)+'</textarea></label>'+
        '<label><span>O que poderia ser melhor <em>Critique com contexto e proponha uma leitura.</em></span><textarea id="editalNegative" maxlength="1800" placeholder="Aponte problemas ou limitações e explique por que eles pesam na experiência.">'+escapeHtml(d.negative)+'</textarea></label>'+
        '<label class="edital-wide"><span>Conclusão <em>Feche a ideia sem repetir tudo.</em></span><textarea id="editalConclusion" maxlength="1200" placeholder="Resuma o que a série entrega e para quem essa experiência pode funcionar.">'+escapeHtml(d.conclusion)+'</textarea></label>'+
        '<label><span>Quem pode ver</span><select id="editalVisibility"><option value="public" '+(d.visibility==='public'?'selected':'')+'>Público · pode aparecer para fãs da série</option><option value="followers" '+(d.visibility==='followers'?'selected':'')+'>Privado · somente seguidores</option></select></label>'+
      '</div>'+
      editalArtworkPickerHtml(cat,d)+
    '</div>';
  }
  function reviewComposerHtml(entry,cat){
    var mode=reviewComposerMode(cat.id),sp=reviewSpoilerDraft(entry),notice=state.reviewSaveNotice[cat.id]||'';
    var tabs=hasPro()?'<div class="review-mode-tabs"><button type="button" class="'+(mode==='review'?'active':'')+'" data-action="set-review-mode" data-catalog="'+escapeHtml(cat.id)+'" data-mode="review">Resenha</button><button type="button" class="'+(mode==='edital'?'active':'')+'" data-action="set-review-mode" data-catalog="'+escapeHtml(cat.id)+'" data-mode="edital">Edital <span>✦ PRO</span></button></div>':'';
    var editor=mode==='edital'?editalEditorHtml(entry,cat):'<textarea id="reviewText" placeholder="O que você achou?">'+escapeHtml(state.reviewDrafts[cat.id]||'')+'</textarea>';
    return tabs+
      (notice?'<div id="reviewSaveNotice" class="review-save-notice">✓ '+escapeHtml(notice)+'</div>':'')+
      '<div class="spoiler-controls">'+
        '<select id="spoilerLevel"><option value="none" '+(sp.level==='none'?'selected':'')+'>Sem spoilers</option><option value="episode" '+(sp.level==='episode'?'selected':'')+'>Spoilers até episódio</option><option value="full" '+(sp.level==='full'?'selected':'')+'>Série completa</option></select>'+
        '<input id="spoilerSeason" type="number" min="1" placeholder="Temp." value="'+(sp.season||'')+'" '+(sp.level==='episode'?'':'disabled')+'>'+
        '<input id="spoilerEpisode" type="number" min="1" placeholder="Ep." value="'+(sp.episode||'')+'" '+(sp.level==='episode'?'':'disabled')+'>'+
      '</div>'+
      editor+
      '<div style="margin-top:8px;" class="inline-actions">'+
        '<button class="btn btn-primary btn-sm" data-action="save-review" data-catalog="'+escapeHtml(cat.id)+'">'+(mode==='edital'?'Publicar Edital':'Salvar resenha')+'</button>'+
        '<button class="btn btn-ghost btn-sm" data-action="log-today" data-catalog="'+escapeHtml(cat.id)+'">Registrar hoje no diário</button>'+
      '</div>';
  }
  function editalLegacyShape(value){
    var e=normalizeEdital(value);
    return {
      enabled:true,title:e.title,layout:'editorial',background:e.artworkType,
      quote:e.lead,section1Title:'O que funciona',section1Body:e.positive,
      section2Title:'O que poderia ser melhor',section2Body:e.negative,
      conclusion:e.conclusion,artworkPath:e.artworkPath,visibility:e.visibility
    };
  }
  async function saveReviewPostFromComposer(entry){
    if(!entry||!currentUserId)throw new Error('Não foi possível identificar a sua conta.');
    var cid=entry.catalogId,cat=getCatalog(cid),mode=reviewComposerMode(cid);
    captureReviewComposerDraft(cid);
    var sp=reviewSpoilerDraft(entry),text=String(state.reviewDrafts[cid]||'').trim(),edital=editalDraft(cid);
    if(mode==='review'&&!text)throw new Error('Escreva sua resenha antes de salvar.');
    if(mode==='edital'&&!hasPro())throw new Error('Editals são exclusivos do Bingeo Pro.');
    if(mode==='edital'&&!editalHasContent(edital))throw new Error('Dê um título ao Edital e desenvolva pelo menos uma parte da crítica.');
    var row={
      user_id:currentUserId,
      catalog_id:cid,
      tmdb_id:cat&&cat.tmdbId?Number(cat.tmdbId):null,
      title:cat&&cat.title?cat.title:cid,
      genre:cat&&cat.genre||'Série',
      poster_path:cat&&cat.poster_path||null,
      backdrop_path:cat&&cat.backdrop_path||null,
      review_type:mode,
      review_text:mode==='review'?text:'',
      edital:mode==='edital'?edital:{},
      visibility:mode==='edital'?edital.visibility:'public',
      rating:entry.rating==null?null:Number(entry.rating),
      criteria_ratings:entry.criteriaRatings||{},
      badges:Array.isArray(entry.badges)?entry.badges:[],
      spoiler_level:sp.level||'none',
      spoiler_season:sp.level==='episode'?sp.season:null,
      spoiler_episode:sp.level==='episode'?sp.episode:null,
      comments_enabled:mode==='edital'
    };
    var result=await supabaseClient.from('review_posts').insert(row).select('id').single();
    if(result.error)throw result.error;

    entry.spoilerLevel=row.spoiler_level;
    entry.spoilerSeason=row.spoiler_season;
    entry.spoilerEpisode=row.spoiler_episode;
    if(mode==='review')entry.review=text;
    else entry.proReview=normalizeProReview({});
    entry.dateUpdated=new Date().toISOString();
    saveData();syncEntryToSupabase(entry);
    bumpTrending(cid,'review');

    state.reviewDrafts[cid]='';
    state.editalDrafts[cid]=normalizeEdital({visibility:edital.visibility,artworkType:edital.artworkType});
    state.reviewSpoilerDrafts[cid]={level:'none',season:null,episode:null};
    state.reviewSaveNotice[cid]=mode==='edital'?'Edital publicado. Você já pode escrever outro.':'Resenha salva. Você já pode escrever outra.';
    await loadSeriesCommunity(cid,false);
    if(mode==='edital')loadMyEditals().catch(function(){});
    return {id:result.data&&result.data.id,mode:mode};
  }
  function clearReviewSaveNoticeLater(catalogId){
    setTimeout(function(){
      delete state.reviewSaveNotice[catalogId];
      var el=document.getElementById('reviewSaveNotice');
      if(el)el.remove();
    },3400);
  }
  function rerenderEditalSurfaces(){
    if(appBooted)renderMainViewOnly();
    if(state.modalCatalogId)renderModalPreserveScroll();
  }
  function updateEditalEngagementState(reviewId,patch){
    reviewId=Number(reviewId)||0;if(!reviewId)return;
    function apply(target){
      if(!target||Number(target.review_id)!==reviewId)return;
      Object.keys(patch||{}).forEach(function(k){target[k]=patch[k];});
    }
    (state.socialFeed||[]).forEach(function(item){
      var payload=item&&item.payload||{};
      if(Number(payload.review_id)===reviewId)Object.keys(patch||{}).forEach(function(k){payload[k]=patch[k];});
    });
    Object.keys(state.seriesCommunity||{}).forEach(function(cid){
      var data=state.seriesCommunity[cid]||{};
      (data.editals||[]).forEach(apply);
    });
    (state.myEditals||[]).forEach(apply);
  }
  function editalCommentsPanelHtml(reviewId){
    reviewId=Number(reviewId)||0;if(!reviewId||!state.editalCommentsOpen[reviewId])return '';
    var rows=state.editalComments[reviewId]||[],loading=!!state.editalCommentLoading[reviewId];
    return '<div class="edital-comments-panel">'+
      (loading?'<div class="edital-comment-empty">Carregando comentários…</div>':
        (rows.length?rows.map(function(c){
          return '<div class="edital-comment-row"><strong>@'+escapeHtml(c.username||'usuário')+'</strong><span>'+escapeHtml(c.body||'')+'</span></div>';
        }).join(''):'<div class="edital-comment-empty">Seja a primeira pessoa a comentar.</div>'))+
      '<div class="edital-comment-form"><input id="editalCommentInput-'+reviewId+'" maxlength="1200" placeholder="Escreva um comentário…"><button class="btn btn-primary btn-sm" data-action="add-edital-comment" data-review-id="'+reviewId+'">Comentar</button></div>'+
    '</div>';
  }
  function editalActionRailHtml(review){
    var reviewId=Number(review&&review.review_id)||0;if(!reviewId)return '';
    var comments=Number(review.comment_count||0),likes=Number(review.like_count||0),reposts=Number(review.repost_count||0);
    var liked=!!review.liked_by_me,reposted=!!review.reposted_by_me,isOwn=!!review.is_own;
    var publicPost=(review.visibility||'public')==='public';
    return '<aside class="edital-action-rail" aria-label="Interações do Edital">'+
      '<button class="edital-rail-action '+(liked?'active':'')+'" data-action="toggle-edital-like" data-review-id="'+reviewId+'" title="'+(liked?'Remover curtida':'Curtir')+'"><span class="edital-rail-icon">'+(liked?'♥':'♡')+'</span><b>'+likes+'</b><small>Curtir</small></button>'+
      '<button class="edital-rail-action '+(state.editalCommentsOpen[reviewId]?'active':'')+'" data-action="toggle-edital-comments" data-review-id="'+reviewId+'" title="Comentários"><span class="edital-rail-icon">◌</span><b>'+comments+'</b><small>Comentar</small></button>'+
      '<button class="edital-rail-action '+(reposted?'active':'')+'" data-action="toggle-edital-repost" data-review-id="'+reviewId+'" '+((!publicPost||isOwn)?'disabled':'')+' title="'+(isOwn?'Seu próprio Edital':(!publicPost?'Somente Editals públicos podem ser republicados':(reposted?'Desfazer republicação':'Republicar')))+'"><span class="edital-rail-icon">↻</span><b>'+reposts+'</b><small>Republicar</small></button>'+
      '<span class="edital-rail-visibility">'+((review.visibility||'public')==='followers'?'Seguidores':'Público')+'</span>'+
    '</aside>';
  }
  function editalCardHtml(review,catalogId,top,tags,spoiler,withComments){
    var e=normalizeEdital(review&&review.edital||review&&review.pro_review||{}),cat=getCatalog(catalogId),art=editalArtUrl(e,cat),style=art?'background-image:url(\''+art.replace(/'/g,'%27')+'\');':'';
    var reviewId=Number(review&&review.review_id)||0;
    return '<article class="community-review pro-review-card edital-card layout-editorial art-'+e.artworkType+(art?' has-art':'')+'" style="'+style+'">'+
      '<div class="pro-review-shade"></div>'+
      '<div class="edital-card-layout"><div class="pro-review-inner">'+top+
        '<div class="pro-review-spoiler-label">'+escapeHtml(spoiler||'Sem spoilers')+'</div>'+
        '<h3>'+escapeHtml(e.title||cat&&cat.title||'Edital')+'</h3>'+
        (e.lead?'<div class="edital-lead">'+escapeHtml(e.lead)+'</div>':'')+
        (e.positive?'<section class="pro-review-section"><h4>O que funciona</h4><p>'+escapeHtml(e.positive)+'</p></section>':'')+
        (e.negative?'<section class="pro-review-section"><h4>O que poderia ser melhor</h4><p>'+escapeHtml(e.negative)+'</p></section>':'')+
        (e.conclusion?'<section class="pro-review-section edital-conclusion"><h4>Conclusão</h4><p>'+escapeHtml(e.conclusion)+'</p></section>':'')+
        tags+
      '</div>'+editalActionRailHtml(review)+'</div>'+
      (reviewId?editalCommentsPanelHtml(reviewId):'')+
    '</article>';
  }
  async function loadEditalComments(reviewId){
    reviewId=Number(reviewId)||0;if(!reviewId)return;
    state.editalCommentLoading[reviewId]=true;rerenderEditalSurfaces();
    try{
      var r=await supabaseClient.rpc('get_edital_comments',{p_review_id:reviewId});
      if(r.error)throw r.error;
      state.editalComments[reviewId]=Array.isArray(r.data)?r.data:[];
    }finally{
      state.editalCommentLoading[reviewId]=false;
      rerenderEditalSurfaces();
    }
  }
  async function addEditalComment(reviewId,body){
    reviewId=Number(reviewId)||0;body=String(body||'').trim();
    if(!reviewId||!body)return;
    var r=await supabaseClient.rpc('add_edital_comment',{p_review_id:reviewId,p_body:body});
    if(r.error)throw r.error;
    updateEditalEngagementState(reviewId,{comment_count:(function(){
      var count=0;
      (state.socialFeed||[]).some(function(item){var p=item&&item.payload||{};if(Number(p.review_id)===reviewId){count=Number(p.comment_count||0);return true;}return false;});
      return count+1;
    })()});
    await loadEditalComments(reviewId);
  }
  async function toggleEditalLike(reviewId){
    reviewId=Number(reviewId)||0;if(!reviewId)return;
    var r=await supabaseClient.rpc('toggle_edital_like',{p_review_id:reviewId});
    if(r.error)throw r.error;
    updateEditalEngagementState(reviewId,{liked_by_me:!!r.data.liked,like_count:Number(r.data.like_count||0)});
    rerenderEditalSurfaces();
  }
  async function toggleEditalRepost(reviewId){
    reviewId=Number(reviewId)||0;if(!reviewId)return;
    var r=await supabaseClient.rpc('toggle_edital_repost',{p_review_id:reviewId});
    if(r.error)throw r.error;
    updateEditalEngagementState(reviewId,{reposted_by_me:!!r.data.reposted,repost_count:Number(r.data.repost_count||0)});
    await loadFollowingFeed();
    rerenderEditalSurfaces();
  }
  async function loadMyEditals(){
    if(!currentUserId||!hasPro()){state.myEditals=[];state.myEditalsLoading=false;return [];}
    state.myEditalsLoading=true;state.myEditalsError='';
    if(appBooted&&state.view==='editar-perfil')renderMainViewOnly();
    try{
      var r=await supabaseClient.rpc('get_my_editals');
      if(r.error)throw r.error;
      state.myEditals=Array.isArray(r.data)?r.data:[];
      return state.myEditals;
    }catch(e){
      state.myEditalsError=e.message||'Não foi possível carregar seus Editals.';
      return [];
    }finally{
      state.myEditalsLoading=false;
      if(appBooted&&state.view==='editar-perfil')renderMainViewOnly();
    }
  }
  function editalManagementHtml(){
    if(!hasPro())return '';
    var rows=state.myEditals||[];
    var body='';
    if(state.myEditalsLoading)body='<div class="edital-manager-empty">Carregando seus Editals…</div>';
    else if(state.myEditalsError)body='<div class="edital-manager-empty">'+escapeHtml(state.myEditalsError)+'</div>';
    else if(!rows.length)body='<div class="edital-manager-empty">Você ainda não publicou nenhum Edital.</div>';
    else body='<div class="edital-manager-list">'+rows.map(function(item){
      var e=normalizeEdital(item.edital||{}),archived=!!item.is_archived,visibility=item.visibility==='followers'?'followers':'public';
      var poster=item.poster_path?tmdbImageUrl(item.poster_path,'w185'):'';
      return '<article class="edital-manager-row '+(archived?'archived':'')+'">'+
        '<div class="edital-manager-poster" style="'+(poster?'background-image:url(\''+poster.replace(/'/g,'%27')+'\')':'')+'"></div>'+
        '<div class="edital-manager-copy"><strong>'+escapeHtml(e.title||item.title||'Edital')+'</strong><span>'+escapeHtml(item.title||'Série')+'</span>'+
          '<div class="edital-manager-meta"><span>'+Number(item.like_count||0)+' curtidas</span><span>'+Number(item.comment_count||0)+' comentários</span><span>'+Number(item.repost_count||0)+' republicações</span></div>'+
        '</div>'+
        '<div class="edital-manager-controls">'+
          '<button class="btn btn-ghost btn-sm" data-action="edital-manage-visibility" data-review-id="'+Number(item.review_id)+'" data-current="'+visibility+'">'+(visibility==='public'?'◉ Público':'◌ Seguidores')+'</button>'+
          '<button class="btn btn-ghost btn-sm" data-action="'+(archived?'edital-unarchive':'edital-archive')+'" data-review-id="'+Number(item.review_id)+'">'+(archived?'Desarquivar':'Arquivar')+'</button>'+
          '<button class="btn btn-danger btn-sm" data-action="edital-delete" data-review-id="'+Number(item.review_id)+'">Excluir</button>'+
        '</div>'+
      '</article>';
    }).join('')+'</div>';
    return '<div class="profile-edit-section edital-manager"><div class="edital-manager-head"><div><h3>Controle dos Editals <span class="pro-badge">✦ PRO</span></h3><p>Gerencie visibilidade, arquivamento e exclusão das suas críticas.</p></div><button class="btn btn-primary btn-sm" data-action="edital-create-new">Criar Edital</button></div>'+body+'</div>';
  }
  async function manageMyEdital(reviewId,action,visibility){
    var r=await supabaseClient.rpc('manage_my_edital',{p_review_id:Number(reviewId),p_action:action,p_visibility:visibility||null});
    if(r.error)throw r.error;
    state.seriesCommunity={};
    await loadMyEditals();
  }

  function handleEditalAction(action,el){
    var cid=String(el.dataset.catalog||state.modalCatalogId||'');
    if(action==='set-review-mode'){
      if(!cid)return true;
      captureReviewComposerDraft(cid);
      var next=el.dataset.mode==='edital'?'edital':'review';
      if(next==='edital'&&!hasPro()){openProView('editals');return true;}
      state.reviewComposerModes[cid]=next;
      renderModalPreserveScroll();
      if(next==='edital'){var cat=getCatalog(cid);if(cat)loadEditalArtworkOptions(cat);}
      return true;
    }
    if(action==='load-edital-art'){
      if(!hasPro())return true;
      captureReviewComposerDraft(cid);var cat=getCatalog(cid);if(cat)loadEditalArtworkOptions(cat);return true;
    }
    if(action==='edital-art-type'){
      if(!hasPro()||!cid)return true;
      captureReviewComposerDraft(cid);
      var d=editalDraft(cid);d.artworkType=el.dataset.type==='poster'?'poster':'backdrop';d.artworkPath='';state.editalDrafts[cid]=d;
      renderModalPreserveScroll();var c=getCatalog(cid);if(c)loadEditalArtworkOptions(c);return true;
    }
    if(action==='edital-select-art'){
      if(!hasPro()||!cid)return true;
      captureReviewComposerDraft(cid);
      var draft=editalDraft(cid),type=el.dataset.type==='poster'?'poster':'backdrop',path=String(el.dataset.path||''),group=state.editalArtworkOptions[cid]&&state.editalArtworkOptions[cid][type]||[];
      if(path&&!group.some(function(x){return x.path===path;}))return true;
      draft.artworkType=type;draft.artworkPath=path;state.editalDrafts[cid]=draft;renderModalPreserveScroll();return true;
    }
    if(action==='toggle-edital-comments'){
      var rid=Number(el.dataset.reviewId)||0;if(!rid)return true;
      state.editalCommentsOpen[rid]=!state.editalCommentsOpen[rid];
      renderMainViewOnly();
      if(state.editalCommentsOpen[rid]&&!state.editalComments[rid])loadEditalComments(rid).catch(function(e){console.error(e);});
      return true;
    }
    if(action==='add-edital-comment'){
      var reviewId=Number(el.dataset.reviewId)||0,input=document.getElementById('editalCommentInput-'+reviewId);
      if(!reviewId||!input||!input.value.trim())return true;
      el.disabled=true;
      addEditalComment(reviewId,input.value).catch(function(e){alert(e.message||'Não foi possível comentar.');}).finally(function(){el.disabled=false;});
      return true;
    }
    if(action==='toggle-edital-like'){
      var likeId=Number(el.dataset.reviewId)||0;if(!likeId)return true;
      el.disabled=true;toggleEditalLike(likeId).catch(function(e){alert(e.message||'Não foi possível curtir.');}).finally(function(){el.disabled=false;});
      return true;
    }
    if(action==='toggle-edital-repost'){
      var repostId=Number(el.dataset.reviewId)||0;if(!repostId)return true;
      el.disabled=true;toggleEditalRepost(repostId).catch(function(e){alert(e.message||'Não foi possível republicar.');}).finally(function(){el.disabled=false;});
      return true;
    }
    if(action==='edital-create-new'){
      state.view='descobrir';state.query='';render();
      setTimeout(function(){var input=document.getElementById('searchInput');if(input){input.focus();input.placeholder='Busque a série para criar seu Edital…';}},0);
      return true;
    }
    if(action==='edital-manage-visibility'){
      var visId=Number(el.dataset.reviewId)||0,nextVis=el.dataset.current==='public'?'followers':'public';
      el.disabled=true;manageMyEdital(visId,'visibility',nextVis).catch(function(e){alert(e.message||'Não foi possível alterar a visibilidade.');}).finally(function(){el.disabled=false;});
      return true;
    }
    if(action==='edital-archive'||action==='edital-unarchive'){
      var archiveId=Number(el.dataset.reviewId)||0;
      el.disabled=true;manageMyEdital(archiveId,action==='edital-archive'?'archive':'unarchive').catch(function(e){alert(e.message||'Não foi possível atualizar o Edital.');}).finally(function(){el.disabled=false;});
      return true;
    }
    if(action==='edital-delete'){
      var deleteId=Number(el.dataset.reviewId)||0;if(!deleteId)return true;
      if(!confirm('Excluir este Edital permanentemente? Curtidas, comentários e republicações ligados a ele também serão removidos.'))return true;
      el.disabled=true;manageMyEdital(deleteId,'delete').catch(function(e){alert(e.message||'Não foi possível excluir o Edital.');}).finally(function(){el.disabled=false;});
      return true;
    }
    return false;
  }
