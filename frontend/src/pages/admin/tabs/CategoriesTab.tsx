import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { Plus, Edit3, Trash2, X, Save, Search, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface CategoriesTabProps {
  type?: 'COURSE' | 'LIVE';
}

export const CategoriesTab: React.FC<CategoriesTabProps> = ({ type = 'COURSE' }) => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Modal States
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // 1. Fetch Categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories-list', type],
    queryFn: async () => {
      const res = await api.get(`courses/categories/?type=${type}`);
      return res.data;
    }
  });

  // Mutations
  const saveCategoryMutation = useMutation({
    mutationFn: async ({ name, slug, id }: { name: string; slug: string; id?: number }) => {
      if (id) {
        await api.put(`courses/categories/${id}/`, { name, slug, category_type: type });
      } else {
        await api.post('courses/categories/', { name, slug, category_type: type });
      }
    },
    onMutate: async ({ name, slug, id }) => {
      await queryClient.cancelQueries({ queryKey: ['categories-list', type] });
      const previousCategories = queryClient.getQueryData<Category[]>(['categories-list', type]);
      
      if (previousCategories) {
        if (id) {
          queryClient.setQueryData<Category[]>(
            ['categories-list', type],
            previousCategories.map(cat => cat.id === id ? { ...cat, name, slug } : cat)
          );
        } else {
          queryClient.setQueryData<Category[]>(
            ['categories-list', type],
            [...previousCategories, { id: Math.random(), name, slug }]
          );
        }
      }
      setCatName('');
      setShowCatModal(false);
      return { previousCategories };
    },
    onError: (err, variables, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories-list', type], context.previousCategories);
      }
      toast.error('Failed to save category.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
      queryClient.invalidateQueries({ queryKey: ['courses-dropdown-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      setEditingCat(null);
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`courses/categories/${id}/`);
    },
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: ['categories-list', type] });
      const previousCategories = queryClient.getQueryData<Category[]>(['categories-list', type]);
      if (previousCategories) {
        queryClient.setQueryData<Category[]>(
          ['categories-list', type],
          previousCategories.filter(c => c.id !== id)
        );
      }
      return { previousCategories };
    },
    onError: (err, id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories-list', type], context.previousCategories);
      }
      toast.error('Failed to delete category.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories-list'] });
      queryClient.invalidateQueries({ queryKey: ['courses-list'] });
      queryClient.invalidateQueries({ queryKey: ['courses-dropdown-list'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['staff-dashboard-stats'] });
      toast.success('Category deleted successfully.');
    }
  });

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setShowCatModal(true);
  };

  const filteredCategories = categories.filter(cat => 
    cat.name.toLowerCase().includes(search.toLowerCase()) || 
    cat.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            {type === 'LIVE' ? "Mentoring Domains" : "Training Domains"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {type === 'LIVE' 
              ? "Manage topic fields and subject areas assigned to Live mentors." 
              : "Manage course topic clusters and catalog departments."}
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowCatModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl shadow-md transition-all hover:brightness-110 active:scale-95"
        >
          <Plus size={14} />
          <span>New Category</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-muted/20 border border-border/50 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-3 text-muted-foreground" size={14} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories by name..."
            className="w-full h-10 pl-10 pr-4 bg-background border border-border rounded-xl outline-none focus:border-primary/45"
          />
        </div>
      </div>

      {/* Categories Grid */}
      
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map(cat => (
            <div key={cat.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl group-hover:bg-primary/20 transition-colors">
                    <Layers size={18} />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => openEdit(cat)} className="p-1.5 hover:bg-muted border border-transparent rounded-lg text-muted-foreground hover:text-foreground" title="Edit"><Edit3 size={13} /></button>
                    <button onClick={() => { if (window.confirm('Delete category?')) deleteCategoryMutation.mutate(cat.id); }} className="p-1.5 hover:bg-destructive/10 border border-transparent rounded-lg text-muted-foreground hover:text-destructive" title="Delete"><Trash2 size={13} /></button>
                  </div>
                </div>
                <h3 className="font-bold text-base leading-snug">{cat.name}</h3>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">slug: /{cat.slug}</p>
              </div>
            </div>
          ))}
          {filteredCategories.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
              No course categories match your filter details.
            </div>
          )}
        </div>

      {/* Category Creation / Edit Modal */}
      <AnimatePresence>
        {showCatModal && (
          <div onClick={() => setShowCatModal(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div onClick={(e) => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-card border border-border w-full max-w-sm rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-bold text-sm">{editingCat ? 'Edit Category' : 'Create Category'}</h3>
                <button onClick={() => setShowCatModal(false)}><X size={16} /></button>
              </div>
              <form onSubmit={(e) => { 
                e.preventDefault(); 
                if (!catName.trim()) return;
                const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
                saveCategoryMutation.mutate({ name: catName, slug, id: editingCat?.id }); 
              }} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-muted-foreground uppercase mb-1 font-bold">Category Name *</label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    required
                    placeholder="e.g. Artificial Intelligence"
                    className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none"
                  />
                </div>
                <button type="submit" disabled={saveCategoryMutation.isPending} className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5">
                  <Save size={12} />
                  <span>{editingCat ? 'Save Changes' : 'Create Category'}</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  function resetForm() {
    setCatName('');
    setEditingCat(null);
  }
};
export default CategoriesTab;
