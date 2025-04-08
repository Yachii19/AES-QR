// TAB SWITCHING FUNCTIONALITY

// Select all elements with class 'tab' and add click event listeners
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove 'active' class from all tabs to reset state
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        // Remove 'active' class from all tab content panels
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add 'active' class to the clicked tab
        tab.classList.add('active');
        // Show the corresponding content panel using data-tab attribute
        document.getElementById(tab.dataset.tab).classList.add('active');
    });
});

// ENCRYPTION EVENT LISTENERS

// When encrypt button is clicked, run hideMessageInImage function
document.getElementById('encryptBtn').addEventListener('click', hideMessageInImage);
// When download button is clicked, run downloadModifiedImage function
document.getElementById('downloadBtn').addEventListener('click', downloadModifiedImage);
// When generate key button is clicked, run generateKey function
document.getElementById('generateKeyBtn').addEventListener('click', generateKey);
// When copy key button is clicked, run copyKeyToClipboard function
document.getElementById('copyKeyBtn').addEventListener('click', copyKeyToClipboard);
// Validate key input whenever it changes
document.getElementById('encryptionKey').addEventListener('input', validateKeyInput);

// DECRYPTION EVENT LISTENERS

// When decrypt button is clicked, run extractMessageFromImage function
document.getElementById('decryptBtn').addEventListener('click', extractMessageFromImage);
// When new decrypt button is clicked, run resetDecrypt function
document.getElementById('newDecryptBtn').addEventListener('click', resetDecrypt);

// FILE UPLOAD HANDLING

// Click handler for image upload area (triggers hidden file input)
document.getElementById('imageUploadArea').addEventListener('click', () => {
    document.getElementById('imageInput').click();
});

// Click handler for hidden image upload area (triggers hidden file input)
document.getElementById('hiddenImageUploadArea').addEventListener('click', () => {
    document.getElementById('hiddenImageInput').click();
});

// Handle when an image is selected for upload
document.getElementById('imageInput').addEventListener('change', handleImageUpload);
// Handle when a hidden image is selected for upload
document.getElementById('hiddenImageInput').addEventListener('change', handleHiddenImageUpload);

// DRAG AND DROP HANDLING

// Array containing both upload areas
const uploadAreas = [
    document.getElementById('imageUploadArea'),
    document.getElementById('hiddenImageUploadArea')
];

// Add drag and drop events to each upload area
uploadAreas.forEach(area => {
    // When file is dragged over the area
    area.addEventListener('dragover', (e) => {
        e.preventDefault(); // Prevent default browser behavior
        area.style.borderColor = '#323741'; // Visual feedback by changing border color
    });

    // When file is dragged out of the area
    area.addEventListener('dragleave', () => {
        area.style.borderColor = '#ccc'; // Reset border color
    });

    // When file is dropped in the area
    area.addEventListener('drop', (e) => {
        e.preventDefault(); // Prevent default browser behavior
        area.style.borderColor = '#ccc'; // Reset border color
        
        // Check if files were dropped
        if (e.dataTransfer.files.length) {
            // Determine which input this is based on area ID
            const inputId = area.id === 'imageUploadArea' ? 'imageInput' : 'hiddenImageInput';
            const inputElement = document.getElementById(inputId);
            
            // Assign the dropped files to the input element
            inputElement.files = e.dataTransfer.files;
            
            // Create and dispatch a change event to trigger the upload handler
            const event = new Event('change');
            inputElement.dispatchEvent(event);
        }
    });
});

// GLOBAL VARIABLES

let currentEncryptedMessage = null; // Stores the current encrypted message
let currentEncryptionKey = null; // Stores the current encryption key
let currentModifiedImage = null; // Stores the modified image with hidden message

// KEY VALIDATION FUNCTIONS

// Validates if key length matches AES mode requirements
function validateKey(key, mode) {
    // Required key lengths for AES modes (in bytes)
    const requiredLength = { "128": 16, "192": 24, "256": 32 };
    // Extract the number from mode (e.g., "AES-128" -> "128")
    const modeNum = mode.split('-')[1];
    
    // Check if key length matches requirement
    if (key.length !== requiredLength[modeNum]) {
        return false;
    }
    return true;
}

