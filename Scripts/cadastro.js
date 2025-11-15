/* js/validar-form.js */
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-ong") || document.querySelector("form");

  // -------- utilidades --------
  const getDigits = (v) => (v || "").replace(/\D+/g, "");
  const setMsg = (el, msg) => { el.setCustomValidity(msg || ""); el.reportValidity(); };
  const UF = new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);

  // -------- funções de validação --------
  const validaNome = (v) => (v||"").trim().length >= 3;
  const validaDescricao = (v) => (v||"").trim().length >= 20;
  const validaEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v||"").trim());
  const validaTelefone = (v) => { const d = getDigits(v); return d.length === 10 || d.length === 11; };
  const validaUF = (v) => UF.has(String(v||"").toUpperCase());
  const validaCNPJ = (v) => {
    const c = getDigits(v);
    if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
    const calcDV = (base) => {
      let soma = 0, pos = base.length - 7;
      for (let i = base.length; i >= 1; i--) {
        soma += parseInt(base[base.length - i], 10) * pos--;
        if (pos < 2) pos = 9;
      }
      const r = soma % 11;
      return (r < 2) ? 0 : 11 - r;
    };
    const dv1 = calcDV(c.substring(0, 12));
    const dv2 = calcDV(c.substring(0, 12) + dv1);
    return c.endsWith(String(dv1) + String(dv2));
  };
  const validaAnoFundacao = (v) => Number(v) >= 1950 && Number(v) <= 2025;
  const validaArquivo = (input) => {
    const f = input.files && input.files[0];
    if (!f) return true;
    const okTipo = ["application/pdf","image/jpeg","image/png"].includes(f.type);
    const okTamanho = f.size <= 5 * 1024 * 1024;
    return okTipo && okTamanho;
  };
  const validaURL = (v) => {
    const m = String(v||"").trim();
    if (!m) return true;
    try { new URL(m); return true; } catch { return false; }
  };
  const validaResponsavel = (v) => /^[A-Za-zÀ-ÿ\s]{3,}$/.test((v || "").trim());
  const validaCEPDigitos = (v) => getDigits(v).length === 8;

  // -------- referências --------
  const el = {
    nome: document.getElementById("nome_ong"),
    cnpj: document.getElementById("cnpj"),
    ano: document.getElementById("fundacao"),
    area: document.getElementById("area_atuacao"),
    desc: document.getElementById("descricao"),
    end: document.getElementById("endereco"),
    cid: document.getElementById("cidade"),
    uf: document.getElementById("estado"),
    cep: document.getElementById("cep"),
    email: document.getElementById("email"),
    fone: document.getElementById("telefone"),
    site: document.getElementById("site"),
    resp: document.getElementById("responsavel"),
    cargo: document.getElementById("cargo"),
    doc: document.getElementById("documento"),
  };

  // -------- máscara de telefone --------
  el.fone.addEventListener("input", () => {
    let v = getDigits(el.fone.value);
    if (v.length > 11) v = v.slice(0, 11);
    if (v.length > 6) {
      el.fone.value = `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`;
    } else if (v.length > 2) {
      el.fone.value = `(${v.slice(0,2)}) ${v.slice(2)}`;
    } else if (v.length > 0) {
      el.fone.value = `(${v}`;
    } else {
      el.fone.value = "";
    }
  });

  // -------- máscara de CEP --------
  if (el.cep) {
    el.cep.addEventListener("input", () => {
      let v = getDigits(el.cep.value);
      if (v.length > 8) v = v.slice(0, 8);
      el.cep.value = v.length > 5 ? `${v.slice(0,5)}-${v.slice(5)}` : v;
    });
  }

  // -------- ViaCEP (cache + verificação) --------
  const cepCache = new Map(); // "70000000" -> {ok:true, data:{...}} | {ok:false}
  async function consultaViaCEP(cepDigits) {
    if (cepCache.has(cepDigits)) return cepCache.get(cepDigits);
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${cepDigits}/json/`);
      if (!resp.ok) throw new Error("HTTP");
      const data = await resp.json();
      const ok = !data.erro;
      const result = { ok, data: ok ? data : null };
      cepCache.set(cepDigits, result);
      return result;
    } catch {
      return { ok: false, data: null, netErr: true };
    }
  }

  async function validaCEPExistente(input) {
    const digits = getDigits(input.value);
    if (!validaCEPDigitos(digits)) { setMsg(input, "CEP inválido. Use 8 dígitos."); return false; }
    setMsg(input, ""); // limpa antes de consultar
    const res = await consultaViaCEP(digits);
    if (res.netErr) { setMsg(input, "Não foi possível validar o CEP agora. Tente novamente."); return false; }
    if (!res.ok) { setMsg(input, "CEP não encontrado no ViaCEP."); return false; }
    setMsg(input, "");
    return true;
  }

  // -------- restrição do nome do responsável --------
  el.resp.addEventListener("input", () => {
    el.resp.value = el.resp.value.replace(/[^A-Za-zÀ-ÿ\s]/g, "");
  });

  // -------- validações individuais --------
  form.addEventListener("focusout", async (e) => {
    const t = e.target;
    if (t === el.nome) setMsg(t, validaNome(t.value) ? "" : "Informe ao menos 3 caracteres.");
    if (t === el.desc) setMsg(t, validaDescricao(t.value) ? "" : "Descreva com pelo menos 20 caracteres.");
    if (t === el.email) setMsg(t, validaEmail(t.value) ? "" : "E-mail inválido.");
    if (t === el.fone) setMsg(t, validaTelefone(t.value) ? "" : "Telefone inválido. Use (DD) 99999-9999.");
    if (t === el.uf) { const ok = validaUF(t.value); if(ok) t.value = t.value.toUpperCase(); setMsg(t, ok ? "" : "UF inválida (ex.: SP, RJ, GO)."); }
    if (t === el.cnpj) setMsg(t, validaCNPJ(t.value) ? "" : "CNPJ inválido.");
    if (t === el.ano) setMsg(t, validaAnoFundacao(t.value) ? "" : "Ano entre 1950 e 2025.");
    if (t === el.site) setMsg(t, validaURL(t.value) ? "" : "URL inválida.");
    if (t === el.doc) setMsg(t, validaArquivo(t) ? "" : "Arquivo inválido. PDF/JPG/PNG até 5 MB.");
    if (t === el.end) setMsg(t, (t.value||"").trim() ? "" : "Endereço obrigatório.");
    if (t === el.cid) setMsg(t, (t.value||"").trim() ? "" : "Cidade obrigatória.");
    if (t === el.resp) setMsg(t, validaResponsavel(t.value) ? "" : "Informe apenas letras e espaços (mínimo 3).");
    if (t === el.cargo) setMsg(t, (t.value||"").trim() ? "" : "Informe o cargo.");
    if (t === el.cep) { await validaCEPExistente(t); }
  });

  // -------- validação final no envio (ASSÍNCRONA) --------
  form.addEventListener("submit", async (e) => {
    let primeiroErro = null;
    const check = (elm, ok, msg) => { if (!ok) { setMsg(elm, msg); primeiroErro = primeiroErro || elm; } else setMsg(elm, ""); };

    // nativos
    if (!form.checkValidity()) {
      form.querySelectorAll("input,select,textarea").forEach((i)=>{ if(!i.checkValidity() && !primeiroErro) primeiroErro = i; });
    }

    // custom síncronas
    check(el.nome,  validaNome(el.nome.value), "Informe ao menos 3 caracteres.");
    check(el.cnpj,  validaCNPJ(el.cnpj.value), "CNPJ inválido.");
    check(el.ano,   validaAnoFundacao(el.ano.value), "Ano entre 1950 e 2025.");
    check(el.area,  !!el.area.value, "Selecione a área de atuação.");
    check(el.desc,  validaDescricao(el.desc.value), "Descreva com pelo menos 20 caracteres.");
    check(el.end,   (el.end.value||"").trim().length>0, "Endereço obrigatório.");
    check(el.cid,   (el.cid.value||"").trim().length>0, "Cidade obrigatória.");
    check(el.uf,    validaUF(el.uf.value), "UF inválida (ex.: SP, RJ, GO).");
    if (validaUF(el.uf.value)) el.uf.value = el.uf.value.toUpperCase();
    check(el.email, validaEmail(el.email.value), "E-mail inválido.");
    check(el.fone,  validaTelefone(el.fone.value), "Telefone inválido. Use (DD) 99999-9999.");
    check(el.site,  validaURL(el.site.value), "URL inválida.");
    check(el.resp,  validaResponsavel(el.resp.value), "Informe apenas letras e espaços (mínimo 3).");
    check(el.cargo, (el.cargo.value||"").trim().length>0, "Informe o cargo.");
    check(el.doc,   validaArquivo(el.doc), "Arquivo inválido. PDF/JPG/PNG até 5 MB.");

    // CEP: validação assíncrona obrigatória
    if (el.cep) {
      const okCEP = await validaCEPExistente(el.cep);
      if (!okCEP) primeiroErro = primeiroErro || el.cep;
    }

    if (primeiroErro) {
      e.preventDefault();
      primeiroErro.focus();
    }
  });
});
