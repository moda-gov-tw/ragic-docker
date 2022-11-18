(function setPageNum() {
    const pageNumSetter = document.getElementById('wvpagenumsetter');
    if (!pageNumSetter) return;
    let timeoutEvent;

    function resetPageNum() {
        //clear former ajax request
        window.clearTimeout(timeoutEvent);
        timeoutEvent = window.setTimeout(function () {
            const num = document.getElementById('wvpagenumsetter').value;
            if (isNaN(num) || num <= 0) {
                location.reload();
                return;
            }
            const param = {a: apname, p: path, si: sheetIndex, wvname: 'pagesize', v: num};
            ajaxpost('/sims/webview/saveConfig.jsp', param);
        }, 1200);
    }

    pageNumSetter.addEventListener("paste", resetPageNum, false);
    pageNumSetter.addEventListener("input", resetPageNum, false);
})();

window.addEventListener("message", function receiveTheme(e) {
    if (!isNaN(e.data)) return;
    const data = JSON.parse(e.data);
    if (document.getElementById('wvthemepick' + data.webviewTheme)) {
        document.getElementById('wvthemepick' + data.webviewTheme).checked = true;
        document.getElementById('wvpagenumsetter').value = data.pageSize;
        document.getElementById('wvshowcomment').checked = data.showComment;
        document.getElementById('showLoginStatus').checked = data.showLogin;
    }
}, false);

window.addEventListener("beforeunload", function closeWin() {
    const win = document.getElementById('floatingWin');
    if (win) win.style.display = 'none';
}, false);

function showEditingPanel() {
    const iframe = document.createElement('IFRAME');
    iframe.src = "/sims/txtedit.jsp";
    iframe.style.cssText = "border: none; height: 500px; width: 100%;";
    iframe.onload = function () {
        // avoid refreshing page for the first time
        iframe.onload = function () {
            const ragic_iFrame = document.getElementById('ragic_iframe');
            if (ragic_iFrame) {
                ragic_iFrame.contentWindow.location.reload(true);
            }
        }.bind(this);
    }.bind(this);
    floatWin(null, iframe, '', true);
}

function changeEveryoneRight(right, callbackFunc, ap, path, sheetIndex) {
    const everyone_right = right || 0;
    const param = {ap, path, sheetIndex, everyone_right};
    parent.ajaxget("/sims/webview/config/changeFormRights.jsp", param, callbackFunc, false);
}

