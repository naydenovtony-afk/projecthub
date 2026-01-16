/**
 * Placeholder generator for demo screenshots (browser-only)
 * Usage:
 * 1) Open pages/demo.html (or any page) in the browser
 * 2) Open DevTools Console
 * 3) Run: generateAllPlaceholders();
 * 4) Six PNG files will download automatically
 */

/**
 * Generate a placeholder image with gradient background, centered text, and emoji icon.
 * @param {number} width
 * @param {number} height
 * @param {string} text
 * @param {string} fileName - name for the downloaded PNG
 * @param {string} emoji - emoji/icon to display
 * @param {string[]} gradient - array of two hex colors
 */
export function generatePlaceholder(width, height, text, fileName, emoji = '📊', gradient = ['#20c997', '#0d6efd']) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Gradient background
  const grd = ctx.createLinearGradient(0, 0, width, height);
  grd.addColorStop(0, gradient[0]);
  grd.addColorStop(1, gradient[1]);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, width, height);

  // Overlay to improve contrast
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, width, height);

  // Centered emoji
  ctx.font = `${Math.floor(width * 0.1)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText(emoji, width / 2, height / 2 - height * 0.08);

  // Title text
  ctx.font = `${Math.floor(width * 0.05)}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.fillText(text, width / 2, height / 2 + height * 0.05);

  // Subtitle
  ctx.font = `${Math.floor(width * 0.022)}px "Inter", "Segoe UI", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('ProjectHub Demo', width / 2, height - height * 0.08);

  // Border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 4;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  // Download
  const link = document.createElement('a');
  link.download = fileName;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Generate all placeholders and download them.
 */
export function generateAllPlaceholders() {
  const commonGradient = ['#20c997', '#0d6efd'];
  const items = [
    { text: 'Dashboard & Analytics', file: 'dashboard-preview.png', emoji: '📊' },
    { text: 'Project Management', file: 'projects-preview.png', emoji: '📁' },
    { text: 'Task Board', file: 'tasks-preview.png', emoji: '✅' },
    { text: 'File Management', file: 'files-preview.png', emoji: '📂' },
    { text: 'Activity Timeline', file: 'timeline-preview.png', emoji: '⏱️' },
    { text: 'AI Assistant', file: 'ai-assistant-preview.png', emoji: '🤖' }
  ];

  items.forEach(item => {
    generatePlaceholder(1200, 800, item.text, item.file, item.emoji, commonGradient);
  });
}

// Optional: attach to window for console use
if (typeof window !== 'undefined') {
  window.generatePlaceholder = generatePlaceholder;
  window.generateAllPlaceholders = generateAllPlaceholders;
}
