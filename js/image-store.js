/**
 * Almacen de estado de las imagenes.
 * Gestiona la coleccion y las operaciones CRUD sobre cada imagen.
 */
var ImageStore = (function () {
    'use strict';

    var images = [];
    var idCounter = 0;
    var activeFormat = 'webp';
    var onChangeCallback = null;

    function onChange(cb) {
        onChangeCallback = cb;
    }

    function notify() {
        if (typeof onChangeCallback === 'function') onChangeCallback();
    }

    function setFormat(format) {
        activeFormat = format;
    }

    function getFormat() {
        return activeFormat;
    }

    function setFormatAll(format) {
        activeFormat = format;
        var changed = false;
        images.forEach(function (img) {
            if (img.format !== format) {
                img.format = format;
                if (img.status === 'done') {
                    img.status = 'pending';
                    img.resultBlob = null;
                }
                changed = true;
            }
        });
        if (changed) notify();
    }

    function add(file) {
        var id = ++idCounter;
        var entry = {
            id: id,
            file: file,
            name: file.name.replace(/\.[^.]+$/, ''),
            format: activeFormat,
            originalSize: file.size,
            quality: 80,
            scale: 100,
            maxWidth: 0,
            maxHeight: 0,
            keepAspectRatio: true,
            status: 'pending',
            errorMsg: null,
            resultBlob: null,
            resultSize: 0,
            naturalWidth: 0,
            naturalHeight: 0,
            thumbUrl: null
        };
        images.push(entry);
        loadThumb(entry);
        return entry;
    }

    function loadThumb(entry) {
        var reader = new FileReader();
        reader.onload = function (e) {
            entry.thumbUrl = e.target.result;
            var tempImg = new Image();
            tempImg.onload = function () {
                entry.naturalWidth = tempImg.naturalWidth;
                entry.naturalHeight = tempImg.naturalHeight;
                notify();
            };
            tempImg.src = e.target.result;
        };
        reader.readAsDataURL(entry.file);
    }

    function getById(id) {
        for (var i = 0; i < images.length; i++) {
            if (images[i].id === id) return images[i];
        }
        return null;
    }

    function getAll() {
        return images;
    }

    function getPending() {
        return images.filter(function (img) {
            return img.status !== 'done' && img.status !== 'converting';
        });
    }

    function getDone() {
        return images.filter(function (img) {
            return img.status === 'done' && img.resultBlob;
        });
    }

    function remove(id) {
        images = images.filter(function (img) { return img.id !== id; });
        notify();
    }

    function clear() {
        images = [];
        notify();
    }

    function updateSetting(id, key, value) {
        var img = getById(id);
        if (!img) return;
        img[key] = parseInt(value, 10) || 0;
        if (img.status === 'done') {
            img.status = 'pending';
            img.resultBlob = null;
        }
    }

    function toggleAspectRatio(id) {
        var img = getById(id);
        if (!img) return;
        img.keepAspectRatio = !img.keepAspectRatio;
        notify();
    }

    function applyToAll(settings) {
        images.forEach(function (img) {
            img.quality = settings.quality;
            img.scale = settings.scale;
            img.maxWidth = settings.maxWidth;
            img.maxHeight = settings.maxHeight;
            if (img.status === 'done') {
                img.status = 'pending';
                img.resultBlob = null;
            }
        });
        notify();
    }

    function count() {
        return images.length;
    }

    return {
        onChange: onChange,
        setFormat: setFormat,
        setFormatAll: setFormatAll,
        getFormat: getFormat,
        add: add,
        getById: getById,
        getAll: getAll,
        getPending: getPending,
        getDone: getDone,
        remove: remove,
        clear: clear,
        updateSetting: updateSetting,
        toggleAspectRatio: toggleAspectRatio,
        applyToAll: applyToAll,
        count: count
    };
})();
