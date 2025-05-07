// --- Configuration ---
// !!! IMPORTANTE: SUBSTITUA PELA URL DO SEU APP SCRIPT IMPLANTADO !!!
const GOOGLE_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzCIRbVqnxxhruGC-7yZjasWpHYlIqlo9z5U2RCpv4-qz6VF7I8XRqO7hqjPkXMDuNA/exec'; // Cole a URL aqui
const USER_DATA_KEY = 'googleUserDataToken'; // Key for storing the raw ID token in localStorage
window.decodedToken = null; // Variável global

// --- DOM Elements ---
const googleSignInButtonContainer = document.getElementById('googleSignInButtonContainer');
const userInfoDiv = document.getElementById('userInfo');
const userNameSpan = document.getElementById('userName');
const userEmailSpan = document.getElementById('userEmail');
const userPhotoImg = document.getElementById('userPhoto');
const logoutButton = document.getElementById('logoutButton');
const statusMessageDiv = document.getElementById('statusMessage');

// --- Functions ---

/**
 * Decodes a JWT (token) to extract the payload.
 * Used primarily for quickly updating the UI on the client-side.
 * The REAL security verification happens on the server.
 * @param {string} token The JWT token.
 * @returns {object|null} The decoded payload or null if error/expired.
 */
function jwtDecode(token) {
    try {
        const base64Url = token.split('.')[1];
        if (!base64Url) return null;
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        const payload = JSON.parse(jsonPayload);

        // Basic client-side expiration check
        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expired (client-side detection)');
            return null;
        }
        window.decodedToken = payload;
        return payload;
    } catch (e) {
        console.error("Error decoding JWT on client:", e);
        window.decodedToken = null;
        return null;
    }
}

/**
 * Updates the user interface based on user data.
 * @param {object|null} userData Object with name, email, picture or null for logged out.
 */
function updateUI(userData) {
    if (!userNameSpan || !userEmailSpan || !userPhotoImg || !userInfoDiv || !googleSignInButtonContainer) {
        console.error("UI elements not found.");
        return;
    }
    if (userData) {
        userNameSpan.textContent = userData.name || 'N/A';
        userEmailSpan.textContent = userData.email || 'N/A';
        userPhotoImg.src = userData.picture || 'https://placehold.co/100x100/eeeeee/cccccc?text=Foto'; // Placeholder
        userPhotoImg.onerror = () => { userPhotoImg.src = 'https://placehold.co/100x100/eeeeee/cccccc?text=Erro'; }; // Fallback
        userInfoDiv.classList.remove('hidden');
        googleSignInButtonContainer.classList.add('hidden');
    } else {
        userInfoDiv.classList.add('hidden');
        googleSignInButtonContainer.classList.remove('hidden');
        userNameSpan.textContent = '';
        userEmailSpan.textContent = '';
        userPhotoImg.src = '';
    }
}

// --- Iframe Control --- (Keep as is)
function showIframe(iframeId) {
    document.querySelectorAll('.iframe-content').forEach(frame => {
        frame.classList.remove('active');
    });
    const targetFrame = document.getElementById(iframeId);
    if (targetFrame) {
        targetFrame.classList.add('active');
    } else {
        console.warn(`Iframe with ID "${iframeId}" not found.`);
    }
}

// Iframe Event Listeners (Keep as is)
const registoBtn = document.getElementById('registo');
const contaBtn = document.getElementById('conta');
const lojaBtn = document.getElementById('loja');
if (registoBtn) {
    registoBtn.addEventListener('click', () => showIframe('registoFrame'));
}
if (contaBtn) {
    contaBtn.addEventListener('click', () => {
        if (localStorage.getItem(USER_DATA_KEY)) {
            showIframe('contaFrame');
        } else {
            statusMessageDiv.textContent = 'Faça login primeiro para acessar seu perfil!';
            statusMessageDiv.style.color = 'orange';
        }
    });
}
if (lojaBtn) {
    lojaBtn.addEventListener('click', () => {
        if (localStorage.getItem(USER_DATA_KEY)) {
            showIframe('LojaFrame');
        } else {
            statusMessageDiv.textContent = 'Faça login primeiro para acessar seu perfil!';
            statusMessageDiv.style.color = 'orange';
        }
    });
}
document.querySelectorAll('.aiframe-btn').forEach(button => {
    button.addEventListener('click', (e) => {
        const iframeId = e.target.dataset.iframe;
        if (iframeId) {
            showIframe(iframeId);
        } else {
            console.warn("Button missing 'data-iframe' attribute.");
        }
    });
});


/**
 * Sends the raw ID Token to Google Apps Script for verification and saving/updating.
 * @param {string} idToken The raw ID token from Google Sign-In.
 * @param {boolean} isPageLoad Optional flag to indicate if called during page load.
 */
