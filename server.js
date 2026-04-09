import express from 'express';
import cors from 'cors';
import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'public/uploads');
const DIST_DIR = path.join(__dirname, 'dist');
const DIST_INDEX_FILE = path.join(DIST_DIR, 'index.html');
const YAD2_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const APP_PASSWORD = process.env.APP_PASSWORD || '';
const APP_PASSWORD_HEADER = 'x-app-password';
const SCRAPE_BUDGET_MS = 25000;
const NAVIGATION_TIMEOUT_MS = 16000;
const PAGE_MARKERS_TIMEOUT_MS = 5000;
const IMAGE_FETCH_TIMEOUT_MS = 7000;
const SCREENSHOT_SELECTOR_TIMEOUT_MS = 1200;

fs.mkdirSync(UPLOADS_DIR, { recursive: true });

chromium.use(stealth());

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

const requireApiPassword = (req, res, next) => {
  if (!APP_PASSWORD) {
    return res.status(500).json({ error: 'Server password is not configured. Set APP_PASSWORD before running the server.' });
  }

  const suppliedPassword = req.get(APP_PASSWORD_HEADER);
  if (!suppliedPassword || suppliedPassword !== APP_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return next();
};

app.use('/api', requireApiPassword);

// Helper to read/write JSON DB
const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return [];
  const data = fs.readFileSync(DB_FILE, 'utf-8');
  return data ? JSON.parse(data) : [];
};

const writeDB = (data) => {
  // Deduplicate before writing to ensure no zombie duplicates exist
  const seen = new Set();
  const unique = data.filter(apt => {
    if (seen.has(apt.id)) return false;
    seen.add(apt.id);
    return true;
  });
  fs.writeFileSync(DB_FILE, JSON.stringify(unique, null, 2));
};

const getImageExtension = (url, contentType = '') => {
  const normalizedType = contentType.split(';')[0].trim().toLowerCase();
  const byContentType = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/avif': '.avif'
  }[normalizedType];

  if (byContentType) return byContentType;

  try {
    const ext = path.extname(new URL(url).pathname).toLowerCase();
    if (ALLOWED_IMAGE_EXTENSIONS.has(ext)) return ext;
  } catch {
    // Fallback to default below.
  }

  return '.jpg';
};

const escapeCssAttributeValue = (value) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const saveImageBuffer = ({ buffer, sourceUrl, contentType = '' }) => {
  if (!buffer || !buffer.length) return null;
  if (contentType && !contentType.toLowerCase().startsWith('image/')) return null;
  const ext = getImageExtension(sourceUrl, contentType);
  const fileName = `apt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
  const filePath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  return `/uploads/${fileName}`;
};

// CRUD Endpoints
app.get('/api/apartments', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.json(readDB());
});

app.post('/api/apartments', (req, res) => {
  const apartments = readDB();
  const existingIndex = apartments.findIndex(a => a.id === req.body.id);
  
  if (existingIndex !== -1) {
    // Update existing
    apartments[existingIndex] = { ...apartments[existingIndex], ...req.body, updatedAt: new Date().toISOString() };
    writeDB(apartments);
    res.json(apartments[existingIndex]);
  } else {
    // Create new - Use a more robust unique ID to prevent collisions
    const newApt = { 
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`, 
      createdAt: new Date().toISOString(), 
      priority: 0, 
      ...req.body 
    };
    // Deduplicate by link if it exists to prevent double imports
    if (newApt.link && apartments.some(a => a.link === newApt.link)) {
      res.status(409).json({ error: 'listing already exists' });
      return;
    }
    apartments.unshift(newApt);
    writeDB(apartments);
    res.status(201).json(newApt);
  }
});

app.delete('/api/apartments/:id', (req, res) => {
  let apartments = readDB();
  apartments = apartments.filter(a => a.id !== req.params.id);
  writeDB(apartments);
  res.json({ success: true });
});

