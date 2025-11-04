// db-browser.js — Banco relacional (normalizado) + seed 2026.1 + consultas + compat layer

/**************
 * Tipos (JSDoc)
 **************/
/**
 * @typedef {{ id:string, ano:number, rotulo:string }} Period
 * @typedef {{ id:string, nome:string }} Course
 * @typedef {{ id:string, codigo:string, nome:string, curso_id?:string }} Component
 * @typedef {{ id:string, nome:string, cpf?:string, email?:string }} Teacher
 * @typedef {{ id:string, isNew:boolean, link?:string }} MoodleRoom
 * @typedef {{ id:string, rotulo:string }} EaDTag
 *
 * @typedef {{ id:string, period_id:string, course_id:string, component_id:string }} Offer
 * @typedef {{ offer_id:string, weekly_practice:number, weekly_theory:number, total_hours:number }} OfferLoad
 * @typedef {{ offer_id:string, moodle_room_id:string }} OfferRoom
 * @typedef {{ offer_id:string, eadtag_id:string }} OfferEaD
 * @typedef {{ offer_id:string, teacher_id:string, role?:string, weekly_practice?:number, weekly_theory?:number }} OfferTeacher
 *
 * @typedef {{ id:string, period_id:string, demanding_course_id:string, component_id:string }} ExternalDemand
 * @typedef {{ external_demand_id:string, weekly_practice:number, weekly_theory:number, total_hours:number }} ExternalDemandLoad
 * @typedef {{ external_demand_id:string, teacher_id:string }} ExternalDemandAssignee
 * @typedef {{ external_demand_id:string, moodle_room_id:string }} ExternalDemandRoom
 * @typedef {{ external_demand_id:string, eadtag_id:string }} ExternalDemandEaD
 *
 * @typedef {{ id:string, nome:string }} AdminActivity
 * @typedef {{ teacher_id:string, period_id:string, admin_activity_id:string, hours:number }} TeacherAdminAssignment
 * @typedef {{ teacher_id:string, period_id:string, available_teaching_hours:number, destined_teaching_hours:number }} TeacherCapacity
 */

/**************
 * "Tabelas"
 **************/
const Period = /** @type {Period[]} */ ([]);
const Course = /** @type {Course[]} */ ([]);
const ComponentT = /** @type {Component[]} */ ([]);
const Teacher = /** @type {Teacher[]} */ ([]);
const MoodleRoom = /** @type {MoodleRoom[]} */ ([]);
const EaDTag = /** @type {EaDTag[]} */ ([ { id: "ead1", rotulo: "NUTEAD" } ]);

const Offer = /** @type {Offer[]} */ ([]);
const OfferLoad = /** @type {OfferLoad[]} */ ([]);
const OfferRoom = /** @type {OfferRoom[]} */ ([]);
const OfferTeacher = /** @type {OfferTeacher[]} */ ([]);
const OfferEaD = /** @type {OfferEaD[]} */ ([]);

const ExternalDemand = /** @type {ExternalDemand[]} */ ([]);
const ExternalDemandLoad = /** @type {ExternalDemandLoad[]} */ ([]);
const ExternalDemandAssignee = /** @type {ExternalDemandAssignee[]} */ ([]);
const ExternalDemandRoom = /** @type {ExternalDemandRoom[]} */ ([]);
const ExternalDemandEaD = /** @type {ExternalDemandEaD[]} */ ([]);

const AdminActivity = /** @type {AdminActivity[]} */ ([]);
const TeacherAdminAssignment = /** @type {TeacherAdminAssignment[]} */ ([]);
const TeacherCapacity = /** @type {TeacherCapacity[]} */ ([]);

/**************
 * Helpers
 **************/
const id = (p) => p + "_" + Math.random().toString(36).slice(2, 9);
const byId = (tbl, idv)=> tbl.find(x => x.id === idv);
function requireFK(tbl, idv, name){ if(!byId(tbl, idv)) throw new Error(`FK inválida: ${name}=${idv}`); }

/**************
 * Inserções com checagem de FK
 **************/
