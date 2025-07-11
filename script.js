class DocumentPrint {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.images = [null, null];
        this.imageSizes = [200, 200];
        this.documentId = '';
        this.init();
    }

    init() {
        // Set canvas size to A4 dimensions (72 DPI) for editing
        // A4 = 210mm x 297mm = 794px x 1123px at 72 DPI
        // Final print output will be scaled to 2.5" × 4" document
        this.canvas.width = 794;
        this.canvas.height = 1123;
        
        // Clear canvas with white background
        this.clearCanvas();
        
        // Bind event listeners
        this.bindEvents();
    }

    bindEvents() {
        // Image upload handlers
        document.getElementById('image1').addEventListener('change', (e) => {
            this.handleImageUpload(e, 0);
        });

        document.getElementById('image2').addEventListener('change', (e) => {
            this.handleImageUpload(e, 1);
        });

        // Size control handlers
        ['size1', 'size2'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.handleSizeChange(e, id);
            });
        });

        // Document ID input handler
        document.getElementById('documentId').addEventListener('input', (e) => {
            this.documentId = e.target.value;
            this.redrawCanvas();
        });

        // Button handlers
        document.getElementById('clearBtn').addEventListener('click', () => {
            this.clearAll();
        });

        document.getElementById('printBtn').addEventListener('click', () => {
            this.printCanvas();
        });
    }

    handleImageUpload(event, index) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.images[index] = img;
                this.updateUploadUI(index, file.name);
                this.redrawCanvas();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    updateUploadUI(index, filename) {
        const uploadBox = document.querySelector(`#image${index + 1}`).parentElement.querySelector('.upload-box');
        const uploadText = uploadBox.querySelector('.upload-text');
        const sizeControls = document.getElementById(`sizeControls${index + 1}`);
        
        uploadBox.classList.add('has-image');
        uploadText.textContent = `✓ ${filename}`;
        sizeControls.style.display = 'block';
    }

    clearCanvas() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    redrawCanvas() {
        this.clearCanvas();
        
        // Always draw document ID at top center if provided
        if (this.documentId.trim()) {
            this.drawDocumentId();
        }
        
        const validImages = this.images.filter(img => img !== null);
        if (validImages.length === 0) return;

        if (validImages.length === 1) {
            // Single image - align at top with 80px margin (leaving space for document ID)
            const imageIndex = this.images[0] ? 0 : 1;
            const topMargin = 80;
            this.drawImageAtPosition(validImages[0], 0, topMargin, this.canvas.width, this.canvas.height - topMargin, imageIndex);
        } else {
            // Two images - try to arrange them side by side, or vertically if they don't fit
            const gap = 10; // Small gap between images
            
            if (this.images[0] && this.images[1]) {
                // Calculate dimensions for both images
                const img1 = this.images[0];
                const img2 = this.images[1];
                const imgRatio1 = img1.width / img1.height;
                const imgRatio2 = img2.width / img2.height;
                const desiredSize1 = this.imageSizes[0];
                const desiredSize2 = this.imageSizes[1];
                
                // Calculate image 1 dimensions
                let img1Width, img1Height;
                if (imgRatio1 >= 1) {
                    img1Width = Math.min(desiredSize1, this.canvas.width);
                    img1Height = img1Width / imgRatio1;
                } else {
                    img1Height = Math.min(desiredSize1, this.canvas.height);
                    img1Width = img1Height * imgRatio1;
                }
                
                // Calculate image 2 dimensions
                let img2Width, img2Height;
                if (imgRatio2 >= 1) {
                    img2Width = Math.min(desiredSize2, this.canvas.width);
                    img2Height = img2Width / imgRatio2;
                } else {
                    img2Height = Math.min(desiredSize2, this.canvas.height);
                    img2Width = img2Height * imgRatio2;
                }
                
                // Check if they can fit side by side
                const totalWidth = img1Width + img2Width + gap;
                const maxHeight = Math.max(img1Height, img2Height);
                
                if (totalWidth <= this.canvas.width && maxHeight <= this.canvas.height) {
                    // Place side by side with top alignment and 80px margin (leaving space for document ID)
                    const startX = (this.canvas.width - totalWidth) / 2;
                    const topMargin = 80;
                    
                    // Draw image 1 on the left
                    this.drawImageAtPosition(img1, startX, topMargin, img1Width, img1Height, 0);
                    
                    // Draw image 2 on the right
                    this.drawImageAtPosition(img2, startX + img1Width + gap, topMargin, img2Width, img2Height, 1);
                } else {
                    // Place vertically (one after another) with top alignment and 80px margin
                    let currentY = 80; // Start with 80px margin from top for document ID
                    
                    this.drawImageAtPosition(img1, (this.canvas.width - img1Width) / 2, currentY, img1Width, img1Height, 0);
                    currentY += img1Height + gap;
                    
                    if (currentY < this.canvas.height) {
                        const remainingHeight = this.canvas.height - currentY;
                        this.drawImageAtPosition(img2, (this.canvas.width - img2Width) / 2, currentY, img2Width, Math.min(img2Height, remainingHeight), 1);
                    }
                }
            } else if (this.images[0]) {
                // Only first image
                this.drawImageWithCustomSize(this.images[0], 0, 0, this.canvas.width, this.canvas.height, 0);
            } else if (this.images[1]) {
                // Only second image
                this.drawImageWithCustomSize(this.images[1], 0, 0, this.canvas.width, this.canvas.height, 1);
            }
        }
    }

    drawImageFitted(img, x, y, maxWidth, maxHeight) {
        // Calculate dimensions to fit image within bounds while maintaining aspect ratio
        const imgRatio = img.width / img.height;
        const maxRatio = maxWidth / maxHeight;
        
        let drawWidth, drawHeight;
        
        if (imgRatio > maxRatio) {
            // Image is wider than container
            drawWidth = maxWidth;
            drawHeight = maxWidth / imgRatio;
        } else {
            // Image is taller than container
            drawHeight = maxHeight;
            drawWidth = maxHeight * imgRatio;
        }
        
        // Center the image within the available space
        const drawX = x + (maxWidth - drawWidth) / 2;
        const drawY = y + (maxHeight - drawHeight) / 2;
        
        // Draw the image
        this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        // Draw a subtle border around the image
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
    }

    drawImageWithCustomSize(img, x, y, maxWidth, maxHeight, imageIndex) {
        // Calculate the aspect ratio of the original image
        const imgRatio = img.width / img.height;
        
        // Get the desired size from the single slider
        const desiredSize = this.imageSizes[imageIndex];
        
        // Calculate dimensions maintaining aspect ratio
        let drawWidth, drawHeight;
        
        if (imgRatio >= 1) {
            // Image is wider or square - use size as width
            drawWidth = Math.min(desiredSize, maxWidth);
            drawHeight = drawWidth / imgRatio;
        } else {
            // Image is taller - use size as height
            drawHeight = Math.min(desiredSize, maxHeight);
            drawWidth = drawHeight * imgRatio;
        }
        
        // Ensure we don't exceed container bounds
        if (drawWidth > maxWidth) {
            drawWidth = maxWidth;
            drawHeight = drawWidth / imgRatio;
        }
        if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = drawHeight * imgRatio;
        }
        
        // Center the image within the available space
        const drawX = x + (maxWidth - drawWidth) / 2;
        const drawY = y + (maxHeight - drawHeight) / 2;
        
        // Draw the image
        this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        // Draw a subtle border around the image
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
    }

    drawImageAtPosition(img, x, y, maxWidth, maxHeight, imageIndex) {
        // Calculate the aspect ratio of the original image
        const imgRatio = img.width / img.height;
        
        // Get the desired size from the single slider
        const desiredSize = this.imageSizes[imageIndex];
        
        // Calculate dimensions maintaining aspect ratio
        let drawWidth, drawHeight;
        
        if (imgRatio >= 1) {
            // Image is wider or square - use size as width
            drawWidth = Math.min(desiredSize, maxWidth);
            drawHeight = drawWidth / imgRatio;
        } else {
            // Image is taller - use size as height
            drawHeight = Math.min(desiredSize, maxHeight);
            drawWidth = drawHeight * imgRatio;
        }
        
        // Ensure we don't exceed container bounds
        if (drawWidth > maxWidth) {
            drawWidth = maxWidth;
            drawHeight = drawWidth / imgRatio;
        }
        if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = drawHeight * imgRatio;
        }
        
        // Center horizontally if x is 0 (for single image or vertical layout)
        // Otherwise use exact positioning (for side-by-side layout)
        const drawX = x === 0 ? (maxWidth - drawWidth) / 2 : x;
        const drawY = y;
        
        // Draw the image
        this.ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        
        // Draw a subtle border around the image
        this.ctx.strokeStyle = '#e5e7eb';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(drawX, drawY, drawWidth, drawHeight);
    }

    handleSizeChange(event, controlId) {
        const value = parseInt(event.target.value);
        const imageIndex = controlId.includes('1') ? 0 : 1;
        
        this.imageSizes[imageIndex] = value;
        
        // Update display
        const sizeDisplay = document.getElementById(`sizeDisplay${imageIndex + 1}`);
        sizeDisplay.textContent = `${value}px`;
        
        // Redraw canvas
        this.redrawCanvas();
    }

    clearAll() {
        this.images = [null, null];
        this.imageSizes = [200, 200];
        this.documentId = '';
        this.clearCanvas();
        
        // Reset file inputs
        document.getElementById('image1').value = '';
        document.getElementById('image2').value = '';
        
        // Reset size controls
        document.getElementById('size1').value = 200;
        document.getElementById('size2').value = 200;
        
        // Reset document ID input
        document.getElementById('documentId').value = '';
        
        // Hide size controls
        document.getElementById('sizeControls1').style.display = 'none';
        document.getElementById('sizeControls2').style.display = 'none';
        
        // Reset upload UI
        document.querySelectorAll('.upload-box').forEach((box, index) => {
            box.classList.remove('has-image');
            box.querySelector('.upload-text').textContent = `Upload Image ${index + 1}`;
        });
        
        // Reset size displays
        document.getElementById('sizeDisplay1').textContent = '200px';
        document.getElementById('sizeDisplay2').textContent = '200px';
    }

    printCanvas() {
        if (this.images.every(img => img === null)) {
            alert('Please upload at least one image before printing.');
            return;
        }

        // Check if document ID is provided
        if (!this.documentId.trim()) {
            alert('Please enter a document ID before printing.');
            return;
        }

        // For Safari, use a different approach
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        
        if (isSafari) {
            // Safari-specific printing method
            this.printCanvasSafari();
        } else {
            // Standard printing method for other browsers
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
        `;
        
        const img = document.createElement('img');
        img.src = canvasDataURL;
        img.style.cssText = `
            width: 100%;
            height: auto;
            max-width: none;
            display: block;
            margin: 0;
            padding: 0;
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
                    body * {
                        visibility: hidden;
                    }
                    #printDiv, #printDiv * {
                        visibility: visible;
                    }
                    #printDiv {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        height: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    #printDiv img {
                        width: 100% !important;
                        height: auto !important;
                        max-width: none !important;
                        max-height: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    @page {
                        margin: 0 !important;
                        size: auto !important;
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
                <title>Print Document</title>
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
                    img {
                        width: 100%;
                        height: auto;
                        display: block;
                        margin: 0;
                        padding: 0;
                    }
                    @media print {
                        @page {
                            margin: 0;
                            size: auto;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        img {
                            width: 100% !important;
                            height: auto !important;
                            max-width: none !important;
                            max-height: none !important;
                        }
                    }
                </style>
            </head>
            <body>
                <img src="${canvasDataURL}" alt="Print Document">
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

    drawDocumentId() {
        if (!this.documentId.trim()) return;
        
        // Set font style for the document ID
        this.ctx.font = '16px Arial, sans-serif';
        this.ctx.fillStyle = '#333333';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'top';
        
        // Add a semi-transparent background for better readability
        const text = 'Customer No. : ' + this.documentId.trim();
        const textMetrics = this.ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = 18;
        const padding = 8;
        
        // Center position
        const centerX = this.canvas.width / 2;
        const topY = 20;
        
        // Draw background rectangle
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(centerX - textWidth / 2 - padding, topY, textWidth + padding * 2, textHeight + padding);
        
        // Draw border
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(centerX - textWidth / 2 - padding, topY, textWidth + padding * 2, textHeight + padding);
        
        // Draw the text
        this.ctx.fillStyle = '#333333';
        this.ctx.fillText(text, centerX, topY + padding);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DocumentPrint();
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
        const fileInput = document.getElementById(`image${index + 1}`);
        
        // Drag and drop handlers
        box.addEventListener('dragover', (e) => {
            e.preventDefault();
            box.style.borderColor = '#4f46e5';
            box.style.backgroundColor = '#f0f4ff';
        });
        
        box.addEventListener('dragleave', (e) => {
            e.preventDefault();
            box.style.borderColor = '#e0e7ff';
            box.style.backgroundColor = '#f8fafc';
        });
        
        box.addEventListener('drop', (e) => {
            e.preventDefault();
            box.style.borderColor = '#e0e7ff';
            box.style.backgroundColor = '#f8fafc';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    // Create a new FileList-like object
                    const dt = new DataTransfer();
                    dt.items.add(file);
                    fileInput.files = dt.files;
                    
                    // Trigger change event
                    fileInput.dispatchEvent(new Event('change'));
                }
            }
        });
    });
});
