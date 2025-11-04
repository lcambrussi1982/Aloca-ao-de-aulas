/* ========= Cambrussi SPA — app.js (com manutenção nas próprias telas) =========
   Requisitos:
   - Carregar db-browser.js ANTES deste arquivo (define window.DB)
   - HTML precisa ter:
      #main-nav com botões <button data-view="dashboard|teachers|components|offers|allocations|reports">
      #btn-theme (opcional) para alternar tema
      #app como container principal
=============================================================================== */

// ---------- helpers ----------
const $  = (sel,root=document)=>root.querySelector(sel);
const $$ = (sel,root=document)=>[...root.querySelectorAll(sel)];
function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2600); }
function csvEscape(v){ if(v==null) return ''; v=String(v); return /[",\n;]/.test(v)?`"${v.replace(/"/g,'""')}"`:v; }
function toCSV(rows){ if(!rows?.length) return ''; const H=Object.keys(rows[0]); return [H.join(';'),...rows.map(r=>H.map(h=>csvEscape(r[h])).join(';'))].join('\n'); }
function downloadBlob(name, blob){ const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; a.click(); URL.revokeObjectURL(a.href); }
function downloadCSV(name, rows){ const blob=new Blob([toCSV(rows)],{type:'text/csv;charset=utf-8'}); downloadBlob(name, blob); }
function xlsxFromRows(sheetName, rows){
  if(!rows?.length) rows=[{}];
  const H=Object.keys(rows[0]);
  const esc=s=>String(s??'').replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const row=r=>H.map(h=>`<Cell><Data ss:Type="String">${esc(r[h]??'')}</Data></Cell>`).join('');
  const xml=`<?xml version="1.0"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
    <Worksheet ss:Name="${esc(sheetName)}">
      <Table>
        <Row>${H.map(h=>`<Cell><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>
        ${rows.map(r=>`<Row>${row(r)}</Row>`).join('')}
      </Table>
    </Worksheet>
  </Workbook>`;
  return new Blob([xml],{type:'application/vnd.ms-excel'});
}

// ---------- Grid reutilizável ----------
class Grid{
  constructor(mount,{rows,columns,searchableKeys=null,pageSize=10,footer=null,storageKey=null}){
    this.el=mount; this.columns=columns; this.rowsAll=[...(rows||[])];
    this.filtered=[...this.rowsAll]; this.page=1; this.pageSize=pageSize;
    this.searchable=searchableKeys||columns.map(c=>c.key);
    this.sortKey=null; this.sortDir='asc'; this.footerRenderer=footer; this.storageKey=storageKey;
    if(storageKey){ try{ const st=JSON.parse(localStorage.getItem(storageKey)||'{}');
      if(st.pageSize) this.pageSize=st.pageSize; if(st.q) this._restoredQ=st.q;
      if(st.sortKey){ this.sortKey=st.sortKey; this.sortDir=st.sortDir||'asc'; }
    }catch{} }
    this.renderShell();
    if(this._restoredQ) $('#q',this.el).value=this._restoredQ;
    this.applySearch($('#q',this.el).value);
  }
  persist(){ if(!this.storageKey) return;
    localStorage.setItem(this.storageKey, JSON.stringify({ q:$('#q',this.el).value, pageSize:this.pageSize, sortKey:this.sortKey, sortDir:this.sortDir })); }
  renderShell(){
    this.el.innerHTML=`
      <div class="toolbar">
        <input id="q" placeholder="buscar..." />
        <div class="spacer"></div>
        <label>Itens/pág. <input id="ps" type="number" min="1" value="${this.pageSize}" style="width:90px"></label>
        <button id="btn-csv" class="ghost">CSV (página)</button>
        <button id="btn-xlsx" class="ghost">XLSX (página)</button>
      </div>
      <div class="card">
        <table class="table">
          <thead><tr>${this.columns.map(c=>`<th class="${c.sortable?'sortable':''}" data-col="${c.key}">${c.label}</th>`).join('')}</tr></thead>
          <tbody></tbody>
          <tfoot style="display:none"><tr><td colspan="${this.columns.length}"></td></tr></tfoot>
        </table>
        <div class="pager" style="margin-top:10px">
          <button id="first">«</button><button id="prev">‹</button>
          <span class="info" id="info"></span>
          <button id="next">›</button><button id="last">»</button>
        </div>
      </div>`;
    this.tbody=this.el.querySelector('tbody'); this.tfoot=this.el.querySelector('tfoot');
    $('#q',this.el).addEventListener('input',e=>{ this.applySearch(e.target.value); this.persist(); });
    $('#ps',this.el).addEventListener('change',e=>{ this.pageSize=Math.max(1,Number(e.target.value)||10); this.page=1; this.render(); this.persist(); });
    $('#btn-csv',this.el).onclick =()=> downloadCSV('grid.csv', this.pageRowsExport());
    $('#btn-xlsx',this.el).onclick=()=> downloadBlob('grid.xlsx', xlsxFromRows('Sheet1', this.pageRowsExport()));
    $('#first',this.el).onclick =()=>{ this.page=1; this.render(); };
    $('#prev',this.el).onclick  =()=>{ if(this.page>1){ this.page--; this.render(); } };
    $('#next',this.el).onclick  =()=>{ if(this.page<this.totalPages()){ this.page++; this.render(); } };
    $('#last',this.el).onclick  =()=>{ this.page=this.totalPages(); this.render(); };
    this.el.querySelectorAll('th.sortable').forEach(th=>{
      th.addEventListener('click',()=>{
        const key=th.dataset.col;
        if(this.sortKey===key) this.sortDir=(this.sortDir==='asc'?'desc':'asc'); else { this.sortKey=key; this.sortDir='asc'; }
        this.applySearch($('#q',this.el).value); this.persist();
      });
    });
  }
  applySearch(q){
    q=(q||'').toLowerCase();
    this.filtered=!q?[...this.rowsAll]:this.rowsAll.filter(r=> this.searchable.some(k=> String(r[k]??'').toLowerCase().includes(q)));
    if(this.sortKey){
      const k=this.sortKey, d=this.sortDir==='asc'?1:-1;
      this.filtered.sort((a,b)=>{
        const av=a[k], bv=b[k];
        const cmp=(typeof av==='number'&&typeof bv==='number')?(av-bv):String(av??'').localeCompare(String(bv??''),'pt-BR',{numeric:true});
        return cmp*d;
      });
    }
    this.page=1; this.render();
  }
  updateRows(rows){ this.rowsAll=[...(rows||[])]; this.applySearch($('#q',this.el).value); }
  totalPages(){ return Math.max(1, Math.ceil(this.filtered.length/this.pageSize)); }
  pageRows(){ const start=(this.page-1)*this.pageSize; return this.filtered.slice(start,start+this.pageSize); }
  pageRowsExport(){ const rows=this.pageRows(); return rows.map(r=>{ const o={}; for(const c of this.columns){ o[c.label]=c.format?c.format(r[c.key],r):r[c.key]; } return o; }); }
  render(){
    const rows=this.pageRows();
    this.tbody.innerHTML=rows.map(r=>`<tr>${this.columns.map(c=>{
      const val=c.format?c.format(r[c.key],r):r[c.key]; return `<td data-label="${c.label}">${val??''}</td>`;
    }).join('')}</tr>`).join('');
    $('#info',this.el).textContent=`Página ${this.page} de ${this.totalPages()} • ${this.filtered.length} registro(s)`;
    if(this.footerRenderer){
      const html=this.footerRenderer(this.filtered);
      if(html){ this.tfoot.style.display=''; this.tfoot.querySelector('td').innerHTML=html; } else this.tfoot.style.display='none';
    }
  }
}

// ---------- relatórios auxiliares ----------
function buildTeacherSubjects(periodLabel){
  const periods=DB.list('periods')||[], courses=DB.list('courses')||[], comps=DB.list('components')||[], teachers=DB.list('teachers')||[];
  const per=periods.find(p=>p.rotulo===periodLabel); if(!per) return [];
  const getCourse=id=> courses.find(c=>c.id===id)?.nome || '—';
  const getComp=id=> comps.find(c=>c.id===id)?.nome || '—';
  const getTeach=id=> teachers.find(t=>t.id===id)?.nome || '—';
  const rows=[];
  // internas
  for(const o of (DB.Offer||[])){
    if(o.period_id!==per.id) continue;
    const l=(DB.OfferLoad||[]).find(x=>x.offer_id===o.id)||{weekly_practice:0,weekly_theory:0,total_hours:0};
    const links=(DB.OfferTeacher||[]).filter(ot=>ot.offer_id===o.id);
    const semTotal=(l.weekly_practice||0)+(l.weekly_theory||0)||1;
    if(!links.length){
      rows.push({Periodo:periodLabel,Externa:'NÃO',Curso:getCourse(o.course_id),Componente:getComp(o.component_id),Docente:'—',
        Creditos_h_sem:(l.weekly_practice||0)+(l.weekly_theory||0),CH_Total:l.total_hours||0});
    }else{
      for(const ot of links){
        const w=(ot.weekly_practice||0)+(ot.weekly_theory||0);
        const part=(w>0)?Math.round((l.total_hours||0)*(w/semTotal)):(l.total_hours||0);
        rows.push({Periodo:periodLabel,Externa:'NÃO',Curso:getCourse(o.course_id),Componente:getComp(o.component_id),Docente:getTeach(ot.teacher_id),
          Creditos_h_sem:w||((l.weekly_practice||0)+(l.weekly_theory||0)),CH_Total:part});
      }
    }
  }
  // externas
  for(const x of (DB.ExternalDemand||[])){
    if(x.period_id!==per.id) continue;
    const l=(DB.ExternalDemandLoad||[]).find(z=>z.external_demand_id===x.id)||{weekly_practice:0,weekly_theory:0,total_hours:0};
    const assigns=(DB.ExternalDemandAssignee||[]).filter(a=>a.external_demand_id===x.id);
    if(!assigns.length){
      rows.push({Periodo:periodLabel,Externa:'SIM',Curso:getCourse(x.demanding_course_id),Componente:getComp(x.component_id),Docente:'—',
        Creditos_h_sem:(l.weekly_practice||0)+(l.weekly_theory||0),CH_Total:l.total_hours||0});
    }else{
      for(const a of assigns){
        rows.push({Periodo:periodLabel,Externa:'SIM',Curso:getCourse(x.demanding_course_id),Componente:getComp(x.component_id),Docente:getTeach(a.teacher_id),
          Creditos_h_sem:(l.weekly_practice||0)+(l.weekly_theory||0),CH_Total:l.total_hours||0});
      }
    }
  }
  rows.sort((a,b)=> a.Docente.localeCompare(b.Docente,'pt-BR') || a.Curso.localeCompare(b.Curso,'pt-BR'));
  return rows;
}
function tableHTML(rows){
  if(!rows?.length) return '<div class="muted">Sem dados</div>';
  const H=Object.keys(rows[0]);
  const thead=`<thead><tr>${H.map(h=>`<th>${h}</th>`).join('')}</tr></thead>`;
  const tbody=`<tbody>${rows.map(r=>`<tr>${H.map(h=>`<td data-label="${h}">${r[h]??''}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<div class="soft" style="overflow:auto"><table class="table">${thead}${tbody}</table></div>`;
}

// ---------- VIEWS ----------
const Views = {
  // DASH
  dashboard(root){
    const periods=DB.list('periods')||[], courses=DB.list('courses')||[], comps=DB.list('components')||[], teachers=DB.list('teachers')||[], offers=DB.list('offers')||[];
    const totalCH = offers.reduce((s,r)=> s+(Number(r.ch_total)||0),0);
    const sumAdm  = (DB.sumCourseTotalHours && DB.sumCourseTotalHours('2026.1','Administração')) || 0;

    root.innerHTML = `
      <section class="card"><h3>Resumo</h3>
        <div class="chips">
          <span class="chip">Períodos: <strong>${periods.length}</strong></span>
          <span class="chip">Cursos: <strong>${courses.length}</strong></span>
          <span class="chip">Componentes: <strong>${comps.length}</strong></span>
          <span class="chip">Docentes: <strong>${teachers.length}</strong></span>
        </div>
        <div class="chips">
          <span class="chip">CH Total (internas): <strong>${totalCH}</strong></span>
          <span class="chip">Administração 2026.1: <strong>${sumAdm}</strong></span>
          <span class="chip">Ofertas internas: <strong>${offers.length}</strong></span>
        </div>
      </section>

      <section class="card">
        <h3>Componentes por Docente (2026.1)</h3>
        <div id="grid-subjects"></div>
        <div class="actions">
          <button id="subj-csv">CSV</button>
          <button id="subj-xlsx" class="ghost">XLSX</button>
        </div>
      </section>

      <section class="card">
        <h3>Distribuição por Docente — 2026.1</h3>
        <div id="grid-loads"></div>
        <div class="actions">
          <button id="loads-csv">CSV</button>
          <button id="loads-xlsx" class="ghost">XLSX</button>
        </div>
      </section>
    `;

    const subj = buildTeacherSubjects('2026.1');
    const gridSubj = new Grid($('#grid-subjects',root), {
      rows: subj,
      columns:[
        {key:'Periodo', label:'Período', sortable:true},
        {key:'Externa', label:'Externa?', sortable:true},
        {key:'Curso', label:'Curso', sortable:true},
        {key:'Componente', label:'Componente', sortable:true},
        {key:'Docente', label:'Docente', sortable:true},
        {key:'Creditos_h_sem', label:'Créditos (h/sem)', sortable:true},
        {key:'CH_Total', label:'CH Total', sortable:true}
      ],
      pageSize: 10, storageKey:'grid_subjects',
      footer:(rows)=> `<div class="chips">
        <span class="chip">Registros: <strong>${rows.length}</strong></span>
        <span class="chip">Σ CH: <strong>${rows.reduce((s,r)=>s+(Number(r.CH_Total)||0),0)}</strong></span>
      </div>`
    });
    $('#subj-csv',root).onclick  = ()=> downloadCSV('componentes_por_docente_2026_1.csv', gridSubj.pageRowsExport());
    $('#subj-xlsx',root).onclick = ()=> downloadBlob('componentes_por_docente_2026_1.xlsx', xlsxFromRows('Comp x Doc', gridSubj.pageRowsExport()));

    const loads = (DB.buildTeacherLoadTable && DB.buildTeacherLoadTable('2026.1')) || [];
    const gridLoads = new Grid($('#grid-loads',root), {
      rows: loads,
      columns:[
        {key:'N', label:'#', sortable:true},
        {key:'DOCENTE', label:'Docente', sortable:true},
        {key:'CPF', label:'CPF', sortable:true},
        {key:'AtividadeAdministrativaHoras', label:'CH Adm.', sortable:true},
        {key:'CargaHorariaDisponivelEnsino', label:'CH Disp. Ensino', sortable:true},
        {key:'CargaHorariaDestinadaDocente', label:'CH Destinada', sortable:true},
        {key:'Ensino_Weekly_Practice', label:'Créd. Prática', sortable:true},
        {key:'Ensino_Weekly_Theory', label:'Créd. Teoria', sortable:true},
        {key:'Ensino_TotalHoras', label:'CH Ensino Total', sortable:true}
      ],
      pageSize: 10, storageKey:'grid_loads'
    });
    $('#loads-csv',root).onclick  = ()=> downloadCSV('distribuicao_por_docente_2026_1.csv', gridLoads.pageRowsExport());
    $('#loads-xlsx',root).onclick = ()=> downloadBlob('distribuicao_por_docente_2026_1.xlsx', xlsxFromRows('Por Docente', gridLoads.pageRowsExport()));
  },

  // DOCENTES (Consulta + Cadastro)
  teachers(root){
    root.innerHTML = `
      <section class="card">
        <h2>Docentes</h2>
        <div class="chips" id="tabs-teachers">
          <button class="nav-btn" data-tab="list" aria-current="page">Consulta</button>
          <button class="nav-btn" data-tab="form">Cadastro</button>
        </div>
        <div id="teachers-body"></div>
      </section>`;
    const body = $('#teachers-body',root);

    function viewList(){
      const rows = (DB.Teacher||[]).map((t,i)=>({i:i+1, id:t.id, nome:t.nome, cpf:t.cpf||'', email:t.email||''}));
      body.innerHTML = `
        <div class="toolbar">
          <input id="q-teacher" placeholder="buscar por nome/CPF/email" />
          <button id="btn-new" class="primary">Novo Docente</button>
        </div>
        <table class="table" id="tbl">
          <thead><tr><th>#</th><th>Nome</th><th>CPF</th><th>Email</th><th>Ações</th></tr></thead>
          <tbody>
            ${rows.map(r=>`
            <tr data-id="${r.id}">
              <td data-label="#">${r.i}</td>
              <td data-label="Nome">${r.nome}</td>
              <td data-label="CPF">${r.cpf}</td>
              <td data-label="Email">${r.email}</td>
              <td data-label="Ações">
                <button class="edit">Editar</button>
                <button class="del danger">Excluir</button>
              </td>
            </tr>`).join('')}
          </tbody></table>`;
      $('#q-teacher',body).oninput=(ev)=>{
        const q=ev.target.value.toLowerCase();
        body.querySelectorAll('#tbl tbody tr').forEach(tr=> tr.style.display = tr.textContent.toLowerCase().includes(q)?'':'none');
      };
      $('#btn-new',body).onclick=()=> activate('form',{mode:'new'});
      body.querySelectorAll('#tbl .del').forEach(b=> b.onclick=(ev)=>{
        const id=ev.target.closest('tr').dataset.id;
        const idx=(DB.Teacher||[]).findIndex(x=>x.id===id);
        if(idx>=0 && confirm('Excluir docente?')){ DB.Teacher.splice(idx,1); viewList(); }
      });
      body.querySelectorAll('#tbl .edit').forEach(b=> b.onclick=(ev)=>{
        const id=ev.target.closest('tr').dataset.id;
        const t=(DB.Teacher||[]).find(x=>x.id===id);
        activate('form',{mode:'edit',data:t});
      });
    }
    function viewForm(ctx){
      const isEdit=ctx?.mode==='edit'; const t=isEdit?ctx.data:{nome:'',cpf:'',email:''};
      body.innerHTML=`
        <form id="f" class="grid" style="gap:12px; max-width:680px">
          <label>Nome <input name="nome" required value="${t?.nome??''}"></label>
          <label>CPF <input name="cpf" value="${t?.cpf??''}"></label>
          <label>Email <input name="email" type="email" value="${t?.email??''}"></label>
          <div class="actions">
            <button type="button" id="cancel">Voltar</button>
            ${isEdit?'<button type="button" id="del" class="danger">Excluir</button>':''}
            <button type="submit" class="primary">Salvar</button>
          </div>
        </form>`;
      $('#cancel',body).onclick=()=> activate('list');
      $('#del',body)?.addEventListener('click',()=>{
        if(confirm('Excluir docente?')){
          const idx=DB.Teacher.findIndex(x=>x.id===t.id);
          if(idx>=0) DB.Teacher.splice(idx,1);
          activate('list');
        }
      });
      $('#f',body).onsubmit=(ev)=>{
        ev.preventDefault(); const fd=new FormData(ev.target);
        if(isEdit){ t.nome=fd.get('nome'); t.cpf=fd.get('cpf'); t.email=fd.get('email'); }
        else{ DB.addTeacher(fd.get('nome'), fd.get('cpf'), fd.get('email')); }
        activate('list');
      };
    }
    function mark(tab){ $$('#tabs-teachers .nav-btn',root).forEach(b=>b.removeAttribute('aria-current')); $(`#tabs-teachers .nav-btn[data-tab="${tab}"]`,root)?.setAttribute('aria-current','page'); }
    function activate(tab,ctx){ mark(tab); if(tab==='list') viewList(); if(tab==='form') viewForm(ctx); }
    $('#tabs-teachers',root).onclick=(e)=>{ const b=e.target.closest('.nav-btn'); if(!b) return; activate(b.dataset.tab); };
    activate('list');
  },

  // COMPONENTES (Consulta + Cadastro)
  components(root){
    root.innerHTML=`
      <section class="card">
        <h2>Componentes</h2>
        <div class="chips" id="tabs-components">
          <button class="nav-btn" data-tab="list" aria-current="page">Consulta</button>
          <button class="nav-btn" data-tab="form">Cadastro</button>
        </div>
        <div id="components-body"></div>
      </section>`;
    const body=$('#components-body',root);
    const cursos=DB.Course||[];
    const courseName=id=>(DB.Course||[]).find(c=>c.id===id)?.nome||'—';

    function viewList(){
      const rows=(DB.ComponentT||[]).map((c,i)=>({i:i+1,id:c.id,codigo:c.codigo||'',nome:c.nome||'',curso:courseName(c.curso_id)}));
      body.innerHTML=`
        <div class="toolbar">
          <input id="q" placeholder="buscar por código/nome/curso"/>
          <button id="btn-new" class="primary">Novo Componente</button>
        </div>
        <table class="table" id="tbl">
          <thead><tr><th>#</th><th>Código</th><th>Nome</th><th>Curso</th><th>Ações</th></tr></thead>
          <tbody>
            ${rows.map(r=>`
              <tr data-id="${r.id}">
                <td data-label="#">${r.i}</td>
                <td data-label="Código">${r.codigo}</td>
                <td data-label="Nome">${r.nome}</td>
                <td data-label="Curso">${r.curso}</td>
                <td data-label="Ações">
                  <button class="edit">Editar</button>
                  <button class="del danger">Excluir</button>
                </td>
              </tr>`).join('')}
          </tbody></table>`;
      $('#q',body).oninput=(ev)=>{
        const q=ev.target.value.toLowerCase();
        body.querySelectorAll('#tbl tbody tr').forEach(tr=> tr.style.display = tr.textContent.toLowerCase().includes(q)?'':'none');
      };
      $('#btn-new',body).onclick=()=> activate('form',{mode:'new'});
      body.querySelectorAll('#tbl .del').forEach(b=> b.onclick=(ev)=>{
        const id=ev.target.closest('tr').dataset.id;
        const idx=(DB.ComponentT||[]).findIndex(x=>x.id===id);
        if(idx>=0 && confirm('Excluir componente?')){ DB.ComponentT.splice(idx,1); viewList(); }
      });
      body.querySelectorAll('#tbl .edit').forEach(b=> b.onclick=(ev)=>{
        const id=ev.target.closest('tr').dataset.id;
        const c=(DB.ComponentT||[]).find(x=>x.id===id);
        activate('form',{mode:'edit',data:c});
      });
    }
    function viewForm(ctx){
      const isEdit=ctx?.mode==='edit'; const c=isEdit?ctx.data:{codigo:'',nome:'',curso_id:''};
      const opts=cursos.map(x=>`<option value="${x.id}">${x.nome}</option>`).join('');
      body.innerHTML=`
        <form id="f" class="grid" style="gap:12px; max-width:760px">
          <div class="form-row">
            <div class="col-4"><label>Código <input name="codigo" required value="${c?.codigo??''}"></label></div>
            <div class="col-8"><label>Nome <input name="nome" required value="${c?.nome??''}"></label></div>
            <div class="col-6">
              <label>Curso
                <select name="curso_id">
                  <option value="">—</option>${opts}
                </select>
              </label>
            </div>
          </div>
          <div class="actions">
            <button type="button" id="cancel">Voltar</button>
            ${isEdit?'<button type="button" id="del" class="danger">Excluir</button>':''}
            <button type="submit" class="primary">Salvar</button>
          </div>
        </form>`;
      if(isEdit && c.curso_id) $('#f [name="curso_id"]',body).value=c.curso_id;
      $('#cancel',body).onclick=()=> activate('list');
      $('#del',body)?.addEventListener('click',()=>{
        if(confirm('Excluir componente?')){
          const idx=DB.ComponentT.findIndex(x=>x.id===c.id); if(idx>=0) DB.ComponentT.splice(idx,1);
          activate('list');
        }
      });
      $('#f',body).onsubmit=(ev)=>{
        ev.preventDefault(); const fd=new FormData(ev.target);
        const payload={ codigo:fd.get('codigo'), nome:fd.get('nome'), curso_id:String(fd.get('curso_id')||'')||undefined };
        if(isEdit){ c.codigo=payload.codigo; c.nome=payload.nome; c.curso_id=payload.curso_id||undefined; }
        else{ DB.addComponent(payload.codigo, payload.nome, payload.curso_id||undefined); }
        activate('list');
      };
    }
    function mark(tab){ $$('#tabs-components .nav-btn',root).forEach(b=>b.removeAttribute('aria-current')); $(`#tabs-components .nav-btn[data-tab="${tab}"]`,root)?.setAttribute('aria-current','page'); }
    function activate(tab,ctx){ mark(tab); if(tab==='list') viewList(); if(tab==='form') viewForm(ctx); }
    $('#tabs-components',root).onclick=(e)=>{ const b=e.target.closest('.nav-btn'); if(!b) return; activate(b.dataset.tab); };
    activate('list');
  },

  // OFERTAS (Consulta + Cadastro + Atribuição de Docente inline)
  offers(root){
    root.innerHTML=`
      <section class="card">
        <h2>Ofertas</h2>
        <div class="chips" id="tabs-offers">
          <button class="nav-btn" data-tab="list" aria-current="page">Consulta</button>
          <button class="nav-btn" data-tab="form">Cadastro</button>
        </div>
        <div id="offers-body"></div>
      </section>`;
    const body=$('#offers-body',root);
    const periods=DB.Period||[], courses=DB.Course||[], comps=DB.ComponentT||[], teachers=DB.Teacher||[];
    const findName=(arr,id,field='nome')=> (arr||[]).find(x=>x.id===id)?.[field]||'—';
    const offerLoad=id=> (DB.OfferLoad||[]).find(l=>l.offer_id===id)||{weekly_practice:0,weekly_theory:0,total_hours:0};
    const offerTeacher=id=> (DB.OfferTeacher||[]).find(x=>x.offer_id===id)?.teacher_id || '';

    function viewList(){
      const offers=DB.Offer||[];
      body.innerHTML=`
        <div class="toolbar">
          <label>Período <select id="f-period"><option value="">Todos</option>${periods.map(p=>`<option value="${p.id}">${p.rotulo}</option>`)}</select></label>
          <label>Curso <select id="f-course"><option value="">Todos</option>${courses.map(c=>`<option value="${c.id}">${c.nome}</option>`)}</select></label>
          <input id="q" placeholder="buscar por componente/docente"/>
          <button id="btn-new" class="primary">Nova Oferta</button>
        </div>
        <table class="table" id="tbl">
          <thead><tr><th>#</th><th>Período</th><th>Curso</th><th>Componente</th><th>Créditos</th><th>CH Total</th><th>Docente</th><th>Ações</th></tr></thead>
          <tbody>
            ${offers.map((o,i)=>{ const l=offerLoad(o.id); const tid=offerTeacher(o.id);
              return `<tr data-id="${o.id}">
                <td data-label="#">${i+1}</td>
                <td data-label="Período">${findName(periods,o.period_id,'rotulo')}</td>
                <td data-label="Curso">${findName(courses,o.course_id)}</td>
                <td data-label="Componente">${findName(comps,o.component_id)}</td>
                <td data-label="Créditos">${(l.weekly_practice||0)+(l.weekly_theory||0)}</td>
                <td data-label="CH Total">${l.total_hours||0}</td>
                <td data-label="Docente">
                  <select class="sel-teacher">
                    <option value="">—</option>
                    ${teachers.map(t=>`<option value="${t.id}" ${t.id===tid?'selected':''}>${t.nome}</option>`).join('')}
                  </select>
                </td>
                <td data-label="Ações">
                  <button class="apply ok small">Aplicar</button>
                  <button class="edit">Editar</button>
                  <button class="del danger">Excluir</button>
                </td>
              </tr>`; }).join('')}
          </tbody></table>`;
      const fPer=$('#f-period',body), fCourse=$('#f-course',body), q=$('#q',body);
      function applyFilters(){
        $$('#tbl tbody tr',body).forEach(tr=>{
          const o=(DB.Offer||[]).find(x=>x.id===tr.dataset.id);
          let show=true;
          if(fPer.value) show=show&&(o.period_id===fPer.value);
          if(fCourse.value) show=show&&(o.course_id===fCourse.value);
          if(q.value){ const text=tr.textContent.toLowerCase(); show=show&&text.includes(q.value.toLowerCase()); }
          tr.style.display=show?'':'none';
        });
      }
      [fPer,fCourse,q].forEach(el=> el.addEventListener('input',applyFilters));
      $('#btn-new',body).onclick=()=> activate('form',{mode:'new'});
      $$('#tbl .del',body).forEach(b=> b.onclick=(ev)=>{
        const id=ev.target.closest('tr').dataset.id;
        const idx=(DB.Offer||[]).findIndex(x=>x.id===id);
        if(idx>=0 && confirm('Excluir oferta?')){
          DB.Offer.splice(idx,1);
          for(let i=(DB.OfferLoad||[]).length-1;i>=0;i--) if(DB.OfferLoad[i].offer_id===id) DB.OfferLoad.splice(i,1);
          for(let i=(DB.OfferTeacher||[]).length-1;i>=0;i--) if(DB.OfferTeacher[i].offer_id===id) DB.OfferTeacher.splice(i,1);
          viewList();
        }
      });
      $$('#tbl .edit',body).forEach(b=> b.onclick=(ev)=>{
        const id=ev.target.closest('tr').dataset.id;
        const o=(DB.Offer||[]).find(x=>x.id===id);
        const l=offerLoad(id);
        const t=(DB.OfferTeacher||[]).find(x=>x.offer_id===id)?.teacher_id || '';
        activate('form',{mode:'edit',data:{...o,...l,teacher_id:t}});
      });
      $$('#tbl .apply',body).forEach(b=> b.onclick=(ev)=>{
        const tr=ev.target.closest('tr'); const offerId=tr.dataset.id;
        const teacherId=tr.querySelector('.sel-teacher').value||null;
        for(let i=(DB.OfferTeacher||[]).length-1;i>=0;i--) if(DB.OfferTeacher[i].offer_id===offerId) DB.OfferTeacher.splice(i,1);
        if(teacherId) DB.addOfferTeacher(offerId, teacherId, 'Responsável');
        toast('Atribuição aplicada');
      });
    }

    function viewForm(ctx){
      const isEdit=ctx?.mode==='edit';
      const o=isEdit?ctx.data:{period_id:'',course_id:'',component_id:'',weekly_practice:0,weekly_theory:0,total_hours:0,teacher_id:''};
      const periodsOpt=periods.map(p=>`<option value="${p.id}">${p.rotulo}</option>`).join('');
      const coursesOpt=courses.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
      const compsOpt  =comps.map(c=>`<option value="${c.id}">${c.nome}</option>`).join('');
      const teachOpt  =`<option value="">—</option>`+teachers.map(t=>`<option value="${t.id}">${t.nome}</option>`).join('');
      body.innerHTML=`
        <form id="f" class="grid" style="gap:12px; max-width:820px">
          <div class="form-row">
            <div class="col-4"><label>Período <select name="period_id" required>${periodsOpt}</select></label></div>
            <div class="col-4"><label>Curso <select name="course_id" required>${coursesOpt}</select></label></div>
            <div class="col-4"><label>Componente <select name="component_id" required>${compsOpt}</select></label></div>
            <div class="col-4"><label>Prática semanal <input name="wp" type="number" min="0" value="${o.weekly_practice||0}"></label></div>
            <div class="col-4"><label>Teórica semanal <input name="wt" type="number" min="0" value="${o.weekly_theory||0}"></label></div>
            <div class="col-4"><label>Total de horas <input name="th" type="number" min="0" value="${o.total_hours||0}"></label></div>
            <div class="col-6"><label>Docente <select name="teacher_id">${teachOpt}</select></label></div>
          </div>
          <div class="actions">
            <button type="button" id="cancel">Voltar</button>
            ${isEdit?'<button type="button" id="del" class="danger">Excluir</button>':''}
            <button type="submit" class="primary">${isEdit?'Salvar':'Adicionar'}</button>
          </div>
        </form>`;
      const f=$('#f',body);
      f.period_id.value=o.period_id||''; f.course_id.value=o.course_id||''; f.component_id.value=o.component_id||''; f.teacher_id.value=o.teacher_id||'';
      $('#cancel',body).onclick=()=> activate('list');
      $('#del',body)?.addEventListener('click',()=>{
        if(confirm('Excluir oferta?')){
          const id=o.id; const idx=DB.Offer.findIndex(x=>x.id===id); if(idx>=0) DB.Offer.splice(idx,1);
          for(let i=(DB.OfferLoad||[]).length-1;i>=0;i--) if(DB.OfferLoad[i].offer_id===id) DB.OfferLoad.splice(i,1);
          for(let i=(DB.OfferTeacher||[]).length-1;i>=0;i--) if(DB.OfferTeacher[i].offer_id===id) DB.OfferTeacher.splice(i,1);
          activate('list');
        }
      });
      f.onsubmit=(ev)=>{
        ev.preventDefault();
        const fd=new FormData(f);
        const pid=fd.get('period_id'), cid=fd.get('course_id'), cmp=fd.get('component_id');
        const wp=Number(fd.get('wp')||0), wt=Number(fd.get('wt')||0), th=Number(fd.get('th')||0)|| (wp+wt)*20;
        const tid=fd.get('teacher_id')||'';
        if(isEdit){
          const off=DB.Offer.find(x=>x.id===o.id); off.period_id=pid; off.course_id=cid; off.component_id=cmp;
          const l=DB.OfferLoad.find(x=>x.offer_id===o.id); if(l){ l.weekly_practice=wp; l.weekly_theory=wt; l.total_hours=th; } else { DB.addOfferLoad(o.id,wp,wt,th); }
          for(let i=(DB.OfferTeacher||[]).length-1;i>=0;i--) if(DB.OfferTeacher[i].offer_id===o.id) DB.OfferTeacher.splice(i,1);
          if(tid) DB.addOfferTeacher(o.id, tid, 'Responsável');
        }else{
          const off=DB.addOffer(pid,cid,cmp); DB.addOfferLoad(off.id,wp,wt,th); if(tid) DB.addOfferTeacher(off.id, tid, 'Responsável');
        }
        activate('list');
      };
    }

    function mark(tab){ $$('#tabs-offers .nav-btn',root).forEach(b=>b.removeAttribute('aria-current')); $(`#tabs-offers .nav-btn[data-tab="${tab}"]`,root)?.setAttribute('aria-current','page'); }
    function activate(tab,ctx){ mark(tab); if(tab==='list') viewList(); if(tab==='form') viewForm(ctx); }
    $('#tabs-offers',root).onclick=(e)=>{ const b=e.target.closest('.nav-btn'); if(!b) return; activate(b.dataset.tab); };
    activate('list');
  },

  // ALOCAÇÕES (somente leitura)
  allocations(root){
    const A=(DB.buildTeacherLoadTable&&DB.buildTeacherLoadTable('2026.1'))||[];
    const B=buildTeacherSubjects('2026.1');
    root.innerHTML = `
      <section class="card"><h3>Alocações — Quadro por Docente</h3><div id="gridA"></div></section>
      <section class="card"><h3>Alocações — Componentes x Docente</h3><div id="gridB"></div></section>`;
    new Grid($('#gridA',root),{
      rows:A,
      columns:[
        {key:'DOCENTE', label:'Docente', sortable:true},
        {key:'AtividadeAdministrativaHoras', label:'CH Adm.', sortable:true},
        {key:'CargaHorariaDisponivelEnsino', label:'CH Disp. Ensino', sortable:true},
        {key:'CargaHorariaDestinadaDocente', label:'CH Destinada', sortable:true},
        {key:'Ensino_Weekly_Practice', label:'Créd. Prática', sortable:true},
        {key:'Ensino_Weekly_Theory', label:'Créd. Teoria', sortable:true},
        {key:'Ensino_TotalHoras', label:'CH Ensino Total', sortable:true}
      ],
      pageSize: 10
    });
    new Grid($('#gridB',root),{
      rows:B,
      columns:[
        {key:'Periodo', label:'Período', sortable:true},
        {key:'Externa', label:'Externa?', sortable:true},
        {key:'Curso', label:'Curso', sortable:true},
        {key:'Componente', label:'Componente', sortable:true},
        {key:'Docente', label:'Docente', sortable:true},
        {key:'Creditos_h_sem', label:'Créditos (h/sem)', sortable:true},
        {key:'CH_Total', label:'CH Total', sortable:true}
      ],
      pageSize: 10
    });
  },

  // RELATÓRIOS simples (CH por período)
  reports(root){
    root.innerHTML = `<section class="card"><h3>Relatórios</h3><div id="box"></div></section>`;
    const periods=DB.list('periods'), offers=DB.list('offers');
    const map={};
    offers.forEach(o=>{
      const key=o.periodo_id;
      map[key]=map[key]||{periodo_id:o.periodo_id,ch_total:0,ch_t:0,ch_p:0,qtd:0};
      map[key].ch_total += Number(o.ch_total)||0;
      map[key].ch_t += (Number(o.ch_teorica)||0)*20;
      map[key].ch_p += (Number(o.ch_pratica)||0)*20;
      map[key].qtd++;
    });
    const rowsA=Object.values(map).map(r=>({
      Periodo: periods.find(p=>p.id===r.periodo_id)?.rotulo || '—',
      QtdOfertas:r.qtd, CH_Teorica:r.ch_t, CH_Pratica:r.ch_p, CH_Total:r.ch_total
    }));
    const box=$('#box',root);
    box.innerHTML = `
      <div class="chips">
        <button id="a-csv" class="ghost">CH por período (CSV)</button>
        <button id="a-xlsx" class="ghost">CH por período (XLSX)</button>
      </div>
      ${tableHTML(rowsA)}
    `;
    $('#a-csv',root).onclick = ()=> downloadCSV('rel_ch_por_periodo.csv', rowsA);
    $('#a-xlsx',root).onclick= ()=> downloadBlob('rel_ch_por_periodo.xlsx', xlsxFromRows('CH por período', rowsA));
  }
};

// ---------- roteamento e header ----------
function setActive(view){
  $$('#main-nav .nav-btn').forEach(b=> b.removeAttribute('aria-current'));
  const btn = $(`#main-nav .nav-btn[data-view="${view}"]`); if(btn) btn.setAttribute('aria-current','page');
}
function render(view){ (Views[view]||Views.dashboard)(document.getElementById('app')); setActive(view); }
document.addEventListener('click',(ev)=>{
  const btn=ev.target.closest('button'); if(!btn) return;
  const v=btn.dataset.view; if(v){ render(v); }
  if(btn.dataset.action==='export-teacher-csv'){
    const rows=(DB.list('teachers')||[]).map((t,i)=>({N:i+1, Docente:t.nome, CPF:t.cpf||'', Email:t.email||''}));
    downloadCSV('docentes.csv', rows);
  }
});

// ---------- tema ----------
(function initTheme(){
  const key='cambrussi_theme';
  const stored=localStorage.getItem(key);
  if(stored){ document.body.classList.toggle('theme-dark', stored==='dark'); }
  const btn=$('#btn-theme');
  if(btn){
    btn.onclick=()=>{
      document.body.classList.toggle('theme-dark');
      localStorage.setItem(key, document.body.classList.contains('theme-dark')?'dark':'light');
    };
  }
})();

// ---------- boot (espera DB) ----------
function boot(){
  try{
    if(!window.DB || typeof DB.list!=='function') throw new Error('DB não disponível ainda');
    render('dashboard');
    console.log('Cambrussi: app iniciado.');
  }catch(e){
    console.warn('Aguardando DB...', e.message);
    setTimeout(boot, 80);
  }
}
window.addEventListener('DOMContentLoaded', boot);
