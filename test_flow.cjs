const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = '/Users/rfoerthe/brain/5bb04dc4-8195-4547-bbeb-97254983ea1d';
const MOCK_ARTIFACT_DIR = '/Users/rfoerthe/.gemini/antigravity/brain/5bb04dc4-8195-4547-bbeb-97254983ea1d';

// Ensure artifact directory exists
if (!fs.existsSync(MOCK_ARTIFACT_DIR)) {
  fs.mkdirSync(MOCK_ARTIFACT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function clickElementNatively(page, elementGetterFn) {
  const id = await page.evaluate((fnStr) => {
    const fn = new Function(`return (${fnStr})()`);
    const el = fn();
    if (!el) return null;
    if (!el.id) {
      el.id = 'temp-puppeteer-id-' + Math.random().toString(36).substr(2, 9);
    }
    return el.id;
  }, elementGetterFn.toString());
  
  if (id) {
    await page.click(`#${id}`);
    return true;
  }
  return false;
}

async function runTest() {
  console.log('Starting high-fidelity automated test flow...');
  
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  const page = await browser.newPage();
  
  try {
    // 1. Navigate to landing page
    console.log('Step 1: Navigating to http://localhost:5173/...');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });
    await sleep(2000);
    
    // Verify page loads and displays title
    const title = await page.title();
    console.log(`Landing Page Title: ${title}`);
    
    console.log('Taking screenshot 01_landing_page.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '01_landing_page.png') });
    
    // 2. Test theme switcher in navbar
    console.log('Step 2: Inspecting and testing theme toggle in navbar...');
    
    // Check initial HTML root classes
    let htmlClasses = await page.evaluate(() => Array.from(document.documentElement.classList));
    console.log('Initial HTML root classes:', htmlClasses);
    
    // Open theme menu in navbar NATIVELY
    console.log('Opening theme toggle dropdown...');
    await clickElementNatively(page, () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.querySelector('.lucide-sun, .lucide-moon, .lucide-monitor')) || null;
    });
    await sleep(1000);
    
    console.log('Taking screenshot 05_theme_menu_open.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '05_theme_menu_open.png') });
    
    // Select "Hell (Light)" from navbar theme switcher NATIVELY
    console.log('Selecting "Hell (Light)" theme in navbar dropdown...');
    await clickElementNatively(page, () => {
      const items = Array.from(document.querySelectorAll('.MuiMenuItem-root, [role="menuitem"]'));
      return items.find(i => i.textContent.includes('Hell') || i.textContent.includes('Light')) || null;
    });
    await sleep(1000);
    
    htmlClasses = await page.evaluate(() => Array.from(document.documentElement.classList));
    console.log('HTML root classes after switching to Light in navbar:', htmlClasses);
    
    // Switch theme back to Dark in navbar NATIVELY
    console.log('Toggling theme back to Dark in navbar...');
    await clickElementNatively(page, () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(btn => btn.querySelector('.lucide-sun, .lucide-moon, .lucide-monitor')) || null;
    });
    await sleep(1000);
    
    await clickElementNatively(page, () => {
      const items = Array.from(document.querySelectorAll('.MuiMenuItem-root, [role="menuitem"]'));
      return items.find(i => i.textContent.includes('Dunkel') || i.textContent.includes('Dark')) || null;
    });
    await sleep(1000);
    
    htmlClasses = await page.evaluate(() => Array.from(document.documentElement.classList));
    console.log('HTML root classes after switching back to Dark in navbar:', htmlClasses);
    
    // 3. Navigate to login form
    console.log('Step 3: Opening login page...');
    const loginBtnClicked = await clickElementNatively(page, () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.find(b => b.textContent.includes('Anmelden')) || null;
    });
    
    if (!loginBtnClicked) {
      console.log('Anmelden button not clicked. Navigating to /login directly...');
      await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
    }
    await sleep(1500);
    
    console.log('Taking screenshot 02_login_form.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '02_login_form.png') });
    
    // Fill credentials
    console.log('Typing credentials...');
    await page.type('input[autocomplete="username"]', 'admin');
    await page.type('input[autocomplete="current-password"]', 'AdminPassword123!');
    await sleep(500);
    
    console.log('Taking screenshot 03_credentials_filled.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '03_credentials_filled.png') });
    
    // Submit form
    console.log('Submitting login form...');
    await page.click('button[type="submit"]');
    await sleep(3000);
    
    console.log(`URL after login: ${page.url()}`);
    console.log('Taking screenshot 04_logged_in_dashboard.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '04_logged_in_dashboard.png') });
    
    // 4. Open User dropdown menu in navbar
    console.log('Step 4: Opening user dropdown menu...');
    const avatarClicked = await clickElementNatively(page, () => {
      return document.querySelector('button .MuiAvatar-root')?.closest('button') || null;
    });
    
    if (!avatarClicked) {
      console.log('Avatar button not found.');
    }
    await sleep(1000);
    
    console.log('Taking screenshot 06_user_menu_open.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '06_user_menu_open.png') });
    
    // Click "Profil & Einstellungen" NATIVELY
    console.log('Clicking "Profil & Einstellungen" in user menu...');
    const profileItemClicked = await clickElementNatively(page, () => {
      const items = Array.from(document.querySelectorAll('.MuiMenuItem-root, [role="menuitem"]'));
      return items.find(item => item.textContent.includes('Profil & Einstellungen') || item.textContent.includes('Settings')) || null;
    });
    
    if (!profileItemClicked) {
      console.log('Profile menu item not clicked. Navigating to /profile directly...');
      await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle2' });
    }
    await sleep(2500);
    
    console.log(`URL on Profile page: ${page.url()}`);
    console.log('Taking screenshot 07_profile_settings.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '07_profile_settings.png') });
    
    // 5. Change Design-Farbschema to "Hell (Light Mode)" and OS settings to "macOS"
    console.log('Step 5: Editing profile settings (Theme: Light, OS: mac)...');
    
    // Select Theme select field (first combobox in DOM)
    console.log('Opening "Design-Farbschema" select dropdown...');
    await clickElementNatively(page, () => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      return comboboxes.length > 0 ? comboboxes[0] : null;
    });
    await sleep(1000);
    
    // Click option "Hell (Light Mode)" NATIVELY
    console.log('Clicking option "Hell (Light Mode)"...');
    await clickElementNatively(page, () => {
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      return options.find(o => o.textContent.includes('Hell') || o.textContent.includes('Light')) || null;
    });
    await sleep(1000);
    
    // Select OS select field (second combobox in DOM)
    console.log('Opening "Betriebssystem" select dropdown...');
    await clickElementNatively(page, () => {
      const comboboxes = document.querySelectorAll('[role="combobox"]');
      return comboboxes.length > 1 ? comboboxes[1] : null;
    });
    await sleep(1000);
    
    // Click option "macOS" NATIVELY
    console.log('Clicking option "macOS"...');
    await clickElementNatively(page, () => {
      const options = Array.from(document.querySelectorAll('[role="option"]'));
      return options.find(o => o.textContent.includes('macOS') || o.textContent.includes('mac')) || null;
    });
    await sleep(1000);
    
    console.log('Taking screenshot 08_profile_settings_changed.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '08_profile_settings_changed.png') });
    
    // 6. Save changes
    console.log('Step 6: Saving changes...');
    await clickElementNatively(page, () => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Änderungen speichern') || b.textContent.includes('Save'));
      return btn || null;
    });
    await sleep(3000); // Wait for API response and updates
    
    console.log('Taking screenshot 09_profile_saved_success.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '09_profile_saved_success.png') });
    
    // Verify success alert message
    const alertText = await page.evaluate(() => {
      const alert = document.querySelector('.MuiAlert-message');
      return alert ? alert.textContent : null;
    });
    console.log(`Save Success Alert Text: ${alertText}`);
    
    // Verify immediate theme change
    htmlClasses = await page.evaluate(() => Array.from(document.documentElement.classList));
    console.log('HTML root classes immediately after save:', htmlClasses);
    
    // 7. Verify persistence by reloading page
    console.log('Step 7: Reloading page to verify persistence...');
    await page.reload({ waitUntil: 'networkidle2' });
    await sleep(3000); // Wait for profile fetch and mount
    
    // Wait until profile loader disappears
    const isLoaderVisible = await page.evaluate(() => {
      return document.body.textContent.includes('Lade Profil') || document.querySelector('.MuiCircularProgress-root') !== null;
    });
    
    if (isLoaderVisible) {
      console.log('Profile loading screen detected. Waiting another 3 seconds...');
      await sleep(3000);
    }
    
    console.log(`URL after reload: ${page.url()}`);
    console.log('Taking screenshot 10_profile_reloaded.png...');
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, '10_profile_reloaded.png') });
    
    // Fetch values of select inputs after reload
    const finalValues = await page.evaluate(() => {
      const comboboxes = Array.from(document.querySelectorAll('[role="combobox"]'));
      return {
        themeValue: comboboxes.length > 0 ? comboboxes[0].textContent : null,
        osValue: comboboxes.length > 1 ? comboboxes[1].textContent : null,
        isHtmlLight: document.documentElement.classList.contains('light-mode'),
        isHtmlDark: document.documentElement.classList.contains('dark-mode')
      };
    });
    
    console.log('--- PERSISTENCE VERIFICATION RESULTS ---');
    console.log(`Theme Mode Select Display Text: "${finalValues.themeValue}"`);
    console.log(`OS Select Display Text: "${finalValues.osValue}"`);
    console.log(`HTML root class light-mode present: ${finalValues.isHtmlLight}`);
    console.log(`HTML root class dark-mode present: ${finalValues.isHtmlDark}`);
    console.log('----------------------------------------');
    
    if (finalValues.isHtmlLight && finalValues.osValue && finalValues.osValue.includes('macOS')) {
      console.log('SUCCESS: All configurations successfully verified and persisted!');
    } else {
      console.log('WARNING: Persistence check failed to meet expected values.');
    }
    
  } catch (err) {
    console.error('An error occurred during flow execution:', err);
    await page.screenshot({ path: path.join(MOCK_ARTIFACT_DIR, 'error_state.png') });
  } finally {
    await browser.close();
    console.log('Test flow completed and browser closed.');
  }
}

runTest();