function addPeriod(ano, rotulo){ const rec={ id:id('per'), ano, rotulo }; Period.push(rec); return rec; }
function addCourse(nome){ const rec={ id:id('c'), nome }; Course.push(rec); return rec; }
function addComponent(codigo, nome, curso_id){ const rec={ id:id('cmp'), codigo, nome, curso_id }; ComponentT.push(rec); return rec; }
function addTeacher(nome, cpf, email){ const rec={ id:id('t'), nome, cpf, email }; Teacher.push(rec); return rec; }
function addMoodleRoom(isNew, link){ const rec={ id:id('room'), isNew, link }; MoodleRoom.push(rec); return rec; }

function addOffer(period_id, course_id, component_id){
  requireFK(Period, period_id, 'period_id'); requireFK(Course, course_id, 'course_id'); requireFK(ComponentT, component_id, 'component_id');
  const rec={ id:id('off'), period_id, course_id, component_id }; Offer.push(rec); return rec;
}
function addOfferLoad(offer_id, weekly_practice, weekly_theory, total_hours){
  requireFK(Offer, offer_id, 'offer_id');
  const rec={ offer_id, weekly_practice, weekly_theory, total_hours }; OfferLoad.push(rec); return rec;
}
function addOfferTeacher(offer_id, teacher_id, role, weekly_practice, weekly_theory){
  requireFK(Offer, offer_id, 'offer_id'); requireFK(Teacher, teacher_id, 'teacher_id');
  const rec={ offer_id, teacher_id, role, weekly_practice, weekly_theory }; OfferTeacher.push(rec); return rec;
}
function linkOfferRoom(offer_id, moodle_room_id){ requireFK(Offer, offer_id, 'offer_id'); requireFK(MoodleRoom, moodle_room_id, 'moodle_room_id'); OfferRoom.push({offer_id, moodle_room_id}); }
function tagOfferEaD(offer_id, eadtag_id){ requireFK(Offer, offer_id, 'offer_id'); requireFK(EaDTag, eadtag_id, 'eadtag_id'); OfferEaD.push({offer_id, eadtag_id}); }

function addExternalDemand(period_id, demanding_course_id, component_id){
  requireFK(Period, period_id, 'period_id'); requireFK(Course, demanding_course_id, 'demanding_course_id'); requireFK(ComponentT, component_id, 'component_id');
  const rec={ id:id('xdm'), period_id, demanding_course_id, component_id }; ExternalDemand.push(rec); return rec;
}
function addExternalDemandLoad(external_demand_id, weekly_practice, weekly_theory, total_hours){
  ExternalDemandLoad.push({ external_demand_id, weekly_practice, weekly_theory, total_hours });
}
function assignExternalDemandTeacher(external_demand_id, teacher_id){
  requireFK(Teacher, teacher_id, 'teacher_id'); ExternalDemandAssignee.push({ external_demand_id, teacher_id });
}
function linkExternalDemandRoom(external_demand_id, moodle_room_id){ ExternalDemandRoom.push({ external_demand_id, moodle_room_id }); }
function tagExternalDemandEaD(external_demand_id, eadtag_id){ ExternalDemandEaD.push({ external_demand_id, eadtag_id }); }

function addAdminActivity(nome){ const rec={ id:id('adm'), nome }; AdminActivity.push(rec); return rec; }
function setTeacherAdminAssignment(teacher_id, period_id, admin_activity_id, hours){
  requireFK(Teacher, teacher_id, 'teacher_id'); requireFK(Period, period_id, 'period_id'); requireFK(AdminActivity, admin_activity_id, 'admin_activity_id');
  TeacherAdminAssignment.push({ teacher_id, period_id, admin_activity_id, hours });
}
function setTeacherCapacity(teacher_id, period_id, available_teaching_hours, destined_teaching_hours){
  requireFK(Teacher, teacher_id, 'teacher_id'); requireFK(Period, period_id, 'period_id');
  TeacherCapacity.push({ teacher_id, period_id, available_teaching_hours, destined_teaching_hours });
}

/**************
 * Consultas
 **************/
function sumCourseTotalHours(periodLabel, courseName){
  const per = Period.find(p => p.rotulo === periodLabel);
  const course = Course.find(c => c.nome === courseName);
  if(!per || !course) return 0;
  const offers = Offer.filter(o => o.period_id === per.id && o.course_id === course.id);
  return offers.reduce((acc, o)=>{
    const l = OfferLoad.find(x=>x.offer_id===o.id);
    return acc + (l? l.total_hours : 0);
  },0);
}

