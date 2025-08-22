import playwrightTools from './playwright-tools';
import screenshotTools from './screenshot-tools';

const isScreenshotMode = process.env.NEXT_PUBLIC_SCREENSHOT_MODE === 'true';

const tools = isScreenshotMode ? screenshotTools : playwrightTools;

export default tools;


