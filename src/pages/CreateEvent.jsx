import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Users, Plus, Trash2, ArrowLeft, Save, Copy, Check, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';

const CreateEvent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [divisions, setDivisions] = useState(['A', 'B', 'C']);
  const [newDivision, setNewDivision] = useState('');
  const [posterFile, setPosterFile] = useState(null);
  const [posterPreview, setPosterPreview] = useState(null);
  const [createdEvent, setCreatedEvent] = useState(null); // success state
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    name: '', description: '', venue: '', capacity: '', event_time: ''
  });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select an image file.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return; }
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
  };

  const uploadPoster = async () => {
    if (!posterFile) return null;
    setUploading(true);
    const ext = posterFile.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('event-images')
      .upload(fileName, posterFile, { cacheControl: '3600', upsert: false });
    setUploading(false);
    if (error) { alert('Image upload failed: ' + error.message); return null; }
    const { data } = supabase.storage.from('event-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleAddDivision = () => {
    const val = newDivision.trim().toUpperCase();
    if (val && !divisions.includes(val)) {
      setDivisions([...divisions, val]);
      setNewDivision('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (divisions.length === 0) { alert('Please add at least one division.'); return; }
    setLoading(true);

    const poster_url = await uploadPoster();

    const { data, error } = await supabase
      .from('events')
      .insert([{
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        created_by: user.id,
        status: 'published',
        poster_url,
        divisions
      }])
      .select()
      .single();

    if (data) {
      setCreatedEvent(data);
    } else {
      alert(error.message);
    }
    setLoading(false);
  };

  const registrationLink = createdEvent
    ? `${window.location.origin}/event/${createdEvent.id}`
    : '';

  const feedbackLink = createdEvent
    ? `${window.location.origin}/feedback/${createdEvent.id}`
    : '';

  const [copiedFeedback, setCopiedFeedback] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFeedback = () => {
    navigator.clipboard.writeText(feedbackLink);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  // ─── Success Screen ───────────────────────────────────────────
  if (createdEvent) {
    return (
      <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ maxWidth: '560px', margin: '0 auto' }}>

          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🎉</div>
            <h1 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Event Published!</h1>
            <p style={{ color: 'var(--text-muted)' }}>Share this link with students to let them register.</p>
          </div>

          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '0.75rem', marginTop: 0 }}>Registration Link</p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <code style={{ flex: 1, padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--text-h)' }}>
                {registrationLink}
              </code>
              <button onClick={handleCopy} className="btn btn-primary" style={{ flexShrink: 0, padding: '0.75rem' }}>
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ marginBottom: '1.5rem', border: '1px solid var(--accent-border)', background: 'var(--accent-bg)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: '0.75rem', marginTop: 0 }}>Feedback Link <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>(share after event)</span></p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <code style={{ flex: 1, padding: '0.75rem', background: 'var(--bg)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', wordBreak: 'break-all', color: 'var(--accent)' }}>
                {feedbackLink}
              </code>
              <button onClick={handleCopyFeedback} className="btn btn-primary" style={{ flexShrink: 0, padding: '0.75rem', background: 'var(--accent)' }}>
                {copiedFeedback ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: 0 }}>Registration QR (scan to register)</p>
            <div style={{ display: 'inline-block', background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <QRCodeSVG value={registrationLink} size={180} level="H" />
            </div>
          </div>

          <div className="glass-card" style={{ textAlign: 'center', marginBottom: '2rem', border: '1px solid var(--accent-border)', background: 'var(--accent-bg)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--accent)', marginBottom: '1.5rem', marginTop: 0 }}>Feedback QR <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)' }}>(share after event)</span></p>
            <div style={{ display: 'inline-block', background: 'white', padding: '1.25rem', borderRadius: 'var(--radius-md)' }}>
              <QRCodeSVG value={feedbackLink} size={180} level="H" />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem', marginBottom: 0 }}>Screenshot or print this to share for post-event feedback.</p>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={() => navigate(`/admin/event/${createdEvent.id}`)} className="btn btn-primary" style={{ flex: 1 }}>
              View Event Dashboard
            </button>
            <button onClick={() => navigate('/admin')} className="btn btn-ghost" style={{ flex: 1 }}>
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Create Form ─────────────────────────────────────────────
  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem' }}>
      <button onClick={() => navigate('/admin')} className="btn btn-ghost" style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Dashboard
      </button>

      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Create New Event</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Fill in the details below to publish your event.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Basic Info */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={18} color="var(--accent)" /> Basic Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="ev-label">Event Name *</label>
                <input required className="input" placeholder="e.g. IEEE Tech Hackfest 2025" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="ev-label">Description</label>
                <textarea className="input" placeholder="What is this event about?" style={{ height: '90px', resize: 'vertical' }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="two-col">
                <div>
                  <label className="ev-label"><MapPin size={13} /> Venue *</label>
                  <input required className="input" placeholder="Auditorium / CC Lab" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} />
                </div>
                <div>
                  <label className="ev-label"><Calendar size={13} /> Date & Time *</label>
                  <input required type="datetime-local" className="input" value={formData.event_time} onChange={e => setFormData({...formData, event_time: e.target.value})} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Poster Upload */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ImageIcon size={18} color="var(--accent)" /> Event Poster
            </h3>

            {/* Upload zone */}
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: `2px dashed ${posterPreview ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-md)', padding: '2rem', cursor: 'pointer',
              background: posterPreview ? 'var(--accent-bg)' : 'var(--bg)',
              transition: 'all 0.2s', gap: '0.75rem', marginBottom: posterPreview ? '1rem' : 0
            }}>
              <ImageIcon size={32} color={posterPreview ? 'var(--accent)' : 'var(--text-muted)'} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 600, color: posterPreview ? 'var(--accent)' : 'var(--text-h)', marginBottom: '0.25rem' }}>
                  {posterPreview ? 'Image selected ✓ — click to change' : 'Click to upload poster'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>JPG, PNG, WEBP — max 5MB</div>
              </div>
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            </label>

            {posterPreview && (
              <img src={posterPreview} alt="Preview" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
            )}

            <div style={{ marginTop: '1.5rem' }}>
              <label className="ev-label"><Users size={13} /> Venue Capacity (optional)</label>
              <input type="number" className="input" placeholder="Leave blank for unlimited registrations" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} />
            </div>
          </motion.div>

          {/* Divisions */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="glass-card">
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Plus size={18} color="var(--accent)" /> Divisions *
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>These will appear as options on the student registration form.</p>

            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <input
                className="input" placeholder="e.g. D, E, F..."
                value={newDivision}
                onChange={e => setNewDivision(e.target.value.toUpperCase())}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddDivision(); } }}
              />
              <button type="button" onClick={handleAddDivision} className="btn btn-primary" style={{ flexShrink: 0 }}>
                <Plus size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {divisions.length === 0 && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No divisions added yet.</p>
              )}
              {divisions.map((div, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.85rem', background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {div}
                  <button type="button" onClick={() => setDivisions(divisions.filter((_, j) => j !== i))} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex', padding: 0 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          <button type="submit" disabled={loading || uploading} className="btn btn-primary" style={{ width: '100%', padding: '1rem', fontSize: '1rem' }}>
            <Save size={20} />
            {uploading ? 'Uploading image…' : loading ? 'Publishing…' : 'Publish Event & Get Link'}
          </button>

        </form>
      </div>

      <style>{`
        .ev-label { display: flex; align-items: center; gap: 0.3rem; margin-bottom: 0.4rem; font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .two-col { grid-template-columns: 1fr; } }
      `}</style>
    </div>
  );
};

export default CreateEvent;
