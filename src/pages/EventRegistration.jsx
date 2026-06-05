import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Calendar, MapPin, User, Mail, Hash, BookOpen, Lock } from 'lucide-react';

const EventRegistration = () => {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ticketData, setTicketData] = useState(null);
  const ticketRef = useRef();

  const [formData, setFormData] = useState({
    participant_name: '',
    moodle_id: '',
    year: '',
    department: '',
    division: '',
    email: '',
    roll_no: ''
  });

  useEffect(() => {
    fetchEvent();

    // Realtime: update event data live when admin changes capacity etc.
    const channel = supabase
      .channel(`event-updates-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'events', filter: `id=eq.${id}` },
        (payload) => {
          setEvent(payload.new);
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [id]);

  const fetchEvent = async () => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single();
    if (data) setEvent(data);
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setRegistering(true);
    if (event.capacity) {
      const { count } = await supabase
        .from('registrations').select('*', { count: 'exact', head: true }).eq('event_id', id);
      if (count >= event.capacity) {
        alert("Registration failed: Event capacity reached!");
        setRegistering(false);
        return;
      }
    }
    const { data, error } = await supabase
      .from('registrations').insert([{ event_id: id, ...formData }]).select().single();
    
    if (data) { 
      setTicketData(data); 
      setSuccess(true); 
    } else {
      // Check if it's an RLS violation or unique constraint violation (duplicate registration)
      if (error.message.includes('row-level security') || error.code === '23505') {
        alert("Registration failed: You have already registered for this event with these credentials.");
      } else {
        alert(`Registration failed: ${error.message}`);
      }
    }
    setRegistering(false);
  };

  const downloadTicket = () => {
    const svg = document.getElementById("ticket-qr");
    const clone = svg.cloneNode(true);
    const scale = 4;
    const qrSize = 110; // sensible QR size (110 logical → 440px on canvas)
    clone.setAttribute("width", qrSize * scale);
    clone.setAttribute("height", qrSize * scale);

    const svgData = new XMLSerializer().serializeToString(clone);

    // Canvas dimensions: 16:9 landscape
    const canvasW = 1600;
    const canvasH = 900;
    const canvas = document.createElement("canvas");
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext("2d");

    const qrImg = new Image();
    const logoImg = new Image();
    let loaded = 0;

    const draw = () => {
      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasW, canvasH);

      const pad = 70;
      const ieeeBlue = "#1a6faf";

      // ── IEEE icon (square, no whitespace) ──
      const iconSize = 110; // the diamond icon itself, crisp
      ctx.drawImage(logoImg, pad, pad, iconSize, iconSize);

      // ── "IEEE" bold wordmark next to icon ──
      ctx.fillStyle = ieeeBlue;
      ctx.font = "900 90px 'Arial Black', Arial, sans-serif";
      ctx.textAlign = "left";
      const ieeeX = pad + iconSize + 16;
      const ieeeY = pad + 80;
      ctx.fillText("IEEE", ieeeX, ieeeY);

      // ── "APSIT / Student / Branch" stacked text (no vertical divider) ──
      const ieeeW = ctx.measureText("IEEE").width;
      const branchX = ieeeX + ieeeW + 20;
      ctx.font = "bold 30px Arial, sans-serif";
      ctx.fillStyle = ieeeBlue;
      ctx.fillText("APSIT",   branchX, pad + 30);
      ctx.fillText("Student", branchX, pad + 65);
      ctx.fillText("Branch",  branchX, pad + 100);

      // ── Blue underline ending at "Student" right edge + "IEEE Maharashtra Section" ──
      const logoLineY = pad + iconSize + 14;
      const logoLineEndX = branchX + Math.max(
        ctx.measureText("APSIT").width,
        ctx.measureText("Student").width,
        ctx.measureText("Branch").width
      );
      ctx.strokeStyle = ieeeBlue;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pad, logoLineY);
      ctx.lineTo(logoLineEndX, logoLineY);
      ctx.stroke();

      ctx.fillStyle = ieeeBlue;
      ctx.font = "bold 28px Arial, sans-serif";
      ctx.fillText("IEEE Maharashtra Section", pad, logoLineY + 34);

      // ── QR (right side, vertically centered) ──
      const qrDisplayW = qrImg.width;
      const qrDisplayH = qrImg.height;
      const qrX = canvasW - pad - qrDisplayW;
      const qrY = (canvasH - qrDisplayH) / 2;
      ctx.drawImage(qrImg, qrX, qrY);

      // ── Event name (black, left-center) ──
      const textAreaCenterY = canvasH / 2 - 30;

      ctx.textAlign = "left";
      ctx.fillStyle = "#111111";
      ctx.font = "bold 88px Inter, Arial, sans-serif";
      ctx.fillText(event.name, pad, textAreaCenterY);

      // ── Venue (black, below event name) ──
      ctx.fillStyle = "#333333";
      ctx.font = "600 60px Inter, Arial, sans-serif";
      ctx.fillText(event.venue || "", pad, textAreaCenterY + 100);

      // ── Participant name | Moodle ID (bottom, black) ──
      const bottomY = canvasH - 75;
      ctx.fillStyle = "#111111";
      ctx.font = "500 46px Inter, Arial, sans-serif";
      ctx.textAlign = "left";
      const nameText = ticketData.participant_name;
      const moodleText = ticketData.moodle_id;
      ctx.fillText(nameText, pad, bottomY);

      const nameW = ctx.measureText(nameText).width;
      const sepX = pad + nameW + 36;
      ctx.fillStyle = "#555555";
      ctx.fillText("|", sepX, bottomY);
      const moodleX = sepX + ctx.measureText("| ").width + 12;
      ctx.fillStyle = "#111111";
      ctx.fillText(moodleText, moodleX, bottomY);

      // ── Export ──
      const link = document.createElement("a");
      link.download = `ticket-${ticketData.participant_name}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    };

    const onLoad = () => { loaded++; if (loaded === 2) draw(); };
    qrImg.onload = onLoad;
    logoImg.onload = onLoad;
    logoImg.crossOrigin = "anonymous";
    qrImg.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgData);
    logoImg.src = "/ieee-icon.png";
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '5rem' }}>Loading event details...</div>;
  if (!event) return <div className="container" style={{ textAlign: 'center', padding: '5rem' }}>Event not found.</div>;

  if (event.status === 'finished' || event.status === 'closed') return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3rem) 1rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Lock size={32} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem', marginTop: 0 }}>Registrations Closed</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}><strong>{event.name}</strong> is currently not accepting new registrations.</p>
        </motion.div>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3rem) 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', margin: 0, color: '#22c55e' }}>You're In! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>Show this ticket at the entrance.</p>
        </motion.div>

        {/* ── Ticket Card — landscape, white, IEEE style ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            width: '100%',
            maxWidth: '720px',
            aspectRatio: '16/9',
            display: 'grid',
            gridTemplateRows: 'auto 1fr auto',
            padding: '5% 6%',
            boxSizing: 'border-box',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {/* Row 1 — IEEE logo: icon + composed text */}
          <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '5px', alignSelf: 'start' }}>
            {/* Top row: icon + IEEE + APSIT Student Branch (no vertical divider) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/ieee-icon.png"
                alt="IEEE"
                style={{ height: '64px', width: 'auto', display: 'block', flexShrink: 0 }}
              />
              <span style={{
                fontFamily: "'Arial Black', 'Arial', sans-serif",
                fontWeight: 900,
                fontSize: '3rem',
                color: '#1a6faf',
                letterSpacing: '-1px',
                lineHeight: '64px',
                display: 'block',
              }}>IEEE</span>
              {/* APSIT Student Branch — vertically centred to match icon height */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                height: '64px',
              }}>
                <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: '0.82rem', color: '#1a6faf', lineHeight: 1.3 }}>APSIT</span>
                <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: '0.82rem', color: '#1a6faf', lineHeight: 1.3 }}>Student</span>
                <span style={{ fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: '0.82rem', color: '#1a6faf', lineHeight: 1.3 }}>Branch</span>
              </div>
            </div>
            {/* Solid blue line — stretches to full logo group width automatically */}
            <div style={{ height: '1.5px', background: '#1a6faf' }} />
            {/* Maharashtra Section */}
            <span style={{
              fontFamily: "Arial, sans-serif",
              fontWeight: 700,
              fontSize: '0.75rem',
              color: '#1a6faf',
              letterSpacing: '0.01em',
            }}>IEEE Maharashtra Section</span>
          </div>

          {/* Row 2 — Event info (left) + QR (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 'clamp(1.2rem, 3.8vw, 2.2rem)',
                fontWeight: 700,
                color: '#111111',
                lineHeight: 1.2,
                marginBottom: '0.5rem',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {event.name}
              </div>
              <div style={{
                fontSize: 'clamp(0.85rem, 2.5vw, 1.45rem)',
                fontWeight: 600,
                color: '#333333',
              }}>
                {event.venue}
              </div>
            </div>

            <div style={{ flexShrink: 0 }}>
              <QRCodeSVG
                id="ticket-qr"
                value={ticketData.ticket_id}
                size={100}
                level="H"
                style={{ display: 'block' }}
              />
            </div>
          </div>

          {/* Row 3 — Participant | Moodle ID (no divider line) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: 'clamp(0.7rem, 1.8vw, 0.95rem)',
            color: '#111111',
            fontWeight: 500,
          }}>
            <span>{ticketData.participant_name}</span>
            <span style={{ color: '#555555', fontSize: '1.1em' }}>|</span>
            <span>{ticketData.moodle_id}</span>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          onClick={downloadTicket}
          className="btn btn-primary"
          style={{ width: '100%', maxWidth: '720px' }}
        >
          <Download size={18} /> Download Ticket (PNG)
        </motion.button>
      </div>
    );
  }


  return (
    <div className="container" style={{ padding: 'clamp(1rem, 5vw, 3rem) 1rem' }}>
      <div className="reg-layout">
        {/* Left: Event Info */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {event.poster_url && (
            <img src={event.poster_url} style={{ width: '100%', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow)', marginBottom: 'clamp(1rem, 4vw, 1.5rem)', maxHeight: '400px', objectFit: 'cover' }} alt={event.name} />
          )}
          <h1 style={{ marginBottom: 'clamp(1rem, 4vw, 1.5rem)', marginTop: 0, fontSize: 'clamp(1.8rem, 6vw, 2.5rem)' }}>{event.name}</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 'clamp(1.5rem, 5vw, 2rem)', lineHeight: '1.6' }}>{event.description}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.95rem', color: 'var(--text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Calendar size={18} color="var(--accent)" />
              {new Date(event.event_time).toLocaleDateString('en-GB')} at {new Date(event.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><MapPin size={18} color="var(--accent)" /> {event.venue}</div>
          </div>
        </motion.div>

        {/* Right: Form */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card">
          <h2 style={{ marginBottom: 'clamp(1rem, 4vw, 1.5rem)', marginTop: 0, fontSize: 'clamp(1.4rem, 5vw, 1.8rem)' }}>Register Now</h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(0.75rem, 3vw, 1rem)' }}>
            <div>
              <label className="reg-label"><User size={14} /> Full Name</label>
              <input required className="input" placeholder="Your full name" value={formData.participant_name} onChange={e => setFormData({ ...formData, participant_name: e.target.value })} />
            </div>
            <div className="two-col-form">
              <div>
                <label className="reg-label"><Hash size={14} /> Moodle ID</label>
                <input required className="input" placeholder="23XXXXXX" value={formData.moodle_id} onChange={e => setFormData({ ...formData, moodle_id: e.target.value })} />
              </div>
              <div>
                <label className="reg-label"><Hash size={14} /> Roll No</label>
                <input required className="input" placeholder="Roll number" value={formData.roll_no} onChange={e => setFormData({ ...formData, roll_no: e.target.value })} />
              </div>
            </div>
            <div className="two-col-form">
              <div>
                <label className="reg-label"><BookOpen size={14} /> Year</label>
                <select required className="input" value={formData.year} onChange={e => setFormData({ ...formData, year: e.target.value })}>
                  <option value="">Select Year</option>
                  <option value="FE">FE</option>
                  <option value="SE">SE</option>
                  <option value="TE">TE</option>
                  <option value="BE">BE</option>
                </select>
              </div>
              <div>
                <label className="reg-label"><BookOpen size={14} /> Department</label>
                <select required className="input" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}>
                  <option value="">Select Dept</option>
                  <option value="H&AS">H&AS</option>
                  <option value="DS">DS</option>
                  <option value="COMPS">COMPS</option>
                  <option value="AIML">AIML</option>
                  <option value="IT">IT</option>
                  <option value="CIVIL">CIVIL</option>
                  <option value="MECH">MECH</option>
                </select>
              </div>
            </div>
            <div>
              <label className="reg-label"><Mail size={14} /> Email Address</label>
              <input required type="email" className="input" placeholder="your@email.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            </div>
            <div>
              <label className="reg-label"><Hash size={14} /> Division</label>
              <select required className="input" style={{ cursor: 'pointer' }} value={formData.division} onChange={e => setFormData({ ...formData, division: e.target.value })}>
                <option value="">Select Division</option>
                {(event.divisions && event.divisions.length > 0
                  ? event.divisions
                  : ['A', 'B', 'C']
                ).map(div => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={registering} className="btn btn-primary" style={{ marginTop: '0.5rem', width: '100%' }}>
              {registering ? 'Registering...' : 'Register for Event'}
            </button>
          </form>
        </motion.div>
      </div>

      <style>{`
        .reg-label { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.4rem; font-size: clamp(0.75rem, 2.5vw, 0.8rem); color: var(--text-muted); font-weight: 600; }

        /* Layout */
        .reg-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: clamp(1.5rem, 5vw, 3rem);
          align-items: start;
          max-width: 1000px;
          margin: 0 auto;
        }

        /* Two-col form fields */
        .two-col-form { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(0.75rem, 3vw, 1rem); }

        /* Tablet: stack the layout */
        @media (max-width: 768px) {
          .reg-layout { grid-template-columns: 1fr !important; gap: clamp(1rem, 4vw, 1.5rem) !important; }
          .two-col-form { grid-template-columns: 1fr 1fr !important; }
        }

        /* Mobile: stack two-col form fields too */
        @media (max-width: 480px) {
          .two-col-form { grid-template-columns: 1fr !important; gap: 0.75rem !important; }
        }
      `}</style>
    </div>
  );
};

export default EventRegistration;
