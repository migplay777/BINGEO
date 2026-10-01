/* ---------------- TMDB API ---------------- */
  function tmdbConfigured(){return true;}
  function tmdbCacheRead(){
    if(tmdbCacheMemory)return tmdbCacheMemory;
    try{var raw=localStorage.getItem(TMDB_CACHE_KEY);tmdbCacheMemory=raw?JSON.parse(raw):{};}
    catch(e){tmdbCacheMemory={};}
    return tmdbCacheMemory;
  }
  function tmdbCacheWrite(cache){
    tmdbCacheMemory=cache;
    try{
      // Mantém o cache persistente pequeno. Respostas grandes (como créditos completos)
      // continuam em memória durante a sessão sem travar o navegador com localStorage enorme.
      var compact={},total=0;
      Object.keys(cache).sort(function(a,b){return (cache[b].savedAt||0)-(cache[a].savedAt||0);}).forEach(function(k){
        if(Object.keys(compact).length>=40)return;
        var item=cache[k],serialized='';
        try{serialized=JSON.stringify(item);}catch(e){return;}
        if(serialized.length>90000||total+serialized.length>1500000)return;
        compact[k]=item;total+=serialized.length;
      });
      localStorage.setItem(TMDB_CACHE_KEY,JSON.stringify(compact));
    }catch(e){}
  }
  function tmdbCacheGet(key,maxAgeMs){var cache=tmdbCacheRead(),item=cache[key];if(!item||!item.savedAt)return null;if(maxAgeMs&&Date.now()-item.savedAt>maxAgeMs){delete cache[key];return null;}return item.value||null;}
  function tmdbCacheSet(key,value){var cache=tmdbCacheRead();cache[key]={savedAt:Date.now(),value:value};var keys=Object.keys(cache);if(keys.length>60){keys.sort(function(a,b){return cache[a].savedAt-cache[b].savedAt;}).slice(0,keys.length-60).forEach(function(k){delete cache[k];});}tmdbCacheWrite(cache);}
  async function bingeoApiHeaders(){
    var result=await supabaseClient.auth.getSession();
    var session=result&&result.data&&result.data.session;
    if(!session||!session.access_token)throw new Error('Sua sessão expirou. Entre novamente para continuar.');
    return {'Accept':'application/json','X-Bingeo-Session':session.access_token};
  }
  async function tmdbFetch(path,params){params=params||{};var qs=[];Object.keys(params).forEach(function(k){if(params[k]!==undefined&&params[k]!==null&&params[k]!=='')qs.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));});var url='/api/tmdb'+path+(qs.length?'?'+qs.join('&'):'');var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);try{var res=await fetch(url,{headers:await bingeoApiHeaders(),signal:controller.signal});if(!res.ok){var msg='TMDB HTTP '+res.status;try{var body=await res.json();if(body&&(body.status_message||body.error))msg=body.status_message||body.error;}catch(e){}throw new Error(msg);}return await res.json();}catch(err){if(err&&err.name==='AbortError')throw new Error('A TMDB demorou para responder. Tente novamente.');throw err;}finally{clearTimeout(timer);}}
  async function tvmazeFetch(path,params){
    params=params||{};
    var qs=[];
    Object.keys(params).forEach(function(k){
      if(params[k]!==undefined&&params[k]!==null&&params[k]!=='')qs.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));
    });
    var url='/api/tvmaze/'+String(path||'').replace(/^\/+/, '')+(qs.length?'?'+qs.join('&'):'');
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);
    try{
      var res=await fetch(url,{headers:await bingeoApiHeaders(),signal:controller.signal});
      if(!res.ok){
        var msg='TVmaze HTTP '+res.status;
        try{var body=await res.json();if(body&&body.error)msg=body.error;}catch(e){}
        throw new Error(msg);
      }
      return await res.json();
    }catch(err){
      if(err&&err.name==='AbortError')throw new Error('A TVmaze demorou para responder.');
      throw err;
    }finally{clearTimeout(timer);}
  }

  async function anilistFetchSearch(title){
    title=String(title||'').trim();
    if(!title)return [];
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);
    try{
      var res=await fetch('/api/anilist/search?q='+encodeURIComponent(title),{
        headers:await bingeoApiHeaders(),
        signal:controller.signal
      });
      if(!res.ok){
        var msg='AniList HTTP '+res.status;
        try{var body=await res.json();if(body&&(body.error||body.message))msg=body.error||body.message;}catch(e){}
        throw new Error(msg);
      }
      var data=await res.json();
      var page=data&&data.data&&data.data.Page;
      return page&&Array.isArray(page.media)?page.media:[];
    }catch(err){
      if(err&&err.name==='AbortError')throw new Error('A AniList demorou para responder.');
      throw err;
    }finally{clearTimeout(timer);}
  }
  async function anilistCharacterImageSearch(name){
    name=String(name||'').trim();
    if(!name)return [];
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);
    try{
      var res=await fetch('/api/anilist/characters/search?q='+encodeURIComponent(name),{headers:await bingeoApiHeaders(),signal:controller.signal});
      if(!res.ok)throw new Error('AniList personagens HTTP '+res.status);
      var data=await res.json(),page=data&&data.data&&data.data.Page;
      return page&&Array.isArray(page.characters)?page.characters:[];
    }catch(err){
      if(err&&err.name==='AbortError')throw new Error('A AniList demorou para responder.');
      throw err;
    }finally{clearTimeout(timer);}
  }
  async function jikanCharacterSearch(name){
    name=String(name||'').trim();
    if(!name)return [];
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);
    try{
      var res=await fetch('/api/jikan/characters/search?q='+encodeURIComponent(name),{headers:await bingeoApiHeaders(),signal:controller.signal});
      if(!res.ok)throw new Error('Jikan HTTP '+res.status);
      var data=await res.json();
      return Array.isArray(data&&data.data)?data.data:[];
    }catch(err){
      if(err&&err.name==='AbortError')throw new Error('A Jikan demorou para responder.');
      throw err;
    }finally{clearTimeout(timer);}
  }
  async function jikanCharacterPictures(malId){
    if(!malId)return [];
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},12000);
    try{
      var res=await fetch('/api/jikan/characters/'+encodeURIComponent(malId)+'/pictures',{headers:await bingeoApiHeaders(),signal:controller.signal});
      if(!res.ok)throw new Error('Jikan imagens HTTP '+res.status);
      var data=await res.json();
      return Array.isArray(data&&data.data)?data.data:[];
    }catch(err){
      if(err&&err.name==='AbortError')throw new Error('A Jikan demorou para responder.');
      throw err;
    }finally{clearTimeout(timer);}
  }
  function safeJikanImage(url){
    url=String(url||'').trim();
    return /^https:\/\/cdn\.myanimelist\.net\//i.test(url)?url:'';
  }
  function safeCharacterProviderImage(url){
    return safeTheTvdbImage(url)||safeTvmazeImage(url)||safeAniListImage(url)||safeJikanImage(url);
  }

  function normalizeCreditName(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function normalizeCharacterName(value){
    var raw=String(value||'')
      .replace(/\((?:voice|voz|voix|sprecher|seiyuu|uncredited|archive footage|self)[^)]*\)/gi,' ')
      .replace(/\[(?:voice|voz|uncredited)[^\]]*\]/gi,' ');
    var n=normalizeCreditName(raw);
    return n.replace(/\b(?:voice|voices|voz|vozes|dub|dubbing|seiyuu)\b/g,' ').replace(/\s+/g,' ').trim();
  }
  function characterAliasNames(item){
    var names=[];
    if(item&&item.name)names.push(item.name);
    (item&&Array.isArray(item.aliases)?item.aliases:[]).forEach(function(a){
      var v=typeof a==='string'?a:(a&&a.name);
      if(v)names.push(v);
    });
    return names.map(normalizeCharacterName).filter(Boolean);
  }
  function characterNameScore(target,candidate){
    target=normalizeCharacterName(target);candidate=normalizeCharacterName(candidate);
    if(!target||!candidate)return 0;
    if(target===candidate)return 120;
    if(target.indexOf(candidate)>-1||candidate.indexOf(target)>-1){
      var short=Math.min(target.length,candidate.length),long=Math.max(target.length,candidate.length);
      return short>=4?85+(short/long)*15:55;
    }
    var a=target.split(' ').filter(Boolean),b=candidate.split(' ').filter(Boolean);
    var overlap=a.filter(function(t){return b.indexOf(t)>-1;}).length;
    if(!overlap)return 0;
    var ratio=overlap/Math.max(a.length,b.length);
    return ratio>=.75?78:ratio>=.5?60:35;
  }
  function safeTvmazeImage(url){
    url=String(url||'');
    return /^https:\/\/static\.tvmaze\.com\//i.test(url)?url:'';
  }
  async function theTvdbFetch(path,params){
    params=params||{};
    var qs=[];
    Object.keys(params).forEach(function(k){
      if(params[k]!==undefined&&params[k]!==null&&params[k]!=='')qs.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));
    });
    var url='/api/thetvdb/'+String(path||'').replace(/^\/+/, '')+(qs.length?'?'+qs.join('&'):'');
    var controller=new AbortController(),timer=setTimeout(function(){controller.abort();},14000);
    try{
      var res=await fetch(url,{headers:await bingeoApiHeaders(),signal:controller.signal});
      if(!res.ok){
        var msg='TheTVDB HTTP '+res.status;
        try{var body=await res.json();if(body&&(body.message||body.error))msg=body.message||body.error;}catch(e){}
        throw new Error(msg);
      }
      return await res.json();
    }catch(err){
      if(err&&err.name==='AbortError')throw new Error('A TheTVDB demorou para responder.');
      throw err;
    }finally{clearTimeout(timer);}
  }
  function safeTheTvdbImage(url){
    url=String(url||'').trim();
    if(!url)return '';
    if(/^https:\/\/(artworks\.)?thetvdb\.com\//i.test(url)||/^https:\/\/images\.thetvdb\.com\//i.test(url))return url;
    if(/^\/\//.test(url))return 'https:'+url;
    if(/^\/banners\//i.test(url))return 'https://artworks.thetvdb.com'+url;
    if(/^banners\//i.test(url))return 'https://artworks.thetvdb.com/'+url;
    return '';
  }
  function safeAniListImage(url){
    url=String(url||'').trim();
    return /^https:\/\/s4\.anilist\.co\/file\/anilistcdn\//i.test(url)?url:'';
  }
  function characterImageUrl(ch){
    return safeTvmazeImage(ch&&ch.character_image_url) || safeTheTvdbImage(ch&&ch.tvdb_character_image_url);
  }
  function characterBannerImageUrl(ch){
    return safeTheTvdbImage(ch&&ch.character_banner_url);
  }

  function normalizeSeriesTitle(value){
    return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  }
  function isAnimeSeries(cat,details){
    var genres=Array.isArray(details&&details.genres)?details.genres:[];
    var hasAnimation=genres.some(function(g){
      return String(g&&g.name||'').toLowerCase()==='animation';
    });
    var originalLang=String(details&&details.original_language||'').toLowerCase();
    var countries=Array.isArray(details&&details.origin_country)?details.origin_country:[];
    var fromJapan=originalLang==='ja'||countries.indexOf('JP')>-1;
    var label=(String(cat&&cat.genre||'')+' '+String(cat&&cat.title||'')).toLowerCase();
    return (hasAnimation&&fromJapan)||/\banime\b/.test(label);
  }
  function aniListTitleVariants(media){
    var t=media&&media.title||{},values=[
      t.userPreferred,t.english,t.romaji,t.native
    ].concat(Array.isArray(media&&media.synonyms)?media.synonyms:[]);
    return values.filter(Boolean).map(normalizeSeriesTitle).filter(Boolean);
  }
  function chooseAniListMatch(results,cat,details){
    if(!Array.isArray(results)||!results.length)return null;
    var targetTitles=[
      cat&&cat.title,
      details&&details.name,
      details&&details.original_name
    ].filter(Boolean).map(normalizeSeriesTitle).filter(Boolean);
    var year=Number(cat&&cat.year)||parseInt((details&&details.first_air_date||'').slice(0,4),10)||0;
    var best=null,bestScore=-Infinity;
    results.forEach(function(media){
      var titles=aniListTitleVariants(media),score=0;
      targetTitles.forEach(function(target){
        titles.forEach(function(candidate){
          if(candidate===target)score=Math.max(score,120);
          else if(candidate&&target&&(candidate.indexOf(target)>-1||target.indexOf(candidate)>-1))score=Math.max(score,75);
        });
      });
      var mediaYear=Number(media&&media.seasonYear)||Number(media&&media.startDate&&media.startDate.year)||0;
      if(year&&mediaYear){
        if(mediaYear===year)score+=35;
        else if(Math.abs(mediaYear-year)<=1)score+=15;
        else if(Math.abs(mediaYear-year)>=4)score-=25;
      }
      var format=String(media&&media.format||'').toUpperCase();
      if(format==='TV'||format==='TV_SHORT'||format==='ONA')score+=8;
      if(String(media&&media.countryOfOrigin||'').toUpperCase()==='JP')score+=5;
      if(score>bestScore){best=media;bestScore=score;}
    });
    return bestScore>=75?best:null;
  }
  function tmdbResultYear(r){return parseInt((r&&r.first_air_date||'').slice(0,4),10)||0;}
  function chooseTmdbMatch(results,cat){
    if(!results||!results.length)return null;
    var target=normalizeSeriesTitle(cat.title),year=Number(cat.year)||0;
    var exactTitle=results.filter(function(r){
      return normalizeSeriesTitle(r.name)===target||normalizeSeriesTitle(r.original_name)===target;
    });
    if(year&&exactTitle.length){
      var exactYear=exactTitle.filter(function(r){return tmdbResultYear(r)===year;});
      if(exactYear.length)return exactYear.sort(function(a,b){return Number(b.vote_count||0)-Number(a.vote_count||0);})[0];
      exactTitle.sort(function(a,b){
        var da=Math.abs((tmdbResultYear(a)||9999)-year),db=Math.abs((tmdbResultYear(b)||9999)-year);
        if(da!==db)return da-db;
        return Number(b.vote_count||0)-Number(a.vote_count||0);
      });
      return exactTitle[0];
    }
    if(exactTitle.length)return exactTitle.sort(function(a,b){return Number(b.vote_count||0)-Number(a.vote_count||0);})[0];
    var best=null,bestScore=-Infinity;
    results.forEach(function(r){
      var name=normalizeSeriesTitle(r.name||r.original_name),score=0;
      if(name.indexOf(target)>-1||target.indexOf(name)>-1)score+=50;
      var y=tmdbResultYear(r);
      if(year&&y){if(y===year)score+=35;else if(Math.abs(y-year)<=1)score+=12;}
      score+=Number(r.vote_count||0)/100000;
      if(score>bestScore){bestScore=score;best=r;}
    });
    return best;
  }
  function mergeTmdbResult(r){
    var tmdbId=Number(r.id),stableId='tmdb-'+tmdbId;
    var existing=CATALOG.find(function(c){
      return c.id===stableId||(c.tmdbId!=null&&Number(c.tmdbId)===tmdbId);
    });
    if(existing){
      existing.tmdbId=tmdbId;
      existing.poster_path=r.poster_path||existing.poster_path;
      existing.backdrop_path=r.backdrop_path||existing.backdrop_path;
      if(!existing.year)existing.year=tmdbResultYear(r)||null;
      return existing;
    }
    var cat={
      id:stableId,
      tmdbId:tmdbId,
      title:r.name||r.original_name||'Série',
      type:'serie',
      genre:'Série',
      year:tmdbResultYear(r)||null,
      platform:'',
      seasons:[],
      poster_path:r.poster_path||null,
      backdrop_path:r.backdrop_path||null,
      tmdbSource:true
    };
    CATALOG.push(cat);
    return cat;
  }
  async function tmdbSearchTV(query){var key='search:'+query.toLowerCase().trim();var cached=tmdbCacheGet(key,900000);if(cached)return cached;var data=await tmdbFetch('/search/tv',{query:query,language:'pt-BR',include_adult:'false',page:1});var results=(data.results||[]).slice(0,15).map(function(r){return {id:r.id,name:r.name,original_name:r.original_name,first_air_date:r.first_air_date,poster_path:r.poster_path,backdrop_path:r.backdrop_path,overview:r.overview||'',vote_average:r.vote_average||0,vote_count:r.vote_count||0,genre_ids:r.genre_ids||[]};});tmdbCacheSet(key,results);return results;}
  async function tmdbSearchPeople(query){
    var key='people:'+query.toLowerCase().trim(),cached=tmdbCacheGet(key,900000);
    if(cached)return cached;
    var data=await tmdbFetch('/search/person',{query:query,language:'pt-BR',include_adult:'false',page:1});
    var results=(data.results||[]).filter(function(p){return !!p.id;}).slice(0,12).map(function(p){
      return {id:p.id,name:p.name||'Profissional',profile_path:p.profile_path||null,known_for_department:p.known_for_department||'',popularity:Number(p.popularity||0)};
    });
    tmdbCacheSet(key,results);
    return results;
  }
  async function loadTmdbSeries(cat,force){if(!tmdbConfigured())return null;if(cat.tmdbLoaded&&!force)return cat.tmdbData;if(tmdbHydrationPromises[cat.id]&&!force)return tmdbHydrationPromises[cat.id];tmdbHydrationPromises[cat.id]=(async function(){var found;if(cat.tmdbId)found={id:cat.tmdbId};else{var sr=await tmdbSearchTV(cat.title);found=chooseTmdbMatch(sr,cat);if(!found)throw new Error('Série não encontrada na TMDB.');}var details=tmdbCacheGet('series:'+found.id,86400000);if(!details){details=await tmdbFetch('/tv/'+found.id,{language:'pt-BR',append_to_response:'aggregate_credits,external_ids'});tmdbCacheSet('series:'+found.id,details);}if(!details.external_ids){try{details.external_ids=await tmdbFetch('/tv/'+found.id+'/external_ids',{});tmdbCacheSet('series:'+found.id,details);}catch(ignore){}}cat.tmdbId=details.id;cat.tmdbData=details;cat.tmdbLoaded=true;cat.tmdbError='';cat.poster_path=details.poster_path||cat.poster_path||null;cat.backdrop_path=details.backdrop_path||cat.backdrop_path||null;cat.overview=details.overview||cat.overview||'';cat.tmdbData=details;cat.genre=(details.genres&&details.genres[0]&&details.genres[0].name)||cat.genre||'Série';cat.year=parseInt((details.first_air_date||'').slice(0,4),10)||cat.year||null;cat.platform=(details.networks&&details.networks[0]&&details.networks[0].name)||cat.platform||'';if(Array.isArray(details.seasons))cat.seasons=details.seasons.filter(function(se){return Number(se.season_number)>0;}).map(function(se){return Number(se.episode_count)||0;});cat.tmdbSeasons=cat.tmdbSeasons||{};indexSeriesCharacters(cat,details,!!force);return details;})().catch(function(err){cat.tmdbLoaded=false;cat.tmdbError=err.message||'Erro ao carregar TMDB';throw err;}).finally(function(){delete tmdbHydrationPromises[cat.id];});return tmdbHydrationPromises[cat.id];}
  async function loadTmdbSeason(cat,seasonNum){if(!tmdbConfigured()||!cat.tmdbId)return null;cat.tmdbSeasons=cat.tmdbSeasons||{};if(cat.tmdbSeasons[seasonNum])return cat.tmdbSeasons[seasonNum];var key='season:'+cat.tmdbId+':'+seasonNum,cached=tmdbCacheGet(key,86400000);if(cached){cat.tmdbSeasons[seasonNum]=cached;return cached;}var data=await tmdbFetch('/tv/'+cat.tmdbId+'/season/'+seasonNum,{language:'pt-BR'});cat.tmdbSeasons[seasonNum]=data;tmdbCacheSet(key,data);return data;}
  function professionalCreditFavoriteHtml(p,department){
    var fav=isProfessionalFavorite(p.id);
    return '<span class="credit-person-wrap"><span class="tmdb-credit-chip" data-action="open-professional" data-person="'+p.id+'">'+escapeHtml(p.name||'')+'</span>'+
      '<button class="credit-fav-btn '+(fav?'active':'')+'" data-action="toggle-professional-favorite" data-person="'+p.id+'" data-name="'+escapeHtml(p.name||'Profissional')+'" data-profile="'+escapeHtml(p.profile_path||'')+'" data-department="'+escapeHtml(p.known_for_department||department||'')+'" title="'+(fav?'Remover dos favoritos':'Favoritar profissional')+'">'+(fav?'♥':'♡')+'</button></span>';
  }
  function tmdbCastHtml(cat,credits){
    var cast=(credits&&credits.cast||[]).slice(0,12);if(!cast.length)return '<span style="color:var(--text-dim);font-size:12px;">Elenco não disponível.</span>';
    return '<div class="tmdb-people-row">'+cast.map(function(p){
      var img=tmdbImageUrl(p.profile_path,'w185'),roles=characterRolesForCast(p),role=roles[0]||null,ch=role?characterRowFromCast(cat,p,role):null;
      var fav=isProfessionalFavorite(p.id),charFav=ch&&isCharacterFavorite(ch.character_key);
      return '<div class="tmdb-person" '+(ch?'data-action="open-character" data-character="'+escapeHtml(ch.character_key)+'"':'data-action="open-professional" data-person="'+p.id+'"')+'>'+
        '<button class="cast-fav-btn '+(fav?'active':'')+'" data-action="toggle-professional-favorite" data-person="'+p.id+'" data-name="'+escapeHtml(p.name||'Profissional')+'" data-profile="'+escapeHtml(p.profile_path||'')+'" data-department="Acting" title="'+(fav?'Remover ator dos favoritos':'Favoritar ator')+'">'+(fav?'♥':'♡')+'</button>'+
        (img?'<img src="'+img+'" alt="" loading="lazy">':'<div class="tmdb-person-placeholder">•</div>')+
        '<span class="tmdb-person-name" data-action="open-professional" data-person="'+p.id+'">'+escapeHtml(p.name||'')+'</span>'+
        '<span class="tmdb-person-role" '+(ch?'data-action="open-character" data-character="'+escapeHtml(ch.character_key)+'"':'')+'>'+escapeHtml(role&&role.character||'Personagem não informado')+'</span>'+
        (ch?'<button class="character-fav-mini '+(charFav?'active':'')+'" data-action="toggle-character-favorite" data-character="'+escapeHtml(ch.character_key)+'">'+(charFav?'♥ Personagem favorito':'♡ Favoritar personagem')+'</button>':'')+
      '</div>';
    }).join('')+'</div>';
  }
  function tmdbCrewChips(crew,department,jobMatcher){var list=[];(crew||[]).forEach(function(p){if(department&&p.department!==department)return;var jobs=(p.jobs||[]).map(function(j){return j.job||'';}),job=p.job||'';if(jobMatcher&&!jobMatcher(job,jobs))return;if(!list.some(function(x){return x.id===p.id;}))list.push(p);});return list.slice(0,12).map(function(p){return professionalCreditFavoriteHtml(p,department);}).join('')||'<span style="color:var(--text-dim);font-size:12px;">Não disponível.</span>';}
  function tmdbSeriesInfoHtml(cat){if(!tmdbConfigured())return '';if(!cat.tmdbLoaded){return '<div class="tmdb-loading">Carregando dados oficiais da TMDB…</div>';}var d=cat.tmdbData||{},credits=d.aggregate_credits||{},overview=d.overview||'Sinopse não disponível.';var creators=(d.created_by||[]).map(function(p){return professionalCreditFavoriteHtml(p,'Writing');}).join('')||'<span style="color:var(--text-dim);font-size:12px;">Não disponível.</span>';var directors=tmdbCrewChips(credits.crew,'Directing',function(job,jobs){return /director/i.test(job)||jobs.some(function(x){return /director/i.test(x);});});var writers=tmdbCrewChips(credits.crew,'Writing',function(job,jobs){return /writer|screenplay|teleplay/i.test(job)||jobs.some(function(x){return /writer|screenplay|teleplay/i.test(x);});});var producers=tmdbCrewChips(credits.crew,'Production',function(job,jobs){return /producer/i.test(job)||jobs.some(function(x){return /producer/i.test(x);});});return '<div class="tmdb-series-header"><div class="tmdb-series-poster" style="'+posterBackgroundStyle(cat,'w500')+'"></div><div class="tmdb-series-copy"><div class="modal-title">'+escapeHtml(d.name||cat.title)+'</div><div style="font-size:12px;color:var(--text-muted);margin-top:4px;">'+escapeHtml([d.first_air_date?d.first_air_date.slice(0,4):'',d.number_of_seasons?d.number_of_seasons+' temporadas':'',d.number_of_episodes?d.number_of_episodes+' episódios':''].filter(Boolean).join(' · '))+'</div><p class="tmdb-overview">'+escapeHtml(overview)+'</p></div></div><div class="tmdb-credit-grid"><div class="tmdb-credit-block"><h4>Criador(es)</h4><div class="tmdb-credit-list">'+creators+'</div></div><div class="tmdb-credit-block"><h4>Direção</h4><div class="tmdb-credit-list">'+directors+'</div></div><div class="tmdb-credit-block"><h4>Roteiro</h4><div class="tmdb-credit-list">'+writers+'</div></div><div class="tmdb-credit-block"><h4>Produção</h4><div class="tmdb-credit-list">'+producers+'</div></div><div class="tmdb-credit-block"><h4>Elenco principal</h4>'+tmdbCastHtml(cat,credits)+'</div></div>';}
  function professionalDepartmentLabel(value){
    var v=String(value||'').toLowerCase();
    if(v==='acting')return 'Atuação';
    if(v==='directing')return 'Direção';
    if(v==='production')return 'Produção';
    if(v==='writing')return 'Roteiro';
    if(v==='editing')return 'Edição';
    if(v==='camera')return 'Fotografia e câmera';
    if(v==='sound')return 'Som e música';
    if(v==='art')return 'Arte';
    if(v==='costume & make-up')return 'Figurino e maquiagem';
    if(v==='visual effects')return 'Efeitos visuais';
    return value||'Profissional';
  }
  function professionalDepartmentFromRole(role,fallback){
    var r=String(role||'');
    if(r==='Atuação')return 'Acting';
    if(r==='Direção')return 'Directing';
    if(r==='Produção')return 'Production';
    if(r==='Roteiro'||r==='Criação')return 'Writing';
    if(r==='Edição')return 'Editing';
    if(r==='Fotografia e câmera')return 'Camera';
    if(r==='Som e música')return 'Sound';
    if(r==='Arte')return 'Art';
    if(r==='Figurino e maquiagem')return 'Costume & Make-Up';
    if(r==='Efeitos visuais')return 'Visual Effects';
    return fallback||'';
  }
  function professionalRoleGroup(item,isCast){
    if(isCast)return 'Atuação';
    var job=String(item.job||''),dept=String(item.department||'');
    if(/creator|created by/i.test(job))return 'Criação';
    if(dept==='Directing'||/director/i.test(job))return 'Direção';
    if(dept==='Production'||/producer|production/i.test(job))return 'Produção';
    if(dept==='Writing'||/writer|screenplay|teleplay|story|script/i.test(job))return 'Roteiro';
    if(dept==='Editing'||/editor/i.test(job))return 'Edição';
    if(dept==='Camera'||/cinematograph|camera|director of photography/i.test(job))return 'Fotografia e câmera';
    if(dept==='Sound'||/sound|music|composer/i.test(job))return 'Som e música';
    if(dept==='Art'||/art|production design|set design/i.test(job))return 'Arte';
    if(dept==='Costume & Make-Up'||/costume|make.?up/i.test(job))return 'Figurino e maquiagem';
    if(dept==='Visual Effects'||/visual effects|vfx/i.test(job))return 'Efeitos visuais';
    return dept||job||'Outros trabalhos';
  }
  function ensureCatalogFromProfessionalCredit(item){
    var id='tmdb-'+item.id,cat=getCatalog(id);
    if(!cat){
      cat={id:id,tmdbId:item.id,title:item.name||item.original_name||'Série',type:'serie',genre:'Série',
        year:parseInt((item.first_air_date||'').slice(0,4),10)||null,platform:'',seasons:[],
        poster_path:item.poster_path||null,backdrop_path:item.backdrop_path||null,overview:item.overview||'',tmdbSource:true};
      CATALOG.push(cat);
    }else{
      cat.tmdbId=item.id;
      cat.poster_path=item.poster_path||cat.poster_path;
      cat.backdrop_path=item.backdrop_path||cat.backdrop_path;
      cat.overview=item.overview||cat.overview||'';
      if(!cat.year)cat.year=parseInt((item.first_air_date||'').slice(0,4),10)||null;
    }
    return cat;
  }
  function professionalSeriesGroups(person){
    var combined=person&&person.combined_credits||{},groups={};
    function add(item,group,role){
      if(!item||item.media_type!=='tv'||!item.id)return;
      var cat=ensureCatalogFromProfessionalCredit(item);
      groups[group]=groups[group]||{};
      var key=String(item.id);
      if(!groups[group][key])groups[group][key]={cat:cat,roles:[],date:item.first_air_date||'',popularity:Number(item.popularity||0)};
      if(role&&groups[group][key].roles.indexOf(role)===-1)groups[group][key].roles.push(role);
    }
    (combined.cast||[]).forEach(function(item){add(item,'Atuação',item.character?('Personagem: '+item.character):'Ator/Atriz');});
    (combined.crew||[]).forEach(function(item){
      var group=professionalRoleGroup(item,false);
      add(item,group,item.job||item.department||group);
    });
    var order=['Atuação','Direção','Produção','Roteiro','Criação','Edição','Fotografia e câmera','Som e música','Arte','Figurino e maquiagem','Efeitos visuais'];
    return Object.keys(groups).map(function(group){
      var items=Object.keys(groups[group]).map(function(k){return groups[group][k];}).sort(function(a,b){
        var ad=a.date||'',bd=b.date||'';if(ad!==bd)return bd.localeCompare(ad);return b.popularity-a.popularity;
      });
      return {name:group,items:items};
    }).sort(function(a,b){
      var ai=order.indexOf(a.name),bi=order.indexOf(b.name);if(ai<0)ai=999;if(bi<0)bi=999;
      return ai-bi||a.name.localeCompare(b.name);
    });
  }
  function professionalDefaultRole(person,groups){
    if(!groups||!groups.length)return null;
    var preferred=professionalDepartmentLabel(person&&person.known_for_department||'');
    var exact=groups.find(function(g){return g.name===preferred;});
    if(exact)return exact.name;
    if(preferred==='Roteiro'){
      var creation=groups.find(function(g){return g.name==='Criação';});
      if(creation)return creation.name;
    }
    var byCount=groups.slice().sort(function(a,b){return b.items.length-a.items.length;})[0];
    return byCount?byCount.name:groups[0].name;
  }
  function professionalActiveGroup(person){
    var groups=professionalSeriesGroups(person);
    if(!groups.length)return {groups:groups,active:null};
    var active=groups.find(function(g){return g.name===state.professionalRoleTab;});
    if(!active){
      state.professionalRoleTab=professionalDefaultRole(person,groups);
      active=groups.find(function(g){return g.name===state.professionalRoleTab;})||groups[0];
    }
    return {groups:groups,active:active};
  }
  async function hydrateProfessionalSeriesItem(item){
    var cat=item&&item.cat;if(!cat||!cat.tmdbId)return;
    try{
      await loadTmdbSeries(cat);
      var overview=(cat.tmdbData&&cat.tmdbData.overview)||cat.overview||'';
      if(!overview||!cat.poster_path){
        var fallbackKey='series-en:'+cat.tmdbId,fallback=tmdbCacheGet(fallbackKey,86400000);
        if(!fallback){
          fallback=await tmdbFetch('/tv/'+cat.tmdbId,{language:'en-US'});
          tmdbCacheSet(fallbackKey,fallback);
        }
        if(!cat.poster_path)cat.poster_path=fallback.poster_path||null;
        if(!cat.backdrop_path)cat.backdrop_path=fallback.backdrop_path||null;
        if(!overview)cat.overview=fallback.overview||'';
        if(!cat.year)cat.year=parseInt((fallback.first_air_date||'').slice(0,4),10)||null;
      }
    }catch(e){console.warn('Não foi possível enriquecer a série do profissional:',cat.tmdbId,e);}
  }
  async function hydrateProfessionalActiveRole(personId){
    if(!state.professionalData||state.professionalOpen!==personId)return;
    var data=professionalActiveGroup(state.professionalData),group=data.active;
    if(!group||!group.items.length)return;
    var roleAtStart=group.name;
    state.professionalHydrating=true;renderMainViewOnly();
    try{
      var items=group.items.filter(function(item){
        var cat=item.cat,overview=(cat&&cat.tmdbData&&cat.tmdbData.overview)||(cat&&cat.overview)||'';
        return !cat||!cat.poster_path||!overview;
      });
      for(var i=0;i<items.length;i+=4){
        if(state.professionalOpen!==personId||state.professionalRoleTab!==roleAtStart)return;
        await Promise.allSettled(items.slice(i,i+4).map(hydrateProfessionalSeriesItem));
        if(state.professionalOpen===personId&&state.professionalRoleTab===roleAtStart)renderMainViewOnly();
      }
    }finally{
      if(state.professionalOpen===personId&&state.professionalRoleTab===roleAtStart){
        state.professionalHydrating=false;renderMainViewOnly();
      }
    }
  }
  function professionalWorkCardHtml(item){
    var cat=item.cat,year=cat.year||'',poster=tmdbImageUrl(cat.poster_path,'w342'),backdrop=tmdbImageUrl(cat.backdrop_path,'w500');
    var art=poster||backdrop;
    var overview=(cat.tmdbData&&cat.tmdbData.overview)||cat.overview||'';
    return '<div class="professional-work" data-action="open-show" data-catalog="'+cat.id+'">'+
      '<div class="professional-work-art">'+
        (art?'<div class="professional-work-poster" style="background-image:url(\''+art.replace(/'/g,'%27')+'\');'+(!poster?'background-size:cover;':'')+'"></div>':'<div class="professional-poster-fallback">Imagem ainda não disponível</div>')+
      '</div>'+
      '<div class="professional-work-body"><div class="professional-work-title">'+escapeHtml(cat.title)+'</div>'+
      '<div class="professional-work-meta">'+escapeHtml(year?String(year):'Série')+'</div>'+
      '<div class="professional-work-role">'+escapeHtml(item.roles.join(' · '))+'</div>'+
      '<div class="professional-work-synopsis">'+escapeHtml(overview||'Sinopse não disponível para esta série.')+'</div></div></div>';
  }
  function viewProfessional(){
    if(state.professionalLoading)return '<div class="professional-page"><button class="btn btn-ghost btn-sm professional-back" data-action="close-professional">← Voltar</button><div class="professional-loading">Carregando profissional…</div></div>';
    if(state.professionalError)return '<div class="professional-page"><button class="btn btn-ghost btn-sm professional-back" data-action="close-professional">← Voltar</button><div class="empty"><strong>Não foi possível carregar este profissional.</strong>'+escapeHtml(state.professionalError)+'</div></div>';
    var person=state.professionalData;if(!person)return '';
    var photo=tmdbImageUrl(person.profile_path,'h632')||tmdbImageUrl(person.profile_path,'w500');
    var meta=[];
    if(person.known_for_department)meta.push(professionalDepartmentLabel(person.known_for_department));
    if(person.birthday)meta.push('Nascimento: '+person.birthday.split('-').reverse().join('/'));
    if(person.deathday)meta.push('Falecimento: '+person.deathday.split('-').reverse().join('/'));
    if(person.place_of_birth)meta.push(person.place_of_birth);
    var pg=professionalActiveGroup(person),groups=pg.groups,active=pg.active;
    var favoriteDepartment=professionalDepartmentFromRole(active&&active.name,person.known_for_department||'');
    var html='<div class="professional-page"><button class="btn btn-ghost btn-sm professional-back" data-action="close-professional">← Voltar</button>'+
      '<section class="professional-hero"><div class="professional-photo" style="'+(photo?'background-image:url(\''+photo.replace(/'/g,'%27')+'\')':'')+'"></div>'+
      '<div class="professional-copy"><div style="font-size:11px;color:var(--violet);font-weight:800;text-transform:uppercase;letter-spacing:.08em;">Profissional</div>'+
      '<h1>'+escapeHtml(person.name||'Profissional')+'</h1><div class="professional-meta">'+meta.map(function(x){return '<span>'+escapeHtml(x)+'</span>';}).join('')+'</div>'+
      '<div class="professional-bio">'+escapeHtml(person.biography||'Biografia não disponível na TMDB em português no momento.')+'</div>'+
      '<div class="character-actions"><button class="btn '+(isProfessionalFavorite(person.id)?'btn-primary':'btn-ghost')+' btn-sm" data-action="toggle-professional-favorite" data-person="'+person.id+'" data-name="'+escapeHtml(person.name||'Profissional')+'" data-profile="'+escapeHtml(person.profile_path||'')+'" data-department="'+escapeHtml(favoriteDepartment)+'">'+(isProfessionalFavorite(person.id)?'♥ Profissional favorito':'♡ Favoritar profissional')+'</button></div></div></section>';
    if(!groups.length){
      html+='<div class="empty"><strong>Nenhuma série encontrada.</strong>A TMDB não possui créditos de séries cadastrados para este profissional.</div>';
      return html+'</div>';
    }
    html+='<nav class="professional-role-tabs" aria-label="Funções do profissional">'+groups.map(function(group){
      return '<button class="professional-role-tab '+(active&&active.name===group.name?'active':'')+'" data-action="professional-role-tab" data-role="'+escapeHtml(group.name)+'">'+escapeHtml(group.name)+' <span style="opacity:.55;">'+group.items.length+'</span></button>';
    }).join('')+'</nav>';
    html+='<div class="professional-current-role"><div><h2>'+escapeHtml(active.name)+'</h2><div class="professional-data-note">Somente séries em que '+escapeHtml(person.name||'o profissional')+' trabalhou como '+escapeHtml(active.name.toLowerCase())+'.</div></div>'+
      (state.professionalHydrating?'<span class="professional-hydrating">Completando posters e sinopses</span>':'<span>'+active.items.length+' série'+(active.items.length===1?'':'s')+'</span>')+'</div>';
    html+='<div class="professional-grid">'+active.items.map(professionalWorkCardHtml).join('')+'</div>';
    return html+'</div>';
  }
  async function loadProfessional(personId){
    if(!personId)return;
    state.professionalLoading=true;state.professionalError='';state.professionalData=null;state.professionalRoleTab=null;state.professionalHydrating=false;
    renderMainViewOnly();
    try{
      var key='person:'+personId,person=tmdbCacheGet(key,86400000);
      if(!person){
        person=await tmdbFetch('/person/'+personId,{language:'pt-BR',append_to_response:'combined_credits'});
        tmdbCacheSet(key,person);
      }
      if(!person.biography){
        try{
          var enKey='person-en:'+personId,en=tmdbCacheGet(enKey,86400000);
          if(!en){en=await tmdbFetch('/person/'+personId,{language:'en-US'});tmdbCacheSet(enKey,en);}
          if(en&&en.biography)person.biography=en.biography;
          if(!person.profile_path&&en&&en.profile_path)person.profile_path=en.profile_path;
        }catch(ignore){}
      }
      if(state.professionalOpen!==personId)return;
      state.professionalData=person;
      var pg=professionalActiveGroup(person);
      state.professionalRoleTab=pg.active?pg.active.name:null;
      state.professionalLoading=false;
      renderMainViewOnly();
      hydrateProfessionalActiveRole(personId);
      return;
    }catch(err){
      if(state.professionalOpen===personId)state.professionalError=err.message||'Erro ao consultar a TMDB.';
    }finally{
      if(state.professionalOpen===personId&&state.professionalLoading){
        state.professionalLoading=false;renderMainViewOnly();
      }
    }
  }

  function pruneTransientTmdbCatalog(){
    CATALOG=CATALOG.filter(function(cat){
      if(!cat.tmdbSource)return true;
      if(state.modalCatalogId===cat.id)return true;
      if(state.entries.some(function(e){return e.catalogId===cat.id;}))return true;
      if(state.diary.some(function(d){return d.catalogId===cat.id;}))return true;
      if(state.lists.some(function(l){return Array.isArray(l.showIds)&&l.showIds.indexOf(cat.id)>-1;}))return true;
      return state.profile.topFive.indexOf(cat.id)>-1;
    });
  }
  function ensureCharacterSeriesCatalog(ch){
    if(!ch||!ch.tv_id)return null;
    var cid='tmdb-'+Number(ch.tv_id),cat=getCatalog(cid);
    if(!cat){
      cat={id:cid,tmdbId:Number(ch.tv_id),title:ch.tv_name||'Série',type:'serie',genre:'Série',year:null,platform:'',seasons:[],
        poster_path:ch.series_poster_path||null,backdrop_path:ch.series_backdrop_path||null,overview:'',tmdbSource:true};
      CATALOG.push(cat);
    }else{
      if(ch.tv_name&&(!cat.title||cat.title==='Série'))cat.title=ch.tv_name;
      if(ch.series_poster_path&&!cat.poster_path)cat.poster_path=ch.series_poster_path;
      if(ch.series_backdrop_path&&!cat.backdrop_path)cat.backdrop_path=ch.series_backdrop_path;
    }
    return cat;
  }
  function viewCharacter(){
    if(state.characterLoading&&!state.characterData)return '<div class="character-page"><button class="btn btn-ghost btn-sm character-back" data-action="close-character">← Voltar</button><div class="professional-loading">Carregando personagem…</div></div>';
    if(state.characterError&&!state.characterData)return '<div class="character-page"><button class="btn btn-ghost btn-sm character-back" data-action="close-character">← Voltar</button><div class="empty"><strong>Não foi possível carregar este personagem.</strong>'+escapeHtml(state.characterError)+'</div></div>';
    var ch=state.characterData;if(!ch)return '';
    characterLocalCache[ch.character_key]=ch;
    var cat=ensureCharacterSeriesCatalog(ch);
    var portrait=characterImageUrl(ch);
    var banner=characterBannerImageUrl(ch)||tmdbImageUrl(ch.series_backdrop_path,'original')||portrait||tmdbImageUrl(ch.series_poster_path,'original');
    var favorite=isCharacterFavorite(ch.character_key);
    var about='<strong>'+escapeHtml(displayCharacterName(ch.character_name))+'</strong> é um personagem de <strong>'+escapeHtml(ch.tv_name||'esta série')+'</strong>, interpretado por <strong>'+escapeHtml(ch.actor_name||'um integrante do elenco')+'</strong>.';
    if(Number(ch.episode_count||0)>0)about+=' Nos créditos agregados da TMDB, aparece em '+Number(ch.episode_count)+' episódio'+(Number(ch.episode_count)===1?'':'s')+'.';
    return '<div class="character-page"><button class="btn btn-ghost btn-sm character-back" data-action="close-character">← Voltar</button>'+
      (banner?'<div class="character-banner" style="background-image:url(\''+banner.replace(/'/g,'%27')+'\')"></div>':'')+
      '<section class="character-hero">'+
        '<div class="character-portrait" style="'+(portrait?'background-image:url(\''+portrait.replace(/'/g,'%27')+'\')':'')+'">'+(portrait?'':'<span class="character-image-missing">Imagem do personagem indisponível</span>')+'</div>'+
        '<div class="character-copy"><div class="character-kicker">Personagem</div><h1 class="character-name">'+escapeHtml(displayCharacterName(ch.character_name))+'</h1>'+
          '<div class="character-sub">Interpretado por <strong>'+escapeHtml(ch.actor_name||'Profissional')+'</strong> · '+escapeHtml(ch.tv_name||'Série')+'</div>'+
          (portrait?'<div class="character-source-note" style="margin-top:6px;">Imagem do personagem: '+escapeHtml(ch.character_image_source==='thetvdb'||(!safeTvmazeImage(ch.character_image_url)&&safeTheTvdbImage(ch.tvdb_character_image_url))?'TheTVDB':'TVmaze')+'</div>':'')+
          '<div class="character-actions">'+
            '<button class="btn '+(favorite?'btn-primary':'btn-ghost')+' btn-sm" data-action="toggle-character-favorite" data-character="'+escapeHtml(ch.character_key)+'">'+(favorite?'♥ Personagem favorito':'♡ Favoritar personagem')+'</button>'+
            '<button class="btn btn-ghost btn-sm" data-action="open-professional" data-person="'+Number(ch.person_id)+'">Ver '+escapeHtml(ch.actor_name||'ator/atriz')+'</button>'+
            (cat?'<button class="btn btn-ghost btn-sm" data-action="open-show" data-catalog="'+cat.id+'">Abrir série</button>':'')+
          '</div></div>'+
      '</section>'+
      '<section class="character-about"><h2>Sobre o personagem</h2><p>'+about+'</p>'+
      '<div class="character-source-note">A imagem principal usa primeiro uma arte própria do personagem da TVmaze e, quando ela não existe, tenta uma imagem de personagem da TheTVDB. O Bingeo nunca usa a foto comum do ator ou dublador como foto do personagem. Para o banner, uma arte horizontal ligada ao personagem na TheTVDB tem prioridade; quando não existe, entra o backdrop oficial da série.</div></section>'+
    '</div>';
  }
  function hydrateCharacterSearchArtwork(items){
    if(!tmdbConfigured()||!Array.isArray(items)||!items.length)return;
    var unique={},cats=[];
    items.filter(function(ch){return ch&&!characterImageUrl(ch);}).forEach(function(ch){
      var cat=ensureCharacterSeriesCatalog(ch);
      if(cat&&!unique[cat.id]){unique[cat.id]=1;cats.push(cat);}
    });
    cats.slice(0,6).forEach(function(cat){
      if(cat.characterArtworkAttempted)return;
      cat.characterArtworkAttempted=true;
      loadTmdbSeries(cat,true).catch(function(e){console.warn('Não foi possível completar a arte do personagem:',e);});
    });
  }

  function displayCharacterName(value){
    var s=String(value||'Personagem').replace(/\s*\((?:voice|voz)[^)]*\)\s*$/i,'').trim();
    return s||String(value||'Personagem');
  }

  function characterSearchResultsHtml(){
    if(!state.query.trim()||!state.characterSearchResults.length)return '';
    return '<div class="character-search-wrap"><div class="section-head"><div class="section-title">Personagens</div><div class="section-count">'+state.characterSearchResults.length+' encontrados</div></div>'+
      '<div class="character-search-row">'+state.characterSearchResults.map(function(ch){
        characterLocalCache[ch.character_key]=ch;
        var img=characterImageUrl(ch);
        return '<div class="character-search-card" data-action="open-character" data-character="'+escapeHtml(ch.character_key)+'">'+
          '<div class="character-search-photo" style="'+(img?'background-image:url(\''+img.replace(/'/g,'%27')+'\')':'')+'">'+(img?'':'<span class="character-image-missing">Sem imagem</span>')+'</div>'+
          '<div class="character-search-body"><div class="character-search-name">'+escapeHtml(displayCharacterName(ch.character_name))+'</div>'+
          '<div class="character-search-series">'+escapeHtml(ch.tv_name||'Série')+'</div>'+
          '<div class="character-search-actor">Interpretado por '+escapeHtml(ch.actor_name||'')+'</div></div></div>';
      }).join('')+'</div></div>';
  }

  function tmdbPersonResultsHtml(){
    if(!state.query.trim()||!state.tmdbPersonResults.length)return '';
    return '<div class="people-search-wrap"><div class="section-head"><div class="section-title">Profissionais</div><div class="section-count">'+state.tmdbPersonResults.length+' encontrados</div></div><div class="people-search-row">'+
      state.tmdbPersonResults.map(function(p){
        var img=tmdbImageUrl(p.profile_path,'w342');
        return '<div class="person-search-card" data-action="open-professional" data-person="'+p.id+'">'+
          '<div class="person-search-photo" style="'+(img?'background-image:url(\''+img.replace(/'/g,'%27')+'\')':'')+'"></div>'+
          '<div class="person-search-body"><div class="person-search-name">'+escapeHtml(p.name)+'</div><div class="person-search-role">'+escapeHtml(professionalDepartmentLabel(p.known_for_department))+'</div></div></div>';
      }).join('')+'</div></div>';
  }
  function tmdbSearchResultsHtml(){
    if(!state.query.trim())return '';
    if(state.tmdbSearchLoading)return '<div class="tmdb-loading">Buscando séries, personagens, profissionais e usuários no Bingeo…</div>';
    var users=userSearchResultsHtml();
    var characters=characterSearchResultsHtml();
    var people=tmdbConfigured()?tmdbPersonResultsHtml():'';
    if(tmdbConfigured())pruneTransientTmdbCatalog();
    var series='';
    if(tmdbConfigured()&&state.tmdbSearchResults.length){
      series='<div class="section-head"><div class="section-title">Séries</div></div><div class="grid">'+state.tmdbSearchResults.map(function(r){
        var cat=mergeTmdbResult(r);
        return '<div class="card tmdb-search-card" data-action="open-show" data-catalog="'+cat.id+'">'+posterHtml(cat,'<span class="type-pill">Série</span>')+'<div class="card-body"><div class="card-title">'+escapeHtml(cat.title)+'</div><div class="card-meta"><span>'+(r.first_air_date?r.first_air_date.slice(0,4):'')+'</span>'+(r.vote_average?'<span class="card-stars">★ '+Number(r.vote_average).toFixed(1)+'</span>':'')+'</div></div></div>';
      }).join('')+'</div>';
    }
    if(!users&&!characters&&!people&&!series){
      return '<div class="empty"><strong>Nada encontrado.</strong>Tente outro nome de série, personagem, profissional ou usuário.'+(state.tmdbSearchError?'<br><span style="font-size:11px;color:var(--text-dim);">'+escapeHtml(state.tmdbSearchError)+'</span>':'')+'</div>';
    }
    return users+characters+people+series;
  }
  function hydrateCatalogs(cats){
    if(!tmdbConfigured()||!cats||!cats.length)return;
    var pending=cats.filter(Boolean).slice(0,8).filter(function(cat){return !cat.tmdbLoaded&&!cat.tmdbError&&!tmdbHydrationPromises[cat.id];});
    if(!pending.length)return;
    Promise.allSettled(pending.map(function(cat){return loadTmdbSeries(cat);}))
      .then(function(){
        if(state.view==='descobrir'||state.view==='estante'||state.view==='perfil')render();
        else if(state.modalCatalogId)renderModal();
      });
  }

  