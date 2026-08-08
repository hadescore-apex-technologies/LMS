import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { loginSuccess } from '../../features/authSlice';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Eye, EyeOff, Lock, Mail, GraduationCap, Briefcase, Shield,
  ChevronRight, KeyRound, Zap, BookOpen, Award, Users, BarChart3,
  ArrowLeft, Sparkles, Play, Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';

// ── Schema ────────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  rememberMe: z.boolean().optional(),
});
type LoginFormValues = z.infer<typeof loginSchema>;
interface LoginPageProps { 
  role?: 'SUPER_ADMIN' | 'STAFF' | 'STUDENT'; 
  mode?: 'COURSE' | 'LIVE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// AURORA CANVAS — Animated northern-lights background
// ═══════════════════════════════════════════════════════════════════════════════
const AuroraCanvas: React.FC<{ color1: string; color2: string; color3: string }> = ({ color1, color2, color3 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      time += 0.003;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw 3 flowing aurora ribbons
      for (let r = 0; r < 3; r++) {
        const colors = [color1, color2, color3];
        const yBase = canvas.height * (0.25 + r * 0.2);
        const amplitude = 60 + r * 30;
        const speed = time * (0.8 + r * 0.3);

        ctx.beginPath();
        ctx.moveTo(0, canvas.height);

        for (let x = 0; x <= canvas.width; x += 3) {
          const progress = x / canvas.width;
          const y = yBase +
            Math.sin(progress * 4 + speed) * amplitude +
            Math.sin(progress * 2.5 + speed * 0.7) * (amplitude * 0.6) +
            Math.cos(progress * 6 + speed * 1.3) * (amplitude * 0.3);
          ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        const gradient = ctx.createLinearGradient(0, yBase - amplitude, 0, yBase + amplitude * 2);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.3, colors[r]);
        gradient.addColorStop(0.7, colors[r].replace(/[\d.]+\)$/, '0.02)'));
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [color1, color2, color3]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};



// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
const LoginPage: React.FC<LoginPageProps> = ({ role, mode }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const cardRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'LOGIN' | 'FORGOT_PASSWORD' | 'RESET_PASSWORD'>('LOGIN');
  const [resetEmail, setResetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isStudentLiveMode, setIsStudentLiveMode] = useState<boolean>(
    mode === 'LIVE' || (mode === undefined && localStorage.getItem('studentLiveMode') === 'true')
  );

  useEffect(() => { 
    setMounted(true); 
    if (mode === 'LIVE') {
      localStorage.setItem('studentLiveMode', 'true');
      setIsStudentLiveMode(true);
    } else if (mode === 'COURSE') {
      localStorage.setItem('studentLiveMode', 'false');
      setIsStudentLiveMode(false);
    }
  }, [mode]);

  const currentRole = role || (
    location.pathname.startsWith('/admin') ? 'SUPER_ADMIN' :
    location.pathname.startsWith('/staff') ? 'STAFF' : 'STUDENT'
  );

  // ── 3D Tilt ─────────────────────────────────────────────────────────────
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-300, 300], [6, -6]), { stiffness: 150, damping: 20 });
  const rotateY = useSpring(useTransform(mouseX, [-300, 300], [-6, 6]), { stiffness: 150, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  // ── Role Config ─────────────────────────────────────────────────────────
  const roleConfig = {
    SUPER_ADMIN: {
      portalLabel: "ADMIN",
      portalFull: "Administrator Access",
      icon: Shield,
      bgGradient: "from-purple-50 via-violet-100/70 to-fuchsia-50",
      gradient: "from-violet-600 via-purple-600 to-fuchsia-600",
      btnGradient: "from-violet-600 via-purple-600 to-fuchsia-600",
      hoverShadow: "hover:shadow-[0_10px_35px_rgba(139,92,246,0.35)]",
      accentColor: "text-violet-600",
      badgeBg: "bg-violet-100 border-violet-200 text-violet-700 font-bold",
      inputFocus: "focus:border-violet-500 focus:ring-violet-500/15",
      aurora1: "rgba(139, 92, 246, 0.22)",
      aurora2: "rgba(192, 132, 252, 0.18)",
      aurora3: "rgba(232, 121, 249, 0.20)",
      ringColor: "rgba(139,92,246,1)",
      glowColor: "rgba(139,92,246,0.25)",
      orb1: "bg-violet-300/50",
      orb2: "bg-fuchsia-300/40"
    },
    STAFF: {
      portalLabel: "MENTOR",
      portalFull: "Mentor Access",
      icon: Briefcase,
      bgGradient: "from-emerald-50 via-teal-100/70 to-cyan-50",
      gradient: "from-emerald-600 via-teal-600 to-cyan-600",
      btnGradient: "from-emerald-600 via-teal-600 to-cyan-600",
      hoverShadow: "hover:shadow-[0_10px_35px_rgba(20,184,166,0.35)]",
      accentColor: "text-teal-600",
      badgeBg: "bg-teal-100 border-teal-200 text-teal-700 font-bold",
      inputFocus: "focus:border-teal-500 focus:ring-teal-500/15",
      aurora1: "rgba(20, 184, 166, 0.22)",
      aurora2: "rgba(52, 211, 153, 0.18)",
      aurora3: "rgba(6, 182, 212, 0.20)",
      ringColor: "rgba(20,184,166,1)",
      glowColor: "rgba(20,184,166,0.25)",
      orb1: "bg-teal-300/50",
      orb2: "bg-emerald-300/40"
    },
    STUDENT: isStudentLiveMode ? {
      portalLabel: "LIVE STUDENT",
      portalFull: "Live Class Access",
      icon: Zap,
      bgGradient: "from-indigo-50 via-blue-100/70 to-indigo-50",
      gradient: "from-indigo-600 via-blue-600 to-indigo-600",
      btnGradient: "from-indigo-600 via-blue-600 to-indigo-600",
      hoverShadow: "hover:shadow-[0_10px_35px_rgba(79,70,229,0.35)]",
      accentColor: "text-indigo-600",
      badgeBg: "bg-indigo-100 border-indigo-200 text-indigo-700 font-bold",
      inputFocus: "focus:border-indigo-500 focus:ring-indigo-500/15",
      aurora1: "rgba(79, 70, 229, 0.22)",
      aurora2: "rgba(59, 130, 246, 0.18)",
      aurora3: "rgba(99, 102, 241, 0.20)",
      ringColor: "rgba(79,70,229,1)",
      glowColor: "rgba(79,70,229,0.25)",
      orb1: "bg-indigo-300/50",
      orb2: "bg-blue-300/40"
    } : {
      portalLabel: "COURSE STUDENT",
      portalFull: "Course Access",
      icon: GraduationCap,
      bgGradient: "from-sky-50 via-blue-100/70 to-cyan-50",
      gradient: "from-cyan-600 via-sky-600 to-blue-600",
      btnGradient: "from-cyan-600 via-sky-600 to-blue-600",
      hoverShadow: "hover:shadow-[0_10px_35px_rgba(6,182,212,0.35)]",
      accentColor: "text-sky-600",
      badgeBg: "bg-sky-100 border-sky-200 text-sky-700 font-bold",
      inputFocus: "focus:border-sky-500 focus:ring-sky-500/15",
      aurora1: "rgba(6, 182, 212, 0.22)",
      aurora2: "rgba(56, 189, 248, 0.18)",
      aurora3: "rgba(59, 130, 246, 0.20)",
      ringColor: "rgba(6,182,212,1)",
      glowColor: "rgba(6,182,212,0.25)",
      orb1: "bg-sky-300/50",
      orb2: "bg-cyan-300/40"
    }
  }[currentRole];

  const RoleIcon = roleConfig.icon;

  // ── Form ────────────────────────────────────────────────────────────────
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false }
  });

  const onSubmit = useCallback(async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const res = await api.post('auth/login/', { email: data.email, password: data.password });
      const { user, access, refresh } = res.data;
      if (user.role !== currentRole) {
        toast.error(`Access Denied: Your role is ${user.role}, but this is the ${currentRole} portal.`, { duration: 6000 });
        setLoading(false);
        return;
      }

      // Check student portal mode matching
      if (user.role === 'STUDENT') {
        const studentType = user.student_type || 'COURSE';
        if (isStudentLiveMode && studentType === 'COURSE') {
          toast.error("Access Denied: You are registered for standard Course Access. Please log in at /student/login", { duration: 6000 });
          setLoading(false);
          return;
        }
        if (!isStudentLiveMode && studentType === 'LIVE_CLASS') {
          toast.error("Access Denied: You are registered for Live Class Mentoring. Please log in at /student/live-login", { duration: 6000 });
          setLoading(false);
          return;
        }
      }

      const roleLoginPath: Record<string, string> = {
        SUPER_ADMIN: '/admin/login',
        STAFF: '/staff/login',
        STUDENT: isStudentLiveMode ? '/student/live-login' : '/student/login',
      };
      const loginPath = roleLoginPath[user.role] || '/student/login';
      dispatch(loginSuccess({ user, access, refresh, loginPath }));
      toast.success(`Welcome back, ${user.first_name || 'User'}!`);
      if (user.role === 'SUPER_ADMIN') navigate('/admin');
      else if (user.role === 'STAFF') navigate('/staff');
      else navigate('/student');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials.", { duration: 6000 });
    } finally { setLoading(false); }
  }, [currentRole, isStudentLiveMode, dispatch, navigate]);

  const handleForgotPasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { toast.error("Please enter your email address."); return; }
    setLoading(true);
    try {
      const res = await api.post('auth/forgot-password/', { email: resetEmail });
      toast.success(res.data.detail || "Verification code sent to your email.");
      setView('RESET_PASSWORD');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send code.", { duration: 6000 });
    } finally { setLoading(false); }
  }, [resetEmail]);

  const handleResetPasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || !newPassword || !confirmPassword) { toast.error("All fields are required."); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await api.post('auth/reset-password/', { email: resetEmail, otp, new_password: newPassword });
      toast.success(res.data.detail || "Password reset successfully.");
      setView('LOGIN'); setOtp(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to reset password.", { duration: 6000 });
    } finally { setLoading(false); }
  }, [otp, newPassword, confirmPassword, resetEmail]);

  // ── Styles ──────────────────────────────────────────────────────────────
  const inputCls = `w-full h-[50px] pl-12 pr-4 bg-slate-100/80 border border-slate-200/90 rounded-2xl outline-none text-[13px] text-slate-800 font-semibold placeholder:text-slate-400 transition-all duration-300 focus:ring-4 focus:bg-white backdrop-blur-sm ${roleConfig.inputFocus}`;
  const inputClsR = `w-full h-[50px] pl-12 pr-12 bg-slate-100/80 border border-slate-200/90 rounded-2xl outline-none text-[13px] text-slate-800 font-semibold placeholder:text-slate-400 transition-all duration-300 focus:ring-4 focus:bg-white backdrop-blur-sm ${roleConfig.inputFocus}`;

  return (
    <div
      className={`relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br ${roleConfig.bgGradient} overflow-hidden select-none transition-colors duration-700`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── BACKGROUND LAYERS ──────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Glowing Gradient Ambient Orbs */}
        <motion.div
          className={`absolute -top-24 -left-24 w-96 h-96 rounded-full ${roleConfig.orb1} blur-3xl opacity-60 pointer-events-none`}
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className={`absolute -bottom-24 -right-24 w-[30rem] h-[30rem] rounded-full ${roleConfig.orb2} blur-3xl opacity-60 pointer-events-none`}
          animate={{ x: [0, -40, 0], y: [0, -50, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Aurora animation canvas */}
        {mounted && (
          <AuroraCanvas color1={roleConfig.aurora1} color2={roleConfig.aurora2} color3={roleConfig.aurora3} />
        )}

        {/* Radial vignette from center */}
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(255,255,255,0.4) 85%)'
        }} />

        {/* Subtle dot pattern grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-20" />
      </div>



      {/* ── FLOATING LOGO (above card) ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -30, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-20 mb-6 flex flex-col items-center gap-3"
      >
        <div className="relative group">
          {/* Logo glow ring */}
          <motion.div
            className="absolute -inset-3 rounded-3xl opacity-60"
            style={{ background: `radial-gradient(circle, ${roleConfig.glowColor}, transparent)` }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative p-3 bg-white/90 border border-white rounded-2xl backdrop-blur-2xl shadow-xl shadow-slate-200/50">
            <img
              src="/logo.png?v=2"
              alt="Apex LMS"
              className="h-11 w-11 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] group-hover:scale-105 transition-all duration-500"
            />
          </div>
        </div>
        <div className="text-center">
          <h1 className="text-sm font-black tracking-[0.25em] uppercase text-slate-800 leading-none">
            HADESCORE APEX
          </h1>
          <p className="text-[11px] font-bold tracking-[0.35em] uppercase text-slate-500 mt-1">
            & TECHNOLOGIES
          </p>
        </div>
      </motion.div>

      {/* ── 3D TILT CARD ───────────────────────────────── */}
      <motion.div
        ref={cardRef}
        className="relative z-20 w-full max-w-[430px] px-4"
        style={{
          rotateX,
          rotateY,
          transformPerspective: 1200,
          transformStyle: 'preserve-3d',
        }}
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Card outer glow */}
        <div
          className="absolute -inset-4 rounded-[2.5rem] opacity-40 blur-2xl pointer-events-none"
          style={{ background: `radial-gradient(ellipse, ${roleConfig.glowColor}, transparent 70%)` }}
        />

        <div className="relative bg-white/90 border border-white/80 rounded-[1.75rem] overflow-hidden backdrop-blur-2xl shadow-[0_25px_70px_rgba(15,23,42,0.12)]">

          {/* Top gradient bar */}
          <div className={`h-1.5 bg-gradient-to-r ${roleConfig.gradient}`} />

          <div className="p-7 sm:p-8">
            {/* Card header */}
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.2 }}
                className="mb-7"
              >
                {/* Portal badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] border backdrop-blur-sm ${roleConfig.badgeBg} mb-4`}>
                  <RoleIcon size={10} />
                  <span>{roleConfig.portalLabel}</span>
                </div>

                <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  {view === 'LOGIN' ? (
                    <>Sign in to <br /><span className={`bg-gradient-to-r ${roleConfig.gradient} bg-clip-text text-transparent`}>{roleConfig.portalFull}</span></>
                  ) : view === 'FORGOT_PASSWORD' ? (
                    'Reset Password'
                  ) : (
                    'Create New Password'
                  )}
                </h2>
                <p className="text-[12px] text-slate-500 mt-2 font-medium leading-relaxed">
                  {view === 'LOGIN'
                    ? 'Enter your credentials to continue.'
                    : view === 'FORGOT_PASSWORD'
                      ? 'We\'ll send a 6-digit OTP to your email.'
                      : `Verification code sent to ${resetEmail}`}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* ── FORMS ── */}
            <AnimatePresence mode="wait">
              {/* ── LOGIN ── */}
              {view === 'LOGIN' && (
                <motion.form
                  key="login"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {/* Email */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 pl-1">Email</label>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focusedField === 'email' ? roleConfig.accentColor : 'text-slate-400'}`}>
                        <Mail size={16} />
                      </div>
                      <input
                        id="login-email"
                        type="email"
                        placeholder="you@domain.com"
                        autoComplete="email"
                        {...register('email')}
                        onFocus={() => setFocusedField('email')}
                        onBlur={() => setFocusedField(null)}
                        className={`${inputCls} ${errors.email ? 'border-red-500/60' : ''}`}
                      />
                    </div>
                    {errors.email && (
                      <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-red-500 text-[11px] font-semibold pl-1">
                        {errors.email.message}
                      </motion.p>
                    )}
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">Password</label>
                      {currentRole === 'SUPER_ADMIN' && (
                        <button type="button" onClick={() => { setView('FORGOT_PASSWORD'); setResetEmail(''); }}
                          className={`text-[10px] font-bold ${roleConfig.accentColor} hover:underline transition-opacity`}>
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focusedField === 'password' ? roleConfig.accentColor : 'text-slate-400'}`}>
                        <Lock size={16} />
                      </div>
                      <input
                        id="login-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        {...register('password')}
                        onFocus={() => setFocusedField('password')}
                        onBlur={() => setFocusedField(null)}
                        className={`${inputClsR} ${errors.password ? 'border-red-500/60' : ''}`}
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {errors.password && (
                      <motion.p initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} className="text-red-500 text-[11px] font-semibold pl-1">
                        {errors.password.message}
                      </motion.p>
                    )}
                  </div>





                  {/* Submit */}
                  <motion.button
                    type="submit"
                    disabled={loading}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full h-[50px] mt-2 rounded-2xl text-sm font-extrabold tracking-wide text-white bg-gradient-to-r ${roleConfig.btnGradient} ${roleConfig.hoverShadow} transition-all duration-400 flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed relative overflow-hidden group/btn shadow-md`}
                  >
                    {/* Sweep shine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    {loading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Fingerprint size={16} className="opacity-90" />
                        <span className="relative">Sign In</span>
                        <ChevronRight size={15} className="relative group-hover/btn:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* ── FORGOT PASSWORD ── */}
              {view === 'FORGOT_PASSWORD' && (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleForgotPasswordSubmit}
                  className="space-y-5"
                >
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 pl-1">Admin Email</label>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focusedField === 'reset-email' ? roleConfig.accentColor : 'text-slate-400'}`}>
                        <Mail size={16} />
                      </div>
                      <input
                        id="forgot-email" type="email" placeholder="admin@domain.com"
                        value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                        onFocus={() => setFocusedField('reset-email')} onBlur={() => setFocusedField(null)}
                        className={inputCls} required
                      />
                    </div>
                  </div>
                  <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
                    className={`w-full h-[50px] rounded-2xl text-sm font-extrabold tracking-wide text-white bg-gradient-to-r ${roleConfig.btnGradient} ${roleConfig.hoverShadow} transition-all duration-400 flex items-center justify-center gap-2 disabled:opacity-40 relative overflow-hidden group/btn shadow-md`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="relative">Send Code</span><ChevronRight size={15} className="relative" /></>}
                  </motion.button>
                  <button type="button" onClick={() => setView('LOGIN')}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1">
                    <ArrowLeft size={12} /> Back to Sign In
                  </button>
                </motion.form>
              )}

              {/* ── RESET PASSWORD ── */}
              {view === 'RESET_PASSWORD' && (
                <motion.form
                  key="reset"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleResetPasswordSubmit}
                  className="space-y-4"
                >
                  {/* OTP */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 pl-1">Verification Code</label>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focusedField === 'otp' ? roleConfig.accentColor : 'text-slate-400'}`}>
                        <KeyRound size={16} />
                      </div>
                      <input
                        id="reset-otp" type="text" placeholder="• • • • • •" maxLength={6}
                        value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        onFocus={() => setFocusedField('otp')} onBlur={() => setFocusedField(null)}
                        className={`${inputCls} tracking-[0.6em] text-center font-mono text-base`} required
                      />
                    </div>
                  </div>
                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 pl-1">New Password</label>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focusedField === 'new-pw' ? roleConfig.accentColor : 'text-slate-400'}`}>
                        <Lock size={16} />
                      </div>
                      <input
                        id="reset-new-password" type={showNewPassword ? "text" : "password"} placeholder="••••••••"
                        value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        onFocus={() => setFocusedField('new-pw')} onBlur={() => setFocusedField(null)}
                        className={inputClsR} required
                      />
                      <button type="button" onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors">
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  {/* Confirm Password */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 pl-1">Confirm Password</label>
                    <div className="relative">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-300 ${focusedField === 'confirm-pw' ? roleConfig.accentColor : 'text-slate-400'}`}>
                        <Lock size={16} />
                      </div>
                      <input
                        id="reset-confirm-password" type={showNewPassword ? "text" : "password"} placeholder="••••••••"
                        value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        onFocus={() => setFocusedField('confirm-pw')} onBlur={() => setFocusedField(null)}
                        className={inputClsR} required
                      />
                    </div>
                  </div>
                  <motion.button type="submit" disabled={loading} whileTap={{ scale: 0.97 }}
                    className={`w-full h-[50px] rounded-2xl text-sm font-extrabold tracking-wide text-white bg-gradient-to-r ${roleConfig.btnGradient} ${roleConfig.hoverShadow} transition-all duration-400 flex items-center justify-center gap-2 disabled:opacity-40 relative overflow-hidden group/btn shadow-md`}>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700" />
                    {loading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><span className="relative">Reset Password</span><ChevronRight size={15} className="relative" /></>}
                  </motion.button>
                  <button type="button" onClick={() => setView('LOGIN')}
                    className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1">
                    <ArrowLeft size={12} /> Cancel & Return
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>


    </div>
  );
};

export default LoginPage;
