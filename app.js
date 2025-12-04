// Simple rental management using localStorage
const LS_KEY = 'aluguel_ti_data_v1';

let state = { equipments: [], rentals: [] };

function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); renderAll(); }
function loadState(){ const s = localStorage.getItem(LS_KEY); if(s) state = JSON.parse(s); renderAll(); }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }

/* Equipment form */
const equipmentForm = document.getElementById('equipment-form');
const equipmentsTableBody = document.querySelector('#equipments-table tbody');
const equipmentSelect = document.getElementById('equipment-select');
equipmentForm.addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(equipmentForm).entries());
  const eq = { id: uid(), type: f.type, model: f.model, serial: f.serial, dailyRate: parseFloat(f.dailyRate) || 0, createdAt: new Date().toISOString() };
  state.equipments.push(eq);
  equipmentForm.reset();
  saveState();
});

/* Rental form */
const rentalForm = document.getElementById('rental-form');
const rentalTotal = document.getElementById('rental-total');
rentalForm.addEventListener('input', () => {
  const data = Object.fromEntries(new FormData(rentalForm).entries());
  const eq = state.equipments.find(x=>x.id===data.equipmentId);
  if(!eq || !data.startDate || !data.endDate){ rentalTotal.value = ''; return; }
  const sd = new Date(data.startDate); const ed = new Date(data.endDate);
  const days = Math.max(1, Math.ceil((ed - sd)/(1000*60*60*24)) + 1); // inclusive
  rentalTotal.value = (days * eq.dailyRate).toFixed(2);
});
rentalForm.addEventListener('submit', e=>{
  e.preventDefault();
  const f = Object.fromEntries(new FormData(rentalForm).entries());
  const eq = state.equipments.find(x=>x.id===f.equipmentId);
  if(!eq){ alert('Selecione um equipamento válido.'); return; }
  const sd = new Date(f.startDate); const ed = new Date(f.endDate);
  if(ed < sd){ alert('Data de término deve ser maior ou igual à data de início.'); return; }
  const days = Math.max(1, Math.ceil((ed - sd)/(1000*60*60*24)) + 1);
  const total = parseFloat((days * eq.dailyRate).toFixed(2));
  const rental = { id: uid(), equipmentId: eq.id, renter: f.renter, startDate: f.startDate, endDate: f.endDate, days, total, notes: f.notes||'', status: 'ativo', createdAt: new Date().toISOString() };
  state.rentals.push(rental);
  rentalForm.reset();
  rentalTotal.value = '';
  saveState();
});

/* Render */
function renderEquipments(){
  equipmentsTableBody.innerHTML = '';
  equipmentSelect.innerHTML = '<option value="">-- selecione --</option>';
  state.equipments.forEach(eq=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escape(eq.type)}</td><td>${escape(eq.model)}</td><td>${escape(eq.serial)}</td><td>R$ ${Number(eq.dailyRate).toFixed(2)}</td>
      <td>
        <button onclick="editEquipment('${eq.id}')">Editar</button>
        <button onclick="deleteEquipment('${eq.id}')">Excluir</button>
      </td>`;
    equipmentsTableBody.appendChild(tr);
    const opt = document.createElement('option'); opt.value = eq.id; opt.textContent = `${eq.type} — ${eq.model} (${eq.serial})`;
    equipmentSelect.appendChild(opt);
  });
}

function renderRentals(){
  const tbody = document.querySelector('#rentals-table tbody');
  tbody.innerHTML = '';
  state.rentals.forEach(r=>{
    const eq = state.equipments.find(x=>x.id===r.equipmentId);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${eq ? escape(eq.type + ' — ' + eq.model) : '—'}</td>
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

/* Actions */
window.editEquipment = function(id){
  const eq = state.equipments.find(x=>x.id===id);
  if(!eq) return alert('Equipamento não encontrado.');
  const t = prompt('Tipo:', eq.type); if(t===null) return;
  const m = prompt('Modelo:', eq.model); if(m===null) return;
  const s = prompt('Serial:', eq.serial); if(s===null) return;
  const d = prompt('Valor diário (R$):', eq.dailyRate); if(d===null) return;
  eq.type = t; eq.model = m; eq.serial = s; eq.dailyRate = parseFloat(d) || 0;
  saveState();
}

window.deleteEquipment = function(id){
  if(!confirm('Excluir equipamento? Todos os aluguéis vinculados manterão referência.')) return;
  state.equipments = state.equipments.filter(x=>x.id!==id);
  saveState();
}

window.closeRental = function(id){
  const r = state.rentals.find(x=>x.id===id);
  if(!r) return;
  r.status = 'finalizado';
  saveState();
}

window.deleteRental = function(id){
  if(!confirm('Excluir aluguel?')) return;
  state.rentals = state.rentals.filter(x=>x.id!==id);
  saveState();
}

/* Utilities */
function escape(str){ return String(str||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

function renderAll(){ renderEquipments(); renderRentals(); }

document.getElementById('export-btn').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'aluguel_ti_dados.json'; a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-file').addEventListener('change', (ev)=>{
  const f = ev.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(!data.equipments || !data.rentals) return alert('Arquivo inválido.');
      state = data; saveState();
      alert('Dados importados com sucesso.');
    }catch(err){ alert('Erro ao importar: ' + err.message); }
  };
  reader.readAsText(f);
});

document.getElementById('clear-btn').addEventListener('click', ()=>{
  if(!confirm('Limpar todos os dados?')) return;
  state = { equipments: [], rentals: [] };
  saveState();
});

/* Init */
loadState();
