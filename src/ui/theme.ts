export function initTheme(): void {
  const root = document.documentElement;
  const isDark = localStorage.theme
    ? localStorage.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;

  root.classList.toggle('dark', isDark);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const activeDark = root.classList.toggle('dark');
      localStorage.theme = activeDark ? 'dark' : 'light';
    });
  }
}
