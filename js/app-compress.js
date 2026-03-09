/**
 * Punto de entrada de la herramienta Comprimir.
 * Comprime imagenes al formato del tab activo (JPG por defecto, calidad 75).
 */
(function () {
    'use strict';

    var formatTabsEl = document.getElementById('formatTabs');
    var formatWarningEl = document.getElementById('formatWarning');
    var dropzone = document.getElementById('dropzone');
    var fileInput = document.getElementById('fileInput');
    var imageListEl = document.getElementById('imageList');
    var globalControlsEl = document.getElementById('globalControls');

    var globalQuality = document.getElementById('globalQuality');
    var globalQualityValue = document.getElementById('globalQualityValue');
    var globalScale = document.getElementById('globalScale');
    var globalScaleValue = document.getElementById('globalScaleValue');
    var globalMaxWidth = document.getElementById('globalMaxWidth');
    var globalMaxHeight = document.getElementById('globalMaxHeight');

    // Inicializar formato e interfaz a JPEG/75
    ImageStore.setFormat('jpeg');
    globalQuality.value = 75;
    globalQualityValue.textContent = '75%';

    // -- Auto-reconversion con debounce --

    var reconvertTimers = {};

    function scheduleReconvert(id) {
        if (reconvertTimers[id]) clearTimeout(reconvertTimers[id]);
        reconvertTimers[id] = setTimeout(function () {
            delete reconvertTimers[id];
            var img = ImageStore.getById(id);
            if (!img || img.status === 'converting') return;
            Converter.convertOne(img, render);
        }, 400);
    }

    function reconvertAll() {
        var pending = ImageStore.getPending();
        if (pending.length > 0) {
            Converter.convertAll(pending, render);
        }
    }

    var cardHandlers = {
        onDownload: function (id) {
            var img = ImageStore.getById(id);
            Downloader.downloadOne(img);
        },
        onConvert: function (id) {
            var img = ImageStore.getById(id);
            if (!img || img.status === 'converting') return;
            Converter.convertOne(img, render);
        },
        onRemove: function (id) {
            ImageStore.remove(id);
        },
        onSetting: function (id, key, value) {
            ImageStore.updateSetting(id, key, value);
            scheduleReconvert(id);
        },
        onToggleAspect: function (id) {
            ImageStore.toggleAspectRatio(id);
            scheduleReconvert(id);
        }
    };

    function render() {
        var images = ImageStore.getAll();
        globalControlsEl.classList.toggle('visible', images.length > 0);
        imageListEl.textContent = '';
        images.forEach(function (img) {
            imageListEl.appendChild(CardBuilder.build(img, cardHandlers));
        });
    }

    function handleFiles(fileList) {
        for (var i = 0; i < fileList.length; i++) {
            if (Utils.isValidImageType(fileList[i].type)) {
                var img = ImageStore.add(fileList[i]);
                img.quality = parseInt(globalQuality.value, 10);
            }
        }
        render();
    }

    // Dropzone
    dropzone.addEventListener('click', function () { fileInput.click(); });
    dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('dragover'); });
    dropzone.addEventListener('drop', function (e) {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        handleFiles(e.dataTransfer.files);
    });
    fileInput.addEventListener('change', function () {
        handleFiles(fileInput.files);
        fileInput.value = '';
    });

    // Tabs de formato (para comprimir a un formato concreto si el usuario lo elige)
    formatTabsEl.addEventListener('click', function (e) {
        var tab = e.target.closest('.tab');
        if (!tab) return;
        var format = tab.dataset.format;
        if (format === ImageStore.getFormat()) return;
        var tabs = formatTabsEl.querySelectorAll('.tab');
        for (var i = 0; i < tabs.length; i++) { tabs[i].classList.remove('active'); }
        tab.classList.add('active');
        ImageStore.setFormatAll(format);
        reconvertAll();
    });

    // Controles globales
    globalQuality.addEventListener('input', function () { globalQualityValue.textContent = this.value + '%'; });
    globalScale.addEventListener('input', function () { globalScaleValue.textContent = this.value + '%'; });

    document.getElementById('btnApplyAll').addEventListener('click', function () {
        ImageStore.applyToAll({
            quality: parseInt(globalQuality.value, 10),
            scale: parseInt(globalScale.value, 10),
            maxWidth: parseInt(globalMaxWidth.value, 10) || 0,
            maxHeight: parseInt(globalMaxHeight.value, 10) || 0
        });
        reconvertAll();
    });

    document.getElementById('btnDownloadZip').addEventListener('click', function () {
        Downloader.downloadZip(ImageStore.getDone());
    });

    document.getElementById('btnClearAll').addEventListener('click', function () {
        ImageStore.clear();
    });

    ImageStore.onChange(render);
    I18n.init();
})();
