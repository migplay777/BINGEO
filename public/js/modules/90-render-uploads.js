/* ---------------- master render ---------------- */
  function closeHeaderProfileMenu(){
    var menu=document.getElementById('headerProfileMenu'),btn=document.getElementById('headerProfileBtn');
    if(menu)menu.hidden=true;
    if(btn)btn.setAttribute('aria-expanded','false');
  }
  function setHeaderProfileMenu(open){
    var menu=document.getElementById('headerProfileMenu'),btn=document.getElementById('headerProfileBtn');
    if(menu)menu.hidden=!open;
    if(btn)btn.setAttribute('aria-expanded',open?'true':'false');
  }
  function renderHeaderAccount(){
    var profile=state.profile||{},photo=profile.photo||'',username=profile.username||'Seu perfil';
    var initials=username.trim()?username.trim().charAt(0).toUpperCase():'?';
    ['headerProfileAvatar','accountMenuAvatar'].forEach(function(id){
      var avatar=document.getElementById(id);if(!avatar)return;
      avatar.style.backgroundImage=photo?'url("'+String(photo).replace(/"/g,'%22')+'")':'';
      avatar.textContent=photo?'':initials;
    });
    var nameEl=document.getElementById('accountMenuUsername');if(nameEl)nameEl.textContent=username;
    var planEl=document.getElementById('accountMenuPlan');if(planEl)planEl.textContent=hasPro()?'✦ Bingeo Pro':'Plano gratuito';
    var menuPro=document.getElementById('accountProCard');if(menuPro)menuPro.hidden=hasPro();
  }
  function render(){
    renderHeaderAccount();
    document.querySelectorAll('#navLinks .nav-link').forEach(function(btn){
      btn.classList.toggle('active', btn.dataset.view===state.view);
    });
    renderTicker();
    var searchWrap=document.querySelector('.search-wrap');
    if(searchWrap)searchWrap.hidden=state.view!=='descobrir'||!!state.characterOpen||!!state.userProfileOpen||!!state.professionalOpen;
    var root = document.getElementById('viewRoot');
    if(state.characterOpen) root.innerHTML = viewCharacter();
    else if(state.userProfileOpen) root.innerHTML = viewBingeoUserProfile();
    else if(state.professionalOpen) root.innerHTML = viewProfessional();
    else if(state.view==='home') root.innerHTML = viewHome();
    else if(state.view==='descobrir') root.innerHTML = viewDescobrir();
    else if(state.view==='estante') root.innerHTML = viewEstante();
    else if(state.view==='diario') root.innerHTML = viewDiario();
    else if(state.view==='listas') root.innerHTML = viewListas();
    else if(state.view==='perfil') root.innerHTML = viewPerfil();
    else if(state.view==='editar-perfil') root.innerHTML = viewEditarPerfil();
    else if(state.view==='pro') root.innerHTML = viewPro();
    renderModal();
    bindFormsForCurrentView();
    if(state.professionalOpen||state.userProfileOpen||state.characterOpen)return;
    if(tmdbConfigured()){var visible=[];if(state.view==='home'){var homeIds=Object.keys(state.trending).sort(function(a,b){return state.trending[b]-state.trending[a];}).slice(0,8);visible=homeIds.map(getCatalog).filter(Boolean);}else if(state.view==='descobrir'){visible=discoverPopularCatalogs().filter(Boolean).slice(0,12);}else if(state.view==='estante'){visible=state.entries.slice(0,8).map(function(e){return getCatalog(e.catalogId);});}else if(state.view==='perfil'){visible=state.profile.topFive.filter(Boolean).slice(0,5).map(getCatalog);}hydrateCatalogs(visible);}
  }

  function renderTicker(){
    var watching = state.entries.filter(function(e){ return e.status==='assistindo'; });
    var bar = document.getElementById('tickerBar');
    if(watching.length===0){
      bar.innerHTML = '<span class="no-live">Nada no ar agora — adicione algo que você está assistindo</span>';
      return;
    }
    var items = watching.map(function(e){
      var cat = getCatalog(e.catalogId);
      if(!cat) return '';
      return '<span class="ticker-item"><span class="live-dot"></span>' + escapeHtml(cat.title) + '</span>';
    }).join('');
    bar.innerHTML = '<div class="ticker-track' + (watching.length<3?' slow':'') + '">' + items + items + '</div>';
  }

  function bindFormsForCurrentView(){
    var nl = document.getElementById('newListForm');
    if(nl){
      nl.addEventListener('submit', function(e){
        e.preventDefault();
        var fd = new FormData(nl);
        var name = (fd.get('name')||'').trim();
        if(!name) return;
        if(!canCreateList()){ alert('O plano gratuito permite até 10 listas próprias. O Bingeo Pro tem listas ilimitadas.'); return; }
        var nowIso = new Date().toISOString();
        var newList={
          id:uid(),name:name,description:(fd.get('description')||'').trim(),showIds:[],
          owner:state.profile.username||null,ownerUserId:currentUserId,isOwner:true,isCollaborator:false,visibility:String(fd.get('visibility')||'private')==='public'?'public':'private',
          coverUrl:null,shareSlug:makeShareSlug(name),allowComments:true,collaborators:[],comments:[],
          createdAt:nowIso,updatedAt:nowIso
        };
        state.lists.unshift(newList);
        state.listCreateOpen=false;
        state.listOpen=newList.id;
        saveData();syncListToSupabase(newList);render();
      });
    }
    var listMetadataForm=document.getElementById('listMetadataForm');
    if(listMetadataForm){
      listMetadataForm.addEventListener('submit',function(e){
        e.preventDefault();
        var list=state.lists.find(function(l){return l.id===state.listOpen;});
        if(!list)return;
        var fd=new FormData(listMetadataForm),name=String(fd.get('name')||'').trim(),desc=String(fd.get('description')||'').trim();
        if(!name)return;
        list.name=name;list.description=desc;list.updatedAt=new Date().toISOString();
        saveData();syncListToSupabase(list);renderMainViewOnly();
      });
    }
    var collabForm=document.getElementById('listCollaboratorForm');
    if(collabForm){
      collabForm.addEventListener('submit',function(e){
        e.preventDefault();
        var list=state.lists.find(function(l){return l.id===state.listOpen;});
        var fd=new FormData(collabForm),username=String(fd.get('username')||'').trim().replace(/^@/,'');
        if(!list||!username)return;
        syncListToSupabase(list).then(function(){
          return supabaseClient.rpc('add_list_collaborator_by_username',{p_list_client_id:list.id,p_username:username});
        }).then(function(result){
          if(result.error)throw result.error;
          alert((result.data&&result.data.message)||'Colaborador atualizado.');
          return loadListExtras(list);
        }).then(renderMainViewOnly).catch(function(err){alert(err.message||'Não foi possível adicionar o colaborador.');});
      });
    }
    var listCommentForm=document.getElementById('listCommentForm');
    if(listCommentForm){
      listCommentForm.addEventListener('submit',function(e){
        e.preventDefault();
        var list=state.lists.find(function(l){return l.id===state.listOpen;});
        var fd=new FormData(listCommentForm),body=String(fd.get('comment')||'').trim();
        if(!list||!body)return;
        supabaseClient.rpc('add_list_comment',{p_list_client_id:list.id,p_body:body}).then(function(result){
          if(result.error)throw result.error;
          if(result.data&&!result.data.ok)throw new Error(result.data.message||'Não foi possível comentar.');
          return loadListExtras(list);
        }).then(renderMainViewOnly).catch(function(err){alert(err.message||'Não foi possível publicar o comentário.');});
      });
    }
    var spoilerLevelSel=document.getElementById('spoilerLevel');
    if(spoilerLevelSel){
      spoilerLevelSel.addEventListener('change',function(){
        var enabled=spoilerLevelSel.value==='episode';
        var ss=document.getElementById('spoilerSeason'),se=document.getElementById('spoilerEpisode');
        if(ss)ss.disabled=!enabled;if(se)se.disabled=!enabled;
      });
    }
    var searchInput = document.getElementById('searchInput');
    if(searchInput){
      searchInput.value=state.query;
      if(!searchInput.dataset.bingeoSearchBound){
        searchInput.dataset.bingeoSearchBound='1';
        searchInput.addEventListener('input',function(){
          if(state.professionalOpen||state.userProfileOpen||state.characterOpen){
            state.professionalOpen=null;state.professionalData=null;state.professionalError='';state.professionalRoleTab=null;state.professionalHydrating=false;state.professionalLoading=false;
            state.characterOpen=null;state.characterData=null;state.characterError='';state.characterLoading=false;
            state.userProfileOpen=null;state.userProfileData=null;state.userProfileError='';state.userProfileLoading=false;state.view='descobrir';
          }
          if(state.view!=='descobrir')return;
          state.query=searchInput.value; var pos=searchInput.selectionStart; clearTimeout(tmdbSearchTimer);
          if(state.query.trim()){
            state.tmdbSearchLoading=true;state.tmdbSearchError='';state.tmdbSearchResults=[];state.tmdbPersonResults=[];state.characterSearchResults=[];state.userSearchResults=[];var req=++state.tmdbSearchRequest;
            var root=document.getElementById('viewRoot');root.innerHTML=viewDescobrir();
            tmdbSearchTimer=setTimeout(function(){
              var queryAtRequest=state.query.trim();
              var tvTask=tmdbConfigured()?tmdbSearchTV(queryAtRequest):Promise.resolve([]);
              var peopleTask=tmdbConfigured()?tmdbSearchPeople(queryAtRequest):Promise.resolve([]);
              var characterTask=searchBingeoCharacters(queryAtRequest);
              Promise.allSettled([tvTask,peopleTask,characterTask,searchBingeoUsers(queryAtRequest)]).then(function(results){
                if(req!==state.tmdbSearchRequest)return;
                state.tmdbSearchResults=results[0].status==='fulfilled'?(results[0].value||[]):[];
                state.tmdbPersonResults=results[1].status==='fulfilled'?(results[1].value||[]):[];
                state.characterSearchResults=results[2].status==='fulfilled'?(results[2].value||[]):[];
                state.userSearchResults=results[3].status==='fulfilled'?(results[3].value||[]):[];
                hydrateCharacterSearchArtwork(state.characterSearchResults);
                var failures=results.filter(function(x){return x.status==='rejected';});
                state.tmdbSearchError=failures.length===results.length?(failures[0].reason&&failures[0].reason.message||'Erro ao buscar.'):'';
                state.tmdbSearchLoading=false;
                if(state.view==='descobrir'&&!state.professionalOpen&&!state.userProfileOpen&&!state.characterOpen){
                  var searchRoot=document.getElementById('viewRoot');
                  searchRoot.innerHTML=viewDescobrir();
                  var ni=document.getElementById('searchInput');if(ni){ni.focus();ni.setSelectionRange(pos,pos);}
                }
              });
            },350);
          }else{
            state.tmdbSearchRequest++;
            state.tmdbSearchLoading=false;state.tmdbSearchResults=[];state.tmdbPersonResults=[];state.characterSearchResults=[];state.userSearchResults=[];state.tmdbSearchError='';
            var r2=document.getElementById('viewRoot');
            if(state.view==='descobrir')r2.innerHTML=viewDescobrir();
            else if(state.view==='estante')r2.innerHTML=viewEstante();
            else if(state.view==='listas'){r2.innerHTML=viewListas();bindFormsForCurrentView();}
            var ni2=document.getElementById('searchInput');if(ni2){ni2.focus();ni2.setSelectionRange(pos,pos);}
          }
        });
      }
    }
    var avatarBtn = document.getElementById('avatarBtn');
    var avatarEditBtn = document.getElementById('avatarEditBtn');
    if(avatarBtn){ avatarBtn.addEventListener('click', function(){ document.getElementById('avatarInput').click(); }); }
    if(avatarEditBtn){ avatarEditBtn.addEventListener('click', function(){ document.getElementById('avatarInput').click(); }); }
  }

  /* ---------------- avatar/banner upload ---------------- */
  function safeImageUpload(file,maxBytes){
    if(!file)return false;
    var allowed=['image/jpeg','image/png','image/webp','image/gif'];
    if(allowed.indexOf(String(file.type||'').toLowerCase())===-1)return false;
    return Number(file.size||0)>0&&Number(file.size||0)<=Number(maxBytes||8*1024*1024);
  }
  function readAndResizeImage(file){
    return new Promise(function(resolve, reject){
      if(file && file.type==='image/gif' && hasPro()){
        var gifReader = new FileReader();
        gifReader.onload=function(ev){resolve(ev.target.result);};
        gifReader.onerror=reject;
        gifReader.readAsDataURL(file);
        return;
      }
      var reader = new FileReader();
      reader.onload = function(ev){
        var img = new Image();
        img.onload = function(){
          var size = 300;
          var canvas = document.createElement('canvas');
          canvas.width = size; canvas.height = size;
          var ctx = canvas.getContext('2d');
          var scale = Math.max(size/img.width, size/img.height);
          var w = img.width*scale, h = img.height*scale;
          ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = reject;
        img.src = ev.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  function readImage(file){return new Promise(function(resolve,reject){var r=new FileReader();r.onload=function(e){resolve(e.target.result);};r.onerror=reject;r.readAsDataURL(file);});}
  document.getElementById('avatarInput').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0];
    if(!file) return;
    if(!safeImageUpload(file,8*1024*1024)){alert('Use JPG, PNG, WEBP ou GIF de até 8 MB.');e.target.value='';return;}
    if(file.type==='image/gif' && !hasPro()){ alert('GIF na foto de perfil é exclusivo do Bingeo Pro.'); e.target.value=''; return; }
    readAndResizeImage(file).then(function(dataUrl){
      state.profile.photo = dataUrl;
      saveData(); syncProfileToSupabase(); render();
    }).catch(function(err){ console.error('Erro ao processar imagem', err); });
    e.target.value = '';
  });
  document.getElementById('bannerInput').addEventListener('change', function(e){
    var file=e.target.files&&e.target.files[0]; if(!file)return;
    if(!hasPro()){alert('Banner é exclusivo do Bingeo Pro.');e.target.value='';return;}
    if(!safeImageUpload(file,8*1024*1024)){alert('Use JPG, PNG, WEBP ou GIF de até 8 MB.');e.target.value='';return;}
    readImage(file).then(function(data){state.profile.banner=data;saveData();syncProfileToSupabase();render();}).catch(function(err){console.error('Erro ao processar banner',err);});
    e.target.value='';
  });
  function resizeListCoverBlob(file){
    return new Promise(function(resolve,reject){
      var reader=new FileReader();
      reader.onload=function(ev){
        var img=new Image();
        img.onload=function(){
          var w=1200,h=675,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
          var ctx=canvas.getContext('2d'),scale=Math.max(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;
          ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);
          canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('Não foi possível processar a capa.'));},'image/jpeg',0.86);
        };
        img.onerror=reject;img.src=ev.target.result;
      };
      reader.onerror=reject;reader.readAsDataURL(file);
    });
  }
  document.getElementById('listCoverInput').addEventListener('change',function(e){
    var file=e.target.files&&e.target.files[0],list=state.lists.find(function(l){return l.id===state.listCoverTarget;});
    e.target.value='';if(!file||!list||!currentUserId)return;
    if(!safeImageUpload(file,12*1024*1024)){alert('Use JPG, PNG, WEBP ou GIF de até 12 MB.');return;}
    resizeListCoverBlob(file).then(function(blob){
      var path=currentUserId+'/'+slugify(list.id)+'-'+Date.now()+'.jpg';
      return supabaseClient.storage.from('list-covers').upload(path,blob,{contentType:'image/jpeg',upsert:true}).then(function(result){
        if(result.error)throw result.error;
        var pub=supabaseClient.storage.from('list-covers').getPublicUrl(path);
        list.coverUrl=pub.data.publicUrl;list.updatedAt=new Date().toISOString();
        saveData();return syncListToSupabase(list);
      });
    }).then(renderMainViewOnly).catch(function(err){alert(err.message||'Não foi possível enviar a capa.');});
  });
  function resizeListBannerBlob(file){
    return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(ev){var img=new Image();img.onload=function(){var w=1600,h=520,canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;var ctx=canvas.getContext('2d'),scale=Math.max(w/img.width,h/img.height),dw=img.width*scale,dh=img.height*scale;ctx.drawImage(img,(w-dw)/2,(h-dh)/2,dw,dh);canvas.toBlob(function(blob){blob?resolve(blob):reject(new Error('Não foi possível processar o banner.'));},'image/jpeg',0.88);};img.onerror=reject;img.src=ev.target.result;};reader.onerror=reject;reader.readAsDataURL(file);});
  }
  document.getElementById('listBannerInput').addEventListener('change',function(e){
    var file=e.target.files&&e.target.files[0],list=state.lists.find(function(l){return l.id===state.proListBannerTarget;});e.target.value='';
    if(!file||!list||!currentUserId)return;if(!hasPro()){openProView('lista-banner');return;}if(!safeImageUpload(file,12*1024*1024)){alert('Use JPG, PNG, WEBP ou GIF de até 12 MB.');return;}
    resizeListBannerBlob(file).then(function(blob){var path=currentUserId+'/banner-'+slugify(list.id)+'-'+Date.now()+'.jpg';return supabaseClient.storage.from('list-covers').upload(path,blob,{contentType:'image/jpeg',upsert:true}).then(function(result){if(result.error)throw result.error;var pub=supabaseClient.storage.from('list-covers').getPublicUrl(path);ensureListProSettings(list).bannerUrl=pub.data.publicUrl;list.updatedAt=new Date().toISOString();saveData();return syncListToSupabase(list);});}).then(renderMainViewOnly).catch(function(err){alert(err.message||'Não foi possível enviar o banner.');});
  });


  