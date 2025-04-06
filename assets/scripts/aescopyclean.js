function validateKey(key, mode) {
    let requiredLength = { "128": 16, "192": 24, "256": 32 };
    if (key.length !== requiredLength[mode]) {
        alertPopup(`Key must be exactly ${requiredLength[mode]} characters for AES-${mode}`);
        return false;
    }
    return true;
}

function encryptMessage() {
    let message = document.getElementById("message").value;
    let key = document.getElementById("key").value;
    let mode = document.getElementById("encryptionMode").value;

    if (!message || !key) {
        alertPopup("Please enter both message and key");
        return;
    }

    if (!validateKey(key, mode)) {
        return;
    }

    let keyBytes = CryptoJS.enc.Utf8.parse(key);

    let encrypted = CryptoJS.AES.encrypt(message, keyBytes, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString();

    document.getElementById("output").value = encrypted;
}

function decryptMessage() {
    let encryptedMessage = document.getElementById("output").value;
    let key = document.getElementById("key").value;
    let mode = document.getElementById("encryptionMode").value;

    if (!encryptedMessage || !key) {
        alertPopup("Please enter both encrypted message and key");
        return;
    }

    if (!validateKey(key, mode)) return;

    let keyBytes = CryptoJS.enc.Utf8.parse(key);

    let decrypted = CryptoJS.AES.decrypt(encryptedMessage, keyBytes, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8);

    if (!decrypted) {
        alertPopup("Decryption failed. Check the key.");
        return;
    }

    document.getElementById("output").value = decrypted;
}

function generateKey() {
    let mode = document.getElementById("encryptionMode").value;
    let keyLengths = { "128": 16, "192": 24, "256": 32 };

    let generatedKey = CryptoJS.lib.WordArray.random(keyLengths[mode])
        .toString(CryptoJS.enc.Base64)
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, keyLengths[mode]);

    document.getElementById("generatedKey").value = generatedKey;
}

function clearAll() {
    let message = document.getElementById("message");
    let key = document.getElementById("key");
    let generatedKey = document.getElementById("generatedKey");
    let output = document.getElementById("output");

    message.value = "";
    key.value = "";
    generatedKey.value = "";
    output.value = "";
}

function alertPopup(message) {
    const alertElement = document.getElementById("customAlert");
    const alertMessage = document.getElementById("alertMessage");
    const closeButton = document.getElementById("alertCloseButton");

    alertMessage.textContent = message;
    document.body.classList.add("modal-open");
    alertElement.style.display = "flex";

    closeButton.onclick = function() {
        alertElement.style.display = "none";
        document.body.classList.remove("modal-open");
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            alertElement.style.display = "none";
            document.body.classList.remove("modal-open");
        }
    });
}