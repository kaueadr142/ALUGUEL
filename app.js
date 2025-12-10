// ==============================
// Gerenciamento de Aluguel - JavaScript Comentado em Detalhes
// ==============================

// ------------------------------
// Chave usada para salvar dados no localStorage
// localStorage é um armazenamento interno do navegador que guarda informações mesmo após fechar a página
// ------------------------------
const LS_KEY = 'aluguel_ti_data_v1';

// ------------------------------
// Objeto que representa todo o estado da aplicação
// equipments = lista de equipamentos cadastrados
// rentals = lista de aluguéis realizados
// ------------------------------
let state = {
  equipments: [],
  rentals: []
};

// ------------------------------
// Salva o estado atual no localStorage
// JSON.stringify transforma objetos JS em texto JSON
// Depois chama renderAll() para atualizar a interface
// ------------------------------
function saveState(){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
  renderAll();
}

// ------------------------------
// Carrega o estado salvo no localStorage ao iniciar
// Se existir dado salvo, converte de volta usando JSON.parse
// ------------------------------
function loadState(){
  const s = localStorage.getItem(LS_KEY);
  if(s) state = JSON.parse(s);
  renderAll();
}

// ------------------------------
// Gera um ID único baseado no tempo atual + número aleatório
// toString(36) cria uma string compacta em base 36
// ------------------------------
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

// ==============================
// FORMULÁRIO DE EQUIPAMENTOS
// ==============================

// Obtém referências aos elementos do HTML
const equipmentForm = document.getElementById('equipment-form');
const equipmentsTableBody = document.querySelector('#equipments-table tbody');
const equipmentSelect = document.getElementById('equipment-select');

// Evento de envio do formulário de equipamento
// e.preventDefault() impede recarregar a página
// FormData coleta automaticamente os dados do formulário
// Object.fromEntries transforma FormData em um objeto JS
// ------------------------------
equipmentForm.addEventListener('submit', e => {
  e.preventDefault();

  const f = Object.fromEntries(new FormData(equipmentForm).entries());

  // Cria um objeto de equipamento
  const eq = {
    id: uid(),
    type: f.type,
    model: f.model,
    serial: f.serial,
    dailyRate: parseFloat(f.dailyRate) || 0,
    createdAt: new Date().toISOString()
  };

  state.equipments.push(eq);      // Adiciona ao estado
  equipmentForm.reset();          // Limpa formulário
  saveState();                    // Salva e atualiza tela
});

// ==============================
// FORMULÁRIO DE ALUGUEL
// ==============================

const rentalForm = document.getElementById('rental-form');
const rentalTotal = document.getElementById('rental-total');

// Atualiza o valor total conforme as datas mudam
rentalForm.addEventListener('input', () => {
  const data = Object.fromEntries(new FormData(rentalForm).entries());
  const eq = state.equipments.find(x=>x.id===data.equipmentId);

  // Só calcula se todos os dados necessários estiverem preenchidos
  if(!eq || !data.startDate || !data.endDate){
    rentalTotal.value = '';
    return;
  }

  const sd = new Date(data.startDate);
  const ed = new Date(data.endDate);

  // Calcula dias incluindo o dia inicial: +1
  const days = Math.max(1, Math.ceil((ed - sd)/(1000*60*60*24)) + 1);

  rentalTotal.value = (days * eq.dailyRate).toFixed(2);
});

// Envio do formulário de aluguel
rentalForm.addEventListener('submit', e=>{
  e.preventDefault();
  const f = Object.fromEntries(new FormData(rentalForm).entries());
  const eq = state.equipments.find(x=>x.id===f.equipmentId);

  if(!eq){
    alert('Selecione um equipamento válido.');
    return;
  }

  const sd = new Date(f.startDate);
  const ed = new Date(f.endDate);

  // Verifica se a data final é válida
  if(ed < sd){
    alert('Data de término deve ser maior ou igual à data de início.');
    return;
  }

  const days = Math.max(1, Math.ceil((ed - sd)/(1000*60*60*24)) + 1);
  const total = parseFloat((days * eq.dailyRate).toFixed(2));

  // Cria objeto de aluguel
  const rental = {
    id: uid(),
    equipmentId: eq.id,
    renter: f.renter,
    startDate: f.startDate,
    endDate: f.endDate,
    days,
    total,
    notes: f.notes||'',
    status: 'ativo',
    createdAt: new Date().toISOString()
  };

  state.rentals.push(rental);
  rentalForm.reset();
  rentalTotal.value = '';
  saveState();
});

