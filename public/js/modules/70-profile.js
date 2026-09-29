/* ---------------- view: perfil ---------------- */
  function profileEditSectionsHtml(){
    var banner=state.profile.banner;
    var socialLinks=Array.isArray(state.profile.socialLinks)?state.profile.socialLinks:[];
    var profileTheme=normalizeTheme(state.profile.nameStyle&&state.profile.nameStyle.theme);
    var html='';

      html += '<div class="profile-edit-section">' +
        '<h3>Informações</h3>' +
        '<div class="field-group"><label class="field-label">Nome de usuário</label><input class="qa-input" id="profileUsername" value="' + escapeHtml(state.profile.username||'') + '" placeholder="@seunome" style="width:100%;"></div>' +
        '<div class="field-group"><label class="field-label">Biografia</label><textarea id="profileBio" placeholder="Conte um pouco sobre você e suas maratonas..." style="width:100%;background:var(--panel-2);border:1px solid var(--line);color:var(--text);padding:9px 11px;border-radius:7px;min-height:80px;resize:vertical;">' + escapeHtml(state.profile.bio||'') + '</textarea></div>' +
      '</div>' +
      '<div class="profile-edit-section">' +
        '<h3>Aparência</h3>' +
        '<div class="theme-setting">' +
          '<div class="theme-preference-card">' +
            '<div class="theme-preference-info">' +
              '<div class="theme-preference-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 3a9 9 0 1 0 9 9c0-1-.8-1.7-1.8-1.7h-1.4a2 2 0 0 1-2-2V6.8C15.8 4.7 14.2 3 12 3Z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7.5" r="1"/></svg></div>' +
              '<div class="theme-preference-copy"><div class="field-label">Tema da interface</div><div class="theme-setting-subtitle">Escolha a aparência do Bingeo.</div></div>' +
              '<div class="theme-status" id="themeStatus"><span class="theme-status-dot"></span><span id="themeStatusText">'+(profileTheme==='light'?'Claro':'Escuro')+'</span></div>' +
            '</div>' +
            '<div class="theme-switch '+(profileTheme==='light'?'is-light':'is-dark')+'" id="themeSwitch" role="radiogroup" aria-label="Tema da interface">' +
              '<span class="theme-switch-indicator" aria-hidden="true"></span>' +
              '<button type="button" class="theme-switch-option '+(profileTheme==='dark'?'active':'')+'" data-action="set-theme" data-theme="dark" role="radio" aria-checked="'+(profileTheme==='dark'?'true':'false')+'">' +
                '<span class="theme-switch-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><path d="M20 15.2A8.4 8.4 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z"/></svg></span><span>Escuro</span>' +
              '</button>' +
              '<button type="button" class="theme-switch-option '+(profileTheme==='light'?'active':'')+'" data-action="set-theme" data-theme="light" role="radio" aria-checked="'+(profileTheme==='light'?'true':'false')+'">' +
                '<span class="theme-switch-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.5"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg></span><span>Claro</span>' +
              '</button>' +
            '</div>' +
            '<div class="theme-palette-row" aria-hidden="true">' +
              '<span class="theme-palette-label">Paleta</span>' +
              '<span class="theme-palette-dots '+(profileTheme==='light'?'light':'dark')+'" id="themePaletteDots"><i></i><i></i><i></i><i></i></span>' +
              '<span class="theme-auto-note">Salvo automaticamente</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="appearance-pro-head">Personalização do perfil <span class="pro-badge">✦ PRO</span></div>' +
        (hasPro() ?           '<div style="margin-top:14px;"><label class="field-label">Cor do nome</label><div class="color-row"><input type="color" id="profileNameColor" class="color-input" value="' + escapeHtml((state.profile.nameStyle&&state.profile.nameStyle.color)||(profileTheme==='light'?'#181A23':'#ECEBF3')) + '"><button class="btn btn-ghost btn-sm" data-action="clear-name-color">Cor padrão</button></div></div>' +
          '<div style="margin-top:14px;"><label class="field-label">Efeito do nome</label><select id="profileNameEffect" class="qa-input" style="width:100%;"><option value="none" ' + ((state.profile.nameStyle&&state.profile.nameStyle.effect)==='none'?'selected':'') + '>Normal</option><option value="glow" ' + ((state.profile.nameStyle&&state.profile.nameStyle.effect)==='glow'?'selected':'') + '>Brilho</option><option value="animated" ' + ((state.profile.nameStyle&&state.profile.nameStyle.effect)==='animated'?'selected':'') + '>Brilho animado</option></select></div>' : '<div class="premium-locked pro-locked-panel"><strong>Personalização Pro</strong><span>Banner, GIF de perfil, cor personalizada e efeitos no nome.</span><button class="btn btn-primary btn-sm" data-action="open-pro" data-source="editar-aparencia">Conhecer o Pro</button></div>') +
      '</div>' +
      '<div class="profile-edit-section">' +
        '<h3>Redes sociais <span class="pro-badge">✦ PRO</span></h3>' +
        (hasPro() ? '<div class="inline-actions"><select id="socialPlatform" class="qa-input"><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option><option value="twitch">Twitch</option><option value="x">X</option><option value="discord">Discord</option><option value="github">GitHub</option><option value="website">Site</option></select><input id="socialUrl" class="qa-input" placeholder="https://..." style="flex:1;min-width:220px;"><button class="btn btn-ghost btn-sm" data-action="add-social">Adicionar</button></div>' +
          (socialLinks.length ? socialLinks.map(function(sl,idx){return '<div class="social-list-row"><span>' + socialIcon(sl.platform) + ' ' + escapeHtml(socialLabel(sl.platform)) + ' — ' + escapeHtml(sl.url) + '</span><button class="btn btn-danger btn-sm" data-action="remove-social" data-index="' + idx + '">Remover</button></div>';}).join('') : '<div class="premium-locked">Nenhuma rede social adicionada ainda.</div>') : '<div class="premium-locked pro-locked-panel"><strong>Redes sociais no perfil</strong><span>Adicione Instagram, TikTok, YouTube, Twitch e outros links com o Pro.</span><button class="btn btn-primary btn-sm" data-action="open-pro" data-source="editar-redes">Conhecer o Pro</button></div>') +
      '</div>' +
      '<div class="profile-edit-section"><h3>Catálogo de séries <span class="tmdb-logo-badge">TMDB</span></h3><div class="tmdb-status ok">TMDB conectado pelo servidor do Bingeo. Pôsteres, sinopses, elenco, créditos e episódios oficiais estão disponíveis automaticamente.</div></div>' +
      '';

    return html;
  }

  function viewPro(){
    var active=hasPro();
    var features=[
      ['Perfil visual','Foto de perfil','Banner, GIF, cor e efeitos no nome'],
      ['Top 5','Pôster padrão das séries','Escolha seus próprios pôsteres'],
      ['Listas','Até 10 listas próprias','Listas ilimitadas'],
      ['Avaliações','Nota e review tradicionais','Amora, reações, DNA e medalhas'],
      ['Redes sociais','—','Links no perfil'],
      ['Personalização','Recursos essenciais','Experiência mais completa']
    ];
    return '<div class="pro-page">'+
      '<section class="pro-hero">'+
        '<div class="pro-hero-badge">✦ BINGEO PRO</div>'+
        '<h1>Seu Bingeo, do seu jeito.</h1>'+
        '<p>Personalize seu perfil, suas listas e a forma como você avalia as séries que assiste.</p>'+
        '<div class="pro-hero-actions">'+
          (active?'<span class="pro-current-plan">✓ Seu Bingeo Pro está ativo</span>':'<button class="btn btn-primary pro-main-cta" data-action="pro-checkout">Assinar Bingeo Pro</button>')+
          '<button class="btn btn-ghost" data-action="open-my-profile">Voltar ao perfil</button>'+
        '</div>'+
      '</section>'+
      '<section class="pro-visual-compare"><div class="section-title">Veja a diferença no perfil</div><div class="pro-preview-grid">'+
        '<div class="pro-profile-preview free-preview"><div class="pro-preview-label">FREE</div><div class="pro-preview-banner"></div><div class="pro-preview-avatar">B</div><div class="pro-preview-lines"><i></i><i></i></div><div class="pro-preview-posters">'+Array(5).fill('<span></span>').join('')+'</div></div>'+
        '<div class="pro-profile-preview pro-preview"><div class="pro-preview-label">✦ PRO</div><div class="pro-preview-banner"></div><div class="pro-preview-avatar">GIF</div><div class="pro-preview-lines"><i></i><i></i></div><div class="pro-preview-posters">'+Array(5).fill('<span></span>').join('')+'</div></div>'+
      '</div></section>'+
      '<section class="pro-benefits"><div class="section-title">Tudo que muda com o Pro</div><div class="pro-benefit-grid">'+
        '<div class="pro-benefit-card"><span>▣</span><strong>Perfil premium</strong><p>Banner, GIF no avatar, nome colorido e efeitos.</p></div>'+
        '<div class="pro-benefit-card"><span>▥</span><strong>Pôsteres personalizados</strong><p>Escolha a arte que aparece no seu Top 5.</p></div>'+
        '<div class="pro-benefit-card"><span>∞</span><strong>Listas ilimitadas</strong><p>Crie coleções sem o limite de 10 listas do Free.</p></div>'+
        '<div class="pro-benefit-card"><span>✦</span><strong>Avaliações avançadas</strong><p>Amadurecimento da amora, reações, DNA e medalhas.</p></div>'+
        '<div class="pro-benefit-card"><span>↗</span><strong>Redes sociais</strong><p>Adicione seus links diretamente ao perfil.</p></div>'+
        '<div class="pro-benefit-card"><span>◈</span><strong>Mais identidade</strong><p>Deixe sua página realmente diferente das demais.</p></div>'+
      '</div></section>'+
      '<section class="pro-comparison"><div class="section-title">Free × Pro</div><div class="pro-comparison-table"><div class="pro-comparison-row head"><span>Recurso</span><span>Free</span><span>Pro</span></div>'+
        features.map(function(f){return '<div class="pro-comparison-row"><span>'+escapeHtml(f[0])+'</span><span>'+escapeHtml(f[1])+'</span><span class="pro-comparison-pro">'+escapeHtml(f[2])+'</span></div>';}).join('')+
      '</div></section>'+
      '<section class="pro-purchase-card">'+
        '<div><span class="pro-purchase-eyebrow">ASSINATURA</span><h2>Bingeo Pro</h2><p>O checkout e o preço serão conectados na próxima etapa da implementação.</p></div>'+
        (active?'<span class="pro-current-plan">✓ Plano ativo</span>':'<button class="btn btn-primary" data-action="pro-checkout">Continuar para assinatura</button>')+
      '</section>'+
    '</div>';
  }

  function viewEditarPerfil(){
    var initials=state.profile.username?state.profile.username.trim().charAt(0).toUpperCase():'?';
    var photo=state.profile.photo;
    var banner=state.profile.banner;
    var bannerStyle=banner?'background-image:url(\''+String(banner).replace(/'/g,'%27')+'\');':'';
    var avatarStyle=photo?'background-image:url(\''+String(photo).replace(/'/g,'%27')+'\');':'';

    return '<div class="profile-editor-page">'+
      '<div class="profile-editor-page-head"><div><button class="btn btn-ghost btn-sm" data-action="back-to-profile">← Ver perfil</button><h1>Editar perfil</h1><p>Atualize sua identidade e a aparência do seu perfil no Bingeo.</p></div><button class="btn btn-primary" data-action="save-profile">Salvar alterações</button></div>'+
      '<section class="profile-media-editor">'+
        '<div class="profile-edit-banner-preview '+(banner?'has-image':'')+'" style="'+bannerStyle+'">'+
          '<div class="profile-edit-banner-shade"></div>'+
          '<div class="profile-edit-banner-actions">'+
            '<div><strong>Banner do perfil</strong><small>'+(hasPro()?'Personalize a capa do seu perfil.':'Disponível no Bingeo Pro.')+'</small></div>'+
            '<div class="inline-actions"><button class="btn btn-ghost btn-sm" data-action="choose-banner">'+(banner?'Trocar banner':'Adicionar banner')+(hasPro()?'':' · Pro')+'</button>'+(banner?'<button class="btn btn-danger btn-sm" data-action="remove-banner">Remover</button>':'')+'</div>'+
          '</div>'+
        '</div>'+
        '<div class="profile-edit-avatar-row">'+
          '<div class="profile-edit-avatar" style="'+avatarStyle+'">'+(photo?'':escapeHtml(initials))+'</div>'+
          '<div class="profile-edit-avatar-copy"><strong>Foto de perfil</strong><p>Escolha uma imagem para representar você. GIF animado é um recurso Pro.</p><div class="inline-actions"><button class="btn btn-ghost btn-sm" data-action="choose-avatar">'+(photo?'Trocar foto':'Adicionar foto')+'</button>'+(photo?'<button class="btn btn-danger btn-sm" data-action="remove-avatar">Remover foto</button>':'')+'</div></div>'+
        '</div>'+
      '</section>'+
      (hasPro()?'':proContextBannerHtml('Personalize tudo com o Bingeo Pro','Banner, GIF, cor do nome, efeitos e redes sociais ficam disponíveis no Pro.','editar-perfil'))+
      profileEditSectionsHtml()+
      '<div class="profile-editor-footer"><button class="btn btn-ghost" data-action="back-to-profile">Cancelar</button><button class="btn btn-primary" data-action="save-profile">Salvar alterações</button></div>'+
    '</div>';
  }

  function viewPerfil(){
    var initials = state.profile.username ? state.profile.username.trim().charAt(0).toUpperCase() : '?';
    var photo = state.profile.photo;
    var banner = state.profile.banner;
    var socialLinks = Array.isArray(state.profile.socialLinks) ? state.profile.socialLinks : [];
    var profileTheme = normalizeTheme(state.profile.nameStyle&&state.profile.nameStyle.theme);
    var nameClass = 'profile-name' + (hasPro() && state.profile.nameStyle && state.profile.nameStyle.effect==='glow' ? ' name-glow' : '') + (hasPro() && state.profile.nameStyle && state.profile.nameStyle.effect==='animated' ? ' name-animated' : '');
    var nameStyle = (hasPro() && state.profile.nameStyle && state.profile.nameStyle.color) ? 'color:' + escapeHtml(state.profile.nameStyle.color) + ';' : '';

    var html = (banner ? '<div class="profile-banner" style="background-image:url(' + banner + ')"></div>' : '') +
      '<div class="profile-head' + (banner?' with-banner':'') + '">' +
        '<div class="avatar-wrap">' +
          '<div class="avatar profile-view-avatar" style="' + (photo ? ('background-image:url(' + photo + ')') : '') + '">' + (photo ? '' : initials) + '</div>' +
        '</div>' +
        '<div style="flex:1;min-width:240px;"><div class="' + nameClass + '" style="' + nameStyle + '">' + escapeHtml(state.profile.username || 'Seu perfil') + '</div>' +
          '<div class="profile-sub">' + state.entries.length + ' título' + (state.entries.length===1?'':'s') + ' na estante</div>' +
          '<div class="profile-plan"><span class="plan-pill ' + (hasPro()?'pro':'') + '">' + (hasPro()?'✦ Bingeo Pro':'Plano gratuito') + '</span></div>' +
          (state.profile.bio ? '<div style="color:var(--text-muted);font-size:13px;max-width:620px;margin-top:8px;line-height:1.45;">' + escapeHtml(state.profile.bio) + '</div>' : '') +
          '<div class="profile-actions"><button class="btn btn-ghost btn-sm" data-action="edit-profile">Editar perfil</button><button class="btn btn-ghost btn-sm" data-action="share-own-profile">Compartilhar perfil</button>' + (hasPro()?'<span class="pro-active-chip">✦ Pro ativo</span>':'<button class="btn btn-primary btn-sm" data-action="open-pro" data-source="perfil">✦ Bingeo Pro</button>') + '</div>' +
          (socialLinks.length ? '<div class="social-links">' + socialLinks.map(function(sl){return '<a class="social-link" href="' + escapeHtml(sl.url) + '" target="_blank" rel="noopener noreferrer"><span>' + socialIcon(sl.platform) + '</span>' + escapeHtml(socialLabel(sl.platform)) + '</a>';}).join('') + '</div>' : '') +
        '</div>' +
      '</div>';

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
    html += peopleFavoritesSectionsHtml({professionals:state.favoriteProfessionals,characters:state.favoriteCharacters});
    if(favorites.length){
      html += '<div class="section" style="margin-top:30px;"><div class="section-title" style="margin-bottom:14px;">Séries favoritas</div><div class="grid">'+favorites.map(entryCardHtml).join('')+'</div></div>';
    }
    if(!hasPro())html+='<section class="profile-pro-teaser"><div class="profile-pro-teaser-copy"><span class="pro-hero-badge">✦ BINGEO PRO</span><h3>Leve seu perfil ainda mais longe</h3><p>Banner personalizado, GIF no avatar, pôsteres do Top 5, nome com efeitos, redes sociais, listas ilimitadas e avaliações avançadas.</p><div class="profile-pro-mini-features"><span>Banner</span><span>GIF</span><span>Top 5</span><span>Listas ∞</span><span>DNA</span></div></div><button class="btn btn-primary" data-action="open-pro" data-source="perfil-rodape">Descobrir Bingeo Pro</button></section>';
    html += '<div class="tmdb-credit"><a class="tmdb-logo-badge" href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">TMDB</a><span>This product uses the TMDB API but is not endorsed or certified by TMDB.</span></div>';
    return html;
  }

  