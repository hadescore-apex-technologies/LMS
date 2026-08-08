import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { 
  Users, Search, ChevronDown, ChevronRight, 
  UserCheck, UserX, RefreshCw, Mail, Calendar,
  Layers, ArrowUpRight, AlertCircle, Loader2
} from 'lucide-react';

interface Student {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  categories: string[];
  student_type?: string;
  assignment_types?: string[];
}

interface Mentor {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  category: string | null;
  student_count: number;
  students: Student[];
}

interface MentorAssignmentsData {
  mentors: Mentor[];
  unassigned_students: Student[];
  total_mentors: number;
  total_students: number;
  total_unassigned: number;
}

export const MentorAssignmentsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMentors, setExpandedMentors] = useState<Set<number>>(new Set());
  
  const liveMode = true;

  const { data, isLoading, refetch, isFetching } = useQuery<MentorAssignmentsData>({
    queryKey: ['mentor-assignments', liveMode],
    queryFn: async () => {
      const res = await api.get(`analytics/mentor-assignments/?live_mode=${liveMode}`);
      return res.data;
    }
  });

  const assignMentorMutation = useMutation({
    mutationFn: async ({ studentId, mentorId }: { studentId: number; mentorId: number | null }) => {
      await api.put(`students/${studentId}/`, {
        assigned_live_staff: mentorId,
        assigned_staff: mentorId
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-assignments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-students-roster'] });
      queryClient.invalidateQueries({ queryKey: ['staff-students-list'] });
      toast.success('Live mentor assignment updated successfully.');
    },
    onError: () => {
      toast.error('Failed to update live mentor assignment.');
    }
  });

  const toggleMentor = (mentorId: number) => {
    setExpandedMentors(prev => {
      const next = new Set(prev);
      if (next.has(mentorId)) {
        next.delete(mentorId);
      } else {
        next.add(mentorId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (data) {
      setExpandedMentors(new Set(data.mentors.map(m => m.id)));
    }
  };

  const collapseAll = () => {
    setExpandedMentors(new Set());
  };

  // Filter mentors and students by search query
  const filteredMentors = (data?.mentors ?? []).filter(mentor => {
    const mentorName = `${mentor.first_name} ${mentor.last_name} ${mentor.email} ${mentor.category || ''}`.toLowerCase();
    const studentMatch = mentor.students.some(s =>
      `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return mentorName.includes(searchQuery.toLowerCase()) || studentMatch;
  });

  const filteredUnassigned = (data?.unassigned_students ?? []).filter(s =>
    `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black tracking-tight">Live Mentor Assignments</h1>
          <p className="text-muted-foreground text-[11px] mt-0.5">Map students to their dedicated live class mentors.</p>
        </div>
        <button 
          onClick={() => refetch()} 
          className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold border border-slate-200 shadow-sm hover:shadow transition-all active:scale-95 disabled:opacity-50"
          disabled={isFetching}
        >
          <RefreshCw size={13} className={isFetching ? 'animate-spin text-blue-600' : ''} />
          <span>{isFetching ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Search + Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search mentors or students..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-xl outline-none text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100/40 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-3 py-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-3 py-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            Collapse All
          </button>
        </div>
      </div>

      {/* Mentor Cards with Expandable Student Lists */}
      <div className="space-y-4">
        {filteredMentors.map((mentor, i) => {
          const isExpanded = expandedMentors.has(mentor.id);
          const mentorName = `${mentor.first_name} ${mentor.last_name}`.trim() || mentor.email;
          const initials = `${mentor.first_name?.charAt(0) || ''}${mentor.last_name?.charAt(0) || ''}`.toUpperCase() || 'M';
          
          return (
            <motion.div
              key={mentor.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden"
            >
              {/* Mentor Header — clickable */}
              <button
                onClick={() => toggleMentor(mentor.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50/60 transition-colors text-left"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-200">
                    {initials}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-800">{mentorName}</h3>
                      {mentor.category && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 uppercase tracking-wider flex items-center gap-1">
                          <Layers size={8} />
                          {mentor.category}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Mail size={10} />
                        {mentor.email}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-500">
                        <Users size={10} />
                        {mentor.student_count} student{mentor.student_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Student count badge */}
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                    mentor.student_count > 0 
                      ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                      : 'bg-slate-50 text-slate-400 border border-slate-100'
                  }`}>
                    {mentor.student_count}
                  </span>
                  {/* Expand/Collapse icon */}
                  <div className="text-slate-400">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </button>

              {/* Expanded Student Table */}
              {isExpanded && (
                <div className="border-t border-slate-100">
                  {mentor.students.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      <UserX size={20} className="mx-auto mb-2 text-slate-300" />
                      <p>No students assigned to this mentor.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type / Mentorship</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                            <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {mentor.students
                            .filter(s => `${s.first_name} ${s.last_name} ${s.email}`.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(student => {
                              const studentName = `${student.first_name} ${student.last_name}`.trim() || student.email;
                              const studentInitials = `${student.first_name?.charAt(0) || ''}${student.last_name?.charAt(0) || ''}`.toUpperCase() || 'S';
                              
                              return (
                                <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-3 px-6">
                                    <div className="flex items-center gap-3">
                                      <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                        {studentInitials}
                                      </div>
                                      <span className="font-semibold text-slate-700">{studentName}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500">{student.email}</td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-col gap-1">
                                      {student.assignment_types?.includes('COURSE') && (
                                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-100 w-max">
                                          Course Mentor
                                        </span>
                                      )}
                                      {student.assignment_types?.includes('LIVE_CLASS') && (
                                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 border border-violet-100 w-max">
                                          Live Class Mentor
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex flex-wrap gap-1">
                                      {student.categories.length > 0 ? student.categories.map((cat, idx) => (
                                        <span key={idx} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                          {cat}
                                        </span>
                                      )) : (
                                        <span className="text-slate-400 text-[10px]">—</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                                    {student.start_date && student.end_date ? (
                                      <div className="flex items-center gap-1 text-[10px]">
                                        <Calendar size={10} className="text-slate-400" />
                                        <span>{new Date(student.start_date).toLocaleDateString()}</span>
                                        <ArrowUpRight size={8} className="text-slate-300" />
                                        <span>{new Date(student.end_date).toLocaleDateString()}</span>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[10px]">—</span>
                                    )}
                                  </td>
                                    <td className="py-3 px-4 text-center">
                                      <select
                                        defaultValue={mentor.id}
                                        disabled={assignMentorMutation.isPending}
                                        onChange={(e) => {
                                          const newMentorId = e.target.value === 'unassigned' ? null : Number(e.target.value);
                                          assignMentorMutation.mutate({ studentId: student.id, mentorId: newMentorId });
                                        }}
                                        className="text-[10px] font-bold px-2 py-1 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 text-slate-700 cursor-pointer hover:bg-slate-50"
                                      >
                                        <option value={mentor.id}>Assigned: {mentor.first_name || mentor.email}</option>
                                        <option value="unassigned">— Unassign Student —</option>
                                        {data?.mentors.filter(m => m.id !== mentor.id).map(m => (
                                          <option key={m.id} value={m.id}>Move to: {m.first_name} {m.last_name}</option>
                                        ))}
                                      </select>
                                    </td>
                                  </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Unassigned Students Section */}
      {filteredUnassigned.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-500" />
            <h2 className="font-bold text-base text-slate-800">Unassigned Students</h2>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">
              {filteredUnassigned.length}
            </span>
          </div>
          
          <div className="rounded-2xl border border-amber-200/60 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-amber-50/30">
                    <th className="py-3 px-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Student</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categories</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                    <th className="py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Assign Mentor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUnassigned.map(student => {
                    const studentName = `${student.first_name} ${student.last_name}`.trim() || student.email;
                    const studentInitials = `${student.first_name?.charAt(0) || ''}${student.last_name?.charAt(0) || ''}`.toUpperCase() || 'S';
                    
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-6">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center text-[10px] font-bold text-amber-600 border border-amber-100">
                              {studentInitials}
                            </div>
                            <span className="font-semibold text-slate-700">{studentName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500">{student.email}</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {student.categories.length > 0 ? student.categories.map((cat, idx) => (
                              <span key={idx} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                {cat}
                              </span>
                            )) : (
                              <span className="text-slate-400 text-[10px]">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {student.start_date && student.end_date ? (
                            <div className="flex items-center gap-1 text-[10px]">
                              <Calendar size={10} className="text-slate-400" />
                              <span>{new Date(student.start_date).toLocaleDateString()}</span>
                              <ArrowUpRight size={8} className="text-slate-300" />
                              <span>{new Date(student.end_date).toLocaleDateString()}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[10px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            student.is_active 
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                              : 'bg-red-50 text-red-500 border border-red-100'
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${student.is_active ? 'bg-emerald-400' : 'bg-red-400'}`} />
                            {student.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            defaultValue=""
                            disabled={assignMentorMutation.isPending}
                            onChange={(e) => {
                              if (!e.target.value) return;
                              assignMentorMutation.mutate({ studentId: student.id, mentorId: Number(e.target.value) });
                            }}
                            className="text-[10px] font-bold px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-lg outline-none focus:border-blue-500 text-amber-900 cursor-pointer hover:bg-amber-100/70"
                          >
                            <option value="">+ Choose Mentor...</option>
                            {data?.mentors.map(m => (
                              <option key={m.id} value={m.id}>{m.first_name} {m.last_name} ({m.category || 'General'})</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredMentors.length === 0 && filteredUnassigned.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <Users size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium">No results found for "{searchQuery}"</p>
          <p className="text-[11px] mt-1">Try a different search term.</p>
        </div>
      )}
    </div>
  );
};

export default MentorAssignmentsTab;
