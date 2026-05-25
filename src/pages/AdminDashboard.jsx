import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, Calendar, MapPin, ArrowRight, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*, creator:profiles!created_by(full_name)')
      .order('created_at', { ascending: false });
    if (data) setEvents(data);
    setLoading(false);
  };

  const activeEvents = events.filter(e => e.status !== 'finished');
  const pastEvents = events.filter(e => e.status === 'finished');

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 5vw, 2rem) 1rem' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(1rem, 4vw, 1.5rem)', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 'clamp(2rem, 8vw, 4rem)' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(2rem, 8vw, 3rem)', marginBottom: '0.5rem', marginTop: 0 }}>Dashboard</h1>
        </div>
        <button onClick={() => navigate('/admin/event/new')} className="btn btn-primary" style={{ padding: '0.6rem 1.5rem' }}>
          <Plus size={18} /> Create Event
        </button>
      </div>

      {/* Active Events Section */}
      <section style={{ marginBottom: 'clamp(2rem, 8vw, 4rem)' }}>
        <h2 style={{ fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--accent)', marginBottom: 'clamp(1rem, 4vw, 2rem)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></div> Active Events
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 'clamp(1rem, 4vw, 2rem)' }}>
          {activeEvents.length === 0 ? (
            <div className="glass-card" style={{ gridColumn: '1 / -1', padding: '4rem', textAlign: 'center', opacity: 0.6 }}>
              <Calendar size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)' }}>No active events found.</p>
            </div>
          ) : (
            activeEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} navigate={navigate} />
            ))
          )}
        </div>
      </section>

      {/* Past Events Section */}
      {pastEvents.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'currentColor' }}></div> Past Events
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '2rem', opacity: 0.8 }}>
            {pastEvents.map((event, index) => (
              <EventCard key={event.id} event={event} index={index + 10} navigate={navigate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

const EventCard = ({ event, index, navigate }) => (
  <motion.div
    onClick={() => navigate(`/admin/event/${event.id}`)}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    whileHover={{ y: -4, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
    className="glass-card"
    style={{ overflow: 'hidden', cursor: 'pointer', padding: 0, border: '1px solid var(--border)' }}>

    {/* Banner Image */}
    <div style={{ position: 'relative', height: '180px', background: 'var(--border)', overflow: 'hidden' }}>
      {event.poster_url ? (
        <img
          src={event.poster_url}
          alt={event.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent-bg), var(--bg))' }}>
          <Calendar size={40} color="var(--accent)" style={{ opacity: 0.4 }} />
        </div>
      )}
      {/* Status badge overlay */}
      <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
        <span className={`badge ${event.status === 'finished' ? '' : 'badge-arrived'}`}>{event.status}</span>
      </div>
    </div>

    {/* Card Body */}
    <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', marginTop: 0, color: 'var(--text-h)' }}>{event.name}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <Calendar size={14} /> {new Date(event.event_time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <MapPin size={14} /> {event.venue}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <User size={14} /> {event.creator?.full_name || 'Unknown'}
        </div>
      </div>
      <button className="btn btn-ghost" style={{ width: '100%', fontSize: '0.85rem' }}>
        Manage Event
      </button>
    </div>
  </motion.div>
);

export default AdminDashboard;
