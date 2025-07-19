class DocumentPrint {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.images = [];
        this.imageSizes = [];
        this.documentId = '';
        this.layout = 'A4';
        this.init();
    }

    init() {
        this.setCanvasSize('A4');
        this.clearCanvas();
        this.bindEvents();
        this.renderDynamicUploaders();
    }

    setCanvasSize(layout) {
        if (layout === 'A5') {
            this.canvas.width = 559; // 148mm at 96dpi
            this.canvas.height = 794; // 210mm at 96dpi
        } else {
            this.canvas.width = 794; // 210mm at 96dpi
            this.canvas.height = 1123; // 297mm at 96dpi
        }
    }

    bindEvents() {
        document.getElementById('layoutSelect').addEventListener('change', (e) => {
            this.layout = e.target.value;
            this.setCanvasSize(this.layout);
            this.redrawCanvas();
        });
        document.getElementById('addImageBtn').addEventListener('click', () => {
            this.addImageUploader();
        });
        document.getElementById('documentId').addEventListener('input', (e) => {
            this.documentId = e.target.value;
            this.redrawCanvas();
        });
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearAll();
        });
        document.getElementById('printBtn').addEventListener('click', () => {
            this.printCanvas();
        });
        const shareBtn = document.getElementById('shareBtn');
        if (shareBtn) {
            shareBtn.addEventListener('click', () => {
                this.shareCanvasImage();
            });
        }
    }
    async shareCanvasImage() {
        if (this.images.length === 0 || this.images.every(img => img === null)) {
            alert('Please upload at least one image before sharing.');
            return;
        }
        // Convert canvas to blob
        this.canvas.toBlob(async (blob) => {
            if (!blob) {
                alert('Failed to generate image.');
                return;
            }
            const file = new File([blob], 'document-print.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Document Print',
                        text: 'Here is the document image.'
                    });
                } catch (err) {
                    // User cancelled or error
                }
            } else {
                // Fallback: download the image
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'document-print.png';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }, 100);
                alert('Sharing is not supported on this device. The image has been downloaded instead.');
            }
        }, 'image/png');
    }

    renderDynamicUploaders() {
        const container = document.getElementById('dynamic-upload-controls');
        container.innerHTML = '';
        this.images.forEach((img, idx) => {
            const group = document.createElement('div');
            group.className = 'upload-group';
            group.innerHTML = `
                <div class="upload-card">
                    <div class="card-header">
                        <div class="card-icon">${idx + 1}</div>
                        <h3>Image</h3>
                        <button type="button" class="btn btn-secondary remove-image-btn" data-idx="${idx}" style="margin-left:auto;flex : none">🗑️ Remove</button>
                    </div>
                    <div class="upload-area">
                        <label class="upload-label">
                            <div class="upload-box upload-box-gallery">
                                <div class="upload-content">
                                    <span class="upload-icon">📁</span>
                                    <span class="upload-text">${img ? '✓ Image Selected' : 'Choose Image'}</span>
                                    <span class="upload-hint">Click or drag & drop</span>
                                </div>
                            </div>
                            <input type="file" accept="image/*" class="file-input image-input" data-idx="${idx}">
                        </label>
                    </div>
                    <div class="size-controls" id="sizeControls${idx}" style="${img ? '' : 'display:none;'}">
                        <div class="control-header">
                            <span class="control-icon">📏</span>
                            <span class="control-label">Image Size</span>
                        </div>
                        <div class="slider-container">
                            <input type="range" min="50" max="${this.layout === 'A4' ? 400 : 300}" value="${this.imageSizes[idx] || 300}" class="size-slider image-size-slider" data-idx="${idx}">
                            <span class="size-display" id="sizeDisplay${idx}">${this.imageSizes[idx] || 200}px</span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(group);
        });
        // Add event listeners for new uploaders
        container.querySelectorAll('.image-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.handleDynamicImageUpload(e);
            });
        });
        container.querySelectorAll('.remove-image-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                this.removeImageUploader(idx);
            });
        });
        container.querySelectorAll('.image-size-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const idx = parseInt(e.target.getAttribute('data-idx'));
                this.imageSizes[idx] = parseInt(e.target.value);
                document.getElementById(`sizeDisplay${idx}`).textContent = `${e.target.value}px`;
                this.redrawCanvas();
            });
        });
    }

    addImageUploader() {
        this.images.push(null);
        this.imageSizes.push(200);
        this.renderDynamicUploaders();
    }

    removeImageUploader(idx) {
        this.images.splice(idx, 1);
        this.imageSizes.splice(idx, 1);
        this.renderDynamicUploaders();
        this.redrawCanvas();
    }

    handleDynamicImageUpload(event) {
        const idx = parseInt(event.target.getAttribute('data-idx'));
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.images[idx] = img;
                this.renderDynamicUploaders();
                this.redrawCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    clearAll() {
        this.images = [];
        this.imageSizes = [];
        this.documentId = '';
        this.renderDynamicUploaders();
        this.clearCanvas();
        document.getElementById('documentId').value = '';
    }

    clearCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    redrawCanvas() {
        this.clearCanvas();
        if (this.documentId.trim()) {
            this.drawDocumentId();
        }
        this.drawDateTime();
        const validImages = this.images.map((img, i) => ({img, size: this.imageSizes[i]})).filter(x => x.img);
        if (validImages.length === 0) return;
        // Arrange images in a grid (auto-fit)
        const cols = this.layout === 'A4' ? 2 : 1;
        const rows = Math.ceil(validImages.length / cols);
        const gap = 20;
        const margin = 40;
        const cellW = (this.canvas.width - gap * (cols - 1) - margin * 2) / cols;
        const cellH = (this.canvas.height - gap * (rows - 1) - margin * 2) / rows;
        validImages.forEach((item, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const x = margin + col * (cellW + gap);
            const y = margin + row * (cellH + gap) + 40; // leave space for doc ID
            this.drawImageFitted(item.img, x, y, cellW, cellH, item.size);
        });
    }

    drawImageFitted(img, x, y, maxWidth, maxHeight, size) {
        // Fit image in cell, allow user size to scale down
        const imgRatio = img.width / img.height;
        let drawWidth = Math.min(size, maxWidth);
        let drawHeight = drawWidth / imgRatio;
        if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = drawHeight * imgRatio;
        }
        const drawX = x + (maxWidth - drawWidth) / 2;
        // const drawY = y + (maxHeight - drawHeight) / 2;
        // const drawX = x;
        const drawY = y;
        this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
    }

    drawDocumentId() {
        if (!this.documentId.trim()) return;
        this.ctx.font = 'bold 16px Arial, sans-serif';
        this.ctx.fillStyle = '#333333';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        const text = 'Customer No. : ' + this.documentId.trim();
        const textMetrics = this.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 18;
        const padding = 8;
        const centerX = 20;
        const topY = 20;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(centerX - textWidth / 2 - padding, topY, textWidth + padding * 2, textHeight + padding);
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillText(text, centerX, topY + padding);
    }

    drawDateTime() {
        const now = new Date();
        const dateTimeString = now.toLocaleString("en-UK", {"dateStyle": "short", "timeStyle" : "short", "hour12" : 1 });
        this.ctx.font = 'bold 16px Arial, sans-serif';
        this.ctx.fillStyle = '#333333';
        this.ctx.textAlign = 'end';
        this.ctx.textBaseline = 'top';
        const text = 'Date : ' + dateTimeString;
        const textMetrics = this.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 18;
        const padding = 8;
        const rightX = this.canvas.width - 20; // 100px from right edge
        const topY = 20;
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(rightX - padding, topY, textWidth + padding * 2, textHeight + padding);
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = '#333333';
        this.ctx.fillText(text, rightX, topY + padding);
        }

    printCanvas() {
        if (this.images.length === 0 || this.images.every(img => img === null)) {
            alert('Please upload at least one image before printing.');
            return;
        }
        if (!this.documentId.trim()) {
            alert('Please enter a document ID before printing.');
            return;
        }
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        if (isSafari) {
            this.printCanvasSafari();
        } else {
            this.printCanvasStandard();
        }
    }

    printCanvasSafari() {
        // Convert canvas to data URL
        const canvasDataURL = this.canvas.toDataURL('image/png', 1.0);
        
        // Create a temporary div to hold the image
        const printDiv = document.createElement('div');
        printDiv.style.cssText = `
            position: fixed;
            top: -9999px;
            left: -9999px;
            width: 100%;
            height: 100%;
            z-index: 9999;
            background: white;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        `;
        
        const img = document.createElement('img');
        img.src = canvasDataURL;
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
            margin: 0;
            padding: 0;
            object-fit: contain;
        `;
        
        printDiv.appendChild(img);
        document.body.appendChild(printDiv);
        
        // Wait for image to load
        img.onload = () => {
            // Show the print div
            printDiv.style.top = '0';
            printDiv.style.left = '0';
            
            // Hide the main content
            const mainContent = document.querySelector('.container');
            const originalDisplay = mainContent.style.display;
            mainContent.style.display = 'none';
            
            // Add print styles
            const printStyles = document.createElement('style');
            printStyles.textContent = `
                @media print {
                    @page {
                        size: A4;
                        margin: 0.5in;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printDiv, #printDiv * {
                        visibility: visible;
                    }
                    #printDiv {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        display: block !important;
                    }
                    #printDiv img {
                        width: 100% !important;
                        height: 100% !important;
                        max-width: none !important;
                        max-height: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        object-fit: contain !important;
                    }
                }
            `;
            printStyles.id = 'printStyles';
            document.head.appendChild(printStyles);
            
            printDiv.id = 'printDiv';
            
            // Trigger print
            setTimeout(() => {
                window.print();
                
                // Clean up after printing
                setTimeout(() => {
                    document.body.removeChild(printDiv);
                    document.head.removeChild(printStyles);
                    mainContent.style.display = originalDisplay;
                }, 1000);
            }, 500);
        };
    }

    printCanvasStandard() {
        // Create a new window for printing
        const printWindow = window.open('', '_blank');
        
        // Convert canvas to data URL
        const canvasDataURL = this.canvas.toDataURL('image/png');
        
        // Create HTML content for print window
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Document - A4 Size</title>
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    html, body {
                        margin: 0;
                        padding: 0;
                        width: 100%;
                        height: 100%;
                        background: white;
                    }
                    .print-container {
                        width: 100%;
                        height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    img {
                        max-width: 100%;
                        max-height: 100%;
                        width: auto;
                        height: auto;
                        display: block;
                        object-fit: contain;
                    }
                    @media print {
                        @page {
                            size: A4;
                            margin: 0.5in;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            height: 100% !important;
                        }
                        .print-container {
                            width: 100% !important;
                            height: 100% !important;
                            padding: 0 !important;
                            display: block !important;
                        }
                        img {
                            width: 100% !important;
                            height: 100% !important;
                            max-width: none !important;
                            max-height: none !important;
                            object-fit: contain !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <img src="${canvasDataURL}" alt="Print Document">
                </div>
                <script>
                    window.onload = function() {
                        setTimeout(() => {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 100);
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(printContent);
        printWindow.document.close();
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.documentPrintApp = new DocumentPrint();
    // Add one uploader by default
    window.documentPrintApp.addImageUploader();
});

// Add some utility functions for better user experience
window.addEventListener('beforeunload', (e) => {
    // Warn user if they have uploaded images and try to leave
    const app = window.documentPrintApp;
    if (app && app.images.some(img => img !== null)) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Handle drag and drop functionality
document.addEventListener('DOMContentLoaded', () => {
    const uploadBoxes = document.querySelectorAll('.upload-box');
    
    uploadBoxes.forEach((box, index) => {
        // Calculate which image index this box corresponds to
        const imageIndex = Math.floor(index / 2);
        
        // Drag and drop handlers
        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.borderColor = '#4f46e5';
            box.style.backgroundColor = '#f0f4ff';
        });
        
        box.addEventListener('dragleave', (e) => {
            e.preventDefault();
            // Reset to original colors based on box type
            if (box.classList.contains('camera-box')) {
                box.style.borderColor = '#10b981';
                box.style.backgroundColor = '';
            } else {
                box.style.borderColor = '#3b82f6';
                box.style.backgroundColor = '';
            }
        });
        
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            // Reset to original colors based on box type
            if (box.classList.contains('camera-box')) {
                box.style.borderColor = '#10b981';
                box.style.backgroundColor = '';
            } else {
                box.style.borderColor = '#3b82f6';
                box.style.backgroundColor = '';
            }
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    // Create a mock event for the file upload
                    const mockEvent = {
                        target: {
                            files: [file]
                        }
                    };
                    
                    // Get the document print instance and handle the upload
                    const app = window.documentPrintApp || new DocumentPrint();
                    app.handleImageUpload(mockEvent, imageIndex);
                }
            }
        });
    });
});
