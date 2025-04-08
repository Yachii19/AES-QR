// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// Encryption
document.getElementById('encryptBtn').addEventListener('click', hideMessageInImage);
document.getElementById('downloadBtn').addEventListener('click', downloadModifiedImage);
document.getElementById('generateKeyBtn').addEventListener('click', generateKey);
document.getElementById('copyKeyBtn').addEventListener('click', copyKeyToClipboard);
document.getElementById('encryptionKey').addEventListener('input', validateKeyInput);

// Decryption
document.getElementById('decryptBtn').addEventListener('click', extractMessageFromImage);
document.getElementById('newDecryptBtn').addEventListener('click', resetDecrypt);

// File upload handling
document.getElementById('imageUploadArea').addEventListener('click', () => {
    document.getElementById('imageInput').click();
});

document.getElementById('hiddenImageUploadArea').addEventListener('click', () => {
    document.getElementById('hiddenImageInput').click();
});

document.getElementById('imageInput').addEventListener('change', handleImageUpload);
document.getElementById('hiddenImageInput').addEventListener('change', handleHiddenImageUpload);

// Drag and drop handling
const uploadAreas = [
    document.getElementById('imageUploadArea'),
    document.getElementById('hiddenImageUploadArea')
];

uploadAreas.forEach(area => {
    // Add these essential drag events
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.style.borderColor = '#323741'; // Visual feedback
    });

    area.addEventListener('dragleave', () => {
        area.style.borderColor = '#ccc'; // Reset visual feedback
    });

    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.style.borderColor = '#ccc'; // Reset visual feedback
        
        if (e.dataTransfer.files.length) {
            const inputId = area.id === 'imageUploadArea' ? 'imageInput' : 'hiddenImageInput';
            const inputElement = document.getElementById(inputId);
            
            // Clear previous files and assign new ones
            inputElement.files = e.dataTransfer.files;
            
            // Trigger the change event
            const event = new Event('change');
            inputElement.dispatchEvent(event);
        }
    });
});
let currentEncryptedMessage = null;
let currentEncryptionKey = null;
let currentModifiedImage = null;

// Function to validate that the key length matches the AES mode requirement
function validateKey(key, mode) {
    const requiredLength = { "128": 16, "192": 24, "256": 32 };
    const modeNum = mode.split('-')[1];
    
    if (key.length !== requiredLength[modeNum]) {
        return false;
    }
    return true;
}

function validateKeyInput() {
    const key = document.getElementById('encryptionKey').value;
    const mode = document.getElementById('encryptionType').value;
    const validationMessage = document.getElementById('keyValidationMessage');
    
    if (!key) {
        validationMessage.classList.add('hidden');
        return true;
    }
    
    const modeNum = mode.split('-')[1];
    const isValid = validateKey(key, mode);
    
    if (!isValid) {
        validationMessage.textContent = `Key must be exactly ${modeNum/8} bytes (${modeNum} bits) for ${mode}`;
        validationMessage.classList.remove('hidden');
        return false;
    } else {
        validationMessage.classList.add('hidden');
        return true;
    }
}

function generateKey() {
    const mode = document.getElementById('encryptionType').value;
    const modeNum = mode.split('-')[1];
    const keyLengths = { "128": 16, "192": 24, "256": 32 };
    
    let generatedKey = CryptoJS.lib.WordArray.random(keyLengths[modeNum])
        .toString(CryptoJS.enc.Base64)
        .replace(/[^a-zA-Z0-9]/g, '')
        .substring(0, keyLengths[modeNum]);
        
    document.getElementById('encryptionKey').value = generatedKey;
    validateKeyInput();
}

function copyKeyToClipboard() {
    const key = document.getElementById('encryptionKey').value;
    if (!key) {
        alertPopup('No key to copy');
        return;
    }
    
    navigator.clipboard.writeText(key).then(() => {
        alertPopup('Key copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy key: ', err);
        alertPopup('Failed to copy key');
    });
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const imgPreview = document.querySelector('#imageUploadArea .img-box');
    imgPreview.innerHTML = ''; // Clear previous content
    
    const img = document.createElement('img');
    img.onload = function() {
        URL.revokeObjectURL(img.src); // Clean up memory
    };
    img.src = URL.createObjectURL(file);
    imgPreview.appendChild(img);
}


function handleHiddenImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const imgPreview = document.getElementById('hiddenImagePreview');
    const uploadBox = document.querySelector('#hiddenImageUploadArea .img-box');
    
    imgPreview.onload = function() {
        URL.revokeObjectURL(imgPreview.src); // Clean up memory
    };
    imgPreview.src = URL.createObjectURL(file);
    imgPreview.classList.remove('hidden');
    uploadBox.classList.add('hidden');
}

