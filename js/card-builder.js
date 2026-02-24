/**
 * Construye los elementos DOM de cada tarjeta de imagen.
 * No manipula estado; solo genera nodos a partir de datos.
 */
var CardBuilder = (function () {
    'use strict';

    var STATUS_LABELS = {
        pending: 'Pendiente',
        converting: 'Convirtiendo',
        done: 'Listo',
        error: 'Error'
    };

    function build(img, handlers) {
        var el = Utils.createElement;

        var card = el('div', 'image-card ' + img.status);
        card.dataset.id = img.id;

        card.appendChild(buildThumb(img));
        card.appendChild(buildBody(img, handlers));

        return card;
    }

    function buildThumb(img) {
        var wrap = Utils.createElement('div', 'thumb-wrap');
        if (img.thumbUrl) {
            var thumbImg = Utils.createElement('img');
            thumbImg.src = img.thumbUrl;
            thumbImg.alt = '';
            wrap.appendChild(thumbImg);
        }
        return wrap;
    }

    function buildBody(img, handlers) {
        var body = Utils.createElement('div', 'card-body');
        body.appendChild(buildHeader(img, handlers));
        body.appendChild(buildControls(img, handlers));
        body.appendChild(buildFooter(img));
        return body;
    }

    function buildHeader(img, handlers) {
        var header = Utils.createElement('div', 'card-header');

        var info = Utils.createElement('div');

        var name = Utils.createElement('span', 'file-name', img.file.name);
        info.appendChild(name);

        var dims = img.naturalWidth ? img.naturalWidth + 'x' + img.naturalHeight : '';
        var detail = Utils.formatSize(img.originalSize) + (dims ? ' \u00B7 ' + dims : '');
        var fileInfo = Utils.createElement('span', 'file-info', detail);
        info.appendChild(fileInfo);

        header.appendChild(info);
        header.appendChild(buildActions(img, handlers));

        return header;
    }

    function buildActions(img, handlers) {
        var actions = Utils.createElement('div', 'card-actions');

        var formatBadge = Utils.createElement('span', 'format-badge', img.format.toUpperCase());
        actions.appendChild(formatBadge);

        var statusText = img.status === 'error' && img.errorMsg ? img.errorMsg : STATUS_LABELS[img.status];
        var badge = Utils.createElement('span', 'status-badge ' + img.status, statusText);
        actions.appendChild(badge);

        if (img.status === 'done') {
            var dlBtn = Utils.createElement('button', 'btn-icon', '\u2B07');
            dlBtn.title = 'Descargar';
            dlBtn.addEventListener('click', function () { handlers.onDownload(img.id); });
            actions.appendChild(dlBtn);
        }

        if (img.status === 'pending') {
            var playBtn = Utils.createElement('button', 'btn-icon', '\u25B6');
            playBtn.title = 'Convertir';
            playBtn.addEventListener('click', function () { handlers.onConvert(img.id); });
            actions.appendChild(playBtn);
        }

        var delBtn = Utils.createElement('button', 'btn-icon delete', '\u2715');
        delBtn.title = 'Eliminar';
        delBtn.addEventListener('click', function () { handlers.onRemove(img.id); });
        actions.appendChild(delBtn);

        return actions;
    }

    function buildControls(img, handlers) {
        var controls = Utils.createElement('div', 'card-controls');

        controls.appendChild(buildRangeControl('Calidad', img.quality, '%', function (val) {
            handlers.onSetting(img.id, 'quality', val);
        }));

        controls.appendChild(buildRangeControl('Escala', img.scale, '%', function (val) {
            handlers.onSetting(img.id, 'scale', val);
        }));

        controls.appendChild(buildNumberControl('Max W', img.maxWidth, function (val) {
            handlers.onSetting(img.id, 'maxWidth', val);
        }));

        controls.appendChild(buildNumberControl('Max H', img.maxHeight, function (val) {
            handlers.onSetting(img.id, 'maxHeight', val);
        }));

        controls.appendChild(buildLockToggle(img, handlers));

        return controls;
    }

    function buildRangeControl(labelText, value, suffix, onChange) {
        var group = Utils.createElement('div', 'control-group');

        var label = Utils.createElement('label', null, labelText);
        group.appendChild(label);

        var range = document.createElement('input');
        range.type = 'range';
        range.min = '1';
        range.max = '100';
        range.value = value;

        var display = Utils.createElement('span', 'range-value', value + suffix);

        range.addEventListener('input', function () {
            display.textContent = this.value + suffix;
            onChange(this.value);
        });

        group.appendChild(range);
        group.appendChild(display);

        return group;
    }

    function buildNumberControl(labelText, value, onChange) {
        var group = Utils.createElement('div', 'control-group');

        var label = Utils.createElement('label', null, labelText);
        group.appendChild(label);

        var input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = value;
        input.addEventListener('change', function () { onChange(this.value); });

        group.appendChild(input);

        return group;
    }

    function buildLockToggle(img, handlers) {
        var wrap = Utils.createElement('div', 'checkbox-wrap');
        var icon = Utils.createElement('span',
            'lock-icon' + (img.keepAspectRatio ? ' locked' : ''),
            img.keepAspectRatio ? '\uD83D\uDD17' : '\uD83D\uDD13'
        );
        icon.title = 'Mantener proporcion';
        icon.addEventListener('click', function () { handlers.onToggleAspect(img.id); });
        wrap.appendChild(icon);
        return wrap;
    }

    function buildFooter(img) {
        var footer = Utils.createElement('div', 'card-footer');
        var targetDims = Utils.computeDimensions(img);
        var hasDims = img.naturalWidth && img.naturalHeight && targetDims;

        // -- Fila de dimensiones (siempre visible si hay datos) --
        if (hasDims) {
            var dimsRow = Utils.createElement('span', 'info-detail');

            var dimsLabel = Utils.createElement('span', 'info-label', 'Dimensiones: ');
            dimsRow.appendChild(dimsLabel);

            var originalDims = img.naturalWidth + '\u00D7' + img.naturalHeight;
            var targetDimsStr = targetDims.w + '\u00D7' + targetDims.h;
            var dimsChanged = targetDims.w !== img.naturalWidth || targetDims.h !== img.naturalHeight;

            if (dimsChanged) {
                var origSpan = Utils.createElement('span', 'info-original', originalDims);
                dimsRow.appendChild(origSpan);
                dimsRow.appendChild(document.createTextNode(' \u2192 '));
                var targetSpan = Utils.createElement('span', 'info-target', targetDimsStr);
                dimsRow.appendChild(targetSpan);
            } else {
                dimsRow.appendChild(document.createTextNode(originalDims));
            }

            footer.appendChild(dimsRow);
        }

        // -- Fila de peso (siempre muestra original, y resultado si ya esta convertida) --
        var weightRow = Utils.createElement('span', 'info-detail');
        var weightLabel = Utils.createElement('span', 'info-label', 'Peso: ');
        weightRow.appendChild(weightLabel);

        if (img.status === 'done') {
            var origWeight = Utils.createElement('span', 'info-original', Utils.formatSize(img.originalSize));
            weightRow.appendChild(origWeight);
            weightRow.appendChild(document.createTextNode(' \u2192 '));

            var diff = img.originalSize - img.resultSize;
            var pct = ((diff / img.originalSize) * 100).toFixed(1);
            var resultWeight = Utils.createElement('span', 'info-target', Utils.formatSize(img.resultSize));
            weightRow.appendChild(resultWeight);

            weightRow.appendChild(document.createTextNode(' '));
            var pctSpan;
            if (diff >= 0) {
                pctSpan = Utils.createElement('span', 'saved', '(-' + pct + '%)');
            } else {
                pctSpan = Utils.createElement('span', 'increased', '(+' + Math.abs(parseFloat(pct)) + '%)');
            }
            weightRow.appendChild(pctSpan);
        } else {
            weightRow.appendChild(document.createTextNode(Utils.formatSize(img.originalSize)));
        }

        footer.appendChild(weightRow);

        // -- Barra de progreso --
        if (img.status === 'converting') {
            var bar = Utils.createElement('div', 'progress-bar visible');
            var fill = Utils.createElement('div', 'progress-fill');
            fill.style.width = '60%';
            bar.appendChild(fill);
            footer.appendChild(bar);
        }

        return footer;
    }

    return { build: build };
})();
