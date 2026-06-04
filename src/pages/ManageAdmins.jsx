import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { Shield, ShieldAlert, User, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const roleConfig = {
  superadmin: { label: 'Superadmin', icon: ShieldAlert, color: '#ef4444' },
  admin: { label: 'Admin', icon: Shield, color: 'var(--accent)' },
  user: { label: 'User', icon: User, color: 'var(--text-muted)' },
};

const ManageAdmins = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    if (profile?.role !== 'superadmin') { navigate('/admin'); return; }
    fetchUsers();
  }, [profile]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('full_name', { ascending: true });
    if (data) setUsers(data);
    setLoading(false);
  };

  const updateRole = async (userId, newRole) => {
    setUpdating(userId);
    const { data, error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId).select();
    
    if (error) {
      alert(error.message);
    } else if (data && data.length > 0) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert(`User role successfully updated to ${newRole}!`);
    } else {
      alert("Failed to update role. This is likely blocked by Row Level Security (RLS) policies in your Supabase database. You must grant update permissions to superadmins.");
    }
    setUpdating(null);
  };

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container" style={{ padding: 'clamp(1rem, 5vw, 3rem) 1rem' }}>
      <button onClick={() => navigate('/admin')} className="btn btn-ghost" style={{ marginBottom: '2rem' }}>
        <ArrowLeft size={18} /> Dashboard
      </button>

      <h1 style={{ marginBottom: '0.5rem', marginTop: 0 }}>Management Center</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Grant or revoke admin access for institute members.</p>

      {/* Search */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', padding: '0.75rem 1.25rem' }}>
        <Search size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input className="input" placeholder="Search by name or email…" style={{ border: 'none', background: 'transparent', padding: 0 }} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Desktop Table */}
      <div className="manage-table glass-card" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>User</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Role</th>
              <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Change Access</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="3" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading users…</td></tr>
            ) : filtered.map(u => {
              const RoleIcon = roleConfig[u.role]?.icon || User;
              return (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-h)' }}>{u.full_name || 'No Name'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                      <RoleIcon size={15} color={roleConfig[u.role]?.color} />
                      <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <RoleButtons userId={u.id} currentRole={u.role} updating={updating} updateRole={updateRole} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="manage-cards" style={{ display: 'none', flexDirection: 'column', gap: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading users…</div>
        ) : filtered.map(u => {
          const RoleIcon = roleConfig[u.role]?.icon || User;
          return (
            <div key={u.id} className="glass-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-h)', marginBottom: '0.2rem' }}>{u.full_name || 'No Name'}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.3rem 0.7rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  <RoleIcon size={13} color={roleConfig[u.role]?.color} />
                  <span style={{ textTransform: 'capitalize' }}>{u.role}</span>
                </div>
              </div>
              <RoleButtons userId={u.id} currentRole={u.role} updating={updating} updateRole={updateRole} />
            </div>
          );
        })}
      </div>

      <style>{`
        @media (max-width: 700px) {
          .manage-table { display: none !important; }
          .manage-cards { display: flex !important; }
        }

        .role-btn-group {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
        }

        .role-btn-group button {
          min-height: 36px;
          touch-action: manipulation;
        }

        @media (max-width: 480px) {
          .role-btn-group { gap: 0.3rem; }
          .role-btn-group button { padding: 0.3rem 0.6rem !important; font-size: 0.7rem !important; }
        }
      `}</style>
    </div>
  );
};

const RoleButtons = ({ userId, currentRole, updating, updateRole }) => (
  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }} className="role-btn-group">
    {['user', 'admin', 'superadmin'].map(role => (
      <button
        key={role}
        onClick={() => updateRole(userId, role)}
        disabled={updating === userId || currentRole === role}
        style={{
          padding: '0.35rem 0.75rem',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border)',
          background: currentRole === role ? 'var(--accent-bg)' : 'transparent',
          color: currentRole === role ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
          opacity: updating === userId && currentRole !== role ? 0.5 : 1
        }}>
        {updating === userId ? '…' : role.toUpperCase()}
      </button>
    ))}
  </div>
);

export default ManageAdmins;
