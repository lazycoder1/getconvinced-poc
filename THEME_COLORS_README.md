# Global Text Color System 🎨

## Overview
This project now uses a **global CSS custom properties system** for text colors, making it easy to update text readability across the entire website from one central location.

## How It Works

### 1. CSS Custom Properties (Variables)
All text colors are defined in `src/app/globals.css` using CSS custom properties:

```css
:root {
  --text-primary: #0f0f0f;      /* Main headings */
  --text-secondary: #171717;     /* Secondary text */
  --text-body: #262626;          /* Body text */
  --text-muted: #525252;         /* Muted text */
  --text-subtle: #737373;        /* Subtle text */
}
```

### 2. Automatic Overrides
The CSS automatically overrides Tailwind classes to use these custom properties:

```css
.text-gray-950 { color: var(--text-primary) !important; }
.text-gray-900 { color: var(--text-secondary) !important; }
.text-gray-700 { color: var(--text-body) !important; }
.text-gray-600 { color: var(--text-muted) !important; }
.text-gray-500 { color: var(--text-subtle) !important; }
```

## How to Adjust Text Colors

### Method 1: Update CSS Variables (Recommended)
Edit `src/app/globals.css` and change the color values:

```css
:root {
  --text-primary: #000000;      /* Even darker */
  --text-body: #1a1a1a;        /* Darker body text */
  --text-muted: #404040;        /* Less muted */
}
```

### Method 2: Use JavaScript Utility
Use the helper functions in `src/lib/theme-colors.js`:

```javascript
import { makeTextDarker, makeTextLighter, updateTextColors } from '@/lib/theme-colors';

// Make all text darker
makeTextDarker();

// Make all text lighter
makeTextLighter();

// Switch to specific theme
updateTextColors('dark');  // or 'light'
```

### Method 3: Quick CSS Override
Add temporary overrides to any page:

```css
<style>
  :root {
    --text-body: #000000 !important;  /* Pure black body text */
    --text-primary: #000000 !important; /* Pure black headings */
  }
</style>
```

## Color Hierarchy

The system maintains a clear visual hierarchy:

1. **Primary** (`--text-primary`): Main headings, important text
2. **Secondary** (`--text-secondary`): Card titles, important content
3. **Body** (`--text-body`): Regular paragraph and content text
4. **Muted** (`--text-muted`): Less important text, descriptions
5. **Subtle** (`--text-subtle`): Timestamps, metadata, icons

## Dark Mode Support

The system automatically adapts for dark mode:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --text-primary: #ffffff;    /* White headings in dark mode */
    --text-body: #e5e5e5;       /* Light gray body text */
    --text-muted: #a3a3a3;      /* Medium gray muted text */
  }
}
```

## Benefits

✅ **Single Source of Truth**: Change colors in one place
✅ **Consistent**: All text follows the same color scheme
✅ **Maintainable**: Easy to update and modify
✅ **Accessible**: Better contrast ratios for readability
✅ **Theme-Aware**: Automatically adapts to light/dark mode
✅ **Performance**: Uses CSS custom properties (no JavaScript overhead)

## Quick Fixes

If text is still not dark enough, try:

1. **Make primary text blacker**: `--text-primary: #000000`
2. **Darken body text**: `--text-body: #1a1a1a`
3. **Reduce muted text**: `--text-muted: #404040`
4. **Use the helper**: `makeTextDarker()`

The system is designed to be **flexible and easy to adjust** while maintaining consistency across the entire application! 🚀
