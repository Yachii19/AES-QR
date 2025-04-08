// Tab switching functionality
document.querySelectorAll('.tab').forEach(tab => {
    // Add click event listener to each tab
    tab.addEventListener('click', () => {
        // Remove 'active' class from all tabs
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        // Remove 'active' class from all tab contents
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        // Add 'active' class to clicked tab
        tab.classList.add('active');
        // Show corresponding tab content based on data-tab attribute
        document.getElementById(tab.dataset.tab).classList.add('active');
        
        // If switching away from decrypt tab and scanner is active, stop it
        if (tab.dataset.tab !== 'decrypt' && window.scannerStream) {
            stopScanner();
        }
    });
});

// Encryption button event listeners
document.getElementById('encryptBtn').addEventListener('click', generateEncryptedQR);
document.getElementById('downloadBtn').addEventListener('click', downloadQRCode);
document.getElementById('generateKeyBtn').addEventListener('click', generateKey);
document.getElementById('copyKeyBtn').addEventListener('click', copyKeyToClipboard);
document.getElementById('encryptionKey').addEventListener('input', validateKeyInput);

// Global variables to store encryption data
let currentQRCodeData = null;  // Stores the encrypted QR code data
let currentEncryptionKey = null;  // Stores the encryption key

// Validates if key length matches AES requirements
function validateKey(key, mode) {
    // Required key lengths for different AES modes (in bytes)
    const requiredLength = { "128": 16, "192": 24, "256": 32 };
    // Extract the number from mode (e.g., "AES-128" -> "128")
    const modeNum = mode.split('-')[1];
    
    // Check if key length matches requirement
    if (key.length !== requiredLength[modeNum]) {
        return false;
    }
    return true;
}

// Validates key input in real-time
function validateKeyInput() {
    // Get current key and mode values
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

// Generates a random encryption key
function generateKey() {
    // Get selected encryption mode
    const mode = document.getElementById('encryptionType').value;
    const modeNum = mode.split('-')[1];
    // Key lengths for different AES modes
    const keyLengths = { "128": 16, "192": 24, "256": 32 };
    
    // Generate random key using CryptoJS
    let generatedKey = CryptoJS.lib.WordArray.random(keyLengths[modeNum])
        .toString(CryptoJS.enc.Base64)  // Convert to Base64 string
        .replace(/[^a-zA-Z0-9]/g, '')  // Remove special characters
        .substring(0, keyLengths[modeNum]);  // Trim to required length
        
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

// Generates encrypted QR code
function generateEncryptedQR() {
    // Get input values
    const plainText = document.getElementById('plainText').value.trim();
    const encryptionType = document.getElementById('encryptionType').value;
    const key = document.getElementById('encryptionKey').value;
    
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
    
    // Update button state during encryption
    const encryptBtn = document.getElementById('encryptBtn');
    encryptBtn.disabled = true;
    encryptBtn.textContent = 'Encrypting...';
    
    try {
        const modeNum = encryptionType.split('-')[1];
        
        // Prepare key and initialization vector
        const keyBytes = CryptoJS.enc.Utf8.parse(key);
        const iv = CryptoJS.lib.WordArray.random(128/8);
        
        // Encrypt the plaintext
        const encrypted = CryptoJS.AES.encrypt(plainText, keyBytes, { 
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });
        
        // Create payload with encryption details
        const payload = {
            e: encrypted.toString(),  // encrypted data
            k: keyBytes.toString(CryptoJS.enc.Hex),  // key in hex
            i: iv.toString(CryptoJS.enc.Hex),   // initialization vector
            t: encryptionType,       // encryption type
            v: 1                     // version
        };
        
        // Store payload data globally
        const payloadString = JSON.stringify(payload);
        currentQRCodeData = payloadString;
        currentEncryptionKey = key;
        
        // Generate QR code
        const canvas = document.getElementById('qrCodeCanvas');
        QRCode.toCanvas(canvas, payloadString, {
            width: 150,
            errorCorrectionLevel: 'H'  // High error correction
        }, (error) => {
            // Reset button state
            encryptBtn.disabled = false;
            encryptBtn.textContent = 'Generate Encrypted QR Code';
            
            if (error) {
                console.error(error);
                alertPopup('Error generating QR code: ' + error.message);
            } else {
                // Show QR code container
                document.getElementById('qrCodeContainer').classList.remove('hidden');
            }
        });
    } catch (error) {
        // Handle errors
        encryptBtn.disabled = false;
        encryptBtn.textContent = 'Generate Encrypted QR Code';
        console.error(error);
        alertPopup('Encryption error: ' + error.message);
    }
}

// Downloads the generated QR code
function downloadQRCode() {
    if (!currentQRCodeData) return;
    
    // Create download link for QR code
    const canvas = document.getElementById('qrCodeCanvas');
    const link = document.createElement('a');
    link.download = 'encrypted-message.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Decryption section
let scannerActive = false;  // Tracks scanner state

// Set up decryption event listeners
document.getElementById('scanBtn').addEventListener('click', startScanner);
document.getElementById('uploadBtn').addEventListener('click', showUploadOption);
document.getElementById('stopScanBtn').addEventListener('click', stopScanner);
document.getElementById('newScanBtn').addEventListener('click', () => {
    resetDecrypt();
    document.querySelector('.img-box').classList.remove('hidden');
});

// File upload handling
document.getElementById('uploadArea').addEventListener('click', () => {
    // Trigger file input when upload area is clicked
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', handleFileUpload);

// Drag and drop handling
const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#323741';  // Visual feedback
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ccc';  // Reset visual feedback
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
    if (e.dataTransfer.files.length) {
        // Handle dropped files
        handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
});

document.getElementById('processImageBtn').addEventListener('click', processUploadedImage);

// Shows file upload option
function showUploadOption() {
    stopScanner();
    document.getElementById('fileUploadContainer').classList.remove('hidden');
    document.getElementById('scannerContainer').classList.add('hidden');
    document.getElementById('uploadStatus').textContent = '';
    document.getElementById('uploadStatus').className = '';
}

// Starts QR code scanner
function startScanner() {
    // Update UI for scanner mode
    document.getElementById('fileUploadContainer').classList.add('hidden');
    document.getElementById('scanBtn').classList.add('hidden');
    document.getElementById('stopScanBtn').classList.remove('hidden');
    document.getElementById('scannerContainer').classList.remove('hidden');
    document.getElementById('decryptedResult').classList.add('hidden');
    
    const video = document.getElementById('scanner');
    const cameraStatus = document.getElementById('cameraStatus');
    cameraStatus.textContent = 'Initializing camera...';
    cameraStatus.className = '';
    
    // Stop any existing camera stream
    if (window.scannerStream) {
        window.scannerStream.getTracks().forEach(track => track.stop());
    }
    
    // Start camera stream
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            window.scannerStream = stream;
            video.srcObject = stream;
            video.play();
            scannerActive = true;
            cameraStatus.textContent = 'Scanning for QR codes...';
            
            // Set up QR code scanning
            const canvasElement = document.createElement('canvas');
            const canvas = canvasElement.getContext('2d');
            
            // Function to scan each video frame
            function scanFrame() {
                if (!scannerActive) return;
                
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    // Draw video frame to canvas
                    canvasElement.height = video.videoHeight;
                    canvasElement.width = video.videoWidth;
                    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                    const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
                    
                    // Scan for QR codes
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'attemptBoth'
                    });
                    
                    if (code) {
                        // QR code found
                        cameraStatus.textContent = 'QR code detected!';
                        cameraStatus.className = 'success-message';
                        processQRCodeData(code.data);
                    }
                }
                // Continue scanning
                requestAnimationFrame(scanFrame);
            }
            
            // Start scanning
            scanFrame();
        })
        .catch(err => {
            // Handle camera errors
            console.error('Camera error:', err);
            cameraStatus.textContent = 'Camera error: ' + err.message;
            cameraStatus.className = 'error-message';
            stopScanner();
        });
}

