const state = {
  backendUrl: 'http://localhost:3000',
  roomId: null,
  socket: null,
  dailyCall: null,
  peerConnection: null,
  localStream: null,
  qualityTimer: null,
  tier: 'unknown',
  mode: null,
  participantRole: 'patient',
  consultationId: null,
  selectedPatientId: null,
};

const $ = (id) => document.getElementById(id);
const savedToken = sessionStorage.getItem('teleconsultationToken');
if (savedToken) $('authToken').value = savedToken;
const log = (message) => {
  const timestamp = new Date().toLocaleTimeString();
  $('eventLog').textContent = `[${timestamp}] ${message}\n${$('eventLog').textContent}`.slice(0, 5000);
};

const tierCopy = {
  unknown: 'Waiting for network measurements.',
  hd: 'HD video with normal audio.',
  low_res: 'Low-resolution video with audio prioritized.',
  audio_only: 'Audio-only mode. Video is disabled.',
  very_poor: 'Offline fallback required. Continue through SMS/IVR symptoms.',
};

function backend(path) { return `${state.backendUrl}${path}`; }

function apiHeaders() {
  const token = $('authToken').value.trim();
  return token ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } : { 'Content-Type': 'application/json' };
}

function setConnection(status, kind = 'idle') {
  $('connectionBadge').textContent = status;
  $('connectionBadge').className = `badge ${kind}`;
}

function setTier(quality) {
  state.tier = quality.tier;
  $('tierBadge').textContent = quality.tier.replace('_', ' ').toUpperCase();
  $('tierBadge').className = `tier ${quality.tier}`;
  $('liveRtt').textContent = quality.rttMs == null ? '--' : `${Math.round(quality.rttMs)} ms`;
  $('liveLoss').textContent = quality.packetLossPercent == null ? '--' : `${quality.packetLossPercent}%`;
  $('modeDescription').textContent = tierCopy[quality.tier] || 'Network mode updated.';
  $('fallbackNotice').classList.toggle('hidden', quality.tier !== 'very_poor');
  applyMediaTier(quality.tier);
}

function mediaSettings(tier) {
  if (tier === 'hd') return { width: 1280, height: 720, frameRate: 30, video: true, audio: true };
  if (tier === 'low_res') return { width: 640, height: 360, frameRate: 20, video: true, audio: true };
  if (tier === 'audio_only') return { video: false, audio: true };
  if (tier === 'very_poor') return { video: false, audio: false };
  return { width: 640, height: 360, frameRate: 20, video: true, audio: true };
}

async function applyMediaTier(tier) {
  const settings = mediaSettings(tier);
  $('audioOnlyLabel').classList.toggle('hidden', tier !== 'audio_only' && tier !== 'very_poor');

  if (state.mode === 'daily' && state.dailyCall) {
    state.dailyCall.setLocalVideo(settings.video);
    state.dailyCall.setLocalAudio(settings.audio);
    if (typeof state.dailyCall.updateInputSettings === 'function' && settings.video) {
      await state.dailyCall.updateInputSettings({ video: { settings: { width: settings.width, height: settings.height, frameRate: settings.frameRate } } }).catch(() => {});
    }
    return;
  }

  if (!state.localStream) return;
  const videoTrack = state.localStream.getVideoTracks()[0];
  const audioTrack = state.localStream.getAudioTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = settings.video;
    if (settings.video && videoTrack.applyConstraints) await videoTrack.applyConstraints(settings).catch(() => {});
  }
  if (audioTrack) audioTrack.enabled = settings.audio;
}

async function measureRtt() {
  const start = performance.now();
  try {
    await fetch(backend('/api/health'), { cache: 'no-store' });
    return Math.round(performance.now() - start);
  } catch {
    return 1000;
  }
}

async function measurePacketLoss() {
  const sender = state.peerConnection?.getSenders().find((item) => item.track?.kind === 'audio');
  if (!sender) return Number($('packetLossPercent').value || 0);
  const reports = await sender.getStats().catch(() => null);
  if (!reports) return 0;
  let packetsSent = 0;
  let packetsLost = 0;
  reports.forEach((report) => {
    if (report.type === 'outbound-rtp') {
      packetsSent += report.packetsSent || 0;
      packetsLost += report.packetsLost || 0;
    }
  });
  return packetsSent ? Number(((packetsLost / (packetsSent + packetsLost)) * 100).toFixed(2)) : 0;
}

