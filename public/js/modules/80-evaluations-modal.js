/* ---------------- premium evaluation formats ---------------- */
  /* Amadurecimento da amora: cada estágio representa uma faixa de avaliação
     própria do Bingeo (não é apenas uma escala de estrelas trocada por emoji).
     A barra "berry-vine" cresce conforme o estágio escolhido, o estágio ativo
     ganha destaque visual (escala, brilho, selo) e um rótulo explica o que
     aquele estágio significa. */
  var BERRY_STAGES=[
    {value:1, emoji:'🌱', name:'Broto',         desc:'Muito ruim'},
    {value:2, emoji:'🍃', name:'Brotando',      desc:'Ruim'},
    {value:3, emoji:'🟣', name:'Amadurecendo',  desc:'Mediana'},
    {value:4, emoji:'🫐', name:'Quase no ponto',desc:'Boa'},
    {value:5, emoji:'🍇', name:'No ponto',      desc:'Excelente'}
  ];
  var REACTIONS=['🔥','❤️','😂','😮','😭','🤯','👏','💀'];
  function berryLabHtml(pr, catalogId){
    var stage = BERRY_STAGES.filter(function(b){ return b.value===pr.value; })[0];
    var pct = pr.value ? (pr.value/5)*100 : 0;
    var html = '<div class="berry-lab">';
    html += '<div class="berry-vine"><div class="berry-vine-fill" style="width:' + pct + '%"></div></div>';
    html += '<div class="berry-scale">' + BERRY_STAGES.map(function(b){
      var isActive = pr.value===b.value;
      return (
        '<button class="berry-stage2' + (isActive?' active':'') + '" data-action="premium-value" data-catalog="' + catalogId + '" data-value="' + b.value + '" title="' + b.desc + '">' +
          '<span class="berry-emoji2">' + b.emoji + '</span>' +
          '<span class="berry-name2">' + b.name + '</span>' +
          '<span class="berry-desc2">' + b.desc + '</span>' +
        '</button>'
      );
    }).join('') + '</div>';
    html += '<div class="berry-current-label">' + (stage ? ('Sua amora está <strong>' + stage.name + '</strong> — ' + stage.desc.toLowerCase() + '.') : 'Toque em um estágio para amadurecer sua amora e registrar sua nota.') + '</div>';
    html += '</div>';
    return html;
  }
  var BINGEO_CRITERIA=[
    {key:'story',label:'História'},
    {key:'characters',label:'Personagens'},
    {key:'acting',label:'Atuação'},
    {key:'visual',label:'Visual'},
    {key:'ending',label:'Final'}
  ];
  var BINGEO_BADGES=[
    '🏆 Melhor personagem',
    '✨ Final perfeito',
    '⚡ Maratonei sem parar',
    '📉 Começou bem e desandou',
    '🧠 Não sai da cabeça',
    '🎬 Direção impecável',
    '💔 Me destruiu',
    '😂 Ri demais'
  ];
  function berryStage(value){return BERRY_STAGES.filter(function(b){return Number(b.value)===Number(value);})[0]||null;}
  function ensureEvaluationExtras(entry){
    if(!entry)return;
    entry.criteriaRatings=entry.criteriaRatings&&typeof entry.criteriaRatings==='object'?entry.criteriaRatings:{};
    entry.badges=Array.isArray(entry.badges)?entry.badges:[];
    entry.spoilerLevel=entry.spoilerLevel||'none';
  }
  function criteriaSummaryHtml(criteria){
    criteria=criteria||{};
    return '<div class="criteria-summary">'+BINGEO_CRITERIA.map(function(item){
      var s=berryStage(criteria[item.key]); if(!s)return '';
      return '<span class="criteria-chip">'+s.emoji+' '+escapeHtml(item.label)+' — '+escapeHtml(s.name)+'</span>';
    }).join('')+'</div>';
  }
  function badgesSummaryHtml(badges){
    badges=Array.isArray(badges)?badges:[];
    return badges.length?'<div class="criteria-summary">'+badges.map(function(b){return '<span class="badge-chip">'+escapeHtml(b)+'</span>';}).join('')+'</div>':'';
  }
  function criteriaEvaluationHtml(entry,catalogId){
    ensureEvaluationExtras(entry);
    var html='<div class="criteria-box"><div class="premium-title">DNA da sua avaliação</div><div style="font-size:10.5px;color:var(--text-dim);margin-top:3px;">Avalie o que realmente fez essa série funcionar — ou não.</div>';
    BINGEO_CRITERIA.forEach(function(item){
      html+='<div class="criteria-row"><div class="criteria-label">'+item.label+'</div><div class="criteria-buttons">'+BERRY_STAGES.map(function(s){
        var active=Number(entry.criteriaRatings[item.key])===Number(s.value);
        return '<button class="criteria-btn '+(active?'active':'')+'" data-action="criteria-value" data-catalog="'+catalogId+'" data-criterion="'+item.key+'" data-value="'+s.value+'" title="'+escapeHtml(s.name+' — '+s.desc)+'">'+s.emoji+'</button>';
      }).join('')+'</div></div>';
    });
    html+='<div class="criteria-box"><div class="premium-title">Medalhas da experiência</div><div class="badge-picker">'+BINGEO_BADGES.map(function(b){
      var active=entry.badges.indexOf(b)>-1;
      return '<button class="badge-btn '+(active?'active':'')+'" data-action="toggle-badge" data-catalog="'+catalogId+'" data-badge="'+escapeHtml(b)+'">'+escapeHtml(b)+'</button>';
    }).join('')+'</div></div>';
    return html+'</div>';
  }
  function premiumEvaluationHtml(entry,catalogId){
    ensureEvaluationExtras(entry);
    var pr=entry.premiumRating||{format:'classic',value:null,reactions:[]};
    var fmt=pr.format||'classic';
    var html='<div class="premium-box pro"><div class="premium-header"><span class="premium-title">Avaliação Bingeo</span><span class="pro-badge">✦ PRO</span></div><div class="premium-format-row">';
    ['classic','berry','reactions'].forEach(function(f){
      var labels={classic:'Clássica',berry:'Amadurecimento da amora 🍇',reactions:'Reações'};
      html+='<button class="premium-format-btn '+(fmt===f?'active':'')+'" data-action="premium-format" data-catalog="'+catalogId+'" data-format="'+f+'">'+labels[f]+'</button>';
    });
    html+='</div>';
    if(fmt==='berry')html+=berryLabHtml(pr,catalogId);
    else if(fmt==='reactions'){
      var selected=Array.isArray(pr.reactions)?pr.reactions:[];
      html+='<div class="reaction-row">'+REACTIONS.map(function(r){return '<button class="reaction-btn '+(selected.indexOf(r)>-1?'active':'')+'" data-action="premium-reaction" data-catalog="'+catalogId+'" data-reaction="'+r+'">'+r+'</button>';}).join('')+'</div><div style="margin-top:8px;color:var(--text-dim);font-size:11px;">Escolha uma ou mais reações para a sua avaliação.</div>';
    }else html+='<div style="margin-top:9px;color:var(--text-muted);font-size:11.5px;line-height:1.45;">A nota tradicional continua disponível. Use o DNA da avaliação para explicar melhor o que funcionou.</div>';
    html+=criteriaEvaluationHtml(entry,catalogId);
    return html+'</div>';
  }

  function userEpisodeProgress(catalogId){
    var max={season:0,episode:0};
    state.diary.forEach(function(d){
      if(d.catalogId!==catalogId||d.type!=='episode')return;
      var s=Number(d.season)||0,e=Number(d.episode)||0;
      if(s>max.season||(s===max.season&&e>max.episode))max={season:s,episode:e};
    });
    var entry=getEntry(catalogId);
    if(entry&&entry.episodeRatings){
      Object.keys(entry.episodeRatings).forEach(function(key){
        if(entry.episodeRatings[key]==null)return;
        var parts=key.split('-'),s=Number(parts[0])||0,e=Number(parts[1])||0;
        if(s>max.season||(s===max.season&&e>max.episode))max={season:s,episode:e};
      });
    }
    return max;
  }
  function spoilerKey(catalogId,review,index){return catalogId+'|'+index+'|'+(review.username||'')+'|'+(review.updated_at||'');}
  function canViewCommunityReview(catalogId,review,index){
    if(!review||review.spoiler_level==='none'||!review.spoiler_level)return true;
    if(state.revealedSpoilers[spoilerKey(catalogId,review,index)])return true;
    var entry=getEntry(catalogId);
    if(entry&&entry.status==='completo')return true;
    if(review.spoiler_level==='full')return false;
    var p=userEpisodeProgress(catalogId),rs=Number(review.spoiler_season)||0,re=Number(review.spoiler_episode)||0;
    return p.season>rs||(p.season===rs&&p.episode>=re);
  }
  function spoilerLabel(review){
    if(!review||review.spoiler_level==='none'||!review.spoiler_level)return 'Sem spoilers';
    if(review.spoiler_level==='full')return 'Spoilers da série completa';
    return 'Spoilers até T'+(review.spoiler_season||'?')+'E'+(review.spoiler_episode||'?');
  }
  function communityReviewHtml(review,catalogId,index){
    var unlocked=canViewCommunityReview(catalogId,review,index);
    var rating=review.rating!=null?'★ '+Number(review.rating).toFixed(1):'Sem nota';
    var top='<div class="community-review-top"><span class="community-review-user">@'+escapeHtml(review.username||'usuário')+'</span><span class="card-stars">'+rating+'</span></div>';
    var tags=criteriaSummaryHtml(review.criteria_ratings)+badgesSummaryHtml(review.badges);
    if(!unlocked){
      return '<div class="community-review">'+top+'<div class="spoiler-locked"><strong>'+escapeHtml(spoilerLabel(review))+'</strong><div style="margin:5px 0 8px;">Esta resenha está escondida porque passa do seu progresso registrado.</div><button class="btn btn-ghost btn-sm" data-action="reveal-spoiler" data-catalog="'+catalogId+'" data-review-index="'+index+'">Revelar mesmo assim</button></div></div>';
    }
    return '<div class="community-review">'+top+'<div style="font-size:10px;color:var(--text-dim);margin-top:4px;">'+escapeHtml(spoilerLabel(review))+'</div><div class="community-review-text">'+escapeHtml(review.review||'')+'</div>'+tags+'</div>';
  }
  function seriesCommunityHtml(cat){
    var data=state.seriesCommunity[cat.id];
    if(state.communityLoading[cat.id]&&!data)return '<div class="series-community"><div class="tmdb-loading">Carregando comunidade Bingeo…</div></div>';
    if(!data)return '<div class="series-community"><div class="community-title">Comunidade Bingeo</div><div style="font-size:12px;color:var(--text-muted);margin-top:5px;">As notas, resenhas e listas da comunidade aparecem aqui.</div></div>';
    var dist=data.distribution||{},max=Math.max(1,Number(dist['1']||0),Number(dist['2']||0),Number(dist['3']||0),Number(dist['4']||0),Number(dist['5']||0));
    var distHtml='<div class="rating-dist">'+[5,4,3,2,1].map(function(n){
      var count=Number(dist[String(n)]||0),pct=(count/max)*100;
      return '<span>'+n+'★</span><div class="rating-dist-track"><div class="rating-dist-fill" style="width:'+pct+'%"></div></div><span>'+count+'</span>';
    }).join('')+'</div>';
    var reviews=Array.isArray(data.top_reviews)?data.top_reviews:[];
    var lists=Array.isArray(data.popular_lists)?data.popular_lists:[];
    var html='<div class="series-community"><div class="community-head"><div><div class="community-title">Comunidade Bingeo</div><div style="font-size:10.5px;color:var(--text-dim);margin-top:2px;">O que a comunidade está achando</div></div><div class="community-score">'+(data.avg_rating!=null?Number(data.avg_rating).toFixed(1):'—')+' <small>/ 5 · '+Number(data.rating_count||0)+' avaliações</small></div></div>';
    html+='<div class="community-stat-grid"><div class="community-stat"><strong>'+Number(data.watching_count||0)+'</strong><span>assistindo</span></div><div class="community-stat"><strong>'+Number(data.completed_count||0)+'</strong><span>concluíram</span></div><div class="community-stat"><strong>'+Number(data.abandoned_count||0)+'</strong><span>abandonaram</span></div></div>'+distHtml;
    html+='<div class="community-subtitle">Top reviews</div>'+(reviews.length?reviews.map(function(rv,i){return communityReviewHtml(rv,cat.id,i);}).join(''):'<div style="font-size:12px;color:var(--text-muted);">Ainda não há resenhas públicas para esta série.</div>');
    if(lists.length){
      html+='<div class="community-subtitle">Listas populares com esta série</div><div class="community-list-row">'+lists.map(function(l){
        return '<div class="community-list-card"><strong>'+escapeHtml(l.name||'Lista')+'</strong><span>por @'+escapeHtml(l.owner||'usuário')+' · '+Number(l.item_count||0)+' títulos</span></div>';
      }).join('')+'</div>';
    }
    return html+'</div>';
  }
  async function loadSeriesCommunity(catalogId,rerender){
    if(!catalogId||state.communityLoading[catalogId])return;
    state.communityLoading[catalogId]=true;
    try{
      var result=await supabaseClient.rpc('get_series_community',{p_catalog_id:catalogId});
      if(result.error)throw result.error;
      state.seriesCommunity[catalogId]=result.data||{};
    }catch(e){console.error('Erro ao carregar comunidade da série:',e);}
    finally{
      state.communityLoading[catalogId]=false;
      if(rerender!==false&&state.modalCatalogId===catalogId)renderModalPreserveScroll();
    }
  }

  /* ---------------- modal ---------------- */
  function renderModal(){
    var root = document.getElementById('modalRoot');
    if(!state.modalCatalogId){ root.innerHTML=''; return; }
    var cat = getCatalog(state.modalCatalogId);
    if(!cat){ state.modalCatalogId=null; root.innerHTML=''; return; }
    var entry = getEntry(cat.id);
    var letter = cat.title.trim().charAt(0).toUpperCase();
    var td=cat.tmdbData||{}; var metaLine=[TYPE_LABELS[cat.type],(td.genres&&td.genres[0]&&td.genres[0].name)||cat.genre,(td.first_air_date?td.first_air_date.slice(0,4):cat.year),(td.networks&&td.networks[0]&&td.networks[0].name)||cat.platform].filter(Boolean).join(' · ');

    var tmdbInfo=(tmdbConfigured()&&cat.tmdbLoaded)?tmdbSeriesInfoHtml(cat):(tmdbConfigured()?'<div class="tmdb-loading">Carregando dados do TMDB…</div>':'');
    var communityInfo=seriesCommunityHtml(cat);
    var body;
    if(!entry){
      body = (
        '<div class="modal-title">' + escapeHtml(cat.title) + '</div>' +
        '<div class="modal-sub">' + escapeHtml(metaLine) + '</div>' +
        tmdbInfo +
        communityInfo +
        '<p style="color:var(--text-muted);font-size:13.5px;">Esse título ainda não está na sua estante.</p>' +
        '<button class="btn btn-primary" data-action="add-to-library" data-catalog="' + cat.id + '">Adicionar à minha estante</button>'
      );
    }else{
      var seasonsHtml = cat.seasons.map(function(epCount, idx){
        var seasonNum = idx+1;
        var key = cat.id + '-' + seasonNum;
        var expanded = !!expandedSeasons[key];
        var seasonRating = entry.seasonRatings ? entry.seasonRatings[seasonNum] : null;
        var episodesHtml = '';
        for(var e=1; e<=epCount; e++){
          var epRating = entry.episodeRatings ? entry.episodeRatings[seasonNum+'-'+e] : null;
          var epMeta = getEpisodeMeta(cat.id, seasonNum, e);
          var noteId = 'epnote-' + cat.id + '-' + seasonNum + '-' + e;
          var loggedToday = hasLoggedEpisodeToday(cat.id, seasonNum, e);
          episodesHtml += (
            '<div class="ep-card">' +
              '<div class="ep-card-head">' +
                '<div><span class="ep-num">Ep. ' + (e<10?'0':'') + e + '</span>' +
                '<div class="ep-title">' + escapeHtml(epMeta.title) + '</div></div>' +
                renderStars(epRating, 'sm', 'episode', cat.id, seasonNum, e) +
              '</div>' +
              '<div class="ep-synopsis">' + escapeHtml(epMeta.synopsis) + '</div>' +
              '<div class="ep-card-actions">' +
                '<input type="text" class="ep-note-input" id="' + noteId + '" placeholder="Nota (opcional)">' +
                '<button class="btn btn-ghost btn-sm" data-action="log-episode" data-catalog="' + cat.id + '" data-season="' + seasonNum + '" data-episode="' + e + '" data-note-input="' + noteId + '">Registrar no Diário</button>' +
                (loggedToday ? '<span class="ep-logged-tag">✓ registrado hoje</span>' : '') +
              '</div>' +
            '</div>'
          );
        }
        return (
          '<div class="season-block">' +
            '<div class="season-row">' +
              '<button class="season-toggle' + (expanded?' open':'') + '" data-action="toggle-season" data-key="' + key + '">' +
                '<span class="arrow">▸</span> Temporada ' + seasonNum + ' <span style="color:var(--text-dim);font-weight:400;">(' + epCount + ' eps)</span>' +
              '</button>' +
              renderStars(seasonRating, 'sm', 'season', cat.id, seasonNum) +
            '</div>' +
            '<div class="episodes-wrap" style="display:' + (expanded?'block':'none') + '">' + episodesHtml + '</div>' +
          '</div>'
        );
      }).join('');

      body = (
        '<div class="modal-title">' + escapeHtml(cat.title) + '</div>' +
        '<div class="modal-sub">' + escapeHtml(metaLine) + '</div>' +
        tmdbInfo +
        communityInfo +

        '<div class="field-group">' +
          '<label class="field-label">Status</label>' +
          '<select id="statusSelect" data-catalog="' + escapeHtml(cat.id) + '">' +
            Object.keys(STATUS_LABELS).map(function(k){
              return '<option value="' + k + '"' + (entry.status===k?' selected':'') + '>' + STATUS_LABELS[k] + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +

        '<div class="modal-section">' +
          '<label class="field-label">Sua nota geral</label>' +
          renderStars(entry.rating, 'lg', 'overall', cat.id) +
        '</div>' +

        '<div class="modal-section">' +
          '<label class="field-label">Temporadas e episódios</label>' +
          seasonsHtml +
        '</div>' +

        '<div class="modal-section">' +
          '<button class="fav-toggle' + (entry.favorite?' active':'') + '" data-action="toggle-fav" data-catalog="' + cat.id + '">' +
            (entry.favorite ? '♥ Nos favoritos' : '♡ Adicionar aos favoritos') +
          '</button>' +
        '</div>' +

        '<div class="modal-section">' +
          '<label class="field-label">Formato da avaliação</label>' +
          (hasPro() ? premiumEvaluationHtml(entry, cat.id) : '<div class="premium-box"><div class="premium-header"><span class="premium-title">Avaliações criativas</span><span class="pro-badge">✦ PRO</span></div><div class="premium-locked">Escalas temáticas e reações rápidas são exclusivas do Bingeo Pro. O plano gratuito continua com a avaliação padrão.</div></div>') +
        '</div>' +

        '<div class="modal-section">' +
          '<label class="field-label">Resenha e spoilers</label>' +
          '<div class="spoiler-controls">' +
            '<select id="spoilerLevel"><option value="none" '+((entry.spoilerLevel||'none')==='none'?'selected':'')+'>Sem spoilers</option><option value="episode" '+(entry.spoilerLevel==='episode'?'selected':'')+'>Spoilers até episódio</option><option value="full" '+(entry.spoilerLevel==='full'?'selected':'')+'>Série completa</option></select>' +
            '<input id="spoilerSeason" type="number" min="1" placeholder="Temp." value="'+(entry.spoilerSeason||'')+'" '+(entry.spoilerLevel==='episode'?'':'disabled')+'>' +
            '<input id="spoilerEpisode" type="number" min="1" placeholder="Ep." value="'+(entry.spoilerEpisode||'')+'" '+(entry.spoilerLevel==='episode'?'':'disabled')+'>' +
          '</div>' +
          '<textarea id="reviewText" placeholder="O que você achou?">' + escapeHtml(entry.review||'') + '</textarea>' +
          '<div style="margin-top:8px;" class="inline-actions">' +
            '<button class="btn btn-primary btn-sm" data-action="save-review" data-catalog="' + cat.id + '">Salvar resenha</button>' +
            '<button class="btn btn-ghost btn-sm" data-action="log-today" data-catalog="' + cat.id + '">Registrar hoje no diário</button>' +
          '</div>' +
        '</div>' +

        '<div class="modal-footer">' +
          '<button class="btn btn-danger btn-sm" data-action="remove-entry" data-catalog="' + cat.id + '">Remover da estante</button>' +
          '<div class="inline-actions"><button class="btn btn-ghost btn-sm" data-action="close-modal">Fechar</button></div>' +
        '</div>'
      );
    }

    root.innerHTML = (
      '<div class="modal-overlay" data-action="close-modal-bg">' +
        '<div class="modal">' +
          seriesHeroHtml(cat) +
          '<div class="modal-body">' + body + '</div>' +
        '</div>' +
      '</div>'
    );
  }
  function renderModalPreserveScroll(){
    var oldOverlay=document.querySelector('#modalRoot .modal-overlay');
    var scrollTop=oldOverlay?oldOverlay.scrollTop:0;
    renderModal();
    var newOverlay=document.querySelector('#modalRoot .modal-overlay');
    if(newOverlay){
      newOverlay.scrollTop=scrollTop;
      requestAnimationFrame(function(){newOverlay.scrollTop=scrollTop;});
    }
  }
  function renderMainViewOnly(){
    renderHeaderAccount();
    var root=document.getElementById('viewRoot');
    if(!root)return;
    if(state.characterOpen)root.innerHTML=viewCharacter();
    else if(state.userProfileOpen)root.innerHTML=viewBingeoUserProfile();
    else if(state.professionalOpen)root.innerHTML=viewProfessional();
    else if(state.view==='descobrir')root.innerHTML=viewDescobrir();
    else if(state.view==='estante')root.innerHTML=viewEstante();
    else if(state.view==='diario')root.innerHTML=viewDiario();
    else if(state.view==='listas')root.innerHTML=viewListas();
    else if(state.view==='perfil')root.innerHTML=viewPerfil();
    else if(state.view==='editar-perfil')root.innerHTML=viewEditarPerfil();
    bindFormsForCurrentView();
  }

  