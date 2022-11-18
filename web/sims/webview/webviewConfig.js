//todo: 整合至 database.js
function findPos(obj) {
    var curleft = obj.offsetLeft;
    var curtop = obj.offsetTop;
    var lastObj = obj;
    while (obj = obj.offsetParent) {//assignment operator, not mistake
        lastObj = obj;
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
    }
    return [curleft, curtop];
}

function read(func, file, sync, hideRetry) {
    var _reader = new XMLHttpRequest();
    _reader.open('GET', file, !sync);
    if (!sync) {
        _reader.onreadystatechange = function () {
            if (_reader.readyState == 4) {
                if (_reader.status != 200 && !hideRetry) {
                    return false;
                }
                if (func) func(_reader);
            }
        }
    }
    //this line below should only be turned on when testing localhost, the issue only occurs on localhost Ragic server
    //    if(ctrl.isIE) _reader.setRequestHeader("If-Modified-Since", "0");  //added at 2013/01/13, to solve IE local privacy issue
    _reader.send(null);
    if (sync) {
        if (_reader.status != 200 && !hideRetry) {
            return false;
        }
        if (func) func(_reader);
    }
    return true;
}

var currentHover = null;
document.onmouseover = function (e) {
    if (!e) e = window.event;
    //find target
    var t;
    if (!e) e = window.event;
    if (e.target) t = e.target;
    else if (e.srcElement) t = e.srcElement;
    if (t.nodeType == 3) t = t.parentNode;// defeat Safari bug
    if (!t) return;

    t = t.closest('.wvitem');

    if (t) {
        if (currentHover) currentHover.style.background = '';
        currentHover = t;
        t.style.background = '#e1e8f1';

        var pos = findPos(t);
        var sel = document.getElementById('ragic_config_selection');
        sel.style.top = (pos[1] + t.offsetHeight) + 'px';
        sel.style.left = pos[0] + 'px';
        sel.style.display = '';

        //set the selected field
        var currentDomainId = t.getAttribute('domainId');
        var wvname = t.getAttribute('wvname');
        sel.selectedIndex = 0;
        for (var i = 0; i < sel.options.length; i++) {
            if (sel.options[i].value == currentDomainId) {
                sel.selectedIndex = i;
                break;
            }
        }

        sel.onchange = function () {
            /*alternative way to location.reload.bind(location) for Edge's bug*/
            read(function(){location.reload();}, '/sims/webview/saveConfig.jsp?a=' + ap + '&p=' + encodeURIComponent(path) + '&fn=' + encodeURIComponent(formName) + '&wvname=' + wvname + '&v=' + this.options[this.selectedIndex].value);
        }
    }

};


