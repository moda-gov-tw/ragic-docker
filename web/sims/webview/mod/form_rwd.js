/**
 * 定義 HTMLFieldSetElement.value
 * 方便直接對 radio, checkbox 處理值
 * 取代原先 isNodeList 判斷的方式
 */
Object.defineProperty(HTMLFieldSetElement.prototype, 'value', {
    get: function () {
        return Array.from(this.elements).filter(function (fieldData) {
            return fieldData.checked;
        }).map(function (fieldData) {
            return fieldData.value;
        }).join('|');
    },
    set: function (values) {
        const fieldSet = this;
        Array.from(fieldSet.elements).forEach(function (fieldData) {
            fieldData.checked = false;
        });
        values.split('|').forEach(function (value) {
            const target = Array.from(fieldSet.elements).find(function (fieldData) {
                return fieldData.value === value;
            });
            if (target) target.checked = true;
        });
    }
});

/**
 * 表單初始處理
 */
document.addEventListener('DOMContentLoaded', function initializeHandler() {
    webForm.initProcess();
    restoreDraft();
    Array.from(document.querySelectorAll('select.checkboxSelection')).forEach(function (select) {
        const fieldDataWrapper = select.closest('.fieldDataWrapper');
        const container = fieldDataWrapper.querySelector('.checkboxSelectionContainer');
        const checkboxSelect = document.createElement('div');
        checkboxSelect.classList.add('checkboxSelect');
        container.appendChild(checkboxSelect);
        renderCheckbox();
        checkboxSelect.addEventListener('click', function () {
            const length = select.length;
            if (length < 2) return;
            const currentSelectedIndex = select.selectedIndex;
            if (currentSelectedIndex === -1 || currentSelectedIndex === 0 || currentSelectedIndex === (length - 1)) select.selectedIndex = 1;
            else select.selectedIndex += 1;
            renderCheckbox();
        });
        select.addEventListener('change', renderCheckbox);
        function renderCheckbox() {
            const checkboxSymbol = checkboxSymbolRender(select.value) || '';
            checkboxSelect.innerHTML = checkboxSymbol;
        }
    });
    Array.from(document.querySelectorAll('select.singleSelection,select.multiSelection')).forEach(createBarSelect);
    Array.from(document.querySelectorAll('input.fileField')).forEach(function (input) {
        UploadFieldAgent.createUploadField(input, input.closest('.fieldDataWrapper'));
    });
    const mvpPromise = [];
    Array.from(document.querySelectorAll('.webFormWidget[mvp]')).forEach(function (widget) {
        const mvp = widget.getAttribute('mvp');
        const mvpSplit = mvp.split('|');
        const url = '/sims/webview/getMVP.jsp';
        const params = {'ap': ap, 'p': mvpSplit[0], 'si': mvpSplit[1].split('_')[0], 'stf': widget.getAttribute('stf'), 'getOptions': true};
        const barSelectDiv = widget.querySelector('.barSelect');
        if (barSelectDiv) {
            barSelectDiv.classList.add('load');
            mvpPromise.push(getPromise(url, params).then(function (response) {
                const fieldData = widget.querySelector('.fieldData');
                webForm.setDynamicFilterOptions(widget, response);
                webForm.defaultValueProcess(fieldData);
                const domainId = fieldData.name;
                const field = findFieldJSON(domainId);
                if (!field) {
                    console.error(domainId + ' not found!');
                    return false;
                }
                const preFillValue = field['pfv'];
                if (preFillValue) setFieldValue(fieldData, preFillValue);
                if (field.attributes['mvpf']) {
                    const mvpFilterSet = field.attributes['mvpf'].split('&');
                    mvpFilterSet.forEach(function (mvpFilter) {
                        // issue[13809]: 動態篩選使用固定值，dropdown option 需要一開始特別處理。
                        // issue[15482]: 針對$開頭的特殊值做處理。e.g. $EMPTY_VALUE
                        const observer = new webForm.DynamicFilterObserver(widget);
                        observer.update(0);
                    });
                }
                return true;
            }));
        }
    });
    // After mvp options loaded, re-trigger event
    Promise.all(mvpPromise).then(function (results) {
        const flag = results.every(function (result) {
            return result;
        });
        if (!flag) return;
        Object.keys(webForm.dynamicFilterPublisherRecord).forEach(function (domainId) {
            const fieldData = Array.from(document.querySelectorAll('.fieldData')).find(function (_fieldData) {
                return _fieldData.name === domainId;
            });
            if (fieldData) triggerEvent(fieldData, 'change');
        });
    });
});
//issue[10303]: disabled enter event for submit form
document.addEventListener('keydown', function disabledEnterSubmit(e) {
    const target = e.target;
    if (target.classList.contains('fieldData') && e.key === 'Enter') {
        e.preventDefault();
        if (target.classList.contains('RTEField') && e.altKey) {
            target.value += '\r\n';
        }
    }
});
window.addEventListener('pagehide', setDraft, {once: true});

