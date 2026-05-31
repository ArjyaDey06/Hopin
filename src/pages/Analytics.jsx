import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  BarChart2, Users, CheckCircle, Star, Calendar, 
  Percent, ArrowLeft, RefreshCw, Trophy, BookOpen, 
  Building2, ArrowUpRight, Award, TrendingUp, Download 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

const Analytics = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [eventsRes, regsRes] = await Promise.all([
        supabase
          .from('events')
          .select('*, creator:profiles!created_by(full_name)')
          .order('event_time', { ascending: false }),
        supabase
          .from('registrations')
          .select('*')
      ]);

      if (eventsRes.data) setEvents(eventsRes.data);
      if (regsRes.data) setRegistrations(regsRes.data);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 1. Filter registrations based on selected event drill-down
  const activeEventData = selectedEventId === 'all' 
    ? events 
    : events.filter(e => e.id === selectedEventId);

  const activeRegs = selectedEventId === 'all'
    ? registrations
    : registrations.filter(r => r.event_id === selectedEventId);

  // 2. Statistics Computations
  const totalEvents = activeEventData.length;
  const activeEventsCount = activeEventData.filter(e => e.status !== 'finished').length;
  const completedEventsCount = activeEventData.filter(e => e.status === 'finished').length;

  const totalRegistrations = activeRegs.length;
  
  const arrivedCount = activeRegs.filter(r => r.arrived).length;
  const presentCount = activeRegs.filter(r => r.present).length;
  
  const arrivalRate = totalRegistrations > 0 
    ? Math.round((arrivedCount / totalRegistrations) * 100) 
    : 0;
    
  const presenceRate = totalRegistrations > 0 
    ? Math.round((presentCount / totalRegistrations) * 100) 
    : 0;

  // Feedback calculations
  const ratings = activeRegs
    .map(r => r.feedback_data?.rating)
    .filter(val => typeof val === 'number' && val >= 1 && val <= 5);

  const feedbackCount = ratings.length;
  const avgRating = feedbackCount > 0
    ? (ratings.reduce((acc, val) => acc + val, 0) / feedbackCount).toFixed(1)
    : '0.0';

  const feedbackSubmissionRate = totalRegistrations > 0
    ? Math.round((feedbackCount / totalRegistrations) * 100)
    : 0;

  // Star distribution breakdown
  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach(r => {
    const rounded = Math.round(r);
    if (starCounts[rounded] !== undefined) {
      starCounts[rounded]++;
    }
  });

  // Capacity calculations
  const totalCapacity = activeEventData.reduce((acc, e) => acc + (e.capacity || 0), 0);
  const eventsWithCapacity = activeEventData.filter(e => typeof e.capacity === 'number' && e.capacity > 0);
  const capacityUsedSum = eventsWithCapacity.reduce((acc, e) => acc + e.capacity, 0);
  const regsForCapacityEvents = activeRegs.filter(r => {
    const ev = events.find(e => e.id === r.event_id);
    return ev && typeof ev.capacity === 'number' && ev.capacity > 0;
  }).length;

  const capacityUtilization = capacityUsedSum > 0
    ? Math.round((regsForCapacityEvents / capacityUsedSum) * 100)
    : 0;

  // 3. Department distribution calculation
  const deptCounts = {};
  activeRegs.forEach(r => {
    const rawDept = (r.department || 'Other').trim().toUpperCase();
    deptCounts[rawDept] = (deptCounts[rawDept] || 0) + 1;
  });

  const departmentData = Object.entries(deptCounts)
    .map(([name, count]) => ({
      name,
      count,
      pct: totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5); // Limit to top 5 departments

  // 4. Academic year distribution calculation
  const yearCounts = {};
  activeRegs.forEach(r => {
    let yearLabel = 'N/A';
    const rawYear = (r.year || '').trim().toUpperCase();
    if (rawYear === 'FE' || rawYear === '1ST YEAR' || rawYear === '1') yearLabel = 'FE (First Year)';
    else if (rawYear === 'SE' || rawYear === '2ND YEAR' || rawYear === '2') yearLabel = 'SE (Second Year)';
    else if (rawYear === 'TE' || rawYear === '3RD YEAR' || rawYear === '3') yearLabel = 'TE (Third Year)';
    else if (rawYear === 'BE' || rawYear === '4TH YEAR' || rawYear === '4') yearLabel = 'BE (Final Year)';
    else if (rawYear) yearLabel = rawYear;
    
    yearCounts[yearLabel] = (yearCounts[yearLabel] || 0) + 1;
  });

  const yearData = Object.entries(yearCounts)
    .map(([name, count]) => ({
      name,
      count,
      pct: totalRegistrations > 0 ? Math.round((count / totalRegistrations) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // 5. Individual event summaries (for performance list)
  const eventSummaries = events.map(e => {
    const evRegs = registrations.filter(r => r.event_id === e.id);
    const evArrived = evRegs.filter(r => r.arrived).length;
    const evRatings = evRegs
      .map(r => r.feedback_data?.rating)
      .filter(val => typeof val === 'number');
    
    const evAvgRating = evRatings.length > 0
      ? (evRatings.reduce((acc, v) => acc + v, 0) / evRatings.length).toFixed(1)
      : '0.0';

    return {
      id: e.id,
      name: e.name,
      time: e.event_time,
      status: e.status,
      capacity: e.capacity,
      registrations: evRegs.length,
      arrived: evArrived,
      feedbackCount: evRatings.length,
      avgRating: evAvgRating
    };
  });

  const filteredEventSummaries = eventSummaries.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportSummariesToCSV = () => {
    const headers = ["Event Name", "Date", "Status", "Capacity", "Registrations", "Checked-in", "Feedbacks Received", "Avg Rating"];
    const rows = eventSummaries.map(e => [
      e.name,
      new Date(e.time).toLocaleDateString('en-GB'),
      e.status,
      e.capacity || "Unlimited",
      e.registrations,
      e.arrived,
      e.feedbackCount,
      e.avgRating
    ]);
    
    let csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(row => row.map(val => `"${val}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Hopin_Event_Performance_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEventChange = (e) => {
    setSelectedEventId(e.target.value);
  };

  return (
    <div className="an-root">
      {/* Header section */}
      <header className="an-header">
        <div className="an-title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button onClick={() => navigate('/admin')} className="an-back-btn">
              <ArrowLeft size={16} /> Back
            </button>
            <span className="an-badge-live">Live Insights</span>
          </div>
          <h1 className="an-title">Event Performance Analytics</h1>
          <p className="an-subtitle">Real-time attendance summaries, feedback analysis, and demographics.</p>
        </div>

        <div className="an-header-actions">
          <div className="an-select-wrap">
            <Calendar size={15} className="an-select-icon" />
            <select className="an-select" value={selectedEventId} onChange={handleEventChange}>
              <option value="all">All Events Aggregate</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name.length > 32 ? `${e.name.substring(0, 32)}…` : e.name}
                </option>
              ))}
            </select>
          </div>

          <button 
            className="an-btn-refresh" 
            onClick={() => fetchData(true)} 
            disabled={refreshing || loading}
            title="Refresh statistics"
          >
            <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="an-loading-state">
          <div className="an-spinner" />
          <p>Compiling database statistics…</p>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.3 }}
          className="an-content"
        >
          {/* Metrics Grid */}
          <div className="an-metrics-grid">
            <div className="an-metric-card">
              <div className="an-metric-header">
                <span className="an-metric-title">Registrations</span>
                <Users size={18} className="an-metric-icon blue" />
              </div>
              <div className="an-metric-value">{totalRegistrations}</div>
              <div className="an-metric-footer">
                {selectedEventId === 'all' ? (
                  <span>Across {totalEvents} registered events</span>
                ) : (
                  <span>
                    Fill Ratio: {events.find(e => e.id === selectedEventId)?.capacity 
                      ? `${Math.round((totalRegistrations / events.find(e => e.id === selectedEventId).capacity) * 100)}% of limit` 
                      : 'Unlimited capacity'}
                  </span>
                )}
              </div>
            </div>

            <div className="an-metric-card">
              <div className="an-metric-header">
                <span className="an-metric-title">Attendance Rate</span>
                <CheckCircle size={18} className="an-metric-icon green" />
              </div>
              <div className="an-metric-value">{arrivalRate}%</div>
              <div className="an-metric-footer">
                <span>{arrivedCount} checked-in | {presentCount} currently present</span>
              </div>
            </div>

            <div className="an-metric-card">
              <div className="an-metric-header">
                <span className="an-metric-title">Satisfaction Rating</span>
                <Star size={18} className="an-metric-icon yellow" />
              </div>
              <div className="an-metric-value-stars">
                <span>{avgRating}</span>
                <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      fill={i < Math.round(parseFloat(avgRating)) ? 'var(--ieee-yellow)' : 'transparent'} 
                      color="var(--ieee-yellow)" 
                    />
                  ))}
                </div>
              </div>
              <div className="an-metric-footer">
                <span>Based on {feedbackCount} student feedbacks ({feedbackSubmissionRate}% submission)</span>
              </div>
            </div>

            <div className="an-metric-card">
              <div className="an-metric-header">
                <span className="an-metric-title">Capacity Filled</span>
                <Percent size={18} className="an-metric-icon orange" />
              </div>
              <div className="an-metric-value">
                {selectedEventId === 'all' ? `${capacityUtilization}%` : (
                  events.find(e => e.id === selectedEventId)?.capacity 
                    ? `${Math.round((totalRegistrations / events.find(e => e.id === selectedEventId).capacity) * 100)}%`
                    : '100%'
                )}
              </div>
              <div className="an-metric-footer">
                {selectedEventId === 'all' ? (
                  <span>Aggregate utilization of all spaces</span>
                ) : (
                  <span>
                    {totalRegistrations} booked / {events.find(e => e.id === selectedEventId)?.capacity || '∞'} capacity
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Visualization Charts Grid */}
          <div className="an-charts-grid">
            {/* 1. Funnel Check-in */}
            <div className="an-chart-card">
              <h3 className="an-chart-title">
                <TrendingUp size={16} style={{ color: 'var(--ieee-blue)' }} /> Checked-in Funnel
              </h3>
              <p className="an-chart-subtitle">Attendee conversion flow from booking to scan verification.</p>
              
              <div className="an-funnel-container">
                <div className="an-funnel-step">
                  <div className="an-funnel-label-box">
                    <span className="an-funnel-step-name">1. Registered Students</span>
                    <span className="an-funnel-step-count">{totalRegistrations}</span>
                  </div>
                  <div className="an-funnel-bar-outer">
                    <div className="an-funnel-bar-inner primary" style={{ width: '100%' }} />
                  </div>
                </div>

                <div className="an-funnel-step">
                  <div className="an-funnel-label-box">
                    <span className="an-funnel-step-name">2. Arrived (Scanned)</span>
                    <span className="an-funnel-step-count">{arrivedCount} <span className="an-funnel-pct">({arrivalRate}%)</span></span>
                  </div>
                  <div className="an-funnel-bar-outer">
                    <div className="an-funnel-bar-inner arrived" style={{ width: `${arrivalRate}%` }} />
                  </div>
                </div>

                <div className="an-funnel-step">
                  <div className="an-funnel-label-box">
                    <span className="an-funnel-step-name">3. Marked Present</span>
                    <span className="an-funnel-step-count">{presentCount} <span className="an-funnel-pct">({presenceRate}%)</span></span>
                  </div>
                  <div className="an-funnel-bar-outer">
                    <div className="an-funnel-bar-inner present" style={{ width: `${presenceRate}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Top Departments */}
            <div className="an-chart-card">
              <h3 className="an-chart-title">
                <Building2 size={16} style={{ color: 'var(--ieee-green)' }} /> Registration by Department
              </h3>
              <p className="an-chart-subtitle">Top academic branches engaging with event registrations.</p>
              
              <div className="an-bars-list">
                {departmentData.length > 0 ? departmentData.map((dept, i) => (
                  <div key={i} className="an-bar-row">
                    <div className="an-bar-info">
                      <span className="an-bar-label">{dept.name}</span>
                      <span className="an-bar-value">{dept.count} <span className="an-bar-pct">({dept.pct}%)</span></span>
                    </div>
                    <div className="an-bar-track">
                      <div className="an-bar-fill dept" style={{ width: `${dept.pct}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="an-empty-chart">No department details recorded yet.</div>
                )}
              </div>
            </div>

            {/* 3. Academic Year Breakdowns */}
            <div className="an-chart-card">
              <h3 className="an-chart-title">
                <BookOpen size={16} style={{ color: 'var(--ieee-orange)' }} /> Year of Study Breakdown
              </h3>
              <p className="an-chart-subtitle">Participation profile distributed by academic seniority.</p>
              
              <div className="an-bars-list">
                {yearData.length > 0 ? yearData.map((y, i) => (
                  <div key={i} className="an-bar-row">
                    <div className="an-bar-info">
                      <span className="an-bar-label">{y.name}</span>
                      <span className="an-bar-value">{y.count} <span className="an-bar-pct">({y.pct}%)</span></span>
                    </div>
                    <div className="an-bar-track">
                      <div className="an-bar-fill year" style={{ width: `${y.pct}%` }} />
                    </div>
                  </div>
                )) : (
                  <div className="an-empty-chart">No student year details recorded yet.</div>
                )}
              </div>
            </div>

            {/* 4. Feedback Review Distribution */}
            <div className="an-chart-card">
              <h3 className="an-chart-title">
                <Award size={16} style={{ color: 'var(--ieee-yellow)' }} /> Satisfaction Distribution
              </h3>
              <p className="an-chart-subtitle">Breakdown of star ratings submitted by checked-in participants.</p>
              
              <div className="an-bars-list">
                {feedbackCount > 0 ? [5, 4, 3, 2, 1].map(stars => {
                  const count = starCounts[stars] || 0;
                  const pct = Math.round((count / feedbackCount) * 100);
                  return (
                    <div key={stars} className="an-bar-row">
                      <div className="an-bar-info">
                        <span className="an-bar-label star-label">
                          {stars} <Star size={12} fill="var(--ieee-yellow)" color="var(--ieee-yellow)" style={{ display: 'inline', verticalAlign: 'middle', marginLeft: '2px' }} />
                        </span>
                        <span className="an-bar-value">{count} <span className="an-bar-pct">({pct}%)</span></span>
                      </div>
                      <div className="an-bar-track">
                        <div className="an-bar-fill rating" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }) : (
                  <div className="an-empty-chart" style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    No feedback star ratings recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Overall Performance Table Directory */}
          <div className="an-table-section">
            <div className="an-table-header-block">
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-h)' }}>Event Performance Directory</h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Comparative metrics across all events.</p>
              </div>

              <div className="an-table-actions">
                <input 
                  type="text" 
                  className="an-search" 
                  placeholder="Search events by name…" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="an-btn-csv" onClick={exportSummariesToCSV}>
                  <Download size={14} /> Export CSV
                </button>
              </div>
            </div>

            <div className="an-table-wrap">
              {filteredEventSummaries.length === 0 ? (
                <div className="an-empty-table">No matching records found.</div>
              ) : (
                <>
                  {/* Desktop view */}
                  <table className="an-table">
                    <thead>
                      <tr>
                        <th>Event Name</th>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Registrations</th>
                        <th>Attendance Rate</th>
                        <th>Feedback Received</th>
                        <th>Satisfaction</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEventSummaries.map(summary => (
                        <tr 
                          key={summary.id} 
                          className="an-table-row" 
                          onClick={() => {
                            setSelectedEventId(summary.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          <td style={{ fontWeight: 600, color: 'var(--text-h)' }}>{summary.name}</td>
                          <td className="an-table-meta">{fmtDate(summary.time)}</td>
                          <td>
                            <span className={`an-pill ${summary.status}`}>
                              {summary.status === 'finished' ? 'Completed' : summary.status === 'closed' ? 'Closed' : 'Active'}
                            </span>
                          </td>
                          <td className="an-table-meta">
                            {summary.registrations} 
                            {summary.capacity && <span className="an-sub-meta"> / {summary.capacity} limit</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontWeight: 600 }}>
                                {summary.registrations > 0 ? `${Math.round((summary.arrived / summary.registrations) * 100)}%` : '0%'}
                              </span>
                              <span className="an-sub-meta">({summary.arrived} in)</span>
                            </div>
                          </td>
                          <td className="an-table-meta">{summary.feedbackCount} responses</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Star size={12} fill="var(--ieee-yellow)" color="var(--ieee-yellow)" />
                              <span style={{ fontWeight: 600 }}>{summary.avgRating}</span>
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--accent)' }}>
                            <ArrowUpRight size={15} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Mobile responsive view */}
                  <div className="an-mobile-list">
                    {filteredEventSummaries.map(summary => (
                      <div 
                        key={summary.id} 
                        className="an-mobile-card"
                        onClick={() => {
                          setSelectedEventId(summary.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        <div className="an-mobile-card-top">
                          <span style={{ fontWeight: 600, color: 'var(--text-h)', fontSize: '0.95rem' }}>{summary.name}</span>
                          <span className={`an-pill ${summary.status}`}>
                            {summary.status === 'finished' ? 'Completed' : summary.status === 'closed' ? 'Closed' : 'Active'}
                          </span>
                        </div>
                        <div className="an-mobile-card-meta">
                          <span>Date: {fmtDate(summary.time)}</span>
                          <span>Registrations: <strong>{summary.registrations}</strong> {summary.capacity ? `/ ${summary.capacity}` : ''}</span>
                          <span>
                            Attendance: <strong>{summary.registrations > 0 ? `${Math.round((summary.arrived / summary.registrations) * 100)}%` : '0%'}</strong> ({summary.arrived} arrived)
                          </span>
                          <span>
                            Satisfaction: <Star size={11} fill="var(--ieee-yellow)" color="var(--ieee-yellow)" style={{ display: 'inline', verticalAlign: 'middle' }} /> <strong>{summary.avgRating}</strong> ({summary.feedbackCount} responses)
                          </span>
                        </div>
                        <div className="an-mobile-card-drill">
                          <span>Drill Down Metrics</span>
                          <ArrowUpRight size={13} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Styled Scoped CSS Blocks */}
      <style>{`
        .an-root {
          max-width: 1120px;
          margin: 0 auto;
          padding: 2.5rem 1.5rem 4rem;
          width: 100%;
          box-sizing: border-box;
        }

        /* ── Header Area ── */
        .an-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
          flex-wrap: wrap;
        }
        .an-title-block {
          flex: 1;
          min-width: 290px;
        }
        .an-back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0.25rem 0.6rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .an-back-btn:hover {
          border-color: var(--text-muted);
          color: var(--text-h);
        }
        .an-badge-live {
          display: inline-flex;
          align-items: center;
          background: var(--accent-bg);
          color: var(--accent);
          border: 1px solid var(--accent-border);
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .an-title {
          font-size: clamp(1.6rem, 4.5vw, 2.1rem);
          font-weight: 600;
          color: var(--text-h);
          letter-spacing: -0.025em;
          margin: 0.5rem 0 0.25rem;
          line-height: 1.2;
        }
        .an-subtitle {
          margin: 0;
          font-size: 0.88rem;
          color: var(--text-muted);
        }
        .an-header-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-shrink: 0;
        }
        .an-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .an-select-icon {
          position: absolute;
          left: 10px;
          color: var(--text-muted);
          pointer-events: none;
        }
        .an-select {
          appearance: none;
          background: var(--social-bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 0 2.2rem 0 1.9rem;
          height: 38px;
          font-size: 0.85rem;
          color: var(--text-h);
          cursor: pointer;
          font-weight: 500;
          outline: none;
          backdrop-filter: blur(8px);
          max-width: 250px;
          text-overflow: ellipsis;
        }
        .an-select:focus {
          border-color: var(--accent);
        }
        .an-btn-refresh {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--social-bg);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: border-color 0.2s, color 0.2s;
        }
        .an-btn-refresh:hover {
          border-color: var(--text-muted);
          color: var(--text-h);
        }

        /* ── Loading and Spinner ── */
        .an-loading-state {
          padding: 6rem 2rem;
          text-align: center;
          color: var(--text-muted);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .an-spinner {
          width: 36px;
          height: 36px;
          border: 3.5px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }

        /* ── Metrics Grid ── */
        .an-metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }
        .an-metric-card {
          background: var(--social-bg);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 1.25rem 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          backdrop-filter: blur(8px);
        }
        .an-metric-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .an-metric-title {
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
        }
        .an-metric-icon {
          padding: 0.25rem;
          border-radius: 4px;
        }
        .an-metric-icon.blue { background: rgba(0, 98, 155, 0.1); color: var(--ieee-blue); }
        .an-metric-icon.green { background: rgba(120, 190, 32, 0.1); color: var(--ieee-green); }
        .an-metric-icon.yellow { background: rgba(255, 199, 44, 0.15); color: #d6a11e; }
        .an-metric-icon.orange { background: rgba(255, 130, 0, 0.1); color: var(--ieee-orange); }
        
        .an-metric-value {
          font-size: 2.1rem;
          font-weight: 300;
          color: var(--text-h);
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0.2rem 0;
          font-variant-numeric: tabular-nums;
        }
        .an-metric-value-stars {
          display: flex;
          align-items: baseline;
          gap: 0.5rem;
          font-size: 2.1rem;
          font-weight: 300;
          color: var(--text-h);
          letter-spacing: -0.03em;
          line-height: 1.1;
          margin: 0.2rem 0;
        }
        .an-metric-footer {
          font-size: 0.8rem;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Charts Grid ── */
        .an-charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(480px, 1fr));
          gap: 1.25rem;
          margin-bottom: 2.5rem;
        }
        @media (max-width: 1024px) {
          .an-charts-grid { grid-template-columns: 1fr; }
        }
        .an-chart-card {
          background: var(--social-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(8px);
          display: flex;
          flex-direction: column;
        }
        .an-chart-title {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-h);
          margin: 0 0 0.2rem;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .an-chart-subtitle {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 0 0 1.5rem;
        }

        /* ── Check-in Funnel Custom Design ── */
        .an-funnel-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin: auto 0;
        }
        .an-funnel-step {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }
        .an-funnel-label-box {
          display: flex;
          justify-content: space-between;
          font-size: 0.83rem;
          font-weight: 500;
          color: var(--text-h);
        }
        .an-funnel-pct {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 400;
        }
        .an-funnel-bar-outer {
          height: 14px;
          background: var(--code-bg);
          border: 1px solid var(--border);
          border-radius: 4px;
          overflow: hidden;
        }
        .an-funnel-bar-inner {
          height: 100%;
          border-radius: 3px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .an-funnel-bar-inner.primary { background: var(--ieee-blue); }
        .an-funnel-bar-inner.arrived { background: var(--ieee-orange); }
        .an-funnel-bar-inner.present { background: var(--ieee-green); }

        /* ── Standard Bars list ── */
        .an-bars-list {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          margin: auto 0;
        }
        .an-bar-row {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .an-bar-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          color: var(--text-h);
        }
        .an-bar-label {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 65%;
        }
        .an-bar-label.star-label {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .an-bar-value {
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .an-bar-pct {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-weight: 400;
        }
        .an-bar-track {
          height: 8px;
          background: var(--code-bg);
          border-radius: 99px;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .an-bar-fill {
          height: 100%;
          border-radius: 99px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .an-bar-fill.dept { background: var(--ieee-blue); }
        .an-bar-fill.year { background: var(--ieee-green); }
        .an-bar-fill.rating { background: var(--ieee-yellow); }

        .an-empty-chart {
          padding: 3rem 1rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.82rem;
        }

        /* ── Directory Table Section ── */
        .an-table-section {
          background: var(--social-bg);
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          backdrop-filter: blur(8px);
          margin-bottom: 2rem;
        }
        .an-table-header-block {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 1rem;
        }
        .an-table-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .an-search {
          padding: 0.4rem 0.8rem;
          font-size: 0.82rem;
          border: 1px solid var(--border);
          border-radius: 6px;
          background: var(--bg);
          color: var(--text-h);
          outline: none;
          width: 220px;
          font-family: var(--sans);
          transition: border-color 0.2s;
        }
        .an-search:focus {
          border-color: var(--accent);
        }
        .an-btn-csv {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-h);
          padding: 0.4rem 0.8rem;
          border-radius: 6px;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: var(--sans);
        }
        .an-btn-csv:hover {
          border-color: var(--text-muted);
          background: var(--code-bg);
        }

        /* ── Desktop Table ── */
        .an-table-wrap {
          overflow-x: auto;
        }
        .an-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.83rem;
          text-align: left;
        }
        .an-table thead tr {
          background: var(--code-bg);
          border-bottom: 1px solid var(--border);
        }
        .an-table th {
          padding: 0.75rem 1.25rem;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          white-space: nowrap;
        }
        .an-table-row {
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.12s;
        }
        .an-table-row:last-child { border-bottom: none; }
        .an-table-row:hover { background: var(--code-bg); }
        .an-table td {
          padding: 0.85rem 1.25rem;
          vertical-align: middle;
        }
        .an-table-meta {
          color: var(--text-muted);
          white-space: nowrap;
        }
        .an-sub-meta {
          font-size: 0.72rem;
          opacity: 0.7;
          font-weight: 400;
        }
        .an-empty-table {
          padding: 4rem 2rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        /* Status Pill */
        .an-pill {
          display: inline-flex;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .an-pill.published { background: var(--accent-bg); color: var(--accent); border: 1px solid var(--accent-border); }
        .an-pill.finished { background: var(--code-bg); color: var(--text-muted); border: 1px solid var(--border); }
        .an-pill.closed { background: rgba(255, 130, 0, 0.1); color: var(--ieee-orange); border: 1px solid rgba(255, 130, 0, 0.25); }

        /* ── Mobile Layout Collapsible Cards ── */
        .an-mobile-list {
          display: none;
        }
        .an-mobile-card {
          padding: 1.25rem 1rem;
          border-bottom: 1px solid var(--border);
          cursor: pointer;
          transition: background 0.12s;
        }
        .an-mobile-card:last-child { border-bottom: none; }
        .an-mobile-card:hover { background: var(--code-bg); }
        .an-mobile-card-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
          gap: 0.5rem;
        }
        .an-mobile-card-meta {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          margin-bottom: 0.75rem;
        }
        .an-mobile-card-meta strong {
          color: var(--text-h);
        }
        .an-mobile-card-drill {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          color: var(--accent);
          font-weight: 600;
        }

        /* ── Mobile Optimization Queries ── */
        @media (max-width: 768px) {
          .an-root { padding: 1.5rem 1rem 3rem; }
          .an-header { gap: 1rem; margin-bottom: 1.5rem; }
          .an-table { display: none; }
          .an-mobile-list { display: block; }
          .an-charts-grid { gap: 1rem; }
          .an-chart-card { padding: 1.1rem; }
          .an-select { max-width: 100%; width: 100%; }
          .an-header-actions { width: 100%; justify-content: space-between; }
          .an-select-wrap { flex: 1; }
          .an-metric-card { padding: 1rem 1.15rem; }
          .an-metric-value, .an-metric-value-stars { font-size: 1.8rem; }
        }

        @media (max-width: 480px) {
          .an-metrics-grid { grid-template-columns: 1fr; }
          .an-table-header-block { padding: 1rem; }
          .an-search { width: 100%; }
          .an-table-actions { width: 100%; }
          .an-btn-csv { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
};

export default Analytics;
