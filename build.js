/**
 * build.js — Generador de sitio estatico multiidioma y multi-herramienta.
 *
 * Genera por cada herramienta × idioma:
 *   /                       (home ES)
 *   /en/                    (home EN)
 *   /webp/                  (WebP converter ES)
 *   /webp/en/               (WebP converter EN)
 *   /compress/              (Compress ES)
 *   /compress/en/           (Compress EN)
 *   ... etc
 *   /js/i18n.js
 *
 * Uso: node build.js
 */
'use strict';

var fs   = require('fs');
var path = require('path');

// -- Fuentes -------------------------------------------------------------------

var T       = JSON.parse(fs.readFileSync('_src/translations.json', 'utf8'));
var WRAPPER = fs.readFileSync('_src/i18n-wrapper.js',         'utf8');
var HEAD    = fs.readFileSync('_src/partials/head.html',       'utf8');
var HEADER  = fs.readFileSync('_src/partials/header.html',     'utf8');
var FOOTER  = fs.readFileSync('_src/partials/footer.html',     'utf8');

// -- Configuracion -------------------------------------------------------------

var BASE    = 'https://converter.vantag.es';
var LANGS   = ['es', 'en', 'fr', 'de'];

var LANG_LABELS = { es: 'Espa\u00f1ol', en: 'English', fr: 'Fran\u00e7ais', de: 'Deutsch' };

/**
 * Definicion de herramientas.
 * toolPath: ruta de la herramienta (ej. '/webp/' o '/' para home)
 * Scripts cargados al final del body.
 */
var TOOLS = [
    {
        id:          'home',
        toolPath:    '/',
        content:     '_src/home/content.html',
        faqCount:    0,
        schemaType:  'WebSite',
        scripts:     ['/js/i18n.js']
    },
    {
        id:          'webp',
        toolPath:    '/webp/',
        content:     '_src/tools/webp/content.html',
        faqCount:    7,
        schemaType:  'WebApplication',
        scripts:     ['/js/i18n.js', '/js/utils.js', '/js/image-store.js',
                      '/js/converter.js', '/js/card-builder.js',
                      '/js/downloader.js', '/js/app.js']
    },
    {
        id:          'pdf',
        toolPath:    '/pdf/',
        content:     '_src/tools/pdf/content.html',
        faqCount:    5,
        schemaType:  'WebApplication',
        scripts:     [
            '/js/i18n.js',
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
            'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
            '/js/app-pdf.js'
        ]
    },
    {
        id:          'resize',
        toolPath:    '/resize/',
        content:     '_src/tools/resize/content.html',
        faqCount:    0,
        schemaType:  'WebApplication',
        scripts:     ['/js/i18n.js']
    },
    {
        id:          'mp4',
        toolPath:    '/mp4/',
        content:     '_src/tools/mp4/content.html',
        faqCount:    0,
        schemaType:  'WebApplication',
        scripts:     ['/js/i18n.js']
    }
];

// -- Helpers -------------------------------------------------------------------

function stripHtml(s) { return (s || '').replace(/<[^>]+>/g, ''); }

/** URL completa de un idioma para una herramienta */
function langUrl(tool, lang) {
    if (lang === 'es') { return BASE + tool.toolPath; }
    return BASE + tool.toolPath + lang + '/';
}

/** Ruta de salida en disco */
function outPath(tool, lang) {
    var base = tool.toolPath === '/' ? '' : tool.toolPath.replace(/^\//, '');
    if (lang === 'es') { return base + 'index.html'; }
    return base + lang + '/index.html';
}

function generateHreflang(tool) {
    var lines = LANGS.map(function (l) {
        return '    <link rel="alternate" hreflang="' + l + '" href="' + langUrl(tool, l) + '">';
    });
    lines.push('    <link rel="alternate" hreflang="x-default" href="' + langUrl(tool, 'es') + '">');
    return lines.join('\n');
}

function generateLangSwitcher(tool, activeLang) {
    return LANGS.map(function (l) {
        var href   = (l === 'es') ? tool.toolPath : tool.toolPath + l + '/';
        var active = (l === activeLang) ? ' active' : '';
        return '<a href="' + href + '" class="lang-btn' + active + '" hreflang="' + l + '" aria-label="' + LANG_LABELS[l] + '">' + l.toUpperCase() + '</a>';
    }).join('\n                ');
}

/** Genera el bloque JSON-LD WebApplication */
function webAppSchema(tool, lang) {
    var t = T[lang];
    return JSON.stringify({
        '@context':          'https://schema.org',
        '@type':             tool.schemaType,
        name:                t[tool.id + '.h1'] || t[tool.id + '.page.title'],
        url:                 langUrl(tool, lang),
        description:         t[tool.id + '.meta.description'],
        applicationCategory: 'MultimediaApplication',
        operatingSystem:     'Web',
        browserRequirements: 'Requires a modern web browser',
        inLanguage:          LANGS,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }
    }, null, 6);
}