/**
 * 幫單選欄位建立 BarSelect 元件
 * @param {HTMLSelectElement} select
 */
function createBarSelect(select) {
    if (!select.options) return;
    const fieldDataWrapper = select.closest('.fieldDataWrapper');
    const container = fieldDataWrapper.querySelector('.singleSelectionContainer,.multiSelectionContainer');
    const barSelect = BarSelectAgent.modifiedSelector('', select, container, {});
    barSelect.setRenderOptionLimit(1000);
    barSelect.setAfterSelectOption(function (option) {
        if (barSelect.multiple) {
            const targetOption = Array.from(select.options).find(function (_option) {
                return _option.value === option.value;
            });
            if (targetOption) targetOption.selected = !targetOption.selected;
        } else select.value = option.value;
        triggerEvent(select, 'change');
    });
    select.addEventListener('change', function () {
        barSelect.updateOptionsBySelect(select);
        const subtable = select.closest('.subTable');
        if (subtable) {
            const widget = select.closest('.webFormWidget');
            const fieldDataWrapper = select.closest('.fieldDataWrapper');
            fieldDataWrapper.style.minHeight = '';
            const height = fieldDataWrapper.offsetHeight;
            const index = Array.from(widget.children).indexOf(fieldDataWrapper);
            Array.from(subtable.querySelectorAll('.webFormWidget')).forEach(function (_widget) {
                const _fieldDataWrapper = _widget.children[index];
                if (!_fieldDataWrapper) return;
                _fieldDataWrapper.style.minHeight = height + 'px';
            });
        }
    });
}

/**
 * 地圖視窗設定值
 * @param {string} address
 */
function addressPickerClick(address) {
    const fieldDataWrapper = this.closest('.fieldDataWrapper');
    const field = fieldDataWrapper.querySelector('.fieldData');
    if (!field || field.tagName !== 'INPUT') {
        console.error(new TypeError('Not a HTMLInputElement!'));
        return;
    }
    field.value = address;
}

/**
 * 增加欄位選項
 * @param {string} domainId
 * @param {Array} originOptions
 */
function addOptions(domainId, originOptions) {
    const newOption = prompt(lm['addOptions'] + '?');
    if (newOption !== null && newOption.trim().length) {
        const trimOption = newOption.trim();
        if (originOptions.includes(trimOption)) {
            webForm.showMsg(lm['dataDup']);
            return;
        }
        const param = {'api': '', 'addOption': '', 'fid': domainId, 'option': trimOption};
        postPromise('/' + ap + path + '/' + sheetIndex, param).then(function () {
            location.href = location.href + '&addNewOption';
        }).catch(function (res) {
            webForm.showMsg(JSON.parse(res.response).msg);
        });
    }
}

/**
 * 處理靜態文字欄位的 BBCODE
 * @param {HTMLElement} freeElement
 */