function webFormConfig() {
    const bannerMain = document.getElementById('embedBannerLibraryMain');
    const defaultSetting = document.getElementById('bannerDefaultSetting');
    const setUpBanner = document.getElementById('setUpBanner');
    const chooseThemeItem = document.getElementById('chooseThemeItem');
    const setUpFieldOrder = document.getElementById('setUpFieldOrder');
    const setPreFillValue = document.getElementById('setPreFillValue');
    const message = lm['defaultSettingVerify'];

    defaultSetting.onclick = function () {
        const result = window.confirm(message);
        if (!result) return;
        const param = {ap, path, sheetIndex, bannerType: 'default'};
        postPromise('/sims/changeEmbedBanner.jsp', param).then(function () {
            location.reload();
        });
    };

    setUpBanner.onclick = function () {
        toggleClass(this, 'selectedItem');
        rm(bannerMain);
        bannerMain.style.display = '';
        const bannerForm = document.createElement('FORM');
        const uploadButtonContent = document.createElement('DIV');
        const uploadButton = document.createElement('DIV');
        const uploadInfo = document.createElement('DIV');
        const img = document.createElement('IMG');
        const saveButton = document.createElement('DIV');
        const iframeDoc = document.getElementById('ragic_iframe').contentWindow.document;
        uploadInfo.className = 'bannerFormUploadInfo';
        uploadInfo.textContent = lm['bannerSizeInfo'];
        uploadButton.classList.add('bannerFormUploadButton');
        saveButton.classList.add('bannerFormSaveButton');
        uploadButtonContent.classList.add('bannerFormUploadButtonContent');
        img.classList.add('imgShow');
        bannerForm.method = "POST";
        bannerForm.enctype = "multipart/form-data";
        saveButton.textContent = lm['apply'];
        uploadButton.textContent = lm['uploadBanner'];
        const newFile = new FormData();
        uploadButton.onclick = function () {
            const innerInput = document.createElement('INPUT');
            innerInput.accept = 'image/*';
            innerInput.type = 'file';
            innerInput.name = 'banner';
            innerInput.onchange = function () { //preview the upload image : https://stackoverflow.com/questions/4459379/preview-an-image-before-it-is-uploaded
                (function (input) {
                    if (input.files && input.files[0]) {
                        // issue[12876]:檔名含有&字元時，在 Nuiform 處理時會出問題。
                        const originalFile = input.files[0];
                        const newFileName = encodeURIComponent(originalFile.name);
                        newFile.append('banner', originalFile, newFileName);
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            document.querySelector('.imgShow').setAttribute('src', e.target.result);
                        };
                        reader.readAsDataURL(input.files[0]);
                    }
                })(this);
                innerInput.style.display = 'none';
                if (bannerForm.querySelector('input[name="banner"]')) bannerForm.removeChild(bannerForm.querySelector('input[name="banner"]'));
                bannerForm.appendChild(innerInput);
                bannerForm.appendChild(saveButton);
            };
            innerInput.click();
        };
        saveButton.onclick = function () {
            const url = '/sims/changeEmbedBanner.jsp?ap=' + ap + '&path=' + encodeURIComponent(path) + '&sheetIndex=' + sheetIndex + '&url=' + encodeURIComponent(location.href) + '&bannerType=upload';
            postFormDataPromise(url, newFile).then(function () {
                location.reload();
            });
        };
        uploadButtonContent.appendChild(uploadButton);
        uploadButtonContent.appendChild(uploadInfo);
        bannerForm.appendChild(uploadButtonContent);
        bannerForm.appendChild(img);
        bannerMain.appendChild(bannerForm);
        ajaxget('/sims/getEmbedBannerImg.jsp', {'type': 'default'}, function (content) {
            const imgs = JSON.parse(content);
            const mainContent = document.createElement('DIV');
            mainContent.classList.add('mainContent');
            mainContent.onclick = function (e) { //choose banner image
                const target = e.target;
                const imgItem = target.closest('.imgItem');
                if (!imgItem) return;
                const imgName = imgItem.dataset.name;
                if (typeof imgName !== "undefined" && imgName !== null) {
                    const param = {ap, path, sheetIndex, bannerType: 'select', name: imgName, theme: 'default'};
                    postPromise('/sims/changeEmbedBanner.jsp', param).then(function () {
                        const imgSrc = imgItem.querySelector('img').src;
                        const _iframeDoc = document.getElementById('ragic_iframe').contentWindow.document;
                        _iframeDoc.querySelector('#banner').style.backgroundImage = 'url(' + imgSrc + ')';
                    });
                }
            };
            imgs.sort().reverse();
            imgs.forEach(function (name) {
                const imgItem = document.createElement('DIV');
                const img = document.createElement('IMG');
                imgItem.classList.add('imgItem');
                img.src = '/sims/img/embedFormBanner/default/' + name;
                imgItem.dataset.name = name;
                imgItem.appendChild(img);
                mainContent.appendChild(imgItem);
            });
            bannerMain.appendChild(mainContent);
        });
    };

    chooseThemeItem.onclick = function () {
        toggleClass(this, 'selectedItem');
        rm(bannerMain);
        bannerMain.style.display = '';
        const selectContent = document.createElement('DIV');
        const colorSelect = document.createElement('Div');
        const colorArr = ['#f0f0f0', '#fdeded', '#d3faff', '#e8ffe6', '#fff0c8', '#e7eef8', '#dac5bd', '#e2c2de', '#ffdac8'];
        const iframeDoc = document.getElementById('ragic_iframe').contentWindow.document;
        const currColor = iframeDoc.body.dataset.hex;
        for (let i = 0; i < colorArr.length; ++i) { //create color block to choose
            const colorDiv = document.createElement('DIV');
            colorDiv.classList.add('colorDiv');
            if (currColor === colorArr[i]) colorDiv.classList.add('colorDivActive');
            colorDiv.style.backgroundColor = colorArr[i];
            colorDiv.dataset.color = colorArr[i];
            const colorName = document.createElement('DIV');
            colorName.textContent = lm[colorArr[i]];
            colorName.classList.add('colorName');
            colorDiv.appendChild(colorName);
            colorSelect.appendChild(colorDiv);
        }
        //add default
        const colorDiv = document.createElement('DIV');
        colorDiv.classList.add('colorDiv');
        colorDiv.style.backgroundColor = '#ffffff';
        colorDiv.dataset.color = '#ffffff';
        colorDiv.style.boxShadow= 'inset 0 0 0 1px #DBDBDB';
        const colorName = document.createElement('DIV');
        colorName.textContent = lm['default'];
        colorName.classList.add('colorName');
        colorName.style.boxShadow = 'inset 0 0 0 1px #DBDBDB';
        colorDiv.appendChild(colorName);
        colorSelect.appendChild(colorDiv);

        colorSelect.classList.add('bannerColorSelect');
        selectContent.classList.add('bannerSelectContent');
        colorSelect.onclick = function (e) {
            const target = e.target;
            const colorValue = target.dataset.color;
            if (typeof colorValue !== 'undefined' && colorValue !== null) {
                const param = {ap, path, sheetIndex, bannerType: 'color', backgroundColor: colorValue, theme: 'default'};
                postPromise('/sims/changeEmbedBanner.jsp', param).then(function () {
                    const _iframeDoc = document.getElementById('ragic_iframe').contentWindow.document;
                    _iframeDoc.body.dataset.hex = colorValue;
                    _iframeDoc.body.style.backgroundColor = colorValue;
                    _iframeDoc.querySelector('.container').style.borderColor = colorValue;
                    toggleClass(target, 'colorDivActive');
                });
            }
        };
        selectContent.appendChild(colorSelect);
        bannerMain.appendChild(selectContent);
    };

    setUpFieldOrder.onclick = function () {
        toggleClass(this, 'selectedItem');
        rm(bannerMain);
        bannerMain.style.display = '';
        CustAppSeqHelper.open(true);
    };

    setPreFillValue.onclick = function () {
        toggleClass(this, 'selectedItem');
        rm(bannerMain);
        bannerMain.style.display = '';
        loadTemplate();
    }
}