// ==============================
// RENDERIZAÇÃO DA TABELA DE EQUIPAMENTOS
// ==============================
function renderEquipments(){
  equipmentsTableBody.innerHTML = '';
  equipmentSelect.innerHTML = '<option value="">-- selecione --</option>';

  state.equipments.forEach(eq=>{
    const tr = document.createElement('tr');

    tr.innerHTML =
      `<td>${escape(eq.type)}</td>
       <td>${escape(eq.model)}</td>
       <td>${escape(eq.serial)}</td>
       <td>R$ ${Number(eq.dailyRate).toFixed(2)}</td>
       <td>
         <button onclick="editEquipment('${eq.id}')">Editar</button>
         <button onclick="deleteEquipment('${eq.id}')">Excluir</button>
       </td>`;

    equipmentsTableBody.appendChild(tr);

    // Adiciona o equipamento ao select do formulário de aluguel
    const opt = document.createElement('option');
    opt.value = eq.id;
    opt.textContent = `${eq.type} — ${eq.model} (${eq.serial})`;
    equipmentSelect.appendChild(opt);
  });
}

// ==============================
// RENDERIZAÇÃO DA TABELA DE ALUGUÉIS
// ==============================
function renderRentals(){
  const tbody = document.querySelector('#rentals-table tbody');
  tbody.innerHTML = '';

  state.rentals.forEach(r=>{
    const eq = state.equipments.find(x=>x.id===r.equipmentId);
    const tr = document.createElement('tr');

    tr.innerHTML =
      `<td>${eq ? escape(eq.type + ' — ' + eq.model) : '—'}</td>
       <td>${escape(r.renter)}</td>
       <td>${r.startDate} → ${r.endDate} (${r.days} dias)</td>
       <td>R$ ${Number(r.total).toFixed(2)}</td>
       <td>${escape(r.status)}</td>
       <td>
         ${r.status === 'ativo' ? `<button onclick="closeRental('${r.id}')">Finalizar</button>` : ''}
         <button onclick="deleteRental('${r.id}')">Excluir</button>
       </td>`;

    tbody.appendChild(tr);
  });
}

// ==============================
// AÇÕES DO SISTEMA
// ==============================

// Editar equipamento
window.editEquipment = function(id){
  const eq = state.equipments.find(x=>x.id===id);
  if(!eq) return alert('Equipamento não encontrado.');

  // prompts servem para pedir valores diretamente ao usuário
  const t = prompt('Tipo:', eq.type);
  if(t===null) return;
  const m = prompt('Modelo:', eq.model);
  if(m===null) return;
  const s = prompt('Serial:', eq.serial);
  if(s===null) return;
  const d = prompt('Valor diário (R$):', eq.dailyRate);
  if(d===null) return;

  eq.type = t;
  eq.model = m;
  eq.serial = s;
  eq.dailyRate = parseFloat(d) || 0;
  saveState();
}

// Excluir equipamento
window.deleteEquipment = function(id){
  if(!confirm('Excluir equipamento? Todos os aluguéis vinculados manterão referência.')) return;
  state.equipments = state.equipments.filter(x=>x.id!==id);
  saveState();
}

// Finalizar aluguel
window.closeRental = function(id){
  const r = state.rentals.find(x=>x.id===id);
  if(!r) return;
  r.status = 'finalizado';
  saveState();
}

// Excluir aluguel
window.deleteRental = function(id){
  if(!confirm('Excluir aluguel?')) return;
  state.rentals = state.rentals.filter(x=>x.id!==id);
  saveState();
}

// ==============================
// FUNÇÕES UTILITÁRIAS
// ==============================

// Evita inserção de HTML malicioso substituindo caracteres especiais
function escape(str){
  return String(str||'')
