// Funcao para decodificar JWT (compatível com perfil.js)
function jwtDecode_local(token) {
    try {
        if (!token) {
            console.log('Nenhum token fornecido para decodificação.');
            return null;
        }
        const parts = token.split('.');
        if (parts.length !== 3) {
            console.error("Token JWT inválido: estrutura incorreta.");
            return null;
        }
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));

        const payload = JSON.parse(jsonPayload);

        const currentTime = Date.now() / 1000;
        if (payload.exp && payload.exp < currentTime) {
            console.log('Token expirado (detectado no cliente):', new Date(payload.exp * 1000));
            localStorage.removeItem('googleUserDataToken');
            return null;
        }

        if (!payload.sub) {
             console.error("Token decodificado não contém 'sub' (ID do usuário).");
             return null;
        }
        console.log('Token decodificado com sucesso:', payload);
        return payload;
    } catch (e) {
        console.error("Erro decodificando JWT:", e);
        return null;
    }
}

// Script para a página de criação de loja
document.addEventListener('DOMContentLoaded', function() {
    // Configurações compartilhadas com perfil.js
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
    elements.ordersButton.addEventListener('click', () => window.location.href = 'pedidos.html');
    elements.productsButton.addEventListener('click', () => window.location.href = 'produtosdaloja.html');

    // Configuração do upload de imagens
    setupImageUpload('logo_upload_image', 'storeLogo');
    setupImageUpload('background_upload_image', 'storeBackground');

    function handleSave() {
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
            logoUrl: elements.logoUpload.src.startsWith('data:image') ? 'Imagem em Base64' : elements.logoUpload.src,
            backgroundUrl: elements.backgroundUpload.src.startsWith('data:image') ? 'Imagem em Base64' : elements.backgroundUpload.src,
            timestamp: new Date().toISOString()
        };

        // Salvar localmente
        localStorage.setItem('storeDataLocal', JSON.stringify({
            name: storeData.storeName,
            cep: storeData.storeCep,
            logo: elements.logoUpload.src,
            background: elements.backgroundUpload.src
        }));

        updateWelcomeMessage(storeData.storeName);
        checkOrders();
        sendDataToSheet(storeData);
    }

    async function sendDataToSheet(data) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.status === 'error') {
                throw new Error(result.message);
            }
            
            console.log('Dados salvos na planilha:', result);
            alert('Dados enviados com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar:', error);
            alert(`Falha no envio: ${error.message}`);
        }
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
        
        if (storeData.logo && !storeData.logo.includes('drop_here.png')) {
            elements.logoUpload.src = storeData.logo;
        }
        
        if (storeData.background && !storeData.background.includes('drop_here.png')) {
            elements.backgroundUpload.src = storeData.background;
        }
        
        updateWelcomeMessage(storeData.name);
        checkOrders();
    }

    function setupImageUpload(elementId, storageKey) {
        const uploadElement = document.getElementById(elementId);
        if (!uploadElement) return;

        function processFile(file) {
            if (!file.type.startsWith('image/')) {
                alert('Selecione apenas imagens!');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                uploadElement.src = e.target.result;
                const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
                storeData[storageKey === 'storeLogo' ? 'logo' : 'background'] = e.target.result;
                localStorage.setItem('storeDataLocal', JSON.stringify(storeData));
            };
            reader.readAsDataURL(file);
        }

        // Handlers de drag and drop
        uploadElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadElement.style.border = '2px dashed #5A4ABC';
        });

        uploadElement.addEventListener('dragleave', () => {
            uploadElement.style.border = 'none';
        });

        uploadElement.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadElement.style.border = 'none';
            if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]);
        });

        // Handler de clique
        uploadElement.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => e.target.files[0] && processFile(e.target.files[0]);
            input.click();
        });
    }
});
