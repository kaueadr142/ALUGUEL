// Simple rental management using localStorage // Comentário explicativo geral
const LS_KEY = 'aluguel_ti_data_v1'; // Chave usada no localStorage

let state = { equipments: [], rentals: [] }; // Estado inicial da aplicação

function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); renderAll(); } // Salva estado e atualiza tela
function loadState(){ const s = localStorage.getItem(LS_KEY); if(s) state = JSON.parse(s); renderAll(); } // Carrega estado salvo e renderiza

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); } // Gera ID único

/* Equipment form */
const equipmentForm = document.getElementById('equipment-form'); // Formulário de equipamento
const equipmentsTableBody = document.querySelector('#equipments-table tbody'); // Corpo da tabela
const equipmentSelect = document.getElementById('equipment-select'); // Select de equipamentos

// Listener de envio do formulário de equipamento
equipmentForm.addEventListener('submit', e => {
  e.preventDefault(); // Impede recarga da página
  const f = Object.fromEntries(new FormData(equipmentForm).entries()); // Coleta dados
  const eq = { id: uid(), type: f.type, model: f.model, serial: f.serial, dailyRate: parseFloat(f.dailyRate) || 0, createdAt: new Date().toISOString() }; // Objeto do equipamento
  state.equipments.push(eq); // Adiciona no estado
  equipmentForm.reset(); // Limpa formulário
  saveState(); // Salva dados
});

/* Rental form */
const rentalForm = document.getElementById('rental-form'); // Formulário de aluguel
const rentalTotal = document.getElementById('rental-total'); // Campo de total

// Recalcula total ao alterar dados
rentalForm.addEventListener('input', () => {
  const data = Object.fromEntries(new FormData(rentalForm).entries()); // Pega dados
  const eq = state.equipments.find(x=>x.id===data.equipmentId); // Encontra equipamento
  if(!eq || !data.startDate || !data.endDate){ rentalTotal.value = '';
                                              return; } // Valida inputs
  const sd = new Date(data.startDate); const ed = new Date(data.endDate); // Datas
  const days = Math.max(1, Math.ceil((ed - sd)/(1000*60*60*24)) + 1); // Calcula dias
  rentalTotal.value = (days * eq.dailyRate).toFixed(2); // Atualiza total
});

// Envio do formulário de aluguel
rentalForm.addEventListener('submit', e=>{
  e.preventDefault(); // Impede recarga
  const f = Object.fromEntries(new FormData(rentalForm).entries()); // Dados
  const eq = state.equipments.find(x=>x.id===f.equipmentId); // Equipamento
  if(!eq){ alert('Selecione um equipamento válido.');
          return; } // Erro

  const sd = new Date(f.startDate); const ed = new Date(f.endDate); // Datas
  if(ed < sd){ alert('Data de término deve ser maior ou igual à data de início.');
              return; } // Validação

  const days = Math.max(1, Math.ceil((ed - sd)/(1000*60*60*24)) + 1); // Dias
  const total = parseFloat((days * eq.dailyRate).toFixed(2)); // Total

  const rental = { id: uid(), equipmentId: eq.id, renter: f.renter, startDate: f.startDate, endDate: f.endDate, days, total, notes: f.notes||'', status: 'ativo', createdAt: new Date().toISOString() }; // Objeto aluguel
  state.rentals.push(rental); // Salva
  rentalForm.reset(); // Limpa
  rentalTotal.value = ''; // Zera total
  saveState(); // Atualiza estado
});

/* Render */
function renderEquipments(){ // Renderiza equipamentos
  equipmentsTableBody.innerHTML = ''; // Limpa tabela
  equipmentSelect.innerHTML = '<option value="">-- selecione --</option>'; // Reseta select

  state.equipments.forEach(eq=>{ // Para cada equipamento
    const tr = document.createElement('tr'); // Nova linha
    tr.innerHTML = `<td>${escape(eq.type)}</td><td>${escape(eq.model)}</td><td>${escape(eq.serial)}</td><td>R$ ${Number(eq.dailyRate).toFixed(2)}</td>
      <td>
        <button onclick="editEquipment('${eq.id}')">Editar</button>
        <button onclick="deleteEquipment('${eq.id}')">Excluir</button>
      </td>`; // Conteúdo
    equipmentsTableBody.appendChild(tr); // Adiciona linha

    const opt = document.createElement('option'); opt.value = eq.id; opt.textContent = `${eq.type} — ${eq.model} (${eq.serial})`; // Opção no select
    equipmentSelect.appendChild(opt); // Adiciona select
  });
}

