  /* Bingeo Pro expansion layer: isolated, additive features. */
  var PRO_PROFILE_THEMES=[
    {id:'default',label:'Bingeo',desc:'Visual original'},
    {id:'neon',label:'Neon',desc:'Violeta e azul'},
    {id:'cinema',label:'Cinema',desc:'Vinho e dourado'},
    {id:'minimal',label:'Minimal',desc:'Limpo e neutro'},
    {id:'oled',label:'OLED',desc:'Preto profundo'},
    {id:'retro',label:'Retrô',desc:'Âmbar clássico'}
  ];
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
    var theme=String(p.theme||'default'),frame=String(p.frame||'none'),badge=String(p.badge||'pro');
    if(!PRO_PROFILE_THEMES.some(function(x){return x.id===theme;}))theme='default';
    if(!PRO_AVATAR_FRAMES.some(function(x){return x.id===frame;}))frame='none';
    if(!PRO_PROFILE_BADGES.some(function(x){return x.id===badge;}))badge='pro';
    return {theme:theme,frame:frame,badge:badge,highlightedListId:String(p.highlightedListId||'')};
  }
  function ensureOwnProProfileSettings(){
    state.profile.nameStyle=state.profile.nameStyle&&typeof state.profile.nameStyle==='object'?state.profile.nameStyle:{color:null,effect:'none',theme:'dark'};
    var cfg=getProProfileSettings(state.profile);state.profile.nameStyle.pro=cfg;return cfg;
  }
  function updateOwnProProfileSettings(patch){
    if(!hasPro())return;
    var cfg=ensureOwnProProfileSettings();Object.keys(patch||{}).forEach(function(k){cfg[k]=patch[k];});
    state.profile.nameStyle.pro=cfg;saveData();syncProfileToSupabase();
  }
  function proProfileSkinClass(profile){return profile&&profile.plan==='pro'?'pro-profile-skin pro-theme-'+getProProfileSettings(profile).theme:'';}
  function proAvatarFrameClass(profile){
    if(!profile||profile.plan!=='pro')return '';
    var f=getProProfileSettings(profile).frame;return f&&f!=='none'?'pro-avatar-frame frame-'+f:'';
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
      '<div class="pro-editor-head"><div><h3>Identidade Pro</h3><p>Escolha um tema, uma moldura de avatar e uma insígnia.</p></div><span class="pro-active-chip">✦ PRO</span></div>'+
      '<div class="field-label">Tema do perfil</div><div class="pro-theme-options">'+
        PRO_PROFILE_THEMES.map(function(t){return '<button type="button" class="pro-theme-option '+(cfg.theme===t.id?'selected':'')+'" data-action="set-pro-profile-theme" data-value="'+t.id+'"><span class="pro-theme-swatch theme-'+t.id+'"></span><strong>'+escapeHtml(t.label)+'</strong><small>'+escapeHtml(t.desc)+'</small></button>';}).join('')+
      '</div><div class="pro-editor-two-col"><div><div class="field-label">Moldura do avatar</div><div class="pro-choice-row">'+
        PRO_AVATAR_FRAMES.map(function(f){return '<button type="button" class="pro-choice '+(cfg.frame===f.id?'selected':'')+'" data-action="set-pro-avatar-frame" data-value="'+f.id+'"><span class="pro-frame-preview frame-'+f.id+'">B</span>'+escapeHtml(f.label)+'</button>';}).join('')+
      '</div></div><div><div class="field-label">Insígnia</div><div class="pro-choice-row">'+
        PRO_PROFILE_BADGES.map(function(b){return '<button type="button" class="pro-choice '+(cfg.badge===b.id?'selected':'')+'" data-action="set-pro-profile-badge" data-value="'+b.id+'">'+escapeHtml(b.label)+'</button>';}).join('')+
      '</div></div></div></section>';
  }

  function proInsightCatalogs(){
    var seen={},out=[];
    state.entries.filter(function(e){return e.status!=='quero-assistir';}).forEach(function(e){
      var c=getCatalog(e.catalogId);if(c&&!seen[c.id]){seen[c.id]=1;out.push(c);}
    });
    return out;
  }
  async function loadProInsightDetails(cat){
    if(!cat||!tmdbConfigured())return null;
    if(cat.tmdbData&&cat.tmdbData.aggregate_credits)return cat.tmdbData;
    var id=cat.tmdbId;
    if(!id){var rows=await tmdbSearchTV(cat.title),m=chooseTmdbMatch(rows,cat);if(!m)return null;id=m.id;}
    var d=tmdbCacheGet('series:'+id,86400000);
    if(!d){d=await tmdbFetch('/tv/'+id,{language:'pt-BR',append_to_response:'aggregate_credits,external_ids'});tmdbCacheSet('series:'+id,d);}
    cat.tmdbId=d.id;cat.tmdbData=d;cat.tmdbLoaded=true;cat.poster_path=d.poster_path||cat.poster_path||null;cat.backdrop_path=d.backdrop_path||cat.backdrop_path||null;
    cat.genre=(d.genres&&d.genres[0]&&d.genres[0].name)||cat.genre||'Série';
    if(Array.isArray(d.seasons))cat.seasons=d.seasons.filter(function(s){return Number(s.season_number)>0;}).map(function(s){return Number(s.episode_count)||0;});
    return d;
  }
  async function hydrateProInsights(){
    if(!hasPro()||!tmdbConfigured()||state.proInsightsHydrating)return;
    var pending=proInsightCatalogs().filter(function(c){return !(c.tmdbData&&c.tmdbData.aggregate_credits);}).slice(0,24);
    if(!pending.length)return;
    state.proInsightsHydrating=true;if(state.view==='pro-estatisticas'||state.view==='pro-wrapped')renderMainViewOnly();
    try{for(var i=0;i<pending.length;i+=4)await Promise.allSettled(pending.slice(i,i+4).map(loadProInsightDetails));}
    finally{state.proInsightsHydrating=false;if(state.view==='pro-estatisticas'||state.view==='pro-wrapped')renderMainViewOnly();}
  }
  function proLeader(map){return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.count-a.count||a.name.localeCompare(b.name);})[0]||null;}
  function proPeopleStats(cats){
    var actors={},creators={};
    (cats||[]).forEach(function(cat){
      var d=cat&&cat.tmdbData||{},cr=d.aggregate_credits||{},sa={},sc={};
      (cr.cast||[]).slice(0,10).forEach(function(p){if(!p||!p.id||sa[p.id])return;sa[p.id]=1;var k=String(p.id);if(!actors[k])actors[k]={name:p.name||'Ator/Atriz',count:0};actors[k].count++;});
      (d.created_by||[]).forEach(function(p){if(!p||!p.id||sc[p.id])return;sc[p.id]=1;var k=String(p.id);if(!creators[k])creators[k]={name:p.name||'Criador',count:0};creators[k].count++;});
      (cr.crew||[]).forEach(function(p){if(!p||!p.id||sc[p.id])return;var jobs=(p.jobs||[]).map(function(j){return j&&j.job||'';});if(p.department!=='Directing'&&!jobs.some(function(j){return /director/i.test(j);}))return;sc[p.id]=1;var k=String(p.id);if(!creators[k])creators[k]={name:p.name||'Diretor',count:0};creators[k].count++;});
    });
    return {actor:proLeader(actors),creator:proLeader(creators)};
  }
  function proMonthLabel(k){if(!k)return '—';var p=k.split('-'),d=new Date(Number(p[0]),Number(p[1])-1,1);return d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});}
  function proFormatMinutes(n){n=Math.max(0,Math.round(Number(n)||0));if(n<60)return n+' min';var h=Math.floor(n/60),m=n%60;return h+'h'+(m?' '+m+'min':'');}
  function proStatsSnapshot(){
    var es=state.entries.slice(),consumed=es.filter(function(e){return e.status!=='quero-assistir';}),rated=es.filter(function(e){return Number(e.rating)>0;}),done=es.filter(function(e){return e.status==='completo';}),genres={},months={},minutes=0;
    consumed.forEach(function(e){var c=getCatalog(e.catalogId);if(!c)return;var d=c.tmdbData||{},g=(d.genres&&d.genres[0]&&d.genres[0].name)||c.genre||'Série';genres[g]=(genres[g]||0)+1;if(e.status==='completo'){var eps=Number(d.number_of_episodes||0);if(!eps&&Array.isArray(c.seasons))eps=c.seasons.reduce(function(a,b){return a+Number(b||0);},0);if(eps)minutes+=eps*(Number(d.episode_run_time&&d.episode_run_time[0]||0)||45);}});
    state.diary.forEach(function(d){var k=String(d.date||'').slice(0,7);if(k)months[k]=(months[k]||0)+1;});
    var gr=Object.keys(genres).map(function(k){return {name:k,count:genres[k]};}).sort(function(a,b){return b.count-a.count;}),mr=Object.keys(months).map(function(k){return {key:k,count:months[k]};}).sort(function(a,b){return b.count-a.count;}),people=proPeopleStats(proInsightCatalogs());
    return {total:es.length,completed:done.length,completion:consumed.length?Math.round(done.length/consumed.length*100):0,avg:rated.length?rated.reduce(function(s,e){return s+Number(e.rating||0);},0)/rated.length:0,diary:state.diary.length,episodes:state.diary.filter(function(d){return d.type==='episode';}).length,minutes:minutes,genre:gr[0]||null,month:mr[0]||null,actor:people.actor,creator:people.creator};
  }
  function proBar(label,n,max){var p=max?Math.max(3,Number(n||0)/max*100):0;return '<div class="pro-stats-bar"><span>'+escapeHtml(label)+'</span><div><i style="width:'+p+'%"></i></div><b>'+Number(n||0)+'</b></div>';}
  function viewProStatistics(){
    if(!hasPro())return '<div>'+proContextBannerHtml('Estatísticas avançadas','Este painel faz parte do Bingeo Pro.','estatisticas')+'</div>';
    var s=proStatsSnapshot(),st={};['quero-assistir','assistindo','completo','pausado','abandonado'].forEach(function(k){st[k]=state.entries.filter(function(e){return e.status===k;}).length;});var mx=Math.max(1,st['quero-assistir'],st.assistindo,st.completo,st.pausado,st.abandonado);
    return '<div class="pro-insights-page"><div class="pro-subpage-head"><div><button class="btn btn-ghost btn-sm" data-action="open-my-profile">← Perfil</button><div class="pro-page-kicker">✦ BINGEO PRO</div><h1>Estatísticas avançadas</h1><p>Um retrato detalhado do seu consumo de séries.</p></div><button class="btn btn-primary" data-action="open-pro-wrapped">Ver Bingeo Wrapped</button></div>'+
      (state.proInsightsHydrating?'<div class="pro-insight-loading">Atualizando dados em pequenos lotes…</div>':'')+
      '<div class="pro-stats-grid"><div class="pro-stat-card"><strong>'+s.total+'</strong><span>títulos</span></div><div class="pro-stat-card"><strong>'+s.completion+'%</strong><span>conclusão</span></div><div class="pro-stat-card"><strong>'+(s.avg?s.avg.toFixed(1):'—')+'</strong><span>nota média</span></div><div class="pro-stat-card"><strong>'+s.episodes+'</strong><span>episódios no diário</span></div><div class="pro-stat-card"><strong>'+proFormatMinutes(s.minutes)+'</strong><span>tempo estimado</span></div><div class="pro-stat-card"><strong>'+s.diary+'</strong><span>registros</span></div></div>'+
      '<div class="pro-insight-grid"><section class="pro-insight-panel"><div class="pro-insight-title">Seus destaques</div><div class="pro-leader-row"><span>Gênero</span><strong>'+escapeHtml(s.genre?s.genre.name:'—')+'</strong></div><div class="pro-leader-row"><span>Ator/Atriz recorrente</span><strong>'+escapeHtml(s.actor?s.actor.name:'—')+'</strong></div><div class="pro-leader-row"><span>Diretor/Criador recorrente</span><strong>'+escapeHtml(s.creator?s.creator.name:'—')+'</strong></div><div class="pro-leader-row"><span>Mês mais ativo</span><strong>'+escapeHtml(s.month?proMonthLabel(s.month.key):'—')+'</strong></div></section>'+
      '<section class="pro-insight-panel"><div class="pro-insight-title">Estante por status</div>'+proBar('Quero assistir',st['quero-assistir'],mx)+proBar('Assistindo',st.assistindo,mx)+proBar('Completo',st.completo,mx)+proBar('Em pausa',st.pausado,mx)+proBar('Abandonado',st.abandonado,mx)+'</section></div></div>';
  }

  function proWrappedYears(){var ys={};state.diary.forEach(function(d){var y=parseInt(String(d.date||'').slice(0,4),10);if(y)ys[y]=1;});state.entries.forEach(function(e){var y=new Date(e.dateUpdated||0).getFullYear();if(y>2000)ys[y]=1;});ys[new Date().getFullYear()]=1;return Object.keys(ys).map(Number).sort(function(a,b){return b-a;});}
  function proWrappedSnapshot(year){
    year=Number(year)||new Date().getFullYear();var ds=state.diary.filter(function(d){return parseInt(String(d.date||'').slice(0,4),10)===year;}),up=state.entries.filter(function(e){return new Date(e.dateUpdated||0).getFullYear()===year;}),counts={},months={},days={},genres={},mins=0;
    ds.forEach(function(d){counts[d.catalogId]=(counts[d.catalogId]||0)+1;var m=String(d.date||'').slice(0,7);if(m)months[m]=(months[m]||0)+1;if(d.date)days[d.date]=1;if(d.type==='episode'){var c=getCatalog(d.catalogId),x=c&&c.tmdbData||{};mins+=Number(x.episode_run_time&&x.episode_run_time[0]||0)||45;}});
    if(!Object.keys(counts).length)up.forEach(function(e){counts[e.catalogId]=(counts[e.catalogId]||0)+1;});
    Object.keys(counts).forEach(function(cid){var c=getCatalog(cid);if(!c)return;var x=c.tmdbData||{},g=(x.genres&&x.genres[0]&&x.genres[0].name)||c.genre||'Série';genres[g]=(genres[g]||0)+counts[cid];});
    var ts=Object.keys(counts).map(function(cid){return {cat:getCatalog(cid),count:counts[cid]};}).filter(function(x){return x.cat;}).sort(function(a,b){return b.count-a.count;})[0]||null,tg=Object.keys(genres).map(function(k){return {name:k,count:genres[k]};}).sort(function(a,b){return b.count-a.count;})[0]||null,tm=Object.keys(months).map(function(k){return {key:k,count:months[k]};}).sort(function(a,b){return b.count-a.count;})[0]||null,people=proPeopleStats(Object.keys(counts).map(getCatalog).filter(Boolean)),ratings=up.filter(function(e){return Number(e.rating)>0;});
    return {year:year,episodes:ds.filter(function(d){return d.type==='episode';}).length,days:Object.keys(days).length,minutes:mins,series:ts,genre:tg,month:tm,actor:people.actor,creator:people.creator,ratings:ratings.length,avg:ratings.length?ratings.reduce(function(s,e){return s+Number(e.rating||0);},0)/ratings.length:0,completed:up.filter(function(e){return e.status==='completo';}).length};
  }
  function viewProWrapped(){
    if(!hasPro())return '<div>'+proContextBannerHtml('Bingeo Wrapped','Sua retrospectiva anual faz parte do Bingeo Pro.','wrapped')+'</div>';
    var ys=proWrappedYears();if(!state.proWrappedYear||ys.indexOf(Number(state.proWrappedYear))===-1)state.proWrappedYear=ys[0];var w=proWrappedSnapshot(state.proWrappedYear),title=w.series&&w.series.cat?w.series.cat.title:'Ainda construindo sua história';
    return '<div class="pro-wrapped-page"><div class="pro-subpage-head"><div><button class="btn btn-ghost btn-sm" data-action="open-my-profile">← Perfil</button><div class="pro-page-kicker">✦ BINGEO WRAPPED</div><h1>Meu '+w.year+' em séries</h1><p>Sua retrospectiva anual no Bingeo.</p></div><button class="btn btn-primary" data-action="share-pro-wrapped">Compartilhar</button></div><div class="pro-wrapped-years">'+ys.map(function(y){return '<button class="'+(Number(y)===Number(w.year)?'active':'')+'" data-action="pro-wrapped-year" data-year="'+y+'">'+y+'</button>';}).join('')+'</div>'+
      '<section class="wrapped-hero-card"><span class="wrapped-small">BINGEO PRO · '+w.year+'</span><h2>'+escapeHtml(title)+'</h2><p>Sua série mais presente neste ano.</p><div class="wrapped-metrics"><div><strong>'+w.episodes+'</strong><span>episódios</span></div><div><strong>'+w.days+'</strong><span>dias ativos</span></div><div><strong>'+(w.avg?w.avg.toFixed(1):'—')+'</strong><span>nota média</span></div><div><strong>'+proFormatMinutes(w.minutes)+'</strong><span>tempo registrado</span></div></div></section>'+
      '<div class="wrapped-grid"><div><span>Gênero do ano</span><strong>'+escapeHtml(w.genre?w.genre.name:'—')+'</strong></div><div><span>Ator/Atriz</span><strong>'+escapeHtml(w.actor?w.actor.name:'—')+'</strong></div><div><span>Diretor/Criador</span><strong>'+escapeHtml(w.creator?w.creator.name:'—')+'</strong></div><div><span>Mês mais ativo</span><strong>'+escapeHtml(w.month?proMonthLabel(w.month.key):'—')+'</strong></div><div><span>Avaliações</span><strong>'+w.ratings+'</strong></div><div><span>Concluídos</span><strong>'+w.completed+'</strong></div></div></div>';
  }
  async function shareProWrapped(){
    var w=proWrappedSnapshot(state.proWrappedYear||new Date().getFullYear()),text='Meu '+w.year+' no Bingeo: '+w.episodes+' episódios, '+w.days+' dias ativos, gênero '+(w.genre?w.genre.name:'—')+' e nota média '+(w.avg?w.avg.toFixed(1):'—')+'. ✦ Bingeo Pro';
    try{if(navigator.share){await navigator.share({title:'Meu '+w.year+' no Bingeo',text:text});return;}}catch(e){if(e&&e.name==='AbortError')return;}
    try{await navigator.clipboard.writeText(text);alert('Retrospectiva copiada!');}catch(e){window.prompt('Copie sua retrospectiva:',text);}
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
  function proProfileFeatureHubHtml(){if(!hasPro())return '';return '<section class="pro-feature-hub"><div class="section-title">Seu Bingeo Pro</div><div class="pro-feature-hub-grid"><button data-action="open-pro-stats"><span>▥</span><strong>Estatísticas avançadas</strong><small>Consumo, gêneros e profissionais.</small></button><button data-action="open-pro-wrapped"><span>✦</span><strong>Bingeo Wrapped</strong><small>Sua retrospectiva anual.</small></button><button data-action="edit-profile"><span>◈</span><strong>Temas e identidade</strong><small>Temas, molduras e insígnias.</small></button></div></section>';}
  function proExpansionBenefitsHtml(){return '<section class="pro-expansion-benefits"><div class="section-title">Ainda mais no Bingeo Pro</div><div class="pro-expansion-grid"><div><span>▥</span><strong>Estatísticas avançadas</strong><p>Tempo estimado, gêneros e profissionais.</p></div><div><span>◈</span><strong>Temas completos</strong><p>Neon, Cinema, Minimal, OLED e Retrô.</p></div><div><span>☷</span><strong>Listas Pro</strong><p>Banner, ranking, ordem e destaque.</p></div><div><span>✦</span><strong>Insígnias e molduras</strong><p>Mais identidade no seu perfil.</p></div><div><span>'+new Date().getFullYear()+'</span><strong>Bingeo Wrapped</strong><p>Sua retrospectiva anual.</p></div></div></section>';}

  function handleProFeatureAction(action,el){
    if(action==='open-pro-stats'){if(!hasPro()){openProView('estatisticas');return true;}state.view='pro-estatisticas';render();hydrateProInsights();return true;}
    if(action==='open-pro-wrapped'){if(!hasPro()){openProView('wrapped');return true;}state.view='pro-wrapped';render();hydrateProInsights();return true;}
    if(action==='pro-wrapped-year'){state.proWrappedYear=Number(el.dataset.year)||new Date().getFullYear();renderMainViewOnly();return true;}
    if(action==='share-pro-wrapped'){shareProWrapped();return true;}
    if(action==='set-pro-profile-theme'){if(hasPro()){updateOwnProProfileSettings({theme:String(el.dataset.value||'default')});render();}return true;}
    if(action==='set-pro-avatar-frame'){if(hasPro()){updateOwnProProfileSettings({frame:String(el.dataset.value||'none')});render();}return true;}
    if(action==='set-pro-profile-badge'){if(hasPro()){updateOwnProProfileSettings({badge:String(el.dataset.value||'pro')});render();}return true;}
    if(action==='set-pro-highlight-list'){if(!hasPro()){openProView('lista-destaque');return true;}var l=state.lists.find(function(x){return x.id===el.dataset.list;});if(!l)return true;var cfg=ensureOwnProProfileSettings(),on=cfg.highlightedListId!==l.id;if(on&&l.visibility!=='public'){if(!confirm('Para aparecer para outras pessoas, a lista destacada precisa ser pública. Tornar pública agora?'))return true;l.visibility='public';l.updatedAt=new Date().toISOString();saveData();syncListToSupabase(l);}updateOwnProProfileSettings({highlightedListId:on?l.id:''});renderMainViewOnly();return true;}
    if(action==='choose-pro-list-banner'){if(!hasPro()){openProView('lista-banner');return true;}state.proListBannerTarget=el.dataset.list;var input=document.getElementById('listBannerInput');if(input)input.click();return true;}
    if(action==='remove-pro-list-banner'){var l=state.lists.find(function(x){return x.id===el.dataset.list;});if(l&&hasPro()){ensureListProSettings(l).bannerUrl='';l.updatedAt=new Date().toISOString();saveData();syncListToSupabase(l);renderMainViewOnly();}return true;}
    if(action==='toggle-pro-list-ranking'){var l=state.lists.find(function(x){return x.id===el.dataset.list;});if(l&&hasPro()){var s=ensureListProSettings(l);s.ranked=!s.ranked;l.updatedAt=new Date().toISOString();saveData();syncListToSupabase(l);renderMainViewOnly();}return true;}
    if(action==='pro-list-move'){var l=state.lists.find(function(x){return x.id===el.dataset.list;});if(!l||!hasPro())return true;var s=ensureListProSettings(l),o=proListOrderedIds(l),i=o.indexOf(el.dataset.catalog),j=el.dataset.dir==='up'?i-1:i+1;if(i<0||j<0||j>=o.length)return true;var t=o[i];o[i]=o[j];o[j]=t;s.manualOrder=o;l.updatedAt=new Date().toISOString();saveData();syncListToSupabase(l);renderMainViewOnly();return true;}
    if(action==='save-pro-list-description'){var l=state.lists.find(function(x){return x.id===el.dataset.list;}),ta=document.getElementById('proListDescription');if(l&&ta&&hasPro()){ensureListProSettings(l).formattedDescription=String(ta.value||'').slice(0,1600);l.updatedAt=new Date().toISOString();saveData();syncListToSupabase(l);renderMainViewOnly();}return true;}
    if(action==='open-public-highlighted-list'){var slug=String(el.dataset.slug||'');if(!slug)return true;loadPublicSharedList(slug).then(function(l){if(l){state.userProfileOpen=null;state.userProfileData=null;state.listOpen=l.id;state.view='listas';render();}}).catch(function(e){alert(e.message||'Não foi possível abrir a lista.');});return true;}
    return false;
  }
