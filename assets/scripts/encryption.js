document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.add('active');
        
        if (tab.dataset.tab !== 'decrypt' && window.scannerStream) {
            stopScanner();
        }
    });
});

// Encryption
document.getElementById('encryptBtn').addEventListener('click', generateEncryptedQR);
document.getElementById('downloadBtn').addEventListener('click', downloadQRCode);
document.getElementById('generateKeyBtn').addEventListener('click', generateKey);
document.getElementById('copyKeyBtn').addEventListener('click', copyKeyToClipboard);
document.getElementById('encryptionKey').addEventListener('input', validateKeyInput);

let currentQRCodeData = null;
let currentEncryptionKey = null;

// Function to validate that the key length matches the AES mode requirement
function validateKey(key, mode) {
    // Define the required key lengths for AES-128, AES-192, and AES-256
    const requiredLength = { "128": 16, "192": 24, "256": 32 };
    const modeNum = mode.split('-')[1];
    
    // Check if the provided key length matches the required length
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
    
    // Generate a random key using CryptoJS
    let generatedKey = CryptoJS.lib.WordArray.random(keyLengths[modeNum])
        .toString(CryptoJS.enc.Base64) // Convert key to Base64 string
        .replace(/[^a-zA-Z0-9]/g, '') // Remove non-alphanumeric characters to ensure clean key
        .substring(0, keyLengths[modeNum]); // Ensure the key has the correct length
        
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

function generateEncryptedQR() {
    const plainText = document.getElementById('plainText').value.trim();
    const encryptionType = document.getElementById('encryptionType').value;
    const key = document.getElementById('encryptionKey').value;
    
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
    
    const encryptBtn = document.getElementById('encryptBtn');
    encryptBtn.disabled = true;
    encryptBtn.textContent = 'Encrypting...';
    
    try {
        const modeNum = encryptionType.split('-')[1];
        
        // Convert key to CryptoJS format
        const keyBytes = CryptoJS.enc.Utf8.parse(key);
        const iv = CryptoJS.lib.WordArray.random(128/8);
        
        // Encrypt with proper parameters
        const encrypted = CryptoJS.AES.encrypt(plainText, keyBytes, { 
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });
        
        // Create payload with proper encoding
        const payload = {
            e: encrypted.toString(),  // encrypted data
            k: keyBytes.toString(CryptoJS.enc.Hex),  // key in hex
            i: iv.toString(CryptoJS.enc.Hex),   // iv
            t: encryptionType,       // type
            v: 1                     // version
        };
        
        // Stringify and encode
        const payloadString = JSON.stringify(payload);
        currentQRCodeData = payloadString;
        currentEncryptionKey = key;
        
        // Generate QR code with the raw JSON string
        const canvas = document.getElementById('qrCodeCanvas');
        QRCode.toCanvas(canvas, payloadString, {
            width: 150,
            errorCorrectionLevel: 'H'
        }, (error) => {
            encryptBtn.disabled = false;
            encryptBtn.textContent = 'Generate Encrypted QR Code';
            
            if (error) {
                console.error(error);
                alertPopup('Error generating QR code: ' + error.message);
            } else {
                document.getElementById('qrCodeContainer').classList.remove('hidden');
            }
        });
    } catch (error) {
        encryptBtn.disabled = false;
        encryptBtn.textContent = 'Generate Encrypted QR Code';
        console.error(error);
        alertPopup('Encryption error: ' + error.message);
    }
}

function downloadQRCode() {
    if (!currentQRCodeData) return;
    
    const canvas = document.getElementById('qrCodeCanvas');
    const link = document.createElement('a');
    link.download = 'encrypted-message.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Decryption
let scannerActive = false;

document.getElementById('scanBtn').addEventListener('click', startScanner);
document.getElementById('uploadBtn').addEventListener('click', showUploadOption);
document.getElementById('stopScanBtn').addEventListener('click', stopScanner);
document.getElementById('newScanBtn').addEventListener('click', () => {
    resetDecrypt();
    document.querySelector('.img-box').classList.remove('hidden');
});

// File upload handling
document.getElementById('uploadArea').addEventListener('click', () => {
    document.getElementById('fileInput').click();
});

document.getElementById('fileInput').addEventListener('change', handleFileUpload);

// Drag and drop handling
const uploadArea = document.getElementById('uploadArea');
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#323741';
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.style.borderColor = '#ccc';
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.style.borderColor = '#ccc';
    if (e.dataTransfer.files.length) {
        handleFileUpload({ target: { files: e.dataTransfer.files } });
    }
});

document.getElementById('processImageBtn').addEventListener('click', processUploadedImage);

function showUploadOption() {
    stopScanner();
    document.getElementById('fileUploadContainer').classList.remove('hidden');
    document.getElementById('scannerContainer').classList.add('hidden');
    document.getElementById('uploadStatus').textContent = '';
    document.getElementById('uploadStatus').className = '';
}