function renderRentals(){ // Renderiza aluguéis
  const tbody = document.querySelector('#rentals-table tbody'); // Corpo da tabela
  tbody.innerHTML = ''; // Limpa

  state.rentals.forEach(r=>{ // Para cada aluguel
    const eq = state.equipments.find(x=>x.id===r.equipmentId); // Equipamento relacionado
    const tr = document.createElement('tr'); // Linha
    tr.innerHTML = `<td>${eq ? escape(eq.type + ' — ' + eq.model) : '—'}</td>
      <td>${escape(r.renter)}</td>
      <td>${r.startDate} → ${r.endDate} (${r.days} dias)</td>
      <td>R$ ${Number(r.total).toFixed(2)}</td>
      <td>${escape(r.status)}</td>
      <td>
        ${r.status === 'ativo' ? `<button onclick="closeRental('${r.id}')">Finalizar</button>` : ''}
        <button onclick="deleteRental('${r.id}')">Excluir</button>
      </td>`; // Conteúdo da linha
    tbody.appendChild(tr); // Adiciona
  });
}

/* Actions */
window.editEquipment = function(id){ // Editar equipamento
  const eq = state.equipments.find(x=>x.id===id); // Busca
  if(!eq) return alert('Equipamento não encontrado.'); // Validação

  const t = prompt('Tipo:', eq.type); if(t===null) return; // Edita tipo
  const m = prompt('Modelo:', eq.model); if(m===null) return; // Edita modelo
  const s = prompt('Serial:', eq.serial); if(s===null) return; // Edita serial
  const d = prompt('Valor diário (R$):', eq.dailyRate); if(d===null) return; // Edita valor

  eq.type = t; eq.model = m; eq.serial = s; eq.dailyRate = parseFloat(d) || 0; // Atualiza
  saveState(); // Salva
}

window.deleteEquipment = function(id){ // Remove equipamento
  if(!confirm('Excluir equipamento? Todos os aluguéis vinculados manterão referência.')) return; // Confirmação
  state.equipments = state.equipments.filter(x=>x.id!==id); // Remove
  saveState(); // Atualiza
}

window.closeRental = function(id){ // Finaliza aluguel
  const r = state.rentals.find(x=>x.id===id); // Busca
  if(!r) return; // Valida
  r.status = 'finalizado'; // Marca finalizado
  saveState(); // Atualiza
}

window.deleteRental = function(id){ // Excluir aluguel
  if(!confirm('Excluir aluguel?')) return; // Confirmação
  state.rentals = state.rentals.filter(x=>x.id!==id); // Remove
  saveState(); // Salva
}

/* Utilities */
function escape(str){ return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); } // Evita HTML malicioso

function renderAll(){ renderEquipments(); renderRentals(); } // Renderiza tudo

document.getElementById('export-btn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'}); // Cria arquivo JSON
  const url = URL.createObjectURL(blob); // Gera link temporário
  const a = document.createElement('a'); a.href = url; a.download = 'aluguel_ti_dados.json'; a.click(); // Baixa arquivo
  URL.revokeObjectURL(url); // Remove link
});

document.getElementById('import-file').addEventListener('change', (ev)=>{
  const f = ev.target.files[0]; if(!f) return; // Pega arquivo
  const reader = new FileReader(); // Leitor
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result); // Lê JSON
      if(!data.equipments || !data.rentals) return alert('Arquivo inválido.'); // Valida
      state = data; saveState(); // Importa
      alert('Dados importados com sucesso.'); // Sucesso
    }catch(err){ alert('Erro ao importar: ' + err.message); } // Erro
  };
  reader.readAsText(f); // Lê texto
});

document.getElementById('clear-btn').addEventListener('click', ()=>{
  if(!confirm('Limpar todos os dados?')) return; // Confirmação
  state = { equipments: [], rentals: [] }; // Reseta estado
  saveState(); // Atualiza
});

/* Init */
loadState(); // Inicializa carregando o estado salvo
