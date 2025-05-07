// Funcao para decodificar JWT (anteriormente em jwtDecode_local.txt)
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
            // localStorage.removeItem('jwtToken'); // Opcional: remover token expirado
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

// criarloja.js - Script para a página de criação de loja
document.addEventListener('DOMContentLoaded', function() {
    // Elementos da página
    const storeNameInput = document.getElementById('store_name_input');
    const storeCepInput = document.getElementById('store_cep_input');
    const saveButton = document.getElementById('save_button');
    const ordersLabel = document.querySelector('#orders_label .textstyle6'); // Assumindo que textstyle6 é o span correto
    const ordersButton = document.getElementById('orders_button');
    const productsButton = document.getElementById('products_button');
    const logoUpload = document.getElementById('logo_upload_image');
    const backgroundUpload = document.getElementById('background_upload_image');
    const welcomeLabel = document.getElementById('welcome_label');

    // URL do seu Web App do Google Apps Script (SUBSTITUA ESTA URL)
    const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw1boPWweXlVIQPXdyt9vBFFcDwsuo438W5cPWgGnQTdqaZwMMfqYB4-j_nqs78yl99/exec';

    // Tenta obter o token do localStorage (ajuste 'jwtToken' se o nome for diferente)
    const authToken = localStorage.getItem('jwtToken');
    const userData = jwtDecode_local(authToken);

    if (userData) {
        console.log('Usuário logado:', userData);
        // Voce pode usar userData.sub (ID do usuário) ou outros campos do payload aqui
        // Ex: welcomeLabel.innerHTML = `Bem vindo, ${userData.name || 'usuário'}! Crie sua loja`;
    } else {
        console.log('Nenhum usuário logado ou token inválido/expirado.');
        // Adicionar lógica para redirecionar para login ou mostrar mensagem, se necessário
        // Ex: window.location.href = 'login.html';
    }

    loadStoreData();

    saveButton.addEventListener('click', function() {
        // Primeiro, verifica se o usuário está logado ao salvar
        const currentToken = localStorage.getItem('jwtToken');
        const currentUserData = jwtDecode_local(currentToken);

        if (!currentUserData) {
            alert('Sessão expirada ou usuário não logado. Por favor, faça login novamente.');
            // Opcional: redirecionar para a página de login
            // window.location.href = 'pagina_de_login.html';
            return; // Interrompe o salvamento se não houver usuário
        }

        const storeData = {
            userId: currentUserData.sub, // ID do usuário do token JWT
            userEmail: currentUserData.email || '', // Supondo que o token tenha o email
            storeName: storeNameInput.value.replace('nome =', '').trim(),
            storeCep: storeCepInput.value.replace('cep =', '').trim(),
            logoUrl: logoUpload.src.startsWith('data:image') ? 'Imagem em Base64' : logoUpload.src, // Evita enviar base64 longo demais se não for necessário
            backgroundUrl: backgroundUpload.src.startsWith('data:image') ? 'Imagem em Base64' : backgroundUpload.src,
            timestamp: new Date().toISOString()
            // Adicione outros campos que você deseja salvar na planilha
        };

        // Salva no localStorage como antes
        localStorage.setItem('storeDataLocal', JSON.stringify({
            name: storeData.storeName,
            cep: storeData.storeCep,
            logo: logoUpload.src, // Salva a imagem completa no localStorage
            background: backgroundUpload.src // Salva a imagem completa no localStorage
        }));

        updateWelcomeMessage(storeData.storeName);
        checkOrders(); // Esta função precisa ser definida ou adaptada
        alert('Dados da loja salvos localmente!');

        // Envia os dados para a Planilha Google
        sendDataToSheet(storeData);
    });

    async function sendDataToSheet(data) {
        try {
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'cors', // Necessário para requisições cross-origin
                cache: 'no-cache',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data) // Envia os dados como JSON
            });

            // O Google Apps Script, por padrão em POSTs simples, pode retornar HTML ou texto.
            // Se você configurar o Apps Script para retornar JSON, pode usar response.json()
            const result = await response.text(); // ou response.json() se o script retornar JSON

            console.log('Sucesso ao enviar para planilha:', result);
            alert('Dados enviados para a planilha com sucesso!');

        } catch (error) {
            console.error('Erro ao enviar dados para a planilha:', error);
            alert('Falha ao enviar dados para a planilha. Verifique o console para mais detalhes.');
        }
    }


    function updateWelcomeMessage(storeName) {
        const currentToken = localStorage.getItem('jwtToken');
        const currentUserData = jwtDecode_local(currentToken);
        let userName = 'usuário'; // Nome padrão

        if (currentUserData && currentUserData.name) { // Supondo que o token tenha um campo 'name'
            userName = currentUserData.name;
        } else if (currentUserData && currentUserData.email) { // Ou usa o email
             userName = currentUserData.email;
        }


        if (storeName) {
            welcomeLabel.innerHTML = `Bem vindo, ${userName}!<br/>Sua loja: ${storeName}`;
        } else {
            welcomeLabel.innerHTML = `Bem vindo, ${userName}!<br/>Crie sua loja`;
        }
    }

    function checkOrders() {
        // Adapte esta função conforme sua lógica de pedidos
        // Exemplo: buscar pedidos do localStorage ou de uma API
        const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
        const orders = storeData.orders || []; // Supondo que 'orders' seja um array
        
        if (ordersLabel) { // Verifica se o elemento existe
            if (orders.length > 0) {
                ordersLabel.textContent = `Você tem (${orders.length}) pedidos`;
            } else {
                ordersLabel.textContent = 'Você tem (0) pedidos';
            }
        } else {
            console.warn("Elemento 'ordersLabel' não encontrado para atualizar contagem de pedidos.");
        }
    }

    function loadStoreData() {
        const storeData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
        
        if (storeData.name) {
            storeNameInput.value = `nome = ${storeData.name}`;
        }
        
        if (storeData.cep) {
            storeCepInput.value = `cep = ${storeData.cep}`;
        }
        
        if (storeData.logo && storeData.logo !== 'rc_images/drop_here.png') { // Não carrega placeholder se já houver logo
            logoUpload.src = storeData.logo;
        }
        
        if (storeData.background && storeData.background !== 'rc_images/drop_here.png') { // Não carrega placeholder se já houver fundo
            backgroundUpload.src = storeData.background;
        }
        
        updateWelcomeMessage(storeData.name);
        checkOrders();
    }

    ordersButton.addEventListener('click', function() {
        window.location.href = 'pedidos.html'; // Certifique-se que este arquivo existe
    });

    productsButton.addEventListener('click', function() {
        window.location.href = 'produtosdaloja.html'; // Certifique-se que este arquivo existe
    });

    function setupImageUpload(elementId, storageKey) {
        const uploadElement = document.getElementById(elementId);
        if (!uploadElement) {
            console.error(`Elemento de upload ${elementId} não encontrado.`);
            return;
        }

        function processFile(file) {
            if (!file.type.match('image.*')) {
                alert('Por favor, selecione apenas imagens!');
                return;
            }
            const reader = new FileReader();
            reader.onload = function(event) {
                uploadElement.src = event.target.result;
                localStorage.setItem(storageKey, event.target.result); // Salva a imagem em base64

                // Atualiza os dados da loja no localStorage principal também
                const currentStoreData = JSON.parse(localStorage.getItem('storeDataLocal')) || {};
                if (storageKey === 'storeLogo') {
                    currentStoreData.logo = event.target.result;
                } else if (storageKey === 'storeBackground') {
                    currentStoreData.background = event.target.result;
                }
                localStorage.setItem('storeDataLocal', JSON.stringify(currentStoreData));
            };
            reader.readAsDataURL(file);
        }

        uploadElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadElement.style.border = '2px dashed #5A4ABC';
        });
        uploadElement.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadElement.style.border = 'none';
        });
        uploadElement.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            uploadElement.style.border = 'none';
            const file = e.dataTransfer.files[0];
            processFile(file);
        });
        uploadElement.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                processFile(file);
            };
            input.click();
        });
    }

    setupImageUpload('logo_upload_image', 'storeLogo');
    setupImageUpload('background_upload_image', 'storeBackground');
});
