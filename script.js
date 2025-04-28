// --- Configuration ---
// IMPORTANT: Replace with your actual Google Apps Script Web App URL
const GOOGLE_SHEET_APP_URL = 'https://script.google.com/macros/s/AKfycbwYE4Xi7snt-D7rfwQpoN7S3aeuyrQnARg5_0iy55ArzZ1qdcJbAsl5DwKX9Myh3ZAEVQ/exec';
const USER_DATA_KEY = 'googleUserData'; // Key for localStorage

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
 * Decodes the JWT token from Google Sign-In.
 * NOTE: This is a basic decoder for the payload, sufficient for getting profile info.
 * It does NOT validate the signature (which should ideally be done server-side).
 * For client-side use with Google Identity Services, Google guarantees the token's
 * integrity when delivered directly to your registered callback.
 */
function jwtDecode(token) {
    try {
        const base64Url = token.split('.')[1]; // Get the payload part
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Error decoding JWT:", e);
        return null;
    }
}

/**
 * Updates the UI based on login status.
 * @param {object|null} userData - The user data object or null if logged out.
 */
function updateUI(userData) {
    if (userData) {
        // User is logged in
        userNameSpan.textContent = userData.name || 'N/A';
        userEmailSpan.textContent = userData.email || 'N/A';
        userPhotoImg.src = userData.picture || ''; // Use picture URL
        userPhotoImg.alt = `Foto de ${userData.name || 'Usuário'}`;

        userInfoDiv.classList.remove('hidden');
        googleSignInButtonContainer.classList.add('hidden');
        statusMessageDiv.textContent = ''; // Clear status
    } else {
        // User is logged out
        userNameSpan.textContent = '';
        userEmailSpan.textContent = '';
        userPhotoImg.src = '';
        userPhotoImg.alt = 'Foto do Usuário';

        userInfoDiv.classList.add('hidden');
        googleSignInButtonContainer.classList.remove('hidden');
        statusMessageDiv.textContent = 'Você não está logado.';
    }
}

/**
 * Saves user data to Google Sheet via Apps Script Web App.
 * @param {object} userData - The user data object.
 */
function saveToSheet(userData) {
    if (!GOOGLE_SHEET_APP_URL || GOOGLE_SHEET_APP_URL === 'https://script.google.com/macros/s/AKfycbwYE4Xi7snt-D7rfwQpoN7S3aeuyrQnARg5_0iy55ArzZ1qdcJbAsl5DwKX9Myh3ZAEVQ/exec') {
        console.warn('Google Apps Script URL not configured. Skipping sheet save.');
        statusMessageDiv.textContent = 'Login bem-sucedido (salvamento em planilha desativado).';
        return;
    }

    statusMessageDiv.textContent = 'Salvando dados na planilha...';

    fetch(GOOGLE_SHEET_APP_URL, {
        method: 'POST',
        mode: 'cors', // Important for cross-origin requests if your Apps Script returns headers
                      // For simple doPost often 'no-cors' works if you don't need the response,
                      // but 'cors' is better if the Apps Script is configured correctly.
                      // The default Apps Script deployment might require 'no-cors' if you haven't
                      // explicitly handled CORS headers in the script. Try 'cors' first.
        cache: 'no-cache',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData) // Send name, email, picture
    })
    .then(response => {
        // If mode is 'no-cors', response will be opaque, cannot read body
        // If mode is 'cors', check if response is ok
        if (response.ok) {
             return response.json(); // Try to parse JSON response from Apps Script
        } else if (response.type === 'opaque') {
             // This happens with 'no-cors'. Assume success for sheet saving.
             console.log('Request sent to Apps Script (no-cors). Assume success.');
             return { status: 'success', message: 'Data likely saved (no-cors response).' };
        }
        // If response not ok and not opaque, throw error
        throw new Error(`Network response was not ok: ${response.statusText}`);

    })
    .then(data => {
        console.log('Apps Script Response:', data);
        if (data && data.status === 'success') {
            statusMessageDiv.textContent = 'Login bem-sucedido e dados salvos!';
        } else {
             // Even if technically saved via 'no-cors', report based on assumption
             if(data && data.message.includes('no-cors response')) {
                 statusMessageDiv.textContent = 'Login bem-sucedido! (Dados enviados para planilha).';
             } else {
                 statusMessageDiv.textContent = `Login bem-sucedido, mas erro ao salvar na planilha: ${data ? data.message : 'Unknown error'}`;
             }
        }
    })
    .catch((error) => {
        console.error('Error sending data to Google Sheet:', error);
        statusMessageDiv.textContent = `Login bem-sucedido, mas falha ao conectar com a planilha: ${error.message}`;
    });
}


/**
 * Handles the response from Google Sign-In.
 * @param {object} response - The credential response object from Google.
 */
function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    const decodedToken = jwtDecode(response.credential);

    if (decodedToken) {
        console.log("Decoded JWT Payload:", decodedToken);
        const userData = {
            name: decodedToken.name,
            email: decodedToken.email,
            picture: decodedToken.picture,
            // You can add other fields like sub (subject/user ID), given_name, family_name etc.
        };

        // --- Persist Login ---
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

        // --- Update UI ---
        updateUI(userData);

        // --- Save to Sheet ---
        saveToSheet(userData);

    } else {
        console.error("Failed to decode token.");
        statusMessageDiv.textContent = 'Falha ao processar o login. Tente novamente.';
    }
}

/**
 * Logs the user out.
 */
function logout() {
    // --- Clear Persistent Data ---
    localStorage.removeItem(USER_DATA_KEY);

    // --- Optional: Disable Google automatic sign-in for the next visit ---
    // google.accounts.id.disableAutoSelect(); // Uncomment if you use auto-signin features

    // --- Update UI ---
    updateUI(null); // Pass null to show logged-out state
    statusMessageDiv.textContent = 'Você saiu com sucesso.';
    console.log("User logged out.");
}

// --- Initialization ---

// Add event listener for the logout button
logoutButton.addEventListener('click', logout);

// Check for existing session on page load
window.addEventListener('load', () => {
    const storedData = localStorage.getItem(USER_DATA_KEY);
    if (storedData) {
        try {
            const userData = JSON.parse(storedData);
            console.log("Found stored user data. Restoring session.", userData);
            updateUI(userData); // Update UI with stored data
        } catch (e) {
            console.error("Error parsing stored user data:", e);
            localStorage.removeItem(USER_DATA_KEY); // Clear corrupted data
            updateUI(null); // Show logged-out state
        }
    } else {
        console.log("No stored user data found.");
        updateUI(null); // Ensure logged-out state is shown initially
    }
    // Google Identity Services library is loaded asynchronously.
    // The button rendering and callback assignment happen via the attributes
    // in the HTML ('g_id_onload', 'g_id_signin').
});

// Make sure the Google Apps Script URL is replaced before use!
if (GOOGLE_SHEET_APP_URL === 'https://script.google.com/macros/s/AKfycbwYE4Xi7snt-D7rfwQpoN7S3aeuyrQnARg5_0iy55ArzZ1qdcJbAsl5DwKX9Myh3ZAEVQ/exec') {
    console.warn('REMINDER: Replace YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL in script.js');
    // Optionally disable the button or show a message if not configured
}
