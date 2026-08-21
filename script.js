class DocumentPrint {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.images = [];
        this.imageSizes = [];
        this.documentId = '';
        this.layout = 'A4';
        this.billTemplate = null;
        this.billCanvas = null;
        this.billCtx = null;
        this.hotelBillCanvas = null;
        this.hotelBillCtx = null;
        this.init();
    }

    init() {
        this.setCanvasSize('A4');
        this.clearCanvas();
        this.bindEvents();
        this.renderDynamicUploaders();
        this.initBillGenerator();
        this.initHotelBillGenerator();
    }

    setCanvasSize(layout) {
        const dpi = 150; // Assuming 150 DPI for standard display
        if (layout === 'A5') {
            this.canvas.width = (148 / 25.4) * dpi; // 148mm at 150dpi
            this.canvas.height = (210 / 25.4) * dpi; // 210mm at 150dpi
        } else {
            this.canvas.width = (210 / 25.4) * dpi; // 210mm at 150dpi
            this.canvas.height = (297 / 25.4) * dpi; // 297mm at 150dpi
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
        // Detect Safari (desktop and iOS)
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
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
                        title: 'Document Print'
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
                if (!isSafari) {
                    alert('Sharing is not supported on this device. The image has been downloaded instead.');
                }
                // For Safari, do not show alert (just download)
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
                            <input type="range" min="50" max="${this.layout === 'A4' ? 500 : 300}" value="${this.imageSizes[idx] || 200}" class="size-slider image-size-slider" data-idx="${idx}">
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
        this.imageSizes.push(400);
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
        const gap = 10;
        const margin = 20;
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

    // ==================== BILL GENERATOR METHODS ====================
    
    initBillGenerator() {
        // Create a separate canvas for bill generation
        this.billCanvas = document.createElement('canvas');
        this.billCtx = this.billCanvas.getContext('2d');
        
        // A5 size at 150 DPI
        const dpi = 150;
        this.billCanvas.width = (148 / 25.4) * dpi;  // 148mm
        this.billCanvas.height = (210 / 25.4) * dpi; // 210mm
        
        // Bind bill generator events
        this.bindBillEvents();
    }
    
    bindBillEvents() {
        const billGeneratorBtn = document.getElementById('billGeneratorBtn');
        const closeBillModal = document.getElementById('closeBillModal');
        const billModal = document.getElementById('billModal');
        const billTemplate = document.getElementById('billTemplate');
        const previewBillBtn = document.getElementById('previewBillBtn');
        const printBillBtn = document.getElementById('printBillBtn');
        
        // Date inputs for auto-calculation
        const checkInDate = document.getElementById('checkInDate');
        const checkOutDate = document.getElementById('checkOutDate');
        const roomRate = document.getElementById('roomRate');
        const additionalCharges = document.getElementById('additionalCharges');
        
        if (billGeneratorBtn) {
            billGeneratorBtn.addEventListener('click', () => {
                this.openBillModal();
            });
        }
        
        if (closeBillModal) {
            closeBillModal.addEventListener('click', () => {
                this.closeBillModal();
            });
        }
        
        if (billModal) {
            billModal.addEventListener('click', (e) => {
                if (e.target === billModal) {
                    this.closeBillModal();
                }
            });
        }
        
        if (billTemplate) {
            billTemplate.addEventListener('change', (e) => {
                this.handleBillTemplateUpload(e);
            });
        }
        
        if (previewBillBtn) {
            previewBillBtn.addEventListener('click', () => {
                this.previewBill();
            });
        }
        
        if (printBillBtn) {
            printBillBtn.addEventListener('click', () => {
                this.printBill();
            });
        }
        
        // Auto-calculate total amount
        const calculateTotal = () => {
            const checkIn = new Date(checkInDate.value);
            const checkOut = new Date(checkOutDate.value);
            const rate = parseFloat(roomRate.value) || 0;
            const additional = parseFloat(additionalCharges.value) || 0;
            
            if (checkIn && checkOut && checkOut >= checkIn) {
                const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
                const total = ((nights || 1) * rate) + additional;
                document.getElementById('totalAmount').value = total > 0 ? total : '';
            }
        };
        
        [checkInDate, checkOutDate, roomRate, additionalCharges].forEach(el => {
            if (el) {
                el.addEventListener('change', calculateTotal);
                el.addEventListener('input', calculateTotal);
            }
        });
    }
    
    openBillModal() {
        const modal = document.getElementById('billModal');
        if (modal) {
            modal.style.display = 'flex';
            // Set default dates to today and tomorrow
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            document.getElementById('checkInDate').value = today.toISOString().split('T')[0];
            document.getElementById('checkOutDate').value = tomorrow.toISOString().split('T')[0];
        }
    }
    
    closeBillModal() {
        const modal = document.getElementById('billModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    handleBillTemplateUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file for the bill template.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.billTemplate = img;
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
    
    getBillData() {
        return {
            guestName: document.getElementById('guestName').value.trim(),
            roomNumber: document.getElementById('roomNumber').value.trim(),
            checkInDate: document.getElementById('checkInDate').value,
            checkOutDate: document.getElementById('checkOutDate').value,
            roomRate: document.getElementById('roomRate').value,
            totalAmount: document.getElementById('totalAmount').value,
            additionalCharges: document.getElementById('additionalCharges').value || '0',
            paymentMethod: document.getElementById('paymentMethod').value,
            remarks: document.getElementById('remarks').value.trim(),
            positions: {
                nameX: parseInt(document.getElementById('posNameX').value) || 150,
                nameY: parseInt(document.getElementById('posNameY').value) || 180,
                roomX: parseInt(document.getElementById('posRoomX').value) || 150,
                roomY: parseInt(document.getElementById('posRoomY').value) || 210,
                checkInX: parseInt(document.getElementById('posCheckInX').value) || 150,
                checkInY: parseInt(document.getElementById('posCheckInY').value) || 240,
                checkOutX: parseInt(document.getElementById('posCheckOutX').value) || 150,
                checkOutY: parseInt(document.getElementById('posCheckOutY').value) || 270,
                totalX: parseInt(document.getElementById('posTotalX').value) || 150,
                totalY: parseInt(document.getElementById('posTotalY').value) || 320
            },
            fontSize: parseInt(document.getElementById('billFontSize').value) || 14,
            fontColor: document.getElementById('billFontColor').value || '#000000'
        };
    }
    
    validateBillData(data) {
        if (!this.billTemplate) {
            alert('Please upload a bill template image first.');
            return false;
        }
        if (!data.guestName) {
            alert('Please enter the guest name.');
            return false;
        }
        if (!data.checkInDate || !data.checkOutDate) {
            alert('Please enter check-in and check-out dates.');
            return false;
        }
        return true;
    }
    
    drawBillOnCanvas() {
        const data = this.getBillData();
        
        if (!this.validateBillData(data)) {
            return false;
        }
        
        // Resize bill canvas to match template
        this.billCanvas.width = this.billTemplate.width;
        this.billCanvas.height = this.billTemplate.height;
        
        // Draw template image
        this.billCtx.drawImage(this.billTemplate, 0, 0);
        
        // Set font properties
        this.billCtx.font = `${data.fontSize}px Arial, sans-serif`;
        this.billCtx.fillStyle = data.fontColor;
        this.billCtx.textAlign = 'left';
        this.billCtx.textBaseline = 'top';
        
        // Format dates
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        };
        
        // Draw text fields at specified positions
        const pos = data.positions;
        
        // Guest Name
        this.billCtx.fillText(data.guestName, pos.nameX, pos.nameY);
        
        // Room Number
        if (data.roomNumber) {
            this.billCtx.fillText(data.roomNumber, pos.roomX, pos.roomY);
        }
        
        // Check-in Date
        this.billCtx.fillText(formatDate(data.checkInDate), pos.checkInX, pos.checkInY);
        
        // Check-out Date
        this.billCtx.fillText(formatDate(data.checkOutDate), pos.checkOutX, pos.checkOutY);
        
        // Total Amount
        if (data.totalAmount) {
            this.billCtx.fillText(`₹${data.totalAmount}`, pos.totalX, pos.totalY);
        }
        
        // Additional info (below total if there's space)
        if (data.paymentMethod) {
            this.billCtx.fillText(`Payment: ${data.paymentMethod}`, pos.totalX, pos.totalY + data.fontSize + 10);
        }
        
        if (data.remarks) {
            this.billCtx.fillText(`Note: ${data.remarks}`, pos.totalX, pos.totalY + (data.fontSize + 10) * 2);
        }
        
        return true;
    }
    
    previewBill() {
        if (!this.drawBillOnCanvas()) {
            return;
        }
        
        // Show preview in a new window
        const previewWindow = window.open('', '_blank', 'width=600,height=800');
        const canvasDataURL = this.billCanvas.toDataURL('image/png');
        
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Bill Preview - A5</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        background: #f0f0f0;
                        min-height: 100vh;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                        background: white;
                    }
                </style>
            </head>
            <body>
                <img src="${canvasDataURL}" alt="Bill Preview">
            </body>
            </html>
        `);
        previewWindow.document.close();
    }
    
    printBill() {
        if (!this.drawBillOnCanvas()) {
            return;
        }
        
        const canvasDataURL = this.billCanvas.toDataURL('image/png', 1.0);
        
        // Detect Safari
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isSafari) {
            this.printBillSafari(canvasDataURL);
        } else {
            this.printBillStandard(canvasDataURL);
        }
    }
    
    printBillSafari(canvasDataURL) {
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
        
        img.onload = () => {
            printDiv.style.top = '0';
            printDiv.style.left = '0';
            
            const mainContent = document.querySelector('.container');
            const originalDisplay = mainContent.style.display;
            mainContent.style.display = 'none';
            
            const printStyles = document.createElement('style');
            printStyles.textContent = `
                @media print {
                    @page {
                        size: A5;
                        margin: 0.25in;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #billPrintDiv, #billPrintDiv * {
                        visibility: visible;
                    }
                    #billPrintDiv {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                    #billPrintDiv img {
                        width: 100% !important;
                        height: auto !important;
                        max-width: none !important;
                    }
                }
            `;
            printStyles.id = 'billPrintStyles';
            document.head.appendChild(printStyles);
            
            printDiv.id = 'billPrintDiv';
            
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.body.removeChild(printDiv);
                    document.head.removeChild(printStyles);
                    mainContent.style.display = originalDisplay;
                }, 1000);
            }, 500);
        };
    }
    
    printBillStandard(canvasDataURL) {
        const printWindow = window.open('', '_blank');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Print Bill - A5 Size</title>
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
                            size: A5;
                            margin: 0.25in;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .print-container {
                            width: 100% !important;
                            height: 100% !important;
                            padding: 0 !important;
                            display: block !important;
                        }
                        img {
                            width: 100% !important;
                            height: auto !important;
                            max-width: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <img src="${canvasDataURL}" alt="Print Bill">
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

    // ==================== HOTEL KAILASH INN BILL GENERATOR ====================
    
    initHotelBillGenerator() {
        // Create a separate canvas for hotel bill generation
        this.hotelBillCanvas = document.createElement('canvas');
        this.hotelBillCtx = this.hotelBillCanvas.getContext('2d');
        
        // A5 size at 300 DPI
        const dpi = 300;
        this.hotelBillCanvas.width = (148 / 25.4) * dpi;  // 148mm
        this.hotelBillCanvas.height = (210 / 25.4) * dpi; // 210mm
        
        // Initialize rooms array
        this.hotelRooms = [];
        
        // Bind hotel bill events
        this.bindHotelBillEvents();
        
        // Generate initial bill number
        this.generateBillNumber();
    }
    
    generateBillNumber() {
        // Bill number is now required and must be entered manually
        // No auto-generation
    }
    
    renderRoomEntries() {
        const container = document.getElementById('roomsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.hotelRooms.forEach((room, idx) => {
            const roomDiv = document.createElement('div');
            roomDiv.className = 'room-entry';
            roomDiv.innerHTML = `
                <div class="room-entry-header">
                    <span>🛏️ Room ${idx + 1}</span>
                    ${this.hotelRooms.length > 1 ? `<button type="button" class="remove-room-btn" data-idx="${idx}">✕ Remove</button>` : ''}
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Room Number *</label>
                        <input type="text" class="form-input room-number-input" data-idx="${idx}" value="${room.roomNumber}" placeholder="e.g., 101">
                    </div>
                    <div class="form-group">
                        <label>Room Type</label>
                        <select class="form-input room-type-input" data-idx="${idx}">
                            <option value="Single" ${room.roomType === 'Single' ? 'selected' : ''}>Single</option>
                            <option value="Double" ${room.roomType === 'Double' ? 'selected' : ''}>Double</option>
                            <option value="Deluxe" ${room.roomType === 'Deluxe' ? 'selected' : ''}>Deluxe</option>
                            <option value="Suite" ${room.roomType === 'Suite' ? 'selected' : ''}>Suite</option>
                            <option value="Family" ${room.roomType === 'Family' ? 'selected' : ''}>Family Room</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Rate (₹/night) *</label>
                        <input type="number" class="form-input room-rate-input" data-idx="${idx}" value="${room.rate}" placeholder="e.g., 1500">
                    </div>
                    <div class="form-group">
                        <label>Charges (₹)</label>
                        <input type="number" class="form-input room-charges-input" data-idx="${idx}" value="${room.charges}" readonly placeholder="Auto">
                    </div>
                </div>
            `;
            container.appendChild(roomDiv);
        });
        
        // Bind events for room inputs
        container.querySelectorAll('.room-number-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                this.hotelRooms[idx].roomNumber = e.target.value;
            });
        });
        
        container.querySelectorAll('.room-type-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                this.hotelRooms[idx].roomType = e.target.value;
            });
        });
        
        container.querySelectorAll('.room-rate-input').forEach(input => {
            input.addEventListener('input', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                this.hotelRooms[idx].rate = e.target.value;
                this.calculateHotelTotal();
            });
        });
        
        container.querySelectorAll('.remove-room-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                this.removeRoom(idx);
            });
        });
    }
    
    addRoom() {
        this.hotelRooms.push({
            roomNumber: '',
            roomType: 'Double',
            rate: '',
            charges: 0
        });
        this.renderRoomEntries();
    }
    
    removeRoom(idx) {
        this.hotelRooms.splice(idx, 1);
        this.renderRoomEntries();
        this.calculateHotelTotal();
    }
    
    calculateHotelTotal() {
        const hCheckInDate = document.getElementById('hCheckInDate');
        const hCheckOutDate = document.getElementById('hCheckOutDate');
        const hFoodCharges = document.getElementById('hFoodCharges');
        const hServiceCharges = document.getElementById('hServiceCharges');
        const hOtherCharges = document.getElementById('hOtherCharges');
        const hDiscount = document.getElementById('hDiscount');
        const hTaxPercent = document.getElementById('hTaxPercent');
        
        const checkIn = new Date(hCheckInDate.value);
        const checkOut = new Date(hCheckOutDate.value);
        const food = parseFloat(hFoodCharges.value) || 0;
        const service = parseFloat(hServiceCharges.value) || 0;
        const other = parseFloat(hOtherCharges.value) || 0;
        const discount = parseFloat(hDiscount.value) || 0;
        const taxPercent = parseFloat(hTaxPercent.value) || 0;
        
        let nights = 0;
        if (checkIn && checkOut && checkOut >= checkIn) {
            nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)) || 1;
        }
        
        document.getElementById('hNights').value = nights > 0 ? nights : '';
        
        // Calculate room charges for each room
        let totalRoomCharges = 0;
        this.hotelRooms.forEach((room, idx) => {
            const rate = parseFloat(room.rate) || 0;
            const charges = nights * rate;
            room.charges = charges;
            totalRoomCharges += charges;
            
            // Update the charges input if it exists
            const chargesInput = document.querySelector(`.room-charges-input[data-idx="${idx}"]`);
            if (chargesInput) {
                chargesInput.value = charges > 0 ? charges : '';
            }
        });
        
        document.getElementById('hTotalRoomCharges').value = totalRoomCharges > 0 ? totalRoomCharges : '';
        
        const subtotal = totalRoomCharges + food + service + other - discount;
        const taxAmount = Math.round(subtotal * taxPercent / 100);
        document.getElementById('hTaxAmount').value = taxAmount > 0 ? taxAmount : '';
        
        const grandTotal = subtotal + taxAmount;
        document.getElementById('hGrandTotal').value = grandTotal > 0 ? grandTotal : '';
    }
    
    bindHotelBillEvents() {
        const hotelBillBtn = document.getElementById('hotelBillBtn');
        const closeHotelBillModal = document.getElementById('closeHotelBillModal');
        const hotelBillModal = document.getElementById('hotelBillModal');
        const previewHotelBillBtn = document.getElementById('previewHotelBillBtn');
        const printHotelBillBtn = document.getElementById('printHotelBillBtn');
        const shareHotelBillBtn = document.getElementById('shareHotelBillBtn');
        const addRoomBtn = document.getElementById('addRoomBtn');
        
        // Inputs for auto-calculation
        const hCheckInDate = document.getElementById('hCheckInDate');
        const hCheckOutDate = document.getElementById('hCheckOutDate');
        const hFoodCharges = document.getElementById('hFoodCharges');
        const hServiceCharges = document.getElementById('hServiceCharges');
        const hOtherCharges = document.getElementById('hOtherCharges');
        const hDiscount = document.getElementById('hDiscount');
        const hTaxPercent = document.getElementById('hTaxPercent');
        
        if (hotelBillBtn) {
            hotelBillBtn.addEventListener('click', () => {
                this.openHotelBillModal();
            });
        }
        
        if (closeHotelBillModal) {
            closeHotelBillModal.addEventListener('click', () => {
                this.closeHotelBillModal();
            });
        }
        
        if (hotelBillModal) {
            hotelBillModal.addEventListener('click', (e) => {
                if (e.target === hotelBillModal) {
                    this.closeHotelBillModal();
                }
            });
        }
        
        if (previewHotelBillBtn) {
            previewHotelBillBtn.addEventListener('click', () => {
                this.previewHotelBill();
            });
        }
        
        if (printHotelBillBtn) {
            printHotelBillBtn.addEventListener('click', () => {
                this.printHotelBill();
            });
        }
        
        if (shareHotelBillBtn) {
            shareHotelBillBtn.addEventListener('click', () => {
                this.shareHotelBill();
            });
        }
        
        if (addRoomBtn) {
            addRoomBtn.addEventListener('click', () => {
                this.addRoom();
            });
        }
        
        // Auto-calculate totals
        [hCheckInDate, hCheckOutDate, hFoodCharges, hServiceCharges, hOtherCharges, hDiscount, hTaxPercent].forEach(el => {
            if (el) {
                el.addEventListener('change', () => this.calculateHotelTotal());
                el.addEventListener('input', () => this.calculateHotelTotal());
            }
        });
    }
    
    openHotelBillModal() {
        const modal = document.getElementById('hotelBillModal');
        if (modal) {
            modal.style.display = 'flex';
            // Set default dates
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            document.getElementById('hCheckInDate').value = today.toISOString().split('T')[0];
            document.getElementById('hCheckOutDate').value = tomorrow.toISOString().split('T')[0];
            
            // Initialize with one room if empty
            if (this.hotelRooms.length === 0) {
                this.hotelRooms = [{
                    roomNumber: '',
                    roomType: 'Double',
                    rate: '',
                    charges: 0
                }];
            }
            this.renderRoomEntries();
            
            // Generate new bill number
            this.generateBillNumber();
        }
    }
    
    closeHotelBillModal() {
        const modal = document.getElementById('hotelBillModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    getHotelBillData() {
        return {
            guestName: document.getElementById('hGuestName').value.trim(),
            guestPhone: document.getElementById('hGuestPhone').value.trim(),
            guestAddress: document.getElementById('hGuestAddress').value.trim(),
            rooms: this.hotelRooms.map(room => ({
                roomNumber: room.roomNumber,
                roomType: room.roomType,
                rate: room.rate,
                charges: room.charges
            })),
            checkInDate: document.getElementById('hCheckInDate').value,
            checkInTime: document.getElementById('hCheckInTime').value,
            checkOutDate: document.getElementById('hCheckOutDate').value,
            checkOutTime: document.getElementById('hCheckOutTime').value,
            numGuests: document.getElementById('hNumGuests').value,
            nights: document.getElementById('hNights').value,
            totalRoomCharges: document.getElementById('hTotalRoomCharges').value,
            foodCharges: document.getElementById('hFoodCharges').value || '0',
            serviceCharges: document.getElementById('hServiceCharges').value || '0',
            otherCharges: document.getElementById('hOtherCharges').value || '0',
            discount: document.getElementById('hDiscount').value || '0',
            taxPercent: document.getElementById('hTaxPercent').value || '0',
            taxAmount: document.getElementById('hTaxAmount').value || '0',
            grandTotal: document.getElementById('hGrandTotal').value,
            paymentMethod: document.getElementById('hPaymentMethod').value,
            billNumber: document.getElementById('hBillNumber').value,
            idProof: document.getElementById('hIdProof').value,
            remarks: document.getElementById('hRemarks').value.trim()
        };
    }
    
    validateHotelBillData(data) {
        if (!data.billNumber) {
            alert('Please enter the bill number.');
            return false;
        }
        if (!data.guestName) {
            alert('Please enter the guest name.');
            return false;
        }
        if (!data.rooms || data.rooms.length === 0) {
            alert('Please add at least one room.');
            return false;
        }
        for (let i = 0; i < data.rooms.length; i++) {
            if (!data.rooms[i].roomNumber) {
                alert(`Please enter room number for Room ${i + 1}.`);
                return false;
            }
            if (!data.rooms[i].rate) {
                alert(`Please enter room rate for Room ${i + 1}.`);
                return false;
            }
        }
        if (!data.checkInDate || !data.checkOutDate) {
            alert('Please enter check-in and check-out dates.');
            return false;
        }
        return true;
    }
    
    drawHotelBillOnCanvas() {
        const data = this.getHotelBillData();
        
        if (!this.validateHotelBillData(data)) {
            return false;
        }
        
        const ctx = this.hotelBillCtx;
        const canvas = this.hotelBillCanvas;
        
        // Scale factor for 300 DPI (2x for high quality print)
        const scale = 2;
        
        // Clear canvas with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Format date helper
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        };
        
        // Format time helper
        const formatTime = (timeStr) => {
            if (!timeStr) return '';
            const [hours, minutes] = timeStr.split(':');
            const h = parseInt(hours);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            return `${h12}:${minutes} ${ampm}`;
        };
        
        // Layout constants (scaled)
        const leftMargin = 40 * scale;
        const rightMargin = canvas.width - 40 * scale;
        const centerX = canvas.width / 2;
        const contentWidth = rightMargin - leftMargin;
        
        let y = 20 * scale;
        
        // ===== DECORATIVE TOP BORDER =====
        const gradient = ctx.createLinearGradient(leftMargin, y, rightMargin, y);
        gradient.addColorStop(0, '#8B4513');
        gradient.addColorStop(0.5, '#D4AF37');
        gradient.addColorStop(1, '#8B4513');
        ctx.fillStyle = gradient;
        ctx.fillRect(leftMargin, y, contentWidth, 6 * scale);
        
        y += 36 * scale;
        
        // ===== HEADER =====
        // Hotel Name
        ctx.font = `bold ${36 * scale}px Georgia, serif`;
        ctx.fillStyle = '#1a1a2e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('HOTEL KAILASH INN', centerX, y);
        
        y += 28 * scale;
        
        // Decorative line under name
        ctx.strokeStyle = '#D4AF37';
        ctx.lineWidth = 2 * scale;
        ctx.beginPath();
        ctx.moveTo(centerX - 140 * scale, y);
        ctx.lineTo(centerX + 140 * scale, y);
        ctx.stroke();
        
        y += 24 * scale;
        
        // Tagline
        ctx.font = `italic ${16 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#666666';
        ctx.textBaseline = 'middle';
        ctx.fillText('Your Comfort, Our Priority', centerX, y);
        
        y += 24 * scale;
        
        // Contact Info
        ctx.font = `${14 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.fillText('Chowk Bazaar, Barh | Ph: +91-79030-49480', centerX, y);
        
        y += 28 * scale;
        
        // ===== BILL TITLE BOX =====
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(leftMargin, y, contentWidth, 36 * scale);
        ctx.font = `bold ${20 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('INVOICE', centerX, y + 18 * scale);
        
        y += 58 * scale;
        
        // Bill Number and Date row
        ctx.font = `${18 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillText(`Bill No: ${data.billNumber}`, leftMargin, y);
        ctx.textAlign = 'right';
        ctx.fillText(`Date: ${formatDate(new Date().toISOString().split('T')[0])}`, rightMargin, y);
        
        y += 24 * scale;
        
        // ===== GUEST DETAILS BOX =====
        const guestBoxHeight = 88 * scale;
        ctx.fillStyle = '#f8f4e8';
        ctx.fillRect(leftMargin, y, contentWidth, guestBoxHeight);
        ctx.strokeStyle = '#e0d6c2';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(leftMargin, y, contentWidth, guestBoxHeight);
        
        // Guest header
        ctx.font = `bold ${16 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#8B4513';
        ctx.textAlign = 'left';
        ctx.fillText('GUEST INFORMATION', leftMargin + 16 * scale, y + 22 * scale);
        
        // Guest name and phone
        ctx.font = `${16 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.fillText(`Name: ${data.guestName}`, leftMargin + 16 * scale, y + 48 * scale);
        if (data.guestPhone) {
            ctx.textAlign = 'right';
            ctx.fillText(`Phone: ${data.guestPhone}`, rightMargin - 16 * scale, y + 48 * scale);
        }
        
        // Address and ID
        ctx.textAlign = 'left';
        if (data.guestAddress) {
            const addr = data.guestAddress.length > 40 ? data.guestAddress.substring(0, 40) + '...' : data.guestAddress;
            ctx.fillText(`Address: ${addr}`, leftMargin + 16 * scale, y + 74 * scale);
        }
        ctx.textAlign = 'right';
        ctx.fillText(`ID: ${data.idProof}`, rightMargin - 16 * scale, y + 74 * scale);
        
        y += guestBoxHeight + 16 * scale;
        
        // ===== STAY DETAILS HEADER =====
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(leftMargin, y, contentWidth, 28 * scale);
        ctx.font = `bold ${14 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#D4AF37';
        ctx.textAlign = 'left';
        ctx.fillText('STAY DETAILS', leftMargin + 16 * scale, y + 20 * scale);
        
        y += 48 * scale;
        
        // Stay details content - proper grid layout
        ctx.font = `${16 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#333333';
        ctx.textAlign = 'left';
        
        const labelX = leftMargin + 10 * scale;
        const valueX = leftMargin + 110 * scale;
        const col2LabelX = centerX + 20 * scale;
        const col2ValueX = centerX + 110 * scale;
        
        // Row 1: Check-in and Room(s)
        ctx.fillText('Check-in:', labelX, y);
        ctx.font = `bold ${16 * scale}px Arial, sans-serif`;
        ctx.fillText(`${formatDate(data.checkInDate)} ${formatTime(data.checkInTime)}`, valueX, y);
        
        ctx.font = `${16 * scale}px Arial, sans-serif`;
        ctx.fillText('Room(s):', col2LabelX, y);
        ctx.font = `bold ${16 * scale}px Arial, sans-serif`;
        const roomNumbers = data.rooms.map(r => r.roomNumber).join(', ');
        ctx.fillText(roomNumbers, col2ValueX, y);
        
        y += 24 * scale;
        
        // Row 2: Check-out and Nights/Guests
        ctx.font = `${16 * scale}px Arial, sans-serif`;
        ctx.fillText('Check-out:', labelX, y);
        ctx.font = `bold ${16 * scale}px Arial, sans-serif`;
        ctx.fillText(`${formatDate(data.checkOutDate)} ${formatTime(data.checkOutTime)}`, valueX, y);
        
        ctx.font = `${16 * scale}px Arial, sans-serif`;
        ctx.fillText('Nights:', col2LabelX, y);
        ctx.font = `bold ${16 * scale}px Arial, sans-serif`;
        ctx.fillText(data.nights, col2ValueX, y);
        
        ctx.font = `${16 * scale}px Arial, sans-serif`;
        ctx.fillText('Guests:', col2ValueX + 60 * scale, y);
        ctx.font = `bold ${16 * scale}px Arial, sans-serif`;
        ctx.fillText(data.numGuests, col2ValueX + 130 * scale, y);
        
        y += 32 * scale;
        
        // ===== CHARGES TABLE =====
        // Table header
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(leftMargin, y, contentWidth, 28 * scale);
        ctx.font = `bold ${14 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#D4AF37';
        ctx.textAlign = 'left';
        ctx.fillText('PARTICULARS', leftMargin + 16 * scale, y + 20 * scale);
        ctx.textAlign = 'right';
        ctx.fillText('AMOUNT', rightMargin - 16 * scale, y + 20 * scale);
        
        y += 48 * scale;
        
        // Table rows
        let rowIndex = 0;
        const rowHeight = 26 * scale;
        
        const drawRow = (label, amount, isDiscount = false) => {
            // Alternating background
            if (rowIndex % 2 === 0) {
                ctx.fillStyle = '#f9f9f9';
                ctx.fillRect(leftMargin, y - 18 * scale, contentWidth, rowHeight);
            }
            
            ctx.font = `${16 * scale}px Arial, sans-serif`;
            ctx.fillStyle = isDiscount ? '#16a34a' : '#333333';
            ctx.textAlign = 'left';
            ctx.fillText(label, leftMargin + 16 * scale, y);
            ctx.textAlign = 'right';
            ctx.fillText(isDiscount ? `-₹${amount}` : `₹${amount}`, rightMargin - 16 * scale, y);
            
            y += rowHeight;
            rowIndex++;
        };
        
        // Room Charges
        data.rooms.forEach((room) => {
            drawRow(`Room ${room.roomNumber} (${room.roomType}) × ${data.nights} nights @ ₹${room.rate}`, room.charges);
        });
        
        // Other charges
        if (parseFloat(data.foodCharges) > 0) {
            drawRow('Food & Beverages', data.foodCharges);
        }
        if (parseFloat(data.serviceCharges) > 0) {
            drawRow('Service Charges', data.serviceCharges);
        }
        if (parseFloat(data.otherCharges) > 0) {
            drawRow('Other Charges', data.otherCharges);
        }
        if (parseFloat(data.discount) > 0) {
            drawRow('Discount', data.discount, true);
        }
        
        // Subtotal line
        y += 4 * scale;
        ctx.strokeStyle = '#cccccc';
        ctx.lineWidth = 2 * scale;
        ctx.setLineDash([4 * scale, 4 * scale]);
        ctx.beginPath();
        ctx.moveTo(leftMargin, y);
        ctx.lineTo(rightMargin, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        y += 20 * scale;
        
        // Tax row (if applicable)
        if (parseFloat(data.taxPercent) > 0) {
            ctx.font = `${16 * scale}px Arial, sans-serif`;
            ctx.fillStyle = '#333333';
            ctx.textAlign = 'left';
            ctx.fillText(`Tax @ ${data.taxPercent}%`, leftMargin + 16 * scale, y);
            ctx.textAlign = 'right';
            ctx.fillText(`₹${data.taxAmount}`, rightMargin - 16 * scale, y);
            y += 28 * scale;
        }
        
        // ===== GRAND TOTAL BOX =====
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(leftMargin, y, contentWidth, 40 * scale);
        ctx.font = `bold ${20 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('GRAND TOTAL', leftMargin + 20 * scale, y + 28 * scale);
        ctx.textAlign = 'right';
        ctx.font = `bold ${24 * scale}px Arial, sans-serif`;
        ctx.fillText(`₹ ${data.grandTotal}/-`, rightMargin - 20 * scale, y + 28 * scale);
        
        y += 56 * scale;
        
        // ===== PAYMENT BOX =====
        ctx.fillStyle = '#e8f5e9';
        ctx.fillRect(leftMargin, y, contentWidth, 32 * scale);
        ctx.strokeStyle = '#a5d6a7';
        ctx.lineWidth = 2 * scale;
        ctx.strokeRect(leftMargin, y, contentWidth, 32 * scale);
        ctx.font = `${16 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#2e7d32';
        ctx.textAlign = 'left';
        ctx.fillText(`✓ Payment: ${data.paymentMethod}`, leftMargin + 16 * scale, y + 22 * scale);
        ctx.textAlign = 'right';
        ctx.font = `bold ${16 * scale}px Arial, sans-serif`;
        ctx.fillText('PAID', rightMargin - 16 * scale, y + 22 * scale);
        
        y += 44 * scale;
        
        // Remarks (if any)
        if (data.remarks) {
            ctx.font = `italic ${14 * scale}px Arial, sans-serif`;
            ctx.fillStyle = '#666666';
            ctx.textAlign = 'left';
            ctx.fillText(`Note: ${data.remarks}`, leftMargin, y);
            y += 24 * scale;
        }
        
        // ===== FOOTER =====
        y = canvas.height - 100 * scale;
        
        // Signature line
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1 * scale;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(rightMargin - 180 * scale, y);
        ctx.lineTo(rightMargin, y);
        ctx.stroke();
        
        ctx.font = `${14 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#666666';
        ctx.textAlign = 'center';
        ctx.fillText('Authorized Signature', rightMargin - 90 * scale, y + 20 * scale);
        
        y += 36 * scale;
        
        // Decorative bottom border
        const gradientBottom = ctx.createLinearGradient(leftMargin, y, rightMargin, y);
        gradientBottom.addColorStop(0, '#8B4513');
        gradientBottom.addColorStop(0.5, '#D4AF37');
        gradientBottom.addColorStop(1, '#8B4513');
        ctx.fillStyle = gradientBottom;
        ctx.fillRect(leftMargin, y, contentWidth, 4 * scale);
        
        y += 20 * scale;
        
        // Thank you message
        ctx.font = `bold ${16 * scale}px Georgia, serif`;
        ctx.fillStyle = '#8B4513';
        ctx.textAlign = 'center';
        ctx.fillText('Thank you for choosing Hotel Kailash Inn!', centerX, y);
        
        y += 20 * scale;
        
        ctx.font = `${12 * scale}px Arial, sans-serif`;
        ctx.fillStyle = '#999999';
        ctx.fillText('Computer Generated Invoice | We hope to serve you again', centerX, y);
        
        return true;
    }
    
    previewHotelBill() {
        if (!this.drawHotelBillOnCanvas()) {
            return;
        }
        
        const previewWindow = window.open('', '_blank', 'width=500,height=750');
        const canvasDataURL = this.hotelBillCanvas.toDataURL('image/jpeg', 1.0);
        
        previewWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Hotel Kailash Inn - Bill Preview</title>
                <style>
                    body {
                        margin: 0;
                        padding: 20px;
                        display: flex;
                        justify-content: center;
                        align-items: flex-start;
                        background: #f5f5f5;
                        min-height: 100vh;
                    }
                    img {
                        max-width: 100%;
                        height: auto;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                        background: white;
                    }
                </style>
            </head>
            <body>
                <img src="${canvasDataURL}" alt="Hotel Bill Preview">
            </body>
            </html>
        `);
        previewWindow.document.close();
    }
    
    printHotelBill() {
        if (!this.drawHotelBillOnCanvas()) {
            return;
        }
        
        const canvasDataURL = this.hotelBillCanvas.toDataURL('image/jpeg', 1.0);
        
        // Detect iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isIOS) {
            this.printHotelBillIOS(canvasDataURL);
        } else if (isSafari) {
            this.printHotelBillSafari(canvasDataURL);
        } else {
            this.printHotelBillStandard(canvasDataURL);
        }
    }
    
    printHotelBillIOS(canvasDataURL) {
        // On iOS, create a new page with the image and trigger print
        // iOS Safari requires user interaction and works better with inline content
        
        // Create a full-screen overlay with the bill image
        const overlay = document.createElement('div');
        overlay.id = 'iosPrintOverlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: white;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: flex-start;
            padding: 10px;
            overflow: auto;
            -webkit-overflow-scrolling: touch;
        `;
        
        // Add instruction text
        const instruction = document.createElement('div');
        instruction.style.cssText = `
            background: #f59e0b;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 10px;
            text-align: center;
            font-size: 14px;
            width: 100%;
            max-width: 400px;
        `;
        instruction.innerHTML = `
            <strong>To Print:</strong> Tap the Share button <span style="font-size:18px">⬆️</span> below, then select "Print"
            <br><br>
            <button id="iosCloseBtn" style="background:#fff;color:#f59e0b;border:none;padding:8px 20px;border-radius:5px;font-weight:bold;cursor:pointer;">Close</button>
        `;
        
        const img = document.createElement('img');
        img.src = canvasDataURL;
        img.style.cssText = `
            max-width: 100%;
            height: auto;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        `;
        
        overlay.appendChild(instruction);
        overlay.appendChild(img);
        document.body.appendChild(overlay);
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
        
        // Close button handler
        document.getElementById('iosCloseBtn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            document.body.style.overflow = '';
        });
        
        // Also try to trigger native print after a delay
        img.onload = () => {
            // Give iOS time to render
            setTimeout(() => {
                window.print();
            }, 300);
        };
    }
    
    async shareHotelBill() {
        if (!this.drawHotelBillOnCanvas()) {
            return;
        }
        
        const data = this.getHotelBillData();
        const fileName = `HotelKailashInn_Bill_${data.billNumber || 'Invoice'}.jpeg`;
        
        try {
            // Convert canvas to blob
            const blob = await new Promise((resolve) => {
                this.hotelBillCanvas.toBlob(resolve, 'image/jpeg', 1.0);
            });
            
            const file = new File([blob], fileName, { type: 'image/jpeg' });
            
            // Check if Web Share API is available and supports files
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    title: 'Hotel Kailash Inn - Bill',
                    text: `Bill No: ${data.billNumber} | Guest: ${data.guestName} | Total: ₹${data.grandTotal}`,
                    files: [file]
                });
            } else if (navigator.share) {
                // Fallback: Share without file (just text and URL)
                // First download the image, then share text
                this.downloadHotelBillImage(blob, fileName);
                alert('Image downloaded. You can now share it from your downloads folder.');
            } else {
                // No Web Share API - just download
                this.downloadHotelBillImage(blob, fileName);
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                // User cancelled sharing - do nothing
                return;
            }
            console.error('Share failed:', error);
            // Fallback to download
            try {
                const blob = await new Promise((resolve) => {
                    this.hotelBillCanvas.toBlob(resolve, 'image/jpeg', 1.0);
                });
                this.downloadHotelBillImage(blob, fileName);
            } catch (downloadError) {
                alert('Unable to share or download. Please try the Preview option and save the image manually.');
            }
        }
    }
    
    downloadHotelBillImage(blob, fileName) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    printHotelBillSafari(canvasDataURL) {
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
        `;
        
        const img = document.createElement('img');
        img.src = canvasDataURL;
        img.style.cssText = `
            max-width: 100%;
            max-height: 100%;
            width: auto;
            height: auto;
            display: block;
        `;
        
        printDiv.appendChild(img);
        document.body.appendChild(printDiv);
        
        img.onload = () => {
            printDiv.style.top = '0';
            printDiv.style.left = '0';
            
            const mainContent = document.querySelector('.container');
            const originalDisplay = mainContent.style.display;
            mainContent.style.display = 'none';
            
            const printStyles = document.createElement('style');
            printStyles.textContent = `
                @media print {
                    @page {
                        size: A5;
                        margin: 0.25in;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #hotelBillPrintDiv, #hotelBillPrintDiv * {
                        visibility: visible;
                    }
                    #hotelBillPrintDiv {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                    #hotelBillPrintDiv img {
                        width: 100% !important;
                        height: auto !important;
                    }
                }
            `;
            printStyles.id = 'hotelBillPrintStyles';
            document.head.appendChild(printStyles);
            
            printDiv.id = 'hotelBillPrintDiv';
            
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.body.removeChild(printDiv);
                    document.head.removeChild(printStyles);
                    mainContent.style.display = originalDisplay;
                }, 1000);
            }, 500);
        };
    }
    
    printHotelBillStandard(canvasDataURL) {
        const printWindow = window.open('', '_blank');
        
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Hotel Kailash Inn - Print Bill</title>
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
                        padding: 10px;
                    }
                    img {
                        max-width: 100%;
                        max-height: 100%;
                        width: auto;
                        height: auto;
                        display: block;
                    }
                    @media print {
                        @page {
                            size: A5;
                            margin: 0.2in;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .print-container {
                            width: 100% !important;
                            height: 100% !important;
                            padding: 0 !important;
                            display: block !important;
                        }
                        img {
                            width: 100% !important;
                            height: auto !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <img src="${canvasDataURL}" alt="Hotel Kailash Inn Bill">
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