// Handles file uploads
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = '';
    statusDiv.className = '';
    
    // Verify file is an image
    if (!file.type.match('image.*')) {
        statusDiv.textContent = 'Please upload an image file (JPEG, PNG, etc.)';
        statusDiv.className = 'error-message';
        return;
    }
    
    // Read the file
    const reader = new FileReader();
    reader.onload = function(e) {
        // Display image preview
        const imgPreview = document.getElementById('imagePreview');
        imgPreview.src = e.target.result;
        imgPreview.classList.remove('hidden');
        document.querySelector('.img-box').classList.add('hidden');
        // Store image data for processing
        imgPreview.dataset.imageData = e.target.result;
    };
    reader.onerror = function() {
        document.getElementById('uploadStatus').textContent = 'Error reading file';
        document.getElementById('uploadStatus').className = 'error-message';
    };
    reader.readAsDataURL(file);
}

// Processes uploaded image to find QR code
function processUploadedImage() {
    const imgPreview = document.getElementById('imagePreview');
    const statusDiv = document.getElementById('uploadStatus');
    const processingDiv = document.getElementById('imageProcessing');
    
    // Reset status messages
    statusDiv.innerHTML = '';
    statusDiv.className = '';
    processingDiv.classList.remove('hidden');
    
    if (!imgPreview.dataset.imageData) {
        statusDiv.textContent = 'No image to process';
        statusDiv.className = 'error-message';
        processingDiv.classList.add('hidden');
        return;
    }
    
    const img = new Image();
    img.onload = function() {
        // Verify image loaded correctly
        if (img.width === 0 || img.height === 0) {
            statusDiv.textContent = 'Invalid image dimensions';
            statusDiv.className = 'error-message';
            processingDiv.classList.add('hidden');
            return;
        }

        // Process image after short delay
        setTimeout(() => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Limit dimensions for performance
                const maxDimension = 2000;
                let width = img.width;
                let height = img.height;
                
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension/width, maxDimension/height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                // Draw image to canvas
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Scan for QR code
                const imageData = ctx.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, width, height, {
                    inversionAttempts: 'attemptBoth'
                });
                
                processingDiv.classList.add('hidden');
                
                if (code) {
                    // QR code found
                    statusDiv.textContent = 'QR code found!';
                    statusDiv.className = 'success-message';
                    processQRCodeData(code.data);
                } else {
                    // No QR code found
                    statusDiv.innerHTML = `
                        <p class="error-message">No QR code found in the image.</p>
                        <p><strong>Tips:</strong></p>
                        <ul>
                            <li>Use a clear, high-quality image</li>
                            <li>Ensure the QR code is properly lit</li>
                            <li>Crop the image to focus on the QR code</li>
                        </ul>
                    `;
                }
            } catch (e) {
                // Handle processing errors
                processingDiv.classList.add('hidden');
                statusDiv.textContent = 'Error processing image: ' + e.message;
                statusDiv.className = 'error-message';
                console.error('Image processing error:', e);
            }
        }, 100);
    };
    
    img.onerror = function() {
        processingDiv.classList.add('hidden');
        statusDiv.textContent = 'Error loading image';
        statusDiv.className = 'error-message';
    };
    
    img.src = imgPreview.dataset.imageData;
}

