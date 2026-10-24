
/* =========================================================
   SRTA. CHIC — COISAS DA TATA
   SCRIPT.JS — PRIMEIRA VERSÃO
========================================================= */


/* =========================================================
   1. CONFIGURAÇÃO DO SUPABASE
========================================================= */

/*
    IMPORTANTE:

    Substitua os dois valores abaixo pelas informações
    do seu projeto Supabase.

    Use a chave pública anon.

    NUNCA coloque a chave service_role neste arquivo.
*/

const SUPABASE_URL = "https://zentybajdtrctqfinudc.supabase.co";

const SUPABASE_ANON_KEY = "sb_publishable_0uLVqzKFHplVv1LZq4gesA_bGOetVRa";


let supabaseClient = null;

if (
    typeof window.supabase !== "undefined" &&
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("COLE_AQUI") &&
    !SUPABASE_ANON_KEY.includes("COLE_AQUI")
) {
    supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );
}


/* =========================================================
   2. CONFIGURAÇÕES DA LOJA
========================================================= */

const STORE_NAME = "Srta. Chic — Coisas da Tata";

const WHATSAPP_NUMBER = "558199654273";

const PRODUCTS_TABLE = "products";

const CURRENCY_LOCALE = "pt-BR";

const CURRENCY_CODE = "BRL";


/* =========================================================
   3. ESTADO DA APLICAÇÃO
========================================================= */

let allProducts = [];

let filteredProducts = [];

let cart = [];

let selectedCategory = "Todos";

let selectedProduct = null;


/* =========================================================
   4. ELEMENTOS DO HTML
========================================================= */

const elements = {
    header: document.getElementById("siteHeader"),

    mainNav: document.getElementById("mainNav"),

    menuToggle: document.getElementById("menuToggle"),

    openCartButton: document.getElementById("openCartButton"),

    closeCartButton: document.getElementById("closeCartButton"),

    cartCount: document.getElementById("cartCount"),

    cartOverlay: document.getElementById("cartOverlay"),

    cartDrawer: document.getElementById("cartDrawer"),

    cartItems: document.getElementById("cartItems"),

    cartSubtotal: document.getElementById("cartSubtotal"),

    checkoutButton: document.getElementById("checkoutButton"),

    productGrid: document.getElementById("productGrid"),

    catalogStatus: document.getElementById("catalogStatus"),

    emptyCatalog: document.getElementById("emptyCatalog"),

    productSearch: document.getElementById("productSearch"),

    productSort: document.getElementById("productSort"),

    productModal: document.getElementById("productModal"),

    modalClose: document.getElementById("modalClose"),

    modalImage: document.getElementById("modalImage"),

    modalCategory: document.getElementById("modalCategory"),

    modalTitle: document.getElementById("modalTitle"),

    modalDescription: document.getElementById("modalDescription"),

    modalPrice: document.getElementById("modalPrice"),

    modalAddButton: document.getElementById("modalAddButton")
};


/* =========================================================
   5. FUNÇÕES AUXILIARES
========================================================= */


/*
    Verifica se um elemento existe.
*/

function elementExists(element) {
    return element !== null && element !== undefined;
}


/*
    Formata valores como dinheiro brasileiro.
*/

function formatPrice(value) {
    const number = Number(value) || 0;

    return new Intl.NumberFormat(
        CURRENCY_LOCALE,
        {
            style: "currency",
            currency: CURRENCY_CODE
        }
    ).format(number);
}


/*
    Escapa caracteres especiais para evitar que dados
    dos produtos sejam interpretados como HTML.
*/

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/*
    Exibe uma mensagem de status no catálogo.
*/

function setCatalogStatus(message) {
    if (elementExists(elements.catalogStatus)) {
        elements.catalogStatus.textContent = message;
    }
}


/*
    Salva o carrinho no navegador.
*/

function saveCart() {
    try {
        localStorage.setItem(
            "srtaChicCart",
            JSON.stringify(cart)
        );
    } catch (error) {
        console.warn(
            "Não foi possível salvar o carrinho.",
            error
        );
    }
}


/*
    Carrega o carrinho salvo anteriormente.
*/

function loadCart() {
    try {
        const savedCart = localStorage.getItem(
            "srtaChicCart"
        );

        if (!savedCart) {
            cart = [];
            return;
        }

        const parsedCart = JSON.parse(savedCart);

        cart = Array.isArray(parsedCart)
            ? parsedCart
            : [];

    } catch (error) {
        console.warn(
            "Não foi possível carregar o carrinho.",
            error
        );

        cart = [];
    }
}


