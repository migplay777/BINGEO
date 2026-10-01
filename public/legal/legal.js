(async function(){
  try{
    const res=await fetch('/api/legal/config',{headers:{Accept:'application/json'}});
    const cfg=await res.json();
    const s=cfg&&cfg.supplier||{};
    const fill=(selector,value,fallback)=>{
      document.querySelectorAll(selector).forEach(el=>{el.textContent=value||fallback||'Não informado';});
    };
    fill('.legal-supplier-name',s.legalName,'Dados do fornecedor pendentes');
    fill('.legal-supplier-tax',s.taxId,'Publicação obrigatória antes da venda');
    fill('.legal-supplier-address',s.address,'Publicação obrigatória antes da venda');
    fill('.legal-support-email',s.supportEmail,'Canal em configuração');
    fill('.legal-privacy-email',s.privacyEmail||s.supportEmail,'Canal em configuração');
    fill('.legal-price',Number(cfg.price||14.90).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),'R$ 14,90');
    document.querySelectorAll('.legal-config-warning').forEach(el=>{el.hidden=!!cfg.legalReady;});
  }catch(e){}
})();