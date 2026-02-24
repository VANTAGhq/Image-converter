/**
 * Gestion de descargas: individuales y en ZIP.
 */
var Downloader = (function () {
    'use strict';

    function downloadBlob(blob, filename) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    function getExtension(img) {
        return img.format === 'avif' ? '.avif' : '.webp';
    }

    function downloadOne(img) {
        if (!img || !img.resultBlob) return;
        downloadBlob(img.resultBlob, img.name + getExtension(img));
    }

    function loadJSZip() {
        if (typeof JSZip !== 'undefined') return Promise.resolve();

        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    function downloadZip(doneImages) {
        if (doneImages.length === 0) return Promise.resolve();

        return loadJSZip()
            .then(function () {
                var zip = new JSZip();
                var usedNames = {};

                doneImages.forEach(function (img) {
                    var ext = getExtension(img);
                    var name = img.name + ext;
                    var counter = 1;
                    while (usedNames[name]) {
                        name = img.name + '_' + counter + ext;
                        counter++;
                    }
                    usedNames[name] = true;
                    zip.file(name, img.resultBlob);
                });

                return zip.generateAsync({ type: 'blob' });
            })
            .then(function (blob) {
                downloadBlob(blob, 'imagenes_convertidas.zip');
            })
            .catch(function () {
                doneImages.forEach(function (img) { downloadOne(img); });
            });
    }

    return {
        downloadOne: downloadOne,
        downloadZip: downloadZip
    };
})();
