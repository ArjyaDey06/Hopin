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
    if (data) { setTicketData(data); setSuccess(true); }
    else alert(error.message);
    setRegistering(false);
  };

  const downloadTicket = () => {
    const svg = document.getElementById("ticket-qr");
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 180;
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 20, 20);
      ctx.fillStyle = "black";
      ctx.font = "bold 20px Inter";
      ctx.fillText(ticketData.participant_name, 20, img.height + 60);
      ctx.font = "16px Inter";
      ctx.fillText(`Moodle ID: ${ticketData.moodle_id}`, 20, img.height + 90);
      ctx.fillText(`Event: ${event.name}`, 20, img.height + 120);
      ctx.fillText(`Venue: ${event.venue}`, 20, img.height + 150);
      const pngFile = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `ticket-${ticketData.participant_name}.png`;
      link.href = pngFile;
      link.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  if (loading) return <div className="container" style={{ textAlign: 'center', padding: '5rem' }}>Loading event details...</div>;
  if (!event) return <div className="container" style={{ textAlign: 'center', padding: '5rem' }}>Event not found.</div>;

  if (event.status === 'finished') return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3rem) 1rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <Lock size={32} color="var(--accent)" />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.75rem', marginTop: 0 }}>Registrations Closed</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}><strong>{event.name}</strong> has ended and is no longer accepting new registrations.</p>
        </motion.div>
      </div>
    </div>
  );

  if (success) {
    return (
      <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3rem) 1rem', display: 'flex', justifyContent: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card" style={{ width: '100%', maxWidth: '420px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', marginBottom: '0.5rem', color: '#22c55e', marginTop: 0 }}>You're In! 🎉</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Show this QR code at the entrance.</p>
          <div ref={ticketRef} style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'inline-block' }}>
            <QRCodeSVG id="ticket-qr" value={ticketData.ticket_id} size={180} level="H" />
            <div style={{ marginTop: '1rem', borderTop: '2px dashed #e5e7eb', paddingTop: '1rem', textAlign: 'left', color: 'black' }}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.2rem', marginTop: 0 }}>{ticketData.participant_name}</h3>
              <p style={{ fontSize: '0.85rem', opacity: 0.6, margin: 0 }}>{ticketData.moodle_id} · {ticketData.department} · Div {ticketData.division}</p>
              <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '0.25rem', margin: 0 }}>{event.name}</p>
            </div>
          </div>
          <button onClick={downloadTicket} className="btn btn-primary" style={{ width: '100%' }}>
            <Download size={18} /> Download Ticket (PNG)
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3rem) 1rem' }}>
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
        .reg-layout { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1.5rem, 5vw, 3rem); align-items: start; max-width: 1000px; margin: 0 auto; }
        .two-col-form { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(0.75rem, 3vw, 1rem); }
        select.input { cursor: pointer; }
        @media (max-width: 768px) {
          .reg-layout { grid-template-columns: 1fr; gap: 1.5rem; }
          .two-col-form { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default EventRegistration;
