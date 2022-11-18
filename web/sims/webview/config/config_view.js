// todo: 整合於config.js，之後會刪除該檔案
let timeoutEvent;

function resetPageNum() {
    window.clearTimeout(timeoutEvent);  //clear former ajax request
    timeoutEvent = window.setTimeout(function () {
        const xmlhttp = new XMLHttpRequest();
        const num = document.getElementById('wvpagenumsetter').value;
        if (isNaN(num) || num <= 0) {
            location.reload();
            return;
        }
        xmlhttp.open('POST', '/sims/webview/saveConfig.jsp', true);
        xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xmlhttp.send("a=" + apname + "&p=" + path + "&si=" + sheetIndex + "&wvname=pagesize&v=" + num);
    }, 1200);
}

window.addEventListener("message", receiveTheme, false);
const wvpagenumsetter = document.getElementById('wvpagenumsetter');
wvpagenumsetter.addEventListener("paste", resetPageNum, false);
wvpagenumsetter.addEventListener("input", resetPageNum, false);

function updateConfig(wvName, checkBoxId) {
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.open('POST', '/sims/webview/saveConfig.jsp', true);
    xmlHttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlHttp.onreadystatechange = function () {
        if (xmlHttp.readyState === 4) {
            if (xmlHttp.status !== 200) return false;
            //reload iframe
            const ifr = document.getElementById('ragic_iframe');
            ifr.contentDocument.location.reload(true);
        }
    };
    xmlHttp.send("a=" + apname + "&p=" + path + "&si=" + sheetIndex + "&wvname=" + wvName + "&v=" + document.getElementById(checkBoxId).checked);
}