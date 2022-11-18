Element.prototype.isNodeList = function () {
    return false;
};
NodeList.prototype.isNodeList = HTMLCollection.prototype.isNodeList = function () {
    return true;
};

// 判斷瀏覽器
// https://stackoverflow.com/questions/5916900/how-can-you-detect-the-version-of-a-browser
navigator.sayswho = (function () {
    const ua = navigator.userAgent;
    let tem;
    let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE ' + (tem[1] || '');
    }
    if (M[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return M.join(' ');
})();
const isIE = navigator.sayswho.includes('IE');
const isSafari = navigator.sayswho.includes('Safari');
let addressField;
let mvpTarget;

function createBarSelect(select) {
    const webFormSelection = select.parentNode;
    const container = webFormSelection.querySelector('.singleSelectionContainer');
    const barSelect = BarSelectAgent.modifiedSelector('', select, container, {});
    barSelect.setAfterSelectOption(function (option) {
        select.value = option.value;
        webForm.triggerEvent(select, 'change');
    });
    select.addEventListener('change', function () {
        barSelect.updateOptionsBySelect(select);
    });
}

function createComboForMultiSelect(select) {
    const options = [];
    const webFormSelection = select.parentNode;
    for (let i = 0; i < select.options.length; i++) {
        const option = select.options[i];
        const newOption = {
            'value': option.getAttribute("nodeid"),
            'text': option.textContent,
            'selected': option.selected
        };
        if (newOption.text === "" && newOption.value === "") continue;
        options.push(newOption);
    }

    const name = select.name || '',
        divParent = select.parentNode.querySelector('.multiSelectionContainer') || select.parentNode,
        multiObj = MultiSelectComboAgent.createMultiSelectCombo('', options, divParent, name);


    multiObj.setRenderWithFormElement(false);
    multiObj.render();
    multiObj.setOnToggleDropdown(function (spread) {
        if (spread) {
            clearDropWin();
        }
    });

    multiObj.setAfterChangeItem(function (option) {
        const correspondingSelect = document.getElementById(this.id).closest('.webFormSelection').querySelector("select");
        if (correspondingSelect) {
            const nodeId = option.value;
            const correspondingOption = correspondingSelect.querySelector('option[nodeid="' + nodeId + '"]');
            if (correspondingOption && correspondingOption.selected) {
                correspondingOption.selected = false;
            } else if (correspondingOption) {
                correspondingOption.selected = true;
            }

            const webFormWidget = select.closest('.webFormWidget');
            if (webFormWidget.getAttribute('subgroup')) {
                const defaultHeight = webForm.subTableRowHeight[webFormWidget.getAttribute("Y")];
                const indexOfSubRow = Array.from(webFormWidget.querySelectorAll('.webFormSelection')).indexOf(webFormSelection);
                const lineSection = webFormWidget.closest('.lineSection') ? webFormWidget.closest('.lineSection') : webFormWidget.closest('.line'); //support rwd and old version
                const webFormWidgets = Array.from(lineSection.querySelectorAll('.webFormWidget'));
                const comboHeight = webFormSelection.querySelector(".multiSelectionContainer").offsetHeight + 4;
                const newHeight = comboHeight > defaultHeight ? comboHeight + 'px' : defaultHeight + 'px';
                webFormWidgets.forEach(function (ele) {
                    // the firstChild is title
                    ele.children[indexOfSubRow + 1].style.height = newHeight;
                });
            }
        }
    });
}

/** override functions in sims.js **/
function hideTooltip() {
    if (ctrl.buttoutTimer) {
        clearTimeout(ctrl.buttoutTimer);
    }
}

function processDefaultValueString(str) {
    if (!str) return;

    //check if date calculation mode
    if (str.includes('$DATE') && str !== '$DATETIME') {
        str = str.replace('$DATE', new Date().getTime() / (1000 * 60 * 60 * 24));
        const result = Function('"use strict";return (' + str + ')')();
        return formatDate(new Date(result * 1000 * 60 * 60 * 24), 'yyyy/MM/dd');
    }
    if (str.substr(0, 1) === '$') {
        let d = new Date();
        if (str === '$DATE') str = formatDate(d, 'yyyy/MM/dd');//standard date format
        else if (str === '$YEAR') str = d.getFullYear();
        else if (str === '$MONTH') str = d.getMonth() + 1;
        else if (str === '$TIME') str = LZ(d.getHours()) + ':' + LZ(d.getMinutes()) + ':' + LZ(d.getSeconds());
        else if (str === '$DATETIME') str = formatDate(d, 'yyyy/MM/dd HH:mm:ss');//standard datetime format
        else if (str === '$WEEKDAY') str = d.getDay();
        else if (str === '$USERID') str = window['user'] || '';
        else if (str === '$USERNAME' || str === '$USER') str = userName || '';
        else if (str === '$ACCOUNT') str = window['myapp'];
        else if (str === '$MGRACCOUNT') str = window['mymgrapp'];
        else if (str.startsWith('$CUR')) {
            const curfrom = str.substr(4, 3);
            const curto = str.substr(7, 3);
            const exrate = fxrate(curfrom, curto);
            str = ragic_number_format(exrate, '#.#####');
        }
        else if (str === '$EMPTY_VALUE') str = '';
    } else if (str.substr(0, 1) === '#') {
        let d = new Date();
        if (str === '#DATE') str = formatDate(d, 'yyyy/MM/dd');
        else if (str === '#TIME') str = LZ(d.getHours()) + ':' + LZ(d.getMinutes()) + ':' + LZ(d.getSeconds());
        else if (str === '#DATETIME') str = formatDate(d, 'yyyy/MM/dd HH:mm:ss');
        else if (str === '#YEAR') str = d.getFullYear();
        else if (str === '#MONTH') str = d.getMonth() + 1;
        else if (str === '#WEEKDAY') str = d.getDay();
        else if (str === '#USERID') str = (window['user'] && !equalIgnoreCase(window['user'],'guest account')) ? window['user'] : '';
        else if (str === '#USERNAME' || str === '#USER') str = (window['userName'] && !equalIgnoreCase(window['userName'],'guest account')) ? window['userName'] : '';
    }
    return str;
}

function datePickerDateClick() {
    const dateString = this.getAttribute('value');
    let fullString = dateString;
    if (this.picker.hasTime) {
        const timeSel = this.picker.timeSel;
        let time = '00:00:00';

        if (timeSel.selectedIndex === -1) {//time not chosen
            this.picker.cellDate = parseDate(dateString);
            ctrl.dropWin = true;
            this.picker.showMonth();
            return;
        }
        else {//time chosen
            time = timeSel.options[timeSel.selectedIndex].value;
            fullString = dateString + ' ' + time + ':00';
        }
    }

    ctrl.datePickerInput.value = fullString;
    webForm.triggerEvent(ctrl.datePickerInput, 'change');
    clearDropWin();
}

function datePickerTimeClick() {
    const timeSel = this,
        _options = timeSel.options,
        time = _options[timeSel.selectedIndex].value,
        _picker = _options[timeSel.selectedIndex].picker,
        cellDate = _picker.cellDate ? _picker.cellDate : new Date(),
        dateString = formatDate(cellDate, 'yyyy/MM/dd'),
        timeOnly = !_picker.hasDate,
        fullString = timeOnly ? time : dateString + ' ' + time + ':00';

    ctrl.datePickerInput.value = fullString;
    webForm.triggerEvent(ctrl.datePickerInput, 'change');
    clearDropWin();
}


function showSignBox(caller) {
    const signatureWin = $('webFormSignatureWin');
    signatureWin.style.display = 'block';
    const centerX = (window.innerWidth - signatureWin.getBoundingClientRect().width) / 2;
    const centerY = (window.innerHeight - signatureWin.getBoundingClientRect().height) / 2;
    signatureWin.style.top = centerY + 'px';
    signatureWin.style.left = centerX + 'px';

    let node = caller.parentNode,
        index = 0;
    const domainId = node.parentNode.getAttribute("domainId");
    while ((node = node.previousElementSibling)) {
        index++;
    }
    signatureWin.dataset.domainId = domainId;
    signatureWin.dataset.index = index;

    loadSigScript($("webFormSigCanvas"));

    if (!ctrl.isIE || !ctrl.isObsoleteIE) {
        const sigBackgroundDiv = $('webFormSigBackgroundDiv');
        sigBackgroundDiv.style.display = 'block';
        setSignatureBackgroundBox();
    }
}

function openAddMVPOptionForm(mvp, stf, domainId) {
    const mvpSplit = mvp.split("|");
    const mvpPath = mvpSplit[0];
    const mvpSheet = mvpSplit[1];
    const mvpSheetIndex = mvpSheet.split('_')[0];
    const newUrl = ap + mvpPath + '/' + mvpSheetIndex;
    webForm.callbackFn = mvpCallback;
    webForm.mvpInfo = {};
    webForm.mvpInfo.domainId = domainId;
    webForm.mvpInfo.stf = stf;
    if (typeof ragic_url === 'undefined') {
        window.open(location.protocol + '//' + location.host + '/' + newUrl + '?webview&webaction=form&saveClose');
    } else {
        window.open(location.protocol + '//' + ragic_url + '?webview&webaction=form&saveClose');
    }
}

function mvpCallback(returnValue) {
    const result = JSON.parse(returnValue);
    const stf = webForm.mvpInfo.stf;
    const domainId = webForm.mvpInfo.domainId;
    const select = document.querySelector('.webFormSelection select[name="' + domainId + '"]');
    const resultOption = node('OPTION');
    resultOption.value = result.data[stf];
    resultOption.setAttribute('nodeid', result['_ragicId']);
    resultOption.appendChild(document.createTextNode(result.data[stf]));
    select.appendChild(resultOption);
    select.selectedIndex = select.querySelectorAll('option').length - 1;
}

function setSignatureBackgroundBox() {
    const fromLocalIcon = $('sigFromLocal'),
        fromWebIcon = $('sigFromWeb');
    fromLocalIcon.onclick = function () {
        let input = node('input');
        input.accept = 'image/*';
        input.type = 'file';
        input.onchange = function () {
            readBlobAsDataURL(this.files[0]).then(setSignatureBackground);
        };
        input.click();
    };
    fromWebIcon.onclick = function () {
        let url = prompt('Please type the image url');
        if (!!url && url.includes('.')) {
            if (!url.startsWith("http")) {
                url = "https://" + url;
            }
            fetch(url)
                .then(function (response) { return response.blob(); })
                .then(readBlobAsDataURL)
                .then(setSignatureBackground)
                .catch(console.log);
        }
    };
}

function saveSig() {
    const data = ctrl.signaturePad.toDataURL(),
        signatureWin = $('webFormSignatureWin');
    let domainId, index, domainContainer, inputContainer;

    signatureWin.style.display = 'none';
    domainId = signatureWin.dataset.domainId;
    index = signatureWin.dataset.index;

    domainContainer = document.querySelector('DIV[domainId="' + domainId + '"]');
    inputContainer = domainContainer.childNodes[index];
    rm(inputContainer.firstChild.firstChild);
    const img = document.createElement('IMG');
    img.src = data;
    inputContainer.firstChild.firstChild.appendChild(img);
    inputContainer.lastChild.value = data;
}

function SUBTABLEROW(a, b) {
    b = parseInt(b);
    if (Array.isArray(a.SUM)) {
        const c = a.SUM.find(function (a) {
            return a.y === b
        });
        if (c) return c.value
    }
    return "";
}

function bbcodeToHtml(freeElement) {
    const p = freeElement.querySelector('p');
    const rawValue = displayValueProcess(p.innerHTML.replace(/<br\s*(\/)?>/gim, '\n'));
    const reg=/(^|[^=\[\]"'])((?:https?):(?:\/{1,3}|\\{1})[-a-zA-Z0-9:;,@#!%&()~_?\+=\/\\\.]*[-a-zA-Z0-9+&@#/%=~_|])/gim;
    let processValue = rawValue.replace(reg, "$1<a href='$2' target='_blank' rel='noopener noreferrer nofollow' onmousedown='event.preventDefault();event.stopPropagation();'>$2</a>");
    processValue = RagicBBCodeParser.processToHTML(processValue);
    p.innerHTML = processValue;
    if (p.dataset.action) { //issue[11751]
        p.onclick = function() {
            open(p.dataset.action, "_blank", "noopener noreferrer");
        };
    }
}

formulaBuilder.getFormulaVariables = _get_formula_variables_webview;

function _get_formula_variables_webview(fMode, y, formula) {
    const map = webForm.widgetsMap,
        _form = webForm._form,
        originFMode = fMode,
        isFormulaIF = new RegExp(".*IF([S])*\\(.*\\).*").test(formula);
    let o, key;
    for (key in map) {
        o = map[key];

        fMode = originFMode;

        // format data, refer to Biff.prototype.format
        const isFormatNum = o.self.hasAttribute('fmt_n');
        let isFormatDate = o.self.hasAttribute('fmt_d');
        const isFormatPhone = o.self.hasAttribute('phonefmt');

        if (isFormulaIF) {
            if (isFormatNum) {
                fMode = formulaMode.NUMBER;
            } else if (isFormatDate) {
                fMode = formulaMode.DATE;
            }
        }

        const modeString = fMode === formulaMode.STRING;
        let total = modeString ? '' : 0,
            totalRaw = '',
            max = NaN,
            min = NaN,
            first = '',
            last = '',
            count = 0;

        if (o.self.hasAttribute("subgroup")) {
            total = [];
            let _value;
            let numValue;
            let subObj;

            if (y && y > 0 && o.self.children[y] && o.self.children[y].querySelector('[webform]') &&
                !o.self.children[y].querySelector('[webform]').classList.contains("webFormAGDiv")) {
                const inputElement = o.self.children[y].querySelector('[webform]');
                _value = inputElement.value;
                if (inputElement.type === 'file' && inputElement.files.length > 0) {
                    _value = inputElement.files[0].name;
                }
                //date should use original unformatted value
                else if(isFormatDate) {
                    _value = inputElement.dataset.originalValue || _value;
                }
                totalRaw = _value;
                subObj = {"y": y, "raw": totalRaw};
                total.push(subObj);

                if (modeString) {
                    if (isFormatPhone) {
                        subObj.value = ragic_phone_unformat(totalRaw, o.self.getAttribute('phonefmt'));
                    } else {
                        if (isFormatDate) {
                            numValue = parseDateLong(totalRaw, o.self.getAttribute('fmt_d')) || NaN;
                        } else {
                            numValue = parseFloat(totalRaw);
                        }
                        if (!isNaN(numValue)) {
                            if (totalRaw.includes("%")) {
                                numValue = Math.round(numValue / 100 * 1000000) / 1000000;
                            }
                            subObj.value = numValue;
                            if ((isNaN(min) || numValue < min)) {
                                min = numValue;
                            }
                            if ((isNaN(max) || numValue > max)) {
                                max = numValue;
                            }
                        } else {
                            subObj.value = totalRaw;
                        }
                    }
                } else {
                    if (isFormatDate) {
                        numValue = parseDateLong(_value, o.self.getAttribute('fmt_d')) || NaN;
                    } else {
                        let needPrecise = _value && _value.includes("%");
                        if (_value && inputElement.tagName !== 'SELECT') {
                            _value = _value.replace(/[^0-9\.-]+/g, "");
                        }
                        numValue = parseFloat(_value);
                        if (needPrecise) {
                            numValue = Math.round(numValue / 100 * 1000000) / 1000000;
                        }
                    }
                    subObj.value = numValue;
                    if (!isNaN(numValue)) {
                        if (!isFormatDate) {
                            subObj.raw = numValue;
                            totalRaw = numValue;
                        }
                        if ((isNaN(min) || numValue < min)) {
                            min = numValue;
                        }
                        if ((isNaN(max) || numValue > max)) {
                            max = numValue;
                        }
                    }
                }
                count = y;
            } else {
                let i = 1;
                const rows = o.self.children;
                for (; i < rows.length; i++) {
                    if (rows[i].classList.contains('webformSettingConf')) continue;
                    _value = rows[i].querySelector('[webform]').value;
                    if (rows[i].lastChild.type === 'file') {
                        if (rows[i].lastChild.files.length > 0) {
                            _value = rows[i].lastChild.files[0].name;
                        }
                    }
                    //date should use original unformatted value
                    else if(isFormatDate) {
                        _value = rows[i].lastChild.dataset.originalValue || _value;
                    }

                    if (i === 1) first = _value;
                    last = _value;

                    if (rows[i].classList.contains('webformSettingConf')) continue;
                    if (rows[i].lastChild.classList.contains("webFormAGDiv")) continue;

                    subObj = {"y": i, "raw": _value};
                    total.push(subObj);

                    if (modeString) {
                        totalRaw += _value;
                        if (isFormatPhone) {
                            subObj.value = ragic_phone_unformat(_value, o.self.getAttribute('phonefmt'));
                        } else {
                            if (isFormatDate) {
                                numValue = parseDateLong(_value, o.self.getAttribute('fmt_d')) || NaN;
                            } else {
                                numValue = parseFloat(_value);
                            }
                            if (!isNaN(numValue)) {
                                if (_value.includes("%")) {
                                    numValue = Math.round(numValue / 100 * 1000000) / 1000000;
                                }
                                subObj.value = numValue;
                                if ((isNaN(min) || numValue < min)) {
                                    min = numValue;
                                }
                                if ((isNaN(max) || numValue > max)) {
                                    max = numValue;
                                }
                            } else {
                                subObj.value = _value;
                            }
                        }
                    }
                    else {
                        if (isFormatDate) {
                            numValue = parseDateLong(_value, o.self.getAttribute('fmt_d')) || NaN;
                            totalRaw += _value;
                        } else {
                            let needPrecise = _value.includes("%");
                            if (rows[i].lastChild.tagName !== 'SELECT') {
                                _value = _value.replace(/[^0-9\.-]+/g, "");
                            }
                            numValue = parseFloat(_value);
                            if (needPrecise) {
                                numValue = Math.round(numValue / 100 * 1000000) / 1000000;
                            }
                        }
                        subObj.value = numValue;
                        if (!isNaN(numValue)) {
                            if (!isFormatDate) {
                                totalRaw += numValue;
                            }
                            if ((isNaN(min) || numValue < min)) {
                                min = numValue;
                            }
                            if ((isNaN(max) || numValue > max)) {
                                max = numValue;
                            }
                        }
                    }
                    count++;
                }
            }
        } else {
            const inputElement = _form.elements.namedItem(o.self.getAttribute("domainId"));
            let formElementValue = '';
            if (inputElement) {
                if (inputElement.isNodeList()) {
                    let index;
                    switch (inputElement[0].type.toLowerCase()) {
                        case "radio":
                            for (index = inputElement.length; index--;) {
                                if (inputElement[index].checked) {
                                    formElementValue = inputElement[index].value;
                                    break;
                                }
                            }
                            break;
                        case "checkbox":
                            if (fMode === formulaMode.STRING) {
                                formElementValue = "";
                            }
                            else {
                                formElementValue = "0";
                            }
                            for (index = inputElement.length; index--;) {
                                if (inputElement[index].checked) {
                                    formElementValue += inputElement[index].value;
                                }
                            }
                            break;
                        default:
                            formElementValue = inputElement.value;
                    }
                } else {
                    if (inputElement.type === 'file') {
                        const files = inputElement.files;
                        if (files.length === 0) formElementValue = "";
                        else formElementValue = files[0].name;
                    }
                    //date should use original unformatted value
                    else if (isFormatDate) {
                        formElementValue = inputElement.dataset.originalValue || inputElement.value;
                    }
                    else {
                        formElementValue = inputElement.value;
                    }
                }
            }


            if (modeString) {
                totalRaw = formElementValue;
                if (isFormatPhone) {
                    total = ragic_phone_unformat(totalRaw, o.self.getAttribute('phonefmt'));
                } else {
                    total = totalRaw;
                }

                let numValue = parseFloat(totalRaw);
                if (!isNaN(numValue)) {
                    if (totalRaw.includes("%")) {
                        numValue = Math.round(numValue / 100 * 1000000) / 1000000;
                    }
                    if ((isNaN(min) || numValue < min)) {
                        min = numValue;
                    }
                    if ((isNaN(max) || numValue > max)) {
                        max = numValue;
                    }
                }
            } else {
                let numValue;
                if (isFormatDate) {
                    numValue = parseDateLong(formElementValue, o.self.getAttribute('fmt_d')) || NaN;
                    totalRaw = formElementValue;
                } else {
                    numValue = parseFloat(formElementValue.replace(/[^0-9\.-]+/g, ""));
                    if (!isNaN(numValue) && formElementValue.includes("%")) {
                        numValue = Math.round(numValue / 100 * 1000000) / 1000000;
                    }
                    if (isFormatNum && !isNaN(numValue) && !(formElementValue.includes('AM') || formElementValue.includes('PM'))) {
                        totalRaw = numValue;
                    } else {
                        totalRaw = formElementValue;
                    }
                }
                if (isFormatDate || !isNaN(numValue)) {
                    total = numValue;
                    if ((isNaN(min) || numValue < min)) {
                        min = numValue;
                    }
                    if ((isNaN(max) || numValue > max)) {
                        max = numValue;
                    }
                } else {
                    total = 0;
                    max = 0;
                    min = 0;
                }
            }
            count = 1;
        }

        o["SUM"] = total;
        o["COUNT"] = count;
        o["MIN"] = min;
        o["MAX"] = max;
        o["FIRST"] = first;
        o["LAST"] = last;
        o["RAW"] = totalRaw;
        o["FMODE"] = fMode;
        o["toString"] = function () {
            if (!Array.isArray(this.SUM)) return this.SUM;
            if (this.FMODE === formulaMode.STRING && this.SUM.length <= 1) return this.RAW;

            let baseValue = "", calculateArr = this.SUM;
            if (this.FMODE !== formulaMode.STRING) {
                baseValue = 0;
                calculateArr = this.SUM.filter(function (sumObj) {
                    return typeof sumObj.value !== 'string' && !isNaN(sumObj.value);
                })
            }
            return calculateArr.reduce(function (accumulator, sumObj) {
                return accumulator + sumObj.value;
            }, baseValue);
        };
    }

    return map;
}

/** end of overriding **/

function addOptions(domainId, originOptions) {
    const newOption = prompt(lm['addOptions'] + "?");
    if (newOption !== null && newOption.trim().length) {
        const trimOption = newOption.trim();
        if (originOptions.includes(trimOption)) {
            webForm.showMsg(lm['dataDup']);
            return;
        }

        const param = {'api': '', 'addOption': '', "fid": domainId, "option": trimOption};

        /*alternative way to location.reload.bind(location) for Edge's bug*/
        postPromise("/" + ap + path + "/" + sheetIndex, param).then(function () {
            location.href = location.href + '&addNewOption';
        }).catch(function (res) {
            webForm.showMsg(JSON.parse(res.response).msg);
        });
    }
}

//webForm unique object, var declaration is required to be compatible with non-webForm Ragic page.
var webForm = {
    _form: $("wForm"),
    widgets: null,
    widgetsMap: {},
    floatingSelectOptions: {},
    subTableClassifier: {},
    subTableRowHeight: {},
    curSubController: [],
    formulaItem: [],
    listenPublisherRecord: {},
    globalFormulaTracker: [],
    formulaPublisherRecord: {},
    dynamicFilterPublisherRecord: {},
    cascadedRelation: {},
    submitStopper: [],
    callbackFn: null,
    mvpInfo: {}
};

//set all the process here
webForm.process = function () {
    this.widgets = Array.from(document.querySelectorAll('.webFormWidget'));

    this.widgetAttrExe();
    this.preFillValue();
    this.subtableProcess();
    this.formulaProcess();
    this.cascadedProcess();
    this.freeValueProcess();

    // re-trigger every inputs to make sure every event work correctly.
    const allEls = this._form.elements, allLen = allEls.length;
    for (let i = 0; i < allLen; i++) {
        webForm.triggerEvent(allEls[i], 'change');
    }
    const tooltipFunc = function () {
        const webFormTooltips = $('webFormTooltips');
        if (webFormTooltips) webFormTooltips.style.display = 'none';
    };
    document.addEventListener('click', tooltipFunc);
    document.addEventListener('touchstart', tooltipFunc);

    this.ruleProcess();
};

webForm.preFillValue = function () {
    const formElements = this._form.elements;
    //e.g. &pfv1000201=testPreFillValue
    location.href.split('&').filter(function (str) {
        return str.startsWith('pfv');
    }).map(function (str) {
        return decodeURIComponent(str.substring(3));
    }).map(function (str) {
        return str.split('=');
    }).filter(function (p) {
        return p.length === 2;
    }).map(function (p) {
        return {
            'fieldId': p[0],
            'fieldValue': p[1]
        };
    }).forEach(function (obj) {
        const field = formElements.namedItem(obj.fieldId);
        const _widgets = document.querySelector(".webFormWidget[domainid='" + obj.fieldId + "']");
        if (!field) return;
        switch (field.type) {
            case 'date':
                field.valueAsDate = new Date(obj.fieldValue);
                break;
            case 'number':
                field.valueAsNumber = parseFloat(obj.fieldValue);
                break;
            case 'select-multiple':
                const options = field.options;
                const defaultOptionValues = obj.fieldValue.split("|");
                for (let idxOfOptions = 0; idxOfOptions < options.length; idxOfOptions++) {
                    const option = options[idxOfOptions];
                    if (defaultOptionValues.includes(option.value)) option.selected = true;
                }
                break;
            default:
                if (_widgets.hasAttribute("fmt_d")) obj.fieldValue = ragic_date_format(obj.fieldValue, _widgets.getAttribute("fmt_d"));
                else if (_widgets.hasAttribute("fmt_n")) obj.fieldValue = ragic_number_format(obj.fieldValue, _widgets.getAttribute("fmt_n"));
                else if (_widgets.hasAttribute("phonefmt")) obj.fieldValue = ragic_phone_format(obj.fieldValue, _widgets.getAttribute("phonefmt"));
                field.value = obj.fieldValue;
                break;
        }
        if (_widgets.hasAttribute("ro")) webForm.setReadOnlyDiv(field);
    });
};

webForm.widgetAttrExe = function () {
    let _widgets = this.widgets,
        formElements = this._form.elements,
        isMultiple = false,
        adder = 1;
    for (let i = 0; i < _widgets.length; i++) {
        let field = formElements.namedItem(_widgets[i].getAttribute("domainId"));
        if (field) {
            if (field.isNodeList()) {  //checkbox or radio button
                isMultiple = true;
                field = field.item(0);
            } else {
                isMultiple = field.type === 'checkbox' || field.type === 'radio';
            }

            field.tabIndex = i + adder;
        }
        let line = _widgets[i].parentNode;
        if (_widgets[i].hasAttribute("ag")) {
            if (!field.value) {
                field.value = lm['autoGenerate'];
            }

            field.disabled = true;
            if (_widgets[i].hasAttribute("ro")) {
                webForm.setReadOnlyDiv(field);
            }
        }
        if (_widgets[i].hasAttribute("must")) {
            const fieldHeader = _widgets[i].querySelector(".webFormfieldValue p");
            const star = document.createElement("span");
            star.style.cssText = "color:#c43b1d;margin-left: 3px";
            star.textContent = '*';
            fieldHeader.appendChild(star);
        }
        if (_widgets[i].hasAttribute("dv") && field) {
            if (_widgets[i].getAttribute("dv") === '$SEQ') field.value = 1;  //subTable rule
            else if (isMultiple) {
                while (field) {
                    if (field.value === _widgets[i].getAttribute("dv")) {
                        field.checked = 'checked';
                        break;
                    }

                    if (!field.parentNode.parentNode.nextElementSibling) {
                        field = null;
                    } else {
                        field = field.parentNode.parentNode.nextElementSibling.children[0].children[0];
                    }
                }
            } else {
                let _dv = processDefaultValueString(_widgets[i].getAttribute("dv"));
                if (field.type === 'date') {
                    field.valueAsDate = new Date(_dv);
                } else if (field.type === 'number') {
                    field.valueAsNumber = parseFloat(_dv);
                } else if (field.type === 'select-multiple') {
                    const options = field.options;
                    const defaultOptionValues = _dv.split("|");
                    for (let idxOfOptions = 0; idxOfOptions < options.length; idxOfOptions++) {
                        const option = options[idxOfOptions];
                        if (defaultOptionValues.includes(option.value)) option.selected = true;
                    }
                } else {
                    if (_widgets[i].hasAttribute("fmt_d")) _dv = ragic_date_format(_dv, _widgets[i].getAttribute("fmt_d"));
                    else if (_widgets[i].hasAttribute("fmt_n")) _dv = ragic_number_format(_dv, _widgets[i].getAttribute("fmt_n"));
                    else if (_widgets[i].hasAttribute("phonefmt")) _dv = ragic_phone_format(_dv, _widgets[i].getAttribute("phonefmt"));
                    field.value = _dv;
                }
            }

            if (_widgets[i].hasAttribute("ro")) webForm.setReadOnlyDiv(field);
        }
        if (_widgets[i].hasAttribute("help")) {
            let help = node('a');
            _widgets[i].querySelector('p').appendChild(help);
            help.classList.add("help");
            help.href = "javascript:void(0);";
            help.appendChild(document.createTextNode("(?)"));
            help.onclick = function (event) {
                cancelEventBubble(event);
                $('webFormTooltips').style.display = '';
                const titleText = this.parentNode;
                webForm.showWebTooltip(titleText, titleText.parentNode.parentNode.getAttribute("help"), event);
            };
        }
        if (_widgets[i].hasAttribute("ln") || _widgets[i].hasAttribute("l")) {
            const targetDomainId = _widgets[i].getAttribute("ln") || _widgets[i].getAttribute("l"),
                lnTarget = document.getElementsByName(targetDomainId)[0];
            if (lnTarget) {
                if (!webForm.listenPublisherRecord.hasOwnProperty(targetDomainId)) {
                    const selectionDelegate = lnTarget.closest("[domainId]");
                    webForm.listenPublisherRecord[targetDomainId] = new webForm.ListenPublisher(selectionDelegate);
                }
                const publisher = webForm.listenPublisherRecord[targetDomainId];
                new webForm.ListenTracker(_widgets[i]).subscribe(publisher);
            }
        }
        if (_widgets[i].hasAttribute("f") || _widgets[i].hasAttribute("dv_f")) {
            webForm.formulaItem.push(_widgets[i]);
        }
        const _domainId = _widgets[i].getAttribute("domainId");
        if (_widgets[i].hasAttribute("cascadedTo")) {
            const sel = formElements.namedItem(_domainId);
            webForm.cascadedRelation[_domainId] = {
                "cascadedTo": _widgets[i].getAttribute("cascadedTo"),
                "options": Array.from((sel.isNodeList() ? sel : sel.options))
            };
            sel.options.length = 1;
        }
        if (_widgets[i].hasAttribute('mvp') && _widgets[i].hasAttribute('mvpMode')) {
            webForm.multipleValuePicker(_widgets[i]);
        }
        if (_widgets[i].hasAttribute("mvpf")) {
            const mvpfSet = _widgets[i].getAttribute("mvpf").split("&");
            const subscriber = new webForm.DynamicFilterTracker(_widgets[i]);
            mvpfSet.forEach(function (mvpf) {
                let parentDomainId;
                if (mvpf.includes("$")) {
                    parentDomainId = mvpf.slice(mvpf.indexOf("$") + 1);
                }
                if (!parentDomainId) {
                    subscriber.update();
                } else {
                    let parentElem = webForm._form.querySelector('DIV[domainId="' + parentDomainId + '"]');
                    if (!parentElem) return; // perhaps parent domain has been removed
                    if (!webForm.dynamicFilterPublisherRecord.hasOwnProperty(parentDomainId)) {
                        webForm.dynamicFilterPublisherRecord[parentDomainId] = new webForm.DynamicFilterPublisher(parentElem);
                    }
                    const publisher = webForm.dynamicFilterPublisherRecord[parentDomainId];
                    subscriber.subscribe(publisher);
                }
            });
        }
        if (_widgets[i].hasAttribute("email")) {
            const emailInput = formElements.namedItem(_domainId);
            emailInput.addEventListener('blur', function () {
                webForm.validateEmail(emailInput);
            })
        }

        if (_widgets[i].hasAttribute("subgroup")) {
            if (_widgets[i] === line.children[line.children.length - 1]) adder += 204800;

            const subKey = _widgets[i].getAttribute("subgroup"),
                subY = _widgets[i].getAttribute("Y"),
                hr = document.createElement('div');

            if (this.subTableClassifier.hasOwnProperty(subKey)) {
                this.subTableClassifier[subKey].push(_widgets[i]);
            } else {
                this.subTableClassifier[subKey] = [_widgets[i]];
            }

            if (this.subTableRowHeight.hasOwnProperty(subY)) {
                this.subTableRowHeight[subY] = Math.max(this.subTableRowHeight[subY], _widgets[i].lastChild.clientHeight);
            } else {
                this.subTableRowHeight[subY] = _widgets[i].lastChild.clientHeight;
            }

            _widgets[i].firstChild.appendChild(hr);
            _widgets[i].firstChild.style.paddingBottom = '2px';  //title
            _widgets[i].lastChild.style.paddingBottom = 0;       //input
            _widgets[i].style.paddingBottom = '15px';
            hr.className = 'insertedHr';
        } else {
            webForm.widgetsMap[colNames[parseInt(_widgets[i].getAttribute("X"))] + _widgets[i].getAttribute("Y")] = {self: _widgets[i]};
        }

        ["stylecolor", "styleVcolor", "stylebackgroundColor", "styleVbackgroundColor"].forEach(function recordStyle(styleAttr) {
            if (_widgets[i].hasAttribute(styleAttr)) {
                let attr = styleAttr.substring(5);
                const isOnValue = attr.startsWith("V");
                if (isOnValue) {
                    attr = attr.substring(0);
                    const inputDiv = _widgets[i].childNodes[1];
                    if (inputDiv) {
                        inputDiv.dataset[attr] = _widgets[i].getAttribute(styleAttr);
                    }
                } else {
                    _widgets[i].childNodes[0].dataset[attr] = _widgets[i].getAttribute(styleAttr);
                }

            }
        });
    }
};
webForm.subtableProcess = function () {
    const _subTableClassifier = this.subTableClassifier,
        _curSubController = webForm.curSubController;
    Object.values(_subTableClassifier).forEach(function (widgetArray) {
        const visibleWidgets = widgetArray.map(function (widget) { //issue[10467]: get all field
            return widget;
        });
        if (visibleWidgets.length === 0) return;
        const firstWidget = visibleWidgets[0].children[1];
        const firstWidgetRect = firstWidget.getBoundingClientRect();
        const lastWidget = visibleWidgets[visibleWidgets.length - 1];
        const lastWidgetRect = lastWidget.getBoundingClientRect();
        const controller = document.createElement('DIV');
        const subTable = document.querySelector('.subTable');
        if (subTable) { //for new version
            controller.innerHTML =
                "<a style='position: absolute; top: 3px; left: -18px;' title='open' onclick='webForm.openPageMode(this)' href='javascript: void(0)'><i class='fas fa-expand-alt'></i></a>" +
                "<a style='display: flex; position:absolute; height: 30px;left:" + (subTable.clientWidth -5) + "px;' title='add' onclick='webForm.addSubRow(this);' href='javascript: void(0)'><img alt='addRow' src='/sims/img/plus-circle-B.svg'/></a>" +
                "<a style='display: flex; position:absolute; height: 30px; left:" + (subTable.clientWidth + 15) + "px;' title='delete' onclick='webForm.deleteSubRow(this);' href='javascript: void(0)'><img alt='deleteRow' src='/sims/img/minus-circle-R.svg'/></a>";
        } else { //for old version
            controller.innerHTML = "<a style='padding-top:4px;position:absolute;' title='add' onclick='webForm.addSubRow(this);' href='javascript: void(0)'><img src='/sims/img/plus.png'/></a>" +
                "<a style='padding-top:4px;position:absolute;left:" + (lastWidgetRect.right - firstWidgetRect.left) + "px;' title='delete' onclick='webForm.deleteSubRow(this);' href='javascript: void(0)'><img src='/sims/img/minus.png'/></a>";
        }
        controller.className = "subController";
        controller.style.left = firstWidgetRect.left - 10 + "px";
        firstWidget.prepend(controller);

        if (!subTable) {
            const subColumnBound = widgetArray[0].parentNode;
            subColumnBound.addEventListener("mouseover", function (event) {
                let target = event.target.closest('DIV[subgroup]');
                if (!target) return;
                const subgroup = target.getAttribute("subgroup");

                // detect which subtable raw mouse is on it, index 0 is webFormfieldValue
                let index, inputs, detectConf = false;
                for (index = 1, inputs = target.children; index < inputs.length; index++) {
                    if (inputs[index].classList.contains("webformSettingConf")) {
                        detectConf = true;
                        continue;
                    }
                    const rect = inputs[index].getBoundingClientRect();
                    if (rect.top > event.clientY) break;
                }
                if (detectConf) index -= 1;

                const subControllers = Array.prototype.filter.call(this.querySelectorAll('.subController'), function (subController) {
                    return subgroup === subController.closest("[subgroup]").getAttribute("subgroup");
                });
                if (subControllers.length) {
                    if (index > 2) _curSubController.push(subControllers[index - 2]);
                    else _curSubController.push(subControllers[0]);

                    if (subControllers.length === 1) _curSubController[0].lastChild.className = 'fewOpacity';
                    else _curSubController[0].lastChild.className = 'fullOpacity';
                    _curSubController[0].firstChild.className = 'fullOpacity';
                }
            }, false);
            subColumnBound.addEventListener("mouseout", function () {
                if (webForm.curSubController.length) {
                    webForm.curSubController[0].lastChild.className = '';
                    webForm.curSubController[0].firstChild.className = '';
                }
                webForm.curSubController.length = 0;
            }, false);
        }

        let csShift = 0;
        for (let i = 0; i < visibleWidgets.length; i++) {
            if (!subTable) visibleWidgets[i].lastChild.style.height = webForm.subTableRowHeight[visibleWidgets[i].getAttribute("Y")] + "px";

            webForm.widgetsMap[colNames[parseInt(visibleWidgets[i].getAttribute("X")) + csShift] +
                visibleWidgets[i].getAttribute("Y")] = {self: visibleWidgets[i]};
            if (visibleWidgets[i].hasAttribute("cs")) {
                csShift += parseInt(visibleWidgets[i].getAttribute("cs")) - 1;
            }
        }
    });
};
webForm.formulaProcess = function () {
    const _formulaItem = this.formulaItem;
    for (let i = 0; i < _formulaItem.length; i++) {
        let formulaTracker = new webForm.FormulaTracker(_formulaItem[i]);

        const changeCells = formulaBuilder._findChangeCellNames(formulaTracker.formula);
        for (let j = 0; j < changeCells.length; j++) {
            let changeCell = changeCells[j];
            let _mapObject = this.widgetsMap[changeCell];
            if (!_mapObject) continue;
            if (!webForm.formulaPublisherRecord.hasOwnProperty(changeCell)) {
                webForm.formulaPublisherRecord[changeCell] = new webForm.FormulaPublisher(_mapObject.self);
            }
            const publisher = webForm.formulaPublisherRecord[changeCell];
            formulaTracker.subscribe(publisher);
        }
        if (changeCells.length === 0) { // if no invoke source, execute formula right now
            formulaTracker.update(-1);
        }
        //issue[11404]
        if (_formulaItem[i].hasAttribute("subgroup")) {
            this.globalFormulaTracker.push(formulaTracker);
        }
    }
    Array.from(document.querySelectorAll(".webformFreeValue"))
        .forEach(function (freeElement) {
            const formula = retrieveFormulaFromDesc(freeElement.textContent);
            if (formula) {
                let formulaTracker = new webForm.FormulaDescriptionTracker(freeElement, formula);
                const changeCells = formulaBuilder._findChangeCellNames(formula);
                for (let i = 0; i < changeCells.length; i++) {
                    let changeCell = changeCells[i];
                    let _mapObject = webForm.widgetsMap[changeCell];
                    if (!_mapObject) continue;
                    if (!webForm.formulaPublisherRecord.hasOwnProperty(changeCell)) {
                        webForm.formulaPublisherRecord[changeCell] = new webForm.FormulaPublisher(_mapObject.self);
                    }
                    const publisher = webForm.formulaPublisherRecord[changeCell];
                    formulaTracker.subscribe(publisher);
                }
                if (changeCells.length === 0) { // if no invoke source, execute formula right now
                    formulaTracker.update();
                }
            }
        });
};
webForm.ruleProcess = function () {
    RagicInteractiveRules.loadRules(ruleJSON);
    RagicInteractiveRules.execute(true);

    if (RagicInteractiveRules.rules.length) {
        const _widgets = webForm.widgets;
        for (let i = 0, len = _widgets.length; i < len; i++) {
            let _widget = _widgets[i];
            let domainId = _widget.getAttribute("domainId"),
                foundAsCondition = RagicInteractiveRules.rules.find(function (_rule) {
                    return !!_rule.cons.find(function (_con) {
                        return parseInt(_con.domainId) === parseInt(domainId);
                    });
                });
            if (foundAsCondition) {
                // "input" event is buggy both on IE(can not be detected) and Edge(be triggered when DOM Select element add option, which is unexpected)
                _widget.addEventListener("paste", RagicInteractiveRules.execute.bind(RagicInteractiveRules), false);
                _widget.addEventListener("change", RagicInteractiveRules.execute.bind(RagicInteractiveRules), false);
            }
        }
    }
};
webForm.cascadedProcess = function () {
    const _form = webForm._form,
        publisherMap = {};
    for (let _domainId in webForm.cascadedRelation) {
        const _cascadedItem = webForm.cascadedRelation[_domainId],
            cascadedToDomainId = _cascadedItem.cascadedTo,
            targetElement = _form.querySelector('DIV[domainid="' + _domainId + '"]'),
            parentElement = _form.querySelector('DIV[domainid="' + cascadedToDomainId + '"]');


        if (targetElement && parentElement) {
            if (!publisherMap.hasOwnProperty(cascadedToDomainId)) {
                publisherMap[cascadedToDomainId] = new webForm.CascadePublisher(parentElement);
            }
            const subscriber = new webForm.CascadeTracker(targetElement),
                publisher = publisherMap[cascadedToDomainId];
            subscriber.subscribe(publisher);
        }
    }
};
webForm.freeValueProcess = function () {
    Array.from(document.querySelectorAll(".webformFreeValue")).forEach(bbcodeToHtml);
}
webForm.defaultValueProcess = function () {
    const widget = this;
    const defaultValue = widget.getAttribute('dv');
    if (!defaultValue) return;
    const field = widget.querySelector('[webform]');
    const isMultiple = field.type === 'checkbox' || field.type === 'radio';
    if (widget.getAttribute("dv") === '$SEQ') field.value = 1;
    else if (isMultiple) {
        const _field = widget.querySelector('[webform][value="' + defaultValue + '"]');
        if (_field) _field.checked = 'checked';
    } else {
        let _dv = processDefaultValueString(defaultValue);
        if (field.type === 'date') {
            field.valueAsDate = new Date(_dv);
        } else if (field.type === 'number') {
            field.valueAsNumber = parseFloat(_dv);
        } else if (field.type === 'select-multiple') {
            const options = field.options;
            const defaultOptionValues = _dv.split("|");
            for (let idxOfOptions = 0; idxOfOptions < options.length; idxOfOptions++) {
                const option = options[idxOfOptions];
                if (defaultOptionValues.includes(option.value)) option.selected = true;
            }
        } else {
            if (widget.hasAttribute("fmt_d")) _dv = ragic_date_format(_dv, widget.getAttribute("fmt_d"));
            else if (widget.hasAttribute("fmt_n")) _dv = ragic_number_format(_dv, widget.getAttribute("fmt_n"));
            else if (widget.hasAttribute("phonefmt")) _dv = ragic_phone_format(_dv, widget.getAttribute("phonefmt"));
            field.value = _dv;
        }
    }

    if (widget.hasAttribute("ro")) webForm.setReadOnlyDiv(field);
    webForm.triggerEvent(field, 'change');
};
webForm.submitCheck = function (e, button) {
    window.removeEventListener('pagehide', webForm.setDraft);
    // check Recaptcha
    if (doRecaptcha) {
        if (grecaptcha.getResponse().trim().length === 0) {
            webForm.showMsg("Please complete the anti-spam verification", document.querySelector(".g-recaptcha"));
            cancelEventBubble(e);
            return;
        }
    }

    if (webForm.submitStopper.length) {
        cancelEventBubble(e);
        webForm.showMsg(webForm.submitStopper[0].reason);
        return;
    }

    if (button.dataset.submitted) {
        cancelEventBubble(e);
        return;
    }
    button.dataset.submitted = "true";

    let failInfo;
    const formElements = webForm._form.elements;
    const handleFail = function () {
        if (!failInfo) return;
        cancelEventBubble(e);
        webForm.showMsg(failInfo.reason, failInfo.field);
        if (failInfo.failedSubComponent) {
            failInfo.failedSubComponent.parentNode.style.backgroundColor = "#FFCCCC";
        } else {
            failInfo.field.lastElementChild.style.backgroundColor = "#FFCCCC";
        }

        button.dataset.submitted = "";
    };

    // subTable check process
    for (let sub in this.subTableClassifier) {
        let subTableKey = this.subTableClassifier[sub][0],
            line = subTableKey.parentNode;
        const len = subTableKey.children.length - ( subTableKey.querySelector('.webformSettingConf') ? 1 : 0);
        for (let i = 1; i < len; i++) {  //check each subTable row
            let field,
                lineFilledIn = false,
                attrMustChecker = [],
                validationChecker = [];

            for (let j = 0, columns = line.children; j < columns.length; j++) {    //check each columns of the suTable row
                field = columns[j].children[i];
                // if field is hidden by form rules, ignore all validations.
                if (field.style.visibility === "hidden") continue;

                if (columns[j].hasAttribute("must")) {
                    attrMustChecker.push(field);
                }
                if (columns[j].hasAttribute("va")) {
                    validationChecker.push(field);
                }

                Array.from(field.querySelectorAll("[name]")).forEach(function (input) {
                    // reset element's name attribute to fit in with Ragic's subTable rule
                    // issue[11399]: 調整子表格送出後的順序判斷
                    input.name = input.name.split('_')[0] + "_-" + (len - i);
                    if (input.value && !input.classList.contains("agField")) lineFilledIn = true;
                });
            }

            // validation check
            if (lineFilledIn && validationChecker.length) {
                let pass = true;
                for (let j = 0; j < validationChecker.length; j++) {
                    const ancestor = validationChecker[j].closest("[va]");
                    let regex = new RegExp(ancestor.getAttribute("va"));
                    pass = this.getValidInputs(validationChecker[j]).every(function (input) {
                        return regex.test(input.value);
                    });
                    if (!pass) {
                        const failedInput = this.getValidInputs(validationChecker[j]).find(function (input) {
                            return !regex.test(input.value);
                        });
                        if (ancestor.hasAttribute("va_cust_msg")) {
                            const custVaMsg = unformatHTMLEntities(unformatNUIAttr(ancestor.getAttribute("va_cust_msg")));
                            const fieldName = ancestor.querySelector('.webFormfieldValue p') && ancestor.querySelector('.webFormfieldValue p').textContent;
                            const fieldValue = failedInput.value;
                            const fieldId = ancestor.getAttribute('domainid');
                            const fieldFormat = ancestor.getAttribute('va');
                            failInfo = {
                                reason: getCustomValidateErrorMessage(custVaMsg, fieldName, fieldValue, fieldFormat, fieldId, true),
                                field: ancestor,
                                failedSubComponent: failedInput
                            };
                        } else {
                            failInfo = {reason: wrongFormatWarning, field: ancestor, failedSubComponent: failedInput};
                        }
                        handleFail();
                        return;
                    }
                }
            }


            // attribute "must" check
            if (lineFilledIn && attrMustChecker.length) {
                let selfFilledIn = true;
                for (let j = 0; j < attrMustChecker.length; j++) {
                    selfFilledIn = Array.from(attrMustChecker[j].querySelectorAll("[name]")).every(function (input) {
                        return input.value !== '';
                    });

                    if (!selfFilledIn) {
                        const failedInput = Array.from(attrMustChecker[j].querySelectorAll("[name]")).find(function (input) {
                            return input.value === '';
                        });
                        failInfo = {
                            reason: attrMustWarning,
                            field: attrMustChecker[j].closest("[domainId]"),
                            failedSubComponent: failedInput
                        };
                        handleFail();
                        return;
                    }
                }
            }
        }
    }

    // normal fields validation check
    let normalFieldCheck = this.widgets.filter(function (widget) {
        return !widget.hasAttribute("subgroup") && !widget.hasAttribute("ag");
    }).every(function (widget) {
        // issue[11392]
        // form rule
        if (widget.style.visibility === "hidden" || widget.style.display === 'none') {
            return true;
        }

        let inputElement = formElements.namedItem(widget.getAttribute("domainId")), fieldValue;
        if (inputElement) {
            if (inputElement.isNodeList()) {
                switch (inputElement[0].type.toLowerCase()) {
                    case "radio":
                        fieldValue = "";
                        for (let index = inputElement.length; index--;) {
                            if (inputElement[index].checked) {
                                fieldValue = inputElement[index].value;
                                break;
                            }
                        }
                        break;
                    case "checkbox":
                        fieldValue = "";
                        for (let index = inputElement.length; index--;) {
                            if (inputElement[index].checked) {
                                fieldValue += inputElement[index].value + "|";
                            }
                        }
                        break;
                    default:
                        fieldValue = inputElement.value;
                }
            } else {
                fieldValue = inputElement.value;
            }
        }

        if (widget.hasAttribute("must")) {
            if (!fieldValue) {
                failInfo = {reason: attrMustWarning, field: widget};
                return false;
            }
        }

        if (widget.hasAttribute("va")) {
            const ifCheckNotNull = widget.getAttribute("va") === '[^ ]';
            let regex = new RegExp(widget.getAttribute("va"));
            if (!regex.test(fieldValue) && (fieldValue !== '' || ifCheckNotNull)) {
                if (widget.hasAttribute("va_cust_msg")) {
                    const custVaMsg = unformatHTMLEntities(unformatNUIAttr(widget.getAttribute("va_cust_msg")));
                    const fieldName = widget.querySelector('.webFormfieldValue p') && widget.querySelector('.webFormfieldValue p').textContent;
                    const fieldId = widget.getAttribute('domainid');
                    const fieldFormat = widget.getAttribute('va');
                    failInfo = {
                        reason: getCustomValidateErrorMessage(custVaMsg, fieldName, fieldValue, fieldFormat, fieldId, true),
                        field: widget
                    };
                } else {
                    failInfo = {reason: wrongFormatWarning, field: widget};
                }
                return false;
            }
        }

        return true;
    });

    if (!normalFieldCheck) {
        handleFail();
        return;
    }

    this.widgets.forEach(function (_widget) {
        // prevent sending empty subtable data
        if (_widget.hasAttribute("subgroup") && !_widget.hasAttribute('ag') && !_widget.hasAttribute('ro')) {
            Array.from(_widget.querySelectorAll("[name]")).filter(function (input) {
                return !input.value;
            }).forEach(function (input) {
                input.disabled = true;
            });
        }

        // turn off disabled attribute to ensure readOnly data will be sent
        if (_widget.hasAttribute('ro') && !_widget.hasAttribute('ag')) {
            Array.from(_widget.querySelectorAll("[name][disabled]")).filter(function (input) {
                return input.value.length > 0;
            }).forEach(function (input) {
                input.disabled = false;
            });
        }

        // unformat process
        if (!_widget.hasAttribute('fmt_n') && !_widget.hasAttribute('fmt_d')) return;

        Array.from(_widget.querySelectorAll("[name]")).filter(function (_input) {
            return _input.value.length > 0;
        }).forEach(function (_input) {
            if (_widget.hasAttribute('fmt_d')) {
                let smartParsed;
                if (_input.type === 'date' && _input.value) {
                    smartParsed = new Date(_input.value);
                    // HTML Date input only accept limited format, so we change it to text [issue：5719]
                    _input.type = 'text';
                } else {
                    smartParsed = ragic_date_parse(_input.value, _widget.getAttribute('fmt_d'), _widget.getAttribute('f'));
                }
                if (smartParsed) {
                    _input.value = formatDate(smartParsed, getStandardFormat(_widget.getAttribute('fmt_d')));
                } else {
                    _input.value = "";
                }
            } else {
                _input.value = webForm.unformatValue(_input.value, _widget);
            }
        });
    });
    webForm.updateFormParams();
};

webForm.reset = function (event) {
    cancelEventBubble(event);
    window.removeEventListener('pagehide', webForm.setDraft);
    location.reload();
};

webForm.updateFormParams = function () {
    if (window.opener && window.opener.webForm && window.opener.webForm.callbackFn) {
        const wForm = document.getElementById('wForm');
        wForm.action += '&callback=opener.webForm.callbackFn';
        if (location.search.includes('&saveClose')) {
            wForm.action += '&saveClose';
        }
    }
};

// beware we could get empty array when "no options" or similar cases
webForm.getValidInputs = function (field) {
    return Array.from(field.querySelectorAll('INPUT, TEXTAREA, SELECT'));
};
webForm.showMsg = function (msg, field, isHtml) {
    let _win = document.querySelector('#webFormWin'),
        _winTitle = _win.querySelector('#floatingWinHeader'),
        _winContent = _win.querySelector('#floatingWinContent'),
        assignPos;
    _win.style.display = 'block';
    rm(_winTitle);
    rm(_winContent);

    if (field) window.scrollBy(0, field.getBoundingClientRect().top);
    // issue[10351]: make message div's position is center on screen
    const centerX = (window.innerWidth - _win.getBoundingClientRect().width) / 2;
    const centerY = (window.innerHeight - _win.getBoundingClientRect().height) / 2;
    _win.style.top = centerY + 'px';
    _win.style.left = centerX + 'px';

    //find field title
    if (field) {
        let title = field.children[0].children[0].textContent;
        _winTitle.appendChild(document.createTextNode(title));
    } else {
        _winTitle.appendChild(document.createTextNode('\u00A0'));
    }
    if (isHtml) _winContent.innerHTML = msg;
    else _winContent.appendChild(document.createTextNode(msg));
};
webForm.showWebTooltip = function (target, text) {
    if (!target) return;

    const tooltips = $('webFormTooltips'),
        boundingRect = target.getBoundingClientRect();
    rm(tooltips);
    tooltips.style.top = boundingRect.bottom +
        document.body.scrollTop +
        document.documentElement.scrollTop + "px";
    tooltips.style.left = boundingRect.left +
        document.body.scrollLeft +
        document.documentElement.scrollLeft + "px";

    const tip = node('div');
    tip.className = 'tooltip';
    let tipUp, tipIn, tipDn;
    tipUp = node('div');
    tipUp.className = 'tooltipUp';
    tip.appendChild(tipUp);
    tipIn = node('div');
    tipIn.className = 'tooltipIn';
    tip.appendChild(tipIn);
    tipDn = node('div');
    tipDn.className = 'tooltipDn';
    tip.appendChild(tipDn);

    tooltips.appendChild(tip);
    tip.style.zIndex = 300;
    tipIn.innerHTML = text;
};
webForm.setReadOnlyDiv = function (obj) {
    const readOnlyDiv = obj.parentNode.querySelector('.readOnlyDiv');
    const isSelection = obj.tagName === 'SELECT';
    if (readOnlyDiv) {
        let value = obj.value;
        if (isSelection) {
            value = Array.from(obj.selectedOptions).reduce(function (acc, option) {
                if (acc) return acc + ', ' + option.value;
                return acc + option.value;
            }, '');
        }
        readOnlyDiv.textContent = value;
    }
};
webForm.validateEmail = function (element) {
    const email = element.value;
    const domainId = element.name;
    const cacheObj = webForm.submitStopper.find(function (_cacheObj) {
        return _cacheObj.id === domainId;
    });

    getPromise('/sims/emailValidator.jsp', {'email': email}).then(function (text) {
        if (text && email && email.length > 0) {
            const rejectReason = "Not a valid e-mail address : " + email;
            const submitBtn = document.querySelector('input[data-submitted]');
            if (!cacheObj) {
                webForm.submitStopper.push({
                    id: domainId,
                    reason: rejectReason
                });
            } else {
                cacheObj.reason = rejectReason;
            }
            webForm.showMsg("Not a valid e-mail address : " + email);
            if (submitBtn) submitBtn.dataset.submitted = '';
        } else {
            if (cacheObj) {
                const i = webForm.submitStopper.indexOf(cacheObj);
                webForm.submitStopper.splice(i, 1);
            }
        }
    });
};
webForm.openPageMode = function (target) {
    const container = document.getElementById('wForm');
    const subTable = target.closest('.subTable');
    const x = parseInt(subTable.dataset.x);
    const y = parseInt(subTable.dataset.y) - 1;
    const subTableName = document.querySelector('.line[data-x="'+ x +'"][data-y="'+ y +'"]');
    const webFormWidget = target.closest('.webFormWidget');
    const btnWrapper = document.createElement('div');
    btnWrapper.classList.add('flex-center');

    const back = document.createElement('div');
    back.textContent = lm['goBack'];
    back.classList.add('backDiv');
    back.onclick = function backView() {
        subTable.style.maxWidth = '';
        Array.from(document.querySelectorAll('.pageMode')).forEach(function (ele) {
            ele.classList.remove('pageMode');
        });
        subTable.removeChild(btnWrapper);
    };

    const addNew = document.createElement('div');
    addNew.textContent = lm['addNextRecord'];
    addNew.classList.add('backDiv');
    addNew.onclick = function createNew() {
        Array.from(document.querySelectorAll('.pageMode')).forEach(function (ele) {
            ele.classList.remove('pageMode');
        });
        webForm.triggerEvent(subTable.querySelectorAll('[title="add"]')[index - 1], 'click');
        container.classList.add('pageMode');
        if (subTableName) subTableName.classList.add('pageMode');
        subTable.classList.add('pageMode');
        index += 1;
        Array.from(subTable.querySelectorAll('.webFormWidget')).forEach(function (_webFormWidget) {
            _webFormWidget.childNodes[index].classList.add('pageMode');
        });
    };

    let index = Array.prototype.slice.call(webFormWidget.children).indexOf(target.parentNode.parentNode);
    if (index === -1) console.error('Index error');
    Array.from(subTable.querySelectorAll('.webFormWidget')).forEach(function (_webFormWidget) {
        _webFormWidget.childNodes[index].classList.add('pageMode');
    });

    container.classList.add('pageMode');
    if (subTableName) subTableName.classList.add('pageMode');
    subTable.classList.add('pageMode');
    subTable.style.maxWidth = container.clientWidth + 'px';
    btnWrapper.appendChild(back);
    btnWrapper.appendChild(addNew);
    subTable.appendChild(btnWrapper);
};
webForm.addSubRow = function (obj) {
    const el = obj.closest(".webFormWidget");
    const subgroup = el.getAttribute("subgroup");

    if (obj.nextSibling.style.display === 'none') obj.nextSibling.style.display = '';
    let newEls = [], sub;
    for (sub in this.subTableClassifier) {
        let subWidgets = this.subTableClassifier[sub];
        if (subgroup === subWidgets[0].getAttribute("subgroup")) {
            //calculate index of the row to copy
            let index, i;
            for (index = 0; index < subWidgets[0].children.length; index++) {
                if (obj.parentNode.parentNode === subWidgets[0].children[index]) break;
            }

            for (i = 0; i < subWidgets.length; i++) {
                const copiedInsert = subWidgets[i].children[index].cloneNode(true);
                const subControllers = copiedInsert.querySelectorAll('.subController');
                const field = copiedInsert.querySelector('[webform]');
                const domainId = field.name;

                if (subControllers.length) {
                    subControllers[0].lastChild.className = '';
                    subControllers[0].firstChild.className = '';
                }

                if (copiedInsert.className === 'webFormSelection') {
                    const singleSelect = copiedInsert.querySelector('.singleSelectionContainer');
                    const multiComboBox = copiedInsert.querySelector('.multiComboBox');
                    if (!singleSelect && !multiComboBox && copiedInsert.querySelectorAll('DIV').length) {//radio button & checkbox process
                        for (let j = 0, options = copiedInsert.querySelectorAll('DIV'); j < options.length; j++) {
                            const option = options[j].querySelector('INPUT');
                            if (!option || !option.name) continue;
                            newEls.push(option);

                            let uniqueNum = subWidgets[i].children.length;
                            option.name += "_" + uniqueNum;
                            option.id += "_" + uniqueNum;
                            option.checked = false;
                            options[j].querySelector('LABEL').htmlFor += "_" + uniqueNum;
                        }
                    } else {
                        if (subWidgets[i].hasAttribute("ln") && copiedInsert.querySelectorAll('SELECT').length) {
                            copiedInsert.querySelector('SELECT').options.length = 1;
                        }
                        if (singleSelect) {
                            copiedInsert.querySelector('.singleSelectionContainer').textContent = '';
                            const select = copiedInsert.querySelector('select');
                            if (select && select.options && !select.disabled) {
                                createBarSelect(select);
                            }
                        } else if (multiComboBox) {
                            copiedInsert.querySelector('.multiSelectionContainer').removeChild(multiComboBox);
                            const select = copiedInsert.querySelector('select');
                            if (select && select.options && !select.disabled) {
                                createComboForMultiSelect(select);
                            }
                        }
                    }
                } else {
                    const input = copiedInsert.querySelector('input');
                    input.value = '';
                    if (input.dataset.type === 'file') {
                        const uploadField = copiedInsert.querySelector('.uploadField');
                        copiedInsert.removeChild(uploadField);
                        UploadFieldAgent.createUploadField(input, copiedInsert);
                    }
                    newEls.push(copiedInsert.lastChild);
                }

                if (subWidgets[i].hasAttribute("dv") && subWidgets[i].getAttribute('dv') !== '$SEQ') {
                    let _dv = processDefaultValueString(subWidgets[i].getAttribute("dv"));
                    const _input = copiedInsert.lastChild;
                    if (_input.type === 'date') {
                        _input.valueAsDate = new Date(_dv);
                    } else if (_input.type === 'number') {
                        _input.valueAsNumber = parseFloat(_dv);
                    } else if (_input.type === 'select-multiple') {
                        const newOptions = _input.options;
                        const defaultOptionValues = _dv.split("|");

                        for (let idxOfOptions = 0; idxOfOptions < newOptions.length; idxOfOptions++) {
                            const newOption = newOptions[idxOfOptions];
                            if (defaultOptionValues.includes(newOption.value)) {
                                const nodeId = newOption.getAttribute('nodeid');
                                newOption.selected = true;
                                //mscombo
                                _input.parentNode.querySelector('li[data-value="' + nodeId + '"]').click();
                            }
                        }
                    } else {
                        if (subWidgets[i].hasAttribute("fmt_d")) _dv = ragic_date_format(_dv, subWidgets[i].getAttribute("fmt_d"));
                        else if (subWidgets[i].hasAttribute("fmt_n")) _dv = ragic_number_format(_dv, subWidgets[i].getAttribute("fmt_n"));
                        else if (subWidgets[i].hasAttribute("phonefmt")) _dv = ragic_phone_format(_dv, subWidgets[i].getAttribute("phonefmt"));
                        _input.value = _dv;
                    }
                    if (subWidgets[i].hasAttribute("ro")) webForm.setReadOnlyDiv(copiedInsert.lastChild);
                }

                if (subWidgets[i].hasAttribute("ag")) {
                    copiedInsert.lastChild.value = lm['autoGenerate'];
                }

                if (subWidgets[i].children[index + 1]) {
                    subWidgets[i].insertBefore(copiedInsert, subWidgets[i].children[index + 1]);
                } else {
                    subWidgets[i].appendChild(copiedInsert);
                }

                if (subWidgets[i].hasAttribute("f")) {
                    const ft = this.globalFormulaTracker.find(function (_f) {
                        return _f.obj === subWidgets[i];
                    });
                    if (ft) {
                        ft.update(index + 1);
                    }
                }

                //issue[10260]: ensure readOnlyDiv value is correct
                //issue[11402]: ag not have readOnlyDiv
                if (subWidgets[i].hasAttribute("ro") && !subWidgets[i].hasAttribute("ag")) {
                    copiedInsert.querySelector('.readOnlyDiv').textContent = copiedInsert.querySelector('[webForm]').value;
                }

                if (copiedInsert.lastChild.tabIndex) {
                    if (!copiedInsert.nextSibling) {
                        copiedInsert.lastChild.tabIndex += 1024;
                    } else {
                        copiedInsert.lastChild.tabIndex += (copiedInsert.nextSibling.lastChild.tabIndex - copiedInsert.lastChild.tabIndex) / 2;
                    }
                }

                if (subWidgets[i].getAttribute("dv") === '$SEQ') this.seqResetter(subWidgets[i].children[index], true);
                if (webForm.dynamicFilterPublisherRecord[domainId]) {
                    webForm.triggerEvent(field, 'change');
                }
            }

            break;
        }
    }

    // re-trigger every inserted inputs to make sure every event work correctly.
    let k, newLen;
    for (k = 0, newLen = newEls.length; k < newLen; k++) {
        webForm.triggerEvent(newEls[k], 'change');
    }

    RagicInteractiveRules.execute(true);
};
webForm.deleteSubRow = function (obj) {
    const el = obj.closest('.webFormWidget');
    const subgroup = el.getAttribute("subgroup");
    let sub;
    for (sub in this.subTableClassifier) {
        const subWidgets = this.subTableClassifier[sub];
        if (subgroup === subWidgets[0].getAttribute("subgroup")) {
            //calculate index of the row to remove
            let index;
            for (index = 0; index < subWidgets[0].children.length; index++) {
                if (obj.parentNode.parentNode === subWidgets[0].children[index]) break;
            }

            if (subWidgets[0].children.length <= (2 + (subWidgets[0].querySelector('.webformSettingConf') ? 1 : 0))) {
                try {
                    subWidgets.forEach(function (subWidget) {
                        const field = subWidget.querySelector('[webform]');
                        field.value = '';
                        webForm.triggerEvent(field, 'change');
                    });
                } catch (e) {
                    console.error('delete subRow fail: ', e);
                }
                return;
            }
            for (let i = 0; i < subWidgets.length; i++) {
                if (subWidgets[i].getAttribute("dv") === '$SEQ') this.seqResetter(subWidgets[i].children[index], false);
                webForm.triggerEvent(subWidgets[i].children[index], 'change');
                subWidgets[i].removeChild(subWidgets[i].children[index]);
            }
            break;
        }
    }
};
webForm.seqResetter = function (obj, actionAdd) {
    if (!obj) return;
    let ne = obj,
        count = parseInt(obj.querySelector('INPUT').value);
    if (isNaN(count)) return;
    let input;
    if (actionAdd) {
        while (ne.nextSibling) {
            ne = ne.nextSibling;
            input = ne.querySelector('INPUT');
            input.value = ++count;
            if (obj.parentNode.hasAttribute("ro")) webForm.setReadOnlyDiv(input);
        }
    } else {
        while (ne.nextSibling) {
            ne = ne.nextSibling;
            input = ne.querySelector('INPUT');
            input.value = count++;
            if (obj.parentNode.hasAttribute("ro")) webForm.setReadOnlyDiv(input);
        }
    }
};
/**
 * @return {string}
 */
webForm.HTMLEscapeRecover = function (str) {
    if (!str) return "";
    return str.replace(new RegExp("&#44;", "gm"), ",").replace(/<br\s*(\/)?>/gim, "\r\n");
};
webForm.unformatValue = function (value, infoProvider) {
    const isFormatNum = infoProvider.hasAttribute('fmt_n'),
        isFormatDate = infoProvider.hasAttribute('fmt_d'),
        isFormatPhone = infoProvider.hasAttribute('phonefmt');
    if (isFormatPhone) {
        return ragic_phone_unformat(value, infoProvider.getAttribute('phonefmt'));
    } else if (isFormatDate) {
        return parseDateLong(value, infoProvider.getAttribute('fmt_d'));
    } else if (isFormatNum) {
        const parsedValue = parseFloat(value.replace(/[^0-9\.-]+/g, ""));
        if (value.includes("%")) {
            return Math.round(parsedValue / 100 * 1000000) / 1000000;
        }
        return parsedValue;
    } else {
        return value;
    }
};
webForm.triggerEvent = function (element, event) {
    const ev = document.createEvent('Event');
    ev.initEvent(event, true, false);
    element.dispatchEvent(ev);
};


webForm.Publisher = function (obj) {
    this.obj = obj;
    this.subscribers = [];
};
webForm.Publisher.prototype.publish = function (data, index) {
    for (let i = 0; i < this.subscribers.length; i++) {
        this.subscribers[i].update(data, index);
    }
};

webForm.Tracker = function (obj) {
    this.obj = obj;
};
webForm.Tracker.prototype.subscribe = function (publisher) {
    publisher.subscribers.push(this);
};

webForm.ListenPublisher = function (obj) { //Listen-to feature publisher
    webForm.Publisher.call(this, obj);

    const t = this;  // "this" here is the publisher object, and "this" in the function below means selection div itself
    this.obj.addEventListener("change", function (event) {
        let cObj = event.target;
        let nodeId;
        switch (cObj.tagName) {
            case 'SELECT':
                if (cObj.options.length) {
                    if (cObj.selectedIndex >= 0) {
                        nodeId = cObj.options[cObj.selectedIndex].getAttribute("nodeId");
                    }
                }
                break;
            case 'INPUT':
                if (cObj.type === 'text' || cObj.type === 'hidden' || cObj.checked) {
                    nodeId = cObj.getAttribute("nodeId");
                }
                break;
            default:
                cObj = cObj.querySelector('select');
                if (cObj && cObj.options.length) {
                    if (cObj.selectedIndex >= 0) {
                        nodeId = cObj.options[cObj.selectedIndex].getAttribute("nodeId");
                    }
                }
        }

        if (!isNumeric(nodeId)) return;
        const params = {
            'a': ap,
            'p': path,
            'fn': sheet,
            'd': this.getAttribute("domainId"),
            'n': nodeId,
            'webview': ''
        };
        if (this.hasAttribute("subgroup")) {
            let index = 1, fields = this.children;
            for (; index < fields.length; index++) {
                if (fields[index].lastChild === cObj) break;
            }
            params['x'] = this.getAttribute("x");
            params['y'] = parseInt(this.getAttribute("y")) + index;
            getPromise('/sims/form_subform.jsp', params).then(function (res) {
                t.publish(res, index);
            });
        } else {
            params['x'] = parseInt(this.getAttribute("x")) + 1;
            params['y'] = this.getAttribute("y");
            getPromise('/sims/form_subform.jsp', params).then(function (res) {
                t.publish(res);
            });
        }
    });
};
webForm.ListenPublisher.prototype = Object.create(webForm.Publisher.prototype);

webForm.ListenTracker = function (obj) {   //Listen-to feature tracker
    webForm.Tracker.call(this, obj);
};
webForm.ListenTracker.prototype = Object.create(webForm.Tracker.prototype);
webForm.ListenTracker.prototype.update = function (data, index) {
    index = index || 1;
    const fieldBlock = this.obj;
    const dataLines = data.trim().split("\n");
    for (let i = 0; i < dataLines.length; i++) {
        const secs = dataLines[i].split(",");
        let el;
        if (secs[3] === fieldBlock.getAttribute("domainId")) {
            // issue[11599]: to get element. e.g. input, select, textarea
            el = fieldBlock.children[index].querySelector('[webForm]');
            // issue[11991]:由於無法重現問題，所以先放入一些log及可能的解決方法。
            if (el) {
                if (el.type === 'select-multiple') {
                    const multiComboBoxId = fieldBlock.children[index].querySelector('.multiComboBox').id;
                    const multiCombo = MultiSelectComboAgent.selectCombo[multiComboBoxId];
                    const nodeIds = secs[4].split('|');
                    el.selectedIndex = -1;
                    multiCombo.options.forEach(function (option) {
                        option.selected = !!nodeIds.includes(option.value);
                    });
                    nodeIds.forEach(function (nodeId) {
                        const selectedOption = el.querySelector('[nodeid="' + nodeId +'"]');
                        if (selectedOption) selectedOption.selected = true;
                        else console.error('Non-existent option nodeId: ' + nodeId);
                    });
                    multiCombo.render();
                } else el.value = webForm.HTMLEscapeRecover(secs[8]);
            } else {
                console.log('Incorrect: ' + secs[3]);
                console.log(fieldBlock);
                console.log(fieldBlock.children);
                console.log(index);
                console.log(fieldBlock.children[index]);
                console.log(secs);
                if (fieldBlock.children[index].classList.contains('webFormfieldInput')) {
                    el = fieldBlock.children[index].querySelector('input');
                } else if (fieldBlock.children[index].classList.contains('webFormSelection')) {
                    el = fieldBlock.children[index].querySelector('select');
                } else {
                    console.error('Patch fail.');
                }
                if (el) el.value = webForm.HTMLEscapeRecover(secs[8]);
            }
            if (fieldBlock.hasAttribute("ro")) webForm.setReadOnlyDiv(el);
            webForm.triggerEvent(el, 'change');
            const widgetAncestor = el.closest('.webFormWidget');
            if (widgetAncestor.hasAttribute("sig") && (el.value.startsWith("data:image/png") || el.value === '')) {
                const sigContent = widgetAncestor.querySelector(".sigContent");
                const image = new Image();
                image.src = el.value;
                sigContent.textContent = '';
                sigContent.appendChild(image);
            }
            break;
        }
    }
};

webForm.FormulaPublisher = function (obj) { //formula feature publisher
    webForm.Publisher.call(this, obj);

    const t = this;

    const func = function (event) {
        const cObj = event.target;
        if (!event.target.hasAttribute('webform')) return;

        if (this.hasAttribute("subgroup")) {
            //variable j calculate index
            let index = 1, fields = this.children;
            for (; index < fields.length; index++) {
                if (fields[index].querySelector('[webform]') === cObj) break;
            }
            t.publish(index);
        } else {
            t.publish();
        }
    };

    t.obj.addEventListener("paste", func, false);
    t.obj.addEventListener("change", func, false);
    t.obj.addEventListener("input", func, false);
};
webForm.FormulaPublisher.prototype = Object.create(webForm.Publisher.prototype);

webForm.FormulaTracker = function (obj) {   //formula tracker
    webForm.Tracker.call(this, obj);
    this.formula = this.obj.getAttribute("f") || this.obj.getAttribute("dv_f");
};
webForm.FormulaTracker.prototype = Object.create(webForm.Tracker.prototype);
webForm.FormulaTracker.prototype.update = function (index) {
    let formulaIndex;

    if (this.obj.hasAttribute("subgroup")) {
        if (!index || index === -1) {
            const nodeList = webForm._form.elements.namedItem(this.obj.getAttribute("subgroup"));
            if (nodeList.length) {
                for (let i = nodeList.length; i--;) {
                    this.update(i + 1);
                }
                return;
            } else {
                index = 1;
                formulaIndex = 0;
            } //same as normal field
        } else {
            formulaIndex = index;
        }
    } else {
        index = 1;
        formulaIndex = 0;
    }

    // if subtable element is deleted, do nothing.
    if (this.obj.children.length <= index) return;

    let fieldType = formulaMode.STRING;
    if (this.obj.hasAttribute("fmt_n")) fieldType = formulaMode.NUMBER;
    else if (this.obj.hasAttribute("fmt_d")) fieldType = formulaMode.DATE;
    let formulaResult = resolveFormula(this.formula, formulaIndex, fieldType);
    if (formulaResult === NO_CHANGE_SIGNAL) {
        return;
    }

    if (fieldType === formulaMode.DATE && isNumeric(formulaResult)) {
        formulaResult = correctFormulaDateResult(formulaResult, this.obj.getAttribute("fmt_d"));
    }

    if (formulaResult || formulaResult === 0) {
        // Formatting Result
        if (this.obj.hasAttribute("fmt_n")) {
            const pureNum = cleanUpNumber(formulaResult + "");
            const floatValue = parseFloat(pureNum);
            if (!isNaN(floatValue)) {
                formulaResult = formatNumber(floatValue, this.obj.getAttribute("fmt_n"));
            }
        } else if (this.obj.hasAttribute('phonefmt')) {
            const formattingRemoved = ragic_phone_unformat(formulaResult, this.obj.getAttribute('phonefmt'));
            formulaResult = ragic_phone_format(formattingRemoved, this.obj.getAttribute('phonefmt'));
        } else if (this.obj.hasAttribute('fmt_d')) {
            const stdDate = getDateFromFormat(formulaResult, 'yyyy/MM/dd HH:mm:ss');
            if (!isNaN(stdDate)) {
                formulaResult = formatDate(new Date(stdDate), getStandardFormat(this.obj.getAttribute('fmt_d')));
            }
            else {
                const smartParsed = ragic_date_parse(formulaResult + "", this.obj.getAttribute('fmt_d'), this.formula);
                if (!smartParsed) {
                    formulaResult = '';
                } else {
                    formulaResult = formatDate(smartParsed, this.obj.getAttribute('fmt_d'));
                }
            }
        }
    } else {
        formulaResult = "";
    }

    const field = this.obj.children[index].querySelector('[webform]');
    if (!field) return;
    if (field.getAttribute('webform') === 'option') {
        const correctOption = field.parentNode.querySelector('input[type="radio"][value="' + formulaResult + '"]');
        if (correctOption) {
            correctOption.checked = true;
            webForm.triggerEvent(correctOption, 'change');
        }
    } else {
        // Notice! we may use type "number" or type "date" input on mobile browser
        // For these two types, we can not use formatted string as its value
        if (field.type === 'date') {
            field.valueAsDate = new Date(formulaResult);
        } else if (field.type === 'number') {
            field.valueAsNumber = webForm.unformatValue(formulaResult, this.obj);
        } else {
            // for text type input
            field.value = formulaResult;
        }
    }

    if (this.obj.hasAttribute("ro")) webForm.setReadOnlyDiv(field);
    webForm.triggerEvent(field, 'change');
};
webForm.FormulaDescriptionTracker = function (obj, formula) {   //formula tracker
    webForm.Tracker.call(this, obj);
    this.formula = formula;
    this.rawContent = obj.querySelector('p').innerHTML;
};
webForm.FormulaDescriptionTracker.prototype = Object.create(webForm.Tracker.prototype);
webForm.FormulaDescriptionTracker.prototype.update = function () {
    delete ctrl.formulaResultCache[this.formula]; // the cache is for Ragic browse mode, we don't need it in web form page.
    const newValue = this.rawContent.replace(/\[formula\][\s]*(.+)\[\/formula\]/gim, formulaReplaceHelper);
    this.obj.querySelector('p').innerHTML = displayValueProcess(newValue);
    bbcodeToHtml(this.obj);
};

webForm.CascadePublisher = function (obj) { // cascaded selection publisher
    webForm.Publisher.call(this, obj);

    const t = this;
    const func = function (event) {
        const cObj = event.target;

        if (this.hasAttribute("subgroup")) {
            //variable j calculate index
            let index = 1, fields = this.children;
            for (; index < fields.length; index++) {
                if (fields[index].lastChild === cObj) break;
            }
            t.publish(cObj.value, index);
        } else {
            t.publish(cObj.value, -1);
        }
    };

    t.obj.addEventListener("change", func, false);
};
webForm.CascadePublisher.prototype = Object.create(webForm.Publisher.prototype);
webForm.CascadeTracker = function (obj) {
    webForm.Tracker.call(this, obj);
};
webForm.CascadeTracker.prototype = Object.create(webForm.Tracker.prototype);
webForm.CascadeTracker.prototype.update = function (parentValue, index) {
    const domainId = this.obj.getAttribute("domainId");
    const _cascadedItem = webForm.cascadedRelation[domainId];
    const _options = _cascadedItem.options;
    const parentId = _cascadedItem.cascadedTo;
    const parentDom = document.querySelectorAll('[name=\"' + parentId + '\"]');
    const isRadio = Array.from(parentDom).every(function (dom) {
        return dom.tagName === 'INPUT';
    });
    const radioIsChecked = isRadio && Array.from(parentDom).some(function (dom) {
        return dom.checked;
    });
    const selectElement = index === -1 ? this.obj.querySelector('SELECT') : this.obj.querySelectorAll('SELECT')[index - 1];
    selectElement.options.length = 1;
    if (parentValue.length && (!isRadio || radioIsChecked)) {
        for (let i = 0; i < _options.length; i++) {
            let opt = _options[i],
                prefix = opt.value.substring(0, opt.value.indexOf('|')),
                trueValue = opt.value.substring(opt.value.indexOf('|') + 1);
            if (prefix === parentValue) {
                let newOpt = new Option(trueValue, trueValue);
                newOpt.setAttribute("nodeId", opt.getAttribute("nodeId"));
                selectElement.add(newOpt);
                selectElement.selectedIndex = -1;
            }
        }
    }
    webForm.triggerEvent(selectElement[0].parentNode, 'change');
};

webForm.DynamicFilterPublisher = function (obj) {
    webForm.Publisher.call(this, obj);
    const t = this;
    this.obj.addEventListener("change", function (e) {
        const field = e.target;
        const data = field.value;
        const index = Array.from(field.parentNode.parentNode.children).indexOf(field.parentNode);
        t.publish(data, index);
    });
};
webForm.DynamicFilterPublisher.prototype = Object.create(webForm.Publisher.prototype);
webForm.DynamicFilterTracker = function (obj) {
    webForm.Tracker.call(this, obj);
};
webForm.DynamicFilterTracker.prototype = Object.create(webForm.Tracker.prototype);
webForm.DynamicFilterTracker.prototype.update = function (data, index) {
    // issue[12036]:如果不是子表格，index 為 undefined，會導致找不到select
    if (!index) index = 1;
    const domainId = this.obj.getAttribute("domainId");
    const webFormSelection = this.obj.querySelectorAll('.webFormSelection')[index - 1];
    const select = this.obj.querySelectorAll("SELECT")[index - 1];
    if (!select) {
        console.error('No select.');
        return;
    }
    const _options = select.options;
    if (!webForm.floatingSelectOptions.hasOwnProperty(domainId)) return;
    const _optionsArray = webForm.floatingSelectOptions[domainId];
    const mvp = this.obj.getAttribute("mvp");
    const stf = this.obj.getAttribute("stf");
    if (!stf) {
        console.error('No select title field');
        return;
    }

    const mvpfValueSet = this.obj.getAttribute("mvpf").split("&");
    const newFv2 = mvpfValueSet.map(function (mvpValue) {
        const mvpDomainId = mvpValue.substring(0, mvpValue.indexOf("|"));
        let operator = mvpValue.substring(mvpValue.indexOf("|") + 1, mvpValue.lastIndexOf("|"));
        switch (operator) {
            case '-1':
                operator = 'eqeq';
                break;
            case '1':
                operator = 'eq';
                break;
            case '2':
                operator = 'gte';
                break;
            case '3':
                operator = 'lte';
                break;
            case '4':
                operator = 'gt';
                break;
            case '5':
                operator = 'lt';
                break;
            case '8':
                operator = 'like';
                break;
            case '9':
                operator = 'specialSet';
                break;
        }
        let replaceValue = mvpValue.substring(mvpValue.lastIndexOf("|") + 1);
        if (replaceValue.startsWith("$")) {
            const dynamicElements = Array.from(webForm._form.elements).filter(function (ele) {
                return ele.getAttribute('name') === replaceValue.slice(1);
            });
            const isRadio = dynamicElements.every(function (dynamicElement) {
                return dynamicElement.type === 'radio';
            });
            const dynamicElement = isRadio ? dynamicElements.find(function (ele) {
                return ele.checked;
            }) : dynamicElements[index - 1];
            const dynamicValue = dynamicElement ? dynamicElement.value : '';
            if (!dynamicValue) replaceValue = "";
            else replaceValue = dynamicValue;
        }
        if (operator.startsWith("11,")) {
            replaceValue = operator.substr(3).replace('{0}', replaceValue);
            operator = "regex";
        }
        if (!replaceValue) return '';
        return mvpDomainId + "," + operator + "," + replaceValue;
    }).filter(function (value) {
        return value.length;
    });

    const mvpSplit = mvp.split("|");
    const url = "/" + ap + mvpSplit[0] + "/" + mvpSplit[1].split("_")[0];
    const params = {'api': '', 'naming': 'eid', 'where': newFv2};
    getPromise(url, params).then(JSON.parse).then(function (res) {
        const selectedValue = select.value;
        _options.length = 1;
        const results = Object.values(res).map(function (obj) {
            return obj;
        }).sort(function (a, b) {
            return parseInt(a._seq) - parseInt(b._seq);
        }).map(function (obj) {
            return obj[stf];
        });
        results.forEach(function (val) {
            const option = _optionsArray.find(function (opt) {
                return opt.value === val;
            });
            if (option) select.appendChild(option.cloneNode(true));
        });
        // 恢復值，避免選項更動時出問題
        select.value = selectedValue;
        const barSelectId = webFormSelection.querySelector('.barSelect').id;
        const barSelect = BarSelectAgent.getSelector(barSelectId);
        barSelect.updateOptionsBySelect(select);
    });
};
webForm.setFloatingSelectOptions = function (res) {
    const domainId = this.getAttribute('domainid');
    const select = document.querySelector('select[name="' + domainId + '"]');
    JSON.parse(res).forEach(function (obj) {
        const opt = document.createElement('option');
        opt.setAttribute('nodeid', obj['nodeid']);
        opt.value = obj['value'];
        opt.textContent = obj['value'];
        select.appendChild(opt);
    });
    webForm.floatingSelectOptions[domainId] = Array.from(select.options);
    const barSelectDivs = this.querySelectorAll('.barSelect');
    Array.from(barSelectDivs).forEach(function (barSelectDiv) {
        barSelectDiv.classList.remove('load');
    });
    webForm.triggerEvent(select, 'change');
};
webForm.multipleValuePicker = function (obj) {
    obj.addEventListener('click', function (e) {
        const target = e.target;
        if (!target.classList.contains('optionSelectedDiv') && !target.classList.contains('singleSelectionContainer')) return;
        const webFormSelection = target.closest('.webFormSelection');
        const webFormMVPWin = $('webFormMVPWin');
        webFormMVPWin.style.display = 'block';
        const index = Array.from(obj.children).indexOf(webFormSelection) - 1;
        const mvp = obj.getAttribute("mvp");
        const stf = obj.getAttribute("stf");
        if (!stf) {
            console.error('No select title field');
            return;
        }
        mvpTarget = webFormSelection.querySelector('select');
        const mvpfValueSet = (obj.getAttribute("mvpf") || '').split("&");
        const fv3 = mvpfValueSet.map(function (mvpValue) {
            if (!mvpValue) return '';
            const mvpDomainId = mvpValue.substring(0, mvpValue.indexOf("|"));
            let operator = mvpValue.substring(mvpValue.indexOf("|") + 1, mvpValue.lastIndexOf("|"));
            switch (operator) {
                case '-1':
                    operator = 'eqeq';
                    break;
                case '1':
                    operator = 'eq';
                    break;
                case '2':
                    operator = 'gte';
                    break;
                case '3':
                    operator = 'lte';
                    break;
                case '4':
                    operator = 'gt';
                    break;
                case '5':
                    operator = 'lt';
                    break;
                case '8':
                    operator = 'like';
                    break;
                case '9':
                    operator = 'specialSet';
                    break;
            }
            let replaceValue = mvpValue.substring(mvpValue.lastIndexOf("|") + 1);
            if (replaceValue.startsWith("$")) {
                const dynamicElements = Array.from(webForm._form.elements).filter(function (ele) {
                    return ele.getAttribute('name') === replaceValue.slice(1);
                });
                const isRadio = dynamicElements.every(function (dynamicElement) {
                    return dynamicElement.type === 'radio';
                });
                const dynamicElement = isRadio ? dynamicElements.find(function (ele) {
                    return ele.checked;
                }) : dynamicElements[index];
                const dynamicValue = dynamicElement ? dynamicElement.value : '';
                if (!dynamicValue) replaceValue = "";
                else replaceValue = dynamicValue;
            }
            if (operator.startsWith("11,")) {
                replaceValue = operator.substr(3).replace('{0}', replaceValue);
                operator = "regex";
            }
            if (!replaceValue) return '';
            return mvpDomainId + "," + operator + "," + replaceValue;
        }).filter(function (value) {
            return value.length;
        });
        const mvpSplit = mvp.split("|");
        const url = "/sims/webview/getMVP.jsp";
        const params = {'ap': ap, 'p': mvpSplit[0], 'si': mvpSplit[1].split("_")[0], 'fv3': fv3, 'stf': obj.getAttribute('stf')};
        getPromise(url, params).then(function (res) {
            webFormMVPWin.querySelector('.floatingWinContent').innerHTML = res;
        });
    });
};

webForm.mvpClick = function (nodeId) {
    $('webFormMVPWin').style.display = 'none';
    if (!mvpTarget || mvpTarget.tagName !== 'SELECT') return;
    const selectedOption = Array.from(mvpTarget.querySelectorAll('option')).find(function (option) {
        return option.getAttribute('nodeid') === nodeId;
    });
    if (selectedOption) {
        selectedOption.selected = true;
        webForm.triggerEvent(mvpTarget, 'change');
    }
    mvpTarget = null;
};

webForm.restoreDraft = function () {
    if (isWebconfig) return;
    const draft = RagicStorage.localStorage.getItem("RAGIC_WEB_FORM_DRAFT/" + ap + path + '/' + sheetIndex);
    RagicStorage.localStorage.removeItem("RAGIC_WEB_FORM_DRAFT/" + ap + path + '/' + sheetIndex);
    //if draft is not empty and want to restore draft.
    if (!draft) return;
    const noNeedReStore = !location.href.includes('&addNewOption') && !confirm(lm['restoreDraft']);
    if (location.href.includes('&addNewOption')) window.history.replaceState(null, null, location.href.replace('&addNewOption', ''));
    if (noNeedReStore) return;
    let lines = draft.split("/n");
    let els = webForm._form.elements;

    for (let i = 0, max = lines.length; i < max; i++) {
        let sepIndex = lines[i].indexOf(',');
        let domainId = lines[i].slice(0, sepIndex);
        let val = decodeURIComponent(lines[i].slice(sepIndex + 1));
        let el = els.namedItem(domainId);

        if (!el) continue;
        if (el.isNodeList()) {
            let target = $(val);
            target.checked = 'checked';
            webForm.triggerEvent(target, 'change');
        } else {
            if (el.tagName === 'INPUT' && el.type === 'file') continue;
            if (el.hasAttribute('multiple') && el.getAttribute('data-type') !== 'file') {
                val.split('|').forEach(function (v) {
                    el.querySelector("option[value='" + v + "']").selected = true;
                });
            }
            else el.value = val;
            webForm.triggerEvent(el, 'change');

            if (val.startsWith("data:image/png")) {
                const widgetAncestor = el.closest('.webFormWidget');
                if (widgetAncestor.hasAttribute("sig")) {
                    let image = new Image();
                    image.src = val;
                    widgetAncestor.querySelector(".sigContent").appendChild(image);
                }
            }
        }
    }
};
webForm.setDraft = function () {
    if (isWebconfig) return;
    const draft = Array.from(webForm._form.elements).filter(function (_el) {
        return !!_el.name;
    }).reduce(function (accumulator, _el) {
        const infoDiv = _el.closest("[domainId]");

        // draft does not store default value, formula value, and auto generate value.
        if (infoDiv && !infoDiv.hasAttribute('dv') && !infoDiv.hasAttribute('dv_f') && !infoDiv.hasAttribute('f') && !infoDiv.hasAttribute('ag')) {
            if (_el.type && (_el.type === 'radio' || _el.type === 'checkbox')) {
                if (_el.checked) {
                    return accumulator + _el.name + "," + _el.id + "/n";
                }
            } else if (_el.value.length > 0) {
                if (_el.hasAttribute('multiple') && _el.getAttribute('data-type') !== 'file') {
                    const mValue = Array.from(_el.selectedOptions).reduce(function (acc, option) {
                        if (acc) return acc + '|' + option.value;
                        return acc + option.value;
                    }, '');
                    return accumulator + _el.name + ',' + encodeURIComponent(mValue) + '/n';
                }
                return accumulator + _el.name + "," + encodeURIComponent(_el.value) + "/n";
            }
        }
        return accumulator;
    }, "");

    if (draft) { //if draft is not empty, store it in RagicStorage.localStorage.
        try {
            RagicStorage.localStorage.setItem("RAGIC_WEB_FORM_DRAFT/" + ap + path + '/' + sheetIndex, draft);
        } catch (e) { //if localStorage is full
            console.log(e);
        }
    }
};

//issue[12286]
webForm.formatValue = function (field) {
    const widget = field.closest('.webFormWidget');
    const originalValue = field.value;
    if (!originalValue.length) return;
    let formatValue = '';
    let format = '';
    const isFormatNum = widget.hasAttribute('fmt_n');
    const isFormatDate = widget.hasAttribute('fmt_d');
    const isFormatPhone = widget.hasAttribute('phonefmt');
    if (isFormatNum) {
        format = widget.getAttribute('fmt_n');
        formatValue = ragic_number_format(this.unformatValue(originalValue, widget), format);
    } else if (isFormatDate) {
        format = widget.getAttribute('fmt_d');
        formatValue = ragic_date_format(originalValue, format);
    } else if (isFormatPhone) {
        format = widget.getAttribute('phonefmt');
        formatValue = ragic_phone_reformat(originalValue, format);
    } else {
        formatValue = originalValue;
    }
    if (formatValue !== originalValue) field.value = formatValue;
    field.dataset.originalValue = originalValue;
};

webForm.focusAddressField = function (e) {
    if (!e || !e.previousElementSibling) return;
    addressField = e.previousElementSibling;
};

webForm.addressPickerClick = function (address) {
    console.log(!addressField , addressField.tagName !== 'INPUT')
    if (!addressField || addressField.tagName !== 'INPUT') return;
    addressField.value = address;
};
webForm.process();
// keep data before leaving this page.
window.addEventListener('pagehide', webForm.setDraft, {once: true});
// restore data back when draft exists and everything is ready
webForm.restoreDraft();