// Validates the key input in real-time
function validateKeyInput() {
    // Get current values from form
    const key = document.getElementById('encryptionKey').value;
    const mode = document.getElementById('encryptionType').value;
    const validationMessage = document.getElementById('keyValidationMessage');
    
    // If no key entered, hide validation message
    if (!key) {
        validationMessage.classList.add('hidden');
        return true;
    }
    
    // Check if key is valid
    const modeNum = mode.split('-')[1];
    const isValid = validateKey(key, mode);
    
    // Show appropriate validation message
    if (!isValid) {
        validationMessage.textContent = `Key must be exactly ${modeNum/8} bytes (${modeNum} bits) for ${mode}`;
        validationMessage.classList.remove('hidden');
        return false;
    } else {
        validationMessage.classList.add('hidden');
        return true;
    }
}

// KEY GENERATION AND COPY FUNCTIONS

// Generates a random encryption key
function generateKey() {
    // Get selected encryption mode
    const mode = document.getElementById('encryptionType').value;
    const modeNum = mode.split('-')[1];
    // Key lengths for different AES modes
    const keyLengths = { "128": 16, "192": 24, "256": 32 };
    
    // Generate random key using CryptoJS
    let generatedKey = CryptoJS.lib.WordArray.random(keyLengths[modeNum])
        .toString(CryptoJS.enc.Base64) // Convert to Base64 string
        .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
        .substring(0, keyLengths[modeNum]); // Trim to required length
        
    // Set generated key in input field
    document.getElementById('encryptionKey').value = generatedKey;
    // Validate the generated key
    validateKeyInput();
}

// Copies encryption key to clipboard
function copyKeyToClipboard() {
    const key = document.getElementById('encryptionKey').value;
    // Check if there's a key to copy
    if (!key) {
        alertPopup('No key to copy');
        return;
    }
    
    // Use clipboard API to copy key
    navigator.clipboard.writeText(key).then(() => {
        alertPopup('Key copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy key: ', err);
        alertPopup('Failed to copy key');
    });
}

// IMAGE UPLOAD HANDLERS

// Handles image upload for encryption
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return; // Exit if no file selected
    
    // Get reference to preview container
    const imgPreview = document.querySelector('#imageUploadArea .img-box');
    imgPreview.innerHTML = ''; // Clear previous content
    
    // Create new image element for preview
    const img = document.createElement('img');
    // Clean up memory when image loads
    img.onload = function() {
        URL.revokeObjectURL(img.src);
    };
    // Set image source to uploaded file
    img.src = URL.createObjectURL(file);
    // Add image to preview container
    imgPreview.appendChild(img);
}

// Handles hidden image upload for decryption
function handleHiddenImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return; // Exit if no file selected
    
    // Get references to preview elements
    const imgPreview = document.getElementById('hiddenImagePreview');
    const uploadBox = document.querySelector('#hiddenImageUploadArea .img-box');
    
    // Clean up memory when image loads
    imgPreview.onload = function() {
        URL.revokeObjectURL(imgPreview.src);
    };
    // Set image source to uploaded file
    imgPreview.src = URL.createObjectURL(file);
    // Show preview and hide upload box
    imgPreview.classList.remove('hidden');
    uploadBox.classList.add('hidden');
}

// MESSAGE ENCRYPTION AND HIDING

