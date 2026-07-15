import React, { useState } from 'react';
import { Mail, Save, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

const INITIAL_SUBJECT = 'Welcome to Apex LMS – Your Account Has Been Created';
const INITIAL_BODY = `Dear {{full_name}},

Welcome to Apex LMS! 🎉

Your account has been successfully created. You can now log in to the Apex LMS portal using the credentials below.

--- Login Credentials ---

Name: {{full_name}}
Email: {{email}}
Temporary Password: {{password}}

Login Portal:
{{login_url}}

For security reasons, please change your password immediately after your first login.

Once you log in, you can:
- Access your assigned courses
- Watch video lessons
- Attend live classes
- Complete quizzes and assignments
- Track your learning progress
- Download certificates after successful course completion

If you experience any issues while logging in, please contact our support team.

Support Email: support@apex.com

Thank you for choosing Apex LMS. We wish you a successful learning journey.

Best Regards,
Apex LMS Team`;

export const EmailTemplatesTab: React.FC = () => {
  const [subject, setSubject] = useState(INITIAL_SUBJECT);
  const [body, setBody] = useState(INITIAL_BODY);
  const [previewMode, setPreviewMode] = useState(false);
  const [isSaved, setIsSaved] = useState(true);

  const handleBodyChange = (val: string) => {
    setBody(val);
    setIsSaved(false);
  };

  const handleSubjectChange = (val: string) => {
    setSubject(val);
    setIsSaved(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    toast.success('Welcome email template saved.');
  };

  const previewText = body
    .replace(/\{\{\s*full_name\s*\}\}/g, 'John Doe')
    .replace(/\{\{\s*email\s*\}\}/g, 'john.doe@example.com')
    .replace(/\{\{\s*password\s*\}\}/g, 'Temp@1234')
    .replace(/\{\{\s*login_url\s*\}\}/g, 'https://apex-lms.com/login');

  return (
    <div className="space-y-6 text-xs max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome Email Template</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Customize the registration welcome email sent to new users upon account creation.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Saved indicator */}
          {isSaved && (
            <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold">
              ✓ Saved
            </span>
          )}
          <button
            type="button"
            onClick={() => setPreviewMode(p => !p)}
            className="flex items-center gap-1.5 px-3 py-2 bg-muted hover:bg-muted/80 rounded-xl font-bold border border-border transition-colors"
          >
            <Eye size={13} />
            <span>{previewMode ? 'Edit Mode' : 'Preview'}</span>
          </button>
        </div>
      </div>

      {/* Template Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden"
      >
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-muted/20">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <Mail size={16} />
          </div>
          <div>
            <p className="font-extrabold text-sm text-foreground">Welcome Registration Email</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sent automatically on account creation · Template type: Transactional</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Subject line */}
          <div>
            <label className="block text-[10px] text-muted-foreground uppercase mb-1.5 font-bold tracking-wider">
              Email Subject Line *
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
              className="w-full h-10 px-3 bg-muted/40 border border-border rounded-xl outline-none focus:border-primary/45 font-semibold transition-colors"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                Email Body *
              </label>
              <span className="text-[10px] text-muted-foreground">
                Use <span className="text-primary font-semibold font-mono">{"{{full_name}}"}</span>{', '}
                <span className="text-primary font-semibold font-mono">{"{{email}}"}</span>{', '}
                <span className="text-primary font-semibold font-mono">{"{{password}}"}</span>{', '}
                <span className="text-primary font-semibold font-mono">{"{{login_url}}"}</span>
              </span>
            </div>

            {previewMode ? (
              <div className="w-full min-h-[280px] p-5 bg-muted/20 border border-border rounded-xl text-foreground text-sm leading-relaxed overflow-auto whitespace-pre-wrap">
                {previewText}
              </div>
            ) : (
              <textarea
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                required
                rows={12}
                className="w-full p-3 text-xs bg-muted/40 border border-border rounded-xl outline-none resize-none focus:border-primary/45 transition-colors leading-relaxed"
                placeholder="Write your plain text email body here..."
              />
            )}
          </div>

          {/* Available placeholders info */}
          <div className="bg-muted/30 border border-border/60 rounded-xl p-3 space-y-1">
            <p className="font-bold text-[10px] text-muted-foreground uppercase tracking-wider">Available Template Variables</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {['{{full_name}}', '{{email}}', '{{password}}', '{{login_url}}'].map(v => (
                <span key={v} className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-semibold">
                  {v}
                </span>
              ))}
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            className="w-full py-2.5 bg-primary text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-primary/15 hover:brightness-110 transition-all"
          >
            <Save size={13} />
            <span>Save Welcome Email Template</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
export default EmailTemplatesTab;
