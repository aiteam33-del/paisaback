import { useState, useEffect } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useAuth } from '@/hooks/useAuth';

interface OnboardingTourProps {
  tourType: 'employee' | 'admin';
}

const employeeSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#10b981' }}>
          Welcome to PAISABACK!
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Let's take a quick tour to help you get started with expense management.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="receipt-upload"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          📸 Upload Your Receipt
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Drop your receipt here and our <strong style={{ color: '#10b981' }}>AI will automatically extract</strong> vendor name, amount, date, and category for you!
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="expense-form"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          ✨ Auto-Filled Details
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Our AI fills in these fields automatically from your receipt. Just review and make any adjustments if needed.
        </p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-tour="submit-button"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          🚀 Submit for Approval
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Once everything looks good, hit this button to send your expense for manager approval.
        </p>
      </div>
    ),
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-history"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          📋 Track Your Expenses
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          View all your submitted expenses and track their approval status here.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-analytics"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          📊 Spending Insights
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Get visual analytics of your spending patterns and category breakdowns.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="recent-expenses"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          🎉 You're All Set!
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Your recent submissions appear here for quick reference. Start by uploading a receipt!
        </p>
      </div>
    ),
    placement: 'left',
    disableBeacon: true,
  },
];

const adminSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '12px', color: '#10b981' }}>
          Welcome, Admin!
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Let's explore your dashboard and powerful management tools.
        </p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-tour="admin-stats"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          📈 Overview Stats
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Quick snapshot of your team's expense activity - total volume, pending approvals, and team size.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="pending-expenses"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          ⏳ Pending Approvals
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Review, approve, or reject expense requests from your team. Click on any expense for details.
        </p>
      </div>
    ),
    placement: 'top',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-team"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          👥 Team Management
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Manage team members and view individual employee expense history.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="nav-analytics"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          📊 Analytics Dashboard
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Dive into detailed spending trends, category breakdowns, and team insights.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="anomaly-link"]',
    content: (
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>
          🛡️ AI Fraud Detection
        </h3>
        <p style={{ fontSize: '15px', lineHeight: 1.7, color: '#64748b' }}>
          Our AI automatically flags suspicious expenses - duplicates, unusual amounts, and <strong style={{ color: '#ef4444' }}>AI-generated receipts</strong>.
        </p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
];

export const OnboardingTour = ({ tourType }: OnboardingTourProps) => {
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const storageKey = `paisaback_tour_completed_${tourType}`;
  const steps = tourType === 'employee' ? employeeSteps : adminSteps;

  useEffect(() => {
    if (!user) return;

    // Check if tour has been completed
    const tourCompleted = localStorage.getItem(storageKey);
    if (!tourCompleted) {
      // Small delay to ensure DOM elements are mounted
      const timer = setTimeout(() => {
        setRun(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user, storageKey]);

  const handleCallback = (data: CallBackProps) => {
    const { status, index, type } = data;

    if (type === 'step:after') {
      setStepIndex(index + 1);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      localStorage.setItem(storageKey, 'true');
    }
  };

  const resetTour = () => {
    localStorage.removeItem(storageKey);
    setStepIndex(0);
    setRun(true);
  };

  return (
    <>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        showProgress
        showSkipButton
        hideCloseButton={false}
        scrollToFirstStep
        spotlightClicks
        disableOverlayClose
        callback={handleCallback}
        styles={{
          options: {
            primaryColor: '#10b981',
            backgroundColor: '#ffffff',
            textColor: '#1e293b',
            arrowColor: '#ffffff',
            overlayColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 10000,
            width: 360,
          },
          tooltip: {
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          },
          tooltipContainer: {
            textAlign: 'left',
          },
          tooltipContent: {
            padding: 0,
          },
          buttonNext: {
            backgroundColor: '#10b981',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 500,
          },
          buttonBack: {
            color: '#64748b',
            marginRight: '10px',
            fontSize: '14px',
          },
          buttonSkip: {
            color: '#94a3b8',
            fontSize: '13px',
          },
          buttonClose: {
            color: '#94a3b8',
          },
          spotlight: {
            borderRadius: '12px',
          },
          beacon: {
            display: 'none',
          },
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Get Started!',
          next: 'Next',
          skip: 'Skip tour',
        }}
        floaterProps={{
          styles: {
            floater: {
              filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.15))',
            },
          },
        }}
      />
      {/* Hidden button to restart tour - can be used in settings */}
      <button
        onClick={resetTour}
        className="hidden"
        data-tour-reset={tourType}
        aria-label="Reset onboarding tour"
      />
    </>
  );
};

export default OnboardingTour;