// Hides encrypted message in an image
function hideMessageInImage() {
    // Get input values
    const plainText = document.getElementById('plainText').value.trim();
    const encryptionType = document.getElementById('encryptionType').value;
    const key = document.getElementById('encryptionKey').value;
    const imageFile = document.getElementById('imageInput').files[0];
    
    // Validate inputs
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
    
    // Update button state during processing
    const encryptBtn = document.getElementById('encryptBtn');
    encryptBtn.disabled = true;
    encryptBtn.textContent = 'Encrypting...';
    
    try {
        // Extract AES mode number (128, 192, or 256)
        const modeNum = encryptionType.split('-')[1];
        // Convert key to CryptoJS format
        const keyBytes = CryptoJS.enc.Utf8.parse(key);
        // Generate random initialization vector
        const iv = CryptoJS.lib.WordArray.random(128/8);
        
        // Encrypt the plaintext with AES
        const encrypted = CryptoJS.AES.encrypt(plainText, keyBytes, { 
            iv: iv, // Initialization vector
            padding: CryptoJS.pad.Pkcs7, // PKCS7 padding
            mode: CryptoJS.mode.CBC // Cipher Block Chaining mode
        });
        
        // Store encrypted message and key globally
        currentEncryptedMessage = encrypted.toString();
        currentEncryptionKey = key;
        
        // Read the image file
        const reader = new FileReader();
        reader.onload = function(e) {
            // Create image element to get dimensions
            const img = new Image();
            img.onload = function() {
                // Get canvas and context for image manipulation
                const canvas = document.getElementById('outputCanvas');
                const ctx = canvas.getContext('2d');
                
                // Set canvas dimensions to match image
                canvas.width = img.width;
                canvas.height = img.height;
                // Draw image on canvas
                ctx.drawImage(img, 0, 0);
                
                // Prepare payload with encrypted data and metadata
                const payload = {
                    e: currentEncryptedMessage, // Encrypted message
                    i: iv.toString(CryptoJS.enc.Hex), // IV in hex
                    t: encryptionType // Encryption type
                };
                // Add end marker to payload string
                const messageToHide = JSON.stringify(payload) + "|END|";
                
                // Convert message to binary string
                const binaryMessage = stringToBinary(messageToHide);
                
                // Get image pixel data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                
                // Check if message fits in image (using only RGB channels)
                if (binaryMessage.length > data.length * 3) {
                    // Reset button if message is too large
                    encryptBtn.disabled = false;
                    encryptBtn.textContent = 'Hide Message in Image';
                    alertPopup('Message too large for this image! Try a larger image or shorter message.');
                    return;
                }
                
                // Hide message in LSB of RGB channels
                for (let i = 0; i < binaryMessage.length; i++) {
                    // Calculate pixel position and channel (R, G, or B)
                    const pixelPos = Math.floor(i / 3);
                    const channel = i % 3; // 0=R, 1=G, 2=B
                    
                    // Modify least significant bit of the channel
                    data[pixelPos * 4 + channel] = (data[pixelPos * 4 + channel] & 0xFE) | parseInt(binaryMessage[i]);
                }
                
                // Put modified data back on canvas
                ctx.putImageData(imageData, 0, 0);
                // Store modified image as data URL
                currentModifiedImage = canvas.toDataURL("image/png");
                
                // Reset button and show result
                encryptBtn.disabled = false;
                encryptBtn.textContent = 'Hide Message in Image';
                document.getElementById('resultContainer').classList.remove('hidden');
            };
            // Set image source to uploaded file
            img.src = e.target.result;
        };
        // Read file as data URL
        reader.readAsDataURL(imageFile);
    } catch (error) {
        // Handle errors during encryption
        encryptBtn.disabled = false;
        encryptBtn.textContent = 'Hide Message in Image';
        console.error(error);
        alertPopup('Encryption error: ' + error.message);
    }
}

// DOWNLOAD FUNCTION

// Downloads the modified image with hidden message
function downloadModifiedImage() {
    if (!currentModifiedImage) return; // Exit if no modified image
    
    // Create download link
    const link = document.createElement('a');
    link.download = 'hidden_message.png'; // Set filename
    link.href = currentModifiedImage; // Set image data as href
    link.click(); // Trigger download
}

// MESSAGE EXTRACTION AND DECRYPTION

