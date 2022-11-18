var ragic_server = ragic_url.split('/')[0],
    fromWp = false;

function readForFPS(file) {
    const _reader = document.createElement("script");
    _reader.setAttribute('src', file);
    if (head) {
        head.appendChild(_reader);
    } else {
        document.body.appendChild(_reader);
    }
}

var __doc = document;

function node(type) {
    return __doc.createElement(type);
}

function findPos(obj) {
    let curleft = obj.offsetLeft;
    let curtop = obj.offsetTop;
    let lastObj = obj;
    while (obj = obj.offsetParent) {//assignment operator, not mistake
        lastObj = obj;
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
    }
    return [curleft, curtop];
}

//prepare variables
var ragic_url_sec = ragic_url.split('/');
var ap = ragic_url_sec[1], path = '/' + ragic_url_sec[2], sheetIndex = ragic_url_sec[3];

var searchDropSelector = {
    qt: "",
    selectedIndex: -1,
    keywords: null,
    options: null,
    loadOptions: function () {
        if (this.qt && this.qt === document.getElementById('ragic_searchbox').value) {
            searchDropSelector.renderOptions();
            return;
        }
        this.qt = document.getElementById('ragic_searchbox').value;
        if (!this.qt || this.qt.length === 0) {
            let searchDropSelector = document.getElementById('searchDropSelector');
            if (searchDropSelector) searchDropSelector.style.display = 'none';
            return;
        }
        readForFPS((window.location.protocol === 'https:' ? 'https://' : 'http://') +
            ragic_server + '/sims/searchPrefix.jsp?a=' + ap + '&q=' + encodeURIComponent(this.qt) + '&p=' + (path ? encodeURIComponent(path) : '') + '&si=' + sheetIndex + '&t=' + new Date().getTime() + '&webview' + (fromWp ? '&fromWp' : ''));
    },
    openOption: function () {
        const index = searchDropSelector.selectedIndex;
        const keywordsLength = searchDropSelector.keywords.length;
        if (searchDropSelector.options.length === 0 || index < 0) {
        }
        else if (index < keywordsLength) {
            document.getElementById('ragic_searchbox').value = searchDropSelector.keywords[index]['w'];
            document.getElementById('ragic_searchbutton').onclick();
        }
        else {
            if (document.getElementById('searchDropSelector')) document.getElementById('searchDropSelector').style.display = 'none';
            var nodeId = searchDropSelector.options[index - keywordsLength]['url'].split('/')[3];
            var container = document.getElementById('ragic_fts');
            container.innerHTML = '<iframe id="ragic_iframe" sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin allow-top-navigation" src="' + (window.location.protocol == 'https:' ? 'https://' : 'http://') + ragic_server + '/' + ap + path + '/' + sheetIndex + '/' + nodeId + '.xhtml?wv=fts' + (fromWp ? '&fromWp' : '') + (hideSlogan ? '&hideSlogan' : '') + '" style="border:none;width:100%;"></iframe>';
        }
    },
    move: function (add) {
        this.selectedIndex += add;
        const total = Math.max(1, this.options.length + this.keywords.length);
        if (this.selectedIndex < 0) this.selectedIndex = -1;
        else if (this.selectedIndex >= total) this.selectedIndex = total - 1;

        this.renderOptions();
    },
    renderOptions: function () {
        let drop = document.getElementById('searchDropSelector');
        if (!drop) {
            drop = node('div');
            drop.className = 'searchDropSelector';
            drop.id = 'searchDropSelector';
        }
        else {
            drop.style.display = '';
            drop.innerHTML = '';
        }

        const searchbox = document.getElementById('ragic_searchbox');
        const pos = findPos(searchbox);
        drop.style.minWidth = searchbox.offsetWidth + "px";
        drop.style.top = (pos[1] + searchbox.offsetHeight) + "px";
        drop.style.left = pos[0] + "px";
        document.body.appendChild(drop);
        let index = 0, i, op;

        //render keywords
        for (i = 0; i < this.keywords.length; i++) {
            op = node('div');
            op.className = 'searchDropdiv';
            op.setAttribute('index', index);
            op.onmouseover = focusOnFTSOption;
            op.onclick = searchDropSelector.openOption;
            let titleSpan = node('span');
            op.appendChild(titleSpan);

            //coloring
            if (index === this.selectedIndex) {
                searchDropSelector.selectedOption = op;
                op.className = 'searchDropdivSelected';
            }
            titleSpan.innerHTML = this.keywords[i]['d'];

            drop.appendChild(op);
            index++;
        }

        //render matched entries
        for (i = 0; i < this.options.length; i++) {
            op = node('div');
            op.className = 'searchDropdiv';
            op.setAttribute('index', index);
            op.onmouseover = focusOnFTSOption;
            let titleSpan = node('span');
            op.appendChild(titleSpan);
            let sheetNameSpan = node('span');
            op.appendChild(sheetNameSpan);
            sheetNameSpan.className = 'sheetNameSpan';
            let matchSpan = node('span');
            op.appendChild(matchSpan);

            //coloring
            if (index === this.selectedIndex) {
                searchDropSelector.selectedOption = op;
                op.className = 'searchDropdivSelected';
            }

            titleSpan.innerHTML = this.options[i]['name'] || '&nbsp;';
            matchSpan.innerHTML = ' - ' + (this.options[i]['term'] + '...' || '&nbsp;');
            sheetNameSpan.innerHTML = ' - ' + this.options[i]['fn'];

            op.json = this.options[i];
            op.onclick = searchDropSelector.openOption;
            drop.appendChild(op);
            index++;
        }

        //if nothing matched at all
        if (index === 0) {
            op = node('div');
            op.className = 'searchDropdiv';
            op.innerHTML = searchbox.value + ' - Search';
            op.setAttribute('index', index);
            op.onmouseover = focusOnFTSOption;
            op.onclick = searchDropSelector.openOption;

            //coloring
            if (index === this.selectedIndex) {
                searchDropSelector.selectedOption = op;
                op.className = 'searchDropdivSelected';
            }

            drop.appendChild(op);
            index++;
        }
    }
};