function hideMessageInImage() {
    const plainText = document.getElementById('plainText').value.trim();
    const encryptionType = document.getElementById('encryptionType').value;
    const key = document.getElementById('encryptionKey').value;
    const imageFile = document.getElementById('imageInput').files[0];
    
    if (!plainText) {
        alertPopup('Please enter text to encrypt');
        return;
    }
    
    if (!key) {
        alertPopup('Please enter or generate an encryption key');
        return;
    }
    
    if (!validateKeyInput()) {
        return;
    }
    
    if (!imageFile) {
        alertPopup('Please select an image to hide the message in');
        return;
    }
    
    const encryptBtn = document.getElementById('encryptBtn');
    encryptBtn.disabled = true;
    encryptBtn.textContent = 'Encrypting...';
    
    try {
        const modeNum = encryptionType.split('-')[1];
        const keyBytes = CryptoJS.enc.Utf8.parse(key);
        const iv = CryptoJS.lib.WordArray.random(128/8);
        
        // Encrypt with proper parameters
        const encrypted = CryptoJS.AES.encrypt(plainText, keyBytes, { 
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });
        
        currentEncryptedMessage = encrypted.toString();
        currentEncryptionKey = key;
        
        // Read the image file
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.getElementById('outputCanvas');
                const ctx = canvas.getContext('2d');
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                // Prepare the message to hide (encrypted + IV + type)
                const payload = {
                    e: currentEncryptedMessage,
                    i: iv.toString(CryptoJS.enc.Hex),
                    t: encryptionType
                };
                const messageToHide = JSON.stringify(payload) + "|END|";
                
                // Convert message to binary
                const binaryMessage = stringToBinary(messageToHide);
                
                // Get image data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Check if message fits in image
                if (binaryMessage.length > data.length * 3) { // Using only RGB channels
                    encryptBtn.disabled = false;
                    encryptBtn.textContent = 'Hide Message in Image';
                    alertPopup('Message too large for this image! Try a larger image or shorter message.');
                    return;
                }
                
                // Hide message in LSB of RGB channels
                for (let i = 0; i < binaryMessage.length; i++) {
                    const pixelPos = Math.floor(i / 3);
                    const channel = i % 3; // 0=R, 1=G, 2=B
                    
                    // Modify LSB
                    data[pixelPos * 4 + channel] = (data[pixelPos * 4 + channel] & 0xFE) | parseInt(binaryMessage[i]);
                }
                
                ctx.putImageData(imageData, 0, 0);
                currentModifiedImage = canvas.toDataURL("image/png");
                
                encryptBtn.disabled = false;
                encryptBtn.textContent = 'Hide Message in Image';
                document.getElementById('resultContainer').classList.remove('hidden');
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(imageFile);
    } catch (error) {
        encryptBtn.disabled = false;
        encryptBtn.textContent = 'Hide Message in Image';
        console.error(error);
        alertPopup('Encryption error: ' + error.message);
    }
}

function downloadModifiedImage() {
    if (!currentModifiedImage) return;
    
    const link = document.createElement('a');
    link.download = 'hidden_message.png';
    link.href = currentModifiedImage;
    link.click();
}

function extractMessageFromImage() {
    const key = document.getElementById('decryptionKey').value.trim();
    const imageFile = document.getElementById('hiddenImageInput').files[0];
    
    if (!key) {
        alertPopup('Please enter the decryption key');
        return;
    }
    
    if (!imageFile) {
        alertPopup('Please select an image containing a hidden message');
        return;
    }
    
    const decryptBtn = document.getElementById('decryptBtn');
    decryptBtn.disabled = true;
    decryptBtn.textContent = 'Decrypting...';
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let binaryMessage = "";
            
            // Extract LSBs from RGB channels
            for (let i = 0; i < data.length; i++) {
                const pixelPos = Math.floor(i / 4);
                const channel = i % 4;
                
                if (channel < 3) { // Only check RGB channels
                    binaryMessage += (data[pixelPos * 4 + channel] & 1).toString();
                    
                    // Check for end marker
                    const currentString = binaryToString(binaryMessage);
                    if (currentString.includes("|END|")) {
                        try {
                            const payloadStr = currentString.split("|END|")[0];
                            const payload = JSON.parse(payloadStr);
                            
                            // Verify we have all required fields
                            if (!payload.e || !payload.i || !payload.t) {
                                throw new Error("Invalid hidden message format");
                            }
                            
                            // Decrypt the message
                            const decrypted = CryptoJS.AES.decrypt(
                                payload.e,
                                CryptoJS.enc.Utf8.parse(key),
                                { 
                                    iv: CryptoJS.enc.Hex.parse(payload.i),
                                    padding: CryptoJS.pad.Pkcs7,
                                    mode: CryptoJS.mode.CBC
                                }
                            );
                            
                            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
                            
                            if (decryptedText) {
                                document.getElementById('decryptedMessage').textContent = decryptedText;
                                document.getElementById('decryptedResult').classList.remove('hidden');
                            } else {
                                throw new Error("Decryption failed - invalid key or corrupted data");
                            }
                            
                            break;
                        } catch (e) {
                            console.error('Error extracting message:', e);
                            alertPopup('Error: ' + e.message);
                            break;
                        }
                    }
                }
            }
            
            decryptBtn.disabled = false;
            decryptBtn.textContent = 'Extract Hidden Message';
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(imageFile);
}

function resetDecrypt() {
    document.getElementById('hiddenImageInput').value = '';
    document.getElementById('hiddenImagePreview').src = '';
    document.getElementById('hiddenImagePreview').classList.add('hidden');
    document.querySelector('#hiddenImageUploadArea .img-box').classList.remove('hidden');
    document.getElementById('decryptionKey').value = '';
    document.getElementById('decryptedResult').classList.add('hidden');
}

// Helper: Convert string to binary
function stringToBinary(str) {
    return str.split('').map(char => 
        char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join('');
}

// Helper: Convert binary to string
function binaryToString(binary) {
    let str = "";
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substr(i, 8);
        str += String.fromCharCode(parseInt(byte, 2));
    }
    return str;
}

// Custom alert function
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