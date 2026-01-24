import React from 'react';
import { ThemeConfigProvider, useThemeConfig } from '../lib/theme-config';
import { ThemeProvider } from '../components/theme-provider';

export default {
  title: 'Design System/Overview',
};

// Wrapper to enable theme switching in storybook if we wanted, 
// but mostly just to provide context.
const ThemeWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
     <ThemeConfigProvider>
        {children}
     </ThemeConfigProvider>
  </ThemeProvider>
);

export const Colors = () => (
  <ThemeWrapper>
    <ColorDemo />
  </ThemeWrapper>
);

const ColorDemo = () => {
    const { color, setColor } = useThemeConfig();
    
    return (
        <div className="p-8 space-y-8 bg-background text-foreground min-h-screen transition-colors duration-300">
            <div className="flex gap-4 mb-8">
                <button onClick={() => setColor('cool')} className={`px-4 py-2 rounded-lg ${color === 'cool' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Cool</button>
                <button onClick={() => setColor('neutral')} className={`px-4 py-2 rounded-lg ${color === 'neutral' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Neutral</button>
                <button onClick={() => setColor('warm')} className={`px-4 py-2 rounded-lg ${color === 'warm' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>Warm</button>
            </div>

            <div className="space-y-4">
            <h2 className="text-2xl font-bold">Colors (Theme: {color})</h2>
            <p className="text-muted-foreground">
                Flat design with no borders. Regions are separated by background color.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ColorCard name="Background" variable="bg-background" />
                <ColorCard name="Card (Regions)" variable="bg-card" />
                <ColorCard name="Muted (Subtle)" variable="bg-muted" />
                <ColorCard name="Input" variable="bg-input" />
                <ColorCard name="Primary" variable="bg-primary" text="text-primary-foreground" />
                <ColorCard name="Secondary" variable="bg-secondary" text="text-secondary-foreground" />
                <ColorCard name="Accent" variable="bg-accent" text="text-accent-foreground" />
                <ColorCard name="Destructive" variable="bg-destructive" text="text-destructive-foreground" />
            </div>
            </div>
        </div>
    );
};

const ColorCard = ({ name, variable, text = "text-foreground" }: { name: string, variable: string, text?: string }) => (
  <div className={`p-4 rounded-xl ${variable} ${text} flex flex-col justify-between h-24`}>
    <span className="font-semibold">{name}</span>
    <code className="text-xs opacity-70">{variable}</code>
  </div>
);

export const Typography = () => (
  <div className="p-8 space-y-8 bg-background text-foreground min-h-screen">
    <div className="space-y-4">
      <h2 className="text-2xl font-bold mb-8">Typography</h2>
      
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Heading 1</h1>
        <p className="text-muted-foreground text-sm">text-4xl font-bold</p>
      </div>

      <div className="space-y-2">
        <h2 className="text-3xl font-bold">Heading 2</h2>
        <p className="text-muted-foreground text-sm">text-3xl font-bold</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold">Heading 3</h3>
        <p className="text-muted-foreground text-sm">text-2xl font-bold</p>
      </div>

      <div className="space-y-2">
        <p className="text-base leading-7">
          Body text. Lorem ipsum dolor sit amet, consectetur adipiscing elit. 
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
        </p>
        <p className="text-muted-foreground text-sm">text-base</p>
      </div>
    </div>
  </div>
);

export const Elements = () => (
  <div className="p-8 space-y-8 bg-background text-foreground min-h-screen">
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Buttons</h2>
      <div className="flex gap-4 flex-wrap items-center">
        <button className="button button--primary">Primary</button>
        <button className="button">Secondary</button>
        <button className="button button--ghost">Ghost</button>
        <button className="button button--compact">Compact</button>
        <button className="button" disabled>Disabled</button>
      </div>
    </div>
    
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Panels & Cards</h2>
      <div className="grid md:grid-cols-2 gap-8">
        <div className="panel">
          <div className="panel-title">Standard Panel</div>
          <p>
            This is a standard panel. It uses <code className="text-xs bg-muted p-1 rounded">bg-card</code> and 
            has no border. It relies on the contrast with <code className="text-xs bg-muted p-1 rounded">bg-background</code>.
          </p>
        </div>

        <div className="usage-panel">
          <div className="usage-meta">Usage Panel</div>
          <div className="usage-grid">
            <div className="usage-card">
              <div className="usage-label">Metric</div>
              <div className="usage-value">1,234</div>
            </div>
            <div className="usage-card">
              <div className="usage-label">Another</div>
              <div className="usage-value">85%</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div className="space-y-4">
      <h2 className="text-xl font-bold">Form Elements</h2>
      <div className="panel max-w-md space-y-4">
        <div className="workspace-field">
          <label className="workspace-label">Input Label</label>
          <input className="workspace-select" placeholder="Type something..." />
        </div>
        
        <div className="workspace-field">
          <label className="workspace-label">Select Label</label>
          <select className="workspace-select">
            <option>Option 1</option>
            <option>Option 2</option>
          </select>
        </div>
      </div>
    </div>
  </div>
);
