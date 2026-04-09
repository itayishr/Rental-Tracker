javascript:(function(){
  /**
   * Yad2 Scraper Bookmarklet for Apartment Hunter
   * Drag this code to your bookmarks bar.
   * When on a Yad2 ad page, click it to extract info and open the Add Form!
   */
  try {
    const url = window.location.href;
    
    // Attempt extracting Price
    let rent = '';
    const priceEl = document.querySelector('.price, [data-test-id="item_price"]');
    if (priceEl) rent = priceEl.innerText.replace(/\D/g, '');

    // Attempt extracting Address
    let address = '';
    const addressEl = document.querySelector('.main_title, [data-test-id="item_title"]');
    if (addressEl) address = addressEl.innerText.trim();
    if (!address) {
      // fallback to breadcrumbs or something else on Yad2
      const subtitle = document.querySelector('.subtitle');
      if (subtitle) address = subtitle.innerText.trim();
    }

    // Attempt extracting Rooms & Floor
    let rooms = '';
    let floor = '';
    // Yad2 typically puts info in an ID'd table or specific classes
    const infoItems = document.querySelectorAll('.info_item, .item_feature');
    infoItems.forEach(item => {
      const text = item.innerText || '';
      if (text.includes('חדרים') || text.includes('rooms')) {
        rooms = text.replace(/[^\d.]/g, '');
      }
      if (text.includes('קומה') || text.includes('floor')) {
        floor = text.replace(/[^\d]/g, '');
      }
    });

    // Check features if possible (Mamad, AC, Elevator, Parking)
    let ac = false, parking = false, elevator = false;
    const allText = document.body.innerText.toLowerCase();
    if (allText.includes('מזגן')) ac = true;
    if (allText.includes('חניה')) parking = true;
    if (allText.includes('מעלית')) elevator = true;

    // Contact info (Often hidden behind a click, but if metadata exists...)
    let contactName = '';
    const contactEl = document.querySelector('.merchant_name, .seller_name');
    if (contactEl) contactName = contactEl.innerText.trim();

    const baseUrl = 'http://localhost:5173/add';
    const queryParams = new URLSearchParams({
      link: url,
      address,
      rent,
      rooms,
      floor,
      contact_name: contactName,
      ac: ac ? 'true' : 'false',
      parking: parking ? 'true' : 'false',
      elevator: elevator ? 'true' : 'false'
    });

    const targetUrl = `${baseUrl}?${queryParams.toString()}`;
    window.open(targetUrl, '_blank');
  } catch (err) {
    alert('שגיאה בחילוץ הנתונים מהמודעה: ' + err.message);
  }
})();
