var webForm = {
    _form: null,
    widgets: [],
    widgetsMap: {},
    dynamicFilterOptions: {},
    subTableClassifier: {},
    subTableRowHeight: {},
    formulaItem: [],
    globalFormulaTracker: [],
    dynamicFilterPublisherRecord: {},
    cascadedRelation: {},
    submitStopper: [],
    callbackFn: null,
    mvpInfo: {},
    filterOperators: {
        '-1': 'eqeq', '1': 'eq',
        '2': 'gte', '3': 'lte',
        '4': 'gt', '5': 'lt',
        '8': 'like', '9': 'specialSet',
        '11,^(?!{0}$)': 'regex', '11,^((?!{0}).)*$,^.*$': 'regex',
    },
};

// 初始化處理，呼叫各種處理功能
webForm.initProcess = function () {
    webForm._form = document.getElementById('wForm');
    webForm.widgets = Array.from(document.querySelectorAll('.webFormWidget'));
    webForm.widgetAttributeProcess();
    webForm.preFillValue();
    webForm.subtableProcess();
    webForm.formulaProcess();
    webForm.cascadedProcess();
    webForm.freeValueProcess();
    webForm.ruleProcess();
    Array.from(document.querySelectorAll('.fieldData')).filter(function (fieldData) {
        return isNumeric(parseInt(fieldData.name));
    }).forEach(function (fieldData) {
        triggerEvent(fieldData, 'change');
    });
    const closeTooltip = function () {
        const webFormTooltips = document.getElementById('webFormTooltips');
        if (webFormTooltips) webFormTooltips.style.display = 'none';
    };
    document.addEventListener('click', closeTooltip);
    document.addEventListener('touchstart', closeTooltip);
};
// 欄位屬性處理
webForm.widgetAttributeProcess = function () {
    fieldsJSON.forEach(function (fieldJSON) {
        fieldJSON.attributes = parseAttributes(fieldJSON.attributes);
    });
    this.widgets.forEach(function (widget) {
        const domainId = widget.getAttribute('domainid');
        const field = findFieldJSON(domainId);
        if (!field) {
            console.error(domainId + ' not found!');
            return;
        }
        const fieldDataWrapper = widget.querySelector('.fieldDataWrapper');
        const fieldData = widget.querySelector('.fieldData');
        if (field.attributes['ro']) {
            fieldDataWrapper.classList.add('readonly');
            webForm.setTabIndex(fieldData, -1);
        }
        if (field.attributes['ag']) {
            fieldData.disabled = true;
            if (!fieldData.value) fieldData.value = lm['autoGenerate'];
        }
        if (field.attributes['must']) {
            const fieldValue = widget.querySelector('.webFormfieldValue p');
            const star = document.createElement('span');
            star.style.cssText = 'color:#c43b1d;margin-left: 3px';
            star.textContent = '*';
            fieldValue.appendChild(star);
        }
        if (field.attributes['dv']) webForm.defaultValueProcess(fieldData);
        if (field.attributes['help']) {
            const fieldValue = widget.querySelector('.webFormfieldValue p');
            const help = document.createElement('a');
            help.classList.add('help');
            help.href = 'javascript:void(0);';
            help.textContent = '(?)';
            help.onclick = function (event) {
                cancelEventBubble(event);
                document.getElementById('webFormTooltips').style.display = '';
                webForm.showWebTooltip(fieldValue, field.attributes['help']);
            };
            fieldValue.appendChild(help);
        }
        if (field.attributes['l'] || field.attributes['ln']) {
            const subjectMap = {};
            const linkDomainId = field.attributes['l'] || field.attributes['ln'];
            const subjectWidget = document.querySelector('.webFormWidget[domainid="' + linkDomainId + '"]');
            if (subjectWidget) {
                if (!subjectMap.hasOwnProperty(linkDomainId)) {
                    subjectMap[linkDomainId] = new webForm.ListenSubject(subjectWidget);
                }
                const observer = new webForm.ListenObserver(widget);
                const subject = subjectMap[linkDomainId];
                subject.registerObservers(observer);
            }
        }
        if (field.attributes['f'] || field.attributes['dv_f']) webForm.formulaItem.push(widget);
        if (field['cascadedTo']) {
            webForm.cascadedRelation[domainId] = {
                'cascadedTo': field['cascadedTo'],
                'options': Array.from(fieldData.options),
            };
            fieldData.options.length = 1;
        }
        if (field.attributes['mvp'] && field['mvpMode']) webForm.multipleValuePicker(widget);
        if (field.attributes['mvpf']) {
            const mvpFilterSet = field.attributes['mvpf'].split('&');
            mvpFilterSet.forEach(function (mvpFilter) {
                const mvpFilterValue = mvpFilter.substring(mvpFilter.lastIndexOf('|') + 1);
                const filterDomainId = mvpFilterValue.includes('$') ? mvpFilterValue.substring(1) : null;
                if (filterDomainId) {
                    const subjectWidget = webForm._form.querySelector('.webFormWidget[domainid="' + filterDomainId + '"]');
                    if (!subjectWidget) return;
                    if (!webForm.dynamicFilterPublisherRecord.hasOwnProperty(filterDomainId)) {
                        webForm.dynamicFilterPublisherRecord[filterDomainId] = new webForm.DynamicFilterSubject(subjectWidget);
                    }
                    const subject = webForm.dynamicFilterPublisherRecord[filterDomainId];
                    const dynamicFilterObserver = new webForm.DynamicFilterObserver(widget);
                    subject.registerObservers(dynamicFilterObserver);
                }
            });
        }
        if (field['subGroup']) {
            const subtablKey = field['subGroup'];
            const subtablY = field['y'];
            const hr = document.createElement('div');
            hr.className = 'insertedHr';
            if (webForm.subTableClassifier.hasOwnProperty(subtablKey)) {
                webForm.subTableClassifier[subtablKey].push(widget);
            } else {
                webForm.subTableClassifier[subtablKey] = [widget];
            }
            if (webForm.subTableRowHeight.hasOwnProperty(subtablY)) {
                webForm.subTableRowHeight[subtablY] = Math.max(webForm.subTableRowHeight[subtablY], widget.lastElementChild.clientHeight);
            } else {
                webForm.subTableRowHeight[subtablY] = widget.lastElementChild.clientHeight;
            }
            widget.querySelector('.fieldHeaderWrapper').appendChild(hr);
        } else {
            webForm.widgetsMap[colNames[parseInt(field['x'])] + field['y']] = new webForm.widgetObj(widget);
        }
        if (field.attributes['email']) fieldData.addEventListener('blur', webForm.validateEmail.bind(this, fieldData));
        if (field.attributes['clockin']) lockField(fieldData);
        ['stylecolor', 'styleVcolor', 'stylebackgroundColor', 'styleVbackgroundColor'].forEach(function(styleAttribute) {
            const styleValue = field.attributes[styleAttribute];
            if (styleValue) {
                const attribute = styleAttribute.substring(5);
                const fieldStyleTarget = attribute.startsWith('v') ? widget.children[1] : widget.children[0];
                if (fieldStyleTarget) fieldStyleTarget.dataset[attribute] = styleValue;
            }
        });
    });
};
// 預先填入值處理
webForm.preFillValue = function () {
    //e.g. &pfv1000201=testPreFillValue
    location.href.split('&').filter(function (pfvSet) {
        return pfvSet.startsWith('pfv');
    }).map(function (pfvSet) {
        return decodeURIComponent(pfvSet.substring(3));
    }).map(function (pfvSet) {
        return pfvSet.split('=');
    }).filter(function (p) {
        return p.length === 2;
    }).map(function (p) {
        return {
            'fieldId': p[0],
            'fieldValue': p[1]
        };
    }).forEach(function (pfvInfo) {
        const domainId = pfvInfo.fieldId;
        const fieldData = document.querySelector('.fieldData[name="' + domainId + '"]');
        const value = pfvInfo.fieldValue;
        const field = findFieldJSON(domainId);
        if (!field) {
            console.error(domainId + ' not found!');
            return;
        }
        field['pfv'] = value;
        setFieldValue(fieldData, value);
    });
};
// 子表格處理
webForm.subtableProcess = function () {
    const subTableClassifier = webForm.subTableClassifier;
    Object.values(subTableClassifier).forEach(function (widgets) {
        const widgetsSize = widgets.length;
        if (widgetsSize < 0) return;
        const firstWidget = widgets[0].children[1];
        const firstWidgetRect = firstWidget.getBoundingClientRect();
        const subTable = document.querySelector('.subTable');
        const controller = document.createElement('DIV');
        controller.className = 'subController';
        controller.style.left = firstWidgetRect.left - 10 + 'px';
        controller.innerHTML =
            "<div class='subController-extend' title='extend subtable row' style='left: -18px;' onclick='webForm.openPageMode(this)'><i class='fas fa-expand-alt'></i></div>" +
            "<div class='subController-add' title='add subtable row' style='left:" + (subTable.clientWidth -5) + "px;' onclick='webForm.addSubRow(this);'><img alt='addRow' src='/sims/img/plus-circle-B.svg'/></div>" +
            "<div class='subController-delete' title='delete subtable row' style='left:" + (subTable.clientWidth + 15) + "px;' onclick='webForm.deleteSubRow(this);'><img alt='deleteRow' src='/sims/img/minus-circle-R.svg'/></div>";
        firstWidget.prepend(controller);
        let csShift = 0;
        widgets.forEach(function (widget) {
            webForm.widgetsMap[colNames[parseInt(widget.getAttribute('x')) + csShift] + widget.getAttribute('y')] = new webForm.widgetObj(widget);
            if (widget.hasAttribute('cs')) csShift += parseInt(widget.getAttribute('cs')) - 1;
        });
    });
};
// 連動選項處理
webForm.cascadedProcess = function () {
    const _form = webForm._form;
    const subjectMap = {};
    Object.keys(webForm.cascadedRelation).forEach(function (domainId) {
        const cascadedItem = webForm.cascadedRelation[domainId];
        const cascadedToDomainId = cascadedItem.cascadedTo;
        const observerWidget = _form.querySelector('DIV[domainid="' + domainId + '"]');
        const subjectWidget = _form.querySelector('DIV[domainid="' + cascadedToDomainId + '"]');
        if (observerWidget && subjectWidget) {
            if (!subjectMap.hasOwnProperty(cascadedToDomainId)) {
                subjectMap[cascadedToDomainId] = new webForm.CascadeSubject(subjectWidget);
            }
            const observer = new webForm.CascadeObserver(observerWidget);
            const subject = subjectMap[cascadedToDomainId];
            subject.registerObservers(observer);
        }
    });
};
// 靜態文字欄位處理
webForm.freeValueProcess = function () {
    Array.from(document.querySelectorAll('.freeValueWrapper')).forEach(bbcodeToHtml);
};
// 公式處理
webForm.formulaProcess = function () {
    const subjectMap = {};
    this.formulaItem.forEach(function (widget) {
        const formulaObserver = new webForm.FormulaObserver(widget);
        const changeCells = formulaBuilder._findChangeCellNames(formulaObserver.formula);
        changeCells.forEach(function (cell) {
            const mapObject = webForm.widgetsMap[cell];
            if (!mapObject) {
                console.error('Widget is not found!');
                return;
            }
            if (!subjectMap.hasOwnProperty(cell)) {
                const subjectWidget = mapObject.self;
                subjectMap[cell] = new webForm.FormulaSubject(subjectWidget);
            }
            const subject = subjectMap[cell];
            subject.registerObservers(formulaObserver);
        });
        if (!changeCells.length) {
            const formulaIndex = widget.hasAttribute('subgroup') ? 1 : 0;
            const formulaResult = getFormulaResult(formulaObserver.formula, formulaIndex, widget);
            if (formulaResult !== NO_CHANGE_SIGNAL) formulaObserver.update(0, formulaResult);
        }
        if (widget.hasAttribute('subgroup')) webForm.globalFormulaTracker.push(formulaObserver);
    });
    Array.from(document.querySelectorAll('.freeValueWrapper')).forEach(function (freeValueWrapper) {
        const formula = retrieveFormulaFromDesc(freeValueWrapper.textContent);
        if (!formula) return;
        const formulaDescriptionObserver = new webForm.FormulaDescriptionObserver(freeValueWrapper, formula);
        const changeCells = formulaBuilder._findChangeCellNames(formula);
        changeCells.forEach(function (cell) {
            const mapObject = webForm.widgetsMap[cell];
            if (!mapObject) {
                console.error('Widget is not found!');
                return;
            }
            if (!subjectMap.hasOwnProperty(cell)) {
                const subjectWidget = mapObject.self;
                subjectMap[cell] = new webForm.FormulaSubject(subjectWidget);
            }
            const subject = subjectMap[cell];
            subject.registerObservers(formulaDescriptionObserver);
        });
        if (!changeCells.length) formulaDescriptionObserver.update();
    });
};
// 條件式格式處理
webForm.ruleProcess = function () {
    RagicInteractiveRules.loadRules(ruleJSON);
    RagicInteractiveRules.execute(true);
    if (RagicInteractiveRules.rules.length) {
        webForm.widgets.forEach(function (widget) {
            const domainId = widget.getAttribute('domainid');
            const foundAsCondition = RagicInteractiveRules.rules.find(function (_rule) {
                return !!_rule.cons.find(function (condition) {
                    return parseInt(condition.domainId) === parseInt(domainId);
                });
            });
            if (foundAsCondition) {
                widget.addEventListener('paste', RagicInteractiveRules.execute.bind(RagicInteractiveRules, true, widget), false);
                widget.addEventListener('change', RagicInteractiveRules.execute.bind(RagicInteractiveRules, true, widget), false);
                widget.addEventListener('input', RagicInteractiveRules.execute.bind(RagicInteractiveRules, true, widget), false);
            }
        });
    }
};
// 預設值處理
webForm.defaultValueProcess = function (fieldData) {
    const domainId = fieldData.name;
    const field = findFieldJSON(domainId);
    if (!field) {
        console.error(domainId + ' not found!');
        return;
    }
    let defaultValue = processDefaultValueString(field.attributes['dv']);
    if (!defaultValue) return;
    if (defaultValue === '$SEQ') fieldData.value = 1;
    else {
        if (field.attributes['fmt_n'] && field.attributes['fmt_n'].includes('%') && !defaultValue.includes('%')) defaultValue *= 100;
        setFieldValue(fieldData, defaultValue);
    }
};