/*
    Cria um endereço público para imagens armazenadas
    no bucket público product-images.

    No campo image_url do produto, você pode usar:

    - Um endereço completo https://...
    - Um caminho dentro do bucket, como:
      produtos/vestido.jpg
*/

function getProductImageURL(imageValue) {
    const image = String(imageValue ?? "").trim();

    if (!image) {
        return "";
    }

    if (
        image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("data:")
    ) {
        return image;
    }

    if (!SUPABASE_URL.startsWith("https://")) {
        return "";
    }

    const cleanPath = image.replace(/^\/+/, "");

    return `${SUPABASE_URL}/storage/v1/object/public/product-images/${cleanPath}`;
}


/*
    Retorna uma imagem de substituição quando o produto
    não possui imagem cadastrada.
*/

function getPlaceholderImage() {
    return `
        <div
            style="
                display:flex;
                align-items:center;
                justify-content:center;
                width:100%;
                height:100%;
                min-height:180px;
                background:#eee1d4;
                color:#79503b;
                font-size:45px;
            "
        >
            <i class="fa-solid fa-bag-shopping"></i>
        </div>
    `;
}


/* =========================================================
   6. SUPABASE — CARREGAR PRODUTOS
========================================================= */

async function loadProducts() {
    if (!supabaseClient) {
        setCatalogStatus(
            "Configure a conexão com o Supabase para carregar os produtos."
        );

        renderProducts([]);

        return;
    }

    setCatalogStatus("Carregando produtos...");

    try {
        const {
            data,
            error
        } = await supabaseClient
            .from(PRODUCTS_TABLE)
            .select("*")
            .eq("active", true)
            .order("created_at", {
                ascending: false
            });

        if (error) {
            throw error;
        }

        allProducts = Array.isArray(data)
            ? data
            : [];

        filteredProducts = [...allProducts];

        renderCategoryButtons();

        applyFilters();

        setCatalogStatus(
            `${allProducts.length} produto(s) disponível(is)`
        );

    } catch (error) {
        console.error(
            "Erro ao carregar produtos:",
            error
        );

        setCatalogStatus(
            "Não foi possível carregar os produtos. Confira a conexão com o Supabase."
        );

        renderProducts([]);
    }
}


/* =========================================================
   7. CATEGORIAS
========================================================= */

function getCategories() {
    const categories = allProducts
        .map(product => String(product.category ?? "").trim())
        .filter(Boolean);

    return [
        "Todos",
        ...new Set(categories)
    ];
}


function renderCategoryButtons() {
    const categoryButtons = document.querySelectorAll(
        "[data-category]"
    );

    if (!categoryButtons.length) {
        return;
    }

    const categories = getCategories();

    categoryButtons.forEach(button => {
        const category = button.dataset.category;

        if (!categories.includes(category)) {
            button.style.display = "none";
        } else {
            button.style.display = "";
        }

        button.classList.toggle(
            "active",
            category === selectedCategory
        );
    });
}


function selectCategory(category) {
    selectedCategory = category;

    renderCategoryButtons();

    applyFilters();
}


/* =========================================================
   8. FILTROS E PESQUISA
========================================================= */

