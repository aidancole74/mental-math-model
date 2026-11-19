import { useEffect } from 'react';
import { useRoute } from './router';
import { useData } from './storage/store';
import { Home } from './screens/Home';
import { Lesson } from './screens/Lesson';
import { Session } from './screens/Session';
import { Settings } from './screens/Settings';
import { SkillDetail } from './screens/SkillDetail';
import { Skills } from './screens/Skills';
import { Summary } from './screens/Summary';
import { Progress } from './screens/Progress';
import { Mistakes, MistakesRetry } from './screens/Mistakes';
import { Placement } from './screens/Placement';
import { TabBar, tabFor } from './ui/visuals';

const THEME_COLORS = { light: '#f6f6f3', dark: '#0c1016' };

function useTheme(): void {
  const { theme } = useData().settings;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') delete root.dataset.theme;
    else root.dataset.theme = theme;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (): void => {
      const dark = theme === 'dark' || (theme === 'system' && media.matches);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
    };
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}

export function App() {
  useTheme();
  const route = useRoute();
  const mistakes = useData().mistakes.length;
  const tab = tabFor(route);

  // Tab screens (home, learn, progress, settings) get the menu bar; focused
  // flows — lessons, sessions, summaries, the placement quiz — keep the whole screen.
  return (
    <div className={tab ? 'with-tabs' : undefined}>
      <Screen route={route} />
      {tab && <TabBar active={tab} badges={{ progress: mistakes }} />}
    </div>
  );
}

function Screen({ route }: { route: ReturnType<typeof useRoute> }) {
  switch (route.name) {
    case 'home':
      return <Home />;
    case 'learn':
      return <Lesson key={route.id} id={route.id} />;
    case 'practice':
      return <Session key={route.focus ?? ''} focus={route.focus} />;
    case 'summary':
      return <Summary />;
    case 'skills':
      return <Skills />;
    case 'skill':
      return <SkillDetail id={route.id} />;
    case 'settings':
      return <Settings />;
    case 'progress':
      return <Progress />;
    case 'mistakes':
      return <Mistakes />;
    case 'mistakes-retry':
      return <MistakesRetry />;
    case 'placement':
      return <Placement />;
  }
}
