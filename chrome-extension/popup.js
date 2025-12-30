// Popup script for the Chrome extension
document.addEventListener('DOMContentLoaded', function() {
  const extractBtn = document.getElementById('extractBtn');
  const copyBtn = document.getElementById('copyBtn');
  const stateOutput = document.getElementById('stateOutput');
  const statusDiv = document.getElementById('status');

  // Update status message
  function updateStatus(message, isSuccess = false) {
    statusDiv.textContent = message;
    statusDiv.className = 'status ' + (isSuccess ? 'success' : 'error');
    setTimeout(() => {
      statusDiv.textContent = '';
      statusDiv.className = 'status';
    }, 3000);
  }

  // Map Chrome cookie sameSite values to Playwright compatible values
  function mapSameSiteValue(chromeSameSite) {
    // Chrome returns undefined for cookies without SameSite attribute
    if (chromeSameSite === undefined || chromeSameSite === null) {
      return "Lax"; // Default value for unspecified cookies
    }
    
    // Map Chrome's cookie sameSite values to Playwright's expected values (with proper capitalization)
    const sameSiteMap = {
      "no_restriction": "None",
      "lax": "Lax",
      "strict": "Strict",
      "unspecified": "Lax" // Treat unspecified as Lax (browser default)
    };
    
    return sameSiteMap[chromeSameSite] || "Lax";
  }

  // Extract cookies when button is clicked
  extractBtn.addEventListener('click', async () => {
    try {
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      
      if (!tab.url.includes('goofish.com')) {
        updateStatus('Please navigate to goofish.com first');
        return;
      }

      // Directly call chrome.cookies API from popup script
      const cookies = await new Promise((resolve) => {
        chrome.cookies.getAll({url: "https://www.goofish.com/"}, resolve);
      });
      
      const state = {
        cookies: cookies.map(cookie => ({
          name: cookie.name,
          value: cookie.value,
          domain: cookie.domain,
          path: cookie.path,
          expires: cookie.expirationDate,
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: mapSameSiteValue(cookie.sameSite)
        }))
      };

      stateOutput.value = JSON.stringify(state, null, 2);
      updateStatus('Login state extracted successfully!', true);
    } catch (error) {
      console.error('Error extracting cookies:', error);
      updateStatus('Error: ' + error.message);
    }
  });

  // Copy to clipboard when button is clicked
  copyBtn.addEventListener('click', () => {
    if (stateOutput.value) {
      navigator.clipboard.writeText(stateOutput.value)
        .then(() => {
          updateStatus('Copied to clipboard!', true);
        })
        .catch(err => {
          updateStatus('Failed to copy: ' + err);
        });
    } else {
      updateStatus('No data to copy');
    }
  });
});