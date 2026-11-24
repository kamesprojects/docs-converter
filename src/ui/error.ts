export function showError(container: HTMLElement, message: string): void {
  clearError(container);
  const div = document.createElement('div');
  div.className = 'error-msg bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm';
  div.textContent = message;
  container.prepend(div);
}

export function clearError(container: HTMLElement): void {
  const existing = container.querySelector('.error-msg');
  if (existing) {
    existing.remove();
  }
}
