/**
 * Motor de conversion de imagenes a WebP/AVIF usando Canvas.
 */
var Converter = (function () {
    'use strict';

    var BATCH_SIZE = 4;

    function convertOne(img, onUpdate) {
        return new Promise(function (resolve, reject) {
            img.status = 'converting';
            if (onUpdate) onUpdate();

            var reader = new FileReader();

            reader.onerror = function () {
                img.status = 'error';
                if (onUpdate) onUpdate();
                reject(new Error('Error leyendo archivo: ' + img.file.name));
            };

            reader.onload = function () {
                var tempImg = new Image();

                tempImg.onerror = function () {
                    img.status = 'error';
                    if (onUpdate) onUpdate();
                    reject(new Error('Error decodificando imagen: ' + img.file.name));
                };

                tempImg.onload = function () {
                    var dims = Utils.computeDimensions(img);

                    var canvas = document.createElement('canvas');
                    canvas.width = dims.w;
                    canvas.height = dims.h;

                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(tempImg, 0, 0, dims.w, dims.h);

                    var mimeType = img.format === 'avif' ? 'image/avif' : 'image/webp';

                    canvas.toBlob(function (blob) {
                        if (!blob) {
                            img.status = 'error';
                            img.errorMsg = 'Error generando ' + img.format.toUpperCase();
                            if (onUpdate) onUpdate();
                            reject(new Error(img.errorMsg));
                            return;
                        }
                        if (blob.type !== mimeType) {
                            img.status = 'error';
                            img.errorMsg = img.format.toUpperCase() + ' no soportado por este navegador';
                            if (onUpdate) onUpdate();
                            reject(new Error(img.errorMsg));
                            return;
                        }
                        img.errorMsg = null;
                        img.resultBlob = blob;
                        img.resultSize = blob.size;
                        img.status = 'done';
                        if (onUpdate) onUpdate();
                        resolve();
                    }, mimeType, img.quality / 100);
                };

                tempImg.src = reader.result;
            };

            reader.readAsDataURL(img.file);
        });
    }

    function convertAll(pendingImages, onUpdate) {
        var i = 0;

        function nextBatch() {
            if (i >= pendingImages.length) return Promise.resolve();

            var batch = pendingImages.slice(i, i + BATCH_SIZE);
            i += BATCH_SIZE;

            return Promise.allSettled(
                batch.map(function (img) { return convertOne(img, onUpdate); })
            ).then(nextBatch);
        }

        return nextBatch();
    }

    return {
        convertOne: convertOne,
        convertAll: convertAll
    };
})();
