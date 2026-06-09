const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting ChessKidoo Portal Automated Tests...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('Loading http://127.0.0.1:8080 ...');
    await page.goto('http://127.0.0.1:8080', { waitUntil: 'domcontentloaded' });
    
    // Bypass login by setting a fake admin profile in localStorage and calling showPage
    console.log('Bypassing Login to enter Admin Portal...');
    await page.evaluate(() => {
      const adminProfile = { id: 'admin-id', full_name: 'Test Admin', email: 'admin@gmail.com', role: 'admin' };
      window.localStorage.setItem('ck_user', JSON.stringify(adminProfile));
      window.CK.currentUser = adminProfile;
      if (window.CK.admin && window.CK.admin.init) window.CK.admin.init();
      window.CK.showPage('admin-page');
    });
    
    // Wait for the admin page to be visible
    await page.waitForSelector('#admin-page.active', { timeout: 3000 });
    console.log('✅ Admin Portal rendered successfully.');
    
    // Test assigning a student via JS method
    console.log('Testing Student Assignment Logic...');
    const result = await page.evaluate(async () => {
      try {
        await window.CK.admin.assignStudentToCoach('s1', 'saran');
        return true;
      } catch (e) {
        return e.toString();
      }
    });
    
    if(result === true) {
      console.log('✅ assignStudentToCoach executed without throwing errors.');
    } else {
      console.error('❌ assignStudentToCoach failed:', result);
      throw new Error(result);
    }
    
    console.log('🎉 Automated tests completed successfully!');
  } catch (error) {
    console.error('❌ Test Failed:', error);
  } finally {
    await browser.close();
    console.log('🛑 Browser closed.');
  }
})();
