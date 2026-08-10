import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Edit3, Key, ShieldCheck, ShieldAlert, X, Save, Search, Loader2, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id: number;
  name: string;
}

interface StaffUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  date_joined?: string;
  category: number | null;
  category_name: string | null;
}

export const StaffManagementTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPassModal, setShowPassModal] = useState(false);
  
  const [filterRole, setFilterRole] = useState<string>('ALL');
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [role, setRole] = useState<'STAFF' | 'SUPER_ADMIN'>('STAFF');
  const [categoryId, setCategoryId] = useState<string>('');

  // Query staff list
  const { data: staffList = [], isLoading } = useQuery<StaffUser[]>({
    queryKey: ['admin-staff-roster'],
    placeholderData: (prev) => prev,
    staleTime: 600000,
    queryFn: async () => {
      const res = await api.get('users/staff/');
      return res.data;
    }
  });

  // Query categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories-list', 'LIVE'],
    placeholderData: (prev) => prev,
    staleTime: 600000,
    queryFn: async () => {
      const res = await api.get('courses/categories/?type=LIVE');
      return res.data;
    }
  });

  const createStaffMutation = useMutation({
    mutationFn: async (payload: { email: string; firstName: string; lastName: string; password?: string; role: string; categoryId: string }) => {
      const cleanEmail = payload.email.trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@') || cleanEmail.endsWith('@')) {
        throw new Error("Please enter a valid email address.");
      }
      if (!payload.firstName || !payload.firstName.trim()) {
        throw new Error("Please enter first name.");
      }
      if (!payload.lastName || !payload.lastName.trim()) {
        throw new Error("Please enter last name.");
      }
      const res = await api.post('users/staff/', {
        email: cleanEmail,
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        password: payload.password && payload.password.trim() ? payload.password.trim() : undefined,
        role: payload.role,
        category: payload.categoryId ? Number(payload.categoryId) : null
      });
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['admin-staff-roster'] });
      const previousStaff = queryClient.getQueryData<StaffUser[]>(['admin-staff-roster']);
      
      const newStaffOpt: StaffUser = {
        id: -Date.now(),
        email: payload.email.trim(),
        first_name: payload.firstName.trim(),
        last_name: payload.lastName.trim(),
        is_active: true,
        role: payload.role,
        category: payload.categoryId ? Number(payload.categoryId) : null,
        category_name: categories.find(c => c.id === Number(payload.categoryId))?.name || null
      };

      if (previousStaff) {
        queryClient.setQueryData<StaffUser[]>(
          ['admin-staff-roster'],
          [newStaffOpt, ...previousStaff]
        );
      }
      // Close modal immediately to prevent double-submit
      setShowAddModal(false);
      resetForm();
      return { previousStaff };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousStaff) {
        queryClient.setQueryData(['admin-staff-roster'], context.previousStaff);
      }
      setShowAddModal(true); // Re-open modal on error so user can fix and retry
      const msg = err.message || err.response?.data?.email?.[0] || err.response?.data?.password?.[0] || err.response?.data?.detail || 'Failed to create staff account.';
      toast.error(msg);
    },
    onSuccess: (data) => {
      // Replace optimistic placeholder (negative id) with real server record
      if (data) {
        queryClient.setQueryData<StaffUser[]>(['admin-staff-roster'], (old) =>
          old ? [data, ...old.filter(s => s.id > 0)] : [data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Staff operator account created.');
    }
  });

  const updateStaffMutation = useMutation({
    mutationFn: async (payload: { id: number; email: string; firstName: string; lastName: string; role: string; categoryId: string }) => {
      const res = await api.put(`users/staff/${payload.id}/`, {
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        role: payload.role,
        category: payload.categoryId ? Number(payload.categoryId) : null
      });
      return res.data;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['admin-staff-roster'] });
      const previousStaff = queryClient.getQueryData<StaffUser[]>(['admin-staff-roster']);
      const currentItem = previousStaff?.find(s => s.id === payload.id);
      
      const updatedStaff: StaffUser = {
        id: payload.id,
        email: payload.email,
        first_name: payload.firstName,
        last_name: payload.lastName,
        is_active: currentItem?.is_active ?? true,
        date_joined: currentItem?.date_joined || new Date().toISOString(),
        role: payload.role,
        category: payload.categoryId ? Number(payload.categoryId) : null,
        category_name: categories.find(c => c.id === Number(payload.categoryId))?.name || null
      };

      if (previousStaff) {
        queryClient.setQueryData<StaffUser[]>(
          ['admin-staff-roster'],
          previousStaff.map(item => item.id === payload.id ? updatedStaff : item)
        );
      }
      setShowEditModal(false);
      resetForm();
      return { previousStaff };
    },
    onError: (err: any, variables, context) => {
      const status = err?.response?.status;
      if (status === 404) {
        // Record no longer exists — remove it from cache so UI stays clean
        queryClient.setQueryData<StaffUser[]>(['admin-staff-roster'], (old) =>
          old ? old.filter(s => s.id !== variables.id) : []
        );
        toast.error('This staff account no longer exists. It may have been deleted.');
        return;
      }
      if (context?.previousStaff) {
        queryClient.setQueryData(['admin-staff-roster'], context.previousStaff);
      }
      const msg = err.response?.data?.email?.[0] || err.response?.data?.detail || 'Failed to update operator details.';
      toast.error(msg);
    },
    onSuccess: (data) => {
      if (data) {
        queryClient.setQueryData<StaffUser[]>(['admin-staff-roster'], (old) =>
          old ? old.map(item => item.id === data.id ? data : item) : [data]
        );
      }
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Operator profile details saved.');
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!selectedStaff) return;
      await api.post(`users/staff/${selectedStaff.id}/reset-password/`, {
        password: newPassword
      });
    },
    onSuccess: () => {
      setShowPassModal(false);
      resetForm();
      toast.success('Operator password reset completed.');
    },
    onError: () => {
      toast.error('Failed to reset operator password.');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (staff: StaffUser) => {
      await api.patch(`users/staff/${staff.id}/`, {
        is_active: !staff.is_active
      });
    },
    onMutate: async (staff: StaffUser) => {
      await queryClient.cancelQueries({ queryKey: ['admin-staff-roster'] });
      const previousStaff = queryClient.getQueryData<StaffUser[]>(['admin-staff-roster']);
      if (previousStaff) {
        queryClient.setQueryData<StaffUser[]>(
          ['admin-staff-roster'],
          previousStaff.map(item => item.id === staff.id ? { ...item, is_active: !item.is_active } : item)
        );
      }
      return { previousStaff };
    },
    onError: (err, staff, context) => {
      if (context?.previousStaff) {
        queryClient.setQueryData(['admin-staff-roster'], context.previousStaff);
      }
      toast.error('Failed to update status.');
    },
    onSuccess: (data, staff) => {
      // Update just the toggled item — no full refetch needed
      queryClient.setQueryData<StaffUser[]>(['admin-staff-roster'], (old) =>
        old ? old.map(item => item.id === staff.id ? { ...item, is_active: !staff.is_active } : item) : old
      );
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Account status updated.');
    }
  });

  const deleteStaffMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`users/staff/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['admin-staff-roster'] });
      const previousStaff = queryClient.getQueryData<StaffUser[]>(['admin-staff-roster']);
      if (previousStaff) {
        queryClient.setQueryData<StaffUser[]>(
          ['admin-staff-roster'],
          previousStaff.filter(s => s.id !== id)
        );
      }
      return { previousStaff };
    },
    onError: (err: any, id, context) => {
      const status = err?.response?.status;
      if (status === 404) {
        // Record already deleted on server — keep it removed from cache, don't rollback
        toast.success('Account removed.');
        return;
      }
      if (context?.previousStaff) {
        queryClient.setQueryData(['admin-staff-roster'], context.previousStaff);
      }
      toast.error('Failed to delete user.');
    },
    onSuccess: (data, id) => {
      // Item already removed in onMutate — just confirm, no refetch
      queryClient.setQueryData<StaffUser[]>(['admin-staff-roster'], (old) =>
        old ? old.filter(s => s.id !== id) : []
      );
      toast.success('Account permanently deleted.');
    }
  });

  const openEdit = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setEmail(staff.email);
    setFirstName(staff.first_name);
    setLastName(staff.last_name);
    setRole(staff.role as any || 'STAFF');
    setCategoryId(staff.category ? String(staff.category) : '');
    setShowEditModal(true);
  };

  const openPass = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setShowPassModal(true);
  };

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setNewPassword('');
    setRole('STAFF');
    setCategoryId('');
    setSelectedStaff(null);
  };

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.first_name.toLowerCase().includes(search.toLowerCase()) ||
      s.last_name.toLowerCase().includes(search.toLowerCase());
    
    if (filterRole === 'ALL') return matchesSearch;
    if (filterRole === 'SUPER_ADMIN') return matchesSearch && s.role === 'SUPER_ADMIN';
    if (filterRole === 'STAFF') return matchesSearch && s.role === 'STAFF';
    return matchesSearch;
  });

  const CategorySelect = () => (
    <div>
      <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Assigned Category (Mentor Domain)</label>
      <select
        value={categoryId}
        onChange={(e) => setCategoryId(e.target.value)}
        className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-bold"
      >
        <option value="">No category assigned</option>
        {categories.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Operator Administration</h1>
          <p className="text-muted-foreground text-sm mt-1">Super Admin CRUD panel to configure STAFF and SUPER_ADMIN operator accounts with category assignments.</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAddModal(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110"
        >
          <UserPlus size={15} />
          <span>Add Operator</span>
        </button>
      </div>

      {/* Control filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md flex items-center gap-2">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search operators by name or email..."
              className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
            />
          </div>
          <select 
            value={filterRole} 
            onChange={(e) => setFilterRole(e.target.value)}
            className="h-10 px-3 bg-background border border-border rounded-xl outline-none font-bold text-muted-foreground shrink-0"
          >
            <option value="ALL">All Accounts</option>
            <option value="STAFF">Staff Operators</option>
          </select>
        </div>
      </div>

      {/* Operators list */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider bg-muted/20">
                  <th className="py-3 px-4">Operator Email</th>
                  <th className="py-3 px-4">First Name</th>
                  <th className="py-3 px-4">Last Name</th>
                  <th className="py-3 px-4">System Role</th>
                  <th className="py-3 px-4">Assigned Category</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStaff.map((staff) => (
                  <tr key={staff.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground/85">{staff.email}</td>
                    <td className="py-3.5 px-4 font-medium text-muted-foreground">{staff.first_name}</td>
                    <td className="py-3.5 px-4 font-medium text-muted-foreground">{staff.last_name}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${staff.role === 'SUPER_ADMIN' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' : 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20'}`}>
                        {staff.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Staff'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {staff.category_name ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full border bg-violet-500/10 text-violet-500 border-violet-500/20">
                          <Layers size={9} />
                          {staff.category_name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => toggleStatusMutation.mutate(staff)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold border text-[9px] uppercase ${staff.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                      >
                        {staff.is_active ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                        <span>{staff.is_active ? 'Active' : 'Locked'}</span>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {deleteConfirmId === staff.id ? (
                        <div className="inline-flex items-center gap-2">
                          <span className="text-[10px] text-destructive font-bold">Delete?</span>
                          <button
                            onClick={() => {
                              deleteStaffMutation.mutate(staff.id);
                              setDeleteConfirmId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-destructive text-white text-[10px] font-bold hover:bg-destructive/90 transition-colors"
                          >Yes</button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-1 rounded-lg bg-muted text-foreground text-[10px] font-bold hover:bg-muted/80 transition-colors"
                          >No</button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => openPass(staff)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Password"><Key size={13} /></button>
                          <button onClick={() => openEdit(staff)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Edit"><Edit3 size={13} /></button>
                          <button
                            onClick={() => {
                              if (staff.email === 'hadescore.apex.technologies@gmail.com') {
                                toast.error('The root administrator account cannot be deleted.');
                                return;
                              }
                              setDeleteConfirmId(staff.id);
                            }}
                            className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredStaff.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground font-medium">No operators matched filters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div onClick={() => setShowAddModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Add System Operator</h3>
                <button onClick={() => setShowAddModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault();
                if (createStaffMutation.isPending) return; // Prevent double-submit
                createStaffMutation.mutate({
                  email: email.trim(),
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  password: password.trim(),
                  role,
                  categoryId
                });
              }} autoComplete="off" className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Email Address *</label>
                  <input name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="off" placeholder="operator@example.com" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">First Name *</label>
                    <input name="first_name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required autoComplete="off" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Last Name *</label>
                    <input name="last_name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required autoComplete="off" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Default Password *</label>
                  <input name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Defaults to: apex123" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Role Assignment</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-bold">
                    <option value="STAFF">Staff Operator</option>
                  </select>
                </div>
                <CategorySelect />
                <button type="submit" disabled={createStaffMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Save size={12} />
                  <span>{createStaffMutation.isPending ? 'Creating...' : 'Create Account'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div onClick={() => setShowEditModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Modify Operator Account</h3>
                <button onClick={() => setShowEditModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (!selectedStaff) return;
                updateStaffMutation.mutate({
                  id: selectedStaff.id,
                  email,
                  firstName,
                  lastName,
                  role,
                  categoryId
                }); 
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Email Address *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">First Name *</label>
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Last Name *</label>
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Role Assignment</label>
                  <select value={role} onChange={(e) => setRole(e.target.value as any)} className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none font-bold">
                    <option value="STAFF">Staff Operator</option>
                  </select>
                </div>
                <CategorySelect />
                <button type="submit" disabled={updateStaffMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Save size={12} />
                  <span>{updateStaffMutation.isPending ? 'Saving...' : 'Save Profile'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Reset Modal */}
      <AnimatePresence>
        {showPassModal && (
          <div onClick={() => setShowPassModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">Reset Lock Password</h3>
                <button onClick={() => setShowPassModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); resetPasswordMutation.mutate(); }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Account: {selectedStaff?.email}</label>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">New Security Password *</label>
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password" className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none" />
                </div>
                <button type="submit" disabled={resetPasswordMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/10">
                  <Key size={12} />
                  <span>Update Password</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default StaffManagementTab;
