/* ---------------- helpers ---------------- */
  function getEntry(catalogId){ return state.entries.find(function(e){ return e.catalogId===catalogId; }); }
  function hasLoggedEpisodeToday(catalogId, seasonNum, epNum){
    return state.diary.some(function(d){
      return d.type==='episode' && d.catalogId===catalogId && d.season===seasonNum && d.episode===epNum && d.date===todayIso();
    });
  }
  function ensureEntry(catalogId, initialStatus){
    var entry = getEntry(catalogId);
    if(!entry){
      entry = { catalogId:catalogId, status:initialStatus||'quero-assistir', rating:null, review:'', favorite:false,
        seasonRatings:{}, episodeRatings:{}, dateAdded:new Date().toISOString(), dateUpdated:new Date().toISOString(),
        premiumRating:{format:'classic',value:null,reactions:[]}, criteriaRatings:{}, badges:[], spoilerLevel:'none', spoilerSeason:null, spoilerEpisode:null };
      state.entries.push(entry);
    }
    return entry;
  }

  var STATUS_LABELS = { 'quero-assistir':'Quero assistir', 'assistindo':'Assistindo', 'completo':'Completo', 'pausado':'Em pausa', 'abandonado':'Abandonado' };
  var STATUS_CLASS = { 'quero-assistir':'status-quero', 'assistindo':'status-assistindo', 'completo':'status-completo', 'pausado':'status-pausado', 'abandonado':'status-abandonado' };
  var TYPE_LABELS = { 'serie':'Série', 'reality':'Reality', 'minisserie':'Minissérie', 'talk':'Talk show' };

  function filteredCatalog(){
    var q = state.query.trim().toLowerCase();
    return CATALOG.filter(function(c){
      var matchesType = state.catalogType==='todos' || c.type===state.catalogType;
      var matchesQ = !q || c.title.toLowerCase().indexOf(q)>-1 || c.genre.toLowerCase().indexOf(q)>-1;
      return matchesType && matchesQ;
    });
  }
  function filteredEntries(){
    var q = state.query.trim().toLowerCase();
    return state.entries.filter(function(e){
      var c = getCatalog(e.catalogId);
      if(!c) return false;
      return !q || c.title.toLowerCase().indexOf(q)>-1 || c.genre.toLowerCase().indexOf(q)>-1;
    });
  }
  function entriesByStatus(status){
    return filteredEntries().filter(function(e){ return e.status===status; })
      .sort(function(a,b){ return new Date(b.dateUpdated)-new Date(a.dateUpdated); });
  }

  function proCtaButtonHtml(label,source,extraClass){
    if(hasPro())return '<span class="pro-active-chip">✦ Pro ativo</span>';
    return '<button class="btn btn-primary btn-sm '+escapeHtml(extraClass||'')+'" data-action="open-pro" data-source="'+escapeHtml(source||'contexto')+'">'+escapeHtml(label||'Conhecer o Pro')+'</button>';
  }
  function proContextBannerHtml(title,text,source,compact){
    if(hasPro())return '';
    return '<div class="pro-context-banner '+(compact?'compact':'')+'"><div class="pro-context-icon">✦</div><div class="pro-context-copy"><strong>'+escapeHtml(title||'Bingeo Pro')+'</strong><span>'+escapeHtml(text||'Desbloqueie mais personalização e recursos no Bingeo.')+'</span></div>'+proCtaButtonHtml('Conhecer o Pro',source||'contexto','pro-context-action')+'</div>';
  }
  function openProView(source){
    state.proSource=source||'';
    state.modalCatalogId=null;
    state.professionalOpen=null;state.professionalData=null;
    state.characterOpen=null;state.characterData=null;
    state.userProfileOpen=null;state.userProfileData=null;
    state.listOpen=null;state.listCreateOpen=false;
    state.query='';
    state.view='pro';
    render();
  }

  /* ---------------- stars widget ---------------- */
  function renderStars(value, size, scope, catalogId, season, episode){
    value = value || 0;
    var pct = Math.max(0, Math.min(100, (value/5)*100));
    var hits = '';
    for(var i=1;i<=5;i++){
      hits += starHit(i-0.5, scope, catalogId, season, episode);
      hits += starHit(i, scope, catalogId, season, episode);
    }
    return '<div class="stars' + (size?(' '+size):'') + '">' +
      '<div class="stars-bg">★★★★★</div>' +
      '<div class="stars-fg" style="width:' + pct + '%">★★★★★</div>' +
      '<div class="stars-hit">' + hits + '</div>' +
      '</div>';
  }
  function starHit(val, scope, catalogId, season, episode){
    var attrs = 'data-action="rate" data-scope="' + scope + '" data-catalog="' + catalogId + '" data-val="' + val + '"';
    if(season!==undefined && season!==null) attrs += ' data-season="' + season + '"';
    if(episode!==undefined && episode!==null) attrs += ' data-episode="' + episode + '"';
    return '<button class="hit" ' + attrs + '></button>';
  }

  /* ---------------- cards ---------------- */
  function catalogCardHtml(cat){
    var entry = getEntry(cat.id);
    var extra = (entry && entry.favorite ? '<span class="fav-mark">♥</span>' : '') +
      (!entry ? '<button class="quick-add-btn" data-action="quick-add" data-catalog="' + cat.id + '" title="Adicionar à estante">+</button>' : '') +
      '<span class="type-pill">' + TYPE_LABELS[cat.type] + '</span>';
    return (
      '<div class="card" data-action="open-show" data-catalog="' + cat.id + '">' +
        posterHtml(cat, extra) +
        '<div class="card-body">' +
          '<div class="card-title">' + escapeHtml(cat.title) + '</div>' +
          '<div class="card-meta' + (entry ? (' '+STATUS_CLASS[entry.status]) : '') + '">' +
            (entry ? '<span><span class="status-dot"></span>' + STATUS_LABELS[entry.status] + '</span>' : '<span class="not-added-label">Não adicionada</span>') +
            (entry && entry.rating ? '<span class="card-stars">★ ' + entry.rating.toFixed(1) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }
  function entryCardHtml(entry){
    var cat = getCatalog(entry.catalogId);
    if(!cat) return '';
    var extra = (entry.favorite ? '<span class="fav-mark">♥</span>' : '') +
      '<span class="type-pill">' + TYPE_LABELS[cat.type] + '</span>';
    return (
      '<div class="card" data-action="open-show" data-catalog="' + cat.id + '">' +
        posterHtml(cat, extra) +
        '<div class="card-body">' +
          '<div class="card-title">' + escapeHtml(cat.title) + '</div>' +
          '<div class="card-meta ' + STATUS_CLASS[entry.status] + '">' +
            '<span><span class="status-dot"></span>' + STATUS_LABELS[entry.status] + '</span>' +
            (entry.rating ? '<span class="card-stars">★ ' + entry.rating.toFixed(1) + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  