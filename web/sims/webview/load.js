var ragic_url_sec = ragic_url.split('/');
var ap = ragic_url_sec[1];
var path = '/' + ragic_url_sec[2];
var sheetIndex = ragic_url_sec[3];

function isIE() {
    var na = navigator, ua = na.userAgent;
    var isWebKit = /WebKit/.test(ua);
    var isOpera = window.opera && opera.buildNumber;
    var isIE = !isWebKit && !isOpera && ((/MSIE/gi).test(ua) || (/Trident/gi).test(ua));

    return isIE;
}

function urlProcess(fromWp) {
    let search = '?webview&webaction=' + ragic_feature;
    if (fromWp) search += '&fromWp';
    if (window['embedAPIKey']) search += '&embedAPIKey=' + encodeURIComponent(window['embedAPIKey']);
    if (window['hideSlogan']) search += '&hideSlogan';
    if (window['webFormVersionIsNew']) search += '&ver=new';
    if (window['submitOnce']) search += '&submitOnce';
    if (window['pfv']) {
        Array.from(window['pfv']).forEach(function (obj) {
            if (!obj.hasOwnProperty('fieldId') || !obj.hasOwnProperty('fieldValue')) return;
            search += ('&pfv' + obj['fieldId'] + '=' + encodeURIComponent(obj['fieldValue']));
        });
    }
    if (window['version']) search += '&version=' + window['version'];
    if (window['dfCheckbox']) search += '&dfCheckbox';
    if (window['listData']) search += '&fv2';
    if (window['autoSearch']) search += '&search';
    if (window['noSearchBar']) search += '&noSearchBar';
    if (window['fieldSummary']) search += '&fieldSummary';
    if (window['applyDefaultView']) search += '&defaultView';
    if (window['ragic_webconfig']) search += '&webconfig';
    if (window['ragic_filterv3']) search += ('&fv3=' + window['ragic_filterv3']);

    return search;
}

function ragic_iframe_load() {
    const container = document.getElementById('ragic_webview');
    const scripts = document.getElementsByTagName('script');
    const ragicLink = document.getElementById('ragic-link');
    let fromWp = false;

    for (let scriptLength = scripts.length; scriptLength--;) {
        const src = scripts[scriptLength].src;
        if (src.indexOf("/common/load") !== -1) {
            fromWp = src.replace(/^[^\?]+\??/, '').indexOf("wp") !== -1;
            break;
        }
    }

    //normal request would have to check if Ragic icon exists
    if (!fromWp) {
        ragicLink.style.display = 'none'
        if (!ragicLink || ragicLink.innerHTML.indexOf('Ragic') == -1 || ragicLink.href.indexOf('ragic') == -1) {
            alert('config error');
            return;
        }
    }

    const baseUrl = (window.location.protocol === 'http:' ? 'http://' : 'https://') + ragic_url;
    const search = urlProcess(fromWp)

    if (window['ragic_embedtype'] && window['ragic_embedtype'] == 'report') {
        container.innerHTML = '<iframe id="ragic_iframe" title="ragic_iframe" src="' + baseUrl + '" style="border:none;width:100%;height:365px;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin allow-top-navigation"></iframe>';
    } else if(isIE()) {
        // This why we added this "tmp" method :
        // https://social.msdn.microsoft.com/Forums/Lync/en-US/9ff06194-b517-4363-b66d-308858aaf545/after-recent-updates-can-no-longer-download-files-in-ie-11?forum=iewebdevelopment
        container.innerHTML = '<iframe id="ragic_iframe" title="ragic_iframe" src="' + baseUrl + search + '" style="border:none;width:100%;"></iframe>';
    } else {
        container.innerHTML = '<iframe id="ragic_iframe" title="ragic_iframe" src="' + baseUrl + search + '" style="border:none;width:100%;max-height: 100vh;" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin allow-top-navigation"></iframe>';
    }
}

// postSize <=> receiveSize
function receiveSize(event) {
    if (isNaN(event.data)) {
        console.error('No data');
        return;
    }
    const iframe = document.getElementById('ragic_iframe');
    if (iframe && event.data !== -1) iframe.style.height = event.data + "px";
}

window.addEventListener("message", receiveSize, false);
window.addEventListener("load", ragic_iframe_load, false);
