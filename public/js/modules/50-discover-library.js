/* ---------------- view: home / descobrir ---------------- */
  function trendingHomeHtml(){
    var trendIds=Object.keys(state.trending).filter(function(id){return getCatalog(id)&&state.trending[id]>0;}).sort(function(a,b){return state.trending[b]-state.trending[a];}).slice(0,8);
    var html='<div class="trending"><div class="trending-head"><h2>Mais faladas no Bingeo</h2><span class="trending-note">Ranking compartilhado entre toda a comunidade · últimos 30 dias</span></div>';
    if(trendIds.length===0)html+='<p style="color:var(--text-muted);font-size:13px;margin:0;">Ainda não há interações suficientes da comunidade para formar o ranking.</p>';
    else html+='<div class="trend-row">'+trendIds.map(function(id,i){var cat=getCatalog(id),people=Number(state.trendingUsers[id]||0);return '<div class="trend-card" data-action="open-show" data-catalog="'+cat.id+'">'+posterHtml(cat,'<span class="trend-rank">#'+(i+1)+'</span>','trend-poster')+'<div class="trend-title">'+escapeHtml(cat.title)+'</div><div class="trend-count">'+state.trending[id]+' interações'+(people?' · '+people+' usuário'+(people===1?'':'s'):'')+'</div></div>';}).join('')+'</div>';
    return html+'</div>';
  }
  function viewHome(){
    return trendingHomeHtml()+followingFeedHtml();
  }
  function discoverPopularCatalogs(){
    var ids=[
      'round-6','stranger-things','breaking-bad','the-office',
      'friends','dark','the-last-of-us','house-of-dragon',
      'bridgerton','euphoria','the-bear','chernobyl'
    ];
    return ids.map(getCatalog).filter(Boolean);
  }
  function viewDescobrir(){
    var q=state.query.trim();
    var proBanner=proHomeBannerHtml();
    if(q){
      return proBanner+'<div class="section-head discover-search-head"><div><div class="section-title">Resultados da busca</div><div style="font-size:11px;color:var(--text-dim);margin-top:3px;">Séries primeiro, depois usuários e personagens; profissionais aparecem por último.</div></div></div>'+tmdbSearchResultsHtml();
    }

    var html=proBanner;
    var popular=discoverPopularCatalogs();
    html+='<section class="section discover-popular"><div class="section-head"><div><div class="section-title">Séries populares</div><div style="font-size:11px;color:var(--text-dim);margin-top:3px;">Algumas das séries mais conhecidas para começar a explorar o Bingeo</div></div></div>';
    html+=popular.length?'<div class="grid">'+popular.map(catalogCardHtml).join('')+'</div>':'<div class="empty">Não foi possível carregar as séries populares.</div>';
    html+='</section>';

    return html;
  }

  /* ---------------- view: estante ---------------- */
  function sectionHtml(title, status){
    var entries = entriesByStatus(status);
    if(entries.length===0) return '';
    return (
      '<div class="section">' +
        '<div class="section-head">' +
          '<div class="section-title"><span class="' + STATUS_CLASS[status] + '"><span class="status-dot"></span></span>' + title + '</div>' +
          '<div class="section-count">' + entries.length + ' série' + (entries.length===1?'':'s') + '</div>' +
        '</div>' +
        '<div class="grid">' + entries.map(entryCardHtml).join('') + '</div>' +
      '</div>'
    );
  }
  function viewEstante(){
    if(state.entries.length===0){
      return '<div class="empty"><strong>Sua estante está vazia.</strong>Vá até "Descobrir" para adicionar séries e reality shows já cadastrados no Bingeo.</div>';
    }
    if(filteredEntries().length===0){
      return '<div class="empty"><strong>Nada encontrado.</strong>Tente outro termo de busca.</div>';
    }
    return sectionHtml('Assistindo', 'assistindo') +
      sectionHtml('Quero assistir', 'quero-assistir') +
      sectionHtml('Completo', 'completo') +
      sectionHtml('Em pausa', 'pausado') +
      sectionHtml('Abandonado', 'abandonado');
  }

  /* ---------------- view: diario (calendário vertical) ----------------
     O Diário passa a exibir os registros como um calendário vertical
     (mês → dias → registros do dia), preservando os dois tipos de
     registro: de série inteira ("type:'series'", formato antigo, inclusive
     registros salvos antes desta atualização, que não tinham "type" e
     continuam sendo tratados como série) e de episódio individual
     ("type:'episode'", novo). */
  function viewDiario(){
    var entries = state.diary.slice().sort(function(a,b){ return new Date(b.date)-new Date(a.date) || (''+b.id).localeCompare(''+a.id); });
    if(entries.length===0){
      return '<div class="empty"><strong>Nenhum registro ainda.</strong>Abra um título na sua estante e clique em "Registrar hoje", ou registre um episódio específico, para começar seu diário.</div>';
    }
    var monthOrder = [], byMonth = {};
    entries.forEach(function(e){
      var d = new Date(e.date + 'T12:00:00');
      var mKey = d.getFullYear() + '-' + d.getMonth();
      if(!byMonth[mKey]){ byMonth[mKey] = { date:d, days:{}, dayOrder:[] }; monthOrder.push(mKey); }
      var m = byMonth[mKey];
      if(!m.days[e.date]){ m.days[e.date] = []; m.dayOrder.push(e.date); }
      m.days[e.date].push(e);
    });

    var html = '';
    monthOrder.forEach(function(mKey){
      var m = byMonth[mKey];
      var monthLabel = m.date.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
      html += '<div class="cal-month"><div class="cal-month-label">' + escapeHtml(monthLabel) + '</div>';
      m.dayOrder.forEach(function(dayKey){
        var dDate = new Date(dayKey + 'T12:00:00');
        var dayNum = dDate.getDate();
        var wd = dDate.toLocaleDateString('pt-BR', { weekday:'short' }).replace('.', '');
        html += '<div class="cal-day"><div class="cal-day-num"><div class="num">' + dayNum + '</div><div class="wd">' + escapeHtml(wd) + '</div></div><div class="cal-day-rule"></div><div class="cal-day-entries">';
        m.days[dayKey].forEach(function(e){
          var cat = getCatalog(e.catalogId);
          if(!cat) return;
          var letter = cat.title.trim().charAt(0).toUpperCase();
          var isEpisode = e.type==='episode';
          html += (
            '<div class="cal-entry">' +
              (proDiaryArtworkHtml(e,cat)||('<div class="cal-dot" style="' + swatchStyle(cat.title) + '">' + escapeHtml(letter) + '</div>')) +
              '<div class="cal-entry-body">' +
                '<div class="cal-entry-top">' +
                  '<span class="cal-title" data-action="open-show" data-catalog="' + cat.id + '">' + escapeHtml(cat.title) + '</span>' +
                  '<div class="inline-actions">' +
                    '<span class="cal-kind-badge' + (isEpisode?' episode':'') + '">' + (isEpisode?'Episódio':'Série') + '</span>' +
                    (e.rating ? '<span class="card-stars">★ ' + Number(e.rating).toFixed(1) + '</span>' : '') +
                    '<button class="diary-del" data-action="delete-diary" data-entry="' + e.id + '">Remover</button>' +
                  '</div>' +
                '</div>' +
                (isEpisode ? '<div class="cal-ep-tag">Temporada ' + e.season + ' • Episódio ' + e.episode + '</div>' : '') +
                (e.note ? '<div class="cal-note">' + escapeHtml(e.note) + '</div>' : '') +
              '</div>' +
            '</div>'
          );
        });
        html += '</div></div>';
      });
      html += '</div>';
    });
    return html;
  }

  function listCoverHtml(list){
    if(list.coverUrl){
      return '<div class="list-cover"><div class="custom-list-cover" style="background-image:url(\''+String(list.coverUrl).replace(/'/g,'%27')+'\')"></div></div>';
    }
    var cats=(list.showIds||[]).map(getCatalog).filter(Boolean);
    if(cats.length===0)return '<div class="list-cover list-cover-empty">Adicione séries</div>';
    if(cats.length===1)return '<div class="list-cover list-cover-1"><div class="list-cover-tile" style="'+posterBackgroundStyle(cats[0],'w500')+'"></div></div>';
    if(cats.length===2)return '<div class="list-cover list-cover-2">'+cats.slice(0,2).map(function(cat){return '<div class="list-cover-tile" style="'+posterBackgroundStyle(cat,'w500')+'"></div>';}).join('')+'</div>';
    var four=cats.slice(0,4);while(four.length<4)four.push(cats[four.length%cats.length]);
    return '<div class="list-cover list-cover-4">'+four.map(function(cat){return '<div class="list-cover-tile" style="'+posterBackgroundStyle(cat,'w500')+'"></div>';}).join('')+'</div>';
  }

  function listCommentsHtml(list){
    var comments=Array.isArray(list.comments)?list.comments:[];
    var html='<div class="list-comments"><div class="section-title" style="margin-bottom:10px;">Comentários</div>';
    if(list.allowComments!==false)html+='<form id="listCommentForm" class="new-list-form"><input type="text" name="comment" class="qa-input" maxlength="1200" placeholder="Comente nesta lista..." required><button class="btn btn-primary btn-sm" type="submit">Publicar</button></form>';
    else html+='<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Comentários desativados pelo proprietário.</div>';
    html+=comments.length?comments.map(function(cm){
      return '<div class="list-comment"><strong>@'+escapeHtml(cm.username||'usuário')+'</strong><p>'+escapeHtml(cm.body||'')+'</p></div>';
    }).join(''):'<div style="font-size:12px;color:var(--text-muted);">Ainda não há comentários.</div>';
    return html+'</div>';
  }

  