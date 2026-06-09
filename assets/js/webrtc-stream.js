/* assets/js/webrtc-stream.js ------------------------------------------------
   ChessKidoo Real-Time WebRTC Video/Audio Streaming System
   Leverages Supabase transient broadcast channels for low-latency P2P signaling.
   -------------------------------------------------------------------------- */

window.CK = window.CK || {};

CK.webrtc = (() => {
  // Dynamic window.supabaseClient reference is used to resolve async loading issues
  const WTC = {};

  let localStream = null;
  let peerConnections = {}; // studentId -> RTCPeerConnection (Coach side)
  let studentPeerConnection = null; // Single RTCPeerConnection (Student side)
  let webrtcChannel = null;
  let isBroadcasting = false;
  const isListening = false;
  let streamMode = 'none'; // 'video' or 'audio' or 'none'
  let mediaRecorder = null;
  let recordedChunks = [];

  // Canvas drawing properties
  let animationFrameId = null;

  // STUN finds your public address but CANNOT relay media through restrictive
  // (symmetric) NATs — most home/mobile networks. For reliable, Google-Meet-style
  // video you MUST add a TURN server. Set window.APP_CONFIG.TURN_SERVERS in
  // config.js, e.g.:
  //   TURN_SERVERS: [{ urls: 'turn:your.turn.host:3478', username: 'u', credential: 'p' }]
  // (Free/cheap options: metered.ca, Twilio, or self-hosted coturn.)
  const ICE_CONFIG = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      ...((window.APP_CONFIG && Array.isArray(window.APP_CONFIG.TURN_SERVERS)) ? window.APP_CONFIG.TURN_SERVERS : [])
    ],
    iceCandidatePoolSize: 4
  };
  // Warn (once) if no TURN is configured, so it's obvious why video may not connect.
  if (!(window.APP_CONFIG && Array.isArray(window.APP_CONFIG.TURN_SERVERS) && window.APP_CONFIG.TURN_SERVERS.length)) {
    console.warn('[WebRTC] No TURN server configured (APP_CONFIG.TURN_SERVERS). Peer video may fail behind NAT/firewalls. Use the Google Meet join button for guaranteed video, or add a TURN server.');
  }

  /* ────────────────────────────────────────────────────────────────────────
     GENERAL UTILITIES & WAVEFORM FALLBACK
     ──────────────────────────────────────────────────────────────────────── */

  function getMyUserId() {
    return (window.CK && CK.currentUser && CK.currentUser.id) 
      ? CK.currentUser.id 
      : 'user-' + Math.random().toString(36).substring(2, 9);
  }

  function getMyUserName() {
    return (window.CK && CK.currentUser && CK.currentUser.full_name)
      ? CK.currentUser.full_name
      : 'Guest';
  }

  function startMockVisualizer(canvasIds, strokeColor) {
    stopMockVisualizer();
    const ids = Array.isArray(canvasIds) ? canvasIds : [canvasIds];
    const canvases = [];
    
    ids.forEach(id => {
      const canvas = document.getElementById(id);
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          canvas.width = canvas.parentElement.clientWidth || 320;
          canvas.height = canvas.parentElement.clientHeight || 140;
          canvases.push({ canvas, ctx });
        }
      }
    });
    
    if (canvases.length === 0) return;

    let phase = 0;

    function draw() {
      const connectedCanvases = canvases.filter(item => item.canvas.isConnected);
      if (connectedCanvases.length === 0) return;

      connectedCanvases.forEach(item => {
        const { canvas, ctx } = item;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Cyber background
        ctx.fillStyle = '#0b0f19';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw subtle grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }

        // Draw 3 layers of smooth audio sine waves
        const centerY = canvas.height / 2;
        const waveConfigs = [
          { freq: 0.015, amp: 22, speed: 0.05, opacity: 0.25 },
          { freq: 0.028, amp: 35, speed: 0.08, opacity: 0.45 },
          { freq: 0.045, amp: 15, speed: 0.12, opacity: 0.70 }
        ];

        waveConfigs.forEach(w => {
          ctx.beginPath();
          ctx.strokeStyle = strokeColor || '#06b6d4';
          ctx.lineWidth = w.opacity * 4;
          ctx.globalAlpha = w.opacity;

          for (let x = 0; x < canvas.width; x++) {
            // Modulate amplitude with another slower wave for realistic biological pulsing
            const modAmp = w.amp * (Math.sin(phase * 0.3) * 0.4 + 0.8);
            const y = centerY + Math.sin(x * w.freq + phase * w.speed) * modAmp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });

        // Digital scanning overlay
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#ffffff';
        for (let y = 0; y < canvas.height; y += 4) {
          ctx.fillRect(0, y, canvas.width, 1);
        }

        ctx.globalAlpha = 1.0;
      });

      phase += 0.5;
      animationFrameId = requestAnimationFrame(draw);
    }

    draw();
  }

  function stopMockVisualizer() {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  /* ────────────────────────────────────────────────────────────────────────
     AUTOMATED SESSION RECORDING
     ──────────────────────────────────────────────────────────────────────── */

  function startRecording() {
    if (!localStream) {
      console.warn("[WebRTC Recording] No localStream active to record.");
      return;
    }

    recordedChunks = [];
    try {
      let options = {};
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
        'audio/webm'
      ];
      for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          options = { mimeType: type };
          break;
        }
      }

      mediaRecorder = new MediaRecorder(localStream, options);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (recordedChunks.length > 0) {
          const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'video/webm' });
          await uploadRecording(blob);
        }
      };

      mediaRecorder.start(1000); // 1-second time slices
      console.log("[WebRTC Recording] MediaRecorder started with options:", options);
    } catch (err) {
      console.error("[WebRTC Recording] Failed to start MediaRecorder:", err);
    }
  }

  async function uploadRecording(blob) {
    const timestamp = Date.now();
    const fileName = `recordings/class_${timestamp}.webm`;

    CK.showToast("Uploading session recording...", "info");

    if (window.supabaseClient && navigator.onLine) {
      try {
        const { data, error } = await window.supabaseClient.storage
          .from('documents')
          .upload(fileName, blob, {
            contentType: blob.type || 'video/webm',
            cacheControl: '3600',
            upsert: true
          });

        if (error) throw error;

        console.log("[WebRTC Recording] Upload successful:", data);

        // Construct public URL
        const { data: urlData } = window.supabaseClient.storage
          .from('documents')
          .getPublicUrl(fileName);

        const publicUrl = urlData?.publicUrl || '';
        const coachName = getMyUserName();

        const classId = window.CK?.coach?._liveClassId || 'general';
        let className = 'Live Class Session';
        if (classId !== 'general' && window.CK?.coach?.classesDb) {
          const c = window.CK.coach.classesDb.find(x => x.id === classId);
          if (c) {
            className = c.class || c.title || className;
          }
        }

        // Save doc metadata of type 'recording'
        await CK.db.saveDocument({
          name: `${className} - ${new Date().toLocaleDateString()}`,
          file_name: fileName,
          link: publicUrl,
          level: 'All Levels',
          coach: coachName,
          batch: 'All Batches',
          type: 'recording',
          notes: `Automated recording of session starting at ${new Date(timestamp).toLocaleString()}`,
          created_at: new Date().toISOString()
        });

        CK.showToast("✓ Session recording auto-saved successfully!", "success");
      } catch (err) {
        console.error("[WebRTC Recording] Supabase upload/save failed, falling back:", err);
        CK.showToast("⚠️ Recording upload failed. Saved locally only.", "warning");
        await saveLocalRecordingFallback(fileName, timestamp);
      }
    } else {
      console.warn("[WebRTC Recording] Offline or Supabase not available. Local fallback saved.");
      CK.showToast("⚠️ Offline: Recording saved locally.", "warning");
      await saveLocalRecordingFallback(fileName, timestamp);
    }
  }

  async function saveLocalRecordingFallback(fileName, timestamp) {
    const classId = window.CK?.coach?._liveClassId || 'general';
    let className = 'Live Class Session';
    if (classId !== 'general' && window.CK?.coach?.classesDb) {
      const c = window.CK.coach.classesDb.find(x => x.id === classId);
      if (c) {
        className = c.class || c.title || className;
      }
    }

    await CK.db.saveDocument({
      id: 'rec-' + timestamp,
      name: `${className} - ${new Date().toLocaleDateString()} (Local)`,
      file_name: fileName,
      link: '',
      level: 'All Levels',
      coach: getMyUserName(),
      batch: 'All Batches',
      type: 'recording',
      notes: `Local fallback for recording ${timestamp}`,
      created_at: new Date().toISOString()
    });
  }

  /* ────────────────────────────────────────────────────────────────────────
     COACH STREAMING FUNCTIONS
     ──────────────────────────────────────────────────────────────────────── */

  function toggleStreamButtons(isLive) {
    const btnStart = document.getElementById('btnStartStream');
    const btnStartCC = document.getElementById('btnStartStreamCC');
    const btnStartAudio = document.getElementById('btnStartAudioStream');
    const btnStartAudioCC = document.getElementById('btnStartAudioStreamCC');
    const btnStop = document.getElementById('btnStopStream');
    const btnStopCC = document.getElementById('btnStopStreamCC');
    
    const cmdEl = document.getElementById('coachCommandCenter');
    const isCCVisible = cmdEl && cmdEl.style.display !== 'none';

    if (isLive) {
      if (btnStart) btnStart.style.display = 'none';
      if (btnStartCC) btnStartCC.style.display = 'none';
      if (btnStartAudio) btnStartAudio.style.display = 'none';
      if (btnStartAudioCC) btnStartAudioCC.style.display = 'none';
      if (btnStop) btnStop.style.display = 'block';
      if (btnStopCC && isCCVisible) btnStopCC.style.display = 'block';
    } else {
      if (btnStart) btnStart.style.display = 'block';
      if (btnStartCC && isCCVisible) btnStartCC.style.display = 'block';
      if (btnStartAudio) btnStartAudio.style.display = 'block';
      if (btnStartAudioCC && isCCVisible) btnStartAudioCC.style.display = 'block';
      if (btnStop) btnStop.style.display = 'none';
      if (btnStopCC) btnStopCC.style.display = 'none';
    }
  }

  WTC.isBroadcasting = () => isBroadcasting;
  WTC.toggleStreamButtons = toggleStreamButtons;

  WTC.startBroadcast = async (videoEnabled, audioEnabled) => {
    if (!window.supabaseClient) {
      CK.showToast("Database not connected. WebRTC signaling unavailable.", "error");
      return;
    }

    WTC.stopBroadcast();
    streamMode = videoEnabled ? 'video' : 'audio';

    console.log(`[WebRTC Coach] Initializing stream. Video: ${videoEnabled}, Audio: ${audioEnabled}`);
    
    // 1. Update Coach Preview container
    const previewBox = document.getElementById('ccLiveVideoPreviewBox');
    if (previewBox) {
      previewBox.style.display = 'flex';
      previewBox.innerHTML = `
        <video id="ccLocalVideo" autoplay playsinline muted style="width:100%; height:100%; object-fit:cover; border-radius:6px; display:none;"></video>
        <canvas id="ccLocalCanvas" style="width:100%; height:100%; border-radius:6px; display:none;"></canvas>
        <div id="ccPreviewOverlay" style="position:absolute; bottom:6px; left:8px; background:rgba(0,0,0,0.65); padding:2px 8px; border-radius:4px; font-size:0.65rem; color:#fff; display:flex; align-items:center; gap:6px;">
          <span style="width:6px; height:6px; background:#22c55e; border-radius:50%; display:inline-block; animation: pulseGlow 1.5s infinite;"></span>
          <span>Local Feed (Broadcasting)</span>
        </div>
      `;
    }

    const videoEl1 = document.getElementById('ccLocalVideo');
    const videoEl2 = document.getElementById('ccFeedVideo');
    const canvasEl1 = document.getElementById('ccLocalCanvas');
    const canvasEl2 = document.getElementById('ccFeedCanvas');
    const defaultEmoji = document.getElementById('ccDefaultEmoji');

    // 2. Acquire media tracks
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        video: videoEnabled ? { width: 320, height: 240, frameRate: 15 } : false,
        audio: audioEnabled
      });

      if (defaultEmoji) defaultEmoji.style.display = 'none';

      if (videoEnabled) {
        if (videoEl1) {
          videoEl1.srcObject = localStream;
          videoEl1.style.display = 'block';
        }
        if (videoEl2) {
          videoEl2.srcObject = localStream;
          videoEl2.style.display = 'block';
        }
        if (canvasEl1) canvasEl1.style.display = 'none';
        if (canvasEl2) canvasEl2.style.display = 'none';
      } else {
        if (videoEl1) videoEl1.style.display = 'none';
        if (videoEl2) videoEl2.style.display = 'none';
        if (canvasEl1) canvasEl1.style.display = 'block';
        if (canvasEl2) canvasEl2.style.display = 'block';
        startMockVisualizer(['ccLocalCanvas', 'ccFeedCanvas'], '#22d4bf'); // teal audio wave
      }
      CK.showToast("🎙️ Broadcasting stream capture active!", "success");
    } catch (e) {
      console.warn("[WebRTC Coach] Media acquire failed. Falling back to Mock Visualizer.", e);
      if (defaultEmoji) defaultEmoji.style.display = 'none';
      if (videoEl1) videoEl1.style.display = 'none';
      if (videoEl2) videoEl2.style.display = 'none';
      if (canvasEl1) canvasEl1.style.display = 'block';
      if (canvasEl2) canvasEl2.style.display = 'block';
      startMockVisualizer(['ccLocalCanvas', 'ccFeedCanvas'], '#f59e0b'); // amber wave
      localStream = null;
      CK.showToast("⚠️ Camera/Mic unavailable. Started Animated Stream Fallback.", "warning");
    }

    isBroadcasting = true;
    
    // Toggle dashboard buttons
    toggleStreamButtons(true);

    // Update status badge
    const badge = document.getElementById('ccStreamStatusBadge');
    if (badge) {
      badge.innerHTML = '● LIVE';
      badge.style.color = '#10b981';
      badge.style.opacity = '1';
    }

    // 3. Set up signaling channel
    _setupSignalingChannel(true);

    // 4. Start recording if localStream is active
    if (localStream) {
      startRecording();
    }
  };

  WTC.stopBroadcast = () => {
    console.log("[WebRTC Coach] Closing broadcast session...");
    isBroadcasting = false;
    streamMode = 'none';
    stopMockVisualizer();

    // Stop MediaRecorder if recording
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try {
        mediaRecorder.stop();
      } catch (err) {
        console.error("[WebRTC Recording] Error stopping MediaRecorder:", err);
      }
    }
    mediaRecorder = null;

    // Reset buttons
    toggleStreamButtons(false);

    // Update status badge
    const badge = document.getElementById('ccStreamStatusBadge');
    if (badge) {
      badge.innerHTML = '● OFFLINE';
      badge.style.color = '';
      badge.style.opacity = '0.6';
    }

    const previewBox = document.getElementById('ccLiveVideoPreviewBox');
    if (previewBox) {
      previewBox.style.display = 'none';
      previewBox.innerHTML = '';
    }

    // Reset Command Center Video feed to emoji
    const videoEl2 = document.getElementById('ccFeedVideo');
    const canvasEl2 = document.getElementById('ccFeedCanvas');
    const defaultEmoji = document.getElementById('ccDefaultEmoji');
    if (videoEl2) {
      videoEl2.srcObject = null;
      videoEl2.style.display = 'none';
    }
    if (canvasEl2) {
      canvasEl2.style.display = 'none';
    }
    if (defaultEmoji) {
      defaultEmoji.style.display = 'block';
    }

    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    // Close all peer connections to students
    Object.keys(peerConnections).forEach(studentId => {
      if (peerConnections[studentId]) {
        peerConnections[studentId].close();
      }
    });
    peerConnections = {};

    // Notify clients that broadcast has ended
    if (webrtcChannel) {
      webrtcChannel.send({
        type: 'broadcast',
        event: 'stream-stopped',
        payload: { coachId: getMyUserId() }
      });
      if (window.supabaseClient && typeof window.supabaseClient.removeChannel === 'function') {
        window.supabaseClient.removeChannel(webrtcChannel);
      }
      webrtcChannel = null;
    }
  };

  /* ────────────────────────────────────────────────────────────────────────
     STUDENT RECEIVER FUNCTIONS
     ──────────────────────────────────────────────────────────────────────── */

  WTC.joinStream = () => {
    if (!window.supabaseClient) return;
    console.log("[WebRTC Student] Joining Stream Session...");

    const videoBox = document.getElementById('scLiveVideoBox');
    if (videoBox) {
      videoBox.innerHTML = `
        <video id="scLiveVideo" autoplay playsinline style="width:100%; height:100%; object-fit:cover; border-radius:6px; display:none;"></video>
        <canvas id="scLiveCanvas" style="width:100%; height:100%; border-radius:6px; display:none;"></canvas>
        <div id="scLiveVideoPlaceholder" style="text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div class="sc-radar-radar" style="width:50px; height:50px; border-radius:50%; border:2px solid rgba(6, 182, 212, 0.4); animation: radarPulse 1.8s infinite ease-out; display:flex; align-items:center; justify-content:center;">📡</div>
          <span style="font-size:0.78rem; color:var(--p-text-muted);">Waiting for coach to go live...</span>
        </div>
        <div id="scStreamControls" style="position:absolute; bottom:6px; right:8px; display:none; gap:8px; align-items:center; background:rgba(0,0,0,0.65); padding:4px 8px; border-radius:6px;">
          <button id="btnStudentMute" class="p-btn p-btn-ghost p-btn-sm" style="padding:0; background:transparent; border:none; color:#fff; font-size:0.8rem; cursor:pointer;" onclick="CK.webrtc.toggleStudentVolume()">🔇</button>
          <input id="sliderStudentVolume" type="range" min="0" max="1" step="0.05" value="0" style="width:50px; height:4px; accent-color:#06b6d4; cursor:pointer; margin:0;" oninput="CK.webrtc.changeStudentVolume(this.value)">
        </div>
      `;
    }

    _setupSignalingChannel(false);
  };

  WTC.leaveStream = () => {
    console.log("[WebRTC Student] Cleaning stream feeds...");
    stopMockVisualizer();

    const videoEl = document.getElementById('scLiveVideo');
    if (videoEl) {
      videoEl.srcObject = null;
    }

    if (studentPeerConnection) {
      studentPeerConnection.close();
      studentPeerConnection = null;
    }

    if (webrtcChannel) {
      if (window.supabaseClient && typeof window.supabaseClient.removeChannel === 'function') {
        window.supabaseClient.removeChannel(webrtcChannel);
      }
      webrtcChannel = null;
    }
  };

  WTC.changeStudentVolume = (val) => {
    const videoEl = document.getElementById('scLiveVideo');
    const btn = document.getElementById('btnStudentMute');
    if (!videoEl) return;
    const volumeVal = parseFloat(val);
    videoEl.volume = volumeVal;
    if (volumeVal > 0) {
      videoEl.muted = false;
      if (btn) btn.textContent = '🔊';
    } else {
      videoEl.muted = true;
      if (btn) btn.textContent = '🔇';
    }
  };

  WTC.toggleStudentVolume = () => {
    const videoEl = document.getElementById('scLiveVideo');
    const btn = document.getElementById('btnStudentMute');
    const slider = document.getElementById('sliderStudentVolume');
    if (!videoEl || !btn) return;

    if (videoEl.muted || videoEl.volume === 0) {
      videoEl.muted = false;
      const targetVolume = (videoEl.volume > 0) ? videoEl.volume : 0.5;
      videoEl.volume = targetVolume;
      btn.textContent = '🔊';
      if (slider) slider.value = targetVolume;
    } else {
      videoEl.muted = true;
      videoEl.volume = 0;
      btn.textContent = '🔇';
      if (slider) slider.value = 0;
    }
  };

  /* ────────────────────────────────────────────────────────────────────────
     SIGNALING LAYER (SUPABASE BROADCAST)
     ──────────────────────────────────────────────────────────────────────── */

  function _setupSignalingChannel(isCoach) {
    if (webrtcChannel && window.supabaseClient && typeof window.supabaseClient.removeChannel === 'function') {
      window.supabaseClient.removeChannel(webrtcChannel);
    }

    if (window.supabaseClient && typeof window.supabaseClient.channel === 'function') {
      webrtcChannel = window.supabaseClient.channel('webrtc-classroom-signals');
    } else {
      console.warn("[WebRTC Signaling] Supabase client or channel API not available.");
      return;
    }

    webrtcChannel
      .on('broadcast', { event: 'join-request' }, (packet) => {
        if (isCoach && isBroadcasting) {
          const studentId = packet.payload.studentId;
          console.log(`[WebRTC Coach] Student join-request from ${packet.payload.studentName} (${studentId})`);
          _initiateCoachConnection(studentId);
        }
      })
      .on('broadcast', { event: 'offer' }, async (packet) => {
        if (!isCoach && packet.payload.targetId === getMyUserId()) {
          console.log(`[WebRTC Student] Received WebRTC offer from Coach`);
          await _acceptOffer(packet.payload.senderId, packet.payload.offer);
        }
      })
      .on('broadcast', { event: 'answer' }, async (packet) => {
        if (isCoach && isBroadcasting && packet.payload.targetId === getMyUserId()) {
          console.log(`[WebRTC Coach] Received WebRTC answer from student: ${packet.payload.senderId}`);
          const pc = peerConnections[packet.payload.senderId];
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(packet.payload.answer));
          }
        }
      })
      .on('broadcast', { event: 'candidate' }, async (packet) => {
        if (packet.payload.targetId === getMyUserId()) {
          const pc = isCoach ? peerConnections[packet.payload.senderId] : studentPeerConnection;
          if (pc) {
            console.log(`[WebRTC] Received ICE candidate from ${packet.payload.senderId}`);
            try {
              await pc.addIceCandidate(new RTCIceCandidate(packet.payload.candidate));
            } catch (e) {
              console.error("[WebRTC] Error adding ICE candidate", e);
            }
          }
        }
      })
      .on('broadcast', { event: 'stream-status' }, (packet) => {
        if (!isCoach) {
          console.log(`[WebRTC Student] Stream Status: `, packet.payload);
          _handleStreamStatusUpdate(packet.payload);
        }
      })
      .on('broadcast', { event: 'stream-stopped' }, (packet) => {
        if (!isCoach) {
          console.log("[WebRTC Student] Stream was stopped by Coach.");
          WTC.joinStream(); // Reset to waiting state
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          if (isCoach) {
            // Tell everyone the stream is active
            webrtcChannel.send({
              type: 'broadcast',
              event: 'stream-status',
              payload: { active: true, mode: streamMode, mock: !localStream, coachId: getMyUserId() }
            });

            // Send periodic updates
            const statusInterval = setInterval(() => {
              if (!isBroadcasting || !webrtcChannel) {
                clearInterval(statusInterval);
                return;
              }
              webrtcChannel.send({
                type: 'broadcast',
                event: 'stream-status',
                payload: { active: true, mode: streamMode, mock: !localStream, coachId: getMyUserId() }
              });
            }, 5000);
          } else {
            // Student sends join request to Coach
            webrtcChannel.send({
              type: 'broadcast',
              event: 'join-request',
              payload: { studentId: getMyUserId(), studentName: getMyUserName() }
            });
          }
        }
      });
  }

  /* ─── WebRTC Handshaking Logic ─── */

  async function _initiateCoachConnection(studentId) {
    if (peerConnections[studentId]) {
      peerConnections[studentId].close();
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    peerConnections[studentId] = pc;

    // Monitor state transitions for diagnostic logs
    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC Coach] Student Connection State with ${studentId}: ${pc.connectionState}`);
    };

    // Gather local tracks and feed into connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    // Capture local ICE candidates and send to target student
    pc.onicecandidate = (event) => {
      if (event.candidate && webrtcChannel) {
        webrtcChannel.send({
          type: 'broadcast',
          event: 'candidate',
          payload: { targetId: studentId, senderId: getMyUserId(), candidate: event.candidate }
        });
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      webrtcChannel.send({
        type: 'broadcast',
        event: 'offer',
        payload: { targetId: studentId, senderId: getMyUserId(), offer }
      });
    } catch (e) {
      console.error("[WebRTC Coach] Failed creating WebRTC offer for student " + studentId, e);
    }
  }

  async function _acceptOffer(coachId, offer) {
    if (studentPeerConnection) {
      studentPeerConnection.close();
    }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    studentPeerConnection = pc;

    pc.onconnectionstatechange = () => {
      console.log(`[WebRTC Student] Connection state with Coach: ${pc.connectionState}`);
    };

    // When connection completes and remote track arrives, bind it
    pc.ontrack = (event) => {
      console.log("[WebRTC Student] Media stream track received from Coach");
      const videoEl = document.getElementById('scLiveVideo');
      const placeholder = document.getElementById('scLiveVideoPlaceholder');
      const ctr = document.getElementById('scStreamControls');

      if (videoEl && event.streams[0]) {
        stopMockVisualizer();
        const canvasEl = document.getElementById('scLiveCanvas');
        if (canvasEl) canvasEl.style.display = 'none';

        videoEl.srcObject = event.streams[0];
        videoEl.style.display = 'block';
        videoEl.muted = true; // Auto mute to prevent browser block autoplay

        if (placeholder) placeholder.style.display = 'none';
        if (ctr) ctr.style.display = 'flex';
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && webrtcChannel) {
        webrtcChannel.send({
          type: 'broadcast',
          event: 'candidate',
          payload: { targetId: coachId, senderId: getMyUserId(), candidate: event.candidate }
        });
      }
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      webrtcChannel.send({
        type: 'broadcast',
        event: 'answer',
        payload: { targetId: coachId, senderId: getMyUserId(), answer }
      });
    } catch (e) {
      console.error("[WebRTC Student] Error generating answer", e);
    }
  }

  function _handleStreamStatusUpdate(status) {
    const placeholder = document.getElementById('scLiveVideoPlaceholder');
    const canvasEl = document.getElementById('scLiveCanvas');
    const videoEl = document.getElementById('scLiveVideo');
    const ctr = document.getElementById('scStreamControls');

    if (!status.active) {
      WTC.leaveStream();
      return;
    }

    // If Coach stream is in MOCK mode (or we have no PeerConnection tracks yet), start mock visualizer
    if (status.mock) {
      if (videoEl) videoEl.style.display = 'none';
      if (placeholder) placeholder.style.display = 'none';
      if (canvasEl) {
        canvasEl.style.display = 'block';
        startMockVisualizer('scLiveCanvas', '#06b6d4');
      }
      if (ctr) ctr.style.display = 'none';
    } else {
      // Stream is real, waiting for tracks.
      // If we don't receive peer connection tracks, we can default to a glowing video visualizer
      if (!studentPeerConnection || studentPeerConnection.connectionState !== 'connected') {
        if (videoEl) videoEl.style.display = 'none';
        if (canvasEl) {
          canvasEl.style.display = 'block';
          startMockVisualizer('scLiveCanvas', '#22d4bf'); // Pulsing connection wave
        }
        if (placeholder) placeholder.style.display = 'none';
      }
    }
  }

  return WTC;
})();
