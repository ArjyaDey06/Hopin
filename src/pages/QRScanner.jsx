import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';
import { ArrowLeft, CheckCircle, XCircle, User, Hash, BookOpen, Camera, CameraOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const QRScanner = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const qrRef = useRef(null);       // Html5Qrcode instance
  const processingRef = useRef(false); // debounce: true while handling a scan

  useEffect(() => {
    fetchEvent();
    getCameras();
    return () => stopCamera();
  }, [id]);

  const fetchEvent = async () => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single();
    if (data) setEvent(data);
  };

  const getCameras = async () => {
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        // Prefer back camera on mobile, otherwise first camera (webcam on laptop)
        const back = devices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear'));
        const preferred = back || devices[0];
        setActiveCameraId(preferred.id);
        startCamera(preferred.id);
      } else {
        setCameraError('No cameras found on this device.');
      }
    } catch (err) {
      setCameraError('Camera error: ' + (err.message || err) + ' - Please ensure no other apps are using it.');
    }
  };

  const startCamera = async (cameraId) => {
    if (qrRef.current) await stopCamera();

    const html5Qrcode = new Html5Qrcode('qr-reader');
    qrRef.current = html5Qrcode;

    try {
      await html5Qrcode.start(
        { deviceId: { exact: cameraId } },
        { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
        onScanSuccess,
        () => {} // ignore frame errors silently
      );
      setIsRunning(true);
      setCameraError(null);
    } catch (err) {
      setCameraError('Could not start camera: ' + err);
    }
  };

  const stopCamera = async () => {
    if (qrRef.current && qrRef.current.isScanning) {
      try { await qrRef.current.stop(); } catch {}
    }
    setIsRunning(false);
  };

  const switchCamera = async (cameraId) => {
    setActiveCameraId(cameraId);
    await stopCamera();
    startCamera(cameraId);
  };

  const onScanSuccess = async (decodedText) => {
    if (processingRef.current) return; // debounce
    processingRef.current = true;

    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('ticket_id', decodedText)
      .eq('event_id', id)
      .single();

    if (error || !data) {
      setScanResult({ success: false, message: 'Invalid or unrecognized ticket for this event.' });
    } else if (data.arrived) {
      setScanResult({ success: false, message: `${data.participant_name} has already been scanned in!` });
    } else {
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ arrived: true })
        .eq('id', data.id);

      if (!updateError) {
        setScanResult({ success: true, participant: data });
      } else {
        setScanResult({ success: false, message: 'Server error. Please try again.' });
      }
    }

    // Auto-clear result after 4s and allow the next scan
    setTimeout(() => {
      setScanResult(null);
      processingRef.current = false;
    }, 4000);
  };

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 5vw, 3rem) 1rem' }}>
      <button onClick={() => { stopCamera(); navigate(`/admin/event/${id}`); }} className="btn btn-ghost" style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Back to Event
      </button>

      <div style={{ maxWidth: '560px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '0.25rem', marginTop: 0, textAlign: 'center' }}>QR Scanner</h1>
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginBottom: '2rem' }}>
          {event?.name || 'Loading event…'}
        </p>

        {/* Camera Selector (shown only if multiple cameras) */}
        {cameras.length > 1 && (
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem', display: 'block' }}>
              <Camera size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              Select Camera
            </label>
            <select
              className="input"
              value={activeCameraId || ''}
              onChange={e => switchCamera(e.target.value)}
              style={{ cursor: 'pointer' }}>
              {cameras.map(cam => (
                <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
              ))}
            </select>
          </div>
        )}

        {/* Camera Feed — fixed square frame */}
        <div style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          background: '#000',
          marginBottom: '1.5rem'
        }}>
          {/* Raw camera feed fills the entire box */}
          <div id="qr-reader" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

          {/* Dark overlay with transparent center cutout */}
          {isRunning && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
              {/* 4 dark corners that frame the scan zone */}
              {[
                { top: 0, left: 0, right: '25%', bottom: '75%' },
                { top: 0, left: '75%', right: 0, bottom: '75%' },
                { top: '75%', left: 0, right: '75%', bottom: 0 },
                { top: '75%', left: '25%', right: 0, bottom: 0 },
              ].map((s, i) => (
                <div key={i} style={{ position: 'absolute', background: 'rgba(0,0,0,0.55)', ...s }} />
              ))}

              {/* The scan box border + corners */}
              <div style={{
                position: 'absolute',
                top: '12.5%', left: '12.5%',
                width: '75%', height: '75%',
              }}>
                {/* Animated scan line */}
                <div style={{
                  position: 'absolute', left: 0, right: 0, height: '2px',
                  background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
                  animation: 'scan-line 2s ease-in-out infinite',
                }} />
                {/* Corner markers */}
                {[
                  { top: 0, left: 0, borderTop: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)', borderRadius: '4px 0 0 0' },
                  { top: 0, right: 0, borderTop: '3px solid var(--accent)', borderRight: '3px solid var(--accent)', borderRadius: '0 4px 0 0' },
                  { bottom: 0, left: 0, borderBottom: '3px solid var(--accent)', borderLeft: '3px solid var(--accent)', borderRadius: '0 0 0 4px' },
                  { bottom: 0, right: 0, borderBottom: '3px solid var(--accent)', borderRight: '3px solid var(--accent)', borderRadius: '0 0 4px 0' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', width: '22px', height: '22px', ...s }} />
                ))}
              </div>
            </div>
          )}

          {/* "Scanning…" label at bottom */}
          {isRunning && (
            <div style={{
              position: 'absolute', bottom: '1rem', left: 0, right: 0,
              textAlign: 'center', zIndex: 20, pointerEvents: 'none'
            }}>
              <span style={{ background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: '0.75rem', padding: '0.3rem 0.9rem', borderRadius: '999px', letterSpacing: '0.05em' }}>
                Scanning…
              </span>
            </div>
          )}
        </div>

        {/* Camera Error */}
        {cameraError && (
          <div style={{ padding: '1.25rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', marginBottom: '1.5rem', fontSize: '0.9rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
            <CameraOff size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{cameraError}</div>
          </div>
        )}

        {/* Scan Result */}
        <AnimatePresence>
          {scanResult && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card"
              style={{
                textAlign: 'center',
                border: `2px solid ${scanResult.success ? '#10b981' : '#ef4444'}`,
                background: scanResult.success ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'
              }}>
              {scanResult.success ? (
                <>
                  <CheckCircle size={44} style={{ color: '#10b981', marginBottom: '0.75rem' }} />
                  <h2 style={{ marginBottom: '1rem', marginTop: 0, color: '#10b981' }}>Marked as Arrived!</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', textAlign: 'left' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <User size={15} color="var(--accent)" /> {scanResult.participant.participant_name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <Hash size={15} color="var(--accent)" /> {scanResult.participant.moodle_id}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      <BookOpen size={15} color="var(--accent)" /> {scanResult.participant.department} · {scanResult.participant.year}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                      Div: <strong>{scanResult.participant.division}</strong>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <XCircle size={44} style={{ color: '#ef4444', marginBottom: '0.75rem' }} />
                  <h2 style={{ marginBottom: '0.5rem', marginTop: 0, color: '#ef4444' }}>Access Denied</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0 }}>{scanResult.message}</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '1.5rem' }}>
          Point the camera at a student's QR ticket. Results appear automatically.
        </p>
      </div>

      <style>{`
        #qr-reader video {
          position: absolute !important;
          inset: 0;
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          display: block;
        }
        #qr-reader__scan_region { background: transparent !important; }
        #qr-reader__dashboard { display: none !important; }
        #qr-reader img { display: none !important; }
        @keyframes scan-line {
          0%   { top: 0; opacity: 1; }
          50%  { top: calc(100% - 2px); opacity: 1; }
          100% { top: 0; opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default QRScanner;
