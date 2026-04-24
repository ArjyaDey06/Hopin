import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { MessageSquare, Star, Search, CheckCircle, ArrowRight, User, Lock } from 'lucide-react';

const DEFAULT_QUESTIONS = [
  { id: 'q1', label: 'What did you like most?', placeholder: 'Your comments...', required: true },
  { id: 'q2', label: 'Any suggestions for next time?', placeholder: 'Help us improve', required: false },
];

const FeedbackForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('search'); // search | form | success
  const [searchVal, setSearchVal] = useState('');
  const [registration, setRegistration] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const [rating, setRating] = useState(0);
  const [answers, setAnswers] = useState({});

  useEffect(() => { fetchEvent(); }, [id]);

  const fetchEvent = async () => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single();
    if (data) setEvent(data);
    setLoading(false);
  };

  const questions =
    event?.feedback_questions && event.feedback_questions.length > 0
      ? event.feedback_questions
      : DEFAULT_QUESTIONS;

  // Init answers map when questions load
  useEffect(() => {
    const init = {};
    questions.forEach(q => { init[q.id] = ''; });
    setAnswers(init);
  }, [event]);

  const isClosed = event?.status === 'finished';

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', id)
      .or(`email.eq.${searchVal},moodle_id.eq.${searchVal}`)
      .single();

    if (data) {
      if (data.feedback_data) {
        alert('You have already submitted feedback for this event!');
      } else {
        setRegistration(data);
        setStatus('form');
      }
    } else {
      alert('Registration not found. Please check your email or Moodle ID.');
    }
    setLoading(false);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please give a star rating before submitting.');
      return;
    }
    setSubmitting(true);

    const feedback_data = { rating, answers };

    const { error } = await supabase
      .from('registrations')
      .update({ feedback_data, present: true })
      .eq('id', registration.id);

    if (!error) {
      setStatus('success');
    } else {
      alert(error.message);
    }
    setSubmitting(false);
  };

  if (loading && status === 'search')
    return <div className="container" style={{ padding: '5rem', textAlign: 'center' }}>Loading...</div>;
  if (!event)
    return <div className="container" style={{ padding: '5rem', textAlign: 'center' }}>Event not found.</div>;

  if (isClosed)
    return (
      <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3rem) 1rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Lock size={32} color="var(--accent)" />
            </div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '0.75rem', marginTop: 0 }}>Feedback Closed</h1>
            <p style={{ color: 'var(--text-muted)', margin: 0 }}>The feedback window for <strong>{event.name}</strong> has been closed. Thank you!</p>
          </motion.div>
        </div>
      </div>
    );

  return (
    <div className="container" style={{ padding: 'clamp(1.5rem, 5vw, 3rem) 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: 'clamp(1.5rem, 5vw, 3rem)' }}>

          {status === 'search' && (
            <>
              <MessageSquare size={48} className="text-primary" style={{ marginBottom: '1.5rem' }} />
              <h1 style={{ fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', marginBottom: '1rem' }}>Event Feedback</h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'clamp(1.5rem, 5vw, 2.5rem)' }}>
                We'd love to hear your thoughts on <strong>{event.name}</strong>. Please enter your registration details to continue.
              </p>
              <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label className="label">Moodle ID or College Email</label>
                  <input required className="input" placeholder="e.g. 23107062 or student@apsit.edu.in" value={searchVal} onChange={e => setSearchVal(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary">Find My Registration <Search size={18} /></button>
              </form>
            </>
          )}

          {status === 'form' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>Hi, {registration.participant_name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Share your experience with us</p>
                </div>
              </div>

              <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Star Rating */}
                <div>
                  <label className="label">Rate your experience (1–5) *</label>
                  <div style={{ display: 'flex', gap: 'clamp(0.25rem, 2vw, 0.5rem)', justifyContent: 'center', padding: 'clamp(0.75rem, 3vw, 1rem)', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: `1px solid ${rating === 0 ? 'var(--border)' : 'var(--accent-border)'}`, transition: 'border-color 0.2s' }}>
                    {[1, 2, 3, 4, 5].map(star => {
                      const filled = (hoveredStar || rating) >= star;
                      return (
                        <Star
                          key={star}
                          size={36}
                          fill={filled ? 'var(--accent)' : 'none'}
                          color={filled ? 'var(--accent)' : 'var(--accent)'}
                          style={{ cursor: 'pointer', transition: 'transform 0.15s, opacity 0.15s', transform: filled ? 'scale(1.18)' : 'scale(1)', opacity: filled ? 1 : 0.3 }}
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoveredStar(star)}
                          onMouseLeave={() => setHoveredStar(0)}
                        />
                      );
                    })}
                  </div>
                  {rating === 0 && (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>Click a star to rate</p>
                  )}
                </div>

                {/* Dynamic Questions */}
                {questions.map(q => (
                  <div key={q.id}>
                    <label className="label">{q.label}{q.required && ' *'}</label>
                    <textarea
                      className="input"
                      style={{ height: '100px', resize: 'none' }}
                      placeholder={q.placeholder || ''}
                      value={answers[q.id] || ''}
                      onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                      required={q.required}
                    />
                  </div>
                ))}

                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Submitting...' : 'Submit Feedback'} <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: 'clamp(1.5rem, 5vw, 2rem)', marginBottom: '1rem' }}>Thank You!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 0 }}>Your feedback has been recorded successfully. We appreciate your time!</p>
            </div>
          )}

        </motion.div>
      </div>

      <style>{`
        .label { display: block; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--text-h); }
      `}</style>
    </div>
  );
};

export default FeedbackForm;