// Processes QR code data and decrypts message
function processQRCodeData(qrData) {
    try {
        // Parse QR code data
        const payload = JSON.parse(qrData);
        
        // Verify payload structure
        if (payload && payload.e && payload.k && payload.i && payload.t && payload.v === 1) {
            stopScanner();
            document.getElementById('fileUploadContainer').classList.add('hidden');
            document.querySelector('.img-box').classList.add('hidden');
            
            // Get decryption key
            const decryptionKey = document.getElementById('decryptionKey').value.trim();
            if (!decryptionKey) {
                alertPopup('Please enter the decryption key');
                document.querySelector('.img-box').classList.remove('hidden');
                resetDecrypt();
                return;
            }
            
            // Verify key matches
            const storedKeyHex = payload.k;
            const inputKeyHex = CryptoJS.enc.Utf8.parse(decryptionKey).toString(CryptoJS.enc.Hex);
            
            if (storedKeyHex !== inputKeyHex) {
                alertPopup('Decryption key does not match the key used for encryption');
                document.querySelector('.img-box').classList.remove('hidden');
                resetDecrypt();
                return;
            }
            
            // Decrypt the message
            const decrypted = CryptoJS.AES.decrypt(
                payload.e,
                CryptoJS.enc.Hex.parse(payload.k),
                { 
                    iv: CryptoJS.enc.Hex.parse(payload.i),
                    padding: CryptoJS.pad.Pkcs7,
                    mode: CryptoJS.mode.CBC
                }
            );
            
            const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
            
            if (decryptedText) {
                // Display decrypted message
                document.getElementById('decryptedMessage').textContent = decryptedText;
                document.getElementById('decryptedResult').classList.remove('hidden');
            } else {
                throw new Error('Decryption failed - invalid key or corrupted data');
            }
        } else {
            throw new Error('Invalid QR code format - not generated by this app');
        }
    } catch (e) {
        // Handle errors
        console.error('Error processing QR code:', e);
        alertPopup('Error: ' + e.message);
        document.querySelector('.img-box').classList.remove('hidden');
        resetDecrypt();
    }
}

// Stops the QR code scanner
function stopScanner() {
    scannerActive = false;
    // Update UI
    document.getElementById('scanBtn').classList.remove('hidden');
    document.getElementById('stopScanBtn').classList.add('hidden');
    document.getElementById('scannerContainer').classList.add('hidden');
    document.getElementById('cameraStatus').textContent = '';
    
    // Stop camera stream
    if (window.scannerStream) {
        window.scannerStream.getTracks().forEach(track => track.stop());
        window.scannerStream = null;
    }
}

// Resets decryption interface
function resetDecrypt() {
    stopScanner();
    document.getElementById('fileUploadContainer').classList.add('hidden');
    document.getElementById('decryptedResult').classList.add('hidden');
    document.getElementById('fileInput').value = '';
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreview').classList.add('hidden');
    document.getElementById('uploadStatus').textContent = '';
    document.getElementById('uploadStatus').className = '';
    document.getElementById('imageProcessing').classList.add('hidden');
    document.getElementById('decryptionKey').value = '';
}

// Custom alert popup function
function alertPopup(message) {
    const alertElement = document.getElementById("customAlert");
    const alertMessage = document.getElementById("alertMessage");
    const closeButton = document.getElementById("alertCloseButton");

    // Set message and show alert
    alertMessage.textContent = message;
    document.body.classList.add("modal-open");
    alertElement.style.display = "flex";

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