function buildTeacherLoadTable(periodLabel){
  const per = Period.find(p => p.rotulo === periodLabel);
  if(!per) return [];
  // ensino (interno)
  const teachingByTeacher = {};
  Offer.forEach(o=>{
    if(o.period_id !== per.id) return;
    const l = OfferLoad.find(z=>z.offer_id===o.id) || {weekly_practice:0,weekly_theory:0,total_hours:0};
    const links = OfferTeacher.filter(ot=>ot.offer_id===o.id);
    if(links.length===0) return;
    links.forEach(ot=>{
      const key = ot.teacher_id;
      if(!teachingByTeacher[key]) teachingByTeacher[key] = { weekly_p:0, weekly_t:0, total:0 };
      if(typeof ot.weekly_practice==='number' || typeof ot.weekly_theory==='number'){
        teachingByTeacher[key].weekly_p += (ot.weekly_practice||0);
        teachingByTeacher[key].weekly_t += (ot.weekly_theory||0);
        const semTotal = (l.weekly_practice + l.weekly_theory) || 1;
        const thisWeekly = (ot.weekly_practice||0) + (ot.weekly_theory||0);
        teachingByTeacher[key].total += Math.round(l.total_hours * (thisWeekly/semTotal));
      }else{
        teachingByTeacher[key].total += l.total_hours;
      }
    });
  });
  // ensino (demandas externas)
  ExternalDemand.forEach(x=>{
    if(x.period_id !== per.id) return;
    const l = ExternalDemandLoad.find(z=>z.external_demand_id===x.id);
    const assigns = ExternalDemandAssignee.filter(a=>a.external_demand_id===x.id);
    if(!l || !assigns.length) return;
    assigns.forEach(a=>{
      const key = a.teacher_id;
      if(!teachingByTeacher[key]) teachingByTeacher[key] = { weekly_p:0, weekly_t:0, total:0 };
      teachingByTeacher[key].weekly_p += l.weekly_practice;
      teachingByTeacher[key].weekly_t += l.weekly_theory;
      teachingByTeacher[key].total += l.total_hours;
    });
  });
  // horas adm e capacidades
  const adminByTeacher = {};
  TeacherAdminAssignment.forEach(ta=>{ if(ta.period_id===per.id){ adminByTeacher[ta.teacher_id]=(adminByTeacher[ta.teacher_id]||0)+ta.hours; }});
  const capacityByTeacher = {};
  TeacherCapacity.forEach(tc=>{ if(tc.period_id===per.id){ capacityByTeacher[tc.teacher_id]={ avail:tc.available_teaching_hours, dest:tc.destined_teaching_hours }; }});
  // linhas
  return Teacher.map((t, idx)=>{
    const teach = teachingByTeacher[t.id] || {weekly_p:0,weekly_t:0,total:0};
    const admin = adminByTeacher[t.id] || 0;
    const cap = capacityByTeacher[t.id] || {avail:undefined, dest:undefined};
    return {
      N: idx+1,
      DOCENTE: t.nome,
      CPF: t.cpf||'',
      AtividadeAdministrativaHoras: admin,
      CargaHorariaDisponivelEnsino: cap.avail,
      CargaHorariaDestinadaDocente: cap.dest,
      Ensino_Weekly_Practice: teach.weekly_p,
      Ensino_Weekly_Theory: teach.weekly_t,
      Ensino_TotalHoras: teach.total
    };
  });
}

