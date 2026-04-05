import React, { useState } from 'react';
import { Home, Sun, Layers, Command, Rocket, ChevronRight, ChevronLeft, X } from 'lucide-react';

const ONBOARDING_KEY = 'llc_onboarding_complete';

const STEPS = [
  {
    icon: Home,
    color: '#b06050',
    title: 'Welcome',
    heading: 'Welcome to Labno Labs Center!',
    body: '45 pages across 6 zones: Command Center, Build Lab, Intelligence, Operations, Clinical, and Sales & Clients. Everything from task management to clinical documentation to AI agents lives here.',
    detail: 'Your sidebar shows zones based on your role. Admins see everything. Clinical users see the essentials. Pin your favorites at the top for quick access.',
  },
  {
    icon: Sun,
    color: '#e8a838',
    title: 'Daily Flow',
    heading: 'Today → Work Planner → SOAP',
    body: 'Start with Today View for your sessions and priorities. Use Work Planner to pick tasks by time available. Finish patient sessions with SOAP Notes — CPT codes are auto-suggested.',
    detail: 'Today View (/today) · Work Planner (/planner) has Simple mode (pick by time) and Advanced mode (launch controls, heat maps). SOAP Notes auto-generate superbills.',
  },
  {
    icon: Layers,
    color: '#1565c0',
    title: 'AI Agents',
    heading: 'Agents Work While You Sleep',
    body: 'Send any task to an AI agent from Work Planner. Agents process tasks autonomously and results appear in the Autonomous tab. If an agent needs your input, it shows up in Agent Queue.',
    detail: 'Work Planner → click "Send to Agent" on any task. Check Autonomous (/autonomous) for results. Agent Queue (/agent-queue) shows questions agents have for you.',
  },
  {
    icon: Command,
    color: '#9c27b0',
    title: 'Quick Capture',
    heading: 'Ideas → Wishlist → Pipeline',
    body: 'Press Cmd+K anywhere to capture an idea. It lands in Wishlist, flows through Content Pipeline, and can be dispatched to agents. The Oracle stores your knowledge base.',
    detail: 'Cmd+K: Quick idea capture. Wishlist (/wishlist): idea inbox. Content Pipeline (/content): idea → draft → review → published. Oracle (/oracle): second brain.',
  },
  {
    icon: Rocket,
    color: '#2d8a4e',
    title: "You're Ready!",
    heading: 'Explore & Customize',
    body: 'Every page has an eye icon for contextual help. Pick a theme in Settings (including Dark Mode). Favorites sync across all your devices. The notification bell shows what needs attention.',
    detail: 'Settings: themes, billing rates, tour restart. Client Portal: /portal for clients to view proposals. Demo Mode: explore with sample data. Restart this tour anytime from Settings.',
  },
];

export function clearOnboardingFlag() {
  localStorage.removeItem(ONBOARDING_KEY);
}

export function isOnboardingComplete() {
  return localStorage.getItem(ONBOARDING_KEY) === 'true';
}

export default function OnboardingWizard({ onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const StepIcon = current.icon;
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / STEPS.length) * 100;

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
  };

  const skip = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onClose();
  };

  return (
    <div
      onClick={skip}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '500px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.3) inset',
          overflow: 'hidden',
          animation: 'slideUp 0.4s ease',
        }}
      >
        {/* Progress bar */}
        <div style={{ height: '4px', background: 'rgba(0,0,0,0.06)' }}>
          <div
            style={{
              height: '100%',
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${current.color}, ${current.color}cc)`,
              borderRadius: '0 4px 4px 0',
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Skip link */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 16px 0' }}>
          <button
            onClick={skip}
            style={{
              background: 'none',
              border: 'none',
              color: '#8a8682',
              fontSize: '0.78rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Skip Tour <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '8px 32px 24px', textAlign: 'center' }}>
          {/* Icon */}
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: `${current.color}18`,
              border: `2px solid ${current.color}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <StepIcon size={32} color={current.color} />
          </div>

          {/* Step label */}
          <div
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: current.color,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              marginBottom: '6px',
            }}
          >
            Step {step + 1} of {STEPS.length} — {current.title}
          </div>

          {/* Heading */}
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#2a2826',
              margin: '0 0 10px',
              lineHeight: 1.3,
            }}
          >
            {current.heading}
          </h2>

          {/* Body */}
          <p
            style={{
              fontSize: '0.92rem',
              color: '#4a4846',
              lineHeight: 1.6,
              margin: '0 0 8px',
            }}
          >
            {current.body}
          </p>

          {/* Detail */}
          <p
            style={{
              fontSize: '0.78rem',
              color: '#8a8682',
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {current.detail}
          </p>
        </div>

        {/* Footer: dots + buttons */}
        <div
          style={{
            padding: '16px 32px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Back button */}
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={isFirst}
            style={{
              background: 'none',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '10px',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              color: isFirst ? '#ccc' : '#4a4846',
              cursor: isFirst ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s',
            }}
          >
            <ChevronLeft size={16} /> Back
          </button>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {STEPS.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === step ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: i === step ? current.color : 'rgba(0,0,0,0.12)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                }}
                onClick={() => setStep(i)}
              />
            ))}
          </div>

          {/* Next / Finish button */}
          {isLast ? (
            <button
              onClick={finish}
              style={{
                background: current.color,
                border: 'none',
                borderRadius: '10px',
                padding: '8px 20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: `0 4px 12px ${current.color}40`,
                transition: 'all 0.2s',
              }}
            >
              <Rocket size={16} /> Start Working
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{
                background: current.color,
                border: 'none',
                borderRadius: '10px',
                padding: '8px 20px',
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: `0 4px 12px ${current.color}40`,
                transition: 'all 0.2s',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