// 表單按鈕功能
webForm.submitCheck = function (e, button) {
    window.removeEventListener('pagehide', setDraft);
    if (doRecaptcha && window['grecaptcha']) {
        if (window['grecaptcha'].getResponse().trim().length === 0) {
            webForm.showMsg('Please complete the anti-spam verification', document.querySelector('.g-recaptcha'));
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
    button.dataset.submitted = 'true';
    let failInfo;
    const handleFail = function () {
        if (!failInfo) return;
        cancelEventBubble(e);
        webForm.showMsg(failInfo.reason, failInfo.field);
        const targetElement = failInfo['failedSubComponent'] ? failInfo['failedSubComponent'].parentElement : failInfo['field'].querySelector('.fieldDataWrapper');
        if (targetElement) targetElement.style.backgroundColor = '#ffcccc';
        else console.error('Field element not found!');
        button.dataset.submitted = '';
    };

    // subtable fields validation check
    const subtableKeys = Object.keys(webForm.subTableClassifier);
    const subtableKeysSize = subtableKeys.length;
    for (let keyIndex = 0; keyIndex < subtableKeysSize; ++keyIndex) {
        const subtableKey = subtableKeys[keyIndex];
        const subtableKeyWidget = webForm.subTableClassifier[subtableKey][0];
        const line = subtableKeyWidget.parentElement;
        const subtableRows = subtableKeyWidget.childElementCount - ( subtableKeyWidget.querySelector('.webformSettingConf') ? 1 : 0);
        for (let i = 1; i < subtableRows; ++i) {
            const subtableColumns = line.childElementCount;
            const mustChecker = [];
            const validationChecker = [];
            let lineFilledIn = false;
            for (let j = 0; j < subtableColumns; ++j) {
                const widget = line.children[j];
                const fieldDataWrapper = widget.children[i];
                if (widget.getAttribute('must') && widget.style.visibility !== 'hidden' && widget.style.display !== 'none') mustChecker.push(fieldDataWrapper);
                if (widget.getAttribute('va')) validationChecker.push(fieldDataWrapper);
                const fieldData = fieldDataWrapper.querySelector('.fieldData');
                // reset element's name attribute to fit in with Ragic's subTable rule
                // issue[11399]: 調整子表格送出後的順序判斷
                fieldData.name = fieldData.name.split('_')[0] + '_-' + (subtableRows - i);
                if (fieldData.value && !fieldData.classList.contains('agField')) lineFilledIn = true;
            }
            // attribute "must" check
            if (lineFilledIn && mustChecker.length) {
                for (let j = 0; j < mustChecker.length; j++) {
                    const selfFilledIn = Array.from(mustChecker[j].querySelectorAll('.fieldData')).every(function (fieldData) {
                        return fieldData.value !== '';
                    });
                    if (!selfFilledIn) {
                        const failedInput = Array.from(mustChecker[j].querySelectorAll('.fieldData')).find(function (fieldData) {
                            return fieldData.value === '';
                        });
                        failInfo = {
                            reason: attrMustWarning,
                            field: mustChecker[j].closest('[domainId]'),
                            failedSubComponent: failedInput
                        };
                        handleFail();
                        return;
                    }
                }
            }
            // validation check
            if (lineFilledIn && validationChecker.length) {
                for (let j = 0; j < validationChecker.length; j++) {
                    const ancestor = validationChecker[j].closest('[va]');
                    const regex = new RegExp(ancestor.getAttribute('va'));
                    const pass = this.getValidInputs(validationChecker[j]).every(function (fieldData) {
                        return regex.test(fieldData.value);
                    });
                    if (!pass) {
                        const failedFieldData = this.getValidInputs(validationChecker[j]).find(function (fieldData) {
                            return !regex.test(fieldData.value);
                        });
                        if (ancestor.hasAttribute('va_cust_msg')) {
                            const vaCustomMessage = unformatNUIAttr(ancestor.getAttribute('va_cust_msg'));
                            // issue[13869]: 如果有使用使用說明，會多抓到一個"？"，所以使用 firstChild 抓第一個文字 node
                            const fieldName = ancestor.querySelector('.webFormfieldValue p') && ancestor.querySelector('.webFormfieldValue p').firstChild.textContent;
                            const fieldValue = failedFieldData.value;
                            const fieldId = ancestor.getAttribute('domainid');
                            const fieldFormat = ancestor.getAttribute('va');
                            failInfo = {
                                reason: getCustomValidateErrorMessage(vaCustomMessage, fieldName, fieldValue, fieldFormat, fieldId, true),
                                field: ancestor,
                                failedSubComponent: failedFieldData,
                            };
                        } else {
                            failInfo = {
                                reason: wrongFormatWarning,
                                field: ancestor,
                                failedSubComponent: failedFieldData
                            };
                        }
                        handleFail();
                        return;
                    }
                }
            }
        }
    }
    // normal fields validation check
    const normalFieldCheck = webForm.widgets.filter(function (widget) {
        return !widget.hasAttribute('subgroup') && !widget.hasAttribute('ag');
    }).every(function (widget) {
        // issue[11392]
        // form rule
        if (widget.style.visibility === 'hidden' || widget.style.display === 'none') return true;
        const domainId = widget.getAttribute('domainId');
        const field = findFieldJSON(domainId);
        if (!field) {
            console.error(domainId + ' not found!');
            return false;
        }
        const fieldData = document.querySelector('.fieldData[name="' + domainId + '"]');
        const fieldValue = fieldData.value;

        if (field.attributes['must'] && !fieldValue) {
            failInfo = {
                reason: attrMustWarning,
                field: widget
            };
            return false;
        }
        if (field.attributes['va']) {
            const va = field.attributes['va'];
            const ifCheckNotNull = va === '[^ ]';
            let regex = new RegExp(va);
            if (!regex.test(fieldValue) && (fieldValue !== '' || ifCheckNotNull)) {
                if (field.attributes['va_cust_msg']) {
                    const vaCustomMessage = unformatNUIAttr(field.attributes['va_cust_msg']);
                    // issue[13869]: 如果有使用使用說明，會多抓到一個"？"，所以使用 firstChild 抓第一個文字 node
                    const fieldName = widget.querySelector('.webFormfieldValue p') && widget.querySelector('.webFormfieldValue p').firstChild.textContent;
                    failInfo = {
                        reason: getCustomValidateErrorMessage(vaCustomMessage, fieldName, fieldValue, va, domainId, true),
                        field: widget
                    };
                } else {
                    failInfo = {
                        reason: wrongFormatWarning,
                        field: widget
                    };
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

    this.widgets.forEach(function (widget) {
        // prevent sending empty subtable data
        if (widget.hasAttribute('subgroup') && !widget.hasAttribute('ag') && !widget.hasAttribute('ro')) {
            Array.from(widget.querySelectorAll('[name]')).filter(function (fieldData) {
                return !fieldData.value;
            }).forEach(function (fieldData) {
                fieldData.disabled = true;
            });
        }
        // turn off disabled attribute to ensure readOnly data will be sent
        if (widget.hasAttribute('ro') && !widget.hasAttribute('ag')) {
            Array.from(widget.querySelectorAll('[name][disabled]')).filter(function (fieldData) {
                return fieldData.value.length > 0;
            }).forEach(function (fieldData) {
                fieldData.disabled = false;
            });
        }
        // unformat process
        if (!widget.hasAttribute('fmt_n') && !widget.hasAttribute('fmt_d')) return;
        Array.from(widget.querySelectorAll('[name]')).filter(function (fieldData) {
            return fieldData.value.length > 0;
        }).forEach(function (fieldData) {
            if (widget.hasAttribute('fmt_d')) {
                const smartParsed = ragic_date_parse(fieldData.value, widget.getAttribute('fmt_d'), widget.getAttribute('f'));
                if (smartParsed) {
                    fieldData.value = formatDate(smartParsed, getStandardFormat(widget.getAttribute('fmt_d')));
                } else {
                    fieldData.value = '';
                }
            } else fieldData.value = webForm.unformatValue(fieldData.value, widget);
        });
    });
    webForm.updateFormParams();

    // 中斷 submit 來 debug，配合 <form onsubmit="return false;">
    //cancelEventBubble(e);
};
webForm.reset = function (event) {
    cancelEventBubble(event);
    window.removeEventListener('pagehide', setDraft);
    location.reload();
};
webForm.updateFormParams = function () {
    if (window.opener && window.opener.webForm && window.opener.webForm.callbackFn) {
        this._form.action += '&callback=opener.webForm.callbackFn';
        if (location.search.includes('&saveClose')) this._form.action += '&saveClose';
    }
};

// 子表格按鈕
webForm.openPageMode = function (btn) {
    const container = webForm._form;
    const subtable = btn.closest('.subTable');
    const x = parseInt(subtable.dataset.x);
    const y = parseInt(subtable.dataset.y) - 1;
    const subtableTitle = document.querySelector('.line[data-x="'+ x +'"][data-y="'+ y +'"]');
    const widget = btn.closest('.webFormWidget');
    let index = Array.from(widget.children).indexOf(btn.closest('.fieldDataWrapper'));
    if (index === -1) console.error('Index error');
    const btnWrapper = document.createElement('div');
    btnWrapper.classList.add('flex-center');

    const back = document.createElement('div');
    back.textContent = lm['goBack'];
    back.classList.add('backDiv');
    back.onclick = function backView() {
        subtable.style.maxWidth = '';
        Array.from(document.querySelectorAll('.pageMode')).forEach(function (element) {
            element.classList.remove('pageMode');
        });
        subtable.removeChild(btnWrapper);
    };

    const addNew = document.createElement('div');
    addNew.textContent = lm['addNextRecord'];
    addNew.classList.add('backDiv');
    addNew.onclick = function createNew() {
        Array.from(document.querySelectorAll('.pageMode')).forEach(function (element) {
            element.classList.remove('pageMode');
        });
        triggerEvent(subtable.querySelectorAll('.subController-add')[index - 1], 'click');
        container.classList.add('pageMode');
        if (subtableTitle) subtableTitle.classList.add('pageMode');
        subtable.classList.add('pageMode');
        index += 1;
        Array.from(subtable.querySelectorAll('.webFormWidget')).forEach(function (_widget) {
            _widget.children[index].classList.add('pageMode');
        });
    };

    Array.from(subtable.querySelectorAll('.webFormWidget')).forEach(function (_widget) {
        _widget.children[index].classList.add('pageMode');
    });

    container.classList.add('pageMode');
    if (subtableTitle) subtableTitle.classList.add('pageMode');
    subtable.classList.add('pageMode');
    subtable.style.maxWidth = container.clientWidth + 'px';
    btnWrapper.appendChild(back);
    btnWrapper.appendChild(addNew);
    subtable.appendChild(btnWrapper);
};
webForm.addSubRow = function (btn) {
    const firstWidget = btn.closest('.webFormWidget');
    const subGroup = firstWidget.getAttribute('subgroup');
    const subtableWidgets = webForm.subTableClassifier[subGroup];
    const index = Array.from(firstWidget.querySelectorAll('.subController-add')).findIndex(function (_btn) {
        return _btn === btn;
    }) + 1;
    const newFieldDatas = [];
    subtableWidgets.forEach(function (subtableWidget) {
        const copiedFieldDataWrapper = subtableWidget.children[index].cloneNode(true);
        const fieldData = copiedFieldDataWrapper.querySelector('.fieldData');
        newFieldDatas.push(fieldData);

        if (subtableWidget.children[index + 1]) {
            subtableWidget.insertBefore(copiedFieldDataWrapper, subtableWidget.children[index + 1]);
        } else {
            subtableWidget.appendChild(copiedFieldDataWrapper);
        }

        if (copiedFieldDataWrapper.classList.contains('webFormSelection')) {
            if (subtableWidget.hasAttribute('ln') && copiedFieldDataWrapper.querySelectorAll('SELECT').length) {
                copiedFieldDataWrapper.querySelector('SELECT').options.length = 1;
            }
            copiedFieldDataWrapper.querySelector('.singleSelectionContainer,.multiSelectionContainer').textContent = '';
            const select = copiedFieldDataWrapper.querySelector('select');
            if (select && select.options && !select.disabled) createBarSelect(select);
        } else {
            const input = copiedFieldDataWrapper.querySelector('input');
            input.value = '';
            if (input.classList.contains('fileField')) {
                const uploadField = copiedFieldDataWrapper.querySelector('.uploadField');
                copiedFieldDataWrapper.removeChild(uploadField);
                UploadFieldAgent.createUploadField(input, copiedFieldDataWrapper);
            }
        }

        if (subtableWidget.hasAttribute('dv') && subtableWidget.getAttribute('dv') !== '$SEQ') {
            webForm.defaultValueProcess(fieldData);
        }

        if (subtableWidget.hasAttribute('ag')) {
            copiedFieldDataWrapper.lastElementChild.value = lm['autoGenerate'];
        }

        if (subtableWidget.hasAttribute('ro')) {
            copiedFieldDataWrapper.classList.add('readonly');
        }

        if (subtableWidget.hasAttribute('f')) {
            const ft = webForm.globalFormulaTracker.find(function (_f) {
                return _f.self === subtableWidget;
            });
            if (ft) {
                const formulaResult = getFormulaResult(ft.formula, index + 1, ft.self);
                ft.update(index, formulaResult);
            }
        }

        if (subtableWidget.getAttribute('dv') === '$SEQ') webForm.seqReSetter(subtableWidget, index);
    });
    newFieldDatas.forEach(function (fieldData) {
        triggerEvent(fieldData, 'change');
    });
    RagicInteractiveRules.execute(true);
};
webForm.deleteSubRow = function (btn) {
    const widget = btn.closest('.webFormWidget');
    const subGroup = widget.getAttribute('subgroup');
    const subtableWidgets = webForm.subTableClassifier[subGroup];
    const index = Array.from(subtableWidgets[0].children).findIndex(function (fieldDataWrapper) {
        return fieldDataWrapper === btn.parentElement.parentElement;
    });
    // 子表格只有一列時淨空所有欄位值，多列時才刪除選擇列。
    if (subtableWidgets[0].querySelectorAll('.fieldData').length < 2) {
        subtableWidgets.forEach(function (subtablWidget) {
            const fieldData = subtablWidget.querySelector('.fieldData');
            fieldData.value = '';
        });
    } else {
        for (let i = 0; i < subtableWidgets.length; i++) {
            const fieldDataWrapper = subtableWidgets[i].children[index];
            subtableWidgets[i].removeChild(fieldDataWrapper);
        }
    }
    subtableWidgets.forEach(function (subtablWidget) {
        const fieldData = subtablWidget.querySelector('.fieldData');
        triggerEvent(fieldData, 'change');
    });
};

// dynamic filter options for mvpf
webForm.setDynamicFilterOptions = function (widget, response) {
    const domainId = widget.getAttribute('domainid');
    const select = widget.querySelector('select[name="' + domainId + '"]');
    JSON.parse(response).forEach(function (obj) {
        const option = new Option(obj['value'], obj['value']);
        option.setAttribute('nodeid', obj['nodeid']);
        select.appendChild(option);
    });
    webForm.dynamicFilterOptions[domainId] = Array.from(select.options);
    const barSelectDivs = widget.querySelectorAll('.barSelect');
    Array.from(barSelectDivs).forEach(function (barSelectDiv) {
        barSelectDiv.classList.remove('load');
    });
    triggerEvent(select, 'change');
};
// open mvp page
webForm.multipleValuePicker = function (widget) {
    widget.setAttribute('mvpMode', 'mvpMode');
    widget.addEventListener('click', function (event) {
        const target = event.target;
        if (!target.classList.contains('singleSelectionContainer')) return;
        const fieldDataWrapper = target.closest('.fieldDataWrapper');
        const barSelectDiv = fieldDataWrapper.querySelector('.barSelect');
        if (barSelectDiv.classList.contains('load')) return;
        const webFormMVPWin = document.getElementById('webFormMVPWin');
        webFormMVPWin.style.display = 'block';
        const index = Array.from(widget.querySelectorAll('.fieldDataWrapper')).indexOf(fieldDataWrapper);
        const mvp = widget.getAttribute('mvp');
        const stf = widget.getAttribute('stf');
        if (!stf) {
            console.error('No select title field');
            return;
        }
        mvpTarget = fieldDataWrapper.querySelector('select');
        const mvpfValueSet = (widget.getAttribute('mvpf') || '').split('&');
        const filterValue = createMVPFilterValue(mvpfValueSet, index);
        const mvpSplit = mvp.split('|');
        const url = '/sims/webview/getMVP.jsp';
        const params = {'ap': ap, 'p': mvpSplit[0], 'si': mvpSplit[1].split('_')[0], 'fv3': filterValue, 'stf': widget.getAttribute('stf')};
        getPromise(url, params).then(function (response) {
            webFormMVPWin.querySelector('.floatingWinContent').innerHTML = response;
        });
    });
};
// click row on mvp page
webForm.mvpClick = function (nodeId) {
    document.getElementById('webFormMVPWin').style.display = 'none';
    if (!mvpTarget || mvpTarget.tagName !== 'SELECT') return;
    const selectedOption = Array.from(mvpTarget.querySelectorAll('option')).find(function (option) {
        return option.getAttribute('nodeid') === nodeId;
    });
    if (selectedOption) {
        selectedOption.selected = true;
        triggerEvent(mvpTarget, 'change');
    }
    mvpTarget = null;
};

webForm.getValidInputs = function (fieldDataWrapper) {
    return Array.from(fieldDataWrapper.querySelectorAll('INPUT, TEXTAREA, SELECT'));
};

/**
 * 驗證信箱
 * @param {HTMLInputElement} fieldData
 */
webForm.validateEmail = function (fieldData) {
    const email = fieldData.value;
    const domainId = fieldData.name;
    const cacheObj = webForm.submitStopper.find(function (_cacheObj) {
        return _cacheObj.id === domainId;
    });
    getPromise('/sims/emailValidator.jsp', {'email': email}).then(function (text) {
        if (text && email && email.length > 0) {
            const rejectReason = 'Not a valid e-mail address : ' + email;
            const submitBtn = document.querySelector('input[data-submitted]');
            if (!cacheObj) {
                webForm.submitStopper.push({
                    id: domainId,
                    reason: rejectReason
                });
            } else {
                cacheObj.reason = rejectReason;
            }
            webForm.showMsg('Not a valid e-mail address : ' + email);
            if (submitBtn) submitBtn.dataset.submitted = '';
        } else {
            if (cacheObj) {
                const i = webForm.submitStopper.indexOf(cacheObj);
                webForm.submitStopper.splice(i, 1);
            }
        }
    });
};

/**
 * 設定序列值
 * 目前以 nui 行為為主
 * 但 webform 新增子表格列可以從中間插入所以行為有些許差異
 * @param {HTMLElement} widget
 * @param {Number} beginIndex
 */
webForm.seqReSetter = function (widget, beginIndex) {
    const fieldDataArray = Array.from(widget.querySelectorAll('.fieldData'));
    if (beginIndex > 0 && beginIndex < fieldDataArray.length) {
        const lastValue = parseInt(fieldDataArray[beginIndex - 1].value);
        fieldDataArray[beginIndex].value = isNaN(lastValue) ? beginIndex + 1 : lastValue + 1;
    } else fieldDataArray[beginIndex].value = 1;
};

/**
 * 將值依特定格式轉換
 * @param {HTMLInputElement} fieldData
 * @param {string | number} domainId
 */
webForm.formatValue = function (fieldData, domainId) {
    if (!fieldData.value.length) return;
    const field = findFieldJSON(domainId);
    if (!field) {
        console.error(domainId + ' not found!');
        return;
    }
    const widget = fieldData.closest('.webFormWidget');
    const originalValue = fieldData.value;
    let rawValue = webForm.unformatValue(originalValue, widget);
    let formatValue = originalValue;
    if (field.attributes['phonefmt']) {
        formatValue = ragic_phone_reformat(originalValue, field.attributes['phonefmt']);
    } else if (field.attributes['fmt_d']) {
        formatValue = ragic_date_format(originalValue, field.attributes['fmt_d']);
    } else if (field.attributes['fmt_n']) {
        const isPercentage = field.attributes['fmt_n'].includes('%');
        if (isPercentage && !originalValue.includes('%')) rawValue = parseFloat(rawValue) * 0.01;
        const floatValue = parseFloat(rawValue);
        formatValue = isNaN(floatValue) ? '' : ragic_number_format(rawValue, field.attributes['fmt_n']);
    }
    if (originalValue !== formatValue) fieldData.value = formatValue;
};

/**
 * 還原格式化的值
 * @param {string} value
 * @param {HTMLElement} widget
 * @return {string}
 */
webForm.unformatValue = function (value, widget) {
    const domainId = widget.getAttribute('domainid');
    const field = findFieldJSON(domainId);
    if (!field) {
        console.error(domainId + ' not found!');
        return value;
    }
    if (field.attributes['phonefmt']) {
        return ragic_phone_unformat(value, field.attributes['phonefmt']);
    } else if (field.attributes['fmt_d']) {
        const smartParsed = ragic_date_parse(value, widget.getAttribute('fmt_d'), widget.getAttribute('f'));
        if (smartParsed) {
            return formatDate(smartParsed, getStandardFormat(widget.getAttribute('fmt_d')));
        }
        return '';
    } else if (field.attributes['fmt_n']) {
        const parsedValue = parseFloat(value.replace(/[^0-9.-]+/g, ''));
        if (value.includes('%')) return '' + Math.round(parsedValue / 100 * 1000000) / 1000000;
        return '' + parsedValue;
    }
    return value;
};

/**
 * 顯示訊息視窗
 * @param {Element | string} message
 * @param {HTMLElement} [field]
 */
webForm.showMsg = function (message, field) {
    const webFormWin = document.querySelector('#webFormWin');
    const winHeader = webFormWin.querySelector('#floatingWinHeader');
    const winContent = webFormWin.querySelector('#floatingWinContent');
    webFormWin.style.display = 'block';
    rm(winHeader);
    rm(winContent);
    if (field) window.scrollBy(0, field.getBoundingClientRect().top);
    const centerX = (window.innerWidth - webFormWin.getBoundingClientRect().width) / 2;
    const centerY = (window.innerHeight - webFormWin.getBoundingClientRect().height) / 2;
    webFormWin.style.top = centerY + 'px';
    webFormWin.style.left = centerX + 'px';
    if (field) {
        // issue[13869]: 如果有使用使用說明，會多抓到一個"？"，所以使用 firstChild 抓第一個文字 node
        const title = field.querySelector('.fieldHeaderWrapper p').firstChild.textContent;
        winHeader.appendChild(document.createTextNode(title));
    } else {
        winHeader.appendChild(document.createTextNode('\u00A0'));
    }
    if (message instanceof Element) winContent.appendChild(message);
    else winContent.innerHTML = message;
};

/**
 * 顯示欄位說明視窗
 * @param {HTMLElement} target
 * @param {string} text
 */
webForm.showWebTooltip = function (target, text) {
    if (!target) return;
    const tooltips = document.getElementById('webFormTooltips');
    const tooltipsText = document.getElementById('webFormTooltipsText');
    const boundingRect = target.getBoundingClientRect();
    tooltips.style.top = boundingRect.top + document.body.scrollTop + document.documentElement.scrollTop + 'px';
    tooltips.style.left = boundingRect.right + 'px';
    tooltipsText.textContent = text;
};

webForm.setReadOnly = function (fieldDataWrapper, flag) {
    fieldDataWrapper.classList.toggle('readonly', flag);
    const fieldData = fieldDataWrapper.querySelector('.fieldData');
    const tabIndex = flag ? -1 : 0;
    webForm.setTabIndex(fieldData, tabIndex);
}

webForm.setTabIndex = function (fieldData, tabIndex) {
    if (!fieldData) return;
    fieldData.tabIndex = tabIndex;
    const fieldDataWrapper = fieldData.closest('.fieldDataWrapper');
    if (fieldData.classList.contains('fileField')) {
        Array.from(fieldDataWrapper.querySelectorAll('.fileAgent')).forEach(function (fileAgent) {
            fileAgent.tabIndex = tabIndex;
        });
    } else if (fieldData.classList.contains('radioFieldSet') || fieldData.classList.contains('checkboxFieldSet')) {
        Array.from(fieldData.querySelectorAll('input')).forEach(function (input) {
            input.tabIndex = tabIndex;
        });
    }
};

webForm.widgetObj = function (widget) {
    this.self = widget;
    this.FMODE = formulaMode.STRING;
    this.MIN = NaN;
    this.MAX = NaN;
    this.FIRST = '';
    this.LAST = '';
    this.RAW = '';
    this.COUNT = '';
    this.SUM = '';
};
webForm.widgetObj.prototype.toString = function () {
    if (!Array.isArray(this.SUM)) return this.SUM;
    if (this.FMODE === formulaMode.STRING && this.SUM.length <= 1) return this.RAW;

    let baseValue = '';
    let calculateArr = this.SUM;
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

/*
* Subject & Observer
*/

// cascade
webForm.CascadeSubject = function (self) {
    Subject.call(this, self);
    const subject = this;
    const widget = self;
    widget.addEventListener('change', function (event) {
        const fieldData = event.target;
        if (widget.hasAttribute('subgroup')) {
            const index = Array.from(widget.querySelectorAll('.fieldData')).findIndex(function (_fieldData) {
                return fieldData === _fieldData;
            });
            subject.notifyObserver(index, fieldData.value);
        } else subject.notifyObserver(0, fieldData.value);
    });
};
webForm.CascadeSubject.prototype = Object.create(Subject.prototype);
webForm.CascadeSubject.prototype.notifyObserver = function (index, data) {
    this.observers.forEach(function (observer) {
        observer.update(index, data);
    });
};

webForm.CascadeObserver = function (self) {
    Observer.call(this, self);
};
webForm.CascadeObserver.prototype = Object.create(Observer.prototype);
webForm.CascadeObserver.prototype.update = function (index, data) {
    const widget = this.self;
    const domainId = widget.getAttribute('domainid');
    const cascadedItem = webForm.cascadedRelation[domainId];
    const options = cascadedItem.options;
    const fieldData = widget.querySelectorAll('SELECT')[index];
    fieldData.options.length = 1;
    if (!!data) {
        for (let i = 0; i < options.length; i++) {
            let rawOption = options[i];
            const cascadedData = rawOption.value.substring(0, rawOption.value.indexOf('|'));
            const optionData = rawOption.value.substring(rawOption.value.indexOf('|') + 1);
            if (cascadedData === data) {
                const option = new Option(optionData, optionData);
                option.setAttribute('nodeId', option.getAttribute('nodeId'));
                fieldData.add(option);
                fieldData.selectedIndex = -1;
            }
        }
    }
    triggerEvent(fieldData, 'change');
};

// link&load
webForm.ListenSubject = function (self) {
    Subject.call(this, self);
    const subject = this;
    const widget = self;
    widget.addEventListener('change', function (event) {
        const fieldData = event.target;
        let nodeId = null;
        if (fieldData.tagName === 'SELECT') {
            if (fieldData.options.length && fieldData.selectedIndex > 0) {
                nodeId = fieldData.options[fieldData.selectedIndex].getAttribute('nodeId');
            }
        } else if (fieldData.tagName === 'INPUT') {
            if (fieldData.type === 'text' || fieldData.type === 'hidden' || fieldData.checked) {
                nodeId = fieldData.getAttribute('nodeId');
            }
        } else {
            console.error(fieldData, 'is not select!');
        }

        if (!isNumeric(nodeId)) return;
        const params = {
            'a': ap,
            'p': path,
            'fn': sheet,
            'd': widget.getAttribute('domainId'),
            'n': nodeId,
            'webview': ''
        };
        const widgetX = parseInt(widget.getAttribute('x'));
        const widgetY = parseInt(widget.getAttribute('y'));
        if (widget.hasAttribute('subgroup')) {
            const index = Array.from(widget.querySelectorAll('.fieldData')).findIndex(function (_fieldData) {
                return fieldData === _fieldData;
            });
            params['x'] = widgetX;
            params['y'] = widgetY + index;
            getPromise('/sims/form_subform.jsp', params).then(function (response) {
                subject.notifyObserver(index, response);
            });
        } else {
            params['x'] = widgetX + 1;
            params['y'] = widgetY;
            getPromise('/sims/form_subform.jsp', params).then(function (response) {
                subject.notifyObserver(0, response);
            });
        }
    });
};
webForm.ListenSubject.prototype = Object.create(Subject.prototype);
webForm.ListenSubject.prototype.notifyObserver = function (index, data) {
    const dataMap = {};
    const dataLines = data.trim().split('\n');
    dataLines.forEach(function (dataLine) {
        const secs = dataLine.split(',');
        dataMap[secs[3]] = dataLine;
    });
    this.observers.forEach(function (observer) {
        const domainId = observer.self.getAttribute('domainid');
        const dataLine = dataMap[domainId];
        observer.update(index, dataLine);
    });
};

webForm.ListenObserver = function (self) {
    Observer.call(this, self);
};
webForm.ListenObserver.prototype = Object.create(Observer.prototype);
webForm.ListenObserver.prototype.update = function (index, data) {
    const widget = this.self;
    if (!!data) {
        const secs = data.split(',');
        const fieldDataWrapper = widget.querySelectorAll('.fieldDataWrapper')[index];
        const fieldData = fieldDataWrapper.querySelector('.fieldData');
        const nodeId = secs[4];
        const value = HTMLEscapeRecover(secs[8]);
        setFieldValue(fieldData, value, nodeId);
        if (widget.hasAttribute('sig') && (fieldData.value.startsWith('data:image/png') || fieldData.value === '')) {
            const sigContent = widget.querySelector('.sigContent');
            const image = new Image();
            image.src = fieldData.value;
            sigContent.textContent = '';
            sigContent.appendChild(image);
        }
    }
};

// formula
webForm.FormulaSubject = function (self) {
    Subject.call(this, self);
    const subject = this;
    const widget = self;
    const isSubgroup = widget.hasAttribute('subgroup');
    const listenerFunction = function (event) {
        const fieldData = event.target;
        if (!fieldData.classList.contains('fieldData') && !fieldData.name) return;
        if (isSubgroup) {
            const index = Array.from(widget.querySelectorAll('.fieldData')).findIndex(function (_fieldData) {
                return fieldData === _fieldData;
            });
            subject.notifyObserver(index);
        } else subject.notifyObserver(-1);
    };
    widget.addEventListener('paste', listenerFunction, false);
    widget.addEventListener('change', listenerFunction, false);
    widget.addEventListener('input', listenerFunction, false);
};
webForm.FormulaSubject.prototype = Object.create(Subject.prototype);
webForm.FormulaSubject.prototype.notifyObserver = function (index) {
    const subjectWidget = this.self;
    this.observers.forEach(function (observer) {
        let formulaIndex;
        const observerWidget = observer.self;
        const isSubgroup = observerWidget.hasAttribute('subgroup');
        if (index === -1) {
            if (observerWidget.classList.contains('webformFreeValue')) {
                const formulaResult = getFormulaResult(observer.formula, 0, observerWidget);
                if (formulaResult === NO_CHANGE_SIGNAL) return;
                observer.update(0, formulaResult);
            } else {
                const fieldDatas = observerWidget.querySelectorAll('.fieldDataWrapper .fieldData');
                const length = fieldDatas.length;
                for (let i = 0; i < length; ++i) {
                    const formulaResult = getFormulaResult(observer.formula, i, observerWidget);
                    if (formulaResult === NO_CHANGE_SIGNAL) return;
                    observer.update(i, formulaResult);
                }
            }
        }
        else {
            if (isSubgroup) {
                formulaIndex = index + 1; // 因為要算入標題位置所以+1: _get_formula_variables_webview
            } else {
                index = 0;
                formulaIndex = 0;
            }
            if (subjectWidget.querySelectorAll('.fieldDataWrapper').length <= index) return;
            const formulaResult = getFormulaResult(observer.formula, formulaIndex, observerWidget);
            if (formulaResult === NO_CHANGE_SIGNAL) return;
            observer.update(index, formulaResult);
        }
    });
};

webForm.FormulaObserver = function (self) {
    Observer.call(this, self);
    this.formula = this.self.getAttribute('f') || this.self.getAttribute('dv_f');
};
webForm.FormulaObserver.prototype = Object.create(Observer.prototype);
webForm.FormulaObserver.prototype.update = function (index, data) {
    const widget = this.self;
    const fieldData = widget.querySelectorAll('.fieldData')[index];
    fieldData.value = data;
    triggerEvent(fieldData, 'change');
};

webForm.FormulaDescriptionObserver = function (self, formula) {
    Observer.call(this, self);
    this.formula = formula;
    this.rawContent = self.querySelector('p.freeValue').innerHTML;
};
webForm.FormulaDescriptionObserver.prototype = Object.create(Observer.prototype);
webForm.FormulaDescriptionObserver.prototype.update = function () {
    delete ctrl.formulaResultCache[this.formula]; // the cache is for Ragic browse mode, we don't need it in web form page.
    const freeValueWrapper = this.self;
    const result = this.rawContent.replace(/\[formula][\s]*(.+)\[\/formula]/gim, formulaReplaceHelper);
    freeValueWrapper.querySelector('p.freeValue').innerHTML = displayValueProcess(result);
    bbcodeToHtml(freeValueWrapper);
};

// dynamic filter
webForm.DynamicFilterSubject = function (self) {
    Subject.call(this, self);
    const subject = this;
    const widget = self;
    const isSubgroup = widget.hasAttribute('subgroup');
    widget.addEventListener('change', function (e) {
        if (isSubgroup) {
            const fieldData = e.target;
            const index = Array.from(widget.querySelectorAll('.fieldData')).findIndex(function (_fieldData) {
                return fieldData === _fieldData;
            });
            subject.notifyObserver(index);
        } else subject.notifyObserver(-1);
    });
};
webForm.DynamicFilterSubject.prototype = Object.create(Subject.prototype);
webForm.DynamicFilterSubject.prototype.notifyObserver = function (index) {
    this.observers.forEach(function (observer) {
        if (index === -1) {
            const observerWidget = observer.self;
            const fieldDatas = observerWidget.querySelectorAll('.fieldDataWrapper .fieldData');
            const length = fieldDatas.length;
            for (let i = 0; i < length; ++i) {
                observer.update(i);
            }
        }
        else observer.update(index);
    });
}

webForm.DynamicFilterObserver = function (self) {
    Observer.call(this, self);
};
webForm.DynamicFilterObserver.prototype = Object.create(Observer.prototype);
webForm.DynamicFilterObserver.prototype.update = function (index) {
    const widget = this.self;
    const domainId = widget.getAttribute('domainid');
    const fieldDataWrapper = widget.querySelectorAll('.fieldDataWrapper')[index];
    const select = fieldDataWrapper.querySelector('SELECT');
    if (!select) {
        console.error('No select.');
        return;
    }
    const options = select.options;
    if (!webForm.dynamicFilterOptions.hasOwnProperty(domainId)) return;
    const originalOptions = webForm.dynamicFilterOptions[domainId];
    const mvp = widget.getAttribute('mvp');
    const stf = widget.getAttribute('stf');
    if (!stf) {
        console.error('No select title field');
        return;
    }

    const barSelectDiv = fieldDataWrapper.querySelector('.barSelect');
    barSelectDiv.classList.add('load');
    const mvpfValueSet = widget.getAttribute('mvpf').split('&');
    const filterValue = createMVPFilterValue(mvpfValueSet, index);
    const mvpSplit = mvp.split('|');
    const url = '/' + ap + mvpSplit[0] + '/' + mvpSplit[1].split('_')[0];
    const params = {'api': '', 'naming': 'eid', 'where': filterValue};
    getPromise(url, params).then(JSON.parse).then(function (response) {
        const selectedValue = select.value;
        options.length = 1;
        const results = Object.values(response).map(function (obj) {
            return obj;
        }).sort(function (a, b) {
            return parseInt(a['_seq']) - parseInt(b['_seq']);
        }).map(function (obj) {
            return obj[stf];
        });
        results.forEach(function (value) {
            const option = originalOptions.find(function (_option) {
                return _option.value === value;
            });
            if (option) select.appendChild(option.cloneNode(true));
        });
        // 恢復值，避免選項更動時出問題
        select.value = selectedValue;
        const barSelectId = fieldDataWrapper.querySelector('.barSelect').id;
        const barSelect = BarSelectAgent.getSelector(barSelectId);
        barSelect.updateOptionsBySelect(select);
        barSelectDiv.classList.remove('load');
    });
};