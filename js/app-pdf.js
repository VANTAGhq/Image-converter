/**
 * Compresor de PDF cliente-side.
 * Usa PDF.js para renderizar paginas y jsPDF para reensamblar con JPEG comprimido.
 */
(function () {
    'use strict';

    // -- Setup PDF.js worker --
    if (typeof pdfjsLib !== 'undefined') {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // -- Referencias DOM --
    var dropzone      = document.getElementById('pdfDropzone');
    var fileInput     = document.getElementById('pdfFileInput');
    var panel         = document.getElementById('pdfPanel');
    var fileName      = document.getElementById('pdfFileName');
    var fileMeta      = document.getElementById('pdfFileMeta');
    var btnClear      = document.getElementById('btnPdfClear');
    var qualitySlider = document.getElementById('pdfQuality');
    var qualityVal    = document.getElementById('pdfQualityValue');
    var btnCompress   = document.getElementById('btnCompress');
    var progressEl    = document.getElementById('pdfProgress');
    var progressFill  = document.getElementById('pdfProgressFill');
    var progressText  = document.getElementById('pdfProgressText');
    var resultEl      = document.getElementById('pdfResult');
    var statOriginal  = document.getElementById('statOriginal');
    var statCompressed= document.getElementById('statCompressed');
    var statReduction = document.getElementById('statReduction');
    var btnDownload   = document.getElementById('btnDownload');

    var currentFile   = null;
    var compressedBlob= null;

    // -- Utilidades --

    function formatBytes(b) {
        if (b < 1024)        return b + ' B';
        if (b < 1048576)     return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(2) + ' MB';
    }

    function setProgress(current, total) {
        var pct = Math.round((current / total) * 100);
        progressFill.style.width = pct + '%';
        progressText.textContent = I18n.t('pdf.status.page') + ' ' + current + ' / ' + total;
    }

    // -- Cargar archivo --

    function loadFile(file) {
        if (!file || file.type !== 'application/pdf') return;
        currentFile    = file;
        compressedBlob = null;

        // Mostrar panel, ocultar dropzone
        dropzone.classList.add('hidden');
        panel.classList.remove('hidden');
        progressEl.classList.add('hidden');
        resultEl.classList.add('hidden');
        btnCompress.disabled = false;

        fileName.textContent = file.name;

        // Contar páginas para mostrar en el meta
        var reader = new FileReader();
        reader.onload = function (e) {
            var data = new Uint8Array(e.target.result);
            pdfjsLib.getDocument({ data: data }).promise.then(function (pdf) {
                fileMeta.textContent = formatBytes(file.size) + ' · ' + pdf.numPages + ' ' + I18n.t('pdf.label.pages');
            });
        };
        reader.readAsArrayBuffer(file);
    }

    function resetUI() {
        currentFile    = null;
        compressedBlob = null;
        dropzone.classList.remove('hidden');
        panel.classList.add('hidden');
        fileInput.value = '';
    }

    // -- Compresión --

    function getSettings(quality) {
        // quality 10–100 → DPI 72–150, JPEG 0.25–0.88
        var t   = (quality - 10) / 90;
        var dpi = Math.round(72 + t * 78);       // 72 a 150
        var q   = 0.25 + t * 0.63;               // 0.25 a 0.88
        return { scale: dpi / 72, jpegQ: q };
    }

    function compress() {
        if (!currentFile) return;

        var quality  = parseInt(qualitySlider.value, 10);
        var settings = getSettings(quality);

        btnCompress.disabled = true;
        resultEl.classList.add('hidden');
        progressEl.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.textContent = I18n.t('pdf.status.processing');

        var reader = new FileReader();
        reader.onload = function (e) {
            var data = new Uint8Array(e.target.result);
            pdfjsLib.getDocument({ data: data }).promise.then(function (pdfDoc) {
                doCompress(pdfDoc, settings, currentFile.size);
            }).catch(function (err) {
                console.error('PDF load error:', err);
                progressText.textContent = 'Error: ' + err.message;
                btnCompress.disabled = false;
            });
        };
        reader.readAsArrayBuffer(currentFile);
    }

    function doCompress(pdfDoc, settings, originalSize) {
        var numPages = pdfDoc.numPages;
        var jsPDF    = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
        var doc      = null;
        var pageNum  = 1;

        function processPage() {
            if (pageNum > numPages) {
                finish();
                return;
            }
            setProgress(pageNum, numPages);

            pdfDoc.getPage(pageNum).then(function (page) {
                // Dimensiones originales en puntos (escala 1)
                var origVP   = page.getViewport({ scale: 1 });
                // Dimensiones de render (escala aumentada para calidad)
                var renderVP = page.getViewport({ scale: settings.scale });

                var canvas  = document.createElement('canvas');
                canvas.width  = renderVP.width;
                canvas.height = renderVP.height;

                page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: renderVP
                }).promise.then(function () {
                    var imgData     = canvas.toDataURL('image/jpeg', settings.jpegQ);
                    var orientation = origVP.width > origVP.height ? 'l' : 'p';

                    if (!doc) {
                        doc = new jsPDF({
                            orientation: orientation,
                            unit: 'pt',
                            format: [origVP.width, origVP.height]
                        });
                    } else {
                        doc.addPage([origVP.width, origVP.height], orientation);
                    }

                    doc.addImage(imgData, 'JPEG', 0, 0, origVP.width, origVP.height);

                    pageNum++;
                    // Pequeño yield para no bloquear el UI
                    setTimeout(processPage, 0);
                }).catch(function (err) {
                    console.error('Render error page ' + pageNum, err);
                    pageNum++;
                    setTimeout(processPage, 0);
                });
            });
        }

        function finish() {
            compressedBlob = doc.output('blob');

            progressEl.classList.add('hidden');
            resultEl.classList.remove('hidden');
            btnCompress.disabled = false;

            var reduction = Math.round((1 - compressedBlob.size / originalSize) * 100);
            statOriginal.textContent   = formatBytes(originalSize);
            statCompressed.textContent = formatBytes(compressedBlob.size);
            statReduction.textContent  = (reduction > 0 ? '-' : '+') + Math.abs(reduction) + '%';

            progressText.textContent = I18n.t('pdf.status.done');
        }

        processPage();
    }

    // -- Descargar --

    function download() {
        if (!compressedBlob) return;
        var baseName = currentFile.name.replace(/\.pdf$/i, '');
        var url  = URL.createObjectURL(compressedBlob);
        var link = document.createElement('a');
        link.href     = url;
        link.download = baseName + '-compressed.pdf';
        link.click();
        setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
    }

    // -- Eventos --

    dropzone.addEventListener('click', function () { fileInput.click(); });
    dropzone.addEventListener('dragover', function (e) {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', function () {
        dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', function () {
        if (fileInput.files[0]) loadFile(fileInput.files[0]);
        fileInput.value = '';
    });

    qualitySlider.addEventListener('input', function () {
        qualityVal.textContent = this.value + '%';
    });

    btnCompress.addEventListener('click', compress);
    btnDownload.addEventListener('click', download);
    btnClear.addEventListener('click', resetUI);

    I18n.init();
})();
