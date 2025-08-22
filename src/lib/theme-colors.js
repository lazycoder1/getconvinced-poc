// Theme color management utility
// Update these values to change text colors across the entire website

export const TEXT_COLORS = {
    light: {
        primary: "#0f0f0f", // Main headings - darkest
        secondary: "#171717", // Secondary text - very dark
        body: "#262626", // Body text - dark
        muted: "#525252", // Muted text - medium gray
        subtle: "#737373", // Subtle text - lighter gray
    },
    dark: {
        primary: "#ffffff", // Main headings - white
        secondary: "#f5f5f5", // Secondary text - light gray
        body: "#e5e5e5", // Body text - lighter gray
        muted: "#a3a3a3", // Muted text - medium gray
        subtle: "#737373", // Subtle text - darker gray
    },
};

// Helper function to update colors globally
export function updateTextColors(theme = "light") {
    const colors = TEXT_COLORS[theme];

    // Update CSS custom properties
    document.documentElement.style.setProperty("--text-primary", colors.primary);
    document.documentElement.style.setProperty("--text-secondary", colors.secondary);
    document.documentElement.style.setProperty("--text-body", colors.body);
    document.documentElement.style.setProperty("--text-muted", colors.muted);
    document.documentElement.style.setProperty("--text-subtle", colors.subtle);
}

// Helper function to make text even darker
export function makeTextDarker() {
    const darkerColors = {
        primary: "#000000", // Pure black
        secondary: "#0f0f0f", // Very dark
        body: "#171717", // Darker body text
        muted: "#404040", // Darker muted
        subtle: "#525252", // Darker subtle
    };

    Object.entries(darkerColors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--text-${key}`, value);
    });
}

// Helper function to make text lighter
export function makeTextLighter() {
    const lighterColors = {
        primary: "#262626", // Darker than current
        secondary: "#404040", // Medium gray
        body: "#525252", // Medium gray
        muted: "#737373", // Light gray
        subtle: "#a3a3a3", // Very light gray
    };

    Object.entries(lighterColors).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--text-${key}`, value);
    });
}
