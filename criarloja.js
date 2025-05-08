// Configurações do Dropbox
const DROPBOX_ACCESS_TOKEN = 'sl.u.AFvU2RFNUGd_5RxXq1IynRvYFgi1ZsaYUPEt_Z_N3DSRUIdqT3pDzVsEO62ldTSL_y3mxQxwvGfME0bboIoRHasV_xnN37zIzuoeMHNmWbfzHLr2zhSpjXJz7yNvT21RMNn1nDObcx4SKt-zyzoRXP9XVktUpjn2j4QexSI_MUDZacfEWegzVGzhto_Arr6NzFDSi2494r07Dg59h2LCWsut4HhVeI9GGhvnBTFtj_H0fxI55g-93GJdR17fKcVToWxBxmwUAcK61HoilAa6C5v8CvkAX34fiBeuSnYPPP4D5XZ1K-wFN53vnqAdlxtm7wGEFePCy0Eir_WHeqmqseimIqvEVpflGs8OQ0csxKpZ8VazwRSxXfNS378Y-KT9kPh2Uo0E4TrWXOUTLDn5l_2l02bIvqct6JJu-_MeeaVurLoGAOEAmICH_H5DFep4enWUbJckLJuJq02EDfrW9T6d47yo8E9OdSymARTxmsLYpICwjnEPd7lUSpcNPbbaakc7dj2v4vvVmC1KSt7qT15-Nkre0mjr4aqvdvGJlwBzEThzezHpA60vJQvgpVJnHsfiqX4d7lzlCses0WywC_F7P67JRDMJ_10xCvuCxVsWpnlXPlrvtMe3t-P5D_2M7CNaRPjb0EYLE-npmcCDisanotyevqZHdHAnC90EsmQmbCrFOrn0ek-mO5PEAq5NB8H6LXdYfBex6YIsBnk_RYf0O_UwDxdbsEAguqbSQ3UWpSZxCa4NLNOeSS0Ynxpn9P0HW4KPHZl1ca7gitK0PNvwE6Xn9IYsOk7mqmMmug2nvrqKgEMXZbwJm1i7PacsULzY27JtOoKZIA8raRmBuOvp0mboqqm8Xc_pqTJXDU4UjZfYK7sR7imgCk-qhH4nM1SNhnmAFrYEfYZiYmkeJHW1AbzOWG-QbQ6ALkObrwoiRM1yD_TI8O8xQoIVZovAL1sTjTNa44IRycaUWuupcvskErXr7tI-6FpNJ_i4-q-DOg8lzO4arcMCxR3bLY0NAsxECcYAt8ph9B8RXApSzqsvIkP3ZBqnvt4omKQ3kyqkLPJc2uSJ5mLNfrc03D3HrJRscjVphkAmyVbApzQN2-5rok8kWmH27lj62TsjRv1ePjX9VZxbydMwNMNsx7n_ZUJ2MmMoiuWkXFLA5yVBqjSj1XMK8Y10ZTl1CmjQFX4FVomctSDgN8cKwpX46uPKICISsgWkxHqQRp-6UrKwlFeqBhmLl8HFU533LZsh1INKu-aOgDl3oLaGdGpBlSBJ6pp6KnWmLNkTpHiGr0zyV4JCTIg7_tDaSMDd3Docd3wsZbI7pJ-MCDPoBlyHhRA0Q5jYudJTxZIlpq3t89V34L7rkK2nuSsazAZtqZAQnIKlvjYeRYblqXQhNTkAXT9HIM0yMSl37DJPpEUr7F7QkKa8QSASf3fPU6uE5lrGpI9XWHqbutNrAFSaG94AMaHH0UU'; // ← Substitua pelo seu token
const DROPBOX_UPLOAD_PATH = 'Aplicativos/lojaimagens'; // ← Garanta que esta pasta exista

