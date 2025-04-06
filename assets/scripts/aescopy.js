// Function to validate that the key length matches the AES mode requirement
function validateKey(key, mode) {
    // Define the required key lengths for AES-128, AES-192, and AES-256
    let requiredLength = { "128": 16, "192": 24, "256": 32 };

    // Check if the provided key length matches the required length
    if (key.length !== requiredLength[mode]) {
        alertPopup(`Key must be exactly ${requiredLength[mode]} characters for AES-${mode}`); // Show error message if key is invalid using the custom popUp function I made
        return false; // Return false indicating invalid key
    }
    return true; // Return true if key is valid
}

// Function to encrypt the message
function encryptMessage() {
    let message = document.getElementById("message").value; // Get message input
    let key = document.getElementById("key").value; // Get encryption key input
    let mode = document.getElementById("encryptionMode").value; // Get selected encryption mode

    // Check if message and key are provided
    if (!message || !key) {
        alertPopup("Please enter both message and key"); // Show error message if inputs are missing using the custom popUp function I made
        return;
    }

    // Validate the key length
    if (!validateKey(key, mode)) {
        return;
    } // Stop execution if key is invalid

    
    /* Convert the key which is a string to CryptoJS-compatible format na gagawing hexcode per characters example nalang if nag input ka ng "m" magiging "6d" */
    let keyBytes = CryptoJS.enc.Utf8.parse(key);

    /* Encrypt the message using AES na provided na ni CryptoJs dito na mangyayari yung 4 steps per round encryption method*/
    let encrypted = CryptoJS.AES.encrypt(message, keyBytes, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString(); // Convert ulit yung encrypted output back to string

    document.getElementById("output").value = encrypted; // Display the encrypted message in output field
}

// Function to decrypt the encrypted message
function decryptMessage() {
    let encryptedMessage = document.getElementById("output").value; // Get encrypted message from output field
    let key = document.getElementById("key").value; // Get decryption key input
    let mode = document.getElementById("encryptionMode").value; // Get selected encryption mode

    // Check if encrypted message and key are provided
    if (!encryptedMessage || !key) {
        alertPopup("Please enter both encrypted message and key"); // Show error message if inputs are missing uisng the Popup function I made
        return;
    }

    // Validate the key length
    if (!validateKey(key, mode)) {
        return
    }; // Stop execution if key is invalid

    let keyBytes = CryptoJS.enc.Utf8.parse(key); /* Convert the key which is a string to CryptoJS-compatible format na gagawing hexcode per characters example nalang if nag input ka ng "m" magiging "6d" */

    // Decrypt the message using AES in ECB mode with PKCS7 padding
    let decrypted = CryptoJS.AES.decrypt(encryptedMessage, keyBytes, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString(CryptoJS.enc.Utf8); // Convert decrypted output to a readable UTF-8 string

    // Check if decryption was successful
    if (!decrypted) {
        alertPopup("Decryption failed. Check the key."); // Show error message if decryption fails using the Popup function I made
        return;
    }

    document.getElementById("output").value = decrypted; // Display the decrypted message in output field
}

// Function to generate a random AES key with the correct length
function generateKey() {
    let mode = document.getElementById("encryptionMode").value; // Get selected encryption mode
    let keyLengths = { "128": 16, "192": 24, "256": 32 }; // Define required key lengths for AES modes

    // Generate a random key using CryptoJS
    let generatedKey = CryptoJS.lib.WordArray.random(keyLengths[mode])
        .toString(CryptoJS.enc.Base64) // Convert key to Base64 string
        .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters to ensure clean key
        .substring(0, keyLengths[mode]); // Ensure the key has the correct length

    document.getElementById("generatedKey").value = generatedKey; // Display the generated key in the output field
}

// Function to clear all input and output fields
function clearAll() {
    let message = document.getElementById("message"); // Get message input field
    let key = document.getElementById("key"); // Get key input field
    let generatedKey = document.getElementById("generatedKey"); // Get generated key field
    let output = document.getElementById("output"); // Get output field

    message.value = ""; // Clear message input
    key.value = ""; // Clear key input
    generatedKey.value = ""; // Clear generated key
    output.value = ""; // Clear output field
}

function alertPopup(message) {
    const alertElement = document.getElementById("customAlert");
    const alertMessage = document.getElementById("alertMessage");
    const closeButton = document.getElementById("alertCloseButton");

    alertMessage.textContent = message;
    document.body.classList.add("modal-open"); // Using the overflow hidden in css
    alertElement.style.display = "flex"; // Show the alert

    closeButton.onclick = function() {
        alertElement.style.display = "none"; // Hide the alert
        document.body.classList.remove("modal-open"); // Removes the overflow hidden using css
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            alertElement.style.display = "none";
            document.body.classList.remove("modal-open");
        }
    });
}