// Extracts and decrypts hidden message from image
function extractMessageFromImage() {
    // Get decryption key and image file
    const key = document.getElementById('decryptionKey').value.trim();
    const imageFile = document.getElementById('hiddenImageInput').files[0];
    
    // Validate inputs
    if (!key) {
        alertPopup('Please enter the decryption key');
        return;
    }
    
    if (!imageFile) {
        alertPopup('Please select an image containing a hidden message');
        return;
    }
    
    // Update button state during processing
    const decryptBtn = document.getElementById('decryptBtn');
    decryptBtn.disabled = true;
    decryptBtn.textContent = 'Decrypting...';
    
    // Read the image file
    const reader = new FileReader();
    reader.onload = function(e) {
        // Create image element to get dimensions
        const img = new Image();
        img.onload = function() {
            // Create canvas for image processing
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match image
            canvas.width = img.width;
            canvas.height = img.height;
            // Draw image on canvas
            ctx.drawImage(img, 0, 0);
            
            // Get image pixel data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            let binaryMessage = ""; // Store extracted binary message
            
            // Extract LSBs from RGB channels
            for (let i = 0; i < data.length; i++) {
                // Calculate pixel position and channel
                const pixelPos = Math.floor(i / 4);
                const channel = i % 4;
                
                // Only process RGB channels (skip alpha)
                if (channel < 3) {
                    // Get LSB and add to binary message
                    binaryMessage += (data[pixelPos * 4 + channel] & 1).toString();
                    
                    // Check if we've found the end marker
                    const currentString = binaryToString(binaryMessage);
                    if (currentString.includes("|END|")) {
                        try {
                            // Extract payload before end marker
                            const payloadStr = currentString.split("|END|")[0];
                            // Parse JSON payload
                            const payload = JSON.parse(payloadStr);
                            
                            // Verify required fields exist
                            if (!payload.e || !payload.i || !payload.t) {
                                throw new Error("Invalid hidden message format");
                            }
                            
                            // Decrypt the message
                            const decrypted = CryptoJS.AES.decrypt(
                                payload.e, // Encrypted message
                                CryptoJS.enc.Utf8.parse(key), // Decryption key
                                { 
                                    iv: CryptoJS.enc.Hex.parse(payload.i), // IV
                                    padding: CryptoJS.pad.Pkcs7, // PKCS7 padding
                                    mode: CryptoJS.mode.CBC // CBC mode
                                }
                            );
                            
                            // Convert decrypted data to UTF-8 string
                            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
                            
                            if (decryptedText) {
                                // Display decrypted message
                                document.getElementById('decryptedMessage').textContent = decryptedText;
                                document.getElementById('decryptedResult').classList.remove('hidden');
                            } else {
                                throw new Error("Decryption failed - invalid key or corrupted data");
                            }
                            
                            break; // Stop processing once message is found
                        } catch (e) {
                            // Handle decryption errors
                            console.error('Error extracting message:', e);
                            alertPopup('Error: ' + e.message);
                            break;
                        }
                    }
                }
            }
            
            // Reset button state
            decryptBtn.disabled = false;
            decryptBtn.textContent = 'Extract Hidden Message';
        };
        // Set image source to uploaded file
        img.src = e.target.result;
    };
    // Read file as data URL
    reader.readAsDataURL(imageFile);
}

// RESET FUNCTION

// Resets the decryption interface
function resetDecrypt() {
    // Clear file input
    document.getElementById('hiddenImageInput').value = '';
    // Reset image preview
    document.getElementById('hiddenImagePreview').src = '';
    document.getElementById('hiddenImagePreview').classList.add('hidden');
    // Show upload box again
    document.querySelector('#hiddenImageUploadArea .img-box').classList.remove('hidden');
    // Clear decryption key
    document.getElementById('decryptionKey').value = '';
    // Hide decrypted result
    document.getElementById('decryptedResult').classList.add('hidden');
}

// HELPER FUNCTIONS

// Converts string to binary representation
function stringToBinary(str) {
    return str.split('').map(char => 
        // Convert each character to 8-bit binary
        char.charCodeAt(0).toString(2).padStart(8, '0')
    ).join(''); // Combine all bits into single string
}

// Converts binary string back to original string
function binaryToString(binary) {
    let str = "";
    // Process 8 bits at a time (1 byte = 1 character)
    for (let i = 0; i < binary.length; i += 8) {
        const byte = binary.substr(i, 8);
        // Convert byte to character and add to string
        str += String.fromCharCode(parseInt(byte, 2));
    }
    return str;
}

// CUSTOM ALERT FUNCTION

// Shows a custom alert popup
function alertPopup(message) {
    // Get alert elements
    const alertElement = document.getElementById("customAlert");
    const alertMessage = document.getElementById("alertMessage");
    const closeButton = document.getElementById("alertCloseButton");

    // Set message and show alert
    alertMessage.textContent = message;
    document.body.classList.add("modal-open"); // Prevent scrolling
    alertElement.style.display = "flex"; // Show alert

    // Close button handler
    closeButton.onclick = function() {
        alertElement.style.display = "none";
        document.body.classList.remove("modal-open");
    }

    // ESC key handler
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            alertElement.style.display = "none";
            document.body.classList.remove("modal-open");
        }
    });
}