async function sendQuality() {
  if (!state.roomId) return;
  const rttMs = Number($('rttMs').value);
  const packetLossPercent = Number($('packetLossPercent').value);
  if (!Number.isFinite(rttMs) || !Number.isFinite(packetLossPercent)) return;

  if (state.socket?.connected) {
    state.socket.emit('quality:update', { roomId: state.roomId, rttMs, packetLossPercent }, (result) => {
      if (result?.success) setTier(result);
      log(result?.success ? `Socket quality: ${result.tier}` : `Socket quality error: ${result?.error}`);
    });
    return;
  }

  const response = await fetch(backend(`/api/doctors/calls/${encodeURIComponent(state.roomId)}/quality`), {
    method: 'POST', headers: apiHeaders(), body: JSON.stringify({ rttMs, packetLossPercent }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Quality update failed');
  setTier(result.data);
  log(`REST quality: ${result.data.tier}`);
}

function connectSocket() {
  state.socket = window.io(state.backendUrl, { transports: ['websocket', 'polling'], auth: { token: $('authToken').value.trim() } });
  state.socket.on('connect', () => {
    setConnection('Connected', 'live');
    state.socket.emit('join', state.roomId, (result) => {
      if (!result?.success) {
        log(`Room join rejected: ${result?.error}`);
        state.socket.disconnect();
        return;
      }
      log('Socket joined call room');
    });
  });
  state.socket.on('disconnect', () => setConnection('Disconnected', 'error'));
  state.socket.on('quality:changed', (quality) => { setTier(quality); log(`Tier broadcast: ${quality.tier}`); });
  state.socket.on('peer-joined', ({ id }) => { log(`Peer joined: ${id}`); if (state.mode === 'webrtc') makeOffer(); });
  state.socket.on('offer', async ({ from, offer }) => { await ensurePeer(); await state.peerConnection.setRemoteDescription(offer); const answer = await state.peerConnection.createAnswer(); await state.peerConnection.setLocalDescription(answer); state.socket.emit('answer', { roomId: state.roomId, answer, to: from }); });
  state.socket.on('answer', async ({ answer }) => { await state.peerConnection?.setRemoteDescription(answer); });
  state.socket.on('ice-candidate', async ({ candidate }) => { if (candidate) await state.peerConnection?.addIceCandidate(candidate).catch(() => {}); });
  state.socket.on('call:ended', () => { log('Call ended by the other participant'); stopMedia(false); });
}

async function ensurePeer() {
  if (state.peerConnection) return;
  state.peerConnection = new RTCPeerConnection();
  state.peerConnection.onicecandidate = ({ candidate }) => { if (candidate) state.socket.emit('ice-candidate', { roomId: state.roomId, candidate }); };
  state.peerConnection.ontrack = ({ streams }) => { $('remoteVideo').srcObject = streams[0]; };
  state.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  $('localVideo').srcObject = state.localStream;
  state.localStream.getTracks().forEach((track) => state.peerConnection.addTrack(track, state.localStream));
  await applyMediaTier(state.tier);
}

async function makeOffer() {
  await ensurePeer();
  const offer = await state.peerConnection.createOffer();
  await state.peerConnection.setLocalDescription(offer);
  state.socket.emit('offer', { roomId: state.roomId, offer });
}

async function activateCall({ roomId, mode, initialTier = 'unknown', roomUrl = roomId }) {
  state.roomId = roomId;
  state.mode = mode;
  state.participantRole = $('participantRole').value;
  $('roomIdLabel').textContent = String(roomId).slice(0, 18);
  $('existingRoomId').value = roomId;
  $('modeTitle').textContent = `${state.participantRole === 'doctor' ? 'Doctor dashboard' : 'Patient consultation'} - ${mode === 'daily' ? 'Daily.co' : 'Raw WebRTC'}`;
  $('leaveButton').disabled = false;
  $('sendQualityButton').disabled = false;
  $('vitalsButton').disabled = false;
  $('assessmentButton').disabled = false;
  $('joinButton').disabled = true;
  $('openDoctorButton').classList.toggle('hidden', state.participantRole === 'doctor');
  if (!state.consultationId) {
    const consultationResponse = await fetch(backend(`/api/doctors/calls/${encodeURIComponent(roomId)}/consultation`), { headers: apiHeaders() });
    if (consultationResponse.ok) {
      const consultationResult = await consultationResponse.json();
      state.consultationId = consultationResult.data?._id || null;
    }
  }
  setTier({ tier: initialTier, rttMs: null, packetLossPercent: null });
  connectSocket();
  startQualityPolling();
  if (mode === 'daily') await startDaily(roomUrl); else await ensurePeer();
}

function openDoctorDashboard() {
  if (!state.roomId) return;
  const params = new URLSearchParams({
    role: 'doctor',
    room: state.roomId,
    mode: state.mode,
    backend: state.backendUrl,
    doctor: $('doctorId').value.trim(),
    patient: $('patientId').value.trim(),
  });
  const doctorWindow = window.open(`${window.location.pathname}?${params.toString()}`, '_blank');
  if (!doctorWindow) log('Popup blocked. Copy the room ID and open this page in a second tab.');
}

async function createRoom(event) {
  event.preventDefault();
  if (!$('consentAccepted').checked) {
    $('setupMessage').textContent = 'Consent is required before starting the consultation.';
    return;
  }
  await stopMedia(false);
  state.backendUrl = $('backendUrl').value.replace(/\/$/, '');
  state.mode = $('callMode').value;
  const payload = { doctorId: $('doctorId').value.trim(), patientId: $('patientId').value.trim(), consent: true, rttMs: Number($('rttMs').value), packetLossPercent: Number($('packetLossPercent').value) };
  const endpoint = state.mode === 'daily' ? '/api/doctors/create-daily-room' : '/api/doctors/create-room';
  try {
    const response = await fetch(backend(endpoint), { method: 'POST', headers: apiHeaders(), body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Room creation failed');
    state.consultationId = result.consultationId || null;
    await activateCall({ roomId: state.mode === 'daily' ? result.roomUrl : result.roomId, mode: state.mode, initialTier: result.networkTier || 'unknown', roomUrl: result.roomUrl });
    $('setupMessage').textContent = 'Room is ready.'; log(`Created ${state.mode} room`);
  } catch (error) { setConnection('Error', 'error'); $('setupMessage').textContent = error.message; log(error.message); }
}

async function joinRoom() {
  await stopMedia(false);
  state.backendUrl = $('backendUrl').value.replace(/\/$/, '');
  const roomId = $('existingRoomId').value.trim();
  const mode = $('callMode').value;
  if (!roomId) {
    $('setupMessage').textContent = 'Enter an existing room ID first.';
    return;
  }

  try {
    await activateCall({ roomId, mode, roomUrl: roomId });
    $('setupMessage').textContent = `${state.participantRole === 'doctor' ? 'Doctor dashboard' : 'Participant'} joined the room.`;
    log(`Joined existing ${mode} room as ${state.participantRole}`);
  } catch (error) {
    setConnection('Error', 'error');
    $('setupMessage').textContent = error.message;
    log(error.message);
  }
}

async function startDaily(roomUrl) {
  if (roomUrl.startsWith('demo://')) {
    $('webrtcContainer').classList.remove('hidden');
    $('dailyContainer').classList.add('hidden');
    $('mediaMessage').textContent = 'Demo mode: Daily.co room creation was simulated. Use Raw WebRTC for a live browser call.';
    return;
  }
  if (!window.DailyIframe) throw new Error('Daily SDK failed to load');
  $('webrtcContainer').classList.add('hidden'); $('dailyContainer').classList.remove('hidden');
  state.dailyCall = window.DailyIframe.createFrame($('dailyContainer'), { showLeaveButton: false, iframeStyle: { width: '100%', height: '520px' } });
  const roomName = new URL(roomUrl).pathname.split('/').filter(Boolean).pop();
  const tokenResponse = await fetch(backend(`/api/doctors/daily-room/${encodeURIComponent(roomName)}/token`), { method: 'POST', headers: apiHeaders() });
  const tokenResult = await tokenResponse.json();
  if (!tokenResponse.ok) throw new Error(tokenResult.error || 'Unable to get Daily room token');
  await state.dailyCall.join({ url: roomUrl, token: tokenResult.token });
  await applyMediaTier(state.tier);
}

function startQualityPolling() {
  clearInterval(state.qualityTimer);
  state.qualityTimer = setInterval(async () => {
    $('rttMs').value = await measureRtt(); $('packetLossPercent').value = await measurePacketLoss();
    await sendQuality().catch((error) => log(error.message));
  }, 10000);
}

async function saveVitals() {
  if (!state.roomId) return;
  const body = { source: 'patient', heartRateBpm: Number($('heartRate').value) || undefined, oxygenSaturationPercent: Number($('oxygenSaturation').value) || undefined, systolicBp: Number($('systolicBp').value) || undefined, diastolicBp: Number($('diastolicBp').value) || undefined };
  const response = await fetch(backend(`/api/doctors/calls/${encodeURIComponent(state.roomId)}/vitals`), { method: 'POST', headers: apiHeaders(), body: JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Vitals save failed'); log('Vitals saved to call');
}

async function saveAssessment() {
  if (!state.consultationId) return;
  const response = await fetch(backend(`/api/doctors/consultations/${encodeURIComponent(state.consultationId)}`), {
    method: 'PATCH',
    headers: apiHeaders(),
    body: JSON.stringify({
      symptoms: $('symptoms').value,
      assessment: $('assessment').value,
      advice: $('advice').value,
      outcome: 'not_urgent',
      status: 'completed',
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Assessment save failed');
  log('Consultation assessment saved');
}

async function stopMedia(recordEnd = true) {
  clearInterval(state.qualityTimer);
  if (recordEnd && state.roomId) await fetch(backend(`/api/doctors/calls/${encodeURIComponent(state.roomId)}/end`), { method: 'POST', headers: apiHeaders(), body: JSON.stringify({ reason: 'normal' }) }).catch(() => {});
  if (state.dailyCall) { await state.dailyCall.leave().catch(() => {}); state.dailyCall.destroy(); state.dailyCall = null; }
  state.localStream?.getTracks().forEach((track) => track.stop()); state.localStream = null;
  state.peerConnection?.close(); state.peerConnection = null;
  state.socket?.disconnect(); state.socket = null;
  $('localVideo').srcObject = null; $('remoteVideo').srcObject = null; $('dailyContainer').replaceChildren(); $('dailyContainer').classList.add('hidden'); $('webrtcContainer').classList.remove('hidden');
  if (recordEnd) { state.roomId = null; state.consultationId = null; $('leaveButton').disabled = true; $('joinButton').disabled = false; $('openDoctorButton').classList.add('hidden'); $('sendQualityButton').disabled = true; $('vitalsButton').disabled = true; $('assessmentButton').disabled = true; $('modeTitle').textContent = 'No active call'; setConnection('Disconnected'); log('Call ended'); }
}

$('setupForm').addEventListener('submit', createRoom);
$('participantRole').addEventListener('change', updateDashboardRole);
$('patientForm').addEventListener('submit', saveAshaPatient);
$('ashaVitalsForm').addEventListener('submit', saveAshaVitals);
$('patientSearch').addEventListener('input', renderAshaPatients);
$('syncButton').addEventListener('click', syncAshaPatients);
$('joinButton').addEventListener('click', () => joinRoom());
$('openDoctorButton').addEventListener('click', openDoctorDashboard);
$('authToken').addEventListener('input', () => sessionStorage.setItem('teleconsultationToken', $('authToken').value.trim()));
$('leaveButton').addEventListener('click', () => stopMedia(true));
$('sendQualityButton').addEventListener('click', () => sendQuality().catch((error) => log(error.message)));
$('vitalsButton').addEventListener('click', () => saveVitals().catch((error) => log(error.message)));
$('assessmentButton').addEventListener('click', () => saveAssessment().catch((error) => log(error.message)));
document.querySelectorAll('[data-rtt]').forEach((button) => button.addEventListener('click', () => { $('rttMs').value = button.dataset.rtt; $('packetLossPercent').value = button.dataset.loss; sendQuality().catch((error) => log(error.message)); }));
window.addEventListener('beforeunload', () => { if (state.roomId) navigator.sendBeacon(backend(`/api/doctors/calls/${encodeURIComponent(state.roomId)}/end`), JSON.stringify({ reason: 'patient_left' })); });

const query = new URLSearchParams(window.location.search);
if (query.get('room')) {
  $('consentAccepted').checked = true;
  $('participantRole').value = query.get('role') || 'doctor';
  $('existingRoomId').value = query.get('room');
  $('callMode').value = query.get('mode') || 'webrtc';
  $('backendUrl').value = query.get('backend') || $('backendUrl').value;
  $('doctorId').value = query.get('doctor') || 'demo-doctor';
  $('patientId').value = query.get('patient') || 'demo-patient';
  setTimeout(() => joinRoom(), 300);
}

updateDashboardRole();

function getAshaPatients() {
  return JSON.parse(localStorage.getItem('ashaPatients') || '[]');
}

function saveAshaPatients(patients) {
  localStorage.setItem('ashaPatients', JSON.stringify(patients));
}

function updateSyncBadge() {
  const pending = getAshaPatients().filter((patient) => patient.syncStatus === 'pending').length;
  $('syncBadge').textContent = `${pending} pending`;
  $('syncBadge').className = `badge ${pending ? 'error' : 'live'}`;
}

function renderAshaPatients() {
  const query = $('patientSearch').value.trim().toLowerCase();
  const patients = getAshaPatients().filter((patient) => `${patient.name} ${patient.contact}`.toLowerCase().includes(query));
  $('patientList').innerHTML = patients.length ? patients.map((patient) => `
    <article class="patient-card">
      <strong>${patient.name}</strong>
      <small>${patient.age || 'Age not set'} | ${patient.gender} | ${patient.contact || 'No contact'}</small>
      <small>${patient.symptoms || 'No symptoms recorded'} | ${patient.syncStatus === 'pending' ? 'Pending sync' : 'Synced'}</small>
      <div class="patient-actions">
        <button type="button" data-select-patient="${patient.id}">Vitals</button>
        <button type="button" data-start-patient="${patient.id}">Start consultation</button>
      </div>
    </article>`).join('') : '<p class="message">No patients found. Register the first patient.</p>';
  updateSyncBadge();
  document.querySelectorAll('[data-select-patient]').forEach((button) => button.addEventListener('click', () => selectAshaPatient(button.dataset.selectPatient)));
  document.querySelectorAll('[data-start-patient]').forEach((button) => button.addEventListener('click', () => startAshaConsultation(button.dataset.startPatient)));
}

function selectAshaPatient(patientId) {
  const patient = getAshaPatients().find((item) => item.id === patientId);
  if (!patient) return;
  state.selectedPatientId = patient.id;
  $('ashaVitalsForm').classList.remove('hidden');
  $('selectedPatientLabel').textContent = `${patient.name} - ${patient.symptoms || 'No symptoms recorded'}`;
  $('ashaPatientSymptoms').value = patient.symptoms || '';
  $('patientId').value = patient.id;
}

function startAshaConsultation(patientId) {
  selectAshaPatient(patientId);
  $('participantRole').value = 'asha';
  $('consentAccepted').checked = true;
  $('doctorId').value = $('doctorId').value.trim() || 'demo-doctor';
  createRoom({ preventDefault() {} });
}

function saveAshaPatient(event) {
  event.preventDefault();
  const patient = {
    id: `local-patient-${Date.now()}`,
    name: $('ashaPatientName').value.trim(),
    age: $('ashaPatientAge').value,
    gender: $('ashaPatientGender').value,
    contact: $('ashaPatientContact').value.trim(),
    symptoms: $('ashaPatientSymptoms').value.trim(),
    syncStatus: 'pending',
    createdAt: new Date().toISOString(),
  };
  const patients = getAshaPatients();
  patients.unshift(patient);
  saveAshaPatients(patients);
  $('patientForm').reset();
  $('patientMessage').textContent = 'Patient saved locally and queued for sync.';
  renderAshaPatients();
}

function saveAshaVitals(event) {
  event.preventDefault();
  const patients = getAshaPatients();
  const index = patients.findIndex((patient) => patient.id === state.selectedPatientId);
  if (index < 0) return;
  patients[index].vitals = {
    temperatureC: Number($('ashaTemperature').value) || undefined,
    heartRateBpm: Number($('ashaHeartRate').value) || undefined,
    oxygenSaturationPercent: Number($('ashaOxygen').value) || undefined,
    respiratoryRateBpm: Number($('ashaRespiratory').value) || undefined,
    systolicBp: Number($('ashaSystolic').value) || undefined,
    diastolicBp: Number($('ashaDiastolic').value) || undefined,
    recordedAt: new Date().toISOString(),
  };
  patients[index].syncStatus = 'pending';
  saveAshaPatients(patients);
  if (state.roomId) saveVitals().catch((error) => log(error.message));
  $('patientMessage').textContent = 'Vitals saved locally.';
  renderAshaPatients();
}

function syncAshaPatients() {
  const patients = getAshaPatients().map((patient) => ({ ...patient, syncStatus: 'synced', syncedAt: new Date().toISOString() }));
  saveAshaPatients(patients);
  $('patientMessage').textContent = 'Local records marked synced for demo testing.';
  renderAshaPatients();
}

function updateDashboardRole() {
  const isAsha = $('participantRole').value === 'asha';
  $('ashaDashboard').classList.toggle('hidden', !isAsha);
  if (isAsha) renderAshaPatients();
}