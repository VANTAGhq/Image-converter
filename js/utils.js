/**
 * Funciones de utilidad genericas reutilizables.
 */
var Utils = (function () {
    'use strict';

    var VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }

    function isValidImageType(type) {
        return VALID_IMAGE_TYPES.indexOf(type) !== -1;
    }

    function createElement(tag, className, textContent) {
        var el = document.createElement(tag);
        if (className) el.className = className;
        if (textContent !== undefined) el.textContent = textContent;
        return el;
    }

    function computeDimensions(img) {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        if (!w || !h) return null;

        if (img.scale < 100) {
            w = Math.round(w * img.scale / 100);
            h = Math.round(h * img.scale / 100);
        }

        if (img.maxWidth > 0 && w > img.maxWidth) {
            if (img.keepAspectRatio) h = Math.round(h * img.maxWidth / w);
            w = img.maxWidth;
        }

        if (img.maxHeight > 0 && h > img.maxHeight) {
            if (img.keepAspectRatio) w = Math.round(w * img.maxHeight / h);
            h = img.maxHeight;
        }

        return { w: w, h: h };
    }

    var formatSupportCache = {};

    function checkFormatSupport(format) {
        if (formatSupportCache[format] !== undefined) {
            return Promise.resolve(formatSupportCache[format]);
        }

        return new Promise(function (resolve) {
            var canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            var mimeType = 'image/' + format;

            canvas.toBlob(function (blob) {
                var supported = blob !== null && blob.type === mimeType;
                formatSupportCache[format] = supported;
                resolve(supported);
            }, mimeType, 0.5);
        });
    }

    function getFormatSupport(format) {
        return formatSupportCache[format];
    }

    return {
        formatSize: formatSize,
        isValidImageType: isValidImageType,
        createElement: createElement,
        computeDimensions: computeDimensions,
        checkFormatSupport: checkFormatSupport,
        getFormatSupport: getFormatSupport,
        VALID_IMAGE_TYPES: VALID_IMAGE_TYPES
    };
})();
