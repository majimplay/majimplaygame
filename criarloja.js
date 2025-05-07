// criarloja.js - Script para a página de criação de loja

document.addEventListener('DOMContentLoaded', function() {
    // Elementos da página
    const storeNameInput = document.getElementById('store_name_input');
    const storeCepInput = document.getElementById('store_cep_input');
    const saveButton = document.getElementById('save_button');
    const ordersLabel = document.querySelector('#orders_label .textstyle6');
    const ordersButton = document.getElementById('orders_button');
    const productsButton = document.getElementById('products_button');
    const logoUpload = document.getElementById('logo_upload_image');
    const backgroundUpload = document.getElementById('background_upload_image');
    const welcomeLabel = document.getElementById('welcome_label');





    // Carrega dados salvos ao iniciar
    loadStoreData();

    // Botão Salvar - armazena dados no LocalStorage
    saveButton.addEventListener('click', function() {
        const storeData = {
            name: storeNameInput.value.replace('nome =', '').trim(),
            cep: storeCepInput.value.replace('cep =', '').trim(),
            logo: localStorage.getItem('storeLogo') || '',
            background: localStorage.getItem('storeBackground') || '',
            orders: JSON.parse(localStorage.getItem('storeOrders')) || []//para teste 
        };

        localStorage.setItem('storeData', JSON.stringify(storeData));
        updateWelcomeMessage(storeData.name);
        checkOrders();
        alert('Dados da loja salvos com sucesso!');
    });

    // Atualiza mensagem de boas-vindas com o nome da loja
    function updateWelcomeMessage(storeName) {
        if (storeName) {
            welcomeLabel.innerHTML = `Bem vindo ao criador de loja<br/>${storeName}`;
        }
    }

    // Verifica pedidos e atualiza o contador
    function checkOrders() {
        const storeData = JSON.parse(localStorage.getItem('storeData')) || {};
        const orders = storeData.orders || [];
        
        if (orders.length > 0) {
            ordersLabel.textContent = `Você tem (${orders.length}) pedidos`;
        } else {
            ordersLabel.textContent = 'Você tem (0) pedidos';
        }
    }

    // Carrega dados salvos
    function loadStoreData() {
        const storeData = JSON.parse(localStorage.getItem('storeData')) || {};
        
        if (storeData.name) {
            storeNameInput.value = `nome = ${storeData.name}`;
        }
        
        if (storeData.cep) {
            storeCepInput.value = `cep = ${storeData.cep}`;
        }
        
        if (storeData.logo) {
            logoUpload.src = storeData.logo;
        }
        
        if (storeData.background) {
            backgroundUpload.src = storeData.background;
        }
        
        updateWelcomeMessage(storeData.name);
        checkOrders();
    }

    // Configura links dos botões
    ordersButton.addEventListener('click', function() {
        window.location.href = 'pedidos.html';
    });

    productsButton.addEventListener('click', function() {
        window.location.href = 'produtosdaloja.html';
    });

    // Funções para upload de imagens (arrastar e soltar)
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.style.border = '2px dashed #5A4ABC';
    }

    function handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.style.border = 'none';
    }

    function handleDrop(e, element) {
        e.preventDefault();
        e.stopPropagation();
        e.target.style.border = 'none';

        const file = e.dataTransfer.files[0];
        if (!file.type.match('image.*')) {
            alert('Por favor, selecione apenas imagens!');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            element.src = event.target.result;
            
            // Salva a imagem no LocalStorage
            if (element === logoUpload) {
                localStorage.setItem('storeLogo', event.target.result);
            } else {
                localStorage.setItem('storeBackground', event.target.result);
            }
            
            // Atualiza os dados da loja
            const storeData = JSON.parse(localStorage.getItem('storeData')) || {};
            storeData.logo = logoUpload.src;
            storeData.background = backgroundUpload.src;
            localStorage.setItem('storeData', JSON.stringify(storeData));
        };
        reader.readAsDataURL(file);
    }

    // Configura drag and drop para logo
    logoUpload.addEventListener('dragover', handleDragOver);
    logoUpload.addEventListener('dragleave', handleDragLeave);
    logoUpload.addEventListener('drop', function(e) {
        handleDrop(e, logoUpload);
    });

    // Configura drag and drop para fundo
    backgroundUpload.addEventListener('dragover', handleDragOver);
    backgroundUpload.addEventListener('dragleave', handleDragLeave);
    backgroundUpload.addEventListener('drop', function(e) {
        handleDrop(e, backgroundUpload);
    });

    // Click para upload de imagem (alternativa ao drag and drop)
    logoUpload.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function(event) {
                logoUpload.src = event.target.result;
                localStorage.setItem('storeLogo', event.target.result);
                
                const storeData = JSON.parse(localStorage.getItem('storeData')) || {};
                storeData.logo = logoUpload.src;
                localStorage.setItem('storeData', JSON.stringify(storeData));
            };
            reader.readAsDataURL(file);
        };
        input.click();
    });

    backgroundUpload.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = function(event) {
                backgroundUpload.src = event.target.result;
                localStorage.setItem('storeBackground', event.target.result);
                
                const storeData = JSON.parse(localStorage.getItem('storeData')) || {};
                storeData.background = backgroundUpload.src;
                localStorage.setItem('storeData', JSON.stringify(storeData));
            };
            reader.readAsDataURL(file);
        };
        input.click();
    });
});