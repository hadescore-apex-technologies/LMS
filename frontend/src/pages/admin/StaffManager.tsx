import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  UserPlus, Trash2, Edit3, Key, ShieldCheck, 
  ShieldAlert, X, Save 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface StaffUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  date_joined: string;
}

const StaffManager: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  
  // Selected staff references
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState<'STAFF' | 'SUPER_ADMIN'>('STAFF');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const res = await api.get('users/staff/');
      setStaffList(res.data);
    } catch (err) {
      toast.error("Failed to load operations accounts directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setNewPassword('');
    setRole('STAFF');
    setSelectedStaff(null);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName || !password) {
      toast.error("All fields are required");
      return;
    }
    try {
      const res = await api.post('users/staff/', {
        email,
        first_name: firstName,
        last_name: lastName,
        password,
        role
      });
      toast.success("Account created successfully.");
      setShowAddModal(false);
      setStaffList(prev => [...prev, res.data]);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.email?.[0] || "Failed to create account.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !firstName || !lastName || !email) return;
    try {
      const res = await api.put(`users/staff/${selectedStaff.id}/`, {
        email,
        first_name: firstName,
        last_name: lastName,
        is_active: selectedStaff.is_active,
        role
      });
      toast.success("Profile updated successfully.");
      setShowEditModal(false);
      setStaffList(prev => prev.map(s => s.id === selectedStaff.id ? res.data : s));
      resetForm();
    } catch (err) {
      toast.error("Failed to update profile.");
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff || !newPassword) return;
    try {
      await api.post(`users/staff/${selectedStaff.id}/reset-password/`, {
        password: newPassword
      });
      toast.success(`Password reset successfully for ${selectedStaff.email}`);
      setShowPassModal(false);
      resetForm();
    } catch (err) {
      toast.error("Failed to reset password.");
    }
  };

  const handleToggleStatus = async (staff: StaffUser) => {
    const originalStaff = [...staffList];
    setStaffList(prev => prev.map(s => s.id === staff.id ? { ...s, is_active: !s.is_active } : s));
    toast.success(`Account status updated.`);
    try {
      await api.patch(`users/staff/${staff.id}/`, {
        is_active: !staff.is_active
      });
    } catch (err) {
      setStaffList(originalStaff);
      toast.error("Failed to change account status.");
    }
  };

  const handleDelete = async (id: number) => {
    const target = staffList.find(s => s.id === id);
    if (target?.email === 'hadescore.apex.technologies@gmail.com') {
      toast.error("The root administrator account cannot be deleted.");
      return;
    }
    if (!window.confirm("Are you sure you want to permanently delete this account? This action is recorded in logs.")) return;
    const originalStaff = [...staffList];
    setStaffList(prev => prev.filter(s => s.id !== id));
    toast.success("Account deleted.");
    try {
      await api.delete(`users/staff/${id}/`);
    } catch (err) {
      setStaffList(originalStaff);
      toast.error("Failed to delete account.");
    }
  };

  const openEdit = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setEmail(staff.email);
    setFirstName(staff.first_name);
    setLastName(staff.last_name);
    setRole(staff.role as any || 'STAFF');
    setShowEditModal(true);
  };

  const openPass = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setShowPassModal(true);
  };

  if (loading && staffList.length === 0) {
    return (
      <div className="space-y-6 text-xs">
        <div className="h-8 w-60 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-xs animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">System Operator Management</h1>
          <p className="text-muted-foreground text-sm mt-1">Super Admin CRUD panel to configure STAFF and SUPER_ADMIN operator privileges.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground hover:brightness-110 active:brightness-95 rounded-xl text-xs font-semibold transition-all shadow-md shadow-primary/10"
        >
          <UserPlus size={16} />
          <span>Add Operator Account</span>
        </button>
      </div>

      {/* Operators Table */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                <th className="py-3 px-4">Operator Email</th>
                <th className="py-3 px-4">First Name</th>
                <th className="py-3 px-4">Last Name</th>
                <th className="py-3 px-4">System Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {staffList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">
                    No operator accounts registered. Click "Add Operator Account" to enroll.
                  </td>
                </tr>
              ) : (
                staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-semibold text-foreground/80">{staff.email}</td>
                    <td className="py-3 px-4 text-muted-foreground">{staff.first_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{staff.last_name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded border ${
                        staff.role === 'SUPER_ADMIN' 
                          ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20 dark:text-indigo-400' 
                          : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 dark:text-cyan-400'
                      }`}>
                        {staff.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border text-[10px] uppercase transition-all ${staff.is_active 
                          ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                          : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                      >
                        {staff.is_active ? (
                          <>
                            <ShieldCheck size={10} />
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <ShieldAlert size={10} />
                            <span>Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {new Date(staff.date_joined).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(staff)}
                          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          title="Edit Profile"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => openPass(staff)}
                          className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                          title="Reset Password"
                        >
                          <Key size={14} />
                        </button>
                        {staff.email !== 'hadescore.apex.technologies@gmail.com' ? (
                          <button
                            onClick={() => handleDelete(staff.id)}
                            className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete Account"
                          >
                            <Trash2 size={14} />
                          </button>
                        ) : (
                          <div className="w-8 h-8" /> // Empty placeholder to preserve alignment
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">Add New Operator Account</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">First Name</label>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="Jane"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    placeholder="jane.smith@company.com"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">System Role</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all font-semibold"
                  >
                    <option value="STAFF">Mentor</option>
                    <option value="SUPER_ADMIN">System Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Set Password</label>
                  <input 
                    type="password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">Save Account</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Staff Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">Edit Operator Profile</h3>
                <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">First Name</label>
                    <input 
                      type="text" 
                      value={firstName} 
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-muted-foreground mb-1">Last Name</label>
                    <input 
                      type="text" 
                      value={lastName} 
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Email Address</label>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">System Role</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value as any)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all font-semibold"
                  >
                    <option value="STAFF">Mentor</option>
                    <option value="SUPER_ADMIN">System Super Admin</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110 flex items-center gap-1.5">
                    <Save size={14} />
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {showPassModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card text-card-foreground border border-border w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="font-semibold text-lg">Reset Operator Password</h3>
                <button onClick={() => setShowPassModal(false)} className="p-1 hover:bg-muted rounded-lg"><X size={16} /></button>
              </div>

              <form onSubmit={handlePasswordReset} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">Operator Account</label>
                  <input 
                    type="text" 
                    value={selectedStaff?.email || ''} 
                    disabled
                    className="w-full h-10 px-3 bg-muted border border-border rounded-xl outline-none text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted-foreground mb-1">New Secure Password</label>
                  <input 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-10 px-3 bg-muted/50 border border-border rounded-xl outline-none focus:border-primary/40 focus:bg-background transition-all"
                    placeholder="••••••••"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <button type="button" onClick={() => setShowPassModal(false)} className="px-4 py-2 bg-muted rounded-xl hover:bg-muted/80 font-medium">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-semibold hover:brightness-110">Update Password</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StaffManager;