app.get('/api/scrape', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.includes('yad2.co.il')) {
    return res.status(400).json({ error: 'Valid Yad2 URL is required.' });
  }

  let browser = null;
  const startedAt = Date.now();
  const remainingMs = (fallbackMs) =>
    Math.max(1000, Math.min(fallbackMs, SCRAPE_BUDGET_MS - (Date.now() - startedAt)));

  try {
    console.log(`Starting stealth parse for: ${targetUrl}`);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: YAD2_USER_AGENT,
      locale: 'he-IL'
    });
    const page = await context.newPage();
    
    // Attempt navigation
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: remainingMs(NAVIGATION_TIMEOUT_MS) });
    
    // Wait for either the payload or price element to show up, or timeout after a few seconds
    try {
      await page.waitForSelector('#__NEXT_DATA__, .price, [data-test-id="item_price"]', { timeout: remainingMs(PAGE_MARKERS_TIMEOUT_MS) });
    } catch(e) {
      console.log('Timeout waiting for Yad2 payload markers. It might be blocked or structured differently.');
    }

    const data = await page.evaluate((url) => {
      try {
        const nextTag = document.getElementById('__NEXT_DATA__');
        if (!nextTag) return { error: "No data payload found" };
        
        const jsonData = JSON.parse(nextTag.innerText);
        const queries = jsonData.props?.pageProps?.dehydratedState?.queries || [];
        const itemQuery = queries.find(q => q.queryKey && q.queryKey[0] === 'item');
        
        if (!itemQuery || !itemQuery.state || !itemQuery.state.data) {
          return { error: "Item data missing" };
        }

        const adData = itemQuery.state.data;

        const isLikelyImageUrl = (value) => {
          if (typeof value !== 'string') return false;
          if (!/^https?:\/\//i.test(value)) return false;
          return /(img\.yad2\.co\.il|\/Pic\/)/i.test(value) || /\.(jpe?g|png|webp|avif)(\?|$)/i.test(value);
        };

        // Prefer specific metadata fields for speed and stability.
        const imageCandidates = [
          adData?.metaData?.coverImage,
          ...(Array.isArray(adData?.metaData?.images) ? adData.metaData.images : [])
        ];

        let imageUrl = imageCandidates.find(isLikelyImageUrl) || null;

        // Lightweight fallback scan if Yad2 schema changes.
        if (!imageUrl) {
          const stack = [adData?.metaData, adData?.images, adData?.gallery];
          const visited = new Set();
          let scanned = 0;

          while (stack.length && scanned < 1500 && !imageUrl) {
            const current = stack.pop();
            if (!current) continue;

            if (typeof current === 'string') {
              if (isLikelyImageUrl(current)) {
                imageUrl = current;
              }
              scanned += 1;
              continue;
            }

            if (typeof current !== 'object' || visited.has(current)) {
              continue;
            }

            visited.add(current);
            scanned += 1;
            if (Array.isArray(current)) {
              for (let i = current.length - 1; i >= 0; i -= 1) {
                stack.push(current[i]);
              }
            } else {
              Object.values(current).forEach((value) => stack.push(value));
            }
          }
        }

        // Build address string
        const addrObj = adData.address || {};
        let addressStr = '';
        if (addrObj.street?.text) addressStr += addrObj.street.text + ' ';
        if (addrObj.house?.number) addressStr += addrObj.house.number + ', ';
        if (addrObj.city?.text) addressStr += addrObj.city.text;

        return {
          rent: adData.price ? adData.price.toString() : '',
          rooms: adData.additionalDetails?.roomsCount?.toString() || '',
          floor: adData.address?.house?.floor?.toString() || '',
          address: addressStr.trim(),
          lat: adData.address?.coords?.lat ?? null,
          lon: adData.address?.coords?.lon ?? null,
          ac: !!adData.inProperty?.includeAirconditioner,
          parking: !!adData.inProperty?.includeParking,
          elevator: !!adData.inProperty?.includeElevator,
          contact_name: (adData.contactDetails?.name) || '',
          contact_phone: (adData.contactDetails?.phone) || '',
          external_image_url: imageUrl,
          link: url
        };
      } catch (err) {
        return { error: "Parse exception: " + err.message };
      }
    }, targetUrl);

    if (data.error) {
       console.log('Error inside playwright evaluation:', data.error);
       return res.status(500).json({ error: data.error });
    }

    // First try direct image fetch - this is faster and more reliable than screenshotting DOM elements.
    if (data.external_image_url) {
      let savedPhotoUrl = null;
      const timeForImage = remainingMs(IMAGE_FETCH_TIMEOUT_MS);
      if (timeForImage > 1200) {
        try {
          const imageRes = await context.request.get(data.external_image_url, {
            headers: {
              referer: targetUrl,
              'user-agent': YAD2_USER_AGENT,
              accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
            },
            timeout: timeForImage
          });

          if (imageRes.ok()) {
            const headers = imageRes.headers();
            savedPhotoUrl = saveImageBuffer({
              buffer: await imageRes.body(),
              sourceUrl: data.external_image_url,
              contentType: headers['content-type'] || ''
            });

            if (savedPhotoUrl) {
              data.photo_url = savedPhotoUrl;
              console.log(`Saved image via direct request: ${data.photo_url}`);
            }
          }
        } catch (imgReqErr) {
          console.log('Direct image request failed, trying screenshot fallback:', imgReqErr.message);
        }
      }

      // Last-resort fallback: capture image element screenshot from rendered page.
      if (!savedPhotoUrl && remainingMs(SCREENSHOT_SELECTOR_TIMEOUT_MS) > 1000) {
        try {
          let hintedSelector = null;
          try {
            const fileNameHint = path.basename(new URL(data.external_image_url).pathname);
            if (fileNameHint) {
              hintedSelector = `img[src*="${escapeCssAttributeValue(fileNameHint)}"]`;
            }
          } catch {
            // ignore malformed URL hints and keep fallback selectors.
          }

          const fallbackSelectors = [
            hintedSelector,
            '.main_img',
            '.property-photos img',
            '[data-test-id="images_gallery"] img',
            '.gallery-item img'
          ].filter(Boolean);

          let imgHandle = null;
          for (const selector of fallbackSelectors) {
            try {
              await page.waitForSelector(selector, { state: 'visible', timeout: remainingMs(SCREENSHOT_SELECTOR_TIMEOUT_MS) });
              imgHandle = await page.$(selector);
              if (imgHandle) break;
            } catch {
              // keep trying selectors
            }
          }

          if (imgHandle) {
            const fileName = `apt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
            const filePath = path.join(UPLOADS_DIR, fileName);
            await imgHandle.screenshot({ path: filePath, type: 'jpeg', quality: 85 });
            data.photo_url = `/uploads/${fileName}`;
            console.log(`Captured image via screenshot fallback: ${data.photo_url}`);
          }
        } catch (imgErr) {
          console.error('Failed to capture image via screenshot fallback:', imgErr);
        }
      }

      if (!data.photo_url) {
        data.photo_url = data.external_image_url;
        console.log('Falling back to external image URL for preview.');
      }
    }

    console.log(`Extraction Success:`, data);
    res.json(data);
  } catch (error) {
    console.error('Playwright Error:', error);
    res.status(500).json({ error: 'Failed to scrape. Bot protection or timeout occurred.' });
  } finally {
    if (browser) await browser.close();
  }
});

if (fs.existsSync(DIST_INDEX_FILE)) {
  app.use(express.static(DIST_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return next();
    }

    return res.sendFile(DIST_INDEX_FILE);
  });
}

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`Stealth scraper backend listening on port ${PORT}`);
});
