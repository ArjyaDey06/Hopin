import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Plus, ArrowUpRight, CalendarDays, MapPin, User, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const now = new Date();
const hour = now.getHours();
const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

const AdminDashboard = () => {
  const { profile } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const { data } = await supabase
      .from('events')
      .select('*, creator:profiles!created_by(full_name)')
      .order('created_at', { ascending: false });
    if (data) setEvents(data);
    setLoading(false);
    setRefreshing(false);
  };

  const activeEvents = events.filter(e => e.status !== 'finished');
  const pastEvents = events.filter(e => e.status === 'finished');

  const stats = [
    { label: 'Total', value: events.length, sub: 'All events' },
    { label: 'Active', value: activeEvents.length, sub: 'In progress' },
    { label: 'Completed', value: pastEvents.length, sub: 'Finished' },
  ];

  return (
    <div className="dash-root">
      {/* Page Header */}
      <header className="dash-header">
        <div className="dash-greeting">
          <h1 className="dash-title">{greeting}, {profile?.full_name?.split(' ')[0] || 'Admin'}.</h1>
          <p className="dash-subtitle">
            {now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="dash-header-actions">
          <button
            className="dash-refresh-btn"
            onClick={() => fetchEvents(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          </button>
          <button className="dash-create-btn" onClick={() => navigate('/admin/event/new')}>
            <Plus size={16} /> New Event
          </button>
        </div>
      </header>

      {/* Stat Strip */}
      <div className="dash-stat-strip">
        {stats.map((s, i) => (
          <div key={i} className="dash-stat-card">
            <span className="dash-stat-label">{s.label}</span>
            <span className="dash-stat-value">{loading ? '—' : s.value}</span>
            <span className="dash-stat-sub">{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Events Table — desktop */}
      <div className="dash-table-wrap">
        <div className="dash-table-header">
          <span className="dash-table-title">Event Directory</span>
          <span className="dash-table-count">{loading ? '…' : `${events.length} record${events.length !== 1 ? 's' : ''}`}</span>
        </div>

        {loading ? (
          <div className="dash-empty">Loading records…</div>
        ) : events.length === 0 ? (
          <div className="dash-empty">
            <CalendarDays size={32} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
            <p style={{ margin: 0 }}>No events yet. Create your first one.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Venue</th>
                  <th>Organiser</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => (
                  <tr
                    key={event.id}
                    className="dash-table-row"
                    onClick={() => navigate(`/admin/event/${event.id}`)}
                  >
                    <td>
                      <div className="dash-event-name-cell">
                        <div className="dash-avatar">
                          {event.poster_url
                            ? <img src={event.poster_url} alt="" />
                            : <span>{event.name.substring(0, 2).toUpperCase()}</span>
                          }
                        </div>
                        <span className="dash-event-name">{event.name}</span>
                      </div>
                    </td>
                    <td className="dash-meta">
                      {fmtDate(event.event_time)}
                      <span className="dash-time">{fmtTime(event.event_time)}</span>
                    </td>
                    <td className="dash-meta">{event.venue}</td>
                    <td className="dash-meta">{event.creator?.full_name || '—'}</td>
                    <td>
                      <StatusPill status={event.status} />
                    </td>
                    <td className="dash-arrow-cell">
                      <ArrowUpRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="dash-card-list">
              {events.map(event => (
                <div
                  key={event.id}
                  className="dash-event-card"
                  onClick={() => navigate(`/admin/event/${event.id}`)}
                >
                  <div className="dash-event-card-top">
                    <div className="dash-avatar">
                      {event.poster_url
                        ? <img src={event.poster_url} alt="" />
                        : <span>{event.name.substring(0, 2).toUpperCase()}</span>
                      }
                    </div>
                    <div className="dash-event-card-info">
                      <span className="dash-event-name">{event.name}</span>
                      <StatusPill status={event.status} />
                    </div>
                    <ArrowUpRight size={16} className="dash-arrow" />
                  </div>
                  <div className="dash-event-card-meta">
                    <span><CalendarDays size={12} /> {fmtDate(event.event_time)} · {fmtTime(event.event_time)}</span>
                    <span><MapPin size={12} /> {event.venue}</span>
                    <span><User size={12} /> {event.creator?.full_name || '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        /* ── Layout ── */
        .dash-root {
          max-width: 1120px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 4rem;
          width: 100%;
          box-sizing: border-box;
        }

        /* ── Header ── */
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1rem;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
        }
        .dash-title {
          font-size: clamp(1.5rem, 4vw, 2rem);
          font-weight: 600;
          color: var(--text-h);
          letter-spacing: -0.025em;
          margin: 0 0 0.25rem;
          line-height: 1.2;
        }
        .dash-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 400;
        }
        .dash-header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .dash-refresh-btn {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s;
        }
        .dash-refresh-btn:hover {
          border-color: var(--text-muted);
          color: var(--text-h);
        }
        .dash-create-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: var(--accent);
          color: #fff;
          border: none;
          padding: 0 1.1rem;
          height: 36px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          letter-spacing: 0.01em;
          transition: opacity 0.2s, box-shadow 0.2s;
          font-family: var(--sans);
        }
        .dash-create-btn:hover {
          opacity: 0.9;
          box-shadow: 0 4px 12px rgba(0, 98, 155, 0.3);
        }

        /* ── Stat Strip ── */
        .dash-stat-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .dash-stat-card {
          background: var(--social-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          backdrop-filter: blur(8px);
        }
        .dash-stat-label {
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
        }
        .dash-stat-value {
          font-size: 2.25rem;
          font-weight: 300;
          color: var(--text-h);
          letter-spacing: -0.04em;
          line-height: 1;
          font-variant-numeric: tabular-nums;
        }
        .dash-stat-sub {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        /* ── Table Wrapper ── */
        .dash-table-wrap {
          background: var(--social-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          backdrop-filter: blur(8px);
        }
        .dash-table-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .dash-table-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-h);
          letter-spacing: 0.01em;
        }
        .dash-table-count {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        /* ── Desktop Table ── */
        .dash-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }
        .dash-table thead tr {
          background: var(--code-bg);
          border-bottom: 1px solid var(--border);
        }
        .dash-table th {
          padding: 0.7rem 1.25rem;
          font-size: 0.72rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .dash-table-row {
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.12s;
        }
        .dash-table-row:last-child { border-bottom: none; }
        .dash-table-row:hover { background: var(--code-bg); }
        .dash-table td {
          padding: 0.85rem 1.25rem;
          vertical-align: middle;
        }
        .dash-event-name-cell {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .dash-event-name {
          font-weight: 500;
          color: var(--text-h);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 240px;
        }
        .dash-avatar {
          width: 34px;
          height: 34px;
          border-radius: 6px;
          border: 1px solid var(--border);
          overflow: hidden;
          flex-shrink: 0;
          background: var(--code-bg);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dash-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .dash-avatar span {
          font-size: 0.65rem;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .dash-meta {
          color: var(--text-muted);
          white-space: nowrap;
          font-size: 0.83rem;
        }
        .dash-time {
          display: block;
          font-size: 0.75rem;
          opacity: 0.7;
          margin-top: 1px;
        }
        .dash-arrow-cell {
          text-align: right;
          color: var(--text-muted);
          opacity: 0;
          transition: opacity 0.15s;
        }
        .dash-table-row:hover .dash-arrow-cell { opacity: 1; }

        /* ── Status Pill ── */
        .dash-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }
        .dash-pill-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dash-pill.active {
          background: var(--accent-bg);
          color: var(--accent);
          border: 1px solid var(--accent-border);
        }
        .dash-pill.active .dash-pill-dot { background: var(--accent); }
        .dash-pill.finished {
          background: transparent;
          color: var(--text-muted);
          border: 1px solid var(--border);
        }
        .dash-pill.finished .dash-pill-dot { background: var(--text-muted); }
        .dash-pill.closed {
          background: rgba(245, 158, 11, 0.1);
          color: #b45309;
          border: 1px solid rgba(245, 158, 11, 0.25);
        }
        .dash-pill.closed .dash-pill-dot { background: #b45309; }

        /* ── Empty state ── */
        .dash-empty {
          padding: 3.5rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.9rem;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Mobile Cards ── */
        .dash-card-list { display: none; }
        .dash-event-card {
          padding: 1rem;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.12s;
        }
        .dash-event-card:last-child { border-bottom: none; }
        .dash-event-card:hover { background: var(--code-bg); }
        .dash-event-card-top {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.6rem;
        }
        .dash-event-card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          overflow: hidden;
        }
        .dash-event-card-info .dash-event-name {
          max-width: 100%;
        }
        .dash-arrow { color: var(--text-muted); flex-shrink: 0; }
        .dash-event-card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          padding-left: calc(34px + 0.75rem);
        }
        .dash-event-card-meta span {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        /* ── Spin animation ── */
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .dash-root { padding: 1.5rem 1rem 3rem; }
          .dash-table { display: none; }
          .dash-card-list { display: block; }
          .dash-stat-strip {
            grid-template-columns: repeat(3, 1fr);
            gap: 0.6rem;
          }
          .dash-stat-card { padding: 1rem; }
          .dash-stat-value { font-size: 1.75rem; }
        }

        @media (max-width: 480px) {
          .dash-stat-strip { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; }
          .dash-stat-card { padding: 0.875rem 0.75rem; }
          .dash-stat-value { font-size: 1.5rem; }
          .dash-stat-sub { display: none; }
          .dash-header { margin-bottom: 1.5rem; }
        }
      `}</style>
    </div>
  );
};

const StatusPill = ({ status }) => {
  const cls = status === 'finished' ? 'finished' : status === 'closed' ? 'closed' : 'active';
  const label = status === 'finished' ? 'Completed' : status === 'closed' ? 'Closed' : 'Active';
  return (
    <span className={`dash-pill ${cls}`}>
      <span className="dash-pill-dot" />
      {label}
    </span>
  );
};

export default AdminDashboard;
