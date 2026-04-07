import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { motion } from 'framer-motion';
import { MessageSquare, Star, Search, CheckCircle, ArrowRight, User } from 'lucide-react';

const FeedbackForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('search'); // search, form, success
  const [searchVal, setSearchVal] = useState('');
  const [registration, setRegistration] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [feedback, setFeedback] = useState({
    rating: 5,
    comments: '',
    suggestions: ''
  });

  useEffect(() => {
    fetchEvent();
  }, [id]);

  const fetchEvent = async () => {
    const { data } = await supabase.from('events').select('*').eq('id', id).single();
    if (data) setEvent(data);
    setLoading(false);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', id)
      .or(`email.eq.${searchVal},moodle_id.eq.${searchVal}`)
      .single();

    if (data) {
      if (data.feedback_data) {
        alert("You have already submitted feedback for this event!");
      } else if (!data.present) {
        alert("Feedback is only available for participants who attended the event.");
      } else {
        setRegistration(data);
        setStatus('form');
      }
    } else {
      alert("Registration not found. Please check your email or Moodle ID.");
    }
    setLoading(false);
  };

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    const { error } = await supabase
      .from('registrations')
      .update({ feedback_data: feedback })
      .eq('id', registration.id);

    if (!error) {
      setStatus('success');
    } else {
      alert(error.message);
    }
    setSubmitting(false);
  };

  if (loading && status === 'search') return <div className="container" style={{ padding: '5rem', textAlign: 'center' }}>Loading...</div>;
  if (!event) return <div className="container" style={{ padding: '5rem', textAlign: 'center' }}>Event not found.</div>;

  return (
    <div className="container" style={{ padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '3rem' }}>
          
          {status === 'search' && (
            <>
              <MessageSquare size={48} className="text-primary" style={{ marginBottom: '1.5rem' }} />
              <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Event Feedback</h1>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>We'd love to hear your thoughts on <strong>{event.name}</strong>. Please enter your registration details to continue.</p>
              
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
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'var(--accent)' }}>
                  <User size={24} />
                </div>
                <div>
                  <h3 style={{ marginBottom: '0.25rem' }}>Hi, {registration.participant_name}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Share your experience with us</p>
                </div>
              </div>

              <form onSubmit={handleSubmitFeedback} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label className="label">Rate your experience (1-5)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', padding: '1rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        size={32} 
                        fill={feedback.rating >= star ? 'var(--accent)' : 'none'} 
                        color={feedback.rating >= star ? 'var(--accent)' : 'var(--text-muted)'}
                        style={{ cursor: 'pointer' }}
                        onClick={() => setFeedback({...feedback, rating: star})}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="label">What did you like most?</label>
                  <textarea className="input" style={{ height: '100px', resize: 'none' }} placeholder="Your comments..." 
                    value={feedback.comments} onChange={e => setFeedback({...feedback, comments: e.target.value})} required />
                </div>
                <div>
                  <label className="label">Any suggestions for next time?</label>
                  <textarea className="input" style={{ height: '80px', resize: 'none' }} placeholder="Help us improve" 
                    value={feedback.suggestions} onChange={e => setFeedback({...feedback, suggestions: e.target.value})} />
                </div>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? 'Submitting...' : 'Submit Feedback'} <ArrowRight size={18} />
                </button>
              </form>
            </>
          )}

          {status === 'success' && (
            <div style={{ textAlign: 'center' }}>
              <CheckCircle size={64} style={{ color: '#10b981', marginBottom: '1.5rem' }} />
              <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Thank You!</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Your feedback has been recorded successfully. We appreciate your time!</p>
              <button onClick={() => navigate('/')} className="btn btn-ghost" style={{ width: '100%' }}>Go to Homepage</button>
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
