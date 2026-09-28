/* ---------------- catalog (pré-cadastrado) ---------------- */
  var CATALOG = [
    { id:'round-6', title:'Round 6', type:'serie', genre:'Suspense', year:2021, platform:'Netflix', seasons:[9,6] },
    { id:'the-bear', title:'The Bear', type:'serie', genre:'Drama', year:2022, platform:'Disney+', seasons:[8,10,10] },
    { id:'stranger-things', title:'Stranger Things', type:'serie', genre:'Ficção científica', year:2016, platform:'Netflix', seasons:[8,9,8,9] },
    { id:'wandinha', title:'Wandinha', type:'serie', genre:'Fantasia', year:2022, platform:'Netflix', seasons:[8] },
    { id:'dark', title:'Dark', type:'serie', genre:'Ficção científica', year:2017, platform:'Netflix', seasons:[10,8,8] },
    { id:'the-crown', title:'The Crown', type:'serie', genre:'Drama histórico', year:2016, platform:'Netflix', seasons:[10,10,10,10] },
    { id:'succession', title:'Succession', type:'serie', genre:'Drama', year:2018, platform:'HBO Max', seasons:[10,10,9,10] },
    { id:'euphoria', title:'Euphoria', type:'serie', genre:'Drama', year:2019, platform:'HBO Max', seasons:[8,8] },
    { id:'ted-lasso', title:'Ted Lasso', type:'serie', genre:'Comédia', year:2020, platform:'Apple TV+', seasons:[10,12,12] },
    { id:'only-murders', title:'Only Murders in the Building', type:'serie', genre:'Comédia / Mistério', year:2021, platform:'Disney+', seasons:[10,10,8] },
    { id:'casa-de-papel', title:'La Casa de Papel', type:'serie', genre:'Suspense', year:2017, platform:'Netflix', seasons:[13,9,8,8] },
    { id:'chernobyl', title:'Chernobyl', type:'minisserie', genre:'Drama histórico', year:2019, platform:'HBO Max', seasons:[5] },
    { id:'the-last-of-us', title:'The Last of Us', type:'serie', genre:'Drama pós-apocalíptico', year:2023, platform:'HBO Max', seasons:[9] },
    { id:'house-of-dragon', title:'House of the Dragon', type:'serie', genre:'Fantasia', year:2022, platform:'HBO Max', seasons:[10,8] },
    { id:'bridgerton', title:'Bridgerton', type:'serie', genre:'Romance', year:2020, platform:'Netflix', seasons:[8,8,8] },
    { id:'friends', title:'Friends', type:'serie', genre:'Comédia', year:1994, platform:'Globoplay', seasons:[24,24,25,24] },
    { id:'greys-anatomy', title:"Grey's Anatomy", type:'serie', genre:'Drama médico', year:2005, platform:'Star+', seasons:[9,27,25,17] },
    { id:'breaking-bad', title:'Breaking Bad', type:'serie', genre:'Crime', year:2008, platform:'Netflix', seasons:[7,13,13,13] },
    { id:'the-office', title:'The Office', type:'serie', genre:'Comédia', year:2005, platform:'Globoplay', seasons:[6,22,25,19] },
    { id:'bbb', title:'Big Brother Brasil', type:'reality', genre:'Confinamento', year:2026, platform:'Globoplay', seasons:[100] },
    { id:'a-fazenda', title:'A Fazenda', type:'reality', genre:'Confinamento', year:2026, platform:'Record', seasons:[70] },
    { id:'ferias-com-ex', title:'De Férias com o Ex Brasil', type:'reality', genre:'Relacionamento', year:2021, platform:'Paramount+', seasons:[12] },
    { id:'love-is-blind', title:'Love Is Blind', type:'reality', genre:'Relacionamento', year:2020, platform:'Netflix', seasons:[10,10,10] },
    { id:'the-circle', title:'The Circle', type:'reality', genre:'Jogo social', year:2020, platform:'Netflix', seasons:[10,10,10] },
    { id:'no-limite', title:'No Limite', type:'reality', genre:'Sobrevivência', year:2000, platform:'Globoplay', seasons:[16] },
    { id:'masterchef-br', title:'MasterChef Brasil', type:'reality', genre:'Competição culinária', year:2014, platform:'Band', seasons:[26] },
    { id:'drag-race', title:"RuPaul's Drag Race", type:'reality', genre:'Competição / talento', year:2009, platform:'Paramount+', seasons:[14,14] },
    { id:'the-voice-br', title:'The Voice Brasil', type:'talk', genre:'Competição musical', year:2012, platform:'Globoplay', seasons:[20] }
  ];
  function getCatalog(id){ return CATALOG.find(function(c){ return c.id===id; }); }

  /* ---------------- episode metadata (títulos e sinopses) ----------------
     Catálogo pré-existente guardava apenas a quantidade de episódios por
     temporada (cat.seasons = [contagem, contagem, ...]). Isso é preservado
     integralmente. Aqui apenas ADICIONAMOS uma camada opcional de metadados
     (título + sinopse) por episódio, indexada por catalogId/temporada/episódio.
     Títulos com dados cadastrados mostram informação completa; os demais
     recebem um título e sinopse padrão, sem qualquer perda de funcionalidade. */
  var EPISODE_META = {
    'round-6': { 1: [
      {number:1, title:'Red Light, Green Light', synopsis:'Um grupo de estranhos endividados aceita participar de um jogo infantil com prêmio milionário — e descobre cedo demais o preço de perder.'},
      {number:2, title:'Hell', synopsis:'De volta ao mundo real, os sobreviventes pesam o horror do que viram contra a vida que os espera lá fora.'},
      {number:3, title:'The Man with the Umbrella', synopsis:'Alianças começam a se formar dentro dos dormitórios enquanto a desconfiança cresce entre os jogadores.'},
      {number:4, title:'Stick to the Team', synopsis:'Um jogo em equipe expõe covardias e lealdades inesperadas sob pressão extrema.'},
      {number:5, title:'A Fair World', synopsis:'Um investigador infiltrado se aproxima da verdade por trás da organização dos jogos.'},
      {number:6, title:'Gganbu', synopsis:'Um desafio em duplas transforma amizades recém-formadas em decisões impossíveis.'},
      {number:7, title:'VIPS', synopsis:'Espectadores misteriosos observam os jogos de camarote, tratando vidas como entretenimento.'},
      {number:8, title:'Front Man', synopsis:'Segredos sobre quem comanda os jogos vêm à tona, colocando tudo em risco.'},
      {number:9, title:'One Lucky Day', synopsis:'A disputa final aproxima os sobreviventes de um desfecho que muda tudo.'}
    ]},
    'stranger-things': { 1: [
      {number:1, title:'Chapter One: The Vanishing of Will Byers', synopsis:'Um garoto desaparece em uma pequena cidade, e estranhos eventos passam a ligar seus amigos, mãe e a polícia local.'},
      {number:2, title:'Chapter Two: The Weirdo on Maple Street', synopsis:'Os garotos encontram uma menina misteriosa com poderes que parecem ligados ao sumiço do amigo.'},
      {number:3, title:'Chapter Three: Holly, Jolly', synopsis:'Enquanto a busca se intensifica, sinais estranhos sugerem que Will pode não estar tão longe quanto parece.'},
      {number:4, title:'Chapter Four: The Body', synopsis:'Uma descoberta chocante muda os rumos da investigação e abala a cidade inteira.'},
      {number:5, title:'Chapter Five: The Flea and the Acrobat', synopsis:'Teorias sobre dimensões alternativas ganham força conforme as peças começam a se encaixar.'},
      {number:6, title:'Chapter Six: The Monster', synopsis:'Um plano arriscado tenta usar a conexão da garota misteriosa para localizar Will.'},
      {number:7, title:'Chapter Seven: The Bathtub', synopsis:'Um método incomum promete abrir uma janela para o lugar onde Will pode estar preso.'},
      {number:8, title:'Chapter Eight: The Upside Down', synopsis:'Tudo converge em um confronto final contra a escuridão que ameaça a cidade.'}
    ]},
    'the-bear': { 1: [
      {number:1, title:'System', synopsis:'Um chef renomado assume a cozinha bagunçada do restaurante de família e tenta impor ordem em meio ao caos.'},
      {number:2, title:'Hands', synopsis:'Tensões entre a equipe antiga e o novo comando revelam o quanto a cozinha está sobrecarregada.'},
      {number:3, title:'Brigade', synopsis:'Uma tentativa de reorganizar o time esbarra em rotinas antigas difíceis de mudar.'},
      {number:4, title:'Dogs', synopsis:'Um dia turbulento testa os limites de paciência de todos no restaurante.'},
      {number:5, title:'Sheridan', synopsis:'Memórias do passado surgem enquanto a pressão financeira aperta o negócio.'},
      {number:6, title:'Ceres', synopsis:'Um momento raro de calma permite reflexões sobre o rumo que a cozinha está tomando.'},
      {number:7, title:'Review', synopsis:'Uma avaliação externa expõe rachaduras que vinham sendo empurradas para debaixo do tapete.'},
      {number:8, title:'Braciole', synopsis:'A equipe se une para um serviço decisivo que pode redefinir o futuro do restaurante.'}
    ]},
    'breaking-bad': { 1: [
      {number:1, title:'Pilot', synopsis:'Um professor de química recebe um diagnóstico que muda tudo e decide entrar em um caminho perigoso para garantir o futuro da família.'},
      {number:2, title:"Cat's in the Bag...", synopsis:'As consequências de uma primeira decisão arriscada começam a aparecer, mais rápido do que o esperado.'},
      {number:3, title:"...And the Bag's in the River", synopsis:'Um dilema moral coloca à prova até onde ele está disposto a ir.'},
      {number:4, title:'Cancer Man', synopsis:'Segredos dentro de casa se tornam cada vez mais difíceis de manter escondidos.'},
      {number:5, title:'Gray Matter', synopsis:'Reencontros do passado reacendem orgulho e arrependimentos antigos.'},
      {number:6, title:"Crazy Handful of Nothin'", synopsis:'Uma demonstração de força muda a forma como ele é enxergado pelos outros.'},
      {number:7, title:'A No-Rough-Stuff-Type Deal', synopsis:'Uma parceria de negócios se firma sob condições muito mais tensas do que o previsto.'}
    ]}
  };
  function getEpisodeMeta(catalogId, seasonNum, epNum){
    var cat=getCatalog(catalogId);
    if(cat && cat.tmdbSeasons && cat.tmdbSeasons[seasonNum] && Array.isArray(cat.tmdbSeasons[seasonNum].episodes)){
      var tmdbEp=cat.tmdbSeasons[seasonNum].episodes.filter(function(e){return Number(e.episode_number)===Number(epNum);})[0];
      if(tmdbEp) return {number:epNum,title:tmdbEp.name||('Episódio '+epNum),synopsis:tmdbEp.overview||'Sinopse não disponível para este episódio.',air_date:tmdbEp.air_date||'',still_path:tmdbEp.still_path||null};
    }
    var seasonList=EPISODE_META[catalogId]&&EPISODE_META[catalogId][seasonNum];
    var found=seasonList&&seasonList.filter(function(e){return e.number===epNum;})[0];
    if(found) return found;
    return {number:epNum,title:'Episódio '+epNum,synopsis:'Sinopse não disponível para este episódio.'};
  }

  