// CSV simples
function toCSV(rows){
  if(!rows || !rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v)=> {
    const s = (v===undefined||v===null) ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  return [ headers.join(";"), ...rows.map(r=> headers.map(h=>esc(r[h])).join(";")) ].join("\n");
}

/**************
 * SEED 2026.1 — com TODAS as linhas que você enviou
 **************/
(function seed(){
  const p2026_1 = addPeriod(2026, '2026.1');

  // cursos
  const cAdm = addCourse('Administração');
  const cCCont = addCourse('Ciências Contábeis');
  const cAgro = addCourse('Agronomia');
  const cDir  = addCourse('Direito');
  const cTI   = addCourse('Técnico Informática para Internet');
  const cEspCtrl = addCourse('Especialização em Controladoria');
  const cEspSust = addCourse('Especialização Interdisciplinar em Sustentabilidade');

  // docentes
  const tSchlemper = addTeacher('Alexandre Luiz Schlemper');
  const tMilk      = addTeacher('Alexandre Milkiewicz Sanches');
  const tMichelin  = addTeacher('Anderson Luiz Michelin');
  const tAndrieli  = addTeacher('Andrieli Diniz Vizzoto');
  const tBruno     = addTeacher('Bruno Roberto Dammski');
  const tEdson     = addTeacher('Edson José Argenta');
  const tEveraldo  = addTeacher('Everaldo Souza');
  const tLeandro   = addTeacher('Leandro Santos Cambrussi');
  const tPSS       = addTeacher('PSS');

  // componentes (do próprio curso)
  const cmpMktI   = addComponent('BACHARELADO.0068','MARKETING I', cAdm.id);
  const cmpSocio  = addComponent('BACHARELADO.0074','SOCIOLOGIA APLICADA À ADMINISTRAÇÃO', cAdm.id);
  const cmpTeoAdm = addComponent('BACHARELADO.0066','TEORIA DA ADMINISTRAÇÃO I', cAdm.id);
  const cmpInfo   = addComponent('INFO','Informática', cAdm.id);
  const cmpCustos = addComponent('BACHARELADO.0097','ADMINISTRAÇÃO DE CUSTOS', cAdm.id);
  const cmpEtica  = addComponent('BACHARELADO.0105','ÉTICA NAS ORGANIZAÇÕES', cAdm.id);
  const cmpGPRT   = addComponent('BACHARELADO.0098','GESTÃO DE PESSOAS E RELAÇÕES DE TRABALHO', cAdm.id);
  const cmpProdII = addComponent('BACHARELADO.0122','ADMINISTRAÇÃO DA PRODUÇÃO II', cAdm.id);
  const cmpFinI   = addComponent('BACHARELADO.0124','ADMINISTRAÇÃO FINANCEIRA I', cAdm.id);
  const cmpEstCamp= addComponent('BACHARELADO.0119','ESTÁGIO SUPERVISIONADO DE CAMPO I', cAdm.id);
  const cmpEstI   = addComponent('BACHARELADO.0120','ESTÁGIO SUPERVISIONADO I', cAdm.id);
  const cmpProdC  = addComponent('BACHARELADO.0128','PRODUÇÃO CIENTÍFICA I', cAdm.id);
  const cmpSimI   = addComponent('BACHARELADO.0126','SIMULAÇÃO GERENCIAL I', cAdm.id);
  const cmpNPA    = addComponent('BACHARELADO.0186','NÚCLEO DE PRÁTICAS EM ADMINISTRAÇÃO I', cAdm.id);
  const cmpExtII  = addComponent('BACHARELADO.0155','EXTENSÃO COMUNITÁRIA II', cAdm.id);
  const cmpGCSII  = addComponent('BACHARELADO.0145','GESTÃO DA CADEIA DE SUPRIMENTOS II', cAdm.id);
  const cmpLider  = addComponent('BACHARELADO.0149','LIDERANÇA E GESTÃO DE EQUIPES', cAdm.id);
  const cmpNegInt = addComponent('BACHARELADO.0147','NEGÓCIOS INTERNACIONAIS', cAdm.id);
  const cmpPO     = addComponent('BACHARELADO.0151','PESQUISA OPERACIONAL', cAdm.id);
  const cmpProjCom= addComponent('BACHARELADO.0154','PROJETOS COMUNITÁRIOS I', cAdm.id);
  const cmpTCC1   = addComponent('BACHARELADO.0152','TCC I', cAdm.id);

  // Ofertas internas (períodos indicados na sua tabela: 1,3,5,7 — todas registradas no mesmo Period "2026.1")
  // P1
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpMktI.id);     addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tSchlemper.id,'Resp',0,4); tagOfferEaD(o.id,EaDTag[0].id);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpSocio.id);    addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tAndrieli.id,'Resp',0,2);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpTeoAdm.id);   addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tMichelin.id,'Resp',0,4);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpInfo.id);     addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tLeandro.id,'Resp',0,2);
  })();
  // P3
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpCustos.id);   addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tMilk.id,'Resp',0,4); tagOfferEaD(o.id,EaDTag[0].id);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpEtica.id);    addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tLeandro.id,'Resp',0,2);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpGPRT.id);     addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tMichelin.id,'Resp',0,4);
  })();
  // P5
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpProdII.id);   addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tMilk.id,'Resp',0,4); tagOfferEaD(o.id,EaDTag[0].id);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpFinI.id);     addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tEveraldo.id,'Resp',0,4); tagOfferEaD(o.id,EaDTag[0].id);
  })();
  (function(){
    // Estágio de Campo I — 7h/sem prática, total 140, com distribuição 4h/2h/1h
    const o = addOffer(p2026_1.id, cAdm.id, cmpEstCamp.id);  addOfferLoad(o.id,7,0,140);
    addOfferTeacher(o.id,tEdson.id,'Resp',4,0); addOfferTeacher(o.id,tEveraldo.id,'Co',2,0); addOfferTeacher(o.id,tMichelin.id,'Co',1,0);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpEstI.id);     addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tEdson.id,'Resp',0,2);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpProdC.id);    addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tPSS.id,'Resp',0,2);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpSimI.id);     addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tEdson.id,'Resp',0,2);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpNPA.id);      addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tEdson.id,'Resp',0,4);
  })();
  // P7
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpExtII.id);    addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tEveraldo.id,'Resp',0,4); tagOfferEaD(o.id,EaDTag[0].id);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpGCSII.id);    addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tMilk.id,'Resp',0,4); tagOfferEaD(o.id,EaDTag[0].id);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpLider.id);    addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tLeandro.id,'Resp',0,4);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpNegInt.id);   addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tPSS.id,'Resp',0,4);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpPO.id);       addOfferLoad(o.id,0,4,80);  addOfferTeacher(o.id,tPSS.id,'Resp',0,4);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpProjCom.id);  addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tEveraldo.id,'Resp',0,2); tagOfferEaD(o.id,EaDTag[0].id);
  })();
  (function(){
    const o = addOffer(p2026_1.id, cAdm.id, cmpTCC1.id);     addOfferLoad(o.id,0,2,40);  addOfferTeacher(o.id,tAndrieli.id,'Resp',0,2);
  })();

  // Demandas de OUTROS cursos (todos os que você listou)
  function xdm(period, demandingCourse, compCodigo, compNome, wP, wT, total, docente, nuteadSIM){
    const cmp = addComponent(compCodigo, compNome); // componente “externo” cadastrado também
    const x = addExternalDemand(period.id, demandingCourse.id, cmp.id);
    addExternalDemandLoad(x.id, wP, wT, total);
    if(docente) assignExternalDemandTeacher(x.id, docente.id);
    if(nuteadSIM){ const r = addMoodleRoom(true, undefined); linkExternalDemandRoom(x.id, r.id); tagExternalDemandEaD(x.id, EaDTag[0].id); }
  }

  // 1º C. Contábeis: Noções de Economia — PSS — 4T/sem, 80h — NUTEAD SIM
  xdm(p2026_1, cCCont, 'CC-ECON', 'Noções de Economia', 0,4,80, tPSS, true);
  // 1º C. Contábeis: Teorias Organizacionais — Leandro — 4T/sem, 80h — NUTEAD SIM
  xdm(p2026_1, cCCont, 'CC-TO', 'Teorias Organizacionais', 0,4,80, tLeandro, true);
  // 3º C. Contábeis: Marketing Empresarial e Profissional — Leandro — 4T/sem, 80h — NUTEAD SIM
  xdm(p2026_1, cCCont, 'CC-MKTEMP', 'Marketing Empresarial e Profissional', 0,4,80, tLeandro, true);
  // 7 Agronomia: Economia Rural e Comercialização Agrícola — Bruno — 2T/sem, 40h
  xdm(p2026_1, cAgro, 'AGRO-ECORURAL', 'Economia Rural e Comercialização Agrícola', 0,2,40, tBruno, false);
  // 5º Direito: Economia Política — Bruno — 4T/sem, 82h (total informado 82)
  xdm(p2026_1, cDir, 'DIR-ECOPOL', 'Economia Política', 0,4,82, tBruno, false);
  // 2 Técnico IPI: Projeto Integrador I — (sem docente) — 2T/sem, 80h
  xdm(p2026_1, cTI, 'TI-PI1', 'Projeto Integrador I', 0,2,80, null, false);
  // 2 Esp. Controladoria: Gestão de Pessoas e Diversidade nas Organizações — Michelin — 2T/sem, 30h
  xdm(p2026_1, cEspCtrl, 'ESPCTRL-GP', 'Gestão de Pessoas e Diversidade nas Organizações', 0,2,30, tMichelin, false);
  // 2 Esp. Controladoria: Finanças Corporativas — Everaldo — 2T/sem, 30h — NUTEAD SIM
  xdm(p2026_1, cEspCtrl, 'ESPCTRL-FIN', 'Finanças Corporativas', 0,2,30, tEveraldo, true);
  // 2 Esp. Sustentabilidade: Seminários de Pesquisa — (sem docente) — 2T/sem, 30h
  xdm(p2026_1, cEspSust, 'ESPSUST-SEM', 'Seminários de Pesquisa', 0,2,30, null, false);

  // Atividades administrativas (tabela “CARGAS HORÁRIAS...”)
  const actDIPLAD = addAdminActivity('DIPLAD');
  const actCoordPos = addAdminActivity('Coordenação de Pós Lato Sensu');
  const actDIEPPI  = addAdminActivity('DIEPPI');
  const actCOPE    = addAdminActivity('Coordenação de Curso Superior, COPE');
  const actCoordEstagio = addAdminActivity('Coordenação de Estágio');

  // horas Adm 2026.1
  setTeacherAdminAssignment(tSchlemper.id, p2026_1.id, actDIPLAD.id, 24);
  setTeacherAdminAssignment(tMilk.id,      p2026_1.id, actCoordPos.id, 4);
  setTeacherAdminAssignment(tAndrieli.id,  p2026_1.id, actDIEPPI.id,   24);
  setTeacherAdminAssignment(tBruno.id,     p2026_1.id, actCOPE.id,     18); // “16+2”
  setTeacherAdminAssignment(tEdson.id,     p2026_1.id, actCoordEstagio.id, 2);

  // Capacidades declaradas (Disponível / Destinada) 2026.1
  setTeacherCapacity(tSchlemper.id, p2026_1.id, 4, 4);
  setTeacherCapacity(tMilk.id,      p2026_1.id, 12, 8);
  setTeacherCapacity(tMichelin.id,  p2026_1.id, 12, 12);
  setTeacherCapacity(tAndrieli.id,  p2026_1.id, 4, 4);
  setTeacherCapacity(tBruno.id,     p2026_1.id, 6, 6);
  setTeacherCapacity(tEdson.id,     p2026_1.id, 14, 14);
  setTeacherCapacity(tEveraldo.id,  p2026_1.id, 16, 14);
  setTeacherCapacity(tLeandro.id,   p2026_1.id, 18, 16);
  setTeacherCapacity(tPSS.id,       p2026_1.id, 18, 18);

  // (opcional) verificar soma do próprio curso
  const somaAdm = sumCourseTotalHours('2026.1','Administração');
  console.log('Soma CH Total (Administração 2026.1) =', somaAdm, '(esperado 1380)');
})();

