import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loginSuccess } from '../../features/authSlice';
import { setTheme } from '../../features/themeSlice';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, GraduationCap, Briefcase, Shield, ChevronRight } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginPageProps {
  role?: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT';
}

const LoginPage: React.FC<LoginPageProps> = ({ role }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic role determination based purely on URL path
  const currentRole = role || (
    location.pathname.startsWith('/admin') ? 'SUPER_ADMIN' : 
    location.pathname.startsWith('/staff') ? 'STAFF' : 'STUDENT'
  );

  // Custom configuration for each role matching a premium SaaS aesthetic
  const roleConfig = {
    SUPER_ADMIN: {
      portalLabel: "ADMIN LOGIN",
      icon: Shield,
      accentColor: "from-indigo-600 to-blue-700",
      focusBorder: "focus:border-indigo-500/50 focus:ring-indigo-500/10",
      buttonBg: "from-indigo-600 to-blue-600 hover:shadow-indigo-600/20",
      bgGlow: "bg-indigo-500/5",
    },
    STAFF: {
      portalLabel: "STAFF LOGIN",
      icon: Briefcase,
      accentColor: "from-teal-600 to-cyan-700",
      focusBorder: "focus:border-teal-500/50 focus:ring-teal-500/10",
      buttonBg: "from-teal-600 to-cyan-600 hover:shadow-teal-600/20",
      bgGlow: "bg-teal-500/5",
    },
    STUDENT: {
      portalLabel: "STUDENT LOGIN",
      icon: GraduationCap,
      accentColor: "from-blue-600 to-indigo-700",
      focusBorder: "focus:border-blue-500/50 focus:ring-blue-500/10",
      buttonBg: "from-blue-600 to-indigo-600 hover:shadow-blue-600/20",
      bgGlow: "bg-blue-500/5",
    }
  }[currentRole];

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await api.post('auth/login/', {
        email: data.email,
        password: data.password
      });

      const { user, access, refresh } = res.data;

      // Role validation
      if (user.role !== currentRole) {
        toast.error(`Access Denied: Your account role is ${user.role}, but you are trying to log in via the ${currentRole} portal. Please use your respective login page.`, { duration: 6000 });
        setLoading(false);
        return;
      }

      // Save tokens in Redux store
      dispatch(loginSuccess({ user, access, refresh }));
      dispatch(setTheme('dark'));
      
      toast.success(`Welcome back, ${user.first_name}!`);

      // Role Based Redirection
      if (user.role === 'SUPER_ADMIN') {
        navigate('/admin');
      } else if (user.role === 'STAFF') {
        navigate('/staff');
      } else {
        navigate('/student');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || "Invalid credentials. Please try again.";
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center text-slate-200 bg-[#060814] overflow-hidden select-none font-sans px-4">
      {/* Background Wrapper to isolate absolute elements from flex layout */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* 🌌 Premium Radial Background Glows */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.15),transparent_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_120%,rgba(59,130,246,0.08),transparent_100%)]" />
        
        {/* Subtle Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)]" />

        {/* Dynamic Aura behind the card */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full filter blur-[150px] transition-all duration-1000 opacity-[0.15] ${roleConfig.bgGlow}`} />
      </div>

      <div className="w-full max-w-[420px] space-y-6 z-10 mx-auto">
        {/* Logo and Premium Brand Header */}
        <div className="text-center space-y-3">
          <div className="inline-block">
            <img src="/logo.png?v=2" alt="Hadescore Logo" className="h-16 w-16 mx-auto object-contain" />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black tracking-widest text-white font-display uppercase leading-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
              HADESCORE
            </h1>
            <p className="text-[10px] font-bold tracking-[0.25em] text-slate-400 uppercase">
              APEX & TECHNOLOGIES
            </p>
          </div>
        </div>

        {/* Premium Corporate Glassmorphism Login Card */}
        <div className="bg-[#090d22]/40 border border-white/[0.06] rounded-3xl p-6 sm:p-8 shadow-[0_30px_70px_rgba(0,0,0,0.5)] backdrop-blur-2xl relative overflow-hidden">
          {/* Subtle upper glow effect */}
          <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r ${roleConfig.accentColor}`} />
          
          <div className="space-y-6">
            {/* Header info */}
            <div className="text-center">
              <h3 className="text-sm font-extrabold tracking-widest uppercase text-white font-display">
                {roleConfig.portalLabel}
              </h3>
            </div>

            {/* Inputs & Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Address */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Mail size={15} />
                  </div>
                  <input
                    type="email"
                    placeholder="Enter Your Email"
                    {...register('email')}
                    className={`w-full h-11 pl-11 pr-4 bg-slate-950/50 border border-white/10 rounded-xl outline-none text-sm transition-all focus:bg-slate-950/80 focus:ring-4 ${
                      errors.email 
                        ? 'border-destructive/40 focus:border-destructive/60 focus:ring-destructive/10' 
                        : `${roleConfig.focusBorder}`
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs mt-1.5 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <Lock size={15} />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    {...register('password')}
                    className={`w-full h-11 pl-11 pr-11 bg-slate-950/50 border border-white/10 rounded-xl outline-none text-sm transition-all focus:bg-slate-950/80 focus:ring-4 ${
                      errors.password 
                        ? 'border-destructive/40 focus:border-destructive/60 focus:ring-destructive/10' 
                        : `${roleConfig.focusBorder}`
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors outline-none"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-destructive text-xs mt-1.5 font-medium">{errors.password.message}</p>
                )}
              </div>



              {/* Submit Sync Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full h-11 bg-gradient-to-r ${roleConfig.buttonBg} text-white rounded-xl text-xs font-semibold tracking-wider hover:brightness-110 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shadow-md`}
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ChevronRight size={14} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-[10px] text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} Hadescore Apex & Technologies. All rights reserved.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