function startScanner() {
    document.getElementById('fileUploadContainer').classList.add('hidden');
    document.getElementById('scanBtn').classList.add('hidden');
    document.getElementById('stopScanBtn').classList.remove('hidden');
    document.getElementById('scannerContainer').classList.remove('hidden');
    document.getElementById('decryptedResult').classList.add('hidden');
    
    const video = document.getElementById('scanner');
    const cameraStatus = document.getElementById('cameraStatus');
    cameraStatus.textContent = 'Initializing camera...';
    cameraStatus.className = '';
    
    // Stop any existing stream
    if (window.scannerStream) {
        window.scannerStream.getTracks().forEach(track => track.stop());
    }
    
    // Start new stream
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            window.scannerStream = stream;
            video.srcObject = stream;
            video.play();
            scannerActive = true;
            cameraStatus.textContent = 'Scanning for QR codes...';
            
            // Initialize QR code scanner
            const canvasElement = document.createElement('canvas');
            const canvas = canvasElement.getContext('2d');
            
            function scanFrame() {
                if (!scannerActive) return;
                
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvasElement.height = video.videoHeight;
                    canvasElement.width = video.videoWidth;
                    canvas.drawImage(video, 0, 0, canvasElement.width, canvasElement.height);
                    const imageData = canvas.getImageData(0, 0, canvasElement.width, canvasElement.height);
                    
                    const code = jsQR(imageData.data, imageData.width, imageData.height, {
                        inversionAttempts: 'attemptBoth'
                    });
                    
                    if (code) {
                        cameraStatus.textContent = 'QR code detected!';
                        cameraStatus.className = 'success-message';
                        processQRCodeData(code.data);
                    }
                }
                requestAnimationFrame(scanFrame);
            }
            
            scanFrame();
        })
        .catch(err => {
            console.error('Camera error:', err);
            cameraStatus.textContent = 'Camera error: ' + err.message;
            cameraStatus.className = 'error-message';
            stopScanner();
        });
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const statusDiv = document.getElementById('uploadStatus');
    statusDiv.innerHTML = '';
    statusDiv.className = '';
    
    // Check if file is an image
    if (!file.type.match('image.*')) {
        statusDiv.textContent = 'Please upload an image file (JPEG, PNG, etc.)';
        statusDiv.className = 'error-message';
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const imgPreview = document.getElementById('imagePreview');
        imgPreview.src = e.target.result;
        imgPreview.classList.remove('hidden');
        document.querySelector('.img-box').classList.add('hidden');
        // Store the image data for processing when button is clicked
        imgPreview.dataset.imageData = e.target.result;
    };
    reader.onerror = function() {
        document.getElementById('uploadStatus').textContent = 'Error reading file';
        document.getElementById('uploadStatus').className = 'error-message';
    };
    reader.readAsDataURL(file);
}

function processUploadedImage() {
    const imgPreview = document.getElementById('imagePreview');
    const statusDiv = document.getElementById('uploadStatus');
    const processingDiv = document.getElementById('imageProcessing');
    
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
        // Verify image has loaded properly
        if (img.width === 0 || img.height === 0) {
            statusDiv.textContent = 'Invalid image dimensions';
            statusDiv.className = 'error-message';
            processingDiv.classList.add('hidden');
            return;
        }

        setTimeout(() => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Limit maximum dimensions to prevent crashes
                const maxDimension = 2000;
                let width = img.width;
                let height = img.height;
                
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension/width, maxDimension/height);
                    width = Math.floor(width * ratio);
                    height = Math.floor(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const imageData = ctx.getImageData(0, 0, width, height);
                const code = jsQR(imageData.data, width, height, {
                    inversionAttempts: 'attemptBoth'
                });
                
                processingDiv.classList.add('hidden');
                
                if (code) {
                    statusDiv.textContent = 'QR code found!';
                    statusDiv.className = 'success-message';
                    processQRCodeData(code.data);
                } else {
                    statusDiv.innerHTML = `
                        <p class="error-message">No QR code found in the image.</p>
                        <p><strong>Tips:</strong></p>
                        <ul>
                            <li>Use a clear, high-quality image</li>
                            <li>Ensure the QR code is properly lit</li>
                            <li>Crop the image to focus on the QR code</li>
                        </ul>
                    `;
                    processBtn.classList.remove('hidden');
                }
            } catch (e) {
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

function processQRCodeData(qrData) {
    try {
        // Try to parse the QR code data directly as JSON
        const payload = JSON.parse(qrData);
        
        // Verify it's our encrypted data structure
        if (payload && payload.e && payload.k && payload.i && payload.t && payload.v === 1) {
            stopScanner();
            document.getElementById('fileUploadContainer').classList.add('hidden');
            document.querySelector('.img-box').classList.add('hidden');
            
            // Get the decryption key from input
            const decryptionKey = document.getElementById('decryptionKey').value.trim();
            if (!decryptionKey) {
                alertPopup('Please enter the decryption key');
                document.querySelector('.img-box').classList.remove('hidden');
                resetDecrypt();
                return;
            }
            
            // Convert the stored key (hex) and input key to comparable formats
            const storedKeyHex = payload.k;
            const inputKeyHex = CryptoJS.enc.Utf8.parse(decryptionKey).toString(CryptoJS.enc.Hex);
            
            // Verify the keys match
            if (storedKeyHex !== inputKeyHex) {
                alertPopup('Decryption key does not match the key used for encryption');
                document.querySelector('.img-box').classList.remove('hidden');
                resetDecrypt();
                return;
            }
            
            // Decrypt the data
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
                document.getElementById('decryptedMessage').textContent = decryptedText;
                document.getElementById('decryptedResult').classList.remove('hidden');
            } else {
                throw new Error('Decryption failed - invalid key or corrupted data');
                
            }
        } else {
            throw new Error('Invalid QR code format - not generated by this app');
            
        }
    } catch (e) {
        console.error('Error processing QR code:', e);
        alertPopup('Error: ' + e.message);
        document.querySelector('.img-box').classList.remove('hidden');
        resetDecrypt();
    }
}

function stopScanner() {
    scannerActive = false;
    document.getElementById('scanBtn').classList.remove('hidden');
    document.getElementById('stopScanBtn').classList.add('hidden');
    document.getElementById('scannerContainer').classList.add('hidden');
    document.getElementById('cameraStatus').textContent = '';
    
    if (window.scannerStream) {
        window.scannerStream.getTracks().forEach(track => track.stop());
        window.scannerStream = null;
    }
}

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