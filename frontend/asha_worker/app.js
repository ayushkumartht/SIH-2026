const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  pending: Number(localStorage.getItem('ashaPending') || 0),
  selectedPatient: null,
  patients: JSON.parse(localStorage.getItem('ashaPatients') || 'null') || [
    { id: 'p1', name: 'Gurpreet Kaur', age: 62, village: 'Bhadson', phone: '98765 41230', symptoms: 'Breathlessness and fever', risk: 'urgent', followup: 'Today, 4:30 PM' },
    { id: 'p2', name: 'Ramesh Kumar', age: 48, village: 'Nabha', phone: '98765 73910', symptoms: 'Diabetes medicine follow-up', risk: 'attention', followup: 'Tomorrow' },
    { id: 'p3', name: 'Sukhwinder Devi', age: 28, village: 'Kauli', phone: '98765 88642', symptoms: 'Antenatal check-up', risk: 'stable', followup: '12 Sep' },
    { id: 'p4', name: 'Harjit Singh', age: 71, village: 'Bhadson', phone: '98765 14825', symptoms: 'Blood pressure review', risk: 'attention', followup: 'Today, 6:00 PM' },
  ],
  emergency: JSON.parse(localStorage.getItem('ashaEmergency') || 'null') || { patientId: 'p1', severity: 'critical', details: 'Breathlessness with high fever. Needs oxygen check.', location: 'Bhadson, Ward 4', status: 'Ambulance requested' },
  activities: [
    ['Vitals recorded', 'Sukhwinder Devi • 11:20 AM', ''],
    ['Follow-up completed', 'Meena Rani • 10:05 AM', ''],
    ['Urgent review requested', 'Gurpreet Kaur • 9:42 AM', 'urgent'],
  ],
};

function initials(name) { return name.split(' ').map((word) => word[0]).join('').slice(0, 2); }
function tag(risk) { return `<span class="tag ${risk}">${risk === 'attention' ? 'needs attention' : risk}</span>`; }
function selectedOrFirst() { return state.selectedPatient || state.patients[0]; }
function save() { localStorage.setItem('ashaPatients', JSON.stringify(state.patients)); localStorage.setItem('ashaPending', String(state.pending)); localStorage.setItem('ashaEmergency', JSON.stringify(state.emergency)); }
function notify(message, error = false) { const toast = $('#toast'); toast.textContent = message; toast.className = `toast show${error ? ' error' : ''}`; clearTimeout(notify.timer); notify.timer = setTimeout(() => { toast.className = 'toast'; }, 3200); }

function renderCounts() {
  const urgent = state.patients.filter((patient) => patient.risk === 'urgent').length;
  const attention = state.patients.filter((patient) => patient.risk !== 'stable').length;
  const followups = state.patients.filter((patient) => patient.followup.startsWith('Today')).length;
  $('#urgentGreeting').textContent = `${urgent} urgent case${urgent === 1 ? '' : 's'}`;
  $('#followupGreeting').textContent = `${followups} follow-up${followups === 1 ? '' : 's'}`;
  $('#attentionCount').textContent = attention;
  $('#referralCount').textContent = state.emergency ? '1' : '0';
  $('#syncCount').textContent = `${state.pending} pending`;
}

function patientRow(patient, directory = false) {
  const vitals = `<button class="small-button" data-vitals="${patient.id}">Vitals</button>`;
  const consult = `<button class="small-button" data-consult="${patient.id}">Consult</button>`;
  return `<article class="${directory ? 'directory-card' : 'patient-row'}"><span class="avatar">${initials(patient.name)}</span><div><strong>${patient.name}</strong><p>${patient.age} years · ${patient.village}${directory ? ` · ${patient.phone || 'No phone'}` : ''}</p><small>${patient.symptoms || 'No symptoms recorded'}</small></div>${directory ? `<div class="row-actions">${tag(patient.risk)} ${vitals} ${consult}</div>` : `<div>${tag(patient.risk)}<div class="row-actions">${vitals}${consult}</div></div>`}</article>`;
}
function renderQueue() { $('#careQueue').innerHTML = state.patients.filter((patient) => patient.risk !== 'stable').slice(0, 3).map((patient) => patientRow(patient)).join('') || '<p class="hint">No priority cases right now.</p>'; }
function renderDirectory() {
  const query = $('#patientSearch').value.trim().toLowerCase(); const risk = $('#riskFilter').value;
  const found = state.patients.filter((patient) => (risk === 'all' || patient.risk === risk) && `${patient.name} ${patient.village} ${patient.phone}`.toLowerCase().includes(query));
  $('#patientDirectory').innerHTML = found.map((patient) => patientRow(patient, true)).join('') || '<p class="hint">No patient matches this search.</p>';
}
function renderActivities() { $('#activityList').innerHTML = state.activities.map(([title, detail, kind]) => `<article class="activity-item ${kind}"><p>${title}</p><small>${detail}</small></article>`).join(''); }
function renderEmergency() {
  const panel = $('#emergencyPanel'); if (!state.emergency) { panel.innerHTML = '<div class="card"><strong>No active SOS request.</strong><p class="hint">Use “Create SOS” if a patient needs emergency help.</p></div>'; return; }
  const patient = state.patients.find((item) => item.id === state.emergency.patientId);
  panel.innerHTML = `<article class="emergency-case"><p class="kicker red-text">${state.emergency.severity} emergency · ${state.emergency.status}</p><h3>${patient?.name || 'Patient'} — ${patient?.village || ''}</h3><p>${state.emergency.details}</p><p><strong>Location:</strong> ${state.emergency.location}</p><div class="emergency-actions"><button class="primary-button" id="ambulanceButton">🚑 Track ambulance</button><button class="secondary-button" id="hospitalButton">Pre-alert hospital</button></div></article>`;
}
function renderFollowups() { $('#followupList').innerHTML = state.patients.filter((patient) => patient.followup).map((patient) => `<article class="followup-item"><div><p class="kicker">${patient.followup}</p><h3>${patient.name}</h3><p>${patient.symptoms || 'Routine health follow-up'} · ${patient.village}</p></div><button class="small-button" data-vitals="${patient.id}">Record visit</button></article>`).join(''); }
function render() { renderCounts(); renderQueue(); renderDirectory(); renderActivities(); renderEmergency(); renderFollowups(); }

