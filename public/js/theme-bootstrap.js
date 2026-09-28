(function(){
  var theme='dark';
  try{theme=localStorage.getItem('bingeo-theme-preference')==='light'?'light':'dark';}catch(e){}
  document.documentElement.setAttribute('data-theme',theme);
})();
