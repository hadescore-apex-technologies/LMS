import React, { useState, useEffect } from 'react';
import { Mail, Save, Eye, CheckCircle2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import api from '../../../services/api';

const INITIAL_COURSE_STUDENT_SUBJECT = 'Welcome to Apex LMS – Course Student Account Details & Getting Started';
const INITIAL_COURSE_STUDENT_BODY = `Dear {{full_name}},

Welcome to Apex LMS! Your Course Learning account has been successfully provisioned.

We are excited to have you join our platform. Below are your account access credentials and login details to help you get started:

ACCOUNT DETAILS
--------------------------------------------------
Name: {{full_name}}
Email Address: {{email}}
Account Role: {{role}}
Temporary Password: {{password}}

PORTAL ACCESS
--------------------------------------------------
You can log in to your Course Learning dashboard here:
{{login_url}}

GETTING STARTED STEPS
--------------------------------------------------
1. Log in using your email and temporary password provided above.
2. For security, update your password under your Profile Settings after first login.
3. Explore your assigned courses, modules, lessons, and track your learning progress.

NEED ASSISTANCE?
--------------------------------------------------
If you have any questions or require support, please contact our team at support@apex.com.

Best regards,

Apex LMS Administration
Hadescore Apex Technologies Team`;

const INITIAL_LIVE_STUDENT_SUBJECT = 'Welcome to Apex Live Mentoring – Student Account & Live Class Access';
const INITIAL_LIVE_STUDENT_BODY = `Dear {{full_name}},

Welcome to Hadescore Apex Live Mentoring! Your Live Class Student account has been successfully created.

Below are your credentials and dedicated Live Student portal link:

LIVE STUDENT ACCOUNT DETAILS
--------------------------------------------------
Student Name: {{full_name}}
Registered Email: {{email}}
Account Type: Live Mentoring Student
Temporary Password: {{password}}

DEDICATED LIVE STUDENT PORTAL
--------------------------------------------------
Access your dedicated Live Classes, Mentoring Sessions, and Assignments here:
{{login_url}}

HOW TO GET STARTED
--------------------------------------------------
1. Log in via the Live Student Portal URL above using your credentials.
2. Check your Live Class Sessions schedule and join Google Meet / Live sessions directly from your dashboard.
3. Access your assigned mentor tasks, homework, and session recordings.

If you have any questions, reach out to your assigned mentor or email support@apex.com.

Best regards,

Academic Mentoring Office
Hadescore Apex Technologies Team`;

const INITIAL_STAFF_SUBJECT = 'Welcome to Apex LMS – Mentor & Staff Portal Access Credentials';
const INITIAL_STAFF_BODY = `Dear {{full_name}},

Welcome to the Hadescore Apex Academic Team! Your Staff & Mentor account has been successfully provisioned.

Below are your credentials and Staff Portal login details:

STAFF ACCOUNT DETAILS
--------------------------------------------------
Mentor Name: {{full_name}}
Email Address: {{email}}
Role: Staff / Academic Mentor
Temporary Password: {{password}}

STAFF PORTAL ACCESS
--------------------------------------------------
You can manage your courses, schedule live classes, and assign homework to students here:
{{login_url}}

NEXT STEPS
--------------------------------------------------
1. Log in to the Staff Portal using your email and temporary password.
2. Update your password under your Profile Settings.
3. View your assigned mentees, schedule Live Mentoring Sessions, and publish tasks.

Best regards,

Apex LMS Operations
Hadescore Apex Technologies Team`;

const INITIAL_LIVE_CLASS_SUBJECT = 'Live Session Notification: {{session_title}}';
const INITIAL_LIVE_CLASS_BODY = `Dear {{student_name}},

A new Live Mentoring Session has been scheduled by your mentor, {{mentor_name}}.

SESSION DETAILS
--------------------------------------------------
Topic: {{session_title}}
Mentor / Host: {{mentor_name}}
Date & Time: {{scheduled_time}}
Meeting URL: {{meeting_link}}

PREPARATION STEPS
--------------------------------------------------
1. Review your course materials and notes prior to session start time.
2. Prepare any specific questions or doubts you would like to discuss with your mentor.
3. Click the Meeting URL 5 minutes before the scheduled start time to join.

NEED ASSISTANCE?
--------------------------------------------------
If you cannot attend or have trouble joining the meeting, please send a message to your mentor via the portal.

Best regards,

Academic Mentoring Team
Hadescore Apex Technologies Team`;

const INITIAL_COURSE_COMPLETED_SUBJECT = 'Course Completion Verification & Certificate: {{course_title}}';
const INITIAL_COURSE_COMPLETED_BODY = `Dear {{student_name}},

This email confirms that you have completed 100% of the coursework requirements for '{{course_title}}'.

Your official Course Completion Certificate has been verified and issued by Hadescore Apex Technologies.

CERTIFICATE VERIFICATION DETAILS
--------------------------------------------------
Student Name: {{student_name}}
Course Completed: {{course_title}}
Certificate ID: {{certificate_code}}
Date of Issue: {{completion_date}}

CERTIFICATE ACCESS & DOWNLOAD
--------------------------------------------------
You can view and download your verified certificate PDF directly at:
{{certificate_url}}

You can also access your certificate anytime under the Certificates tab in your Apex LMS student dashboard.

Thank you for your hard work and dedication throughout this course track.

Best regards,

Academic Certification Office
Hadescore Apex Technologies Team`;

type EmailTemplateKey = 'STUDENT' | 'LIVE_STUDENT' | 'STAFF' | 'LIVE_CLASS' | 'COURSE_COMPLETED';

export const EmailTemplatesTab: React.FC = () => {
  const [liveMode, setLiveMode] = useState(localStorage.getItem('super_adminLiveMode') === 'true');
  const [activeRole, setActiveRole] = useState<EmailTemplateKey>(() => {
    const isLive = localStorage.getItem('super_adminLiveMode') === 'true';
    return isLive ? 'LIVE_STUDENT' : 'STUDENT';
  });

  const [subject, setSubject] = useState(INITIAL_COURSE_STUDENT_SUBJECT);
  const [body, setBody] = useState(INITIAL_COURSE_STUDENT_BODY);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  
  const [subjectSettingId, setSubjectSettingId] = useState<number | null>(null);
  const [bodySettingId, setBodySettingId] = useState<number | null>(null);
  const [, setLoading] = useState(true);

  useEffect(() => {
    const handleStorage = () => {
      const isLive = localStorage.getItem('super_adminLiveMode') === 'true';
      setLiveMode(isLive);
      setActiveRole(isLive ? 'LIVE_STUDENT' : 'STUDENT');
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const getTemplateKeys = (role: EmailTemplateKey) => {
    switch (role) {
      case 'LIVE_STUDENT':
        return {
          subjectKey: 'welcome_email_live_student_subject',
          bodyKey: 'welcome_email_live_student_body',
          defaultSubject: INITIAL_LIVE_STUDENT_SUBJECT,
          defaultBody: INITIAL_LIVE_STUDENT_BODY,
        };
      case 'STAFF':
        return {
          subjectKey: 'welcome_email_staff_subject',
          bodyKey: 'welcome_email_staff_body',
          defaultSubject: INITIAL_STAFF_SUBJECT,
          defaultBody: INITIAL_STAFF_BODY,
        };
      case 'LIVE_CLASS':
        return {
          subjectKey: 'live_class_email_subject',
          bodyKey: 'live_class_email_body',
          defaultSubject: INITIAL_LIVE_CLASS_SUBJECT,
          defaultBody: INITIAL_LIVE_CLASS_BODY,
        };
      case 'COURSE_COMPLETED':
        return {
          subjectKey: 'course_completion_email_subject',
          bodyKey: 'course_completion_email_body',
          defaultSubject: INITIAL_COURSE_COMPLETED_SUBJECT,
          defaultBody: INITIAL_COURSE_COMPLETED_BODY,
        };
      case 'STUDENT':
      default:
        return {
          subjectKey: 'welcome_email_student_subject',
          bodyKey: 'welcome_email_student_body',
          defaultSubject: INITIAL_COURSE_STUDENT_SUBJECT,
          defaultBody: INITIAL_COURSE_STUDENT_BODY,
        };
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.get('core/settings/');
        const settingsList = res.data || [];
        
        const { subjectKey, bodyKey, defaultSubject, defaultBody } = getTemplateKeys(activeRole);

        const subj = settingsList.find((s: any) => s.key === subjectKey);
        const bdy = settingsList.find((s: any) => s.key === bodyKey);

        if (subj) {
          setSubject(subj.value);
          setSubjectSettingId(subj.id);
        } else {
          setSubject(defaultSubject);
          setSubjectSettingId(null);
        }

        if (bdy) {
          setBody(bdy.value);
          setBodySettingId(bdy.id);
        } else {
          setBody(defaultBody);
          setBodySettingId(null);
        }
        setIsSaved(true);
      } catch (err) {
        toast.error('Failed to load email template settings.');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [activeRole]);

  const handleBodyChange = (val: string) => {
    setBody(val);
    setIsSaved(false);
  };

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    setIsSaved(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { subjectKey, bodyKey } = getTemplateKeys(activeRole);

    try {
      // Save subject setting
      if (subjectSettingId !== null) {
        await api.put(`core/settings/${subjectSettingId}/`, {
          key: subjectKey,
          value: subject
        });
      } else {
        const res = await api.post('core/settings/', {
          key: subjectKey,
          value: subject
        });
        setSubjectSettingId(res.data.id);
      }

      // Save body setting
      if (bodySettingId !== null) {
        await api.put(`core/settings/${bodySettingId}/`, {
          key: bodyKey,
          value: body
        });
      } else {
        const res = await api.post('core/settings/', {
          key: bodyKey,
          value: body
        });
        setBodySettingId(res.data.id);
      }

      setIsSaved(true);
      toast.success('Email template saved successfully.');
    } catch (err) {
      toast.error('Failed to save email template.');
    }
  };

  const previewText = activeRole === 'LIVE_CLASS'
    ? body
        .replace(/\{\{\s*student_name\s*\}\}/g, 'John Doe')
        .replace(/\{\{\s*full_name\s*\}\}/g, 'John Doe')
        .replace(/\{\{\s*session_title\s*\}\}/g, 'Python & React Live Mentoring Session')
        .replace(/\{\{\s*mentor_name\s*\}\}/g, 'Raj Hariraj')
        .replace(/\{\{\s*scheduled_time\s*\}\}/g, 'Aug 10, 2026 at 10:00 AM')
        .replace(/\{\{\s*meeting_link\s*\}\}/g, 'https://meet.google.com/abc-defg-hij')
    : activeRole === 'COURSE_COMPLETED'
    ? body
        .replace(/\{\{\s*student_name\s*\}\}/g, 'John Doe')
        .replace(/\{\{\s*full_name\s*\}\}/g, 'John Doe')
        .replace(/\{\{\s*course_title\s*\}\}/g, 'Full Stack Web Development')
        .replace(/\{\{\s*course_name\s*\}\}/g, 'Full Stack Web Development')
        .replace(/\{\{\s*certificate_code\s*\}\}/g, 'HA-APEX-100892')
        .replace(/\{\{\s*certificate_url\s*\}\}/g, 'http://localhost:8000/media/certificates/HA-APEX-100892.pdf')
        .replace(/\{\{\s*download_url\s*\}\}/g, 'http://localhost:8000/media/certificates/HA-APEX-100892.pdf')
        .replace(/\{\{\s*completion_date\s*\}\}/g, 'Aug 10, 2026')
    : activeRole === 'LIVE_STUDENT'
    ? body
        .replace(/\{\{\s*full_name\s*\}\}/g, 'Kavitha S')
        .replace(/\{\{\s*email\s*\}\}/g, 'kavitha@gmail.com')
        .replace(/\{\{\s*password\s*\}\}/g, 'apex123')
        .replace(/\{\{\s*login_url\s*\}\}/g, 'http://localhost:5173/student/live-login')
        .replace(/\{\{\s*role\s*\}\}/g, 'Live Student')
    : activeRole === 'STAFF'
    ? body
        .replace(/\{\{\s*full_name\s*\}\}/g, 'Raj Hariraj')
        .replace(/\{\{\s*email\s*\}\}/g, 'rajhariraj@gmail.com')
        .replace(/\{\{\s*password\s*\}\}/g, 'apex123')
        .replace(/\{\{\s*login_url\s*\}\}/g, 'http://localhost:5173/staff/login')
        .replace(/\{\{\s*role\s*\}\}/g, 'Staff / Mentor')
    : body
        .replace(/\{\{\s*full_name\s*\}\}/g, 'John Doe')
        .replace(/\{\{\s*email\s*\}\}/g, 'john.doe@gmail.com')
        .replace(/\{\{\s*password\s*\}\}/g, 'apex123')
        .replace(/\{\{\s*login_url\s*\}\}/g, 'http://localhost:5173/student/login')
        .replace(/\{\{\s*role\s*\}\}/g, 'Course Student');

  const availableTabs: { label: string; value: EmailTemplateKey }[] = liveMode ? [
    { label: 'Live Student Welcome', value: 'LIVE_STUDENT' },
    { label: 'Live Mentoring Session Scheduled', value: 'LIVE_CLASS' },
    { label: 'Live Mentor / Staff Welcome', value: 'STAFF' },
  ] : [
    { label: 'Course Student Welcome', value: 'STUDENT' },
    { label: 'Certificate & Completion', value: 'COURSE_COMPLETED' },
    { label: 'Doubt Clearing Session', value: 'LIVE_CLASS' },
  ];

  const currentVariables = activeRole === 'LIVE_CLASS'
    ? ['{{student_name}}', '{{session_title}}', '{{mentor_name}}', '{{scheduled_time}}', '{{meeting_link}}']
    : activeRole === 'COURSE_COMPLETED'
    ? ['{{student_name}}', '{{course_title}}', '{{certificate_code}}', '{{certificate_url}}', '{{completion_date}}']
    : ['{{full_name}}', '{{email}}', '{{role}}', '{{password}}', '{{login_url}}'];

  return (
    <div className="space-y-6 text-xs max-w-5xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-card p-6 rounded-2xl border border-slate-200/90 dark:border-border shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-foreground">System Email Templates</h1>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              liveMode ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 border border-violet-200 dark:border-violet-700/50' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50'
            }`}>
              {liveMode ? 'Live Mentoring Mode' : 'Course Portal Mode'}
            </span>
          </div>
          <p className="text-slate-500 dark:text-muted-foreground text-xs">
            {liveMode 
              ? 'Configure automated transactional emails for Live Mentoring students, scheduled sessions, and staff mentors.'
              : 'Configure automated transactional emails for Course students, doubt clearing sessions, and verified certificates.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {isSaved && (
            <span className="flex items-center gap-1 text-[10px] px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/40 font-bold shadow-xs">
              <CheckCircle2 size={12} />
              <span>Saved & Active</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setPreviewMode(p => !p)}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-muted hover:bg-slate-200 dark:hover:bg-muted/80 text-slate-700 dark:text-foreground rounded-xl font-bold border border-slate-200 dark:border-border shadow-xs transition-all active:scale-95"
          >
            <Eye size={13} />
            <span>{previewMode ? 'Switch to Editor' : 'Live Email Preview'}</span>
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/80 dark:bg-muted/60 border border-slate-200 dark:border-border/80 rounded-2xl w-fit">
        {availableTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveRole(tab.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all duration-200 ${
              activeRole === tab.value
                ? 'bg-white dark:bg-card text-slate-900 dark:text-foreground shadow-sm shadow-slate-200/50 scale-[1.02]'
                : 'text-slate-600 dark:text-muted-foreground hover:text-slate-900 dark:hover:text-foreground hover:bg-white/60 dark:hover:bg-card/50'
            }`}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Template Editor Card */}
      <motion.div
        key={activeRole}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-card border border-slate-200/90 dark:border-border rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Card header */}
        <div className="flex items-center gap-3.5 px-6 py-4 border-b border-slate-200/80 dark:border-border bg-slate-50/50 dark:bg-muted/20">
          <div className="p-2.5 bg-primary/10 text-primary rounded-xl shrink-0">
            <Mail size={18} />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-foreground">
              {activeRole === 'LIVE_CLASS' ? 'Live Mentoring Session Scheduled Notification Email' :
               activeRole === 'LIVE_STUDENT' ? 'Live Class Student Welcome & Login Email' :
               activeRole === 'STAFF' ? 'Staff & Mentor Account Welcome Email' :
               activeRole === 'COURSE_COMPLETED' ? 'Course Completion & Certificate Email' :
               'Course Student Welcome & Login Email'}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-muted-foreground mt-0.5">
              {activeRole === 'LIVE_CLASS' ? 'Dispatched via SMTP to assigned students when a mentor schedules a Live Mentoring Session' :
               activeRole === 'LIVE_STUDENT' ? 'Dispatched automatically when a Live Mentoring student is enrolled with Live Student Portal link' :
               activeRole === 'STAFF' ? 'Dispatched automatically when a Staff / Mentor account is created with Staff Portal link' :
               activeRole === 'COURSE_COMPLETED' ? 'Dispatched via SMTP directly to student inbox upon 100% course completion / certificate issuance' :
               'Dispatched automatically when a Course student is enrolled with Course Portal link'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-6">
          {/* Subject line */}
          <div className="space-y-1.5">
            <label className="block text-[11px] text-slate-600 dark:text-muted-foreground uppercase font-extrabold tracking-wider">
              Email Subject Line *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              className="w-full h-11 px-4 bg-slate-50/80 dark:bg-muted/40 border border-slate-200 dark:border-border rounded-xl outline-none focus:border-primary focus:bg-white dark:focus:bg-card font-semibold text-xs text-slate-800 dark:text-foreground transition-all shadow-xs"
              placeholder="Enter subject line..."
            />
          </div>

          {/* Body / Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[11px] text-slate-600 dark:text-muted-foreground uppercase font-extrabold tracking-wider">
                {previewMode ? 'Live Rendered Email Preview' : 'Email Content / Body Template *'}
              </label>
              <span className="text-[10px] text-slate-400 font-medium">
                Plain Text Delivery Format (Anti-Spam Optimized)
              </span>
            </div>

            {previewMode ? (
              <div className="rounded-2xl border border-slate-200 dark:border-border overflow-hidden shadow-xs bg-slate-900 text-slate-100">
                <div className="px-5 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Subject:</span>
                    <span className="font-bold text-white">{subject}</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-md font-bold">
                    Direct Inbox Delivery
                  </span>
                </div>
                <div className="p-6 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-200 bg-slate-900/90 max-h-[380px] overflow-y-auto">
                  {previewText}
                </div>
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                required
                rows={13}
                className="w-full p-4 text-xs font-mono bg-slate-50/80 dark:bg-muted/40 border border-slate-200 dark:border-border rounded-xl outline-none resize-y focus:border-primary focus:bg-white dark:focus:bg-card text-slate-800 dark:text-foreground leading-relaxed transition-all shadow-xs"
                placeholder="Write your email body template here..."
              />
            )}
          </div>

          {/* Available placeholders info */}
          <div className="bg-slate-50/90 dark:bg-muted/30 border border-slate-200/80 dark:border-border/70 rounded-xl p-4 space-y-2">
            <p className="font-extrabold text-[10px] text-slate-600 dark:text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="text-primary" />
              <span>Available Dynamic Placeholders</span>
            </p>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {currentVariables.map(v => (
                <button
                  type="button"
                  key={v}
                  onClick={() => {
                    handleBodyChange(body + ' ' + v);
                    toast.success(`Inserted ${v}`);
                  }}
                  className="font-mono text-[10px] px-2.5 py-1 rounded-lg bg-white dark:bg-card border border-slate-200 dark:border-border text-primary font-bold shadow-2xs hover:border-primary hover:bg-primary/5 transition-all"
                  title="Click to insert at end of body"
                >
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-muted-foreground leading-relaxed pt-1">
              Click any variable chip to insert it. These will be automatically substituted with real student/session details upon dispatch.
            </p>
          </div>

          {/* Save button */}
          <button
            type="submit"
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 shadow-md shadow-primary/20 hover:brightness-110 active:scale-98 transition-all text-xs cursor-pointer"
          >
            <Save size={15} />
            <span>Save Email Template</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
export default EmailTemplatesTab;
