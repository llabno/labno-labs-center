import { useState, useEffect, useCallback } from 'react';
import { DEMO_TIERS } from './demo-data';

/**
 * useDemo — hook to check if demo mode is active and return demo data
 *
 * Returns:
 *   { isDemo, tier, tierName, data, activateDemo, exitDemo }
 */
export function useDemo() {
  const [demoState, setDemoState] = useState(() => {
    const tier = localStorage.getItem('llc_demo_mode');
    if (tier && DEMO_TIERS[tier]) {
      return { isDemo: true, tier, data: DEMO_TIERS[tier].data };
    }
    return { isDemo: false, tier: null, data: null };
  });

  // Listen for storage changes (e.g. from another tab)
  useEffect(() => {
    const handler = () => {
      const tier = localStorage.getItem('llc_demo_mode');
      if (tier && DEMO_TIERS[tier]) {
        setDemoState({ isDemo: true, tier, data: DEMO_TIERS[tier].data });
      } else {
        setDemoState({ isDemo: false, tier: null, data: null });
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const activateDemo = useCallback((tier) => {
    if (!DEMO_TIERS[tier]) return;
    localStorage.setItem('llc_demo_mode', tier);
    localStorage.setItem('llc_demo_data', JSON.stringify(DEMO_TIERS[tier].data));
    setDemoState({ isDemo: true, tier, data: DEMO_TIERS[tier].data });
  }, []);

  const exitDemo = useCallback(() => {
    localStorage.removeItem('llc_demo_mode');
    localStorage.removeItem('llc_demo_data');
    setDemoState({ isDemo: false, tier: null, data: null });
  }, []);

  return {
    isDemo: demoState.isDemo,
    tier: demoState.tier,
    tierName: demoState.tier ? DEMO_TIERS[demoState.tier]?.name : null,
    data: demoState.data,
    activateDemo,
    exitDemo,
  };
}

export default useDemo;