function applyFilters() {
    const searchTerm = elementExists(elements.productSearch)
        ? elements.productSearch.value.trim().toLowerCase()
        : "";

    filteredProducts = allProducts.filter(product => {
        const name = String(product.name ?? "").toLowerCase();

        const description = String(
            product.description ?? ""
        ).toLowerCase();

        const category = String(
            product.category ?? ""
        ).toLowerCase();

        const matchesSearch =
            !searchTerm ||
            name.includes(searchTerm) ||
            description.includes(searchTerm) ||
            category.includes(searchTerm);

        const matchesCategory =
            selectedCategory === "Todos" ||
            String(product.category ?? "") === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    sortProducts();

    renderProducts(filteredProducts);
}


function sortProducts() {
    if (!elementExists(elements.productSort)) {
        return;
    }

    const sortValue = elements.productSort.value;

    if (sortValue === "price-asc") {
        filteredProducts.sort(
            (a, b) => Number(a.price) - Number(b.price)
        );
    }

    if (sortValue === "price-desc") {
        filteredProducts.sort(
            (a, b) => Number(b.price) - Number(a.price)
        );
    }

    if (sortValue === "name-asc") {
        filteredProducts.sort(
            (a, b) =>
                String(a.name ?? "").localeCompare(
                    String(b.name ?? ""),
                    "pt-BR"
                )
        );
    }
}


/* =========================================================
   9. RENDERIZAÇÃO DOS PRODUTOS
========================================================= */

function renderProducts(products) {
    if (!elementExists(elements.productGrid)) {
        return;
    }

    if (!products.length) {
        elements.productGrid.innerHTML = "";

        if (elementExists(elements.emptyCatalog)) {
            elements.emptyCatalog.classList.remove("hidden");
        }

        return;
    }

    if (elementExists(elements.emptyCatalog)) {
        elements.emptyCatalog.classList.add("hidden");
    }

    elements.productGrid.innerHTML = products
        .map(product => createProductCard(product))
        .join("");
}


function createProductCard(product) {
    const id = escapeHTML(product.id);

    const name = escapeHTML(product.name);

    const description = escapeHTML(
        product.description || "Confira os detalhes deste produto."
    );

    const category = escapeHTML(
        product.category || "Produto"
    );

    const badge = escapeHTML(
        product.badge || ""
    );

    const price = formatPrice(product.price);

    const stock = Number(product.stock) || 0;

    const imageURL = getProductImageURL(product.image_url);

    const hasImage = Boolean(imageURL);

    const imageHTML = hasImage
        ? `
            <img
                src="${escapeHTML(imageURL)}"
                alt="${name}"
                class="product-image"
                loading="lazy"
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >

            <div
                style="
                    display:none;
                    align-items:center;
                    justify-content:center;
                    width:100%;
                    height:100%;
                    min-height:180px;
                    background:#eee1d4;
                    color:#79503b;
                    font-size:45px;
                "
            >
                <i class="fa-solid fa-bag-shopping"></i>
            </div>
        `
        : getPlaceholderImage();

    const badgeHTML = badge
        ? `<span class="product-badge">${badge}</span>`
        : "";

    const stockHTML = stock > 0
        ? `<div class="product-stock">Disponível: ${stock} unidade(s)</div>`
        : `<div class="product-stock low">Produto esgotado</div>`;

    const disabledAttribute = stock <= 0
        ? "disabled"
        : "";

    return `
        <article
            class="product-card"
            data-product-id="${id}"
        >
            <div
                class="product-image-wrapper"
                data-open-product="${id}"
                role="button"
                tabindex="0"
                aria-label="Ver detalhes de ${name}"
            >
                ${badgeHTML}

                ${imageHTML}
            </div>

            <div class="product-info">
                <div class="product-category">
                    ${category}
                </div>

                <h3 class="product-name">
                    ${name}
                </h3>

                <p class="product-description">
                    ${description}
                </p>

                <div class="product-bottom">
                    <span class="product-price">
                        ${price}
                    </span>

                    <button
                        type="button"
                        class="product-add"
                        data-add-product="${id}"
                        aria-label="Adicionar ${name} ao carrinho"
                        ${disabledAttribute}
                    >
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>

                ${stockHTML}
            </div>
        </article>
    `;
}


/* =========================================================
   10. BUSCAR PRODUTO PELO ID
========================================================= */

function findProductById(productId) {
    return allProducts.find(
        product => String(product.id) === String(productId)
    );
}


/* =========================================================
   11. CARRINHO
========================================================= */

function getCartQuantity() {
    return cart.reduce(
        (total, item) => total + Number(item.quantity),
        0
    );
}


function getCartTotal() {
    return cart.reduce(
        (total, item) =>
            total + (
                Number(item.price) * Number(item.quantity)
            ),
        0
    );
}


function addToCart(productId, quantity = 1) {
    const product = findProductById(productId);

    if (!product) {
        return;
    }

    const stock = Number(product.stock) || 0;

    if (stock <= 0) {
        alert("Este produto está esgotado.");

        return;
    }

    const existingItem = cart.find(
        item => String(item.id) === String(product.id)
    );

    if (existingItem) {
        const newQuantity =
            Number(existingItem.quantity) + Number(quantity);

        if (newQuantity > stock) {
            alert(
                `Você pode adicionar no máximo ${stock} unidade(s) deste produto.`
            );

            return;
        }

        existingItem.quantity = newQuantity;

    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: Math.min(quantity, stock),
            image_url: product.image_url || "",
            stock: stock
        });
    }

    saveCart();

    renderCart();

    openCart();

    showTemporaryMessage(
        "Produto adicionado ao carrinho!"
    );
}