function bbcodeToHtml(freeElement) {
    const p = freeElement.querySelector('p');
    const rawValue = displayValueProcess(p.innerHTML.replace(/<br\s*(\/)?>/gim, '\n'));
    const reg = /(^|[^=\[\]"'])((?:https?):(?:\/{1,3}|\\{1})[-a-zA-Z0-9:;,@#!%&()~_?\+=\/\\\.]*[-a-zA-Z0-9+&@#/%=~_|])/gim;
    let processValue = rawValue.replace(reg, "$1<a href='$2' target='_blank' rel='noopener noreferrer nofollow' onmousedown='event.preventDefault();event.stopPropagation();'>$2</a>");
    processValue = RagicBBCodeParser.processToHTML(processValue);
    p.innerHTML = processValue;
    //issue[11751]
    if (p.dataset.action) {
        p.onclick = function () {
            open(p.dataset.action, '_blank', 'noopener noreferrer');
        };
    }
}

function setDraft() {
    if (isWebconfig) return;
    const draft = Array.from(document.querySelectorAll('.fieldData')).filter(function (fieldData) {
        return !!fieldData.name;
    }).reduce(function (accumulator, fieldData) {
        const domainId = fieldData.name;
        const field = findFieldJSON(domainId);
        if (!field) {
            console.error(domainId + ' not found!');
            return accumulator;
        }
        // draft does not store default value, formula value, and auto generate value.
        if (field && !field.attributes['dv'] && !field.attributes['dv_f'] && !field.attributes['f'] && !field.attributes['ag']) {
            if (fieldData.value.length > 0) {
                if (fieldData.type === 'select-multiple') {
                    const valueList = Array.from(fieldData.selectedOptions).reduce(function (acc, option) {
                        if (acc) return acc + '|' + option.value;
                        return acc + option.value;
                    }, '');
                    return accumulator + fieldData.name + ',' + encodeURIComponent(valueList) + '/n';
                }
                return accumulator + fieldData.name + ',' + encodeURIComponent(fieldData.value) + '/n';
            }
        }
        return accumulator;
    }, '');
    //if draft is not empty, store it in RagicStorage.localStorage.
    if (draft) {
        try {
            RagicStorage.localStorage.setItem('RAGIC_WEB_FORM_DRAFT/' + ap + path + '/' + sheetIndex, draft);
        } catch (e) {
            //localStorage is full
            console.error(e);
        }
    }
}

function restoreDraft() {
    if (isWebconfig) return;
    const noNeedConfirm = location.href.includes('&addNewOption');
    if (noNeedConfirm) window.history.replaceState(null, null, location.href.replace('&addNewOption', ''));
    const draft = RagicStorage.localStorage.getItem('RAGIC_WEB_FORM_DRAFT/' + ap + path + '/' + sheetIndex);
    RagicStorage.localStorage.removeItem('RAGIC_WEB_FORM_DRAFT/' + ap + path + '/' + sheetIndex);
    //if draft is not empty and want to restore draft.
    if (!draft) return;
    // issue[12601]: 新增選項刷新頁面不需要詢問是否恢復
    const noNeedRestore = !noNeedConfirm && !confirm(lm['restoreDraft']);
    if (noNeedRestore) return;

    draft.split('/n').forEach(function (valueSet) {
        const SeparateIndex = valueSet.indexOf(',');
        const domainId = valueSet.slice(0, SeparateIndex);
        const value = decodeURIComponent(valueSet.slice(SeparateIndex + 1));
        const fieldData = document.querySelector('.fieldData[name="' + domainId + '"]');
        if (!fieldData) return;
        setFieldValue(fieldData, value);
        if (value.startsWith('data:image/png')) {
            const widget = fieldData.closest('.webFormWidget');
            if (widget.hasAttribute('sig')) {
                const image = new Image();
                image.src = value;
                widget.querySelector('.sigContent').appendChild(image);
            }
        }
    });
}

/**
 * 用來設定欄位的值，目前用在預設值及預先填入值
 * @param {HTMLInputElement | HTMLSelectElement | RadioNodeList} fieldData
 * @param {string} value
 * @param {string} [nodeId]
 */
function setFieldValue(fieldData, value, nodeId) {
    if (fieldData.type === 'select-multiple') {
        if (nodeId) {
            const optionList = nodeId.split('|');
            Array.from(fieldData.options).forEach(function (option) {
                option.selected = optionList.includes(option.getAttribute('nodeid'));
            });
        } else {
            const optionList = value.split('|');
            Array.from(fieldData.options).forEach(function (option) {
                option.selected = optionList.includes(option.value);
            });
        }
    } else if (fieldData.type === 'select-one' && nodeId) {
        fieldData.selectedIndex = Array.from(fieldData.options).findIndex(function (opt) {
            return opt.getAttribute('nodeid') === nodeId;
        });
    } else fieldData.value = value;
    triggerEvent(fieldData, 'change');
}

/**
 * 轉換字串的跳脱字元
 * @param {string} text
 * @returns {string|*}
 * @constructor
 */
function HTMLEscapeRecover(text) {
    if (!text) return '';
    return text.replace(new RegExp('&#44;', 'gm'), ',').replace(/<br\s*(\/)?>/gim, '\r\n');
}

/**
 * 開啟連結欄位的表單來新增資料
 * @param {string} mvp - path|formName
 * @param {string} stf - 來源欄位的 Id
 * @param {string} domainId
 */
function openAddMVPOptionForm(mvp, stf, domainId) {
    const mvpSplit = mvp.split('|');
    const mvpPath = mvpSplit[0];
    const mvpSheet = mvpSplit[1];
    const mvpSheetIndex = mvpSheet.split('_')[0];
    const newUrl = ap + mvpPath + '/' + mvpSheetIndex;
    webForm.callbackFn = mvpCallback;
    webForm.mvpInfo = {};
    webForm.mvpInfo.domainId = domainId;
    webForm.mvpInfo.stf = stf;
    if (typeof ragic_url === 'undefined') {
        window.open(location.protocol + '//' + location.host + '/' + newUrl + '?webview&webaction=form&ver=new&saveClose');
    } else {
        window.open(location.protocol + '//' + ragic_url + '?webview&webaction=form&ver=new&saveClose');
    }
}

/**
 * 連結欄位新增資料後自動帶入該筆資料
 * @param {string} returnValue
 */
function mvpCallback(returnValue) {
    const result = JSON.parse(returnValue);
    const stfDomainId = webForm.mvpInfo.stf;
    const domainId = webForm.mvpInfo.domainId;
    const select = document.querySelector('.webFormSelection select[name="' + domainId + '"]');
    const newOption = node('OPTION');
    newOption.value = result.data[stfDomainId];
    newOption.setAttribute('nodeid', result.data['_ragicId']);
    newOption.appendChild(document.createTextNode(result.data[stfDomainId]));
    if (select.querySelectorAll('option').length > 1) select.insertBefore(newOption, select.querySelectorAll('option')[1]);
    else select.appendChild(newOption);
    select.selectedIndex = 1;
    triggerEvent(select, 'change');
}

/**
 * 計算公式值
 * @param formula
 * @param index
 * @param widget
 * @return {string | {t: string}}
 */
function getFormulaResult(formula, index, widget) {
    let fieldType = formulaMode.STRING;
    if (widget.hasAttribute('fmt_n')) fieldType = formulaMode.NUMBER;
    else if (widget.hasAttribute('fmt_d')) fieldType = formulaMode.DATE;
    let formulaResult = resolveFormula(formula, index, fieldType);
    if (formulaResult === NO_CHANGE_SIGNAL) return formulaResult;

    if (fieldType === formulaMode.DATE && isNumeric(formulaResult)) {
        formulaResult = correctFormulaDateResult(formulaResult, widget.getAttribute('fmt_d'));
    }
    if (formulaResult || parseInt(formulaResult) === 0) {
        if (widget.hasAttribute('fmt_n')) {
            const pureNum = cleanUpNumber(formulaResult + '');
            const floatValue = parseFloat(pureNum);
            if (!isNaN(floatValue)) {
                formulaResult = formatNumber(floatValue, widget.getAttribute('fmt_n'));
            }
        } else if (widget.hasAttribute('phonefmt')) {
            formulaResult = ragic_phone_reformat(formulaResult, widget.getAttribute('phonefmt'));
        } else if (widget.hasAttribute('fmt_d')) {
            const stdDate = getDateFromFormat(formulaResult, 'yyyy/MM/dd HH:mm:ss');
            if (!isNaN(stdDate)) {
                formulaResult = formatDate(new Date(stdDate), getStandardFormat(widget.getAttribute('fmt_d')));
            } else {
                const smartParsed = ragic_date_parse(formulaResult + '', widget.getAttribute('fmt_d'), formula);
                formulaResult = smartParsed ? formatDate(smartParsed, widget.getAttribute('fmt_d')) : '';
            }
        } else formulaResult += '';
    } else formulaResult = '';

    return formulaResult;
}

/**
 * 尋找欄位 JSON
 * @param domainId {string | number}
 * @return {Object}
 */
function findFieldJSON(domainId) {
    return fieldsJSON.find(function (fieldJSON) {
        return parseInt(fieldJSON['domainId']) === parseInt(domainId);
    });
}

/**
 * 上鎖欄位
 * @param fieldData {HTMLInputElement|HTMLSelectElement}
 */
function lockField(fieldData) {
    fieldData.addEventListener('keydown', cancelEventBubble);
    fieldData.addEventListener('keyup', cancelEventBubble);
    fieldData.addEventListener('paste', cancelEventBubble);
}

/**
 * 解鎖欄位
 * @param fieldData {HTMLInputElement|HTMLSelectElement}
 */
function unlockField(fieldData) {
    fieldData.removeEventListener('keydown', cancelEventBubble);
    fieldData.removeEventListener('keyup', cancelEventBubble);
    fieldData.removeEventListener('paste', cancelEventBubble);
}

/** override functions in sims.js **/
function processDefaultValueString(value) {
    if (!value) return;
    if (value.includes('$DATE') && value !== '$DATETIME') {
        value = value.replace('$DATE', new Date().getTime() / (1000 * 60 * 60 * 24));
        const result = Function('"use strict";return (' + value + ')')();
        return formatDate(new Date(result * 1000 * 60 * 60 * 24), 'yyyy/MM/dd');
    }
    if (value.substring(0, 1) === '$') {
        const d = new Date();
        if (value === '$DATE') value = formatDate(d, 'yyyy/MM/dd');//standard date format
        else if (value === '$YEAR') value = d.getFullYear();
        else if (value === '$MONTH') value = d.getMonth() + 1;
        else if (value === '$TIME') value = LZ(d.getHours()) + ':' + LZ(d.getMinutes()) + ':' + LZ(d.getSeconds());
        else if (value === '$DATETIME') value = formatDate(d, 'yyyy/MM/dd HH:mm:ss');//standard datetime format
        else if (value === '$WEEKDAY') value = d.getDay();
        else if (value === '$USERID') value = window['user'] || '';
        else if (value === '$USERNAME' || value === '$USER') value = userName || '';
        else if (value === '$ACCOUNT') value = window['myapp'];
        else if (value === '$MGRACCOUNT') value = window['mymgrapp'];
        else if (value.startsWith('$CUR')) {
            // Exchange rate
            const curFrom = value.slice(4, 7);
            const curTo = value.slice(7, 10);
            const exchangeRate = fxrate(curFrom, curTo);
            value = ragic_number_format(exchangeRate, '#.#####');
        } else if (value === '$EMPTY_VALUE') value = '';
    } else if (value.substring(0, 1) === '#') {
        let d = new Date();
        if (value === '#DATE') value = formatDate(d, 'yyyy/MM/dd');
        else if (value === '#TIME') value = LZ(d.getHours()) + ':' + LZ(d.getMinutes()) + ':' + LZ(d.getSeconds());
        else if (value === '#DATETIME') value = formatDate(d, 'yyyy/MM/dd HH:mm:ss');
        else if (value === '#YEAR') value = d.getFullYear();
        else if (value === '#MONTH') value = d.getMonth() + 1;
        else if (value === '#WEEKDAY') value = d.getDay();
        else if (value === '#USERID') value = (window['user'] && !equalIgnoreCase(window['user'], 'guest account')) ? window['user'] : '';
        else if (value === '#USERNAME' || value === '#USER') value = (window['userName'] && !equalIgnoreCase(window['userName'], 'guest account')) ? window['userName'] : '';
    }
    return value;
}

function datePickerDateClick() {
    const dateString = this.getAttribute('value');
    let fullString = dateString;
    if (this.picker.hasTime && this.picker.timeSel) {
        const timeSel = this.picker.timeSel;
        if (timeSel.selectedIndex === -1) {
            this.picker.cellDate = parseDate(dateString);
            ctrl.dropWin = true;
            this.picker.showMonth();
            return;
        } else {//time chosen
            const time = timeSel.options[timeSel.selectedIndex].value;
            fullString = dateString + ' ' + time + ':00';
        }
    }
    ctrl.datePickerInput.value = fullString;
    triggerEvent(ctrl.datePickerInput, 'change');
    clearDropWin();
}

function datePickerTimeClick() {
    const timeSel = this;
    const options = timeSel.options;
    const time = options[timeSel.selectedIndex].value;
    const picker = options[timeSel.selectedIndex].picker;
    const cellDate = picker.cellDate ? picker.cellDate : new Date();
    const dateString = formatDate(cellDate, 'yyyy/MM/dd');
    const timeOnly = !picker.hasDate;
    ctrl.datePickerInput.value = timeOnly ? time : dateString + ' ' + time + ':00';
    triggerEvent(ctrl.datePickerInput, 'change');
    clearDropWin();
}

function showSignBox(caller) {
    const signatureWin = document.getElementById('webFormSignatureWin');
    const signArea = signatureWin.querySelector('#webFormSigCanvas');
    signatureWin.style.display = 'block';
    const centerX = (window.innerWidth - signatureWin.getBoundingClientRect().width) / 2;
    const centerY = (window.innerHeight - signatureWin.getBoundingClientRect().height) / 2;
    signatureWin.style.top = centerY + 'px';
    signatureWin.style.left = centerX + 'px';

    let parentElement = caller.parentElement;
    let index = 0;
    const domainId = parentElement.parentElement.getAttribute('domainId');
    while ((parentElement = parentElement.previousElementSibling)) {
        index++;
    }
    signatureWin.dataset.domainId = domainId;
    signatureWin.dataset.index = index + '';

    if(signatureWin.clientWidth < 550) {
        signArea.width = signatureWin.clientWidth - 42; // padding: 20px, border: 1px => total: 42px
    }

    loadSigScript(document.getElementById('webFormSigCanvas'));

    if (!ctrl.isIE || !ctrl.isObsoleteIE) {
        const sigBackgroundDiv = document.getElementById('webFormSigBackgroundDiv');
        sigBackgroundDiv.style.display = 'block';
        setSignatureBackgroundBox();
    }
}

function setSignatureBackgroundBox() {
    const fromLocalIcon = $('sigFromLocal');
    const fromWebIcon = $('sigFromWeb');
    fromLocalIcon.onclick = function () {
        const input = node('input');
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
            if (!url.startsWith('http')) {
                url = 'https://' + url;
            }
            fetch(url).then(function (response) {
                return response.blob();
            }).then(readBlobAsDataURL).then(setSignatureBackground).catch(console.error);
        }
    };
}

function saveSig() {
    const data = ctrl.signaturePad.toDataURL();
    const signatureWin = document.getElementById('webFormSignatureWin');
    signatureWin.style.display = 'none';
    const domainId = signatureWin.dataset.domainId;
    const index = signatureWin.dataset.index;
    const widget = webForm.widgets.find(function (_widget) {
        return _widget.getAttribute('domainid') === domainId;
    });
    const fieldDataWrapper = widget.children[index];
    const sigContent = fieldDataWrapper.querySelector('.sigContent');
    const fieldData = fieldDataWrapper.querySelector('.fieldData');
    rm(sigContent);
    const img = document.createElement('IMG');
    img.src = data;
    sigContent.appendChild(img);
    fieldData.value = data;
}

function createMVPFilterValue(mvpfValueSet, index) {
    return mvpfValueSet.map(function (mvpValue) {
        if (!mvpValue) return '';
        const mvpDomainId = mvpValue.substring(0, mvpValue.indexOf('|'));
        const rawOperator = mvpValue.substring(mvpValue.indexOf('|') + 1, mvpValue.lastIndexOf('|'));
        const operator = webForm.filterOperators[rawOperator];
        let replaceValue = mvpValue.substring(mvpValue.lastIndexOf('|') + 1);
        if (replaceValue.startsWith('$')) {
            const dfWidget = document.querySelector('.webFormWidget[domainId="' + replaceValue.slice(1) + '"]');
            if (dfWidget) {
                const dynamicFieldDatas = dfWidget.querySelectorAll('.fieldData');
                const dynamicFieldData = dfWidget.hasAttribute('subgroup') ? dynamicFieldDatas[index] : dynamicFieldDatas[0];
                const dynamicValue = dynamicFieldData ? dynamicFieldData.value : '';
                if (!dynamicValue) replaceValue = '';
                else replaceValue = webForm.unformatValue(dynamicValue, dfWidget);
            }
        }
        if (!replaceValue) return '';
        replaceValue = processDefaultValueString(replaceValue);
        if (rawOperator.startsWith('11,')) replaceValue = rawOperator.substring(3).replace('{0}', replaceValue);
        return mvpDomainId + ',' + operator + ',' + replaceValue;
    }).filter(function (value) {
        return value.length;
    });
}

// issue[5564]: formula
function SUBTABLEROW(a, b) {
    b = parseInt(b);
    if (Array.isArray(a.SUM)) {
        const c = a.SUM.find(function (a) {
            return a.y === b
        });
        if (c) return c.value
    }
    return '';
}

formulaBuilder.getFormulaVariables = function _get_formula_variables_webview(fMode, y, formula) {
    const map = webForm.widgetsMap;
    const originFMode = fMode;
    const isFormulaIF = new RegExp(".*IF([S])*\\(.*\\).*").test(formula);
    for (const key in map) {
        const widgetObj = map[key];
        const widget = widgetObj.self;
        fMode = originFMode;
        // format data, refer to Biff.prototype.format
        const isFormatNum = widget.hasAttribute('fmt_n');
        const isFormatDate = widget.hasAttribute('fmt_d');
        const isFormatPhone = widget.hasAttribute('phonefmt');
        if (isFormulaIF) {
            if (isFormatNum) fMode = formulaMode.NUMBER;
            else if (isFormatDate) fMode = formulaMode.DATE;
        }

        const modeString = fMode === formulaMode.STRING;
        let total = modeString ? '' : 0;
        let totalRaw = '';
        let max = NaN;
        let min = NaN;
        let first = '';
        let last = '';
        let count = 0;

        if (widget.hasAttribute('subgroup')) {
            total = [];
            let _value;
            let numValue;
            let subObj;

            if (y && y > 0 && widget.children[y] && widget.children[y].querySelector('.fieldData') &&
                !widget.children[y].querySelector('.fieldData').classList.contains('webFormAGDiv')) {
                const fieldData = widget.children[y].querySelector('.fieldData');
                _value = webForm.unformatValue(fieldData.value, widget);
                totalRaw = _value;
                subObj = {'y': y, 'raw': totalRaw};
                total.push(subObj);

                if (modeString) {
                    if (isFormatPhone) {
                        subObj.value = ragic_phone_unformat(totalRaw, widget.getAttribute('phonefmt'));
                    } else {
                        if (isFormatDate) {
                            numValue = parseDateLong(totalRaw, widget.getAttribute('fmt_d')) || NaN;
                        } else {
                            numValue = parseFloat(totalRaw);
                        }
                        if (!isNaN(numValue)) {
                            if (totalRaw.includes('%')) {
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
                        numValue = parseDateLong(_value, widget.getAttribute('fmt_d')) || NaN;
                    } else {
                        let needPrecise = _value && _value.includes('%');
                        if (_value && fieldData.tagName !== 'SELECT') {
                            _value = _value.replace(/[^0-9.-]+/g, '');
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
                const rows = widget.children;
                for (let i = 1; i < rows.length; i++) {
                    if (rows[i].classList.contains('webformSettingConf')) continue;
                    _value = webForm.unformatValue(rows[i].querySelector('.fieldData').value, widget);
                    if (i === 1) first = _value;
                    last = _value;

                    if (rows[i].classList.contains('webformSettingConf')) continue;
                    if (rows[i].lastElementChild.classList.contains('webFormAGDiv')) continue;

                    subObj = {'y': i, 'raw': _value};
                    total.push(subObj);

                    if (modeString) {
                        totalRaw += _value;
                        if (isFormatPhone) {
                            subObj.value = ragic_phone_unformat(_value, widget.getAttribute('phonefmt'));
                        } else {
                            if (isFormatDate) {
                                numValue = parseDateLong(_value, widget.getAttribute('fmt_d')) || NaN;
                            } else {
                                numValue = parseFloat(_value);
                            }
                            if (!isNaN(numValue)) {
                                if (_value.includes('%')) {
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
                    } else {
                        if (isFormatDate) {
                            numValue = parseDateLong(_value, widget.getAttribute('fmt_d')) || NaN;
                            totalRaw += _value;
                        } else {
                            let needPrecise = _value.includes('%');
                            if (rows[i].lastElementChild.tagName !== 'SELECT') {
                                _value = _value.replace(/[^0-9.-]+/g, '');
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
            const fieldData = document.querySelector('.fieldData[name="' + widget.getAttribute('domainId') + '"]');
            let formElementValue = '';
            if (fieldData) formElementValue = webForm.unformatValue(fieldData.value, widget) || fieldData.value;

            if (modeString) {
                totalRaw = formElementValue;
                if (isFormatPhone) {
                    total = ragic_phone_unformat(totalRaw, widget.getAttribute('phonefmt'));
                } else {
                    total = totalRaw;
                }

                let numValue = parseFloat(totalRaw);
                if (!isNaN(numValue)) {
                    if (totalRaw.includes('%')) {
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
                    numValue = parseDateLong(formElementValue, widget.getAttribute('fmt_d')) || NaN;
                    totalRaw = formElementValue;
                } else {
                    numValue = parseFloat(formElementValue.replace(/[^0-9.-]+/g, ''));
                    if (!isNaN(numValue) && formElementValue.includes('%')) {
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

        widgetObj.SUM = total;
        widgetObj.COUNT = count;
        widgetObj.MIN = min;
        widgetObj.MAX = max;
        widgetObj.FIRST = first;
        widgetObj.LAST = last;
        widgetObj.RAW = totalRaw;
        widgetObj.FMODE = fMode;
    }

    return map;
}

/** end of overriding **/
