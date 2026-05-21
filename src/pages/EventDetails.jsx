import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users, CheckCircle, Clock, QrCode, ArrowLeft,
  FileText, Share2, MessageSquare, Star, Trash2,
  RefreshCw, Hash, Save, X, Copy, Check, Pencil, Plus, Lock
} from 'lucide-react';

const EventDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isEditingCapacity, setIsEditingCapacity] = useState(false);
  const [tempCapacity, setTempCapacity] = useState('');
  const [updatingCapacity, setUpdatingCapacity] = useState(false);
  const [closing, setClosing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copiedReg, setCopiedReg] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState(false);
  const [copiedRegQR, setCopiedRegQR] = useState(false);
  const [copiedFeedQR, setCopiedFeedQR] = useState(false);
  const regQRRef = useRef(null);
  const feedQRRef = useRef(null);
  const [showQEditor, setShowQEditor] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState([]);
  const [savingQ, setSavingQ] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQRTab, setActiveQRTab] = useState('registration');

  const DEFAULT_QUESTIONS = [
    { id: 'q1', label: 'What did you like most?', placeholder: 'Your comments...', required: true },
    { id: 'q2', label: 'Any suggestions for next time?', placeholder: 'Help us improve', required: false },
  ];

  const openQEditor = () => {
    const existing = event?.feedback_questions?.length ? event.feedback_questions : DEFAULT_QUESTIONS;
    setDraftQuestions(existing.map(q => ({ ...q })));
    setShowQEditor(true);
  };

  const addQuestion = () => {
    const newId = `q${Date.now()}`;
    setDraftQuestions(prev => [...prev, { id: newId, label: '', placeholder: '', required: false }]);
  };

  const removeQuestion = (idx) => {
    setDraftQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const saveQuestions = async () => {
    if (draftQuestions.some(q => !q.label.trim())) {
      alert('All questions must have a label.');
      return;
    }
    setSavingQ(true);
    const { error } = await supabase.from('events').update({ feedback_questions: draftQuestions }).eq('id', id);
    if (!error) {
      setEvent(prev => ({ ...prev, feedback_questions: draftQuestions }));
      setShowQEditor(false);
    } else {
      alert('Save failed: ' + error.message);
    }
    setSavingQ(false);
  };


  const registrationLink = `${window.location.origin}/event/${id}`;
  const feedbackLink = `${window.location.origin}/feedback/${id}`;

  const handleCopyReg = () => {
    navigator.clipboard.writeText(registrationLink);
    setCopiedReg(true);
    setTimeout(() => setCopiedReg(false), 2000);
  };

  const handleCopyFeedback = () => {
    navigator.clipboard.writeText(feedbackLink);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  // Copy QR SVG as PNG image to clipboard
  const copyQRToClipboard = async (svgRef, setFlag) => {
    try {
      const svgEl = svgRef.current?.querySelector('svg');
      if (!svgEl) return;
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = async () => {
        const size = 300;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        URL.revokeObjectURL(url);
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            setFlag(true);
            setTimeout(() => setFlag(false), 2000);
          } catch {
            alert('Could not copy image. Try right-clicking the QR to save it.');
          }
        }, 'image/png');
      };
      img.src = url;
    } catch {
      alert('Could not copy QR image.');
    }
  };

  useEffect(() => {
    fetchEventAndAttendees();
    
    // Real-time subscription for attendance updates
    const subscription = supabase
      .channel('attendance-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registrations', filter: `event_id=eq.${id}` }, 
        payload => {
          setAttendees(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const fetchEventAndAttendees = async () => {
    if (event) setRefreshing(true);
    const [eventRes, attendeeRes] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('registrations').select('*').eq('event_id', id).order('created_at', { ascending: false })
    ]);
    
    if (eventRes.data) {
      setEvent(eventRes.data);
      setTempCapacity(eventRes.data.capacity || '');
    }
    if (attendeeRes.data) setAttendees(attendeeRes.data);
    setLoading(false);
    setTimeout(() => setRefreshing(false), 500);
  };

  const saveCapacity = async () => {
    setUpdatingCapacity(true);
    const capacityVal = tempCapacity === "" ? null : parseInt(tempCapacity);
    
    const { error } = await supabase
      .from('events')
      .update({ capacity: capacityVal })
      .eq('id', id);

    if (!error) {
      setEvent({ ...event, capacity: capacityVal });
      setIsEditingCapacity(false);
    } else {
      alert("Update failed: " + error.message);
    }
    setUpdatingCapacity(false);
  };

  const closeArrivals = async () => {
    if (!window.confirm("This will mark all arrived participants as 'Present'. Continue?")) return;
    setClosing(true);
    
    const { error } = await supabase
      .from('registrations')
      .update({ present: true })
      .eq('event_id', id)
      .eq('arrived', true);

    if (!error) {
      alert("Arrivals closed and attendance marked!");
      fetchEventAndAttendees();
    }
    setClosing(false);
  };

  const exportToCSV = () => {
    const headers = ["Name", "Moodle ID", "Year", "Dept", "Email", "Arrived", "Present"];
    const rows = attendees.map(a => [
      a.participant_name, a.moodle_id, a.year, a.department, 
      a.email, a.arrived ? "Yes" : "No", a.present ? "Yes" : "No"
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${event.name}_attendance.csv`);
    document.body.appendChild(link);
    link.click();
  };

  const deleteEvent = async () => {
    setDeleting(true);
    const { error } = await supabase.from('events').delete().eq('id', id);
    if (!error) {
      navigate('/admin');
    } else {
      alert('Delete failed: ' + error.message);
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const stats = {
    total: attendees.length,
    arrived: attendees.filter(a => a.arrived).length,
    present: attendees.filter(a => a.present).length,
    feedback: attendees.filter(a => a.feedback_data).length,
  };

  const filteredAttendees = attendees.filter(a => 
    a.participant_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.moodle_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="container" style={{ padding: '5rem', textAlign: 'center' }}>Loading event data...</div>;

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate('/admin')} className="btn btn-ghost">
          <ArrowLeft size={18} /> Dashboard
        </button>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
           <button 
             onClick={fetchEventAndAttendees} 
             disabled={refreshing}
             className="btn btn-ghost" 
             style={{ gap: '0.4rem' }}
           >
             <RefreshCw size={18} className={refreshing ? 'spin' : ''} /> 
             {refreshing ? 'Refreshing...' : 'Refresh'}
           </button>

           <button onClick={() => {
             const url = `${window.location.origin}/event/${id}`;
             navigator.clipboard.writeText(url);
             alert("Registration link copied!");
           }} className="btn btn-ghost"><Share2 size={18} /> Invite Link</button>
           
           {event.status === 'finished' ? (
             <button
               className="btn btn-primary"
               style={{ background: 'var(--accent)', opacity: 0.6, cursor: 'not-allowed' }}
               title="Event is finished — feedback form is now closed"
               disabled
             >
               <MessageSquare size={18} /> Feedback Closed
             </button>
           ) : (
             <button onClick={() => navigate(`/admin/scan/${id}`)} className="btn btn-primary" style={{ background: 'var(--accent)' }}>
               <QrCode size={18} /> Open Scanner
             </button>
           )}

        </div>
      </div>

      <div className="grid-details" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        <div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div>
                 <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', marginTop: 0 }}>{event.name}</h1>
                 <p style={{ color: 'var(--text-muted)' }}>{event.venue} | {new Date(event.event_time).toLocaleDateString('en-GB')} at {new Date(event.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
               <span className={`badge ${event.status === 'finished' ? '' : 'badge-arrived'}`}>{event.status}</span>
            </div>
          </motion.div>

          <div className="stats-grid" style={{ marginBottom: '2rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <Users size={20} className="text-primary" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{stats.total}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Registered</div>
            </div>
            
            <div 
              className="glass-card" 
              style={{ 
                padding: '1.25rem', 
                textAlign: 'center', 
                border: '1px solid var(--border)', 
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Hash size={18} style={{ color: 'var(--text-muted)', margin: '0 auto 0.4rem' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                {isEditingCapacity ? (
                  <>
                    <input 
                      type="number"
                      autoFocus
                      placeholder="∞"
                      value={tempCapacity}
                      onChange={e => setTempCapacity(e.target.value)}
                      style={{ 
                        width: '60px', 
                        padding: '0.2rem', 
                        fontSize: '1rem', 
                        border: '1px solid var(--accent)', 
                        borderRadius: '4px',
                        textAlign: 'center',
                        background: 'transparent',
                        color: 'inherit'
                      }}
                    />
                    <button onClick={saveCapacity} disabled={updatingCapacity} className="action-btn-mini success"><Save size={14} /></button>
                    <button onClick={() => { setIsEditingCapacity(false); setTempCapacity(event.capacity ?? ''); }} className="action-btn-mini danger"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-h)' }}>
                      {updatingCapacity ? '...' : (stats.total)} / {(event.capacity !== null && event.capacity !== undefined) ? event.capacity : '∞'}
                    </div>
                    <button 
                      onClick={() => {
                        setIsEditingCapacity(true);
                        setTempCapacity(event.capacity ?? '');
                      }}
                      style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '0.2rem', color: 'var(--text-muted)', opacity: 0.6 }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.6}
                    >
                      <Hash size={14} />
                    </button>
                  </>
                )}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.3rem', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                Fill Ratio (Reg / Cap)
              </div>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <Clock size={20} style={{ color: '#f59e0b', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{stats.arrived}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Arrived</div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <CheckCircle size={20} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{stats.present}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Present</div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <MessageSquare size={20} className="text-secondary" style={{ marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '1.3rem', fontWeight: 800 }}>{stats.feedback}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Feedback</div>
            </div>
          </div>

          <div className="glass-card" style={{ overflow: 'hidden', marginBottom: '2rem' }}>
            <div className="attendee-header" style={{ padding: '1.5rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
               <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Attendee List</h3>
               <div className="attendee-actions" style={{ display: 'flex', gap: '0.5rem', flex: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                 <input 
                   type="text" 
                   className="input" 
                   placeholder="Search by name, ID or email..." 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   style={{ maxWidth: '250px', padding: '0.4rem 0.8rem', margin: 0 }}
                 />
                 <button onClick={exportToCSV} className="btn-ghost" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'transparent', color: 'var(--text)', whiteSpace: 'nowrap', flexShrink: 0 }}><FileText size={14} /> CSV</button>
                 <button onClick={closeArrivals} disabled={closing || event.status === 'finished'} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 }}>{closing ? 'Closing...' : 'Close Arrivals'}</button>
               </div>
            </div>
            <div className="attendee-scroll" style={{ overflowX: 'auto', overflowY: 'auto', minHeight: '450px', maxHeight: '450px', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '480px' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '1rem 1.5rem' }}>Participant</th>
                    <th style={{ padding: '1rem 1.5rem' }}>ID & Dept</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem' }}>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.length > 0 ? filteredAttendees.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{a.participant_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.email}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        <div>{a.moodle_id}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.department} | {a.year}</div>
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {a.arrived ? <span className="badge badge-arrived">Arrived</span> : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pending</span>}
                        {a.present && <CheckCircle size={14} style={{ color: '#10b981', marginLeft: '0.5rem' }} />}
                      </td>
                      <td style={{ padding: '1rem 1.5rem' }}>
                        {a.feedback_data ? <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}><Star size={12} fill="currentColor" /> Rated {a.feedback_data.rating}/5</span> : '-'}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No participants found matching "{searchTerm}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {stats.feedback > 0 && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ marginBottom: '1.5rem' }}>Recent Feedback</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {attendees.filter(a => a.feedback_data).slice(0, 5).map((a, i) => {
                  const fd = a.feedback_data;
                  const firstAnswer = fd.answers
                    ? Object.values(fd.answers)[0]
                    : fd.comments;
                  return (
                    <div key={i} style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                         <span style={{ fontWeight: 600 }}>{a.participant_name}</span>
                         <div style={{ display: 'flex', gap: '2px' }}>
                            {[...Array(fd.rating || 0)].map((_, i) => <Star key={i} size={12} fill="var(--accent)" color="var(--accent)" />)}
                         </div>
                      </div>
                      {firstAnswer && <p style={{ fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>"{firstAnswer}"</p>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        <div className="glass-card event-controls-card" style={{ padding: '1.5rem', maxHeight: '100svh', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', marginTop: 0 }}>Event Controls</h3>
          {event.poster_url && (
            <img src={event.poster_url} style={{ width: '100%', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', maxHeight: '220px', objectFit: 'cover' }} alt="Poster" />
          )}

          {/* QR Tabs Container */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', background: 'var(--bg)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <button
              onClick={() => setActiveQRTab('registration')}
              style={{ flex: 1, padding: '0.5rem', border: 'none', background: activeQRTab === 'registration' ? 'var(--accent)' : 'transparent', color: activeQRTab === 'registration' ? 'white' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.2s' }}
            >
              Registration
            </button>
            <button
              onClick={() => setActiveQRTab('feedback')}
              style={{ flex: 1, padding: '0.5rem', border: 'none', background: activeQRTab === 'feedback' ? 'var(--accent)' : 'transparent', color: activeQRTab === 'feedback' ? 'white' : 'var(--text-muted)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', transition: 'all 0.2s' }}
            >
              Feedback
            </button>
          </div>

          {activeQRTab === 'registration' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ marginBottom: '1.25rem' }}>
              <div ref={regQRRef} style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem' }}>
                <QRCodeSVG value={registrationLink} size={160} level="H" />
              </div>
              <button
                onClick={() => copyQRToClipboard(regQRRef, setCopiedRegQR)}
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}
              >
                {copiedRegQR ? <><Check size={13} /> QR Copied!</> : <><Copy size={13} /> Copy QR Image</>}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, padding: '0.5rem 0.6rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', wordBreak: 'break-all', color: 'var(--text-h)', lineHeight: 1.4 }}>
                  {registrationLink}
                </code>
                <button onClick={handleCopyReg} className="btn btn-primary" style={{ flexShrink: 0, padding: '0.5rem' }}>
                  {copiedReg ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </motion.div>
          )}

          {activeQRTab === 'feedback' && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
                  {event.status === 'finished' ? <span style={{ color: '#ef4444' }}>Closed</span> : 'Active'}
                </p>
                <button
                  onClick={openQEditor}
                  style={{ border: 'none', background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.6rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Pencil size={11} /> Edit Questions
                </button>
              </div>
              <div ref={feedQRRef} style={{ background: 'white', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', justifyContent: 'center', marginBottom: '0.5rem', position: 'relative' }}>
                <QRCodeSVG value={feedbackLink} size={160} level="H" />
                {event.status === 'finished' && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={36} color="white" />
                  </div>
                )}
              </div>
              <button
                onClick={() => copyQRToClipboard(feedQRRef, setCopiedFeedQR)}
                disabled={event.status === 'finished'}
                className="btn btn-ghost"
                style={{ width: '100%', fontSize: '0.75rem', padding: '0.35rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', marginBottom: '0.5rem', borderColor: 'var(--accent-border)', color: 'var(--accent)' }}
              >
                {copiedFeedQR ? <><Check size={13} /> QR Copied!</> : <><Copy size={13} /> Copy QR Image</>}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <code style={{ flex: 1, padding: '0.5rem 0.6rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', wordBreak: 'break-all', color: 'var(--text-h)', lineHeight: 1.4 }}>
                  {feedbackLink}
                </code>
                <button onClick={handleCopyFeedback} className="btn btn-primary" style={{ flexShrink: 0, padding: '0.5rem' }}>
                  {copiedFeedback ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </motion.div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingTop: '0.25rem', borderTop: '1px solid var(--border)' }}>
            <button onClick={async () => {
              if (window.confirm("Finish this event? Students will be able to submit feedback.")) {
                await supabase.from('events').update({ status: 'finished' }).eq('id', id);
                fetchEventAndAttendees();
              }
            }} disabled={event.status === 'finished'} className="btn btn-primary" style={{ width: '100%', marginTop: '0.75rem' }}>
              {event.status === 'finished' ? '✓ Event Finished' : 'Finish Event'}
            </button>
            <button onClick={() => navigate('/admin')} className="btn btn-ghost" style={{ width: '100%' }}>Back to Dashboard</button>

            {/* Danger Zone */}
            <div style={{ marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
              <button
                onClick={() => setShowDeleteModal(true)}
                style={{ width: '100%', padding: '0.7rem', borderRadius: 'var(--radius-md)', border: '1px solid #ef4444', background: 'transparent', color: '#ef4444', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <Trash2 size={16} /> Delete Event
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
            onClick={() => setShowDeleteModal(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ maxWidth: '420px', width: '100%', padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                <Trash2 size={24} color="#ef4444" />
              </div>
              <h2 style={{ marginBottom: '0.75rem', marginTop: 0, color: 'var(--text-h)' }}>Delete Event?</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>This will permanently delete <strong style={{ color: 'var(--text-h)' }}>{event.name}</strong>.</p>
              <p style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '2rem' }}>⚠️ All {stats.total} registrations will also be deleted. This cannot be undone.</p>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => setShowDeleteModal(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
                <button
                  onClick={deleteEvent}
                  disabled={deleting}
                  style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Question Editor Modal */}
      <AnimatePresence>
        {showQEditor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '1rem' }}
            onClick={() => setShowQEditor(false)}>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card"
              style={{ maxWidth: '540px', width: '100%', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Edit Feedback Questions</h2>
                <button onClick={() => setShowQEditor(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', marginTop: 0 }}>
                The star rating is always included. Customize the text questions below.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                {draftQuestions.map((q, idx) => (
                  <div key={q.id} style={{ padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Question {idx + 1}</span>
                      <button onClick={() => removeQuestion(idx)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={14} /></button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <input
                        className="input"
                        placeholder="Question label *"
                        value={q.label}
                        onChange={e => setDraftQuestions(prev => prev.map((dq, i) => i === idx ? { ...dq, label: e.target.value } : dq))}
                      />
                      <input
                        className="input"
                        placeholder="Placeholder text (optional)"
                        value={q.placeholder || ''}
                        onChange={e => setDraftQuestions(prev => prev.map((dq, i) => i === idx ? { ...dq, placeholder: e.target.value } : dq))}
                      />
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={q.required}
                          onChange={e => setDraftQuestions(prev => prev.map((dq, i) => i === idx ? { ...dq, required: e.target.checked } : dq))}
                        />
                        Required
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addQuestion} className="btn btn-ghost" style={{ width: '100%', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Plus size={16} /> Add Question
              </button>
              <button onClick={saveQuestions} disabled={savingQ} className="btn btn-primary" style={{ width: '100%' }}>
                <Save size={16} /> {savingQ ? 'Saving...' : 'Save Questions'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        
        /* Media Queries - First Priority for structural shifts */
        @media (max-width: 900px) {
          .grid-details { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .event-controls-card { maxHeight: none !important; }
        }
        
        @media (max-width: 600px) {
          .attendee-header { flex-direction: column; align-items: flex-start !important; gap: 0.75rem; }
          .attendee-actions { width: 100%; justify-content: flex-start; }
          .attendee-actions input { flex: 1; max-width: 100% !important; }
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 0.5rem !important; }
        }

        /* Fluid spacing with clamp() for areas with fewer elements */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: clamp(0.5rem, 2vw, 1rem);
        }
        
        /* Table / Grid Overflow handling */
        .attendee-scroll, .event-controls-card { 
          overflow: auto; 
          -webkit-overflow-scrolling: touch; 
          scrollbar-width: thin;
        }
        .attendee-scroll table { min-width: 480px; }
        
        .action-btn-mini {
          border: none;
          border-radius: 4px;
          padding: 0.2rem 0.4rem;
          cursor: pointer;
          display: flex;
          align-items: center;
        }
        .action-btn-mini.success { background: rgba(16,185,129,0.15); color: #10b981; }
        .action-btn-mini.danger  { background: rgba(239,68,68,0.15);  color: #ef4444; }
      `}</style>
    </div>
  );
};

export default EventDetails;
