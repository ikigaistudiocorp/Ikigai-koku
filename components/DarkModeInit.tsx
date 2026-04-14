// Inlined <script> that sets the dark class before first paint — prevents
// the flash-of-wrong-theme on reload. Reads koku-theme from localStorage,
// falls back to system preference.
export function DarkModeInit() {
  const code = `
    try {
      const stored = localStorage.getItem('koku-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const dark = stored ? stored === 'dark' : prefersDark;
      if (dark) document.documentElement.classList.add('dark');
    } catch {}
  `;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