function editTitle(selfDom) {
    const title = selfDom.previousElementSibling;
    if (!title || !title.classList.contains('pfv-template-title')) return;
    title.setAttribute('contenteditable', '');
    title.focus();
    title.addEventListener('blur', blurFn);

    function blurFn() {
        title.removeAttribute('contenteditable');
        title.removeEventListener('blur', blurFn);
    }
}

function removeTemplate(selfDom) {
    window.event.stopPropagation();
    const templateContainer = document.querySelector('.pfv-template-container');
    const template = selfDom.closest('.pfv-template-content');
    templateContainer.removeChild(template);
}

function addInstruction(selfDom) {
    const template = selfDom.closest('.pfv-template-content');
    const instructionContainer = template.querySelector('.pfv-template-instruction-container');
    const instruction = document.getElementById('instruction');
    const newInstruction = instruction.content.firstElementChild.cloneNode(true);
    instructionContainer.appendChild(newInstruction);
}

function deleteInstruction(selfDom) {
    window.event.stopPropagation();
    const template = selfDom.closest('.pfv-template-content');
    const instruction = selfDom.closest('.pfv-template-instruction-content');
    const instructionContainer = template.querySelector('.pfv-template-instruction-container');
    instructionContainer.removeChild(instruction);
}

function toggleClass(ele, className) {
    if (ele.parentNode.querySelector('.' + className)) {
        ele.parentNode.querySelector('.' + className).classList.remove(className);
    }
    ele.classList.add(className);
}

