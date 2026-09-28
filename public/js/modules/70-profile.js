/* ---------------- view: perfil ---------------- */
  function viewPerfil(){
    var initials = state.profile.username ? state.profile.username.trim().charAt(0).toUpperCase() : '?';
    var photo = state.profile.photo;
    var banner = state.profile.banner;
    var socialLinks = Array.isArray(state.profile.socialLinks) ? state.profile.socialLinks : [];
    var nameClass = 'profile-name' + (hasPro() && state.profile.nameStyle && state.profile.nameStyle.effect==='glow' ? ' name-glow' : '') + (hasPro() && state.profile.nameStyle && state.profile.nameStyle.effect==='animated' ? ' name-animated' : '');
    var nameStyle = (hasPro() && state.profile.nameStyle && state.profile.nameStyle.color) ? 'color:' + escapeHtml(state.profile.nameStyle.color) + ';' : '';

    var html = (banner ? '<div class="profile-banner" style="background-image:url(' + banner + ')"></div>' : '') +
      '<div class="profile-head' + (banner?' with-banner':'') + '">' +
        '<div class="avatar-wrap">' +
          '<div class="avatar" id="avatarBtn" style="' + (photo ? ('background-image:url(' + photo + ')') : '') + '">' + (photo ? '' : initials) + '</div>' +
          '<div class="avatar-edit" id="avatarEditBtn" title="Alterar foto">✎</div>' +
        '</div>' +
        '<div style="flex:1;min-width:240px;"><div class="' + nameClass + '" style="' + nameStyle + '">' + escapeHtml(state.profile.username || 'Seu perfil') + '</div>' +
          '<div class="profile-sub">' + state.entries.length + ' título' + (state.entries.length===1?'':'s') + ' na estante</div>' +
          '<div class="profile-plan"><span class="plan-pill ' + (hasPro()?'pro':'') + '">' + (hasPro()?'✦ Bingeo Pro':'Plano gratuito') + '</span></div>' +
          (state.profile.bio ? '<div style="color:var(--text-muted);font-size:13px;max-width:620px;margin-top:8px;line-height:1.45;">' + escapeHtml(state.profile.bio) + '</div>' : '') +
          '<div class="profile-actions">' + (photo ? '<button class="btn btn-ghost btn-sm" data-action="remove-avatar">Remover foto</button>' : '') + '<button class="btn btn-ghost btn-sm" data-action="edit-profile">Editar perfil</button><button class="btn btn-ghost btn-sm" data-action="share-own-profile">Compartilhar perfil</button>' + (!hasPro() ? '<button class="btn btn-primary btn-sm" data-action="demo-pro">Testar Pro</button>' : '<button class="btn btn-ghost btn-sm" data-action="demo-free">Voltar ao Free</button>') + '</div>' +
          (socialLinks.length ? '<div class="social-links">' + socialLinks.map(function(sl){return '<a class="social-link" href="' + escapeHtml(sl.url) + '" target="_blank" rel="noopener noreferrer"><span>' + socialIcon(sl.platform) + '</span>' + escapeHtml(socialLabel(sl.platform)) + '</a>';}).join('') + '</div>' : '') +
        '</div>' +
      '</div>';

    if(state.profile.editing){
      html += '<div class="profile-edit-section">' +
        '<h3>Informações</h3>' +
        '<div class="field-group"><label class="field-label">Nome de usuário</label><input class="qa-input" id="profileUsername" value="' + escapeHtml(state.profile.username||'') + '" placeholder="@seunome" style="width:100%;"></div>' +
        '<div class="field-group"><label class="field-label">Biografia</label><textarea id="profileBio" placeholder="Conte um pouco sobre você e suas maratonas..." style="width:100%;background:var(--panel-2);border:1px solid var(--line);color:var(--text);padding:9px 11px;border-radius:7px;min-height:80px;resize:vertical;">' + escapeHtml(state.profile.bio||'') + '</textarea></div>' +
      '</div>' +
      '<div class="profile-edit-section">' +
        '<h3>Aparência <span class="pro-badge">✦ PRO</span></h3>' +
        (hasPro() ? '<div class="profile-tools"><button class="btn btn-ghost btn-sm" data-action="choose-banner">' + (banner?'Trocar banner':'Adicionar banner') + '</button>' + (banner?'<button class="btn btn-danger btn-sm" data-action="remove-banner">Remover banner</button>':'') + '<button class="btn btn-ghost btn-sm" data-action="choose-avatar">Adicionar GIF/foto</button></div>' +
          '<div style="margin-top:14px;"><label class="field-label">Cor do nome</label><div class="color-row"><input type="color" id="profileNameColor" class="color-input" value="' + escapeHtml((state.profile.nameStyle&&state.profile.nameStyle.color)||'#ECEBF3') + '"><button class="btn btn-ghost btn-sm" data-action="clear-name-color">Cor padrão</button></div></div>' +
          '<div style="margin-top:14px;"><label class="field-label">Efeito do nome</label><select id="profileNameEffect" class="qa-input" style="width:100%;"><option value="none" ' + ((state.profile.nameStyle&&state.profile.nameStyle.effect)==='none'?'selected':'') + '>Normal</option><option value="glow" ' + ((state.profile.nameStyle&&state.profile.nameStyle.effect)==='glow'?'selected':'') + '>Brilho</option><option value="animated" ' + ((state.profile.nameStyle&&state.profile.nameStyle.effect)==='animated'?'selected':'') + '>Brilho animado</option></select></div>' : '<div class="premium-locked">Banner, GIF de perfil, cor personalizada e efeitos do nome são exclusivos do Bingeo Pro.</div>') +
      '</div>' +
      '<div class="profile-edit-section">' +
        '<h3>Redes sociais <span class="pro-badge">✦ PRO</span></h3>' +
        (hasPro() ? '<div class="inline-actions"><select id="socialPlatform" class="qa-input"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="twitch">Twitch</option><option value="x">X</option><option value="discord">Discord</option><option value="github">GitHub</option><option value="website">Site</option></select><input id="socialUrl" class="qa-input" placeholder="https://..." style="flex:1;min-width:220px;"><button class="btn btn-ghost btn-sm" data-action="add-social">Adicionar</button></div>' +
          (socialLinks.length ? socialLinks.map(function(sl,idx){return '<div class="social-list-row"><span>' + socialIcon(sl.platform) + ' ' + escapeHtml(socialLabel(sl.platform)) + ' — ' + escapeHtml(sl.url) + '</span><button class="btn btn-danger btn-sm" data-action="remove-social" data-index="' + idx + '">Remover</button></div>';}).join('') : '<div class="premium-locked">Nenhuma rede social adicionada ainda.</div>') : '<div class="premium-locked">Links para redes sociais são exclusivos do Bingeo Pro.</div>') +
      '</div>' +
      '<div class="profile-edit-section"><h3>Catálogo de séries <span class="tmdb-logo-badge">TMDB</span></h3><div class="tmdb-status ok">TMDB conectado pelo servidor do Bingeo. Pôsteres, sinopses, elenco, créditos e episódios oficiais estão disponíveis automaticamente.</div></div>' +
      '<button class="btn btn-primary btn-sm" data-action="save-profile">Salvar perfil</button>';
    }

    html += '<div class="top5-section">' +
      '<div class="section-head"><div class="section-title">Seu Top 5</div>' +
      '<button class="btn btn-ghost btn-sm" data-action="toggle-top5-editor">' + (top5EditorOpen?'Concluir':'Editar Top 5') + '</button></div>' +
      '<div class="top5-row">' + [0,1,2,3,4].map(function(i){
        var catId = state.profile.topFive[i];
        if(!catId){
          return '<div class="top5-slot empty-slot">Slot ' + (i+1) + ' vazio</div>';
        }
        var cat = getCatalog(catId);
        if(!cat) return '<div class="top5-slot empty-slot">Slot ' + (i+1) + ' vazio</div>';
        var profilePoster=seriesProfilePosterUrl(cat,state.profile);
        return (
          '<div class="top5-slot" data-action="open-show" data-catalog="' + cat.id + '">' +
            '<span class="top5-rank">#' + (i+1) + '</span>' +
            '<div class="top5-profile-poster" style="' + (profilePoster?'background-image:url(\''+profilePoster.replace(/'/g,'%27')+'\');':'') + '"></div>' +
            (top5EditorOpen ? (
              '<div class="top5-controls">' +
                (i>0 ? '<button class="top5-mini-btn" data-action="top5-move" data-index="' + i + '" data-dir="up" title="Mover para cima">↑</button>' : '') +
                (i<4 ? '<button class="top5-mini-btn" data-action="top5-move" data-index="' + i + '" data-dir="down" title="Mover para baixo">↓</button>' : '') +
                '<button class="top5-mini-btn '+(hasPro()?'pro-art-btn':'pro-art-btn locked')+'" data-action="top5-art-picker" data-catalog="' + cat.id + '" title="Escolher pôster">'+(hasPro()?'▣':'✦')+'</button>' +
                '<button class="top5-mini-btn" data-action="top5-remove" data-index="' + i + '" title="Remover">✕</button>' +
              '</div>'
            ) : '') +
          '</div>'
        );
      }).join('') + '</div>';

    if(top5EditorOpen){
      html += top5ArtworkPickerHtml();
      var freeSlots = 5 - state.profile.topFive.filter(Boolean).length;
      var candidates = state.entries.filter(function(e){ return state.profile.topFive.indexOf(e.catalogId)===-1; });
      html += '<div class="top5-picker">' +
        '<div class="field-label">Adicionar à sua Top 5 (' + freeSlots + ' vaga' + (freeSlots===1?'':'s') + ' livre' + (freeSlots===1?'':'s') + ')</div>' +
        (candidates.length===0 ? '<p style="color:var(--text-muted);font-size:12.5px;margin:4px 0 0;">Adicione títulos à sua estante primeiro.</p>' :
          candidates.map(function(e){
            var cat = getCatalog(e.catalogId);
            if(!cat) return '';
            return (
              '<div class="top5-picker-row">' +
                '<div class="pick-swatch" style="' + swatchStyle(cat.title) + '"></div>' +
                '<span>' + escapeHtml(cat.title) + '</span>' +
                (freeSlots>0 ? '<button class="btn btn-ghost btn-sm" data-action="top5-add" data-catalog="' + cat.id + '">Adicionar</button>' : '') +
              '</div>'
            );
          }).join('')
        ) +
      '</div>';
    }
    html += '</div>';

    var completos = state.entries.filter(function(e){ return e.status==='completo'; }).length;
    var assistindo = state.entries.filter(function(e){ return e.status==='assistindo'; }).length;
    var rated = state.entries.filter(function(e){ return e.rating; });
    var avg = rated.length ? (rated.reduce(function(sum,e){ return sum+e.rating; },0)/rated.length) : 0;

    var buckets = [0.5,1,1.5,2,2.5,3,3.5,4,4.5,5];
    var maxBucket = 1;
    var counts = buckets.map(function(b){
      var c = rated.filter(function(e){ return e.rating===b; }).length;
      if(c>maxBucket) maxBucket=c;
      return c;
    });

    var genreTally = {};
    state.entries.forEach(function(e){
      var cat = getCatalog(e.catalogId);
      if(!cat) return;
      genreTally[cat.genre] = (genreTally[cat.genre]||0)+1;
    });
    var genreList = Object.keys(genreTally).map(function(g){ return {name:g, count:genreTally[g]}; })
      .sort(function(a,b){ return b.count-a.count; }).slice(0,6);
    var maxGenre = genreList.length ? genreList[0].count : 1;

    var favorites = state.entries.filter(function(e){ return e.favorite; });

    if(state.entries.length){
      html += (
        '<div class="stat-grid">' +
          '<div class="stat-box"><div class="stat-num">' + state.entries.length + '</div><div class="stat-label">Títulos na estante</div></div>' +
          '<div class="stat-box"><div class="stat-num">' + completos + '</div><div class="stat-label">Completos</div></div>' +
          '<div class="stat-box"><div class="stat-num">' + assistindo + '</div><div class="stat-label">Assistindo agora</div></div>' +
          '<div class="stat-box"><div class="stat-num">' + (avg? avg.toFixed(1):'—') + '</div><div class="stat-label">Nota média</div></div>' +
        '</div>' +
        '<div class="two-col">' +
          '<div><div class="section-title" style="margin-bottom:12px;">Distribuição de notas</div>' +
            '<div class="bars">' + buckets.map(function(b,i){
              var w = counts[i]===0 ? 0 : Math.max(6,(counts[i]/maxBucket)*100);
              return '<div class="bar-row"><span class="bar-label">' + b.toFixed(1) + '★</span>' +
                '<div class="bar-track"><div class="bar-fill" style="width:' + w + '%"></div></div>' +
                '<span class="bar-count">' + counts[i] + '</span></div>';
            }).join('') + '</div>' +
          '</div>' +
          '<div><div class="section-title" style="margin-bottom:12px;">Gêneros mais assistidos</div>' +
            (genreList.length===0 ? '<p style="color:var(--text-muted);font-size:13px;">Sem dados suficientes ainda.</p>' :
            genreList.map(function(g){
              return '<div class="genre-row"><span class="genre-name">' + escapeHtml(g.name) + '</span>' +
                '<div class="genre-track"><div class="genre-fill" style="width:' + ((g.count/maxGenre)*100) + '%"></div></div>' +
                '<span class="genre-count">' + g.count + '</span></div>';
            }).join('')) +
          '</div>' +
        '</div>'
      );
    }else{
      html += '<div class="empty"><strong>Ainda sem dados suficientes.</strong>Adicione e avalie títulos para ver suas estatísticas aqui.</div>';
    }
    html += ownEvaluationsSectionHtml();
    html += top3CharactersHtml(state.favoriteCharacters,{editable:top3EditorOpen,profile:state.profile,isOwn:true});
    html += peopleFavoritesSectionsHtml({professionals:state.favoriteProfessionals,characters:state.favoriteCharacters});
    if(favorites.length){
      html += '<div class="section" style="margin-top:30px;"><div class="section-title" style="margin-bottom:14px;">Séries favoritas</div><div class="grid">'+favorites.map(entryCardHtml).join('')+'</div></div>';
    }
    html += '<div class="tmdb-credit"><a class="tmdb-logo-badge" href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">TMDB</a><span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span></div>';
    return html;
  }

  