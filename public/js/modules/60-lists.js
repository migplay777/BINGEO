/* ---------------- view: listas ---------------- */
  function ownedListsCount(){
    return state.lists.filter(function(list){
      return list&&(list.ownerUserId?list.ownerUserId===currentUserId:list.isOwner!==false);
    }).length;
  }
  function canCreateList(){
    return hasPro()||ownedListsCount()<10;
  }
  function listShareUrl(list){
    if(!list||!list.shareSlug)return '';
    var base=(window.location.origin||'https://bingeo.onrender.com').replace(/\/$/,'');
    return base+'/?lista='+encodeURIComponent(list.shareSlug);
  }
  function sharedListTargetSlug(){
    try{return new URL(window.location.href).searchParams.get('lista')||'';}catch(e){return '';}
  }
  function clearSharedListTarget(){
    try{
      var url=new URL(window.location.href);
      if(!url.searchParams.has('lista'))return;
      url.searchParams.delete('lista');
      history.replaceState(null,'',url.pathname+(url.searchParams.toString()?('?'+url.searchParams.toString()):'')+url.hash);
    }catch(e){}
  }
  async function loadPublicSharedList(shareSlug){
    shareSlug=String(shareSlug||'').trim();
    if(!shareSlug)return null;

    var local=state.lists.find(function(list){return list&&list.shareSlug===shareSlug;});
    if(local)return local;

    var result=await supabaseClient.rpc('get_public_list',{p_share_slug:shareSlug});
    if(result.error)throw result.error;
    var data=result.data;
    if(!data)return null;

    var items=Array.isArray(data.items)?data.items:[];
    var showIds=items.map(function(item){
      var cid=item.catalog_id||((item.tmdb_id!=null)?('tmdb-'+item.tmdb_id):null);
      if(!cid)return null;
      if(!getCatalog(cid)){
        CATALOG.push({
          id:cid,tmdbId:item.tmdb_id||null,title:item.title||'Série',type:'serie',genre:'Série',
          year:null,platform:'',seasons:[],poster_path:item.poster_path||null,
          backdrop_path:item.backdrop_path||null,tmdbSource:true
        });
      }
      return cid;
    }).filter(Boolean);

    var mapped={
      id:data.client_id||('shared-'+shareSlug),
      name:data.name||'Lista',
      description:data.description||'',
      showIds:showIds,
      owner:data.owner||'Usuário Bingeo',
      ownerUserId:null,
      isOwner:false,
      isCollaborator:false,
      isSharedPublic:true,
      visibility:'public',
      coverUrl:data.cover_url||null,
      shareSlug:data.share_slug||shareSlug,
      allowComments:data.allow_comments!==false,
      proSettings:normalizeListProSettings(data.pro_settings),
      collaborators:(Array.isArray(data.collaborators)?data.collaborators:[]).map(function(username){return {username:username};}),
      comments:Array.isArray(data.comments)?data.comments:[],
      createdAt:'',
      updatedAt:''
    };
    state.lists.push(mapped);
    return mapped;
  }
  async function openSharedListTarget(){
    var slug=sharedListTargetSlug();
    if(!slug||!currentUserId)return false;
    clearSharedListTarget();
    try{
      var list=await loadPublicSharedList(slug);
      if(!list){alert('Esta lista não existe ou não está pública.');return false;}
      state.query='';
      state.modalCatalogId=null;
      state.professionalOpen=null;state.professionalData=null;
      state.characterOpen=null;state.characterData=null;
      state.userProfileOpen=null;state.userProfileData=null;
      state.listCreateOpen=false;
      state.listOpen=list.id;
      state.view='listas';
      render();
      return true;
    }catch(e){
      console.error('Erro ao abrir lista compartilhada:',e);
      alert('Não foi possível abrir esta lista compartilhada.');
      return false;
    }
  }
  async function shareBingeoList(list){
    if(!list)return;
    var isOwner=list.ownerUserId?list.ownerUserId===currentUserId:list.isOwner!==false;

    if(isOwner&&list.visibility!=='public'){
      if(!confirm('Para compartilhar a lista por link ela precisa ser pública. Tornar esta lista pública agora?'))return;
      list.visibility='public';
      list.updatedAt=new Date().toISOString();
      await saveData();
      await syncListToSupabase(list);
      renderMainViewOnly();
    }else if(isOwner&&!list.shareSlug){
      await syncListToSupabase(list);
    }

    var url=listShareUrl(list);
    if(!url){alert('Ainda não foi possível gerar o link desta lista.');return;}

    try{
      if(navigator.share){
        await navigator.share({title:list.name||'Lista no Bingeo',text:'Confira esta lista no Bingeo.',url:url});
        return;
      }
    }catch(e){
      if(e&&e.name==='AbortError')return;
    }
    try{
      await navigator.clipboard.writeText(url);
      alert('Link da lista copiado!');
    }catch(e){
      window.prompt('Copie o link da lista:',url);
    }
  }

  function viewListas(){
    if(state.listCreateOpen){
      var ownedCount=ownedListsCount(),freeLimitReached=!hasPro()&&ownedCount>=10;
      return '<div class="list-create-page">'+
        '<div class="list-create-head"><button class="btn btn-ghost btn-sm" data-action="back-to-lists">← Voltar para listas</button><div><div class="section-title">Criar nova lista</div><div class="list-create-sub">'+(hasPro()?'Bingeo Pro · listas ilimitadas':ownedCount+' de 10 listas usadas no plano Free')+'</div></div></div>'+
        (freeLimitReached?'<div class="pro-context-banner"><div class="pro-context-icon">✦</div><div class="pro-context-copy"><strong>Você chegou ao limite do plano Free</strong><span>Com o Bingeo Pro, suas listas são ilimitadas.</span></div><button class="btn btn-primary btn-sm" data-action="open-pro" data-source="listas-limite">Ter listas ilimitadas</button></div>':
        '<form class="list-create-form" id="newListForm">'+
          '<div class="list-create-field"><label class="field-label">Nome da lista</label><input type="text" name="name" class="qa-input" placeholder="Ex: Melhores séries de ficção científica" maxlength="80" required></div>'+
          '<div class="list-create-field"><label class="field-label">Descrição</label><textarea name="description" class="qa-input list-create-textarea" placeholder="Conte um pouco sobre esta lista..." maxlength="500"></textarea></div>'+
          '<div class="list-create-field"><label class="field-label">Visibilidade</label><div class="list-visibility-options"><label><input type="radio" name="visibility" value="private" checked> <span>🔒 Privada</span><small>Só você e colaboradores podem acessar.</small></label><label><input type="radio" name="visibility" value="public"> <span>🌐 Pública</span><small>Pode ser compartilhada por link.</small></label></div></div>'+
          '<div class="inline-actions"><button type="submit" class="btn btn-primary">Criar lista</button><button type="button" class="btn btn-ghost" data-action="back-to-lists">Cancelar</button></div>'+
        '</form>')+
      '</div>';
    }

    if(state.listOpen){
      var list=state.lists.find(function(l){return l.id===state.listOpen;});
      if(!list){state.listOpen=null;return viewListas();}
      var memberIds=proListOrderedIds(list);
      var memberCards=memberIds.map(function(cid,index){var entry=getEntry(cid),card='';if(entry)card=entryCardHtml(entry);else{var cat=getCatalog(cid);card=cat?catalogCardHtml(cat):'';}return card?proListMemberCardHtml(list,card,index):'';}).filter(Boolean);
      var candidates=filteredEntries();
      var isOwner=list.ownerUserId?list.ownerUserId===currentUserId:list.isOwner!==false;
      var canEdit=isOwner||list.isCollaborator===true;
      var coverStyle=proListHeroStyle(list);
      var collaborators=Array.isArray(list.collaborators)?list.collaborators:[];
      var html='<div class="list-detail-cover" style="'+coverStyle+'"><div class="list-detail-cover-copy"><h2>'+escapeHtml(list.name)+'</h2>'+proListDescriptionHtml(list)+'<div class="list-meta-row"><span class="list-meta-pill">'+(list.visibility==='public'?'🌐 Pública':'🔒 Privada')+'</span><span class="list-meta-pill">'+list.showIds.length+' títulos</span>'+(list.owner?'<span class="list-meta-pill">por @'+escapeHtml(String(list.owner).replace(/^@/,''))+'</span>':'')+(collaborators.length?'<span class="list-meta-pill">👥 '+collaborators.length+' colaboradores</span>':'')+'</div></div></div>';
      html+='<div class="list-detail-head"><button class="btn btn-ghost btn-sm" data-action="back-to-lists">← Todas as listas</button><div class="inline-actions">';
      if(isOwner){
        html+='<button class="btn btn-ghost btn-sm" data-action="choose-list-cover" data-list="'+list.id+'">Trocar capa</button>';
        html+='<button class="btn btn-ghost btn-sm" data-action="toggle-list-public" data-list="'+list.id+'">'+(list.visibility==='public'?'Tornar privada':'Tornar pública')+'</button>';
        html+='<button class="btn btn-ghost btn-sm" data-action="toggle-list-comments" data-list="'+list.id+'">'+(list.allowComments!==false?'Desativar comentários':'Ativar comentários')+'</button>';
      }
      if(list.visibility==='public'||isOwner)html+='<button class="btn btn-primary btn-sm" data-action="share-list" data-list="'+list.id+'">Compartilhar</button>';
      if(isOwner)html+='<button class="btn btn-danger btn-sm" data-action="delete-list" data-list="'+list.id+'">Excluir lista</button>';
      html+='</div></div>';

      if(isOwner){
        html+='<div class="list-tools-panel"><div class="list-tool-box"><h4>Detalhes da lista</h4><form id="listMetadataForm"><input class="qa-input" name="name" value="'+escapeHtml(list.name||'')+'" placeholder="Nome da lista" style="width:100%;margin-bottom:7px;"><input class="qa-input" name="description" value="'+escapeHtml(list.description||'')+'" placeholder="Descrição" style="width:100%;margin-bottom:7px;"><button class="btn btn-ghost btn-sm" type="submit">Salvar detalhes</button></form></div><div class="list-tool-box"><h4>Colaboradores</h4><form id="listCollaboratorForm" class="new-list-form" style="margin:0;"><input type="text" name="username" class="qa-input" placeholder="@usuário" required><button class="btn btn-ghost btn-sm" type="submit">Adicionar</button></form><div class="collab-row">'+(collaborators.length?collaborators.map(function(co){return '<span class="collab-chip">@'+escapeHtml(co.username||'usuário')+' <button style="border:0;background:none;color:inherit;cursor:pointer;padding:0 0 0 4px;" data-action="remove-collaborator" data-list="'+list.id+'" data-username="'+escapeHtml(co.username||'')+'">×</button></span>';}).join(''):'<span style="font-size:11px;color:var(--text-dim);">Só você edita esta lista.</span>')+'</div></div><div class="list-tool-box"><h4>Compartilhamento</h4><div style="font-size:11.5px;color:var(--text-muted);line-height:1.45;">'+(list.visibility==='public'?'Esta lista pode ser aberta por qualquer pessoa com o link.':'Torne a lista pública para compartilhar por link.')+'</div>'+(list.visibility==='public'?'<button class="btn btn-ghost btn-sm" style="margin-top:9px;" data-action="share-list" data-list="'+list.id+'">Copiar/compartilhar link</button>':'')+'</div></div>';
        html+=proListToolsHtml(list);
      }else if(list.isCollaborator===true){
        html+='<div class="banner-note"><span>Você está colaborando nesta lista.</span><span class="pro-badge">EDITOR</span></div>';
      }else if(list.isSharedPublic){
        html+='<div class="banner-note"><span>Você está visualizando uma lista pública compartilhada.</span><span class="pro-badge">PÚBLICA</span></div>';
      }

      if(memberCards.length>0){
        html+='<div class="section-title" style="margin-bottom:10px;">Nesta lista</div><div class="grid" style="margin-bottom:28px;">'+memberCards.join('')+'</div>';
      }else{
        html+='<div class="empty" style="margin-bottom:22px;"><strong>Esta lista ainda está vazia.</strong></div>';
      }

      if(canEdit){
        html+='<div class="section-title" style="margin-bottom:10px;">Adicionar títulos da sua estante</div>';
        if(candidates.length===0)html+='<div class="empty">Sua estante ainda está vazia. Adicione títulos em "Descobrir" primeiro.</div>';
        else html+='<div>'+candidates.map(function(e){
          var cat=getCatalog(e.catalogId),inList=list.showIds.indexOf(e.catalogId)>-1;
          return '<div class="pick-row'+(inList?' in-list':'')+'" data-action="toggle-show-in-list" data-list="'+list.id+'" data-catalog="'+e.catalogId+'"><div class="pick-swatch" style="'+swatchStyle(cat.title)+'"></div><span>'+escapeHtml(cat.title)+'</span><span class="pick-check">'+(inList?'✓':'')+'</span></div>';
        }).join('')+'</div>';
      }
      html+=listCommentsHtml(list);
      return html;
    }

    var ownedCount=ownedListsCount(),visibleLists=state.lists.filter(function(l){return !l.isSharedPublic;}),limitLabel=hasPro()?'Listas ilimitadas com Pro':ownedCount+' de 10 listas usadas';
    var html='<div class="lists-home-head"><div><div class="section-title">Suas listas</div><div class="lists-limit-label">'+limitLabel+'</div></div></div>';
    if(!hasPro()){
      html+=proContextBannerHtml(
        ownedCount>=8?'Você está usando '+ownedCount+' de 10 listas':'Listas ilimitadas com Bingeo Pro',
        ownedCount>=8?'Não fique sem espaço: no Pro você pode criar quantas listas quiser.':'O plano Free permite 10 listas próprias. No Pro, não há limite.',
        ownedCount>=8?'listas-quase-limite':'listas',
        ownedCount<8
      );
    }
    html+='<div class="lists-grid">';
    html+='<button class="list-card list-create-card '+(!canCreateList()?'limit-reached':'')+'" data-action="open-list-create" type="button">'+
      '<div class="list-create-card-visual"><span class="list-create-plus">＋</span><span class="list-create-card-title">Nova lista</span><span class="list-create-card-sub">'+(canCreateList()?'Criar uma coleção':('Limite Free atingido'))+'</span></div>'+
      '<div class="list-card-body"><h3>Criar nova lista</h3><p>'+(hasPro()?'Crie quantas listas quiser.':'Plano Free: até 10 listas.')+'</p><div class="count">'+(hasPro()?'Ilimitado':ownedCount+'/10')+'</div></div></button>';
    html+=visibleLists.map(function(l){
      var collabs=Array.isArray(l.collaborators)?l.collaborators.length:0;
      return '<div class="list-card" data-action="open-list" data-list="'+l.id+'">'+listCoverHtml(l)+'<div class="list-card-body"><h3>'+escapeHtml(l.name)+'</h3><p>'+escapeHtml(l.description||'')+'</p><div class="count">'+l.showIds.length+' título'+(l.showIds.length===1?'':'s')+(collabs?' · '+collabs+' colaboradores':'')+'</div><span class="list-visibility">'+(l.visibility==='public'?'🌐 Pública':'🔒 Privada')+'</span></div></div>';
    }).join('');
    html+='</div>';
    if(visibleLists.length===0)html+='<div class="empty lists-empty-note"><strong>Você ainda não tem listas.</strong>Use o card “Nova lista” para criar sua primeira coleção.</div>';
    return html;
  }

  function profileNameInlineStyle(){
    var ns=state.profile.nameStyle||{};
    if(!hasPro() || !ns.color) return '';
    return 'style=\"color:' + escapeHtml(ns.color) + ';\" class=\"profile-name' + (ns.effect==='glow'?' name-glow':'') + (ns.effect==='animated'?' name-animated':'') + '\"';
  }
  function socialLabel(platform){var m={instagram:'Instagram',x:'X',twitter:'X',tiktok:'TikTok',youtube:'YouTube',twitch:'Twitch',discord:'Discord',github:'GitHub',website:'Site'};return m[platform]||platform;}
  function socialIcon(platform){var m={instagram:'◎',x:'𝕏',twitter:'𝕏',tiktok:'♪',youtube:'▶',twitch:'▣',discord:'◈',github:'◉',website:'↗'};return m[platform]||'↗';}
  function validSocialUrl(url){try{var u=new URL(url);return u.protocol==='https:'||u.protocol==='http:';}catch(e){return false;}}
  function normalizeSocialUrl(url){var u=(url||'').trim();if(!u)return '';if(!/^https?:\/\//i.test(u))u='https://'+u;return u;}
  function profileShareUrl(userId){
    var base=(window.location.origin||'https://bingeo.onrender.com').replace(/\/$/,'');
    return base+'/?perfil='+encodeURIComponent(userId||currentUserId||'');
  }
  function sharedProfileTargetId(){
    try{return new URL(window.location.href).searchParams.get('perfil')||'';}catch(e){return '';}
  }
  function clearSharedProfileTarget(){
    try{
      var url=new URL(window.location.href);
      if(!url.searchParams.has('perfil'))return;
      url.searchParams.delete('perfil');
      history.replaceState(null,'',url.pathname+(url.searchParams.toString()?('?'+url.searchParams.toString()):'')+url.hash);
    }catch(e){}
  }
  async function openSharedProfileTarget(){
    var target=sharedProfileTargetId();
    if(!target||!currentUserId)return false;
    clearSharedProfileTarget();
    state.query='';
    state.modalCatalogId=null;
    state.professionalOpen=null;
    state.professionalData=null;
    if(target===currentUserId){
      state.userProfileOpen=null;
      state.userProfileData=null;
      state.view='perfil';
      render();
      return true;
    }
    state.userProfileBackView='descobrir';
    state.userProfileOpen=target;
    state.userProfileData=null;
    state.userProfileError='';
    state.userProfileLoading=true;
    state.view='descobrir';
    renderMainViewOnly();
    loadBingeoUserProfile(target);
    return true;
  }
  async function shareBingeoProfile(userId,username){
    var url=profileShareUrl(userId);
    var name=username||'este perfil';
    try{
      if(navigator.share){
        await navigator.share({title:'Perfil de '+name+' no Bingeo',text:'Veja o perfil de '+name+' no Bingeo.',url:url});
        return;
      }
    }catch(e){
      if(e&&e.name==='AbortError')return;
    }
    try{
      await navigator.clipboard.writeText(url);
      alert('Link do perfil copiado!');
    }catch(e){
      window.prompt('Copie o link do perfil:',url);
    }
  }

  function professionalFavoriteGroup(p){
    return String(p&&p.known_for_department||'').toLowerCase()==='acting'?'actor':'creator';
  }
  function favoriteProfessionalCardHtml(p){
    var img=tmdbImageUrl(p.profile_path,'w342');
    return '<div class="favorite-person-card" data-action="open-professional" data-person="'+Number(p.person_id)+'">'+
      '<div class="favorite-person-photo" style="'+(img?'background-image:url(\''+img.replace(/'/g,'%27')+'\')':'')+'"></div>'+
      '<div class="favorite-person-copy"><div class="favorite-person-name">'+escapeHtml(p.name||'Profissional')+'</div>'+
      '<div class="favorite-person-role">'+escapeHtml(professionalFavoriteGroup(p)==='actor'?'Ator/Atriz':professionalDepartmentLabel(p.known_for_department||'Profissional'))+'</div></div></div>';
  }
  function favoriteCharacterCardHtml(ch){
    var img=characterImageUrl(ch);
    characterLocalCache[ch.character_key]=ch;
    return '<div class="favorite-character-card" data-action="open-character" data-character="'+escapeHtml(ch.character_key)+'">'+
      '<div class="favorite-character-photo" style="'+(img?'background-image:url(\''+img.replace(/'/g,'%27')+'\')':'')+'">'+(img?'':'<span class="character-image-missing">Sem imagem do personagem</span>')+'</div>'+
      '<div class="favorite-character-copy"><div class="favorite-character-name">'+escapeHtml(displayCharacterName(ch.character_name))+'</div>'+
      '<div class="favorite-character-meta">'+escapeHtml(ch.tv_name||'Série')+' · '+escapeHtml(ch.actor_name||'')+'</div></div></div>';
  }
  function peopleFavoritesSectionsHtml(data){
    data=data||{};var pros=Array.isArray(data.professionals)?data.professionals:[],chars=Array.isArray(data.characters)?data.characters:[];
    var actors=pros.filter(function(p){return professionalFavoriteGroup(p)==='actor';});
    var creators=pros.filter(function(p){return professionalFavoriteGroup(p)!=='actor';});
    var empty=function(text){return '<div class="empty" style="padding:18px 14px;">'+escapeHtml(text)+'</div>';};
    return '<section class="people-favorites-section"><div class="people-favorites-title">Atores favoritos</div>'+
      (actors.length?'<div class="favorite-people-grid">'+actors.map(favoriteProfessionalCardHtml).join('')+'</div>':empty('Nenhum ator favoritado ainda.'))+'</section>'+
      '<section class="people-favorites-section"><div class="people-favorites-title">Diretores/criadores favoritos</div>'+
      (creators.length?'<div class="favorite-people-grid">'+creators.map(favoriteProfessionalCardHtml).join('')+'</div>':empty('Nenhum diretor ou criador favoritado ainda.'))+'</section>'+
      '<section class="people-favorites-section"><div class="people-favorites-title">Personagens favoritos</div>'+
      (chars.length?'<div class="favorite-people-grid">'+chars.map(favoriteCharacterCardHtml).join('')+'</div>':empty('Nenhum personagem favoritado ainda.'))+'</section>';
  }

  function topCharacterArtworkSource(url){
    if(safeTheTvdbImage(url))return 'TheTVDB';
    if(safeTvmazeImage(url))return 'TVmaze';
    if(safeAniListImage(url))return 'AniList';
    if(safeJikanImage(url))return 'Jikan';
    return 'Imagem';
  }
  function topCharacterArtworkChoices(ch){
    if(!ch)return [];
    var seen={},rows=[];
    function add(url,originIndex){
      url=safeCharacterProviderImage(url);
      if(!url)return;
      var key=normalizedArtworkUrlKey(url);
      if(!key||seen[key])return;
      seen[key]=1;
      rows.push({
        url:url,
        source:topCharacterArtworkSource(url),
        score:1000-(Number(originIndex||0)*2)
      });
    }
    (Array.isArray(ch.character_artwork_options)?ch.character_artwork_options:[]).forEach(function(url,idx){add(url,idx);});
    add(ch.character_image_url,100);
    add(ch.tvdb_character_image_url,110);
    add(characterImageUrl(ch),120);
    rows.sort(function(a,b){return b.score-a.score;});
    return rows.slice(0,36);
  }
  function topCharacterArtworkOptions(ch){
    return topCharacterArtworkChoices(ch).map(function(item){return item.url;});
  }
  function topCharacterDisplayArt(ch,profile,selectedOverride){
    var pro=!!(profile&&profile.plan==='pro');
    var selected=pro?(selectedOverride||''):'';
    if(!selected&&pro)selected=(profile.topCharacterArtwork||{})[ch.character_key]||'';
    selected=safeCharacterProviderImage(selected);
    return selected||characterImageUrl(ch)||characterBannerImageUrl(ch)||'';
  }
  function seriesArtworkUrl(value,size){
    value=String(value||'').trim();
    if(!value)return '';
    if(/^\/[A-Za-z0-9._\/-]+$/.test(value))return tmdbImageUrl(value,size||'w500');
    return safeTheTvdbImage(value)||safeAniListImage(value)||safeTvmazeImage(value);
  }
  function seriesArtworkSourceForValue(value){
    value=String(value||'');
    if(/^\/[A-Za-z0-9._\/-]+$/.test(value))return 'TMDB';
    if(safeTheTvdbImage(value))return 'TheTVDB';
    if(safeAniListImage(value))return 'AniList';
    if(safeTvmazeImage(value))return 'TVmaze';
    return 'Imagem';
  }
  function normalizedArtworkUrlKey(url){
    return String(url||'').trim().toLowerCase()
      .replace(/^https?:\/\//,'')
      .replace(/[?#].*$/,'')
      .replace(/\/(?:w92|w154|w185|w342|w500|w780|original)\//g,'/');
  }
  function seriesProfilePosterUrl(cat,profile){
    if(!cat)return '';
    var custom='';
    if(profile&&profile.plan==='pro')custom=(profile.topFiveArtwork||{})[cat.id]||'';
    var customUrl=seriesArtworkUrl(custom,'w500');
    if(customUrl)return customUrl;
    var standard=tmdbImageUrl(cat.poster_path||(cat.tmdbData&&cat.tmdbData.poster_path),'w500');
    if(standard)return standard;
    var known=(state.seriesArtworkOptions&&state.seriesArtworkOptions[cat.id])||[];
    var fallback=known.find(function(x){return x&&x.isDefault&&x.url;});
    return fallback&&fallback.url||'';
  }
  function ownEvaluationItems(){
    return state.entries.filter(function(e){
      return e.rating!=null||String(e.review||'').trim()||
        (e.premiumRating&&e.premiumRating.value!=null)||
        (e.premiumRating&&Array.isArray(e.premiumRating.reactions)&&e.premiumRating.reactions.length)||
        Object.keys(e.criteriaRatings||{}).some(function(k){return e.criteriaRatings[k]!=null;})||
        (e.badges||[]).length||
        Object.keys(e.seasonRatings||{}).some(function(k){return e.seasonRatings[k]!=null;})||
        Object.keys(e.episodeRatings||{}).some(function(k){return e.episodeRatings[k]!=null;});
    }).sort(function(a,b){return String(b.dateUpdated||'').localeCompare(String(a.dateUpdated||''));})
      .slice(0,18).map(function(e){
        var cat=getCatalog(e.catalogId);
        return {
          catalog_id:e.catalogId,
          tmdb_id:cat&&cat.tmdbId||null,
          title:cat&&cat.title||e.catalogId,
          genre:cat&&cat.genre||'Série',
          poster_path:cat&&cat.poster_path||null,
          backdrop_path:cat&&cat.backdrop_path||null,
          rating:e.rating,
          review:e.review||'',
          season_ratings:e.seasonRatings||{},
          episode_ratings:e.episodeRatings||{},
          pro_review:normalizeProReview(e.proReview||{}),
          plan:state.profile.plan||'free',
          premium_rating:e.premiumRating||{},
          criteria_ratings:e.criteriaRatings||{},
          badges:e.badges||[],
          spoiler_level:e.spoilerLevel||'none',
          spoiler_season:e.spoilerSeason,
          spoiler_episode:e.spoilerEpisode,
          updated_at:e.dateUpdated||'',
          is_own:true
        };
      });
  }
  function ownEvaluationsSectionHtml(){
    var evals=ownEvaluationItems();
    return '<section class="own-evaluations-section"><div class="section-title" style="margin-bottom:13px;">Avaliações</div>'+
      (evals.length?'<div class="user-eval-grid">'+evals.map(userEvaluationCardHtml).join('')+'</div>':'<div class="empty">Nenhuma avaliação registrada ainda.</div>')+
      '</section>';
  }
  function normalizeSeriesArtworkLanguage(value){
    var lang=String(value||'').trim().toLowerCase().replace(/_/g,'-');
    if(!lang)return '';
    if(lang==='eng'||lang==='english'||lang.indexOf('en-')===0)return 'en';
    if(lang==='por'||lang==='pob'||lang==='portuguese'||lang.indexOf('pt-')===0)return 'pt';
    return lang;
  }
  function seriesArtworkLanguageAllowed(item){
    if(!item)return false;
    // A AniList não informa o idioma visual da capa. A exceção é permitida
    // somente quando o Bingeo confirmou que a série é um anime.
    if(item.source==='AniList'&&item.anime===true)return true;
    if(item.textless===true)return true;
    var lang=normalizeSeriesArtworkLanguage(item.language);
    return lang==='pt'||lang==='en';
  }
  function seriesArtworkFitsTop5(item){
    if(!item)return false;
    // coverImage da AniList é uma capa vertical própria para anime, porém a API
    // não expõe width/height. Permitimos a capa somente na fonte AniList + anime.
    if(item.source==='AniList'&&item.anime===true)return true;
    var w=Number(item.width||0),h=Number(item.height||0);
    if(!w||!h||h<=w)return false;
    var ratio=w/h;
    // O card do Top 5 usa 2:3 (0,666...). Aceita apenas pôsteres
    // próximos dessa proporção para evitar faixas vazias ou cortes ruins.
    return ratio>=0.60&&ratio<=0.74;
  }
  function seriesArtworkCandidateScore(item){
    if(!item||!item.url||!seriesArtworkLanguageAllowed(item)||!seriesArtworkFitsTop5(item))return -Infinity;
    var score=55,w=Number(item.width||0),h=Number(item.height||0);
    if(w&&h){
      var ratio=w/h;
      score+=Math.max(0,34-(Math.abs(ratio-(2/3))*180));
      var area=w*h;
      score+=Math.min(24,area/120000);
      if(w>=1000&&h>=1400)score+=12;
      else if(w>=680&&h>=1000)score+=7;
      else if(w<400||h<600)score-=28;
    }
    if(item.source==='TheTVDB')score+=7;
    else if(item.source==='TMDB')score+=5;
    else if(item.source==='AniList')score+=4;
    else if(item.source==='TVmaze')score+=3;
    var lang=normalizeSeriesArtworkLanguage(item.language);
    if(item.textless===true)score+=14;
    else if(lang==='pt'||lang==='en')score+=5;
    score+=Math.min(18,Number(item.voteAverage||0)*1.6);
    score+=Math.min(14,Math.log10(Number(item.voteCount||0)+1)*6);
    score+=Math.min(18,Math.max(0,Number(item.providerScore||0))*6);
    if(item.likelyDefault)score-=80;
    return score;
  }
  function diversifySeriesArtworkCandidates(rows,maxItems){
    var pool=(rows||[]).slice().sort(function(a,b){return b.score-a.score;});
    var out=[],sourceCount={},langCount={};
    while(pool.length&&out.length<maxItems){
      var bestIndex=0,bestEffective=-Infinity;
      pool.forEach(function(item,idx){
        var source=item.source||'Imagem',lang=item.language||'sem-texto';
        var effective=item.score-(sourceCount[source]||0)*5-(langCount[lang]||0)*2;
        if(out.length&&out[out.length-1].source===source)effective-=3;
        if(effective>bestEffective){bestEffective=effective;bestIndex=idx;}
      });
      var chosen=pool.splice(bestIndex,1)[0],source=chosen.source||'Imagem',lang=chosen.language||'sem-texto';
      out.push(chosen);sourceCount[source]=(sourceCount[source]||0)+1;langCount[lang]=(langCount[lang]||0)+1;
    }
    return out;
  }
  function preserveSelectedSeriesArtwork(cat,options){
    // Não reinsere artes antigas sem metadados: o seletor deve exibir somente
    // pôsteres sem letreiro ou identificados como português/inglês.
    return (options||[]).filter(seriesArtworkLanguageAllowed);
  }
  async function loadSeriesArtworkOptions(cat){
    if(!cat||!hasPro())return;
    if(state.seriesArtworkOptions[cat.id]||state.seriesArtworkLoading[cat.id])return;
    state.seriesArtworkLoading[cat.id]=true;renderMainViewOnly();
    try{
      var details=cat.tmdbData||null;
      if(!cat.tmdbId||!details)details=await loadTmdbSeries(cat);
      if(!cat.tmdbId||!details)throw new Error('Série sem ID da TMDB.');

      var animeSeries=isAnimeSeries(cat,details);
      var cacheKey='series-posters-v8-anilist-anime:'+cat.tmdbId;
      var cached=tmdbCacheGet(cacheKey,604800000);
      if(Array.isArray(cached)&&cached.length){
        state.seriesArtworkOptions[cat.id]=preserveSelectedSeriesArtwork(cat,cached.slice());
        return;
      }

      var tvmazeShow=await findTvmazeShowForTmdb(details).catch(function(){return null;});

      var settled=await Promise.allSettled([
        tmdbFetch('/tv/'+cat.tmdbId+'/images',{include_image_language:'pt,en,null'}),
        getTheTvdbSeriesExtended(details),
        (tvmazeShow&&tvmazeShow.id)?tvmazeFetch('shows/'+tvmazeShow.id+'/images',{}):Promise.resolve([]),
        animeSeries?anilistFetchSearch(cat.title||details.name||details.original_name||''):Promise.resolve([])
      ]);

      var tmdbImages=settled[0].status==='fulfilled'?(settled[0].value||{}):{};
      var tvdbSeries=settled[1].status==='fulfilled'?settled[1].value:null;
      var tvmazeImages=settled[2].status==='fulfilled'&&Array.isArray(settled[2].value)?settled[2].value:[];
      var anilistResults=settled[3].status==='fulfilled'&&Array.isArray(settled[3].value)?settled[3].value:[];

      var defaultPath=cat.poster_path||(details&&details.poster_path)||'';
      var defaultUrl=defaultPath?tmdbImageUrl(defaultPath,'w500'):'';
      var defaultSource=defaultUrl?'TMDB':'';
      var defaultValue='';
      if(!defaultUrl&&tvdbSeries){
        var tvdbMain=safeTheTvdbImage(tvdbSeries.image);
        if(tvdbMain){defaultUrl=tvdbMain;defaultSource='TheTVDB';defaultValue=tvdbMain;}
      }
      if(!defaultUrl&&tvmazeShow&&tvmazeShow.image){
        var mazeMain=safeTvmazeImage(tvmazeShow.image.original||tvmazeShow.image.medium);
        if(mazeMain){defaultUrl=mazeMain;defaultSource='TVmaze';defaultValue=mazeMain;}
      }

      var candidates=[],seen={};
      function add(item){
        if(!item||!item.value||!item.url)return;
        item.language=item.textless===true?'':normalizeSeriesArtworkLanguage(item.language);
        if(!seriesArtworkLanguageAllowed(item)||!seriesArtworkFitsTop5(item))return;
        var key=normalizedArtworkUrlKey(item.url)||String(item.value);
        if(defaultUrl&&key===normalizedArtworkUrlKey(defaultUrl))return;
        item.score=seriesArtworkCandidateScore(item);
        if(!isFinite(item.score))return;
        if(seen[key]!=null){
          if(candidates[seen[key]].score<item.score)candidates[seen[key]]=item;
          return;
        }
        seen[key]=candidates.length;candidates.push(item);
      }

      (tmdbImages.posters||[]).forEach(function(p){
        if(!p||!p.file_path||p.file_path===defaultPath)return;
        add({
          value:p.file_path,url:tmdbImageUrl(p.file_path,'w500'),source:'TMDB',
          width:Number(p.width||0),height:Number(p.height||0),language:p.iso_639_1||'',
          textless:!p.iso_639_1,voteAverage:Number(p.vote_average||0),voteCount:Number(p.vote_count||0)
        });
      });

      if(tvdbSeries&&Array.isArray(tvdbSeries.artworks)){
        tvdbSeries.artworks.forEach(function(art){
          if(!art||art.seriesPeopleId||art.peopleId)return;
          var url=safeTheTvdbImage(art.image||art.thumbnail),w=Number(art.width||0),h=Number(art.height||0);
          if(!url||!w||!h)return;
          var typeText=String(art.typeName||art.type_name||art.name||'').toLowerCase();
          if(/banner|background|fanart|logo|icon|clearart/.test(typeText))return;
          add({
            value:url,url:url,source:'TheTVDB',width:w,height:h,
            language:art.language||art.languageCode||'',
            textless:art.includesText===false,
            providerScore:Number(art.score||0)
          });
        });
      }

      if(animeSeries&&anilistResults.length){
        var anilistMatch=chooseAniListMatch(anilistResults,cat,details);
        if(anilistMatch&&anilistMatch.coverImage){
          var anilistUrl=safeAniListImage(
            anilistMatch.coverImage.extraLarge||
            anilistMatch.coverImage.large||
            anilistMatch.coverImage.medium
          );
          if(anilistUrl){
            add({
              value:anilistUrl,url:anilistUrl,source:'AniList',
              width:0,height:0,language:'',textless:false,anime:true,
              providerScore:2
            });
          }
        }
      }

      // O TVmaze fornece todos os pôsteres e dimensões, mas não informa
      // idioma/textless na maioria dos itens. Só usamos quando os metadados
      // permitem respeitar a regra PT/EN/sem texto do Top 5.
      tvmazeImages.forEach(function(img){
        if(!img||img.type!=='poster'||!img.resolutions||!img.resolutions.original)return;
        var original=img.resolutions.original,url=safeTvmazeImage(original.url);
        var lang=img.language||img.lang||'';
        var textless=img.textless===true||img.includesText===false;
        if(!url||(!lang&&!textless))return;
        add({
          value:url,url:url,source:'TVmaze',
          width:Number(original.width||0),height:Number(original.height||0),
          language:lang,textless:textless,providerScore:img.main?2:0
        });
      });

      var ordered=diversifySeriesArtworkCandidates(candidates,24);
      var defaultMeta=null;
      if(defaultUrl&&defaultSource==='TMDB'){
        var tmdbDefaultPoster=(tmdbImages.posters||[]).find(function(p){return p&&p.file_path===defaultPath;});
        if(tmdbDefaultPoster){
          defaultMeta={
            language:tmdbDefaultPoster.iso_639_1||'',
            textless:!tmdbDefaultPoster.iso_639_1,
            width:Number(tmdbDefaultPoster.width||0),
            height:Number(tmdbDefaultPoster.height||0)
          };
        }
      }else if(defaultUrl&&defaultSource==='TheTVDB'&&tvdbSeries&&Array.isArray(tvdbSeries.artworks)){
        var defaultKey=normalizedArtworkUrlKey(defaultUrl);
        var tvdbDefaultArt=tvdbSeries.artworks.find(function(art){
          return art&&normalizedArtworkUrlKey(safeTheTvdbImage(art.image||art.thumbnail))===defaultKey;
        });
        if(tvdbDefaultArt){
          defaultMeta={
            language:tvdbDefaultArt.language||tvdbDefaultArt.languageCode||'',
            textless:tvdbDefaultArt.includesText===false,
            width:Number(tvdbDefaultArt.width||0),
            height:Number(tvdbDefaultArt.height||0)
          };
        }
      }

      if(defaultUrl&&defaultMeta&&seriesArtworkLanguageAllowed(defaultMeta)&&seriesArtworkFitsTop5(defaultMeta)){
        ordered.splice(Math.min(4,ordered.length),0,{
          value:defaultValue,url:defaultUrl,source:defaultSource||'Padrão',
          width:Number(defaultMeta.width||0),height:Number(defaultMeta.height||0),
          language:defaultMeta.textless===true?'':normalizeSeriesArtworkLanguage(defaultMeta.language),
          textless:defaultMeta.textless===true,isDefault:true,score:-999
        });
      }

      ordered=ordered.slice(0,25);
      tmdbCacheSet(cacheKey,ordered);
      state.seriesArtworkOptions[cat.id]=preserveSelectedSeriesArtwork(cat,ordered.slice());
    }catch(e){
      console.error('Erro ao buscar pôsteres alternativos:',e);
      state.seriesArtworkOptions[cat.id]=preserveSelectedSeriesArtwork(cat,[]);
    }finally{
      state.seriesArtworkLoading[cat.id]=false;
      if(state.view==='perfil')renderMainViewOnly();
    }
  }
  function top5ArtworkPickerHtml(){
    var catId=state.seriesArtPickerId;if(!catId)return '';
    var cat=getCatalog(catId);if(!cat)return '';
    var selected=(state.profile.topFiveArtwork||{})[catId]||'';
    if(state.seriesArtworkLoading[catId]){
      return '<div class="artwork-picker"><div class="artwork-picker-head"><div><div class="artwork-picker-title">Pôster de '+escapeHtml(cat.title)+'</div><div class="artwork-picker-note">Buscando artes alternativas nas fontes configuradas…</div></div><button class="btn btn-ghost btn-sm" data-action="close-series-art-picker">Fechar</button></div>'+
        '<div class="artwork-skeleton-grid">'+Array(10).fill('<div class="artwork-skeleton"></div>').join('')+'</div></div>';
    }
    var options=state.seriesArtworkOptions[catId]||[];
    if(!options.length)return '<div class="artwork-picker"><div class="artwork-picker-head"><div><div class="artwork-picker-title">Pôster de '+escapeHtml(cat.title)+'</div><div class="artwork-picker-note">Nenhuma arte alternativa foi encontrada agora.</div></div><button class="btn btn-ghost btn-sm" data-action="close-series-art-picker">Fechar</button></div></div>';
    var sources=[];
    options.forEach(function(opt){if(opt&&opt.source&&sources.indexOf(opt.source)===-1)sources.push(opt.source);});
    return '<div class="artwork-picker"><div class="artwork-picker-head"><div><div class="artwork-picker-title">Pôster de '+escapeHtml(cat.title)+'</div><div class="artwork-picker-note">Somente pôsteres verticais compatíveis com o formato 2:3 do Top 5, sem letreiro ou em português/inglês. Para animes, capas da AniList também são aceitas mesmo sem idioma identificado.</div></div><button class="btn btn-ghost btn-sm" data-action="close-series-art-picker">Fechar</button></div>'+
      '<div class="artwork-picker-summary">'+sources.map(function(source){return '<span class="artwork-source-chip">'+escapeHtml(source)+'</span>';}).join('')+'</div>'+
      '<div class="artwork-grid">'+options.map(function(opt){
        var isSelected=opt.isDefault?(!selected||selected===opt.value):selected===opt.value;
        var label=opt.isDefault?'Padrão':'Alternativo';
        var meta=[opt.source,opt.language?String(opt.language).toUpperCase():'',opt.width&&opt.height?(opt.width+'×'+opt.height):''].filter(Boolean).join(' · ');
        return '<div class="artwork-choice '+(isSelected?'selected':'')+'" data-action="top5-select-art" data-catalog="'+cat.id+'" data-value="'+escapeHtml(opt.value||'')+'" title="'+escapeHtml(meta)+'" style="background-image:url(\''+String(opt.url||'').replace(/'/g,'%27')+'\')">'+
          '<span class="artwork-choice-source">'+escapeHtml(opt.source||'Imagem')+'</span><span class="artwork-choice-label">'+label+'</span></div>';
      }).join('')+'</div></div>';
  }

  