/** Genera el bloque JSON-LD FAQPage */
function faqSchema(tool, lang) {
    var t = T[lang];
    var questions = [];
    for (var i = 1; i <= tool.faqCount; i++) {
        questions.push({
            '@type': 'Question',
            name:    stripHtml(t[tool.id + '.faq.q' + i + '.q']),
            acceptedAnswer: {
                '@type': 'Answer',
                text:    stripHtml(t[tool.id + '.faq.q' + i + '.a'])
            }
        });
    }
    return JSON.stringify({
        '@context':  'https://schema.org',
        '@type':     'FAQPage',
        mainEntity:  questions
    }, null, 6);
}

/**
 * Renderiza un template sustituyendo {{key}} con traducciones.
 * Los placeholders especiales (HREFLANG, LANG_SWITCHER, etc.) se resuelven primero.
 */
function render(template, tool, lang) {
    var t    = T[lang];
    var html = template;

    // Placeholders especiales
    html = html.replace(/\{\{HREFLANG\}\}/g,       generateHreflang(tool));
    html = html.replace(/\{\{LANG_SWITCHER\}\}/g,  generateLangSwitcher(tool, lang));
    html = html.replace(/\{\{TOOL_TITLE\}\}/g,     t[tool.id + '.page.title'] || '');
    html = html.replace(/\{\{TOOL_DESCRIPTION\}\}/g, t[tool.id + '.meta.description'] || '');
    html = html.replace(/\{\{TOOL_KEYWORDS\}\}/g,  t[tool.id + '.meta.keywords'] || '');
    html = html.replace(/\{\{CANONICAL\}\}/g,      langUrl(tool, lang));

    // Todas las demas claves
    html = html.replace(/\{\{([^}]+)\}\}/g, function (m, key) {
        return (t[key] !== undefined) ? t[key] : m;
    });

    return html;
}

// -- Generar HTML --------------------------------------------------------------

TOOLS.forEach(function (tool) {
    var CONTENT = fs.readFileSync(tool.content, 'utf8');

    LANGS.forEach(function (lang) {
        var schemaBlocks = '';
        schemaBlocks += '    <!-- Schema.org -->\n';
        schemaBlocks += '    <script type="application/ld+json">\n' + webAppSchema(tool, lang) + '\n    </script>\n';
        if (tool.faqCount > 0) {
            schemaBlocks += '\n    <script type="application/ld+json">\n' + faqSchema(tool, lang) + '\n    </script>\n';
        }

        var scripts = tool.scripts.map(function (s) {
            return '    <script src="' + s + '"></script>';
        }).join('\n');

        var html =
            '<!DOCTYPE html>\n' +
            '<html lang="' + lang + '">\n' +
            '<head>\n' +
            render(HEAD, tool, lang) + '\n' +
            schemaBlocks +
            '</head>\n' +
            '<body>\n\n' +
            render(HEADER, tool, lang) + '\n\n' +
            render(CONTENT, tool, lang) + '\n\n' +
            render(FOOTER, tool, lang) + '\n\n' +
            '    <!-- Scripts -->\n' +
            scripts + '\n' +
            '</body>\n' +
            '</html>\n';

        var op  = outPath(tool, lang);
        var dir = path.dirname(op);
        if (dir && dir !== '.') { fs.mkdirSync(dir, { recursive: true }); }
        fs.writeFileSync(op, html, 'utf8');
        console.log('  ' + op);
    });
});

// -- Generar js/i18n.js -------------------------------------------------------

var i18nContent =
    '/* AUTO-GENERADO por build.js — editar _src/translations.json + _src/i18n-wrapper.js */\n\n' +
    'var _i18n_data = ' + JSON.stringify(T, null, 4) + ';\n\n' +
    WRAPPER;

fs.writeFileSync('js/i18n.js', i18nContent, 'utf8');
console.log('  js/i18n.js');
console.log('\nBuild completado.');
