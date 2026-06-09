/* assets/js/gmeet-api.js --------------------------------------------------
   ChessKidoo Google Meet API Integration via Service Account.

   ⚠️ SECURITY: this file embeds a service-account PRIVATE KEY in client code,
   which is exposed to anyone who views the site. The key below is COMPROMISED
   and must be ROTATED/REVOKED in Google Cloud Console.

   The secure replacement is the `create-meet` Supabase edge function, which
   keeps the key server-side (env secret). The app now prefers it via
   CK.gmeetScheduler.createMeet(). Once `create-meet` is deployed, delete the
   SA_CREDS block below and have createMeetSpace() call the edge function only.
------------------------------------------------------------------------ */

window.CK = window.CK || {};

CK.gmeet = (() => {
  // Service Account Credentials from User Request
  const SA_CREDS = {
    "type": "service_account",
    "project_id": "nimble-ratio-481110-t1",
    "private_key_id": "65b451d7c6728eebf051ccd7c883ad3574a96943",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDMThy6lyVyIWd8\nATet//SRArA6RmKIOsMvtR4tyNLM7JoG1vbXpCwhWO9vV/5effJyWwVYLejduY5K\n7T1EECvrr7pWlejlB7ysw8j2FACidC9paqr83ADQC6Wq/hO+g7/c1m0NH9kGWROq\n1P4Jro1+to4xI00d0rB7VCNnB7rnU3QxG1yqcGUggKQ0Kxsa6aEOaFhebANa4eJo\nGcKR98jAEESU62/RHW3VaZERYmgIQN5+QDdWvUp6/4hARb1pZj+gxC3OfiLfFK14\nkCbKwhNNerCNgWteywC47WRV71yosE82jOpp3GSsMdRyL/DBvKEVK2PC8NpaUrIR\n6X3JhtOHAgMBAAECggEARlrl4MmY/w8KzHS84GIirecvmbnQR5p4yc6EuH6OPTyD\nJDTVp1flTIyMU5sJQS/9FC1ND1sr9GLoYdwFu5EYFt8ae6O/IlPCQPphE4C64TbC\ndvphLJd0fjBsmhBJ61MCeMGspxbfDSUStUMIwnvGRSsHl1tRPKJn3OiSEnJihjMk\nxCxwMND+BdhL6y1Cq2bYvgf3BJG0q75JISVjWbwPVT3Aena7DPLUqNKNEUcmAxMS\nFkvnI413AOOKIjALzH8NfKwNucRhb5wk7rTTxM2shJakJHUxJaBcVScCdbNZbFl4\npzCb+TaB72UF7ArtBXl4OZoZ8R66qhavxoNHC0SiSQKBgQDvcHdaC4v8eZ3uDW7s\nBlbykSyl5nnX+0E9zpVXo6XtoMbJkcNYXtPGV7K9W3+DlZQkM4HPFsF8EiMSJaGj\n8H40aC3ZiuWJs/BwkZa7c5aoH7xOg2x89EOAk7MuJINH5cPLFeC/EIlqXgXdWRwZ\n6ZHQX64p24fvlFvG2fCTliz5OQKBgQDab46M5FVfUAVla/dv5NFXDRpWCxxV0JtR\nmhh2zlDYe0NEgW7SfSONE5tpYAytdveaRYDZIfrEius1EheC8Ph94bV3r3O951p5\norr7DtQmxTDydd9w6S6ky5hJHetuJ7/f8CG+8Yz5XW8+fGUeV41Ob8f+o37ytzP2\nyssCEmnyvwKBgQDgANen5iWQjjax/t9G8KdnR2n9yyEybl0a9anB09fn+AIBkdyv\nUAfQBzuw62jgMY/mTkmi9CcPa+hjkdEnDlcDsHM0kj0sFqtapNnfhMPthcMlsM5O\nGDcOkx+Oi5pGKS6DUHRyS4ZDfLL/4d3oYBuKVfkaL8d8288AuePYLybkAQKBgQDX\n17odgJbXmuPqJziWqZ0uDrWCZnI2Xe7MQJ+B7ja2435B2EAg4CTcB47fHlkIo3Dh\nUWKTrF72DWuDwn/XFLQG95xwSr/s3Apr/SAUar+6G8pVG6KSGOjNUJ0HSvhTnhWc\ne9Vsr5Uk523Aaf0lcVAhPJV8CiSsQ9mmORdG0dk9UwKBgQC0gLysu3DeOTqGAz0b\n7UmYHVBM3ipwqMn6J38dBcQsYT3ZZ2al8UZiZQ6Zssnx0qCSOse/vAcW37VqaS/y\nO2obkvbzkNsV/gSH/ngwrqPD0+e5EBT6QKa49N5nx8HY8yzj5E8KwoUFHmXODyCa\n7Qnlpp2NW5djwas4IpAfHXcQiA==\n-----END PRIVATE KEY-----\n",
    "client_email": "chesskidoo-academy@nimble-ratio-481110-t1.iam.gserviceaccount.com"
  };

  // Keep token cached while valid
  let accessToken = null;
  let tokenExpiry = 0;

  // Load JWT dependency lazily
  let _jsrsasignLoaded = false;
  async function loadJsrsasign() {
    if (_jsrsasignLoaded || window.KJUR) return true;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsrsasign/10.9.0/jsrsasign-all-min.js';
      script.onload = () => { _jsrsasignLoaded = true; resolve(true); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function getAccessToken() {
    if (accessToken && Date.now() < tokenExpiry) {
      return accessToken;
    }

    await loadJsrsasign();

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: SA_CREDS.client_email,
      scope: 'https://www.googleapis.com/auth/meetings.space.created https://www.googleapis.com/auth/meetings.space.readonly',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const sHeader = JSON.stringify(header);
    const sClaim = JSON.stringify(claim);
    const sJWT = KJUR.jws.JWS.sign(null, sHeader, sClaim, SA_CREDS.private_key);

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', sJWT);

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('[GMeet API] Auth error:', err);
      throw new Error('Failed to get Google OAuth token');
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 min buffer
    return accessToken;
  }

  async function createMeetSpace() {
    try {
      const token = await getAccessToken();
      const response = await fetch('https://meet.googleapis.com/v2/spaces', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({}) // Empty body for default meeting space
      });

      if (!response.ok) {
         const errorText = await response.text();
         console.error('[GMeet API] Space creation error:', errorText);
         throw new Error('Google Meet API failed.');
      }

      const data = await response.json();
      console.log('[GMeet API] Generated Meeting Space:', data);
      return data.meetingUri; // https://meet.google.com/xyz-abcd-qwe
    } catch (e) {
      console.error('[GMeet API] createMeetSpace failed', e);
      // Fallback to a generated string if the API fails or is not enabled in cloud console
      return _fallbackLink();
    }
  }
  
  function _fallbackLink() {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const r = (len) => Array.from({length: len}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `https://meet.google.com/${r(3)}-${r(4)}-${r(3)}`;
  }

  async function _getConferenceRecord(meetingUri) {
    if (!meetingUri) return null;
    const codeMatch = meetingUri.match(/meet\.google\.com\/([^?]+)/);
    if (!codeMatch) return null;
    const spaceId = codeMatch[1];
    
    const token = await getAccessToken();
    const response = await fetch(`https://meet.googleapis.com/v2/conferenceRecords?filter=space=spaces/${spaceId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data.conferenceRecords && data.conferenceRecords.length > 0) {
      // Return the most recent conference record for this space
      return data.conferenceRecords[0].name;
    }
    return null;
  }

  async function getMeetParticipants(meetingUri) {
    try {
      const recordName = await _getConferenceRecord(meetingUri);
      if (!recordName) return [];

      const token = await getAccessToken();
      const response = await fetch(`https://meet.googleapis.com/v2/${recordName}/participants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch participants');
      
      const data = await response.json();
      return data.participants || [];
    } catch(e) {
      console.warn('[GMeet API] getMeetParticipants failed', e);
      return [];
    }
  }

  async function getMeetRecordings(meetingUri) {
    try {
      const recordName = await _getConferenceRecord(meetingUri);
      if (!recordName) return [];

      const token = await getAccessToken();
      const response = await fetch(`https://meet.googleapis.com/v2/${recordName}/recordings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch recordings');
      
      const data = await response.json();
      return data.recordings || [];
    } catch(e) {
      console.warn('[GMeet API] getMeetRecordings failed', e);
      return [];
    }
  }

  return { createMeetSpace, getMeetParticipants, getMeetRecordings };
})();
