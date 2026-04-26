import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import { LogOut, Calendar, Shield, User, Menu, X, Pencil, Check } from 'lucide-react';

const Navbar = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setMenuOpen(false);
    navigate('/');
  };

  const openNameEdit = () => {
    setNameInput(profile?.full_name || '');
    setEditingName(true);
    setMenuOpen(false);
  };

  const saveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: nameInput.trim() })
      .eq('id', user.id);
    setSavingName(false);
    if (error) {
      alert('Failed to save name: ' + error.message);
      return;
    }
    setEditingName(false);
    window.location.reload();
  };

  const displayName = profile?.full_name || user?.email || '';

  return (
    <>
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 1.5rem',
        height: '68px',
        background: 'var(--social-bg)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img
            src="/ieee_logo.svg"
            alt="IEEE Logo"
            style={{
              width: 'clamp(140px, 30vw, 220px)',
              height: 'auto',
              display: 'block',
            }}
          />
        </Link>

        {/* Desktop Nav */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }} className="nav-desktop">
            {profile?.role === 'superadmin' && (
              <Link to="/admin/manage" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
                <Shield size={16} /> Manage Users
              </Link>
            )}
            <Link to="/admin" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textDecoration: 'none', color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600 }}>
              <Calendar size={16} /> Dashboard
            </Link>

            {/* User chip — click to edit name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-h)' }}>
              <User size={15} />
              <span
                onClick={openNameEdit}
                title="Click to edit your name"
                style={{ maxWidth: 'clamp(80px, 15vw, 140px)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer', borderBottom: '1px dashed var(--border)' }}>
                {displayName}
              </span>
              <button onClick={openNameEdit} title="Edit name" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.1rem' }}>
                <Pencil size={13} />
              </button>
              <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
              <button onClick={handleLogout} title="Logout" style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.1rem' }}>
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}

        {!user && (
          <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Admin Login
          </Link>
        )}

        {/* Mobile Hamburger — always rendered, shown/hidden via CSS */}
        {user && (
          <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-h)', padding: '0.4rem' }}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}

        {/* Mobile Dropdown */}
        {menuOpen && user && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: 'var(--bg)', borderBottom: '1px solid var(--border)',
            padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
            zIndex: 99
          }} className="nav-mobile-menu">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-h)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1, marginRight: '0.5rem' }}>
                <User size={15} style={{ flexShrink: 0 }} /> 
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</span>
              </div>
              <button onClick={openNameEdit} style={{ border: 'none', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                <Pencil size={13} /> Edit
              </button>
            </div>
            <Link to="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-h)', fontWeight: 600 }}>
              <Calendar size={18} /> Dashboard
            </Link>
            {profile?.role === 'superadmin' && (
              <Link to="/admin/manage" onClick={() => setMenuOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--text-h)', fontWeight: 600 }}>
                <Shield size={18} /> Manage Users
              </Link>
            )}
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: 'none', background: 'transparent', color: '#ef4444', fontWeight: 600, cursor: 'pointer', fontSize: '1rem', padding: 0 }}>
              <LogOut size={18} /> Logout
            </button>
          </div>
        )}

        <style>{`
          /* Default: hamburger hidden, desktop nav visible */
          .nav-hamburger { display: none; }
          @media (max-width: 640px) {
            .nav-desktop { display: none !important; }
            .nav-hamburger { display: flex !important; align-items: center; }
          }
        `}</style>
      </nav>

      {/* Edit Name Modal */}
      {editingName && (
        <div
          onClick={() => setEditingName(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div
            onClick={e => e.stopPropagation()}
            className="glass-card"
            style={{ width: '100%', maxWidth: '380px', textAlign: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
              <Pencil size={22} color="var(--accent)" />
            </div>
            <h2 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Update Your Name</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>This is what will appear in the admin panel.</p>
            <input
              autoFocus
              className="input"
              placeholder="Your full name"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              style={{ marginBottom: '1.25rem', textAlign: 'center' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setEditingName(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancel</button>
              <button onClick={saveName} disabled={savingName || !nameInput.trim()} className="btn btn-primary" style={{ flex: 1 }}>
                <Check size={16} /> {savingName ? 'Saving…' : 'Save Name'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