function focusOnFTSOption() {
    searchDropSelector.selectedIndex = parseInt(this.getAttribute('index'));
    if (searchDropSelector.selectedOption) searchDropSelector.selectedOption.className = 'searchDropdiv';
}

if (!document.getElementById('ragic_webview_css')) {
    var head = document.getElementsByTagName('head')[0];
    var style = document.createElement('style');
    style.innerHTML = ".searchDropSelector{position:absolute;background:#fff;font-size:14px;line-height:22px;border:1px solid #aaa;z-index:200}\n" +
        ".searchDropSelector div{cursor:pointer;padding:3px 15px}\n" +
        ".searchDropdiv2{background:#f6f6f6}\n" +
        ".searchDropdiv:hover,.searchDropdiv2:hover,.searchDropdivSelected{background:#efefef}\n" +
        ".ftsMatch{color:#DD4B39!important}\n" +
        ".thebutton3:visited,.thebutton3:hover,.thebutton3:active,.thebutton3:link{text-decoration:none;cursor:pointer}\n" +
        ".thebutton3{box-shadow:inset 0 1px 0 0 #fff;background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #ededed), color-stop(1, #dfdfdf) );background:-moz-linear-gradient( center top, #ededed 5%, #dfdfdf 100% );filter:progid:DXImageTransform.Microsoft.gradient(startColorstr='#ededed',endColorstr='#dfdfdf');background-color:#ededed;-moz-border-radius:6px;-webkit-border-radius:6px;border-radius:6px;border:1px solid #bbb;display:inline-block;color:#777;font-family:arial;font-size:15px;font-weight:700;text-decoration:none;text-shadow:1px 1px 0 #fff;padding:6px 24px}\n" +
        ".thebutton3:hover{background:-webkit-gradient( linear, left top, left bottom, color-stop(0.05, #dfdfdf), color-stop(1, #ededed) );background:-moz-linear-gradient( center top, #dfdfdf 5%, #ededed 100% );filter:progid:DXImageTransform.Microsoft.gradient(startColorstr='#dfdfdf',endColorstr='#ededed');background-color:#dfdfdf}\n" +
        ".thebutton3:active{position:relative;top:1px}\n" +
        "#ragic_iframe{transition:all .5s;-moz-transition:all .5s;-webkit-transition:all .5s;-o-transition:all .5s}\n" +
        "#ragic_searchbox,#ragic_searchbutton{font-size: 100%;margin: 0;vertical-align: baseline;line-height: normal;}\n" +
        "#ragic_searchbutton{-webkit-appearance: button;cursor: pointer;}";
    head.appendChild(style);
}
window.addEventListener("load", ragic_iframe_load, false);

function ragic_iframe_load() {
    const scripts = document.getElementsByTagName('script'),
        brlink = document.getElementById('ragic-link');

    for (let _si = scripts.length; _si--;) {
        const _src = scripts[_si].src;
        if (_src.indexOf("/common/load") !== -1) {
            fromWp = _src.replace(/^[^\?]+\??/, '').indexOf("wp") !== -1;
            break;
        }
    }

    if (!fromWp) {  //normal request would have to check if Ragic icon exists
        if (!brlink || brlink.innerHTML.indexOf('Ragic') == -1 || brlink.href.indexOf('https://www.ragic.com') == -1) {
            alert('config error');
            return;
        }
    }

    const baseUrl = window.location.protocol == "https:" ? "https://" + ragic_url : "http://" + ragic_url;

    let webaction = '&webaction=fts';
    if (fromWp) webaction += '&fromWp';
    if (window['embedAPIKey']) webaction += '&embedAPIKey=' + encodeURIComponent(window['embedAPIKey']);

    readForFPS(baseUrl + '?webview' + webaction + (window.ragic_webconfig ? '&webconfig' : ''));
    if (!fromWp) {
        brlink.style.display = 'none';
    }
}

function receiveSize(e) {
    const iframe = document.getElementById('ragic_iframe');
    if (iframe) iframe.style.height = e.data + "px";
}

window.addEventListener("message", receiveSize, false);
document.addEventListener("click", documentClick, false);

function documentClick() {
    const searchDropSelector = document.getElementById('searchDropSelector');
    if (searchDropSelector) searchDropSelector.style.display = 'none';
}