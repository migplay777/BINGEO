/* ---------------- persistent form delegation ---------------- */
  document.addEventListener('change', function(e){
    var statusSel=e.target&&e.target.closest?e.target.closest('#statusSelect'):null;
    if(!statusSel)return;

    var catalogId=statusSel.dataset.catalog||state.modalCatalogId;
    var entry=getEntry(catalogId);
    if(!entry)return;

    var nextStatus=String(statusSel.value||'');
    if(!STATUS_LABELS[nextStatus]||entry.status===nextStatus)return;

    entry.status=nextStatus;
    entry.dateUpdated=new Date().toISOString();

    if(nextStatus==='assistindo'||nextStatus==='completo')bumpTrending(entry.catalogId,'status');
    saveData();
    syncEntryToSupabase(entry);
    publishActivity('status',entry,{payload:{status:entry.status,status_label:STATUS_LABELS[entry.status]||entry.status}});

    renderMainViewOnly();
    renderModalPreserveScroll();
  });

  document.addEventListener('click', function(e){
    if(!e.target.closest('.account-profile-menu'))closeHeaderProfileMenu();
    var navBtn = e.target.closest('.nav-link');
    if(navBtn){
      state.view = navBtn.dataset.view;
      state.profile.editing=false;
      state.listOpen = null;
      state.listCreateOpen=false;
      state.professionalOpen=null;state.professionalData=null;state.professionalError='';
      state.characterOpen=null;state.characterData=null;state.characterError='';state.characterLoading=false;
      state.userProfileOpen=null;state.userProfileData=null;state.userProfileError='';state.userProfileLoading=false;
      state.query = '';
      if(state.view==='home'){loadFollowingFeed().then(render);return;}
      if(state.view==='descobrir'){loadTrending().then(render);return;}
      render();
      return;
    }
    var el = e.target.closest('[data-action]');
    if(!el) return;
    var action = el.dataset.action;

    if(action==='toggle-account-menu'){
      var accountMenu=document.getElementById('headerProfileMenu');
      setHeaderProfileMenu(!!(accountMenu&&accountMenu.hidden));
      return;
    }
    closeHeaderProfileMenu();

    if(action==='open-pro'){openProView(el.dataset.source||'');return;}
    if(handleProFeatureAction(action,el))return;
    if(action==='pro-checkout'){alert('A página do Bingeo Pro está pronta. O checkout será conectado quando definirmos o preço e o meio de pagamento.');return;}

    if(action==='open-show'){ state.modalCatalogId=el.dataset.catalog; var openedCat=getCatalog(state.modalCatalogId); renderModal(); loadSeriesCommunity(state.modalCatalogId); if(openedCat&&tmdbConfigured())loadTmdbSeries(openedCat).then(function(){if(state.modalCatalogId===openedCat.id)renderModalPreserveScroll();}).catch(function(){if(state.modalCatalogId===openedCat.id)renderModalPreserveScroll();}); }
    else if(action==='share-own-profile'){
      if(!currentUserId)return;
      shareBingeoProfile(currentUserId,state.profile.username||'meu perfil');
    }
    else if(action==='toggle-professional-favorite'){
      var fpId=Number(el.dataset.person);if(!fpId)return;
      var fp=(state.professionalData&&Number(state.professionalData.id)===fpId)?Object.assign({},state.professionalData):{
        id:fpId,
        name:el.dataset.name||'Profissional',
        profile_path:el.dataset.profile||null,
        known_for_department:el.dataset.department||''
      };
      if(el.dataset.department)fp.known_for_department=el.dataset.department;
      el.disabled=true;
      toggleProfessionalFavorite(fp).catch(function(err){alert(err.message||'Não foi possível atualizar este favorito.');}).finally(function(){el.disabled=false;});
    }
    else if(action==='open-character'){
      var characterKey=el.dataset.character;if(!characterKey)return;
      state.characterBackView=state.view||'descobrir';
      state.characterOpen=characterKey;
      state.characterData=characterLocalCache[characterKey]||null;
      state.characterError='';state.characterLoading=!state.characterData;
      state.professionalOpen=null;state.professionalData=null;
      state.userProfileOpen=null;state.userProfileData=null;
      state.modalCatalogId=null;
      renderMainViewOnly();
      loadCharacter(characterKey);
    }
    else if(action==='close-character'){
      state.characterOpen=null;state.characterData=null;state.characterError='';state.characterLoading=false;
      state.view=state.characterBackView||'descobrir';render();
    }
    else if(action==='toggle-character-favorite'){
      var favKey=el.dataset.character,ch=characterLocalCache[favKey]||(state.characterData&&state.characterData.character_key===favKey?state.characterData:null);
      if(!ch){loadCharacter(favKey);return;}
      el.disabled=true;
      toggleCharacterFavorite(ch).catch(function(err){alert(err.message||'Não foi possível atualizar este personagem favorito.');}).finally(function(){el.disabled=false;});
    }
    else if(action==='open-user-profile'){
      var userId=el.dataset.user;if(!userId)return;
      if(userId===currentUserId){
        state.userProfileOpen=null;state.userProfileData=null;state.query='';state.view='perfil';render();return;
      }
      state.userProfileBackView=state.view||'descobrir';
      state.userProfileOpen=userId;state.userProfileData=null;state.userProfileError='';state.userProfileLoading=true;
      state.professionalOpen=null;state.professionalData=null;state.characterOpen=null;state.characterData=null;state.modalCatalogId=null;
      renderMainViewOnly();loadBingeoUserProfile(userId);
    }
    else if(action==='close-user-profile'){
      state.userProfileOpen=null;state.userProfileData=null;state.userProfileError='';state.userProfileLoading=false;
      state.view=state.userProfileBackView||'descobrir';render();
    }
    else if(action==='open-my-profile'){
      state.userProfileOpen=null;state.userProfileData=null;state.professionalOpen=null;state.professionalData=null;state.characterOpen=null;state.characterData=null;state.modalCatalogId=null;state.query='';state.profile.editing=false;state.view='perfil';render();
    }
    else if(action==='toggle-follow-user'){
      var targetUser=el.dataset.user,wasFollowing=el.dataset.following==='1';
      el.disabled=true;
      setFollowingUser(targetUser,!wasFollowing).catch(function(err){alert(err.message||'Não foi possível atualizar essa conexão.');});
    }
    else if(action==='refresh-social-feed'){loadFollowingFeed();}
    else if(action==='open-professional'){
      var personId=Number(el.dataset.person);if(!personId)return;
      state.professionalBackView=state.view||'descobrir';
      state.characterOpen=null;state.characterData=null;state.characterError='';
      state.userProfileOpen=null;state.userProfileData=null;
      state.professionalOpen=personId;
      state.modalCatalogId=null;
      state.professionalData=null;state.professionalError='';
      render();
      loadProfessional(personId);
    }
    else if(action==='professional-role-tab'){
      if(!state.professionalData||!state.professionalOpen)return;
      state.professionalRoleTab=el.dataset.role||null;
      state.professionalHydrating=false;
      renderMainViewOnly();
      hydrateProfessionalActiveRole(state.professionalOpen);
    }
    else if(action==='close-professional'){
      state.professionalOpen=null;state.professionalData=null;state.professionalError='';state.professionalLoading=false;state.professionalHydrating=false;state.professionalRoleTab=null;
      state.view=state.professionalBackView||'descobrir';
      render();
    }
    else if(action==='close-modal' || action==='close-modal-bg'){
      if(action==='close-modal-bg' && e.target!==el) return;
      state.modalCatalogId = null; state.proMediaArtworkPicker=null; renderModal();
    }
    else if(action==='filter-type'){ state.catalogType = el.dataset.type; render(); }
    else if(action==='quick-add'){
      var wasNew1 = !getEntry(el.dataset.catalog);
      var quickEntry=ensureEntry(el.dataset.catalog, 'quero-assistir');
      if(wasNew1) bumpTrending(el.dataset.catalog,'library_add');
      saveData(); syncEntryToSupabase(quickEntry); render();
    }
    else if(action==='add-to-library'){
      var wasNew2 = !getEntry(el.dataset.catalog);
      var addedEntry=ensureEntry(el.dataset.catalog, 'quero-assistir');
      if(wasNew2) bumpTrending(el.dataset.catalog,'library_add');
      saveData(); syncEntryToSupabase(addedEntry); renderModal(); render();
    }
    else if(action==='remove-entry'){
      if(confirm('Remover este título da sua estante? Registros de diário ligados a ele também serão apagados.')){
        var cid = el.dataset.catalog;
        state.entries = state.entries.filter(function(en){ return en.catalogId!==cid; });
        state.diary = state.diary.filter(function(d){ return d.catalogId!==cid; });
        state.lists.forEach(function(l){ l.showIds = l.showIds.filter(function(id){ return id!==cid; }); });
        state.profile.topFive = state.profile.topFive.map(function(id){ return id===cid ? null : id; });
        if(state.profile.topFiveArtwork)delete state.profile.topFiveArtwork[cid];
        if(state.seriesArtPickerId===cid)state.seriesArtPickerId=null;
        state.modalCatalogId = null;
        saveData(); deleteEntryFromSupabase(cid); syncProfileToSupabase(); render();
      }
    }
    else if(action==='rate'){
      var entry = ensureEntry(el.dataset.catalog, 'assistindo');
      var val = parseFloat(el.dataset.val);
      var scope = el.dataset.scope,activityType=null,activityRating=null,activityExtra={};
      if(scope==='overall'){
        entry.rating = (entry.rating===val) ? null : val;
        activityType='rating_series';activityRating=entry.rating;
      }else if(scope==='season'){
        var sKey = el.dataset.season;
        entry.seasonRatings = entry.seasonRatings || {};
        entry.seasonRatings[sKey] = (entry.seasonRatings[sKey]===val) ? null : val;
        activityType='rating_season';activityRating=entry.seasonRatings[sKey];activityExtra.season=Number(sKey);
      }else if(scope==='episode'){
        var eKey = el.dataset.season + '-' + el.dataset.episode;
        entry.episodeRatings = entry.episodeRatings || {};
        entry.episodeRatings[eKey] = (entry.episodeRatings[eKey]===val) ? null : val;
        activityType='rating_episode';activityRating=entry.episodeRatings[eKey];activityExtra.season=Number(el.dataset.season);activityExtra.episode=Number(el.dataset.episode);
      }
      entry.dateUpdated = new Date().toISOString();
      bumpTrending(entry.catalogId,'rating');
      saveData();
      syncEntryToSupabase(entry).then(function(){loadSeriesCommunity(entry.catalogId);});
      if(activityType&&activityRating!=null){activityExtra.rating=activityRating;publishActivity(activityType,entry,activityExtra);}
      renderMainViewOnly();
      renderModalPreserveScroll();
    }
    else if(action==='toggle-season'){
      var key=el.dataset.key; expandedSeasons[key]=!expandedSeasons[key]; renderModalPreserveScroll(); var sc=getCatalog(state.modalCatalogId),sn=parseInt(key.split('-').pop(),10); if(expandedSeasons[key]&&sc&&tmdbConfigured()){loadTmdbSeries(sc).then(function(){return loadTmdbSeason(sc,sn);}).then(function(){if(state.modalCatalogId===sc.id)renderModalPreserveScroll();}).catch(function(){if(state.modalCatalogId===sc.id)renderModalPreserveScroll();});}
    }
    else if(action==='premium-format'){
      if(!hasPro()){openProView('avaliacoes');return;}
      var epf=getEntry(el.dataset.catalog); if(!epf) return;
      epf.premiumRating=epf.premiumRating||{format:'classic',value:null,reactions:[]}; epf.premiumRating.format=el.dataset.format; epf.dateUpdated=new Date().toISOString();
      if(epf.premiumRating.format!=='reactions') epf.premiumRating.reactions=[];
      saveData(); syncEntryToSupabase(epf); renderModalPreserveScroll();
    }
    else if(action==='premium-value'){
      if(!hasPro()){openProView('avaliacoes');return;}
      var epv=getEntry(el.dataset.catalog); if(!epv) return; epv.premiumRating=epv.premiumRating||{format:'berry',value:null,reactions:[]}; epv.premiumRating.format='berry'; var berry=parseFloat(el.dataset.value); epv.premiumRating.value=(epv.premiumRating.value===berry?null:berry); epv.dateUpdated=new Date().toISOString(); saveData(); syncEntryToSupabase(epv); if(epv.premiumRating.value!=null)publishActivity('special_rating',epv,{payload:specialActivityPayload(epv)}); bumpTrending(epv.catalogId,'pro_rating'); renderModalPreserveScroll();
    }
    else if(action==='premium-reaction'){
      if(!hasPro()){openProView('avaliacoes');return;}
      var epr=getEntry(el.dataset.catalog); if(!epr) return; epr.premiumRating=epr.premiumRating||{format:'reactions',value:null,reactions:[]}; epr.premiumRating.format='reactions'; epr.premiumRating.reactions=Array.isArray(epr.premiumRating.reactions)?epr.premiumRating.reactions:[]; var reaction=el.dataset.reaction,ri=epr.premiumRating.reactions.indexOf(reaction); if(ri>-1)epr.premiumRating.reactions.splice(ri,1);else epr.premiumRating.reactions.push(reaction); epr.dateUpdated=new Date().toISOString(); saveData(); syncEntryToSupabase(epr); if(epr.premiumRating.reactions.length)publishActivity('special_rating',epr,{payload:specialActivityPayload(epr)}); bumpTrending(epr.catalogId,'pro_rating'); renderModalPreserveScroll();
    }
    else if(action==='criteria-value'){
      if(!hasPro()){openProView('avaliacoes');return;}
      var ce=getEntry(el.dataset.catalog);if(!ce)return;ensureEvaluationExtras(ce);
      var ck=el.dataset.criterion,cv=Number(el.dataset.value);
      ce.criteriaRatings[ck]=Number(ce.criteriaRatings[ck])===cv?null:cv;
      ce.dateUpdated=new Date().toISOString();
      saveData();syncEntryToSupabase(ce).then(function(){loadSeriesCommunity(ce.catalogId);});if(ce.criteriaRatings[ck]!=null){publishActivity('special_rating',ce,{payload:specialActivityPayload(ce)});bumpTrending(ce.catalogId,'pro_criteria');}renderModalPreserveScroll();
    }
    else if(action==='toggle-badge'){
      if(!hasPro()){openProView('avaliacoes');return;}
      var be=getEntry(el.dataset.catalog);if(!be)return;ensureEvaluationExtras(be);
      var badge=el.dataset.badge,bi=be.badges.indexOf(badge);
      if(bi>-1)be.badges.splice(bi,1);else be.badges.push(badge);
      be.dateUpdated=new Date().toISOString();
      saveData();syncEntryToSupabase(be).then(function(){loadSeriesCommunity(be.catalogId);});if(be.badges.indexOf(badge)>-1){publishActivity('special_rating',be,{payload:specialActivityPayload(be)});bumpTrending(be.catalogId,'pro_badge');}renderModalPreserveScroll();
    }
    else if(action==='reveal-spoiler'){
      var rvData=state.seriesCommunity[el.dataset.catalog];
      var rvIndex=Number(el.dataset.reviewIndex)||0;
      var rv=rvData&&rvData.top_reviews&&rvData.top_reviews[rvIndex];
      if(rv){state.revealedSpoilers[spoilerKey(el.dataset.catalog,rv,rvIndex)]=true;renderModalPreserveScroll();}
    }
else if(action==='edit-profile'){
      state.userProfileOpen=null;state.userProfileData=null;state.professionalOpen=null;state.characterOpen=null;state.modalCatalogId=null;state.query='';state.profile.editing=false;state.view='editar-perfil';render();
    }
    else if(action==='back-to-profile'){state.profile.editing=false;state.view='perfil';render();}
    else if(action==='set-theme'){
      var selectedTheme=normalizeTheme(el.dataset.theme);
      state.profile.nameStyle=Object.assign({color:null,effect:'none',theme:'dark'},state.profile.nameStyle||{});
      state.profile.nameStyle.theme=selectedTheme;
      applyThemePreference(selectedTheme);
      var themeSwitch=document.getElementById('themeSwitch');
      if(themeSwitch){
        themeSwitch.classList.toggle('is-light',selectedTheme==='light');
        themeSwitch.classList.toggle('is-dark',selectedTheme==='dark');
        themeSwitch.querySelectorAll('.theme-switch-option').forEach(function(btn){
          var active=btn.dataset.theme===selectedTheme;
          btn.classList.toggle('active',active);
          btn.setAttribute('aria-checked',active?'true':'false');
        });
      }
      var themeStatusText=document.getElementById('themeStatusText');
      if(themeStatusText)themeStatusText.textContent=selectedTheme==='light'?'Claro':'Escuro';
      var themePaletteDots=document.getElementById('themePaletteDots');
      if(themePaletteDots){themePaletteDots.classList.toggle('light',selectedTheme==='light');themePaletteDots.classList.toggle('dark',selectedTheme==='dark');}
      saveData();syncProfileToSupabase();
    }
    else if(action==='save-profile'){
      var pu=document.getElementById('profileUsername'),pb=document.getElementById('profileBio');
      if(pu)state.profile.username=pu.value.trim(); if(pb)state.profile.bio=pb.value.trim();
      if(hasPro()){ var nc=document.getElementById('profileNameColor'),ne=document.getElementById('profileNameEffect'); state.profile.nameStyle=Object.assign({color:null,effect:'none',theme:'dark'},state.profile.nameStyle||{}); if(nc)state.profile.nameStyle.color=nc.value; if(ne)state.profile.nameStyle.effect=ne.value||'none'; }
      state.profile.editing=false; state.view='perfil'; saveData(); syncProfileToSupabase(); render();
    }
    else if(action==='choose-banner'){ if(!hasPro()){alert('Banner é exclusivo do Bingeo Pro.');return;} document.getElementById('bannerInput').click(); }
    else if(action==='remove-banner'){ if(!hasPro()){alert('Banner é exclusivo do Bingeo Pro.');return;} state.profile.banner=null; saveData(); syncProfileToSupabase(); render(); }
    else if(action==='choose-avatar'){ document.getElementById('avatarInput').click(); }
    else if(action==='clear-name-color'){ if(!hasPro()){alert('Personalização do nome é exclusiva do Bingeo Pro.');return;} state.profile.nameStyle=state.profile.nameStyle||{}; state.profile.nameStyle.color=null; var c=document.getElementById('profileNameColor'); if(c)c.value=normalizeTheme(state.profile.nameStyle.theme)==='light'?'#181A23':'#ECEBF3'; }
    else if(action==='add-social'){
      if(!hasPro()){alert('Links sociais são exclusivos do Bingeo Pro.');return;}
      var sp=document.getElementById('socialPlatform'),su=document.getElementById('socialUrl'); var url=normalizeSocialUrl(su?su.value:'');
      if(!url || !validSocialUrl(url)){alert('Informe uma URL HTTP/HTTPS válida.');return;}
      state.profile.socialLinks=Array.isArray(state.profile.socialLinks)?state.profile.socialLinks:[];
      state.profile.socialLinks.push({id:uid(),platform:sp?sp.value:'website',url:url}); if(su)su.value=''; saveData(); syncProfileToSupabase(); render();
    }
    else if(action==='remove-social'){ if(!hasPro()){alert('Links sociais são exclusivos do Bingeo Pro.');return;} var si=parseInt(el.dataset.index,10); if(Array.isArray(state.profile.socialLinks)){state.profile.socialLinks.splice(si,1);saveData();syncProfileToSupabase();render();} }
    else if(action==='tmdb-retry'){var rc=getCatalog(el.dataset.catalog);if(rc)loadTmdbSeries(rc,true).then(function(){renderModalPreserveScroll();}).catch(function(){renderModalPreserveScroll();});}
    else if(action==='demo-pro'){ state.profile.plan='pro'; saveData(); syncProfileToSupabase(); render(); }
    else if(action==='demo-free'){ var keepTheme=normalizeTheme(state.profile.nameStyle&&state.profile.nameStyle.theme),keepHighlights=normalizeProfileHighlights(state.profile.nameStyle&&state.profile.nameStyle.highlights,state.profile.topCharacters); state.profile.plan='free'; state.profile.banner=null; state.profile.nameStyle={color:null,effect:'none',theme:keepTheme,highlights:keepHighlights}; state.profile.socialLinks=[]; saveData(); syncProfileToSupabase(); render(); }
    else if(action==='remove-avatar'){ state.profile.photo=null; saveData(); syncProfileToSupabase(); render(); }
    else if(action==='toggle-fav'){
      var en2 = getEntry(el.dataset.catalog);
      if(en2){
        en2.favorite = !en2.favorite;
        if(en2.favorite) bumpTrending(en2.catalogId,'favorite');
        en2.dateUpdated=new Date().toISOString();
        saveData(); syncEntryToSupabase(en2); renderMainViewOnly(); renderModalPreserveScroll();
      }
    }
    else if(action==='log-today'){
      var en3 = getEntry(el.dataset.catalog);
      if(en3){
        var diarySeries={ id:uid(), type:'series', catalogId:en3.catalogId, date:todayIso(), note:'', rating:en3.rating };
        state.diary.unshift(diarySeries);
        publishActivity('diary_series',en3,{rating:en3.rating,payload:{diary_id:diarySeries.id}});
        bumpTrending(en3.catalogId,'diary');
        saveData(); render();
      }
    }
    else if(action==='log-episode'){
      var cidEp = el.dataset.catalog, sNumEp = parseInt(el.dataset.season,10), eNumEp = parseInt(el.dataset.episode,10);
      var entryEp = ensureEntry(cidEp, 'assistindo');
      var epKeyLog = sNumEp + '-' + eNumEp;
      var epRatingLog = (entryEp.episodeRatings && entryEp.episodeRatings[epKeyLog]!=null) ? entryEp.episodeRatings[epKeyLog] : null;
      var noteInputEl = el.dataset.noteInput ? document.getElementById(el.dataset.noteInput) : null;
      var noteVal = noteInputEl ? noteInputEl.value.trim() : '';
      var diaryEpisode={ id:uid(), type:'episode', catalogId:cidEp, season:sNumEp, episode:eNumEp, date:todayIso(), note:noteVal, rating:epRatingLog };
      state.diary.unshift(diaryEpisode);
      publishActivity('diary_episode',entryEp,{season:sNumEp,episode:eNumEp,rating:epRatingLog,payload:{diary_id:diaryEpisode.id,has_note:!!noteVal,note:noteVal}});
      bumpTrending(cidEp,'diary');
      entryEp.dateUpdated=new Date().toISOString();
      saveData(); syncEntryToSupabase(entryEp); renderMainViewOnly(); renderModalPreserveScroll();
    }
    else if(action==='save-review'){
      var en4 = getEntry(el.dataset.catalog);
      var ta = document.getElementById('reviewText');
      if(en4 && ta){
        en4.review = ta.value;
        if(hasPro())en4.proReview=readProReviewForm(en4);
        var sl=document.getElementById('spoilerLevel'),ss=document.getElementById('spoilerSeason'),se=document.getElementById('spoilerEpisode');
        en4.spoilerLevel=sl?sl.value:'none';
        en4.spoilerSeason=en4.spoilerLevel==='episode'&&ss&&ss.value?Number(ss.value):null;
        en4.spoilerEpisode=en4.spoilerLevel==='episode'&&se&&se.value?Number(se.value):null;
        en4.dateUpdated=new Date().toISOString();
        var hasReviewContent=!!ta.value.trim() || (hasPro()&&proReviewHasContent(en4.proReview));
        if(hasReviewContent) bumpTrending(en4.catalogId,'review');
        saveData(); syncEntryToSupabase(en4).then(function(){loadSeriesCommunity(en4.catalogId);}); if(hasReviewContent)publishActivity('review',en4,{rating:en4.rating,payload:{spoiler_level:en4.spoilerLevel,spoiler_season:en4.spoilerSeason,spoiler_episode:en4.spoilerEpisode,pro_review:normalizeProReview(en4.proReview||{})}}); renderMainViewOnly(); renderModalPreserveScroll();
      }
    }
    else if(action==='delete-diary'){
      state.diary = state.diary.filter(function(d){ return d.id!==el.dataset.entry; });
      saveData(); render();
    }
    else if(action==='open-list-create'){
      if(!canCreateList()){alert('Você atingiu o limite de 10 listas do plano Free. O Bingeo Pro tem listas ilimitadas.');return;}
      state.listOpen=null;state.listCreateOpen=true;render();
    }
    else if(action==='open-list'){ state.listCreateOpen=false;state.listOpen=el.dataset.list; var openedList=state.lists.find(function(l){return l.id===state.listOpen;}); render(); if(openedList&&!openedList.isSharedPublic)loadListExtras(openedList).then(function(){if(state.listOpen===openedList.id)renderMainViewOnly();}); }
    else if(action==='back-to-lists'){ state.listOpen=null;state.listCreateOpen=false;render(); }
    else if(action==='share-list'){
      var shareList=state.lists.find(function(l){return l.id===el.dataset.list;});
      if(shareList)shareBingeoList(shareList);
    }
    else if(action==='delete-list'){
      if(confirm('Excluir esta lista? Os títulos não serão removidos da sua estante.')){
        var deleting=state.lists.find(function(l){return l.id===el.dataset.list;});
        state.lists=state.lists.filter(function(l){return l.id!==el.dataset.list;});
        state.listOpen=null;
        saveData();if(deleting)deleteListFromSupabase(deleting);render();
      }
    }
    else if(action==='toggle-show-in-list'){
      var list = state.lists.find(function(l){ return l.id===el.dataset.list; });
      if(list){
        var sid = el.dataset.catalog;
        var idx = list.showIds.indexOf(sid);
        if(idx>-1) list.showIds.splice(idx,1); else list.showIds.push(sid);
        list.updatedAt=new Date().toISOString();
        saveData();syncListToSupabase(list);render();
      }
    }
    else if(action==='toggle-list-public'){
      var vl=state.lists.find(function(l){return l.id===el.dataset.list;});if(!vl)return;
      vl.visibility=vl.visibility==='public'?'private':'public';vl.updatedAt=new Date().toISOString();
      saveData();syncListToSupabase(vl);renderMainViewOnly();
    }
    else if(action==='toggle-list-comments'){
      var cl=state.lists.find(function(l){return l.id===el.dataset.list;});if(!cl)return;
      cl.allowComments=cl.allowComments===false;cl.updatedAt=new Date().toISOString();
      saveData();syncListToSupabase(cl);renderMainViewOnly();
    }
else if(action==='choose-list-cover'){
      state.listCoverTarget=el.dataset.list;document.getElementById('listCoverInput').click();
    }
    else if(action==='remove-collaborator'){
      var rlist=state.lists.find(function(l){return l.id===el.dataset.list;});if(!rlist)return;
      supabaseClient.rpc('remove_list_collaborator_by_username',{p_list_client_id:rlist.id,p_username:el.dataset.username}).then(function(result){
        if(result.error)throw result.error;
        return loadListExtras(rlist);
      }).then(renderMainViewOnly).catch(function(err){alert(err.message||'Não foi possível remover o colaborador.');});
    }
    else if(action==='top5-art-picker'){
      if(!hasPro()){openProView('top5-poster');return;}
      var seriesArtId=el.dataset.catalog,seriesArtCat=getCatalog(seriesArtId);if(!seriesArtCat)return;
      state.seriesArtPickerId=state.seriesArtPickerId===seriesArtId?null:seriesArtId;
      state.characterArtPickerKey=null;
      render();
      if(state.seriesArtPickerId)loadSeriesArtworkOptions(seriesArtCat);
    }
    else if(action==='close-series-art-picker'){state.seriesArtPickerId=null;render();}
    else if(action==='top5-select-art'){
      if(!hasPro())return;
      var artCatalog=el.dataset.catalog,artValue=el.dataset.value||el.dataset.path||'';
      var allowedOptions=state.seriesArtworkOptions[artCatalog]||[];
      if(artValue&&!allowedOptions.some(function(opt){return opt&&opt.value===artValue;}))return;
      state.profile.topFiveArtwork=state.profile.topFiveArtwork||{};
      if(artValue)state.profile.topFiveArtwork[artCatalog]=artValue;
      else delete state.profile.topFiveArtwork[artCatalog];
      saveData();syncProfileToSupabase();render();
    }
    else if(action==='toggle-top5-editor'){ top5EditorOpen = !top5EditorOpen; if(!top5EditorOpen)state.seriesArtPickerId=null; render(); }
    else if(action==='top5-add'){
      if(state.profile.topFive.filter(Boolean).length<5){
        var emptyIdx = -1;
        for(var i=0;i<5;i++){ if(!state.profile.topFive[i]){ emptyIdx=i; break; } }
        if(emptyIdx===-1) state.profile.topFive.push(el.dataset.catalog);
        else state.profile.topFive[emptyIdx] = el.dataset.catalog;
        saveData(); syncProfileToSupabase(); render();
      }
    }
    else if(action==='top5-remove'){
      var idx2 = parseInt(el.dataset.index,10);
      var removedTop5=state.profile.topFive[idx2];
      state.profile.topFive[idx2] = null;
      if(removedTop5&&state.profile.topFiveArtwork)delete state.profile.topFiveArtwork[removedTop5];
      if(state.seriesArtPickerId===removedTop5)state.seriesArtPickerId=null;
      saveData(); syncProfileToSupabase(); render();
    }
    else if(action==='top5-move'){
      var idx3 = parseInt(el.dataset.index,10);
      var dir = el.dataset.dir;
      var swapWith = dir==='up' ? idx3-1 : idx3+1;
      if(swapWith<0 || swapWith>4) return;
      var tmp = state.profile.topFive[idx3];
      state.profile.topFive[idx3] = state.profile.topFive[swapWith];
      state.profile.topFive[swapWith] = tmp;
      saveData(); syncProfileToSupabase(); render();
    }
    else if(action==='remove-avatar'){
      state.profile.photo = null;
      saveData(); syncProfileToSupabase(); render();
    }
  });

  