/**************
 * Compat Layer para seu app (DB.list, etc.)
 **************/
function _listCompat(table){
  switch(String(table)){
    case 'periods':    return Period.slice();
    case 'courses':    return Course.slice();
    case 'components': return ComponentT.slice();
    case 'teachers':   return Teacher.slice();
    case 'offers':     // “offers” já resolvidas com CH total e flags básicas (flatten p/ grid)
      return Offer.map(o=>{
        const load = OfferLoad.find(l=>l.offer_id===o.id) || {weekly_practice:0,weekly_theory:0,total_hours:0};
        const ead  = OfferEaD.some(e=>e.offer_id===o.id);
        const teach= OfferTeacher.find(t=>t.offer_id===o.id)?.teacher_id;
        return {
          id:o.id,
          periodo_id:o.period_id,
          periodo_num: undefined, // se quiser guardar 1/3/5/7, crie um campo extra de período curricular
          componente_id:o.component_id,
          teacher_id: teach || null,
          externa:false,
          curso_demandante_id:null,
          ch_pratica: load.weekly_practice,
          ch_teorica: load.weekly_theory,
          ch_total:   load.total_hours,
          nutead: ead
        };
      });
    case 'teacher_loads': {
      // sintetiza linha única por docente com Adm/Disponível/Destinada — usa 2026.1
      const per = Period.find(p=>p.rotulo==='2026.1');
      return Teacher.map((t,i)=>{
        const cap = TeacherCapacity.find(tc=>tc.teacher_id===t.id && tc.period_id===per?.id);
        const adm = TeacherAdminAssignment.filter(a=>a.teacher_id===t.id && a.period_id===per?.id)
                    .reduce((s,a)=>s+a.hours,0);
        return {
          id: `${t.id}`,
          docente_id: t.id,
          atividade: (adm>0?'C/ Atividades':'-'),
          ch_adm: adm,
          ch_disponivel: cap?.available_teaching_hours ?? 0,
          ch_destinada: cap?.destined_teaching_hours ?? 0
        };
      });
    }
    default: return [];
  }
}