function removeFromCart(productId) {
    cart = cart.filter(
        item => String(item.id) !== String(productId)
    );

    saveCart();

    renderCart();
}


function changeCartQuantity(productId, change) {
    const item = cart.find(
        item => String(item.id) === String(productId)
    );

    if (!item) {
        return;
    }

    const product = findProductById(productId);

    const stock = product
        ? Number(product.stock) || 0
        : Number(item.stock) || 0;

    const newQuantity =
        Number(item.quantity) + Number(change);

    if (newQuantity <= 0) {
        removeFromCart(productId);

        return;
    }

    if (newQuantity > stock) {
        alert(
            `Você pode adicionar no máximo ${stock} unidade(s) deste produto.`
        );

        return;
    }

    item.quantity = newQuantity;

    saveCart();

    renderCart();
}


function renderCart() {
    if (elementExists(elements.cartCount)) {
        elements.cartCount.textContent = getCartQuantity();
    }

    if (elementExists(elements.cartSubtotal)) {
        elements.cartSubtotal.textContent = formatPrice(
            getCartTotal()
        );
    }

    if (!elementExists(elements.cartItems)) {
        return;
    }

    if (!cart.length) {
        elements.cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fa-solid fa-bag-shopping"></i>

                <h3>Seu carrinho está vazio</h3>

                <p>Adicione produtos para começar seu pedido.</p>
            </div>
        `;

        if (elementExists(elements.checkoutButton)) {
            elements.checkoutButton.disabled = true;
        }

        return;
    }

    if (elementExists(elements.checkoutButton)) {
        elements.checkoutButton.disabled = false;
    }

    elements.cartItems.innerHTML = cart
        .map(item => createCartItem(item))
        .join("");
}


function createCartItem(item) {
    const imageURL = getProductImageURL(
        item.image_url
    );

    const imageHTML = imageURL
        ? `
            <img
                src="${escapeHTML(imageURL)}"
                alt="${escapeHTML(item.name)}"
                class="cart-item-image"
            >
        `
        : `
            <div
                class="cart-item-image"
                style="
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    color:#79503b;
                    font-size:25px;
                "
            >
                <i class="fa-solid fa-bag-shopping"></i>
            </div>
        `;

    return `
        <div class="cart-item">
            ${imageHTML}

            <div class="cart-item-info">
                <div class="cart-item-name">
                    ${escapeHTML(item.name)}
                </div>

                <div class="cart-item-price">
                    ${formatPrice(item.price)}
                </div>

                <div class="cart-item-quantity">
                    <button
                        type="button"
                        class="quantity-button"
                        data-decrease-item="${escapeHTML(item.id)}"
                        aria-label="Diminuir quantidade"
                    >
                        <i class="fa-solid fa-minus"></i>
                    </button>

                    <span class="quantity-value">
                        ${item.quantity}
                    </span>

                    <button
                        type="button"
                        class="quantity-button"
                        data-increase-item="${escapeHTML(item.id)}"
                        aria-label="Aumentar quantidade"
                    >
                        <i class="fa-solid fa-plus"></i>
                    </button>
                </div>
            </div>

            <button
                type="button"
                class="remove-cart-item"
                data-remove-item="${escapeHTML(item.id)}"
                aria-label="Remover ${escapeHTML(item.name)}"
            >
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `;
}


/* =========================================================
   12. ABRIR E FECHAR O CARRINHO
========================================================= */

function openCart() {
    if (elementExists(elements.cartOverlay)) {
        elements.cartOverlay.classList.add("active");
    }

    if (elementExists(elements.cartDrawer)) {
        elements.cartDrawer.classList.add("active");
    }

    document.body.classList.add("cart-open");
}


function closeCart() {
    if (elementExists(elements.cartOverlay)) {
        elements.cartOverlay.classList.remove("active");
    }

    if (elementExists(elements.cartDrawer)) {
        elements.cartDrawer.classList.remove("active");
    }

    document.body.classList.remove("cart-open");
}


/* =========================================================
   13. MODAL DO PRODUTO
========================================================= */

function openProductModal(productId) {
    const product = findProductById(productId);

    if (!product || !elementExists(elements.productModal)) {
        return;
    }

    selectedProduct = product;

    const imageURL = getProductImageURL(
        product.image_url
    );

    if (elementExists(elements.modalImage)) {
        if (imageURL) {
            elements.modalImage.src = imageURL;
            elements.modalImage.alt = product.name;
            elements.modalImage.style.display = "block";
        } else {
            elements.modalImage.removeAttribute("src");
            elements.modalImage.alt = "";
            elements.modalImage.style.display = "none";
        }
    }

    if (elementExists(elements.modalCategory)) {
        elements.modalCategory.textContent =
            product.category || "Produto";
    }

    if (elementExists(elements.modalTitle)) {
        elements.modalTitle.textContent =
            product.name || "Produto";
    }

    if (elementExists(elements.modalDescription)) {
        elements.modalDescription.textContent =
            product.description || "Confira os detalhes deste produto.";
    }

    if (elementExists(elements.modalPrice)) {
        elements.modalPrice.textContent =
            formatPrice(product.price);
    }

    if (elementExists(elements.modalAddButton)) {
        elements.modalAddButton.disabled =
            Number(product.stock) <= 0;

        elements.modalAddButton.textContent =
            Number(product.stock) <= 0
                ? "Produto esgotado"
                : "Adicionar ao carrinho";
    }

    elements.productModal.classList.add("active");

    document.body.classList.add("modal-open");
}


function closeProductModal() {
    if (!elementExists(elements.productModal)) {
        return;
    }

    elements.productModal.classList.remove("active");

    document.body.classList.remove("modal-open");

    selectedProduct = null;
}


/* =========================================================
   14. PEDIDO PELO WHATSAPP
========================================================= */

function createWhatsAppMessage() {
    if (!cart.length) {
        return "";
    }

    let message = `Olá! Gostaria de fazer um pedido na ${STORE_NAME}.\n\n`;

    message += "*MEU PEDIDO*\n";

    message += "--------------------------\n";

    cart.forEach(item => {
        const subtotal =
            Number(item.price) * Number(item.quantity);

        message +=
            `${item.quantity}x ${item.name} — ${formatPrice(subtotal)}\n`;
    });

    message += "--------------------------\n";

    message += `*Total: ${formatPrice(getCartTotal())}*\n\n`;

    message += "Gostaria de receber as informações para finalizar o pedido.";

    return message;
}


function checkoutViaWhatsApp() {
    if (!cart.length) {
        alert("Seu carrinho está vazio.");

        return;
    }

    const message = createWhatsAppMessage();

    const encodedMessage = encodeURIComponent(message);

    const whatsappURL =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;

    window.open(
        whatsappURL,
        "_blank",
        "noopener,noreferrer"
    );
}


/* =========================================================
   15. MENSAGEM TEMPORÁRIA
========================================================= */

function showTemporaryMessage(message) {
    let notification = document.getElementById(
        "temporaryNotification"
    );

    if (!notification) {
        notification = document.createElement("div");

        notification.id = "temporaryNotification";

        notification.style.position = "fixed";
        notification.style.bottom = "25px";
        notification.style.left = "50%";
        notification.style.zIndex = "3000";
        notification.style.padding = "13px 20px";
        notification.style.borderRadius = "999px";
        notification.style.background = "#2a1b15";
        notification.style.color = "#ffffff";
        notification.style.fontSize = "13px";
        notification.style.fontWeight = "600";
        notification.style.transform = "translateX(-50%)";
        notification.style.boxShadow = "0 8px 25px rgba(0,0,0,0.2)";

        document.body.appendChild(notification);
    }

    notification.textContent = message;

    notification.style.display = "block";

    window.clearTimeout(
        notification.hideTimer
    );

    notification.hideTimer = window.setTimeout(() => {
        notification.style.display = "none";
    }, 2500);
}


/* =========================================================
   16. MENU MOBILE
========================================================= */

function toggleMobileMenu() {
    if (!elementExists(elements.mainNav)) {
        return;
    }

    elements.mainNav.classList.toggle("active");

    if (elementExists(elements.menuToggle)) {
        const isOpen =
            elements.mainNav.classList.contains("active");

        elements.menuToggle.setAttribute(
            "aria-expanded",
            String(isOpen)
        );
    }
}


function closeMobileMenu() {
    if (elementExists(elements.mainNav)) {
        elements.mainNav.classList.remove("active");
    }

    if (elementExists(elements.menuToggle)) {
        elements.menuToggle.setAttribute(
            "aria-expanded",
            "false"
        );
    }
}


/* =========================================================
   17. EVENTOS DOS ELEMENTOS
========================================================= */

function setupEvents() {
    /*
        Menu mobile
    */

    if (elementExists(elements.menuToggle)) {
        elements.menuToggle.addEventListener(
            "click",
            toggleMobileMenu
        );
    }


    /*
        Fechar menu ao clicar em um link
    */

    if (elementExists(elements.mainNav)) {
        elements.mainNav
            .querySelectorAll("a")
            .forEach(link => {
                link.addEventListener(
                    "click",
                    closeMobileMenu
                );
            });
    }


    /*
        Abrir carrinho
    */

    if (elementExists(elements.openCartButton)) {
        elements.openCartButton.addEventListener(
            "click",
            openCart
        );
    }


    /*
        Fechar carrinho
    */

    if (elementExists(elements.closeCartButton)) {
        elements.closeCartButton.addEventListener(
            "click",
            closeCart
        );
    }


    if (elementExists(elements.cartOverlay)) {
        elements.cartOverlay.addEventListener(
            "click",
            closeCart
        );
    }


    /*
        Finalizar pedido
    */

    if (elementExists(elements.checkoutButton)) {
        elements.checkoutButton.addEventListener(
            "click",
            checkoutViaWhatsApp
        );
    }


    /*
        Pesquisa
    */

    if (elementExists(elements.productSearch)) {
        elements.productSearch.addEventListener(
            "input",
            applyFilters
        );
    }


    /*
        Ordenação
    */

    if (elementExists(elements.productSort)) {
        elements.productSort.addEventListener(
            "change",
            applyFilters
        );
    }


    /*
        Modal
    */

    if (elementExists(elements.modalClose)) {
        elements.modalClose.addEventListener(
            "click",
            closeProductModal
        );
    }


    if (elementExists(elements.productModal)) {
        elements.productModal.addEventListener(
            "click",
            event => {
                if (event.target === elements.productModal) {
                    closeProductModal();
                }
            }
        );
    }


    /*
        Adicionar ao carrinho no modal
    */

    if (elementExists(elements.modalAddButton)) {
        elements.modalAddButton.addEventListener(
            "click",
            () => {
                if (selectedProduct) {
                    addToCart(selectedProduct.id);
                }
            }
        );
    }


    /*
        Categorias
    */

    document.addEventListener(
        "click",
        event => {
            const categoryButton =
                event.target.closest("[data-category]");

            if (categoryButton) {
                selectCategory(
                    categoryButton.dataset.category
                );
            }
        }
    );


    /*
        Botões de adicionar, abrir detalhes e
        controles do carrinho.
    */

    document.addEventListener(
        "click",
        event => {
            const addButton =
                event.target.closest("[data-add-product]");

            if (addButton) {
                addToCart(
                    addButton.dataset.addProduct
                );

                return;
            }


            const openProductButton =
                event.target.closest("[data-open-product]");

            if (openProductButton) {
                openProductModal(
                    openProductButton.dataset.openProduct
                );

                return;
            }


            const increaseButton =
                event.target.closest("[data-increase-item]");

            if (increaseButton) {
                changeCartQuantity(
                    increaseButton.dataset.increaseItem,
                    1
                );

                return;
            }


            const decreaseButton =
                event.target.closest("[data-decrease-item]");

            if (decreaseButton) {
                changeCartQuantity(
                    decreaseButton.dataset.decreaseItem,
                    -1
                );

                return;
            }


            const removeButton =
                event.target.closest("[data-remove-item]");

            if (removeButton) {
                removeFromCart(
                    removeButton.dataset.removeItem
                );
            }
        }
    );


    /*
        Tecla ESC fecha modal e carrinho.
    */

    document.addEventListener(
        "keydown",
        event => {
            if (event.key !== "Escape") {
                return;
            }

            closeCart();

            closeProductModal();

            closeMobileMenu();
        }
    );
}


/* =========================================================
   18. CABEÇALHO AO ROLAR A PÁGINA
========================================================= */

function setupScrollHeader() {
    if (!elementExists(elements.header)) {
        return;
    }

    function updateHeader() {
        elements.header.classList.toggle(
            "scrolled",
            window.scrollY > 20
        );
    }

    window.addEventListener(
        "scroll",
        updateHeader,
        {
            passive: true
        }
    );

    updateHeader();
}


/* =========================================================
   19. INICIALIZAÇÃO
========================================================= */

async function initializeApp() {
    loadCart();

    setupEvents();

    setupScrollHeader();

    renderCart();

    await loadProducts();
}


if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        initializeApp
    );
} else {
    initializeApp();
}