// Função para decodificar JWT (compatível com perfil.js)
function jwtDecode_local(token) {
    try {
        if (!token) return null;
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Erro decodificando JWT:", e);
        return null;
    }
}
// Script para a página de criação de loja
document.addEventListener('DOMContentLoaded', function() {
    // Configurações compartilhadas
    const USER_DATA_KEY_FROM_SCRIPT = 'googleUserDataToken';
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1boPWweXlVIQPXdyt9vBFFcDwsuo438W5cPWgGnQTdqaZwMMfqYB4-j_nqs78yl99/exec';

    // Elementos da página
    const elements = {
        storeNameInput: document.getElementById('store_name_input'),
        storeCepInput: document.getElementById('store_cep_input'),
        saveButton: document.getElementById('save_button'),
        ordersLabel: document.querySelector('#orders_label .textstyle6'),
        ordersButton: document.getElementById('orders_button'),
        productsButton: document.getElementById('products_button'),
        logoUpload: document.getElementById('logo_upload_image'),
        backgroundUpload: document.getElementById('background_upload_image'),
        welcomeLabel: document.getElementById('welcome_label')
    };

    // Verificar elementos essenciais
    if (!elements.saveButton || !elements.storeNameInput || !elements.storeCepInput) {
        console.error('Elementos essenciais não encontrados!');
        return;
    }

    // Verificação inicial de autenticação
    const authToken = localStorage.getItem(USER_DATA_KEY_FROM_SCRIPT);
    const userData = jwtDecode_local(authToken);

    if (!userData?.sub) {
        alert('Sessão expirada ou não autenticado. Redirecionando...');
        window.location.href = 'login.html';
        return;
    }

    // Configuração inicial
    console.log('Usuário logado:', userData);
    elements.welcomeLabel.innerHTML = `Bem vindo, ${userData.name || userData.email || 'usuário'}! Crie sua loja`;
    loadStoreData();

    // Event Listeners
    elements.saveButton.addEventListener('click', handleSave);
    setupImageUpload('logo_upload_image', 'storeLogo');
    setupImageUpload('background_upload_image', 'storeBackground');

    async function handleSave() {
        const currentToken = localStorage.getItem(USER_DATA_KEY_FROM_SCRIPT);
        const currentUserData = jwtDecode_local(currentToken);

        if (!currentUserData?.sub) {
            alert('Sessão expirada. Faça login novamente.');
            window.location.href = 'login.html';
            return;
        }

        const storeData = {
            userId: currentUserData.sub,
            userEmail: currentUserData.email || '',
            storeName: elements.storeNameInput.value.replace('nome =', '').trim(),
            storeCep: elements.storeCepInput.value.replace('cep =', '').trim(),
            logoUrl: elements.logoUpload.src,
            backgroundUrl: elements.backgroundUpload.src,
            timestamp: new Date().toISOString()
        };

        // Salvar localmente
        localStorage.setItem('storeDataLocal', JSON.stringify({
            name: storeData.storeName,
            cep: storeData.storeCep,
            logo: storeData.logoUrl,
            background: storeData.backgroundUrl
        }));

        updateWelcomeMessage(storeData.storeName);
        checkOrders();
        sendDataToSheet(storeData);
    }

    async function sendDataToSheet(data) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            console.log('Dados enviados para planilha');
            alert('Dados salvos com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert('Falha na conexão. Verifique sua rede.');
        }
    }

     function setupImageUpload(elementId, storageKey) {
        const uploadElement = document.getElementById(elementId);
        if (!uploadElement) return;

        async function uploadToDropbox(file) {
            const filename = `${DROPBOX_UPLOAD_PATH}${Date.now()}_${file.name.replace(/[^a-z0-9\.]/gi, '_')}`;
            
            try {
                // 1. Ler o arquivo como ArrayBuffer
                const fileBuffer = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = reject;
                    reader.readAsArrayBuffer(file);
                });

                // 2. Fazer upload
                const uploadResponse = await fetch('https://content.dropboxapi.com/2/files/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                        'Content-Type': 'application/octet-stream',
                        'Dropbox-API-Arg': JSON.stringify({
                            path: filename,
                            mode: 'overwrite',
                            autorename: true,
                            mute: false
                        })
                    },
                    body: fileBuffer
                });

                if (!uploadResponse.ok) {
                    const errorData = await uploadResponse.json();
                    throw new Error(errorData.error_summary || 'Falha no upload');
                }

                // 3. Criar link compartilhável
                const shareResponse = await fetch('https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${DROPBOX_ACCESS_TOKEN}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        path: filename,
                        settings: { requested_visibility: 'public' }
                    })
                });

                const shareData = await shareResponse.json();
                return shareData.url.replace('?dl=0', '?raw=1');

            } catch (error) {
                console.error('Erro detalhado:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
                throw error;
            }
        }
       async function processFile(file) {
            if (!file.type.startsWith('image/')) {
                alert('Apenas arquivos de imagem são permitidos!');
                return;
            }

            try {
                const imageUrl = await uploadToDropbox(file);
                uploadElement.src = imageUrl;
                
                // Atualizar localStorage
                const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
                storeData[storageKey === 'storeLogo' ? 'logo' : 'background'] = imageUrl;
                localStorage.setItem('storeDataLocal', JSON.stringify(storeData));
                
                alert('Imagem carregada com sucesso!');
                
            } catch (error) {
                alert(`Erro no upload: ${error.message}`);
            }
        }
        // Handlers de Drag & Drop
        uploadElement.addEventListener('dragover', (e) => e.preventDefault());
        uploadElement.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
        });

        // Handler de Clique
        uploadElement.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => e.target.files[0] && processFile(e.target.files[0]);
            input.click();
        });
    }

    function updateWelcomeMessage(storeName) {
        const userName = userData.name || userData.email || 'usuário';
        elements.welcomeLabel.innerHTML = storeName 
            ? `Bem vindo, ${userName}!<br/>Sua loja: ${storeName}`
            : `Bem vindo, ${userName}!<br/>Crie sua loja`;
    }

    function checkOrders() {
        const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
        const orders = storeData.orders || [];
        
        if (elements.ordersLabel) {
            elements.ordersLabel.textContent = orders.length > 0 
                ? `Você tem (${orders.length}) pedidos`
                : 'Você tem (0) pedidos';
        }
    }

    function loadStoreData() {
        const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
        
        if (storeData.name) {
            elements.storeNameInput.value = `nome = ${storeData.name}`;
        }
        
        if (storeData.cep) {
            elements.storeCepInput.value = `cep = ${storeData.cep}`;
        }
        
        if (storeData.logo) {
            elements.logoUpload.src = storeData.logo;
        }
        
        if (storeData.background) {
            elements.backgroundUpload.src = storeData.background;
        }
        
        updateWelcomeMessage(storeData.name);
        checkOrders();
    }
});
