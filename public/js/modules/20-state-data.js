/* ---------------- state & storage ---------------- */
  var LIB_KEY = 'bingeo-library-v1';
  var TRENDING_KEY = 'bingeo-trending-v1';
  var THEME_KEY = 'bingeo-theme-preference';

  var state = {
    view:'home',
    query:'',
    catalogType:'todos',
    entries:[],
    diary:[],
    lists:[],
    profile:{ photo:null, topFive:[], username:'', bio:'', plan:'free', editing:false, nameStyle:{color:null,effect:'none',theme:'dark',highlights:{character:'',actor:null,creator:null}} },
    trending:{},
    trendingUsers:{},
    tmdbSearchResults:[],
    tmdbPersonResults:[],
    characterSearchResults:[],
    userSearchResults:[],
    tmdbSearchLoading:false,
    tmdbSearchError:'',
    tmdbSearchRequest:0,
    listOpen:null,
    listCreateOpen:false,
    modalCatalogId:null,
    seriesCommunity:{},
    communityLoading:{},
    revealedSpoilers:{},
    listExtras:{},
    listCoverTarget:null,
    professionalOpen:null,
    professionalData:null,
    professionalLoading:false,
    professionalError:'',
    professionalBackView:'descobrir',
    professionalRoleTab:null,
    professionalHydrating:false,
    favoriteProfessionals:[],
    favoriteCharacters:[],
    seriesArtworkOptions:{},
    seriesArtworkLoading:{},
    seriesArtPickerId:null,
    characterArtPickerKey:null,
    characterArtworkLoading:{},
    characterOpen:null,
    characterData:null,
    characterLoading:false,
    characterError:'',
    characterBackView:'descobrir',
    userProfileOpen:null,
    userProfileData:null,
    userProfileLoading:false,
    userProfileError:'',
    userProfileBackView:'descobrir',
    socialFeed:[],
    socialFeedLoading:false,
    socialFeedError:'',
    reviewComposerModes:{},
    reviewDrafts:{},
    reviewSpoilerDrafts:{},
    editalDrafts:{},
    reviewSaveNotice:{},
    editalArtworkOptions:{},
    editalArtworkLoading:{},
    editalComments:{},
    editalCommentsOpen:{},
    editalCommentLoading:{},
    seriesEditalsOpen:{},
    myEditals:[],
    myEditalsLoading:false,
    myEditalsError:'',
    billingConfig:null,
    billingStatus:null,
    billingLoading:false,
    billingError:'',
    billingNotice:''
  };
  var tmdbHydrationPromises={};
  var characterLocalCache={};
  var tmdbSearchTimer=null;
  var TMDB_CACHE_KEY='bingeo-tmdb-cache-v1';
  var tmdbCacheMemory=null;
  var expandedSeasons = {};
  var top5EditorOpen = false;

  function uid(){ return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,8); }
  function slugify(value){return String(value||'lista').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)||'lista';}
  function makeShareSlug(name){return slugify(name)+'-'+Math.random().toString(36).slice(2,8);}
  function todayIso(){ return new Date().toISOString().slice(0,10); }
  function formatDateLong(iso){
    var d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });
  }
  function escapeHtml(s){
    if(s===undefined||s===null) return '';
    return String(s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }
  function normalizeTheme(value){return value==='light'?'light':'dark';}
  function applyThemePreference(value){
    var theme=normalizeTheme(value);
    document.documentElement.setAttribute('data-theme',theme);
    try{localStorage.setItem(THEME_KEY,theme);}catch(e){}
    return theme;
  }
  function normalizeProfileHighlights(value,legacyTopCharacters){
    value=value&&typeof value==='object'?value:{};
    var legacy=Array.isArray(legacyTopCharacters)?legacyTopCharacters.filter(Boolean):[];
    return {
      character:String(value.character||legacy[0]||''),
      actor:Number(value.actor||0)||null,
      creator:Number(value.creator||0)||null
    };
  }
  function hashHue(str){
    var h=0;
    for(var i=0;i<str.length;i++){ h = str.charCodeAt(i) + ((h<<5)-h); h = h & h; }
    return Math.abs(h);
  }
  var TYPE_PATTERN = {
    'serie':'repeating-linear-gradient(135deg, rgba(255,255,255,.05) 0px, rgba(255,255,255,.05) 2px, transparent 2px, transparent 16px)',
    'reality':'radial-gradient(rgba(255,255,255,.16) 1px, transparent 1.6px)',
    'minisserie':'repeating-linear-gradient(0deg, rgba(255,255,255,.07) 0px, rgba(255,255,255,.07) 1px, transparent 1px, transparent 5px)',
    'talk':'repeating-radial-gradient(circle at 28% 22%, rgba(255,255,255,.09) 0, rgba(255,255,255,.09) 1px, transparent 1px, transparent 11px)'
  };
  var TYPE_PATTERN_SIZE = { 'reality':'background-size:13px 13px;' };

  function posterStyle(title, type){
    var base = hashHue(title||'?');
    var hue = 220 + (base % 90);
    var hue2 = (hue + 34) % 360;
    var pattern = TYPE_PATTERN[type] || TYPE_PATTERN.serie;
    var patternSize = TYPE_PATTERN_SIZE[type] || '';
    return 'background-image:' + pattern + ', linear-gradient(135deg, hsl(' + hue + ',60%,24%), hsl(' + hue2 + ',55%,13%)); ' + patternSize;
  }
  function swatchStyle(title){
    var base = hashHue(title||'?');
    var hue = 220 + (base % 90);
    return 'background:hsl(' + hue + ',50%,26%);';
  }

  /* ---------------- genre icons (desenhados na mão, sem arte de terceiros) ---------------- */
  var ICONS = {
    magnifier:'<circle cx="10" cy="10" r="6"/><line x1="14.5" y1="14.5" x2="20" y2="20"/>',
    mask:'<path d="M4 9c2-3 14-3 16 0"/><path d="M4 9c0 6 4 10 8 10s8-4 8-10"/><circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="11" r="1" fill="currentColor" stroke="none"/>',
    planet:'<circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="9.5" ry="2.6" transform="rotate(-18 12 12)"/>',
    star:'<path d="M12 3l2.6 5.9L21 9.6l-4.8 4.2L17.6 21 12 17.6 6.4 21l1.4-7.2L3 9.6l6.4-.7z"/>',
    crown:'<path d="M4 18h16l1-9-5 4-4-7-4 7-5-4z"/>',
    smiley:'<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="10" r="1" fill="currentColor" stroke="none"/><path d="M8 14c1.5 2 6.5 2 8 0"/>',
    pulse:'<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    heart:'<path d="M12 20s-7-4.4-9.5-9C1 7.8 2.6 5 5.5 5c1.9 0 3.3 1 4.5 2.6C11.2 6 12.6 5 14.5 5 17.4 5 19 7.8 21.5 11 19 15.6 12 20 12 20z"/>',
    eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
    twoHearts:'<path d="M9 17s-5-3.2-6.6-6.3C1.5 8.7 2.6 6.5 4.8 6.5c1.3 0 2.3.7 3.2 1.8.9-1.1 1.9-1.8 3.2-1.8 2.2 0 3.3 2.2 2.4 4.2C12 13.8 9 17 9 17z"/><path d="M16 20s-4-2.6-5.2-5c-.9-1.6-.1-3.4 1.6-3.4 1 0 1.8.5 2.6 1.4.7-.9 1.6-1.4 2.6-1.4 1.7 0 2.5 1.8 1.6 3.4C20 17.4 16 20 16 20z"/>',
    network:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><line x1="7.6" y1="7.2" x2="10.6" y2="16.2"/><line x1="16.4" y1="7.2" x2="13.4" y2="16.2"/><line x1="8" y1="6" x2="16" y2="6"/>',
    mountain:'<path d="M3 19l6-10 4 6 2-3 6 7z"/><path d="M17 6v6M14.5 8.5h5"/>',
    chefHat:'<path d="M7 21h10v-5H7z"/><path d="M6 12a4 4 0 0 1 2-3.5A4 4 0 0 1 12 5a4 4 0 0 1 4 3.5A4 4 0 0 1 18 12c0 2-1.5 3.5-3 4H9c-1.5-.5-3-2-3-4z"/>',
    mic:'<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/>',
    trophy:'<path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4"/><path d="M12 13v4M9 21h6M9 19h6v2H9z"/>'
  };
  var GENRE_ICON = {
    'Suspense':'magnifier', 'Drama':'mask', 'Ficção científica':'planet', 'Fantasia':'star',
    'Drama histórico':'crown', 'Comédia':'smiley', 'Comédia / Mistério':'smiley',
    'Drama pós-apocalíptico':'mountain', 'Drama médico':'pulse', 'Romance':'heart', 'Crime':'magnifier',
    'Confinamento':'eye', 'Relacionamento':'twoHearts', 'Jogo social':'network', 'Sobrevivência':'mountain',
    'Competição culinária':'chefHat', 'Competição musical':'mic', 'Competição / talento':'trophy'
  };
  function genreIconSvg(genre){
    var key = GENRE_ICON[genre] || 'star';
    var paths = ICONS[key] || ICONS.star;
    return '<svg class="poster-icon" viewBox="0 0 24 24" stroke="rgba(255,255,255,.5)" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }
  function tmdbImageUrl(path,size){ return path ? 'https://image.tmdb.org/t/p/' + (size||'w500') + path : ''; }
  function posterBackgroundStyle(cat,size){
    var path=cat && (cat.poster_path || (cat.tmdbData&&cat.tmdbData.poster_path));
    var url=tmdbImageUrl(path,size||'w500');
    if(url) return 'background-image:url(\'' + url.replace(/'/g,'%27') + '\');background-size:cover;background-position:center;background-repeat:no-repeat;';
    return posterStyle(cat.title,cat.type);
  }
  function posterHtml(cat, extra, extraClass){
    var letter=(cat.title||'?').trim().charAt(0).toUpperCase();
    var hasPoster=!!(cat && (cat.poster_path || (cat.tmdbData&&cat.tmdbData.poster_path)));
    var cls='poster' + (extraClass?(' '+extraClass):'') + (hasPoster?' tmdb-poster':'');
    var size=(extraClass&&extraClass.indexOf('modal-poster')>-1)?'original':'w342';
    return '<div class="'+cls+'" style="'+posterBackgroundStyle(cat,size)+'">'+(hasPoster?'':genreIconSvg(cat.genre))+(hasPoster?'':'<span class="monogram">'+escapeHtml(letter)+'</span>')+(extra||'')+'</div>';
  }
  function seriesHeroHtml(cat){
    var backdrop=cat&&(cat.backdrop_path||(cat.tmdbData&&cat.tmdbData.backdrop_path));
    var style='';
    if(backdrop){
      var url=tmdbImageUrl(backdrop,'w1280');
      style='background-image:url(\''+url.replace(/'/g,'%27')+'\');';
    }else{
      style=posterStyle(cat.title,cat.type);
    }
    return '<div class="series-hero" style="'+style+'"><button class="modal-close" data-action="close-modal">✕</button></div>';
  }

  /* ---------------- data layer v2 (backward-compatible) ---------------- */
  var DB_SCHEMA_VERSION=4; var DB_KEY_BASE='bingeo-db-v2'; var dbInitPromise=null;
  function currentDbKey(){return currentUserId?(DB_KEY_BASE+':'+currentUserId):null;}
  function currentIdbKey(){return currentUserId?('state:'+currentUserId):null;}
  function defaultDb(){return {schemaVersion:DB_SCHEMA_VERSION,updatedAt:new Date().toISOString(),library:{entries:[],diary:[],lists:[]},profile:{photo:null,banner:null,topFive:[],topFiveArtwork:{},topCharacters:[],topCharacterArtwork:{},username:'',bio:'',plan:'free',editing:false,nameStyle:{color:null,effect:'none',theme:'dark',highlights:{character:'',actor:null,creator:null}},socialLinks:[]}};}
  function normalizeDb(db){var b=defaultDb();db=(db&&typeof db==='object')?db:{};var p=Object.assign({},b.profile,db.profile||{});p.nameStyle=Object.assign({},b.profile.nameStyle,p.nameStyle||{});p.nameStyle.theme=normalizeTheme(p.nameStyle.theme);p.nameStyle.highlights=normalizeProfileHighlights(p.nameStyle.highlights,p.topCharacters);p.socialLinks=Array.isArray(p.socialLinks)?p.socialLinks.filter(function(x){return x&&typeof x==='object'&&typeof x.url==='string';}):[];p.topFive=Array.isArray(p.topFive)?p.topFive.slice(0,5):[];p.topFiveArtwork=p.topFiveArtwork&&typeof p.topFiveArtwork==='object'?p.topFiveArtwork:{};p.topCharacters=p.nameStyle.highlights.character?[p.nameStyle.highlights.character]:[];p.topCharacterArtwork=p.topCharacterArtwork&&typeof p.topCharacterArtwork==='object'?p.topCharacterArtwork:{};if(p.plan!=='pro')p.plan='free';return {schemaVersion:DB_SCHEMA_VERSION,updatedAt:db.updatedAt||b.updatedAt,library:{entries:Array.isArray(db.library&&db.library.entries)?db.library.entries:[],diary:Array.isArray(db.library&&db.library.diary)?db.library.diary:[],lists:Array.isArray(db.library&&db.library.lists)?db.library.lists:[]},profile:p};}
  function readLocalDb(){var key=currentDbKey();if(!key)return null;try{var r=localStorage.getItem(key);return r?normalizeDb(JSON.parse(r)):null;}catch(e){return null;}}
  function writeLocalDb(db){var key=currentDbKey();if(!key)return false;try{localStorage.setItem(key,JSON.stringify(db));return true;}catch(e){return false;}}
  function openBingeoDb(){if(dbInitPromise)return dbInitPromise;dbInitPromise=new Promise(function(resolve){if(!('indexedDB' in window)){resolve(null);return;}try{var req=indexedDB.open('BingeoDB',1);req.onupgradeneeded=function(e){if(!e.target.result.objectStoreNames.contains('app'))e.target.result.createObjectStore('app',{keyPath:'key'});};req.onsuccess=function(){resolve(req.result);};req.onerror=function(){resolve(null);};}catch(e){resolve(null);}});return dbInitPromise;}
  async function readDb(){
    var key=currentIdbKey();if(!key)return defaultDb();
    var local=readLocalDb();if(local)return local;
    var idb=await openBingeoDb();if(!idb)return defaultDb();
    return await new Promise(function(resolve){
      var tx=idb.transaction('app','readonly'),req=tx.objectStore('app').get(key);
      req.onsuccess=function(){resolve(req.result&&req.result.value?normalizeDb(req.result.value):defaultDb());};
      req.onerror=function(){resolve(defaultDb());};
    });
  }
  async function persistDb(db){
    var key=currentIdbKey();if(!key)return;
    db=normalizeDb(db);db.updatedAt=new Date().toISOString();writeLocalDb(db);
    try{
      var idb=await openBingeoDb();
      if(idb)await new Promise(function(resolve){
        var tx=idb.transaction('app','readwrite');
        tx.objectStore('app').put({key:key,value:db});
        tx.oncomplete=resolve;tx.onerror=resolve;
      });
    }catch(e){}
  }
  function resetAccountRuntime(){
    var fresh=defaultDb();
    state.view='home';
    state.entries=[];
    state.diary=[];
    state.lists=[];
    state.profile=fresh.profile;
    state.socialFeed=[];
    state.trending={};
    state.trendingUsers={};
    state.socialFeedLoading=false;
    state.socialFeedError='';
    state.reviewComposerModes={};
    state.reviewDrafts={};
    state.reviewSpoilerDrafts={};
    state.editalDrafts={};
    state.reviewSaveNotice={};
    state.editalArtworkOptions={};
    state.editalArtworkLoading={};
    state.editalComments={};
    state.editalCommentsOpen={};
    state.editalCommentLoading={};
    state.seriesEditalsOpen={};
    state.myEditals=[];
    state.myEditalsLoading=false;
    state.myEditalsError='';
    state.billingConfig=null;
    state.billingStatus=null;
    state.billingLoading=false;
    state.billingError='';
    state.billingNotice='';
    state.userSearchResults=[];
    state.userProfileOpen=null;
    state.userProfileData=null;
    state.userProfileLoading=false;
    state.userProfileError='';
    state.professionalOpen=null;
    state.professionalData=null;
    state.professionalLoading=false;
    state.professionalError='';
    state.professionalRoleTab=null;
    state.professionalHydrating=false;
    state.favoriteProfessionals=[];
    state.favoriteCharacters=[];
    state.seriesArtworkOptions={};
    state.seriesArtworkLoading={};
    state.seriesArtPickerId=null;
    state.characterArtPickerKey=null;
    state.characterArtworkLoading={};
    top5EditorOpen=false;
    state.characterSearchResults=[];
    state.characterOpen=null;
    state.characterData=null;
    state.characterLoading=false;
    state.characterError='';
    characterLocalCache={};
    state.modalCatalogId=null;
    state.listOpen=null;
    state.listCreateOpen=false;
    state.query='';
  }
  async function loadData(){try{var db=await readDb();state.entries=db.library.entries||[];state.diary=db.library.diary||[];state.lists=db.library.lists||[];state.profile=Object.assign(defaultDb().profile,db.profile||{});state.profile.nameStyle=Object.assign({color:null,effect:'none',theme:'dark',highlights:{character:'',actor:null,creator:null}},state.profile.nameStyle||{});state.profile.nameStyle.theme=normalizeTheme(state.profile.nameStyle.theme);state.profile.nameStyle.highlights=normalizeProfileHighlights(state.profile.nameStyle.highlights,state.profile.topCharacters);state.profile.topCharacters=state.profile.nameStyle.highlights.character?[state.profile.nameStyle.highlights.character]:[];applyThemePreference(state.profile.nameStyle.theme);state.profile.socialLinks=Array.isArray(state.profile.socialLinks)?state.profile.socialLinks:[];if(state.profile.plan!=='pro')state.profile.plan='free';state.entries.forEach(function(e){
  if(!e.premiumRating)e.premiumRating={format:'classic',value:null,reactions:[]};
  if(!e.criteriaRatings||typeof e.criteriaRatings!=='object')e.criteriaRatings={};
  if(!Array.isArray(e.badges))e.badges=[];
  if(!e.spoilerLevel)e.spoilerLevel='none';
  if(e.spoilerSeason===undefined)e.spoilerSeason=null;
  if(e.spoilerEpisode===undefined)e.spoilerEpisode=null;
  if(!e.seasonArtwork||typeof e.seasonArtwork!=='object')e.seasonArtwork={};
  if(!e.episodeArtwork||typeof e.episodeArtwork!=='object')e.episodeArtwork={};
  e.proReview=normalizeProReview(e.proReview||{});
});state.diary.forEach(function(d){if(!d.type)d.type='series';if(d.season===undefined)d.season=null;if(d.episode===undefined)d.episode=null;if(d.note===undefined)d.note='';});state.lists.forEach(function(l){
  if(!l.id)l.id=uid();
  if(!l.createdAt)l.createdAt=new Date().toISOString();
  if(!l.updatedAt)l.updatedAt=l.createdAt;
  if(l.visibility===undefined)l.visibility='private';
  if(l.owner===undefined)l.owner=state.profile.username||null;
  if(l.coverUrl===undefined)l.coverUrl=null;
  if(!l.shareSlug)l.shareSlug=makeShareSlug(l.name);
  if(l.allowComments===undefined)l.allowComments=true;
  if(!Array.isArray(l.showIds))l.showIds=[];
  if(!Array.isArray(l.collaborators))l.collaborators=[];
  if(!Array.isArray(l.comments))l.comments=[];
});await persistDb({library:{entries:state.entries,diary:state.diary,lists:state.lists},profile:state.profile});}catch(e){console.log('Sem dados salvos ainda.',e);}await loadTrending();}
  async function saveData(){try{await persistDb({library:{entries:state.entries,diary:state.diary,lists:state.lists},profile:state.profile});}catch(e){console.error('Erro ao salvar:',e);}}
  async function syncEntryToSupabase(entry){
    if(!currentUserId||!entry)return;
    var userId=currentUserId,cat=getCatalog(entry.catalogId);
    var payload={
      user_id:userId,
      catalog_id:entry.catalogId,
      tmdb_id:(cat&&cat.tmdbId)?Number(cat.tmdbId):null,
      title:(cat&&cat.title)||entry.catalogId,
      genre:(cat&&cat.genre)||'Série',
      poster_path:cat&&cat.poster_path?cat.poster_path:null,
      backdrop_path:cat&&cat.backdrop_path?cat.backdrop_path:null,
      status:entry.status||'quero-assistir',
      rating:entry.rating==null?null:Number(entry.rating),
      review:entry.review||'',
      favorite:!!entry.favorite,
      season_ratings:entry.seasonRatings||{},
      episode_ratings:entry.episodeRatings||{},
      season_artwork:entry.seasonArtwork||{},
      episode_artwork:entry.episodeArtwork||{},
      pro_review:normalizeProReview(entry.proReview||{}),
      premium_rating:entry.premiumRating||{format:'classic',value:null,reactions:[]},
      criteria_ratings:entry.criteriaRatings||{},
      badges:Array.isArray(entry.badges)?entry.badges:[],
      spoiler_level:entry.spoilerLevel||'none',
      spoiler_season:entry.spoilerSeason||null,
      spoiler_episode:entry.spoilerEpisode||null,
      updated_at:entry.dateUpdated||new Date().toISOString()
    };
    try{
      if(currentUserId!==userId)return;
      var result=await supabaseClient.from('library_entries').upsert(payload,{onConflict:'user_id,catalog_id'});
      if(result.error)throw result.error;
    }catch(e){console.error('Erro ao sincronizar estante com Supabase:',e);}
  }
  async function deleteEntryFromSupabase(catalogId){
    if(!currentUserId||!catalogId)return;
    try{
      var result=await supabaseClient.from('library_entries').delete().eq('user_id',currentUserId).eq('catalog_id',catalogId);
      if(result.error)throw result.error;
    }catch(e){console.error('Erro ao remover item do Supabase:',e);}
  }
  async function loadLibraryFromSupabase(){
    if(!currentUserId)return;
    var userId=currentUserId;
    try{
      var result=await supabaseClient.from('library_entries').select('catalog_id,tmdb_id,title,genre,poster_path,backdrop_path,status,rating,review,favorite,season_ratings,episode_ratings,season_artwork,episode_artwork,pro_review,premium_rating,criteria_ratings,badges,spoiler_level,spoiler_season,spoiler_episode,created_at,updated_at').eq('user_id',userId);
      if(result.error)throw result.error;
      if(currentUserId!==userId)return;
      (result.data||[]).forEach(function(row){
        var cid=row.catalog_id||('tmdb-'+row.tmdb_id);
        if(!cid)return;
        var cat=getCatalog(cid);
        if(!cat&&row.tmdb_id){
          cat={id:cid,tmdbId:row.tmdb_id,title:row.title||'Série',type:'serie',genre:row.genre||'Série',year:null,platform:'',seasons:[],poster_path:row.poster_path||null,backdrop_path:row.backdrop_path||null,tmdbSource:true};
          CATALOG.push(cat);
        }else if(cat){if(row.tmdb_id&&!cat.tmdbId)cat.tmdbId=row.tmdb_id;if(row.genre)cat.genre=row.genre;if(row.poster_path)cat.poster_path=row.poster_path;if(row.backdrop_path)cat.backdrop_path=row.backdrop_path;}
        var local=getEntry(cid);
        var remoteTime=new Date(row.updated_at||row.created_at||0).getTime();
        var localTime=local?new Date(local.dateUpdated||local.dateAdded||0).getTime():0;
        if(!local||remoteTime>=localTime){
          var mapped={
            catalogId:cid,
            status:row.status||'quero-assistir',
            rating:row.rating==null?null:Number(row.rating),
            review:row.review||'',
            favorite:!!row.favorite,
            seasonRatings:row.season_ratings||{},
            episodeRatings:row.episode_ratings||{},
            seasonArtwork:row.season_artwork||{},
            episodeArtwork:row.episode_artwork||{},
            proReview:normalizeProReview(row.pro_review||{}),
            premiumRating:row.premium_rating||{format:'classic',value:null,reactions:[]},
            criteriaRatings:row.criteria_ratings||{},
            badges:Array.isArray(row.badges)?row.badges:[],
            spoilerLevel:row.spoiler_level||'none',
            spoilerSeason:row.spoiler_season||null,
            spoilerEpisode:row.spoiler_episode||null,
            dateAdded:row.created_at||new Date().toISOString(),
            dateUpdated:row.updated_at||new Date().toISOString()
          };
          if(local)state.entries[state.entries.indexOf(local)]=mapped;else state.entries.push(mapped);
        }
      });
      if(currentUserId!==userId)return;
      await saveData();
      if(appBooted&&currentUserId===userId)render();
    }catch(e){console.error('Erro ao carregar estante do Supabase:',e);}
  }
  async function syncListItemsToSupabase(list){
    if(!currentUserId||!list||!list.dbId)return;
    try{
      var del=await supabaseClient.from('list_items').delete().eq('list_id',list.dbId);
      if(del.error)throw del.error;
      var rows=(list.showIds||[]).map(function(cid){
        var cat=getCatalog(cid);
        return {list_id:list.dbId,catalog_id:cid,tmdb_id:cat&&cat.tmdbId?Number(cat.tmdbId):null,title:cat?cat.title:cid,poster_path:cat&&cat.poster_path?cat.poster_path:null,backdrop_path:cat&&cat.backdrop_path?cat.backdrop_path:null};
      });
      if(rows.length){
        var ins=await supabaseClient.from('list_items').insert(rows);
        if(ins.error)throw ins.error;
      }
    }catch(e){console.error('Erro ao sincronizar títulos da lista:',e);}
  }
  async function syncListToSupabase(list){
    if(!currentUserId||!list)return;
    if(list.ownerUserId&&list.ownerUserId!==currentUserId){
      await syncListItemsToSupabase(list);
      return;
    }
    try{
      if(!list.shareSlug)list.shareSlug=makeShareSlug(list.name);
      var payload={
        user_id:currentUserId,
        client_id:list.id,
        name:list.name||'Lista',
        description:list.description||'',
        visibility:list.visibility||'private',
        cover_url:list.coverUrl||null,
        share_slug:list.shareSlug,
        allow_comments:list.allowComments!==false,
        pro_settings:normalizeListProSettings(list.proSettings||{}),
        updated_at:list.updatedAt||new Date().toISOString()
      };
      var result=await supabaseClient.from('lists').upsert(payload,{onConflict:'user_id,client_id'}).select('id,user_id,client_id,share_slug').single();
      if(result.error)throw result.error;
      list.dbId=result.data.id;list.ownerUserId=result.data.user_id;list.shareSlug=result.data.share_slug;list.isOwner=true;
      await syncListItemsToSupabase(list);
    }catch(e){console.error('Erro ao sincronizar lista:',e);}
  }
  async function deleteListFromSupabase(list){
    if(!currentUserId||!list||!list.dbId||list.ownerUserId!==currentUserId)return;
    try{var result=await supabaseClient.from('lists').delete().eq('id',list.dbId).eq('user_id',currentUserId);if(result.error)throw result.error;}
    catch(e){console.error('Erro ao excluir lista do Supabase:',e);}
  }
  async function loadListsFromSupabase(){
    if(!currentUserId)return;
    var userId=currentUserId;
    try{
      var result=await supabaseClient.from('lists').select('id,user_id,client_id,name,description,visibility,cover_url,share_slug,allow_comments,pro_settings,created_at,updated_at').order('updated_at',{ascending:false});
      if(result.error)throw result.error;
      if(currentUserId!==userId)return;
      var rows=result.data||[],ids=rows.map(function(x){return x.id;}),items=[];
      if(ids.length){
        var itemResult=await supabaseClient.from('list_items').select('list_id,catalog_id,tmdb_id,title,poster_path,backdrop_path').in('list_id',ids);
        if(itemResult.error)throw itemResult.error;
        items=itemResult.data||[];
      }
      rows.forEach(function(row){
        var showIds=items.filter(function(it){return it.list_id===row.id;}).map(function(it){
          if(!getCatalog(it.catalog_id)&&it.tmdb_id){
            CATALOG.push({id:it.catalog_id,tmdbId:it.tmdb_id,title:it.title||'Série',type:'serie',genre:'Série',year:null,platform:'',seasons:[],poster_path:it.poster_path||null,backdrop_path:it.backdrop_path||null,tmdbSource:true});
          }
          return it.catalog_id;
        });
        var mapped={
          id:row.client_id,name:row.name,description:row.description||'',showIds:showIds,
          ownerUserId:row.user_id,isOwner:row.user_id===currentUserId,isCollaborator:row.user_id!==currentUserId,dbId:row.id,
          visibility:row.visibility||'private',coverUrl:row.cover_url||null,shareSlug:row.share_slug,
          allowComments:row.allow_comments!==false,proSettings:normalizeListProSettings(row.pro_settings),createdAt:row.created_at,updatedAt:row.updated_at,
          owner:row.user_id===currentUserId?(state.profile.username||null):'colaborador',collaborators:[],comments:[]
        };
        var local=state.lists.find(function(l){return l.id===mapped.id;});
        if(local)Object.assign(local,mapped);else state.lists.push(mapped);
      });
      if(currentUserId!==userId)return;
      await saveData();
      if(appBooted&&state.view==='listas')renderMainViewOnly();
    }catch(e){console.error('Erro ao carregar listas do Supabase:',e);}
  }
  async function loadListExtras(list){
    if(!currentUserId||!list)return;
    try{
      var result=await supabaseClient.rpc('get_list_extras',{p_list_client_id:list.id});
      if(result.error)throw result.error;
      var data=result.data||{};
      list.collaborators=Array.isArray(data.collaborators)?data.collaborators:[];
      list.comments=Array.isArray(data.comments)?data.comments:[];
      state.listExtras[list.id]=data;
      await saveData();
    }catch(e){console.error('Erro ao carregar colaboradores/comentários:',e);}
  }
  function dataUrlToBlob(dataUrl){
    var parts=String(dataUrl||'').split(','),meta=parts[0]||'',mime=(meta.match(/data:([^;]+)/)||[])[1]||'image/jpeg';
    var bin=atob(parts[1]||''),arr=new Uint8Array(bin.length);
    for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);
    return new Blob([arr],{type:mime});
  }
  async function uploadProfileDataUrl(dataUrl,kind){
    if(!currentUserId||!/^data:image\//i.test(String(dataUrl||'')))return dataUrl;
    if(kind!=='avatar'&&kind!=='banner')throw new Error('Tipo de mídia de perfil inválido.');
    var blob=dataUrlToBlob(dataUrl);
    var allowed=['image/jpeg','image/png','image/webp','image/gif'];
    if(allowed.indexOf(String(blob.type||'').toLowerCase())===-1)throw new Error('Formato de imagem não permitido.');
    if(blob.size>8*1024*1024)throw new Error('A imagem excede o limite de 8 MB.');
    if(kind==='banner'&&!hasPro())throw new Error('Banner é exclusivo do Bingeo Pro.');
    if(kind==='avatar'&&blob.type==='image/gif'&&!hasPro())throw new Error('GIF no avatar é exclusivo do Bingeo Pro.');
    var ext=(blob.type.split('/')[1]||'jpg').replace('jpeg','jpg').replace(/[^a-z0-9]/gi,'')||'jpg';
    var path=currentUserId+'/'+kind+'-'+Date.now()+'.'+ext;
    var result=await supabaseClient.storage.from('profile-media').upload(path,blob,{contentType:blob.type,upsert:true});
    if(result.error)throw result.error;
    var pub=supabaseClient.storage.from('profile-media').getPublicUrl(path);
    return pub.data.publicUrl;
  }
  async function loadOwnProfileFromSupabase(){
    if(!currentUserId)return;
    var userId=currentUserId;
    try{
      var result=await supabaseClient.from('profiles').select('username,bio,avatar_url,banner_url,plan,name_style,social_links,top_five,top_five_artwork,top_characters,top_character_artwork').eq('id',userId).maybeSingle();
      if(result.error)throw result.error;
      if(currentUserId!==userId)return;
      var row=result.data||{};
      // Supabase is authoritative for account identity. Never carry another
      // account's username/profile into this session.
      state.profile.username=row.username||'';
      state.profile.bio=row.bio||'';
      state.profile.photo=row.avatar_url||null;
      state.profile.banner=row.banner_url||null;
      state.profile.plan=row.plan==='pro'?'pro':'free';
      state.profile.nameStyle=Object.assign({color:null,effect:'none',theme:'dark',highlights:{character:'',actor:null,creator:null}},row.name_style&&typeof row.name_style==='object'?row.name_style:{});
      state.profile.nameStyle.theme=normalizeTheme(state.profile.nameStyle.theme);
      applyThemePreference(state.profile.nameStyle.theme);
      state.profile.socialLinks=Array.isArray(row.social_links)?row.social_links:[];
      state.profile.topFive=Array.isArray(row.top_five)?row.top_five.slice(0,5):[];
      state.profile.topFiveArtwork=row.top_five_artwork&&typeof row.top_five_artwork==='object'?row.top_five_artwork:{};
      state.profile.topCharacters=Array.isArray(row.top_characters)?row.top_characters.slice(0,3):[];
      state.profile.nameStyle.highlights=normalizeProfileHighlights(state.profile.nameStyle.highlights,state.profile.topCharacters);
      state.profile.topCharacters=state.profile.nameStyle.highlights.character?[state.profile.nameStyle.highlights.character]:[];
      state.profile.topCharacterArtwork=row.top_character_artwork&&typeof row.top_character_artwork==='object'?row.top_character_artwork:{};
      state.profile.editing=false;
      await saveData();
      if(appBooted&&currentUserId===userId&&state.view==='perfil')renderMainViewOnly();
    }catch(e){console.error('Erro ao carregar perfil da conta:',e);}
  }
  async function syncProfileToSupabase(){
    if(!currentUserId||!state.profile)return;
    var userId=currentUserId;
    try{
      if(/^data:image\//i.test(String(state.profile.photo||''))){
        state.profile.photo=await uploadProfileDataUrl(state.profile.photo,'avatar');
        await saveData();
      }
      if(/^data:image\//i.test(String(state.profile.banner||''))){
        state.profile.banner=await uploadProfileDataUrl(state.profile.banner,'banner');
        await saveData();
      }
      var payload={
        username:state.profile.username||null,
        bio:state.profile.bio||'',
        avatar_url:/^https?:\/\//i.test(String(state.profile.photo||''))?state.profile.photo:null,
        banner_url:/^https?:\/\//i.test(String(state.profile.banner||''))?state.profile.banner:null,
        name_style:state.profile.nameStyle||{color:null,effect:'none'},
        social_links:Array.isArray(state.profile.socialLinks)?state.profile.socialLinks:[],
        top_five:(state.profile.topFive||[]).filter(Boolean).slice(0,5),
        top_five_artwork:state.profile.topFiveArtwork||{},
        top_characters:(state.profile.nameStyle&&state.profile.nameStyle.highlights&&state.profile.nameStyle.highlights.character)?[state.profile.nameStyle.highlights.character]:[],
        top_character_artwork:state.profile.topCharacterArtwork||{},
        updated_at:new Date().toISOString()
      };
      if(currentUserId!==userId)return;
      var result=await supabaseClient.from('profiles').update(payload).eq('id',userId);
      if(result.error)throw result.error;
    }catch(e){console.error('Erro ao sincronizar perfil com Supabase:',e);}
  }
  async function searchBingeoUsers(query){
    var q=String(query||'').trim();
    if(q.length<2||!currentUserId)return [];
    var result=await supabaseClient.rpc('search_bingeo_users',{p_query:q,p_limit:12});
    if(result.error)throw result.error;
    return Array.isArray(result.data)?result.data:[];
  }
  function characterKeyFor(tvId,personId,characterName){
    var raw=String(characterName||'personagem');
    return 'tv:'+Number(tvId)+':person:'+Number(personId)+':'+slugify(raw)+'-'+hashHue(raw).toString(36);
  }
  function characterRolesForCast(p){
    var roles=Array.isArray(p&&p.roles)?p.roles.filter(function(r){return r&&String(r.character||'').trim();}):[];
    if(!roles.length&&p&&String(p.character||'').trim())roles=[{character:p.character,episode_count:p.total_episode_count||0}];
    return roles;
  }
  function characterRowFromCast(cat,p,role){
    if(!cat||!cat.tmdbId||!p||!p.id||!role||!role.character)return null;
    var characterKey=characterKeyFor(cat.tmdbId,p.id,role.character),previous=characterLocalCache[characterKey]||{};
    var row={
      character_key:characterKey,
      character_name:String(role.character).trim(),
      tv_id:Number(cat.tmdbId),
      tv_name:(cat.tmdbData&&cat.tmdbData.name)||cat.title||'Série',
      person_id:Number(p.id),
      actor_name:p.name||'Profissional',
      profile_path:p.profile_path||null,
      series_poster_path:cat.poster_path||null,
      series_backdrop_path:cat.backdrop_path||null,
      episode_count:Number(role.episode_count||p.total_episode_count||0),
      tvmaze_character_id:previous.tvmaze_character_id||null,
      tvmaze_show_id:previous.tvmaze_show_id||null,
      character_image_url:previous.character_image_url||null,
      tvdb_character_id:previous.tvdb_character_id||null,
      tvdb_series_id:previous.tvdb_series_id||null,
      tvdb_character_image_url:previous.tvdb_character_image_url||null,
      character_banner_url:previous.character_banner_url||null,
      character_image_source:previous.character_image_source||null,
      character_artwork_options:Array.isArray(previous.character_artwork_options)?previous.character_artwork_options.slice(0,36):[]
    };
    characterLocalCache[row.character_key]=row;
    return row;
  }
  async function findTvmazeShowForTmdb(details){
    if(!details||!details.id)return null;
    var ext=details.external_ids||{},key='tvmaze-show:'+details.id,cached=tmdbCacheGet(key,604800000);
    if(cached)return cached;
    var show=null;
    if(ext.imdb_id){
      try{show=await tvmazeFetch('lookup/shows',{imdb:ext.imdb_id});}catch(e){}
    }
    if(!show&&ext.tvdb_id){
      try{show=await tvmazeFetch('lookup/shows',{thetvdb:ext.tvdb_id});}catch(e){}
    }
    if(show&&show.id)tmdbCacheSet(key,show);
    return show;
  }
  async function getTvmazeCast(showId){
    if(!showId)return [];
    var key='tvmaze-cast:'+showId,cached=tmdbCacheGet(key,86400000);
    if(cached)return cached;
    var cast=await tvmazeFetch('shows/'+showId+'/cast',{});
    cast=Array.isArray(cast)?cast:[];
    tmdbCacheSet(key,cast);
    return cast;
  }
  function findTvmazeCharacterMatch(tmdbPerson,role,tvmazeCast){
    if(!tmdbPerson||!role||!Array.isArray(tvmazeCast))return null;
    var actor=normalizeCreditName(tmdbPerson.name),target=normalizeCharacterName(role.character);
    if(!target)return null;
    var best=null,bestScore=0;
    tvmazeCast.forEach(function(item){
      var mazeCharacter=item&&item.character&&item.character.name||'';
      var nameScore=characterNameScore(target,mazeCharacter);
      if(nameScore<60)return;
      var score=nameScore;
      if(actor&&normalizeCreditName(item&&item.person&&item.person.name)===actor)score+=55;
      if(safeTvmazeImage(item&&item.character&&item.character.image&&(item.character.image.original||item.character.image.medium)))score+=18;
      if(score>bestScore){best=item;bestScore=score;}
    });
    // A strong character-name match is enough even when another dub, child/adult
    // performer, or native-script credit makes the actor names different.
    return bestScore>=85?best:null;
  }
  async function resolveTheTvdbSeriesId(details){
    if(!details)return 0;
    var direct=Number(details.external_ids&&details.external_ids.tvdb_id)||0;
    if(direct)return direct;
    var mapKey='thetvdb-map:'+Number(details.id||0),cached=tmdbCacheGet(mapKey,2592000000);
    if(cached&&Number(cached.tvdbId))return Number(cached.tvdbId);
    var imdb=details.external_ids&&details.external_ids.imdb_id;
    if(imdb){
      try{
        var remote=await theTvdbFetch('search/remoteid/'+encodeURIComponent(imdb),{});
        var remoteRows=remote&&Array.isArray(remote.data)?remote.data:[];
        var seriesRow=remoteRows.find(function(x){return x&&x.series&&x.series.id;});
        if(seriesRow){tmdbCacheSet(mapKey,{tvdbId:Number(seriesRow.series.id)});return Number(seriesRow.series.id);}
      }catch(e){}
    }
    try{
      var title=details.name||details.original_name||'',year=parseInt((details.first_air_date||'').slice(0,4),10)||0;
      if(title){
        var found=await theTvdbFetch('search',{query:title,type:'series',limit:10});
        var rows=found&&Array.isArray(found.data)?found.data:[];
        var target=normalizeSeriesTitle(title),best=null,bestScore=-Infinity;
        rows.forEach(function(row){
          var n=normalizeSeriesTitle(row.name||row.name_translated||row.title),score=0;
          if(n===target)score+=100;
          else if(n&&target&&(n.indexOf(target)>-1||target.indexOf(n)>-1))score+=55;
          var ry=parseInt(row.year||'',10)||0;
          if(year&&ry){if(year===ry)score+=35;else if(Math.abs(year-ry)<=1)score+=10;}
          if(row.is_official)score+=5;
          if(score>bestScore){best=row;bestScore=score;}
        });
        var id=best&&Number(best.tvdb_id||String(best.id||'').replace(/^series-/,''));
        if(id&&bestScore>=55){tmdbCacheSet(mapKey,{tvdbId:id});return id;}
      }
    }catch(e){}
    return 0;
  }
  async function getTheTvdbSeriesExtended(details){
    var tvdbId=await resolveTheTvdbSeriesId(details);
    if(!tvdbId)return null;
    var key='thetvdb-series:'+tvdbId,cached=tmdbCacheGet(key,604800000);
    if(cached)return cached;
    var response=await theTvdbFetch('series/'+tvdbId+'/extended',{short:'false'});
    var data=response&&response.data||null;
    if(data)tmdbCacheSet(key,data);
    return data;
  }
  function findTheTvdbCharacterMatch(tmdbPerson,role,tvdbCharacters){
    if(!tmdbPerson||!role||!Array.isArray(tvdbCharacters))return null;
    var actor=normalizeCreditName(tmdbPerson.name),target=normalizeCharacterName(role.character);
    if(!target)return null;
    var best=null,bestScore=0;
    tvdbCharacters.forEach(function(item){
      var names=characterAliasNames(item),nameScore=0;
      names.forEach(function(name){nameScore=Math.max(nameScore,characterNameScore(target,name));});
      if(nameScore<60)return;
      var score=nameScore;
      if(actor&&normalizeCreditName(item&&item.personName)===actor)score+=50;
      if(item&&item.isFeatured)score+=12;
      if(safeTheTvdbImage(item&&item.image))score+=20;
      if(Number(item&&item.sort)>=0)score+=Math.max(0,8-Math.min(8,Number(item.sort||0)));
      if(score>bestScore){best=item;bestScore=score;}
    });
    return bestScore>=85?best:null;
  }
  function tvdbArtworkScore(art,landscape){
    if(!art||!safeTheTvdbImage(art.image))return -Infinity;
    var w=Number(art.width||0),h=Number(art.height||0);
    if(w&&h){
      var ratio=w/h;
      if(landscape&&ratio<1.35)return -Infinity;
      if(!landscape&&ratio>1.05)return -Infinity;
    }
    var score=Number(art.score||0)*100;
    score+=Math.min(80,(w*h)/250000);
    if(art.includesText===false)score+=12;
    if(art.language==='eng'||!art.language)score+=3;
    return score;
  }
  function bestTheTvdbCharacterArtwork(character,artworks,landscape){
    if(!character||!Array.isArray(artworks))return '';
    var matches=artworks.filter(function(art){
      return Number(art.seriesPeopleId||0)===Number(character.id||0) ||
        (character.peopleId&&Number(art.peopleId||0)===Number(character.peopleId));
    });
    var best=null,bestScore=-Infinity;
    matches.forEach(function(art){
      var score=tvdbArtworkScore(art,landscape);
      if(score>bestScore){best=art;bestScore=score;}
    });
    return best?safeTheTvdbImage(best.image):'';
  }
  function enrichRowFromTheTvdb(row,tvdbCharacter,tvdbSeries){
    if(!row||!tvdbCharacter||!tvdbSeries)return row;
    var artworks=Array.isArray(tvdbSeries.artworks)?tvdbSeries.artworks:[];
    var roleMatches=artworks.filter(function(art){
      return Number(art&&art.seriesPeopleId||0)===Number(tvdbCharacter.id||0) ||
        (tvdbCharacter.peopleId&&Number(art&&art.peopleId||0)===Number(tvdbCharacter.peopleId));
    });
    var portraitMatches=roleMatches.filter(function(art){
      return isFinite(tvdbArtworkScore(art,false));
    }).sort(function(a,b){
      return tvdbArtworkScore(b,false)-tvdbArtworkScore(a,false);
    });
    var landscapeMatches=roleMatches.filter(function(art){
      return isFinite(tvdbArtworkScore(art,true));
    }).sort(function(a,b){
      return tvdbArtworkScore(b,true)-tvdbArtworkScore(a,true);
    });

    var portraitUrls=portraitMatches.map(function(art){return safeTheTvdbImage(art&&art.image);}).filter(Boolean);
    var rolePortrait=portraitUrls[0]||'';
    var roleBanner=landscapeMatches.length?safeTheTvdbImage(landscapeMatches[0].image):'';
    var officialCharacterImage=safeTheTvdbImage(tvdbCharacter.image);
    var tvmazePrimary=safeTvmazeImage(row.character_image_url);
    var oldOptions=Array.isArray(row.character_artwork_options)?row.character_artwork_options:[];

    // Para o Top 3, artes alternativas próprias do personagem ficam primeiro.
    // A imagem padrão/oficial é mantida, mas só entra depois das alternativas.
    var alternatives=[];
    function addAlternative(url){
      url=safeTheTvdbImage(url)||safeTvmazeImage(url);
      if(!url)return;
      if(url===tvmazePrimary||url===officialCharacterImage)return;
      if(alternatives.indexOf(url)===-1)alternatives.push(url);
    }
    portraitUrls.forEach(addAlternative);
    oldOptions.forEach(addAlternative);

    var orderedOptions=alternatives.slice();
    function addDefault(url){
      url=safeTheTvdbImage(url)||safeTvmazeImage(url);
      if(url&&orderedOptions.indexOf(url)===-1)orderedOptions.push(url);
    }
    addDefault(officialCharacterImage);
    addDefault(tvmazePrimary);

    row.tvdb_character_id=Number(tvdbCharacter.id)||null;
    row.tvdb_series_id=Number(tvdbSeries.id)||Number(tvdbCharacter.seriesId)||null;
    row.tvdb_character_image_url=rolePortrait||officialCharacterImage||null;
    row.character_banner_url=roleBanner||null;
    row.character_artwork_options=orderedOptions.slice(0,36);
    if(!row.character_image_url&&row.tvdb_character_image_url)row.character_image_source='thetvdb';
    return row;
  }
  async function indexSeriesCharacters(cat,details,force){
    if(!currentUserId||!cat||!cat.tmdbId||!details||(cat.charactersIndexed&&!force))return;
    var cast=details.aggregate_credits&&Array.isArray(details.aggregate_credits.cast)?details.aggregate_credits.cast:[];
    var tvmazeShow=null,tvmazeCast=[],tvdbSeries=null,tvdbCharacters=[];

    var providerResults=await Promise.allSettled([
      (async function(){
        var show=await findTvmazeShowForTmdb(details);
        var cast=show&&show.id?await getTvmazeCast(show.id):[];
        return {show:show,cast:cast};
      })(),
      getTheTvdbSeriesExtended(details)
    ]);
    if(providerResults[0].status==='fulfilled'){
      tvmazeShow=providerResults[0].value.show;
      tvmazeCast=providerResults[0].value.cast||[];
    }else console.warn('TVmaze indisponível para esta série:',providerResults[0].reason);
    if(providerResults[1].status==='fulfilled'){
      tvdbSeries=providerResults[1].value;
      tvdbCharacters=tvdbSeries&&Array.isArray(tvdbSeries.characters)?tvdbSeries.characters:[];
    }else console.warn('TheTVDB indisponível para esta série:',providerResults[1].reason);

    var rows=[];
    cast.slice(0,80).forEach(function(p){
      characterRolesForCast(p).slice(0,4).forEach(function(role){
        var row=characterRowFromCast(cat,p,role);if(!row)return;

        // 1) TVmaze remains the first source for a dedicated character portrait.
        var maze=findTvmazeCharacterMatch(p,role,tvmazeCast);
        if(maze&&maze.character){
          row.tvmaze_character_id=Number(maze.character.id)||null;
          row.tvmaze_show_id=tvmazeShow&&Number(tvmazeShow.id)||null;
          row.character_image_url=safeTvmazeImage(maze.character.image&&(maze.character.image.original||maze.character.image.medium));
          if(row.character_image_url){
            row.character_image_source='tvmaze';
            row.character_artwork_options=Array.from(new Set([].concat(row.character_artwork_options||[],row.character_image_url))).slice(0,36);
          }
        }else if(tvmazeShow&&tvmazeShow.id){
          row.tvmaze_show_id=Number(tvmazeShow.id);
        }

        // 2) If TVmaze has no dedicated character portrait, TheTVDB is the fallback.
        // TheTVDB may also have a role-specific landscape artwork suitable for the banner.
        var tvdbCharacter=findTheTvdbCharacterMatch(p,role,tvdbCharacters);
        if(tvdbCharacter)enrichRowFromTheTvdb(row,tvdbCharacter,tvdbSeries);

        characterLocalCache[row.character_key]=row;
        rows.push(row);
      });
    });

    if(!rows.length){cat.charactersIndexed=true;return;}
    try{
      var result=await supabaseClient.rpc('index_bingeo_characters',{p_rows:rows});
      if(result.error)throw result.error;
      var optionRows=rows.filter(function(row){return Array.isArray(row.character_artwork_options)&&row.character_artwork_options.length;})
        .map(function(row){return {character_key:row.character_key,options:row.character_artwork_options};});
      if(optionRows.length){
        var savedOptions=await supabaseClient.rpc('save_character_artwork_options',{p_rows:optionRows});
        if(savedOptions.error)console.warn('Não foi possível salvar todas as opções de arte do personagem:',savedOptions.error);
      }
      cat.charactersIndexed=true;
      rows.forEach(function(row){
        var fav=state.favoriteCharacters.find(function(ch){return ch.character_key===row.character_key;});
        if(fav)Object.assign(fav,row);
      });
      if(state.view==='perfil'&&!state.userProfileOpen&&!state.professionalOpen&&!state.characterOpen)renderMainViewOnly();
      if(state.modalCatalogId===cat.id)renderModalPreserveScroll();
      if(state.characterOpen&&state.characterData&&Number(state.characterData.tv_id)===Number(cat.tmdbId)){
        var refreshed=characterLocalCache[state.characterOpen];
        if(refreshed){state.characterData=refreshed;renderMainViewOnly();}
      }
    }catch(e){console.error('Erro ao indexar personagens:',e);}
  }
  function bestAniListCharacterMatch(rows,name){
    var target=normalizeCharacterName(name),best=null,bestScore=-Infinity;
    (Array.isArray(rows)?rows:[]).forEach(function(row){
      var names=[row&&row.name&&row.name.full,row&&row.name&&row.name.native]
        .concat(row&&row.name&&Array.isArray(row.name.alternative)?row.name.alternative:[])
        .concat(row&&row.name&&Array.isArray(row.name.alternativeSpoiler)?row.name.alternativeSpoiler:[])
        .filter(Boolean);
      var score=0;
      names.forEach(function(candidate){score=Math.max(score,characterNameScore(target,candidate));});
      score+=Math.min(20,Math.log10(Number(row&&row.favourites||0)+1)*5);
      if(score>bestScore){best=row;bestScore=score;}
    });
    return bestScore>=85?best:null;
  }
  function bestJikanCharacterMatch(rows,name){
    var target=normalizeCharacterName(name),best=null,bestScore=-Infinity;
    (Array.isArray(rows)?rows:[]).forEach(function(row){
      var names=[row&&row.name,row&&row.name_kanji]
        .concat(Array.isArray(row&&row.nicknames)?row.nicknames:[])
        .filter(Boolean);
      var score=0;
      names.forEach(function(candidate){score=Math.max(score,characterNameScore(target,candidate));});
      score+=Math.min(20,Math.log10(Number(row&&row.favorites||0)+1)*5);
      if(score>bestScore){best=row;bestScore=score;}
    });
    return bestScore>=85?best:null;
  }
  function jikanPictureUrls(picture){
    var urls=[],jpg=picture&&picture.jpg||{},webp=picture&&picture.webp||{};
    [jpg.large_image_url,jpg.image_url,webp.large_image_url,webp.image_url].forEach(function(url){
      url=safeJikanImage(url);
      if(url&&urls.indexOf(url)===-1)urls.push(url);
    });
    return urls;
  }
  async function loadCharacterArtworkPool(character,force){
    if(!character||!character.character_key)return;
    var key=character.character_key;
    if(state.characterArtworkLoading[key])return;

    var cacheKey='character-art-pool-v1:'+key;
    var cached=!force?tmdbCacheGet(cacheKey,604800000):null;
    if(Array.isArray(cached)&&cached.length){
      character.character_artwork_options=cached.slice(0,36);
      characterLocalCache[key]=Object.assign(characterLocalCache[key]||{},character);
      return;
    }

    state.characterArtworkLoading[key]=true;
    if(state.view==='perfil')renderMainViewOnly();
    try{
      var cat=ensureCharacterSeriesCatalog(character),details=cat&&(cat.tmdbData||null);
      if(cat&&cat.tmdbId){
        try{details=await loadTmdbSeries(cat,true)||details;}catch(e){console.warn('TVmaze/TheTVDB indisponíveis para imagens do personagem:',e);}
      }

      var current=characterLocalCache[key]||character;
      var pool=[],seen={};
      function add(url){
        url=safeCharacterProviderImage(url);
        if(!url)return;
        var dedupeKey=normalizedArtworkUrlKey(url)||url;
        if(seen[dedupeKey])return;
        seen[dedupeKey]=1;
        pool.push(url);
      }

      (Array.isArray(current.character_artwork_options)?current.character_artwork_options:[]).forEach(add);
      add(current.character_image_url);
      add(current.tvdb_character_image_url);

      var anime=!!(cat&&details&&isAnimeSeries(cat,details));
      if(anime){
        var providerResults=await Promise.allSettled([
          anilistCharacterImageSearch(current.character_name),
          jikanCharacterSearch(current.character_name)
        ]);

        if(providerResults[0].status==='fulfilled'){
          var ani=bestAniListCharacterMatch(providerResults[0].value,current.character_name);
          if(ani&&ani.image){add(ani.image.large);add(ani.image.medium);}
        }else{
          console.warn('AniList indisponível para imagens do personagem:',providerResults[0].reason);
        }

        if(providerResults[1].status==='fulfilled'){
          var jikan=bestJikanCharacterMatch(providerResults[1].value,current.character_name);
          if(jikan){
            var defaultImages=jikan.images||{};
            Object.keys(defaultImages).forEach(function(format){
              var imageSet=defaultImages[format]||{};
              add(imageSet.large_image_url);
              add(imageSet.image_url);
              add(imageSet.small_image_url);
            });
            try{
              var pictures=await jikanCharacterPictures(jikan.mal_id);
              pictures.forEach(function(pic){jikanPictureUrls(pic).forEach(add);});
            }catch(e){
              console.warn('Jikan Pictures indisponível para este personagem:',e);
            }
          }
        }else{
          console.warn('Jikan indisponível para imagens do personagem:',providerResults[1].reason);
        }
      }

      current.character_artwork_options=pool.slice(0,36);
      characterLocalCache[key]=current;
      var fav=state.favoriteCharacters.find(function(ch){return ch.character_key===key;});
      if(fav)Object.assign(fav,current);
      tmdbCacheSet(cacheKey,current.character_artwork_options);

      if(current.character_artwork_options.length){
        try{
          var saved=await supabaseClient.rpc('save_character_artwork_options',{p_rows:[{character_key:key,options:current.character_artwork_options}]});
          if(saved.error)console.warn('Não foi possível salvar o pool de imagens do personagem:',saved.error);
        }catch(e){
          console.warn('Não foi possível persistir o pool de imagens:',e);
        }
      }
    }finally{
      state.characterArtworkLoading[key]=false;
      if(state.view==='perfil')renderMainViewOnly();
    }
  }

  async function indexCharactersFromLibrary(){
    if(!currentUserId||!tmdbConfigured())return;
    var cats=state.entries.map(function(e){return getCatalog(e.catalogId);}).filter(Boolean).slice(0,12);
    for(var i=0;i<cats.length;i+=3){
      if(!currentUserId)return;
      await Promise.allSettled(cats.slice(i,i+3).map(function(cat){return loadTmdbSeries(cat);}));
    }
  }
  async function searchBingeoCharacters(query){
    var q=String(query||'').trim(),needle=q.toLowerCase();
    if(q.length<2||!currentUserId)return [];
    var local=Object.keys(characterLocalCache).map(function(k){return characterLocalCache[k];}).filter(function(ch){
      return [ch.character_name,ch.actor_name,ch.tv_name].some(function(v){return String(v||'').toLowerCase().indexOf(needle)>-1;});
    });
    var result=await supabaseClient.rpc('search_bingeo_characters',{p_query:q,p_limit:12});
    if(result.error)throw result.error;
    var byCharacter={};
    local.concat(result.data||[]).forEach(function(ch){
      if(!ch||!ch.character_key)return;
      characterLocalCache[ch.character_key]=ch;
      var canonical=normalizeCharacterName(ch.character_name)||ch.character_key;
      var key=String(ch.tv_id||'')+'|'+canonical;
      var prev=byCharacter[key];
      var quality=(characterImageUrl(ch)?1000:0)+(characterBannerImageUrl(ch)?180:0)+Number(ch.episode_count||0);
      var prevQuality=prev?((characterImageUrl(prev)?1000:0)+(characterBannerImageUrl(prev)?180:0)+Number(prev.episode_count||0)):-1;
      if(!prev||quality>prevQuality)byCharacter[key]=ch;
    });
    return Object.keys(byCharacter).map(function(k){return byCharacter[k];})
      .sort(function(a,b){
        var ai=characterImageUrl(a)?1:0,bi=characterImageUrl(b)?1:0;
        if(ai!==bi)return bi-ai;
        return Number(b.episode_count||0)-Number(a.episode_count||0);
      }).slice(0,12);
  }
  async function loadPeopleFavorites(userId){
    if(!userId||!currentUserId)return {professionals:[],characters:[]};
    var result=await supabaseClient.rpc('get_user_people_favorites',{p_user_id:userId});
    if(result.error)throw result.error;
    var data=result.data||{professionals:[],characters:[]};
    data.professionals=Array.isArray(data.professionals)?data.professionals:[];
    data.characters=Array.isArray(data.characters)?data.characters:[];
    data.characters.forEach(function(ch){characterLocalCache[ch.character_key]=ch;});
    return data;
  }
  async function loadOwnPeopleFavorites(){
    if(!currentUserId)return;
    var userId=currentUserId;
    try{
      var data=await loadPeopleFavorites(userId);
      if(currentUserId!==userId)return;
      state.favoriteProfessionals=data.professionals;
      state.favoriteCharacters=data.characters;
      if(appBooted&&state.view==='perfil'&&!state.userProfileOpen&&!state.professionalOpen&&!state.characterOpen)renderMainViewOnly();
    }catch(e){console.error('Erro ao carregar favoritos de pessoas/personagens:',e);}
  }
  function isProfessionalFavorite(personId){
    return state.favoriteProfessionals.some(function(p){return Number(p.person_id)===Number(personId);});
  }
  function isCharacterFavorite(characterKey){
    return state.favoriteCharacters.some(function(ch){return ch.character_key===characterKey;});
  }
  async function toggleProfessionalFavorite(person){
    if(!currentUserId||!person||!person.id)return;
    var favorite=isProfessionalFavorite(person.id);
    if(favorite){
      var del=await supabaseClient.from('user_favorite_professionals').delete().eq('user_id',currentUserId).eq('person_id',Number(person.id));
      if(del.error)throw del.error;
      state.profile.nameStyle=Object.assign({color:null,effect:'none',theme:'dark',highlights:{}},state.profile.nameStyle||{});
      state.profile.nameStyle.highlights=normalizeProfileHighlights(state.profile.nameStyle.highlights,state.profile.topCharacters);
      if(Number(state.profile.nameStyle.highlights.actor)===Number(person.id))state.profile.nameStyle.highlights.actor=null;
      if(Number(state.profile.nameStyle.highlights.creator)===Number(person.id))state.profile.nameStyle.highlights.creator=null;
      await saveData();syncProfileToSupabase();
    }else{
      var ins=await supabaseClient.from('user_favorite_professionals').upsert({
        user_id:currentUserId,
        person_id:Number(person.id),
        name:person.name||'Profissional',
        profile_path:person.profile_path||null,
        known_for_department:person.known_for_department||''
      },{onConflict:'user_id,person_id'});
      if(ins.error)throw ins.error;
    }
    await loadOwnPeopleFavorites();
    if(state.professionalOpen===Number(person.id))renderMainViewOnly();
    if(state.modalCatalogId)renderModalPreserveScroll();
  }
  async function ensureCharacterIndexed(character){
    if(!character||!character.character_key)return;
    characterLocalCache[character.character_key]=character;
    var result=await supabaseClient.rpc('index_bingeo_characters',{p_rows:[character]});
    if(result.error)throw result.error;
  }
  async function toggleCharacterFavorite(character){
    if(!currentUserId||!character||!character.character_key)return;
    await ensureCharacterIndexed(character);
    var favorite=isCharacterFavorite(character.character_key);
    if(favorite){
      var del=await supabaseClient.from('user_favorite_characters').delete().eq('user_id',currentUserId).eq('character_key',character.character_key);
      if(del.error)throw del.error;
      state.profile.topCharacters=(state.profile.topCharacters||[]).filter(function(key){return key!==character.character_key;});
      state.profile.nameStyle=Object.assign({color:null,effect:'none',theme:'dark',highlights:{}},state.profile.nameStyle||{});
      state.profile.nameStyle.highlights=normalizeProfileHighlights(state.profile.nameStyle.highlights,state.profile.topCharacters);
      if(state.profile.nameStyle.highlights.character===character.character_key)state.profile.nameStyle.highlights.character='';
      state.profile.topCharacters=state.profile.nameStyle.highlights.character?[state.profile.nameStyle.highlights.character]:[];
      if(state.profile.topCharacterArtwork)delete state.profile.topCharacterArtwork[character.character_key];
      if(state.characterArtPickerKey===character.character_key)state.characterArtPickerKey=null;
      await saveData();syncProfileToSupabase();
    }else{
      var ins=await supabaseClient.from('user_favorite_characters').insert({user_id:currentUserId,character_key:character.character_key});
      if(ins.error)throw ins.error;
    }
    await loadOwnPeopleFavorites();
    if(state.characterOpen===character.character_key)renderMainViewOnly();
    if(state.modalCatalogId)renderModalPreserveScroll();
  }
  async function loadCharacter(characterKey){
    if(!characterKey)return;
    state.characterLoading=true;state.characterError='';
    var local=characterLocalCache[characterKey];
    if(local){state.characterData=local;state.characterLoading=false;renderMainViewOnly();}
    try{
      var result=await supabaseClient.rpc('get_bingeo_character',{p_character_key:characterKey});
      if(result.error)throw result.error;
      if(state.characterOpen!==characterKey)return;
      if(result.data){
        state.characterData=result.data;
        characterLocalCache[characterKey]=result.data;
        if(!characterImageUrl(result.data)&&tmdbConfigured()){
          var artCat=ensureCharacterSeriesCatalog(result.data);
          if(artCat&&!artCat.characterArtworkAttempted){
            artCat.characterArtworkAttempted=true;
            loadTmdbSeries(artCat,true).catch(function(e){console.warn('Não foi possível enriquecer a arte do personagem:',e);});
          }
        }
      }
      else if(!state.characterData)throw new Error('Personagem não encontrado.');
    }catch(e){
      if(state.characterOpen===characterKey&&!state.characterData)state.characterError=e.message||'Não foi possível carregar o personagem.';
    }finally{
      if(state.characterOpen===characterKey){state.characterLoading=false;renderMainViewOnly();}
    }
  }

  function ensureRemoteUserCatalog(item){
    if(!item)return null;
    var cid=item.catalog_id||((item.tmdb_id!=null)?('tmdb-'+item.tmdb_id):null);
    if(!cid)return null;
    var cat=getCatalog(cid);
    if(!cat){
      var payload=item.payload||{};
      cat={id:cid,tmdbId:item.tmdb_id||null,title:item.title||'Série',type:'serie',genre:item.genre||payload.genre||'Série',year:null,platform:'',seasons:[],poster_path:item.poster_path||payload.poster_path||null,backdrop_path:item.backdrop_path||payload.backdrop_path||null,overview:'',tmdbSource:true};
      CATALOG.push(cat);
    }else{
      if(item.tmdb_id&&!cat.tmdbId)cat.tmdbId=item.tmdb_id;
      if(item.title&&(!cat.title||cat.title==='Série'))cat.title=item.title;
      var payload=item.payload||{};
      if(item.genre||payload.genre)cat.genre=item.genre||payload.genre;
      if((item.poster_path||payload.poster_path)&&!cat.poster_path)cat.poster_path=item.poster_path||payload.poster_path;
      if((item.backdrop_path||payload.backdrop_path)&&!cat.backdrop_path)cat.backdrop_path=item.backdrop_path||payload.backdrop_path;
    }
    return cat;
  }
  async function hydrateUserProfileCatalogs(profile){
    if(!profile||!tmdbConfigured())return;
    var all=[].concat(profile.top_five||[],profile.evaluations||[],profile.recent_activity||[]);
    var seen={},cats=[];
    all.forEach(function(item){var cat=ensureRemoteUserCatalog(item);if(cat&&!seen[cat.id]){seen[cat.id]=1;cats.push(cat);}});
    var pending=cats.filter(function(cat){return cat.tmdbId&&!cat.tmdbLoaded&&!tmdbHydrationPromises[cat.id];}).slice(0,20);
    if(!pending.length)return;
    await Promise.allSettled(pending.map(function(cat){return loadTmdbSeries(cat);}));
    if(state.userProfileOpen===profile.user_id)renderMainViewOnly();
  }
  async function loadBingeoUserProfile(userId){
    if(!userId)return;
    state.userProfileLoading=true;state.userProfileError='';state.userProfileData=null;
    renderMainViewOnly();
    try{
      var result=await supabaseClient.rpc('get_bingeo_user_profile',{p_user_id:userId});
      if(result.error)throw result.error;
      if(state.userProfileOpen!==userId)return;
      if(!result.data)throw new Error('Usuário não encontrado.');
      try{result.data.people_favorites=await loadPeopleFavorites(userId);}catch(ignore){result.data.people_favorites={professionals:[],characters:[]};}
      if(state.userProfileOpen!==userId)return;
      state.userProfileData=result.data;
      loadProPublicProfileExtras(state.userProfileData);
      [].concat(result.data.top_five||[],result.data.evaluations||[],result.data.recent_activity||[]).forEach(ensureRemoteUserCatalog);
      state.userProfileLoading=false;
      renderMainViewOnly();
      hydrateUserProfileCatalogs(result.data);
      return;
    }catch(e){
      if(state.userProfileOpen===userId)state.userProfileError=e.message||'Não foi possível carregar o usuário.';
    }finally{
      if(state.userProfileOpen===userId&&state.userProfileLoading){state.userProfileLoading=false;renderMainViewOnly();}
    }
  }
  async function setFollowingUser(userId,follow){
    if(!currentUserId||!userId||userId===currentUserId)return;
    if(follow){
      var result=await supabaseClient.from('user_follows').insert({follower_id:currentUserId,following_id:userId});
      if(result.error)throw result.error;
    }else{
      var del=await supabaseClient.from('user_follows').delete().eq('follower_id',currentUserId).eq('following_id',userId);
      if(del.error)throw del.error;
    }
    await Promise.all([loadBingeoUserProfile(userId),loadFollowingFeed()]);
  }
  function specialActivityPayload(entry){
    ensureEvaluationExtras(entry);
    var pr=entry.premiumRating||{format:'classic',value:null,reactions:[]};
    return {
      format:pr.format||'classic',
      value:pr.value==null?null:Number(pr.value),
      reactions:Array.isArray(pr.reactions)?pr.reactions.slice(0,8):[],
      criteria:Object.assign({},entry.criteriaRatings||{}),
      badges:(entry.badges||[]).slice(0,8)
    };
  }
  async function publishActivity(eventType,entry,extra){
    if(!currentUserId||!eventType)return;
    extra=extra||{};
    var cid=(entry&&entry.catalogId)||extra.catalogId||null,cat=cid?getCatalog(cid):null;
    var payload=extra.payload||{};
    var row={
      user_id:currentUserId,event_type:eventType,catalog_id:cid,
      tmdb_id:cat&&cat.tmdbId?Number(cat.tmdbId):(extra.tmdbId||null),
      title:cat&&cat.title?cat.title:(extra.title||null),
      season:extra.season==null?null:Number(extra.season),
      episode:extra.episode==null?null:Number(extra.episode),
      rating:extra.rating==null?null:Number(extra.rating),
      payload:payload,
      created_at:new Date().toISOString()
    };
    try{
      if(['special_rating','rating_series','rating_season','rating_episode','status'].indexOf(eventType)>-1&&cid){
        var cutoff=new Date(Date.now()-5*60*1000).toISOString();
        var dq=supabaseClient.from('activity_events').delete().eq('user_id',currentUserId).eq('event_type',eventType).eq('catalog_id',cid).gte('created_at',cutoff);
        if(extra.season!=null)dq=dq.eq('season',Number(extra.season));else dq=dq.is('season',null);
        if(extra.episode!=null)dq=dq.eq('episode',Number(extra.episode));else dq=dq.is('episode',null);
        await dq;
      }
      var result=await supabaseClient.from('activity_events').insert(row);
      if(result.error)throw result.error;
    }catch(e){console.error('Erro ao publicar atividade:',e);}
  }
  async function loadFollowingFeed(){
    if(!currentUserId)return;
    var userId=currentUserId;
    state.socialFeedLoading=true;state.socialFeedError='';
    try{
      var result=await supabaseClient.rpc('get_following_feed',{p_limit:40});
      if(result.error)throw result.error;
      if(currentUserId!==userId)return;
      state.socialFeed=(Array.isArray(result.data)?result.data:[]).filter(function(a){return a&&['diary_series','diary_episode','review','edital','edital_repost'].indexOf(a.event_type)>-1;});
      var feedCats=[];
      state.socialFeed.forEach(function(a){var cat=ensureRemoteUserCatalog(a);if(cat&&cat.tmdbId&&!cat.poster_path)feedCats.push(cat);});
      if(tmdbConfigured()&&feedCats.length){
        var unique={};feedCats=feedCats.filter(function(cat){if(unique[cat.id])return false;unique[cat.id]=1;return true;}).slice(0,12);
        Promise.allSettled(feedCats.map(function(cat){return loadTmdbSeries(cat);})).then(function(){
          if(appBooted&&state.view==='home'&&!state.professionalOpen&&!state.userProfileOpen&&!state.characterOpen)renderMainViewOnly();
        });
      }
    }catch(e){
      state.socialFeedError=e.message||'Não foi possível carregar o feed.';
    }finally{
      state.socialFeedLoading=false;
      if(appBooted&&state.view==='home'&&!state.professionalOpen&&!state.userProfileOpen&&!state.characterOpen)renderMainViewOnly();
    }
  }
  function userNameClass(user){
    var ns=user&&user.name_style||{},pro=user&&user.plan==='pro';
    return 'user-view-name'+(pro&&ns.effect==='glow'?' name-glow':'')+(pro&&ns.effect==='animated'?' name-animated':'');
  }
  function userNameStyle(user){
    var ns=user&&user.name_style||{};
    return user&&user.plan==='pro'&&ns.color?'color:'+escapeHtml(ns.color)+';':'';
  }
  function userSearchResultsHtml(){
    if(!state.query.trim()||!state.userSearchResults.length)return '';
    return '<div class="bingeo-user-results"><div class="section-head"><div class="section-title">Usuários do Bingeo</div><div class="section-count">'+state.userSearchResults.length+' encontrados</div></div><div class="bingeo-user-grid">'+
      state.userSearchResults.map(function(u){
        var initials=(u.username||'?').trim().charAt(0).toUpperCase(),avatar=u.avatar_url&&/^https?:\/\//i.test(u.avatar_url)?u.avatar_url:'';
        var ns=u.name_style||{},nameClass='bingeo-user-name'+(u.plan==='pro'&&ns.effect==='glow'?' name-glow':'')+(u.plan==='pro'&&ns.effect==='animated'?' name-animated':'');
        var nameStyle=u.plan==='pro'&&ns.color?'color:'+escapeHtml(ns.color)+';':'';
        return '<div class="bingeo-user-card" data-action="open-user-profile" data-user="'+u.user_id+'">'+
          '<div class="bingeo-user-avatar" style="'+(avatar?'background-image:url(\''+avatar.replace(/'/g,'%27')+'\')':'')+'">'+(avatar?'':escapeHtml(initials))+'</div>'+
          '<div class="bingeo-user-card-copy"><div class="'+nameClass+'" style="'+nameStyle+'">@'+escapeHtml(u.username||'usuário')+'</div>'+
          '<div class="bingeo-user-bio">'+escapeHtml(u.bio||'Perfil do Bingeo')+'</div>'+
          '<div class="bingeo-user-label">'+(u.is_self?'Você':(u.plan==='pro'?'✦ Bingeo Pro':'Usuário do Bingeo'))+'</div></div></div>';
      }).join('')+'</div></div>';
  }
  function berryStageCompact(value){
    var s=berryStage(value);return s?(s.emoji+' '+s.name):'';
  }
  function userEvaluationExtraHtml(ev){
    var bits=[];
    if(ev.premium_rating){
      var pr=ev.premium_rating;
      if(pr.format==='berry'&&pr.value!=null)bits.push(berryStageCompact(pr.value));
      if(pr.format==='reactions'&&Array.isArray(pr.reactions)&&pr.reactions.length)bits.push(pr.reactions.join(' '));
    }
    var cr=ev.criteria_ratings||{};
    BINGEO_CRITERIA.forEach(function(item){var s=berryStage(cr[item.key]);if(s)bits.push(s.emoji+' '+item.label);});
    (ev.badges||[]).slice(0,3).forEach(function(b){bits.push(b);});
    var sr=ev.season_ratings||{},er=ev.episode_ratings||{};
    Object.keys(sr).filter(function(k){return sr[k]!=null;}).slice(0,3).forEach(function(k){bits.push('T'+k+' · '+Number(sr[k]).toFixed(1)+'★');});
    Object.keys(er).filter(function(k){return er[k]!=null;}).slice(0,4).forEach(function(k){
      var p=k.split('-');bits.push('T'+p[0]+'E'+p[1]+' · '+Number(er[k]).toFixed(1)+'★');
    });
    return bits.length?'<div class="user-eval-breakdown">'+bits.slice(0,10).map(function(x){return '<span>'+escapeHtml(x)+'</span>';}).join('')+'</div>':'';
  }
  function userEvaluationHasReview(ev){
    return !!(ev&&String(ev.review||'').trim()) || !!(ev&&ev.plan==='pro'&&proReviewHasContent(ev.pro_review));
  }
  function canViewUserEvaluationReview(ev){
    if(!ev||!userEvaluationHasReview(ev)||ev.is_own)return true;
    if(!ev.spoiler_level||ev.spoiler_level==='none')return true;
    var mine=getEntry(ev.catalog_id);
    if(mine&&mine.status==='completo')return true;
    if(ev.spoiler_level==='full')return false;
    var p=userEpisodeProgress(ev.catalog_id),s=Number(ev.spoiler_season)||0,e=Number(ev.spoiler_episode)||0;
    return p.season>s||(p.season===s&&p.episode>=e);
  }
  function userEvaluationCardHtml(ev){
    var cat=ensureRemoteUserCatalog(ev),poster=cat?tmdbImageUrl(cat.poster_path,'w342'):'';
    if(canViewUserEvaluationReview(ev)&&ev.plan==='pro'&&proReviewHasContent(ev.pro_review)){
      return proReviewProfileCardHtml(ev,cat);
    }
    return '<div class="user-eval-card" data-action="open-show" data-catalog="'+escapeHtml(ev.catalog_id||'')+'">'+
      '<div class="user-eval-poster" style="'+(poster?'background-image:url(\''+poster.replace(/'/g,'%27')+'\')':'')+'"></div>'+
      '<div><div class="user-eval-title">'+escapeHtml(ev.title||cat&&cat.title||'Série')+'</div>'+
      '<div class="user-eval-meta">'+(ev.rating!=null?'★ '+Number(ev.rating).toFixed(1):'Avaliação Bingeo')+'</div>'+
      (userEvaluationHasReview(ev)?(canViewUserEvaluationReview(ev)?(ev.review?'<div class="user-eval-review">'+escapeHtml(ev.review)+'</div>':''):'<div class="user-eval-review">🔒 Resenha ocultada por spoilers.</div>'):'')+userEvaluationExtraHtml(ev)+'</div></div>';
  }
  function activityTime(iso){
    try{return new Date(iso).toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch(e){return '';}
  }
  function activityDescription(a){
    var title='<span class="social-activity-series" '+(a.catalog_id?'data-action="open-show" data-catalog="'+escapeHtml(a.catalog_id)+'"':'')+'>'+escapeHtml(a.title||'uma série')+'</span>';
    if(a.event_type==='diary_episode')return 'registrou '+title+' · T'+a.season+'E'+a.episode+' no diário';
    if(a.event_type==='diary_series')return 'registrou '+title+' no diário';
    if(a.event_type==='rating_series')return 'avaliou '+title+' com <strong>★ '+Number(a.rating||0).toFixed(1)+'</strong>';
    if(a.event_type==='rating_season')return 'avaliou a temporada '+a.season+' de '+title+' com <strong>★ '+Number(a.rating||0).toFixed(1)+'</strong>';
    if(a.event_type==='rating_episode')return 'avaliou '+title+' · T'+a.season+'E'+a.episode+' com <strong>★ '+Number(a.rating||0).toFixed(1)+'</strong>';
    if(a.event_type==='review')return 'publicou uma resenha de '+title;
    if(a.event_type==='special_rating')return 'fez uma avaliação especial de '+title;
    if(a.event_type==='status')return 'atualizou '+title+' para <strong>'+escapeHtml((a.payload&&a.payload.status_label)||'novo status')+'</strong>';
    return 'interagiu com '+title;
  }
  function activitySpecialHtml(a){
    if(a.event_type!=='special_rating')return '';
    var p=a.payload||{},bits=[];
    if(p.format==='berry'&&p.value!=null)bits.push(berryStageCompact(p.value));
    if(Array.isArray(p.reactions)&&p.reactions.length)bits.push(p.reactions.join(' '));
    var criteria=p.criteria||{};
    BINGEO_CRITERIA.forEach(function(item){var s=berryStage(criteria[item.key]);if(s)bits.push(s.emoji+' '+item.label);});
    (p.badges||[]).slice(0,3).forEach(function(b){bits.push(b);});
    return bits.length?'<div class="social-special">'+bits.slice(0,8).map(function(x){return '<span>'+escapeHtml(x)+'</span>';}).join('')+'</div>':'';
  }
  function socialActivityHtml(a,showIdentity){
    var initials=(a.username||'?').charAt(0).toUpperCase(),avatar=a.avatar_url&&/^https?:\/\//i.test(a.avatar_url)?a.avatar_url:'';
    var ns=a.name_style||{},nameClass='social-activity-user'+(a.plan==='pro'&&ns.effect==='glow'?' name-glow':'')+(a.plan==='pro'&&ns.effect==='animated'?' name-animated':'');
    var nameStyle=a.plan==='pro'&&ns.color?'color:'+escapeHtml(ns.color)+';':'';
    return '<div class="social-activity">'+
      '<div class="social-activity-avatar" data-action="open-user-profile" data-user="'+escapeHtml(a.user_id||state.userProfileOpen||'')+'" style="'+(avatar?'background-image:url(\''+avatar.replace(/'/g,'%27')+'\')':'')+'">'+(avatar?'':escapeHtml(initials))+'</div>'+
      '<div><div class="social-activity-head">'+
      (showIdentity!==false?'<span class="'+nameClass+'" style="'+nameStyle+'" data-action="open-user-profile" data-user="'+escapeHtml(a.user_id||'')+'">@'+escapeHtml(a.username||'usuário')+'</span>':'')+
      '<span class="social-activity-time">'+activityTime(a.created_at)+'</span></div>'+
      '<div class="social-activity-copy">'+activityDescription(a)+'</div>'+activitySpecialHtml(a)+'</div></div>';
  }
  function diaryFeedCardHtml(a){
    var initials=(a.username||'?').charAt(0).toUpperCase();
    var avatar=a.avatar_url&&/^https?:\/\//i.test(a.avatar_url)?a.avatar_url:'';
    var ns=a.name_style||{},nameClass='diary-feed-username'+(a.plan==='pro'&&ns.effect==='glow'?' name-glow':'')+(a.plan==='pro'&&ns.effect==='animated'?' name-animated':'');
    var nameStyle=a.plan==='pro'&&ns.color?'color:'+escapeHtml(ns.color)+';':'';
    var cat=ensureRemoteUserCatalog(a),payload=a.payload||{};
    var poster=cat?tmdbImageUrl(cat.poster_path,'w342'):'';
    var backdrop=cat?tmdbImageUrl(cat.backdrop_path,'w500'):'';
    var artwork=poster||backdrop;
    var label=a.event_type==='diary_episode'?'Episódio no diário':'Série no diário';
    var meta=[];
    if(a.event_type==='diary_episode'&&a.season!=null&&a.episode!=null)meta.push('T'+a.season+'E'+a.episode);
    if(a.rating!=null)meta.push('★ '+Number(a.rating).toFixed(1));
    var note=String(payload.note||'').trim();
    return '<article class="diary-feed-card">'+
      '<div class="diary-feed-poster" '+(a.catalog_id?'data-action="open-show" data-catalog="'+escapeHtml(a.catalog_id)+'"':'')+' style="'+(artwork?'background-image:url(\''+artwork.replace(/'/g,'%27')+'\')':'')+'"></div>'+
      '<div class="diary-feed-content">'+
        '<div class="diary-feed-userline">'+
          '<div class="diary-feed-avatar" data-action="open-user-profile" data-user="'+escapeHtml(a.user_id||'')+'" style="'+(avatar?'background-image:url(\''+avatar.replace(/'/g,'%27')+'\')':'')+'">'+(avatar?'':escapeHtml(initials))+'</div>'+
          '<div class="diary-feed-usercopy"><span class="'+nameClass+'" style="'+nameStyle+'" data-action="open-user-profile" data-user="'+escapeHtml(a.user_id||'')+'">@'+escapeHtml(a.username||'usuário')+'</span><span class="diary-feed-label">'+label+'</span></div>'+
          '<span class="diary-feed-time">'+activityTime(a.created_at)+'</span>'+
        '</div>'+
        '<div class="diary-feed-title" '+(a.catalog_id?'data-action="open-show" data-catalog="'+escapeHtml(a.catalog_id)+'"':'')+'>'+escapeHtml(a.title||cat&&cat.title||'Série')+'</div>'+
        (meta.length?'<div class="diary-feed-meta">'+meta.map(function(x){return '<span class="diary-feed-pill '+(x.indexOf('★')===0?'diary-feed-rating':'')+'">'+escapeHtml(x)+'</span>';}).join('')+'</div>':'')+
        (note?'<div class="diary-feed-note">“'+escapeHtml(note)+'”</div>':'')+
      '</div>'+
    '</article>';
  }

  function canViewFeedReview(a){
    var p=a&&a.payload||{},level=p.spoiler_level||'none';
    if(level==='none')return true;
    var mine=getEntry(a.catalog_id);
    if(mine&&mine.status==='completo')return true;
    if(level==='full')return false;
    var progress=userEpisodeProgress(a.catalog_id),s=Number(p.spoiler_season)||0,e=Number(p.spoiler_episode)||0;
    return progress.season>s||(progress.season===s&&progress.episode>=e);
  }
  function reviewFeedCardHtml(a){
    var payload=a.payload||{},cat=ensureRemoteUserCatalog(a),isRepost=a.event_type==='edital_repost';
    var isEdital=isRepost||a.event_type==='edital'||payload.review_type==='edital';
    var initials=(a.username||'?').charAt(0).toUpperCase();
    var avatar=a.avatar_url&&/^https?:\/\//i.test(a.avatar_url)?a.avatar_url:'';
    var ns=a.name_style||{},nameClass='diary-feed-username'+(a.plan==='pro'&&ns.effect==='glow'?' name-glow':'')+(a.plan==='pro'&&ns.effect==='animated'?' name-animated':'');
    var nameStyle=a.plan==='pro'&&ns.color?'color:'+escapeHtml(ns.color)+';':'';
    var review={
      review_id:Number(payload.review_id)||Number(a.id)||null,
      username:isRepost?(payload.original_author_username||a.username):a.username,
      plan:a.plan,rating:a.rating,review:String(payload.review||''),
      review_type:isEdital?'edital':'review',edital:payload.edital||{},
      visibility:payload.visibility||'public',comments_enabled:payload.comments_enabled!==false,
      comment_count:Number(payload.comment_count||0),
      like_count:Number(payload.like_count||0),
      repost_count:Number(payload.repost_count||0),
      liked_by_me:!!payload.liked_by_me,
      reposted_by_me:!!payload.reposted_by_me,
      is_own:false,
      criteria_ratings:payload.criteria_ratings||{},
      badges:Array.isArray(payload.badges)?payload.badges:[],
      spoiler_level:payload.spoiler_level||'none',spoiler_season:payload.spoiler_season||null,spoiler_episode:payload.spoiler_episode||null
    };
    var reason=isEdital&&payload.feed_reason==='interest'?'<span class="feed-reason-chip">Para você</span>':'';
    if(isRepost)reason='<span class="feed-reason-chip repost">Republicou</span>';
    var repostByline=isRepost&&payload.original_author_username
      ?'<span class="feed-original-author">Edital original de @'+escapeHtml(payload.original_author_username)+'</span>':'';
    var header='<div class="feed-review-userline">'+
      '<div class="diary-feed-avatar" data-action="open-user-profile" data-user="'+escapeHtml(a.user_id||'')+'" style="'+(avatar?'background-image:url(\''+avatar.replace(/'/g,'%27')+'\')':'')+'">'+(avatar?'':escapeHtml(initials))+'</div>'+
      '<div class="diary-feed-usercopy"><span class="'+nameClass+'" style="'+nameStyle+'" data-action="open-user-profile" data-user="'+escapeHtml(a.user_id||'')+'">@'+escapeHtml(a.username||'usuário')+'</span><span class="diary-feed-label">'+(isRepost?'Republicação':(isEdital?'Edital':'Resenha'))+'</span>'+reason+repostByline+'</div>'+
      '<span class="diary-feed-time">'+activityTime(a.created_at)+'</span>'+
    '</div>';
    if(!canViewFeedReview(a)){
      return '<article class="feed-review-shell">'+header+'<div class="spoiler-locked"><strong>'+escapeHtml(spoilerLabel(review))+'</strong><div style="margin-top:5px;">Esta publicação está escondida porque passa do seu progresso registrado.</div></div></article>';
    }
    var tags=criteriaSummaryHtml(review.criteria_ratings)+badgesSummaryHtml(review.badges);
    if(isEdital){
      var top='<div class="pro-review-topline"><span>✦ EDITAL</span><b>'+(a.rating!=null?'★ '+Number(a.rating).toFixed(1):'Sem nota')+'</b></div>';
      return '<section class="feed-review-shell">'+header+editalCardHtml(review,a.catalog_id,top,tags,spoilerLabel(review),true)+'</section>';
    }
    var poster=cat?tmdbImageUrl(cat.poster_path,'w342'):'',backdrop=cat?tmdbImageUrl(cat.backdrop_path,'w500'):'',artwork=poster||backdrop;
    return '<article class="diary-feed-card feed-review-standard">'+
      '<div class="diary-feed-poster" '+(a.catalog_id?'data-action="open-show" data-catalog="'+escapeHtml(a.catalog_id)+'"':'')+' style="'+(artwork?'background-image:url(\''+artwork.replace(/'/g,'%27')+'\')':'')+'"></div>'+
      '<div class="diary-feed-content">'+header+
        '<div class="diary-feed-title" '+(a.catalog_id?'data-action="open-show" data-catalog="'+escapeHtml(a.catalog_id)+'"':'')+'>'+escapeHtml(a.title||cat&&cat.title||'Série')+'</div>'+
        (a.rating!=null?'<div class="diary-feed-meta"><span class="diary-feed-pill diary-feed-rating">★ '+Number(a.rating).toFixed(1)+'</span></div>':'')+
        '<div class="community-review-text">'+escapeHtml(review.review||'')+'</div>'+tags+
      '</div>'+
    '</article>';
  }
  function followingFeedItemHtml(a){
    return a&&['review','edital','edital_repost'].indexOf(a.event_type)>-1?reviewFeedCardHtml(a):diaryFeedCardHtml(a);
  }
  function followingFeedHtml(){
    if(state.socialFeedLoading)return '<section class="social-feed"><div class="section-head"><div class="section-title">Seu feed</div></div><div class="tmdb-loading">Carregando atividade…</div></section>';
    if(state.socialFeedError)return '<section class="social-feed"><div class="section-head"><div class="section-title">Seu feed</div></div><div class="empty">'+escapeHtml(state.socialFeedError)+'</div></section>';
    if(!state.socialFeed.length)return '<section class="social-feed"><div class="section-head"><div class="section-title">Seu feed</div></div><div class="diary-feed-empty"><strong>Ainda não há atividade recente.</strong><br>Diários e resenhas de quem você segue aparecem aqui. Editals públicos de séries da sua estante também podem ser recomendados.</div></section>';
    return '<section class="social-feed"><div class="section-head"><div><div class="section-title">Seu feed</div><div style="font-size:10.5px;color:var(--text-dim);margin-top:3px;">Quem você segue + Editals públicos de séries que fazem parte da sua estante</div></div><button class="btn btn-ghost btn-sm" data-action="refresh-social-feed">Atualizar</button></div><div class="social-feed-list">'+state.socialFeed.map(followingFeedItemHtml).join('')+'</div></section>';
  }
  function userProfileStatsHtml(u){
    var avg=u.avg_rating==null?'—':Number(u.avg_rating).toFixed(1);
    return '<div class="stat-grid" style="margin-top:24px;">'+
      '<div class="stat-box"><div class="stat-num">'+Number(u.library_count||0)+'</div><div class="stat-label">Títulos na estante</div></div>'+
      '<div class="stat-box"><div class="stat-num">'+Number(u.completed_count||0)+'</div><div class="stat-label">Completos</div></div>'+
      '<div class="stat-box"><div class="stat-num">'+Number(u.watching_count||0)+'</div><div class="stat-label">Assistindo agora</div></div>'+
      '<div class="stat-box"><div class="stat-num">'+avg+'</div><div class="stat-label">Nota média</div></div>'+
    '</div>';
  }
  function userProfileChartsHtml(u){
    var dist=u.rating_distribution||{},buckets=[0.5,1,1.5,2,2.5,3,3.5,4,4.5,5];
    var max=1;buckets.forEach(function(b){max=Math.max(max,Number(dist[String(b)]||0));});
    var genres=Array.isArray(u.genre_stats)?u.genre_stats:[],maxGenre=genres.length?Number(genres[0].count||1):1;
    return '<div class="two-col" style="margin-top:24px;">'+
      '<div><div class="section-title" style="margin-bottom:12px;">Distribuição de notas</div><div class="bars">'+buckets.map(function(b){
        var count=Number(dist[String(b)]||0),w=count===0?0:Math.max(6,(count/max)*100);
        return '<div class="bar-row"><span class="bar-label">'+b.toFixed(1)+'★</span><div class="bar-track"><div class="bar-fill" style="width:'+w+'%"></div></div><span class="bar-count">'+count+'</span></div>';
      }).join('')+'</div></div>'+
      '<div><div class="section-title" style="margin-bottom:12px;">Gêneros mais assistidos</div>'+
      (genres.length?genres.map(function(g){return '<div class="genre-row"><span class="genre-name">'+escapeHtml(g.name||'Série')+'</span><div class="genre-track"><div class="genre-fill" style="width:'+((Number(g.count||0)/maxGenre)*100)+'%"></div></div><span class="genre-count">'+Number(g.count||0)+'</span></div>';}).join(''):'<p style="color:var(--text-muted);font-size:13px;">Sem dados suficientes ainda.</p>')+
      '</div></div>';
  }
  function userFavoritesHtml(u){
    var favs=Array.isArray(u.favorites)?u.favorites:[];
    if(!favs.length)return '';
    return '<section class="user-profile-section"><div class="user-profile-section-title">Séries favoritas</div><div class="grid">'+favs.map(function(item){
      var cat=ensureRemoteUserCatalog(item);return cat?catalogCardHtml(cat):'';
    }).join('')+'</div></section>';
  }
  function viewBingeoUserProfile(){
    if(state.userProfileLoading)return '<div class="user-view-page"><button class="btn btn-ghost btn-sm user-view-back" data-action="close-user-profile">← Voltar</button><div class="professional-loading">Carregando perfil…</div></div>';
    if(state.userProfileError)return '<div class="user-view-page"><button class="btn btn-ghost btn-sm user-view-back" data-action="close-user-profile">← Voltar</button><div class="empty"><strong>Não foi possível carregar este usuário.</strong>'+escapeHtml(state.userProfileError)+'</div></div>';
    var u=state.userProfileData;if(!u)return '';
    var initials=(u.username||'?').trim().charAt(0).toUpperCase();
    var avatar=u.avatar_url&&/^https?:\/\//i.test(u.avatar_url)?u.avatar_url:'';
    var banner=u.banner_url&&/^https?:\/\//i.test(u.banner_url)?u.banner_url:'';
    var socials=Array.isArray(u.social_links)?u.social_links:[];
    var top=Array.isArray(u.top_five)?u.top_five:[],evals=Array.isArray(u.evaluations)?u.evaluations:[],acts=Array.isArray(u.recent_activity)?u.recent_activity:[];
    evals.forEach(function(ev){if(ev&&!ev.plan)ev.plan=u.plan||'free';});
    var html='<div class="user-view-page"><button class="btn btn-ghost btn-sm user-view-back" data-action="close-user-profile">← Voltar</button>'+
      (banner?'<div class="user-view-banner" style="background-image:url(\''+banner.replace(/'/g,'%27')+'\')"></div>':'')+
      '<div class="user-view-head'+(banner?' with-banner':'')+'"><div class="user-view-avatar '+proAvatarFrameClass(u)+'" style="'+(avatar?'background-image:url(\''+avatar.replace(/'/g,'%27')+'\')':'')+'">'+(avatar?'':escapeHtml(initials))+'</div>'+
      '<div style="min-width:0;flex:1;"><div class="'+userNameClass(u)+'" style="'+userNameStyle(u)+'">@'+escapeHtml(u.username||'usuário')+'</div>'+proProfileBadgeHtml(u)+
      '<div class="profile-plan"><span class="plan-pill '+(u.plan==='pro'?'pro':'')+'">'+(u.plan==='pro'?'✦ Bingeo Pro':'Plano gratuito')+'</span></div>'+
      '<div class="follow-stats"><span><strong>'+Number(u.follower_count||0)+'</strong> seguidores</span><span><strong>'+Number(u.following_count||0)+'</strong> seguindo</span><span><strong>'+Number(u.library_count||0)+'</strong> na estante</span></div>'+
      (u.bio?'<div class="user-view-bio">'+escapeHtml(u.bio)+'</div>':'')+
      '<div class="user-view-actions">'+(u.is_self?'<button class="btn btn-primary btn-sm" data-action="open-my-profile">Abrir meu perfil</button>':'<button class="btn '+(u.is_following?'btn-ghost':'btn-primary')+' btn-sm" data-action="toggle-follow-user" data-user="'+u.user_id+'" data-following="'+(u.is_following?'1':'0')+'">'+(u.is_following?'Seguindo ✓':'Seguir')+'</button>')+'</div>'+
      (socials.length?'<div class="user-view-socials">'+socials.filter(function(sl){return sl&&sl.url&&validSocialUrl(sl.url);}).map(function(sl){return '<a class="social-link" href="'+escapeHtml(sl.url)+'" target="_blank" rel="noopener noreferrer"><span>'+socialIcon(sl.platform)+'</span>'+escapeHtml(socialLabel(sl.platform))+'</a>';}).join('')+'</div>':'')+
      '</div></div>';
    html+=proPublicHighlightedListHtml(u)+userProfileStatsHtml(u)+userProfileChartsHtml(u);
    html+='<section class="user-profile-section"><div class="user-profile-section-title">Top 5</div>';
    if(top.length){
      html+='<div class="user-top5-row">'+top.map(function(item,i){
        var cat=ensureRemoteUserCatalog(item),custom=(u.plan==='pro'&&u.top_five_artwork&&u.top_five_artwork[item.catalog_id])||'';
        var poster=custom&&/^\/[A-Za-z0-9._/-]+$/.test(custom)?tmdbImageUrl(custom,'w342'):(cat?tmdbImageUrl(cat.poster_path,'w342'):'');
        return '<div class="user-top5-card" data-action="open-show" data-catalog="'+escapeHtml(item.catalog_id||'')+'"><span class="user-top5-rank">#'+(i+1)+'</span><div class="user-top5-poster custom-profile-art" style="'+(poster?'background-image:url(\''+poster.replace(/'/g,'%27')+'\')':'')+'"></div></div>';
      }).join('')+'</div>';
    }else html+='<div class="empty">Esse usuário ainda não montou o Top 5.</div>';
    html+='</section><section class="user-profile-section"><div class="user-profile-section-title">Avaliações</div>';
    html+=evals.length?'<div class="user-eval-grid">'+evals.map(userEvaluationCardHtml).join('')+'</div>':'<div class="empty">Nenhuma avaliação registrada ainda.</div>';
    html+='</section>'+peopleFavoritesSectionsHtml(u.people_favorites||{})+userFavoritesHtml(u)+'<section class="user-profile-section"><div class="user-profile-section-title">Atividade recente</div>';
    html+=acts.length?'<div class="social-feed-list">'+acts.map(function(a){a.user_id=u.user_id;a.username=u.username;a.avatar_url=u.avatar_url;a.plan=u.plan;a.name_style=u.name_style;return socialActivityHtml(a,false);}).join('')+'</div>':'<div class="empty">Nenhuma atividade recente.</div>';
    return html+'</section></div>';
  }

  function hasPro(){return !!(state.profile&&state.profile.plan==='pro');}
  async function loadTrending(){
    if(!currentUserId)return;
    var userId=currentUserId;
    try{
      var result=await supabaseClient.rpc('get_global_trending',{p_days:30,p_limit:8});
      if(result.error)throw result.error;
      if(currentUserId!==userId)return;
      var counts={},users={};
      (result.data||[]).forEach(function(row){
        counts[row.catalog_id]=Number(row.interaction_count||0);
        users[row.catalog_id]=Number(row.user_count||0);
        var cat=getCatalog(row.catalog_id);
        if(!cat){
          cat={
            id:row.catalog_id,
            tmdbId:row.tmdb_id||null,
            title:row.title||'Série',
            type:'serie',
            genre:'Série',
            year:null,
            platform:'',
            seasons:[],
            poster_path:row.poster_path||null,
            backdrop_path:row.backdrop_path||null,
            overview:'',
            tmdbSource:true
          };
          CATALOG.push(cat);
        }else{
          if(row.tmdb_id&&!cat.tmdbId)cat.tmdbId=row.tmdb_id;
          if(row.title&&(!cat.title||cat.title==='Série'))cat.title=row.title;
          if(row.poster_path&&!cat.poster_path)cat.poster_path=row.poster_path;
          if(row.backdrop_path&&!cat.backdrop_path)cat.backdrop_path=row.backdrop_path;
        }
      });
      state.trending=counts;
      state.trendingUsers=users;
    }catch(e){
      console.error('Erro ao carregar tendências globais:',e);
    }
  }
  async function bumpTrending(catalogId,interactionType){
    if(!currentUserId||!catalogId)return;
    var userId=currentUserId,cat=getCatalog(catalogId);
    state.trending[catalogId]=(state.trending[catalogId]||0)+1;
    try{
      var result=await supabaseClient.rpc('record_series_interaction',{
        p_catalog_id:catalogId,
        p_tmdb_id:cat&&cat.tmdbId?Number(cat.tmdbId):null,
        p_title:cat&&cat.title?cat.title:catalogId,
        p_poster_path:cat&&cat.poster_path?cat.poster_path:null,
        p_backdrop_path:cat&&cat.backdrop_path?cat.backdrop_path:null,
        p_interaction_type:interactionType||'interaction'
      });
      if(result.error)throw result.error;
      if(currentUserId!==userId)return;
      await loadTrending();
      if(appBooted&&state.view==='home'&&!state.professionalOpen&&!state.userProfileOpen&&!state.characterOpen)renderMainViewOnly();
    }catch(e){
      console.error('Erro ao registrar interação global:',e);
    }
  }

  