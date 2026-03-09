/**
 * Logica i18n en tiempo de ejecucion.
 * Las traducciones (_i18n_data) se anteponen por build.js.
 * Detecta el idioma desde document.documentElement.lang (hardcodeado en el HTML generado).
 * Expone I18n.t(key) para card-builder.js y app*.js.
 * No manipula el DOM estatico (ya viene hardcodeado en el HTML generado).
 */
var I18n = (function () {
    'use strict';

    var DEFAULT_LANG = 'es';
    var currentLang  = DEFAULT_LANG;

    function t(key) {
        var d = _i18n_data[currentLang] || _i18n_data[DEFAULT_LANG];
        if (d[key] !== undefined)                          { return d[key]; }
        if (_i18n_data[DEFAULT_LANG][key] !== undefined)   { return _i18n_data[DEFAULT_LANG][key]; }
        return key;
    }

    function init() {
        currentLang = document.documentElement.lang || DEFAULT_LANG;

        // Toggle menu movil
        var toggle = document.getElementById('navToggle');
        var menu   = document.getElementById('navMenu');
        if (toggle && menu) {
            toggle.addEventListener('click', function () {
                var open = menu.classList.toggle('open');
                toggle.setAttribute('aria-expanded', String(open));
            });
        }
    }

    return { init: init, t: t };
})();