// exporta no window
(function(){
  const out = {
    Period, Course, ComponentT, Teacher,
    MoodleRoom, EaDTag,
    Offer, OfferLoad, OfferRoom, OfferTeacher, OfferEaD,
    ExternalDemand, ExternalDemandLoad, ExternalDemandAssignee, ExternalDemandRoom, ExternalDemandEaD,
    AdminActivity, TeacherAdminAssignment, TeacherCapacity,

    addPeriod, addCourse, addComponent, addTeacher, addMoodleRoom,
    addOffer, addOfferLoad, addOfferTeacher, linkOfferRoom, tagOfferEaD,
    addExternalDemand, addExternalDemandLoad, assignExternalDemandTeacher, linkExternalDemandRoom, tagExternalDemandEaD,
    addAdminActivity, setTeacherAdminAssignment, setTeacherCapacity,

    sumCourseTotalHours, buildTeacherLoadTable, toCSV,

    list: _listCompat

   

  };
  window.DB = out;
})();
function reportTeacherSubjects(periodLabel){
  const per = Period.find(p => p.rotulo === periodLabel);
  if(!per) return [];
  const rows = [];

  // internos
  Offer.forEach(o=>{
    if(o.period_id !== per.id) return;
    const comp = ComponentT.find(c=>c.id===o.component_id);
    const crs  = Course.find(c=>c.id===o.course_id);
    const load = OfferLoad.find(l=>l.offer_id===o.id) || {weekly_practice:0, weekly_theory:0, total_hours:0};
    const cred = (load.weekly_practice||0) + (load.weekly_theory||0); // “créditos” = h/sem

    const links = OfferTeacher.filter(ot=>ot.offer_id===o.id);
    if(links.length){
      links.forEach(ot=>{
        const t = Teacher.find(x=>x.id===ot.teacher_id);
        const partCred = (ot.weekly_practice||0) + (ot.weekly_theory||0) || cred; // se rateou, usa rateio
        rows.push({
          Periodo: periodLabel,
          Externa: 'NÃO',
          Curso: crs?.nome || '—',
          Componente: comp?.nome || '—',
          Docente: t?.nome || '—',
          Creditos_h_sem: partCred,
          CH_Total: load.total_hours
        });
      });
    }else{
      // sem docente ainda
      rows.push({
        Periodo: periodLabel,
        Externa: 'NÃO',
        Curso: crs?.nome || '—',
        Componente: comp?.nome || '—',
        Docente: '—',
        Creditos_h_sem: cred,
        CH_Total: load.total_hours
      });
    }
  });

  // externas (demandas de outros cursos)
  ExternalDemand.forEach(x=>{
    if(x.period_id !== per.id) return;
    const cmp = ComponentT.find(c=>c.id===x.component_id);
    const crsDem = Course.find(c=>c.id===x.demanding_course_id);
    const load = ExternalDemandLoad.find(l=>l.external_demand_id===x.id) || {weekly_practice:0, weekly_theory:0, total_hours:0};
    const cred = (load.weekly_practice||0) + (load.weekly_theory||0);
    const assigns = ExternalDemandAssignee.filter(a=>a.external_demand_id===x.id);

    if(assigns.length){
      assigns.forEach(a=>{
        const t = Teacher.find(tt=>tt.id===a.teacher_id);
        rows.push({
          Periodo: periodLabel,
          Externa: 'SIM',
          Curso: crsDem?.nome || '—',
          Componente: cmp?.nome || '—',
          Docente: t?.nome || '—',
          Creditos_h_sem: cred,
          CH_Total: load.total_hours
        });
      });
    }else{
      rows.push({
        Periodo: periodLabel,
        Externa: 'SIM',
        Curso: crsDem?.nome || '—',
        Componente: cmp?.nome || '—',
        Docente: '—',
        Creditos_h_sem: cred,
        CH_Total: load.total_hours
      });
    }
  });

  return rows;
}