function loadTemplate() {
    const embedBannerLibraryMain = document.getElementById('embedBannerLibraryMain');
    const changeBannerFormDiv = document.getElementById('changeBannerFormDiv');
    if (changeBannerFormDiv) changeBannerFormDiv.style.display = '';
    const param = {
        'a': ap,
        'p': path,
        'si': sheetIndex,
        'action': 'load',
    };
    postPromise('/sims/preFillValue.jsp', param).then(function (text) {
        embedBannerLibraryMain.innerHTML = text;
        const templateContainer = document.querySelector('.pfv-template-container');
        templateContainer.addEventListener('click', function (e) {
            const target = e.target;
            if (!(target.tagName === "ARTICLE" || target.tagName === "DIV" || target.tagName === "SECTION" || target.tagName === 'FIELDSET')) return;
            const template = target.closest('.pfv-template-content');
            if (!template) return;
            const lastApplyTemplate = document.querySelector('.apply-template');
            if (template !== lastApplyTemplate) {
                toggleClass(template, 'apply-template');
            } else {
                template.classList.toggle('apply-template');
            }
        });
        document.querySelector('.addTemplate').onclick = function addTemplate() {
            const template = document.getElementById('template');
            const newTemplate = template.content.firstElementChild.cloneNode(true);
            templateContainer.appendChild(newTemplate);
        };
        document.querySelector('.saveTemplate').onclick = function saveTemplate() {
            const templates = Array.from(document.querySelectorAll('.pfv-template-content'));
            const json = templates.map(function (template) {
                const title = template.querySelector('.pfv-template-title').textContent;
                const instructions = Array.from(template.querySelectorAll('.pfv-template-instruction-content'));
                const pfv = instructions.map(function (instruction) {
                    const id = instruction.querySelector('select').value;
                    const val = instruction.querySelector('input').value;
                    return {
                        'fieldId': id,
                        'fieldValue': val
                    };
                });
                const apply = template.classList.contains('apply-template');
                return {
                    'title': title,
                    'instructions': pfv,
                    'apply': apply,
                };
            });
            const param = {
                'a': ap,
                'p': path,
                'si': sheetIndex,
                'action': 'saveTemplate',
                'embedPreFillValue': encodeURIComponent(JSON.stringify(json))
            };
            postPromise('/sims/preFillValue.jsp', param).then(function () {
                const template = document.querySelector('.apply-template');
                const instructions = template ? Array.from(template.querySelectorAll('.pfv-template-instruction-content')) : [];
                const pfvArray = instructions.map(function (instruction) {
                    const id = instruction.querySelector('select').value;
                    const val = instruction.querySelector('input').value;
                    return {
                        'fieldId': id,
                        'fieldValue': val
                    };
                });
                document.getElementById('ragic_iframe').src = (function (url, pfvArray) {
                    return url.split('&').filter(function (str) {
                        return !str.includes('pfv');
                    }).join('&') + pfvArray.reduce(function (acc, obj) {
                        return acc + '&pfv' + obj['fieldId'] + '=' + encodeURIComponent(obj['fieldValue'])
                    }, '');
                })(document.getElementById('ragic_iframe').src, pfvArray);
            });
        };
    });
}

function updateConfig(wvName, checkBoxId) {
    const param = {a: apname, p: path, si: sheetIndex, wvname: wvName, v: document.getElementById(checkBoxId).checked};
    postPromise('/sims/webview/saveConfig.jsp', param).then(function () {
        location.reload();
    });
}

function changeSettingState() {
    const _settings = document.getElementById('field-settings');
    _settings.style.display = _settings.style.display === 'none' ? 'block' : 'none';
}

function setDisplayedQueries(isTwoRow) {
    let displayedQueries = "";
    const options = document.getElementById('listingFieldOptions').options;
    for (let i = 0; i < options.length; i++) {
        displayedQueries += options[i].value + "|";
    }
    displayedQueries = displayedQueries.substring(0, displayedQueries.length - 1);
    const param = {a: ap, p: path, si: sheetIndex, wvname: (isTwoRow ? 'twoRowDisplayedqueries' : 'displayedqueries'), v: displayedQueries};
    postPromise('/sims/webview/saveConfig.jsp', param).then(function () {
        location.reload();
    });
}

function changeExactMode() {
    const autocompleteMode = document.getElementById('autocompleteMode');
    const wvExactMode = document.getElementById('wvExactMode');
    const param = {ap: apname, path, si: sheetIndex, wvname: 'queryExactMode', v: wvExactMode.checked};
    postPromise('/sims/webview/openExactMode.jsp', param).then(function () {
        location.reload();
    });
    autocompleteMode.style.display = wvExactMode.checked ? 'none' : '';
}

function changeTheme(theme) {
    read(function () {
        location.reload();
    }, '/sims/webview/saveConfig.jsp?a=' + ap + '&p=' + encodeURIComponent(path) + '&si=' + sheetIndex + '&wvname=theme&v=' + theme);
}