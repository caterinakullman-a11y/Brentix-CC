import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink, Circle, CheckCircle2, RotateCcw } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from '@/hooks/use-toast';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  { id: 'first-admin', label: 'Set First Admin' },
  { id: 'service-key', label: 'Get SERVICE_ROLE_KEY' },
  { id: 'totp', label: 'Get TOTP Secret' },
  { id: 'account-id', label: 'Find Account ID' },
  { id: 'instrument', label: 'Set Instrument ID' },
  { id: 'cron', label: 'Set Up Cron Jobs' },
  { id: 'secrets', label: 'Add Edge Secrets' },
];

const STORAGE_KEY = 'brentix-setup-checklist';

export function SetupGuideModal({ isOpen, onClose }: SetupGuideModalProps) {
  const { toast } = useToast();
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setCompletedSteps(JSON.parse(saved));
    }
  }, []);

  const toggleStep = (stepId: string) => {
    const updated = completedSteps.includes(stepId)
      ? completedSteps.filter(id => id !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const resetProgress = () => {
    setCompletedSteps([]);
    localStorage.removeItem(STORAGE_KEY);
    toast({ title: "Progress reset", description: "All steps marked as incomplete" });
  };

  const progress = Math.round((completedSteps.length / STEPS.length) * 100);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const fetchPriceSQL = `-- Step 1: Enable extensions (run once)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create cron job for fetching prices
SELECT cron.schedule(
  'fetch-brent-price',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzjotfvudihvlzrorrqz.supabase.co/functions/v1/fetch-brent-price',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);`;

  const tradeQueueSQL = `-- Cron job for processing trade queue (requires SERVICE_ROLE_KEY)
SELECT cron.schedule(
  'process-trade-queue',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://rzjotfvudihvlzrorrqz.supabase.co/functions/v1/process-trade-queue',
    headers := jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);`;

  const firstAdminSQL = `-- Run this AFTER creating your account to become the first admin
-- Replace 'your-email@example.com' with your actual email

UPDATE profiles 
SET status = 'approved', approved_at = NOW()
WHERE email = 'your-email@example.com';

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin' FROM profiles 
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role) DO UPDATE SET role = 'admin';`;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[#0a0a0a]/90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#111] w-full max-w-lg max-h-[80vh] overflow-y-auto p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#444] hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-light text-white mb-2">Setup Guide</h2>
        <p className="text-xs text-[#666] mb-4">
          Follow these steps to configure Avanza auto-trading
        </p>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-[#666]">Progress</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#5B9A6F]">{completedSteps.length}/{STEPS.length} complete</span>
              {completedSteps.length > 0 && (
                <button
                  onClick={resetProgress}
                  className="text-[10px] text-[#444] hover:text-[#9A5B5B] flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#5B9A6F] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick checklist */}
        <div className="mb-6 space-y-2">
          {STEPS.map((step, index) => (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className="w-full flex items-center gap-3 text-left group"
            >
              {completedSteps.includes(step.id) ? (
                <CheckCircle2 className="w-4 h-4 text-[#5B9A6F] flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-[#333] group-hover:text-[#444] flex-shrink-0" />
              )}
              <span className={`text-xs ${
                completedSteps.includes(step.id) 
                  ? 'text-[#5B9A6F] line-through' 
                  : 'text-[#888] group-hover:text-white'
              }`}>
                {index + 1}. {step.label}
              </span>
            </button>
          ))}
        </div>

        <div className="border-t border-[#1a1a1a] pt-4 mb-4">
          <p className="text-[10px] text-[#444] mb-4">Step details:</p>
        </div>

        <Accordion type="single" collapsible className="space-y-2">
          
          <AccordionItem value="first-admin" className="border-b border-[#1a1a1a]">
            <AccordionTrigger className="text-sm text-[#888] hover:text-white">
              1. Set First Admin User
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#666] space-y-2 pt-2">
              <p>After creating your account, run this SQL to make yourself an admin:</p>
              <div className="relative">
                <pre className="bg-[#0a0a0a] p-3 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {firstAdminSQL}
                </pre>
                <button
                  onClick={() => copyToClipboard(firstAdminSQL, 'Admin SQL')}
                  className="absolute top-2 right-2 text-[#444] hover:text-white"
                >
                  {copiedItem === 'Admin SQL' ? (
                    <Check className="w-4 h-4 text-[#5B9A6F]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[#9A5B5B]">Replace 'your-email@example.com' with your email</p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="service-key" className="border-b border-[#1a1a1a]">
            <AccordionTrigger className="text-sm text-[#888] hover:text-white">
              2. Get SERVICE_ROLE_KEY
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#666] space-y-2 pt-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Open Supabase Dashboard</li>
                <li>Go to Settings → API</li>
                <li>Find "service_role" under Project API keys</li>
                <li>Click "Reveal" and copy the key</li>
              </ol>
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[#5B9A6F] hover:underline mt-2"
              >
                Open Supabase <ExternalLink className="w-3 h-3" />
              </a>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="totp" className="border-b border-[#1a1a1a]">
            <AccordionTrigger className="text-sm text-[#888] hover:text-white">
              3. Get TOTP Secret from Avanza
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#666] space-y-2 pt-2">
              <p className="text-[#9A5B5B]">⚠️ This will reset your current 2FA</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to Avanza</li>
                <li>Go to Profile → Settings → Two-factor authentication</li>
                <li>Click "Reactivate" or "Activate"</li>
                <li>Choose "Other app for two-factor"</li>
                <li>Click "Can't scan QR code?"</li>
                <li>Copy the secret string shown</li>
                <li>Add to your authenticator app</li>
                <li>Complete activation with the 6-digit code</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="account-id" className="border-b border-[#1a1a1a]">
            <AccordionTrigger className="text-sm text-[#888] hover:text-white">
              4. Find Your Account ID
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#666] space-y-2 pt-2">
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to Avanza → My Economy → Accounts</li>
                <li>Click on the account you want to trade with</li>
                <li>Look at the URL</li>
              </ol>
              <div className="bg-[#0a0a0a] p-2 font-mono text-[10px] mt-2">
                /konton/<span className="text-[#5B9A6F]">1234567</span>.html
              </div>
              <p>The number is your Account ID</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="instrument" className="border-b border-[#1a1a1a]">
            <AccordionTrigger className="text-sm text-[#888] hover:text-white">
              5. Instrument ID
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#666] space-y-2 pt-2">
              <p>Default: <code className="bg-[#0a0a0a] px-1">2313155</code> (BULL OLJA X15 AVA)</p>
              <p>To find other instruments:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Search for the instrument on Avanza</li>
                <li>Open its page</li>
                <li>Find the ID in the URL</li>
              </ol>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cron" className="border-b border-[#1a1a1a]">
            <AccordionTrigger className="text-sm text-[#888] hover:text-white">
              6. Set Up Cron Jobs
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#666] space-y-3 pt-2">
              <p className="font-medium text-white">A) Price fetching (run first):</p>
              <div className="relative">
                <pre className="bg-[#0a0a0a] p-3 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {fetchPriceSQL}
                </pre>
                <button
                  onClick={() => copyToClipboard(fetchPriceSQL, 'Price SQL')}
                  className="absolute top-2 right-2 text-[#444] hover:text-white"
                >
                  {copiedItem === 'Price SQL' ? (
                    <Check className="w-4 h-4 text-[#5B9A6F]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              
              <p className="font-medium text-white pt-2">B) Trade execution (for auto-trading):</p>
              <div className="relative">
                <pre className="bg-[#0a0a0a] p-3 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap">
                  {tradeQueueSQL}
                </pre>
                <button
                  onClick={() => copyToClipboard(tradeQueueSQL, 'Trade SQL')}
                  className="absolute top-2 right-2 text-[#444] hover:text-white"
                >
                  {copiedItem === 'Trade SQL' ? (
                    <Check className="w-4 h-4 text-[#5B9A6F]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-[#9A5B5B]">Replace YOUR_SERVICE_ROLE_KEY in the trade queue SQL</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="secrets" className="border-b border-[#1a1a1a]">
            <AccordionTrigger className="text-sm text-[#888] hover:text-white">
              7. Add Edge Function Secrets
            </AccordionTrigger>
            <AccordionContent className="text-xs text-[#666] space-y-2 pt-2">
              <p>In Supabase → Edge Functions → Secrets, add:</p>
              <ul className="space-y-1 mt-2">
                <li><code className="bg-[#0a0a0a] px-1">AVANZA_USERNAME</code> - Your login</li>
                <li><code className="bg-[#0a0a0a] px-1">AVANZA_PASSWORD</code> - Your password</li>
                <li><code className="bg-[#0a0a0a] px-1">AVANZA_TOTP_SECRET</code> - From step 2</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

        </Accordion>

        <div className="mt-6 pt-4 border-t border-[#1a1a1a]">
          <p className="text-[10px] text-[#444]">
            After completing all steps, use the "Test Connection" button to verify your setup.
          </p>
        </div>
      </div>
    </div>
  );
}