function verifyAndSaveUser(idToken, isPageLoad = false) {
    if (!GOOGLE_APPS_SCRIPT_URL || GOOGLE_APPS_SCRIPT_URL === 'SUA_NOVA_URL_DO_APP_SCRIPT_AQUI') {
        console.warn('Google Apps Script URL not configured in script.js.');
        // Only show warning message if not on page load (avoid duplicate messages)
        if (!isPageLoad) {
            statusMessageDiv.textContent = 'Login successful on client, but server saving is disabled (URL not configured).';
            statusMessageDiv.style.color = 'orange';
        }
        return; // Stop if URL is not set
    }

    // Show different message during page load verification
    if (isPageLoad) {
        statusMessageDiv.textContent = 'Verificando sessão com o servidor...';
        statusMessageDiv.style.color = 'grey';
    } else {
        statusMessageDiv.textContent = 'Verificando autenticação e salvando dados...';
        statusMessageDiv.style.color = 'blue';
    }

    fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id_token: idToken }) // Send raw token
    })
    .then(response => {
        // Cannot read response with no-cors, assume success if no network error
        console.log('Request sent to Apps Script (mode: no-cors). Response is opaque.');
        if (isPageLoad) {
            statusMessageDiv.textContent = 'Sessão verificada com o servidor.';
            statusMessageDiv.style.color = 'green';
             // Optionally hide message after a delay
             setTimeout(() => {
                 if (statusMessageDiv.textContent === 'Sessão verificada com o servidor.') {
                    statusMessageDiv.textContent = '';
                 }
             }, 3000);
        } else {
            statusMessageDiv.textContent = 'Autenticação verificada e dados enviados para o servidor com sucesso!';
            statusMessageDiv.style.color = 'green';
        }
    })
    .catch((error) => {
        console.error('Error sending token to Google Apps Script:', error);
        statusMessageDiv.textContent = `Falha ao comunicar com o servidor: ${error.message}. Verifique a URL e a conexão.`;
        statusMessageDiv.style.color = 'red';
        // If server verification fails on page load, log the user out
        if (isPageLoad) {
            console.log("Server verification failed on page load. Logging out.");
            logout(); // Force logout if server rejects the token
        }
    });
}

/**
 * Google Sign-In callback. Called after successful sign-in.
 * @param {object} response The response object from Google Sign-In API.
 */
function handleCredentialResponse(response) {
    const idToken = response.credential; // The raw JWT ID Token

    // 1. Decode token on client ONLY for immediate UI update
    const decodedPayload = jwtDecode(idToken);

    if (decodedPayload) {
        // Update UI immediately with decoded data
        updateUI({
            name: decodedPayload.name,
            email: decodedPayload.email,
            picture: decodedPayload.picture
        });

        // 2. Store the RAW token in localStorage for session persistence
        localStorage.setItem(USER_DATA_KEY, idToken);

        // 3. Send the RAW token to the server for REAL verification and saving
        verifyAndSaveUser(idToken, false); // Pass false for isPageLoad

    } else {
        // If initial decoding fails (invalid/expired token)
        statusMessageDiv.textContent = 'Login failed: Invalid or expired token.';
        statusMessageDiv.style.color = 'red';
        logout(); // Clean up any previous login state
    }
}

/**
 * Logs the user out.
 */
function logout() {
    // Remove the stored token
    window.decodedToken = null;
    localStorage.removeItem(USER_DATA_KEY);
    // Clear the UI
    updateUI(null);
    // Display message
    statusMessageDiv.textContent = 'Sessão encerrada.';
    statusMessageDiv.style.color = 'grey';

    // Hide all iframes on logout
    document.querySelectorAll('.iframe-content').forEach(frame => {
        frame.classList.remove('active');
    });
}

// Add event listener to the logout button
if (logoutButton) {
    logoutButton.addEventListener('click', logout);
}

// --- Initialization ---
window.addEventListener('load', () => {
    // Check for a stored token when the page loads
    const storedToken = localStorage.getItem(USER_DATA_KEY);

    if (storedToken) {
        // 1. Quick client-side decode to check format and expiry
        const decodedPayload = jwtDecode(storedToken);

        if (decodedPayload) {
            // 2. If decodable and not expired client-side, update UI immediately
            console.log('Restoring session from stored token, verifying with server...');
            updateUI(decodedPayload);

            // 3. *** Send token to server for REAL verification ***
            // This ensures the token is still valid according to Google and updates the timestamp.
            verifyAndSaveUser(storedToken, true); // Pass true for isPageLoad

        } else {
            // If client-side decode fails (expired/invalid), clear the bad token
            console.log('Stored token invalid or expired. Logging out.');
            logout();
        }
    } else {
        // No token found, ensure UI is in logged-out state
        updateUI(null);
    }

    // Warning if URL placeholder is still present
    if (GOOGLE_APPS_SCRIPT_URL === 'SUA_NOVA_URL_DO_APP_SCRIPT_AQUI') {
        console.warn('REMINDER: Replace "SUA_NOVA_URL_DO_APP_SCRIPT_AQUI" in script.js with your actual deployed App Script URL.');
        const warningMsg = 'AVISO: A URL de verificação do servidor não está configurada. O login funcionará apenas localmente.';
         // Show warning only if no other message is present
        if (!statusMessageDiv.textContent) {
             statusMessageDiv.textContent = warningMsg;
             statusMessageDiv.style.color = 'orange';
        }
    }
});