function openVitals(patient) { state.selectedPatient = patient; $('#vitalsPatientName').textContent = `${patient.name} · ${patient.village}`; $('#vitalsDialog').showModal(); }
function openSos() { $('#sosPatient').innerHTML = state.patients.map((patient) => `<option value="${patient.id}">${patient.name} — ${patient.village}</option>`).join(''); $('#sosDialog').showModal(); }
function switchView(view) { $$('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.view === view)); $$('.view').forEach((section) => section.classList.toggle('active', section.id === view)); }

$$('.tab').forEach((tab) => tab.addEventListener('click', () => switchView(tab.dataset.view)));
$$('[data-view-target]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.viewTarget)));
document.addEventListener('click', (event) => {
  const vitals = event.target.closest('[data-vitals]'); const consult = event.target.closest('[data-consult]'); const action = event.target.closest('[data-action]');
  if (vitals) openVitals(state.patients.find((patient) => patient.id === vitals.dataset.vitals));
  if (consult) { const patient = state.patients.find((item) => item.id === consult.dataset.consult); state.selectedPatient = patient; notify(`Consultation request started for ${patient.name}. Connect with an available doctor.`); }
  if (action?.dataset.action === 'register') $('#patientDialog').showModal();
  if (action?.dataset.action === 'vitals') openVitals(selectedOrFirst());
  if (action?.dataset.action === 'consult') notify(`Consultation request started for ${selectedOrFirst().name}. Connect with an available doctor.`);
  if (action?.dataset.action === 'sos') openSos();
  if (event.target.id === 'ambulanceButton') { state.emergency.status = 'Ambulance dispatched — ETA 14 min'; save(); renderEmergency(); notify('Ambulance is on the way. ETA: 14 minutes.'); }
  if (event.target.id === 'hospitalButton') notify('Civil Hospital Nabha has been pre-alerted with the patient summary.');
});
$('#patientSearch').addEventListener('input', renderDirectory); $('#riskFilter').addEventListener('change', renderDirectory);
$('#patientForm').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const patient = { id: `p${Date.now()}`, name: $('#patientName').value.trim(), age: Number($('#patientAge').value), village: $('#patientVillage').value.trim(), phone: $('#patientPhone').value.trim(), symptoms: $('#patientSymptoms').value.trim(), risk: 'stable', followup: 'Follow-up not set' }; state.patients.unshift(patient); state.pending += 1; state.activities.unshift(['Patient registered', `${patient.name} • saved locally`, '']); save(); $('#patientDialog').close(); event.currentTarget.reset(); render(); notify(`${patient.name} saved locally and ready to sync.`); });
$('#vitalsForm').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); const readings = { temperature: Number($('#temperature').value), heartRate: Number($('#heartRate').value), oxygen: Number($('#oxygen').value), systolic: Number($('#systolic').value), diastolic: Number($('#diastolic').value) }; const abnormal = readings.temperature >= 38 || readings.heartRate >= 110 || (readings.oxygen && readings.oxygen < 94) || readings.systolic >= 160 || readings.systolic < 90; if (abnormal) state.selectedPatient.risk = 'attention'; state.pending += 1; state.activities.unshift([abnormal ? 'Vitals flagged for review' : 'Vitals recorded', `${state.selectedPatient.name} • saved locally`, abnormal ? 'urgent' : '']); save(); $('#vitalsDialog').close(); event.currentTarget.reset(); render(); notify(abnormal ? 'Abnormal readings flagged for doctor review.' : 'Vitals saved locally.'); });
$('#sosForm').addEventListener('submit', (event) => { if (event.submitter?.value === 'cancel') return; event.preventDefault(); state.emergency = { patientId: $('#sosPatient').value, severity: $('#sosSeverity').value, details: $('#sosDetails').value.trim(), location: $('#sosLocation').value.trim(), status: 'Ambulance requested' }; const patient = state.patients.find((item) => item.id === state.emergency.patientId); patient.risk = 'urgent'; state.pending += 1; state.activities.unshift(['SOS raised', `${patient.name} • ambulance search started`, 'urgent']); save(); $('#sosDialog').close(); event.currentTarget.reset(); render(); switchView('emergency'); notify('SOS has been raised. Finding the nearest ambulance.'); });
$('#syncButton').addEventListener('click', () => { if (!state.pending) return notify('All records are already synced.'); $('#syncButton').disabled = true; $('#syncButton').firstChild.textContent = '↻ '; setTimeout(() => { state.pending = 0; save(); render(); $('#syncButton').disabled = false; notify('All locally saved records are synced.'); }, 750); });
$('#languageButton').addEventListener('click', () => notify('Hindi and Punjabi language support can be connected here.'));
render();
