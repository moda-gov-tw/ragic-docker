const queryItemValueCache = {};
const cascadedRelation = {};

function createQueryItemsBarSelect() {
    Array.from(document.querySelectorAll('select[name="v6QueryItem"]')).forEach(function (select) {
        const barSelect = BarSelectAgent.modifiedSelector(select.id + '_barSelect', select, select.parentElement, {});
        barSelect.setAfterSelectOption(function (selectedOption) {
            const targetOption = Array.from(select.options).find(function (option) {
                return option.textContent === selectedOption.text;
            });
            if (targetOption) targetOption.selected = selectedOption.selected;
            triggerEvent(select, 'change');
        });
    });
}

function cascadeProcess() {
    const subjectMap = {};
    Array.from(document.querySelectorAll('.cascadeDataPack')).forEach(function (cascadedPack) {
        const domainId = cascadedPack.dataset.domain;
        const cascadedToDomainId = cascadedPack.dataset.parentdomain;
        const cascadeRelation = JSON.parse(cascadedPack.dataset.cascademap);
        const select = document.getElementById(domainId);
        cascadedRelation[domainId] = {'cascadedTo': cascadedToDomainId, 'relation': cascadeRelation, 'options': Array.from(select.options)};
        select.options.length = 0;
        const subjectQueryItem = document.getElementById(cascadedToDomainId);
        const observerQueryItem = document.getElementById(domainId);
        if (subjectQueryItem && observerQueryItem) {
            if (!subjectMap.hasOwnProperty(cascadedToDomainId)) {
                subjectMap[cascadedToDomainId] = new CascadeSubject(subjectQueryItem);
            }
            const observer = new CascadeObserver(observerQueryItem);
            const subject = subjectMap[cascadedToDomainId];
            subject.registerObservers(observer);
        }
        const values = Array.from(subjectQueryItem.options).filter(function (option) {
            return option.selected;
        }).reduce(function (value, option) {
            if (value) value += '|';
            return value + option.textContent;
        }, '');
        subjectMap[cascadedToDomainId].notifyObserver(values);
    });
}

function embedSearch(url, feat) {
    document.querySelector('.loadingIcon').classList.add('lds-ellipsis');
    const hideSlogan = location.href.includes('hideSlogan') ? '&hideSlogan' : '';
    const noSearchBar = location.href.includes('noSearchBar') ? '&noSearchBar' : '';
    const autocomplete = location.href.includes('autocomplete') ? '&autocomplete' : '';
    const fieldSummary = location.href.includes('fieldSummary') ? '&fieldSummary' : '';
    const applyDefaultView = location.href.includes('defaultView') ? '&defaultView' : '';
    const webaction = feat === 'query' ? 'view' : 'twoRow';
    location.href = url + '?webview&webaction=' + webaction + '&feat=' + feat + hideSlogan + autocomplete + fieldSummary + noSearchBar + applyDefaultView + createFilterString();
}

function createFilterString() {
    const v6QueryItems = document.querySelectorAll('[name="v6QueryItem"]:not(select)');
    let filterV2String = Array.from(v6QueryItems).reduce(function (result, queryItem) {
        const queryItemId = queryItem.id;
        let queryItemValue = queryItem.value;
        const useRegex = queryItemValue.toLowerCase().startsWith('regex:');
        const exactMatch = queryItem.className === 'v6QueryTextbox' && $('tExact' + queryItemId.replace("|8", "")).checked && !autocompleteMode;
        const specialSetter = queryItem.classList.contains('specialSetter');
        const isPercentNumber = queryItem.dataset.numbertype === 'percent';
        if (!queryItemValue && !exactMatch) return result;
        result += '&fv2=';
        if (exactMatch || exactSearchMode) result += queryItemId.replace("|8", "|1");
        else result += queryItemId;
        if (isPercentNumber && isNumeric(queryItemValue)) queryItemValue = (queryItemValue / 100);
        //for date and number field
        if (queryItem.classList.contains('v6QueryDatebox') || queryItem.classList.contains('v6QueryNumber')) {
            result += '|' + queryItemValue;
        } else if (queryItemValue || exactMatch) {
            if (!useRegex && !exactMatch && !specialSetter && !exactSearchMode) {
                queryItemValue = "\\Q" + queryItemValue + "\\E";
            } else if (useRegex) {
                //set as Java Patter.quote
                queryItemValue = queryItemValue.slice(6);
            } else if (queryItem.dataset.time) {
                queryItemValue = queryItem.dataset.time + '-' + queryItemValue;
            }
            result += '|' + encodeURIComponent(queryItemValue);
        }
        return result;
    }, '');
    const selectors = document.querySelectorAll('select[name="v6QueryItem"]:not(.hide)');
    filterV2String = Array.from(selectors).reduce(function (result, selector) {
        const selectedOptions = Array.from(selector.options).filter(function (option) {
            return option.selected;
        });
        selectedOptions.forEach(function (option) {
            result += '&fv2=' + option.value;
        });
        return result;
    }, filterV2String);
    if (filterV2String.length === 0) filterV2String = '&fv2';
    //form_update will receive params with character "," "|" encoding in web ascii code
    return filterV2String.replace(new RegExp("%2C", "g"), "%26%2344%3B").replace(new RegExp("%7C", "g"), "%26%23124%3B");
}

function removeFilterField() {
    const v6QueryItems = document.getElementsByName("v6QueryItem");
    const barSelectDoms = document.querySelectorAll('.barSelect');
    Array.from(v6QueryItems).forEach(function (queryItem) {
        queryItem.value = '';
        if (queryItem.classList.contains('specialSetter')) {
            const domainId = queryItem.closest('.v6QueryItemInput').id;
            const specialSetterType = queryItem.dataset.type;
            if (!specialSetterType) return;
            $(specialSetterType).setAttribute('belongTo', domainId);
            if (specialSetterType === 'dsdropdown') dateSetting('dsCancel');
            else userSetting('usCancel');
        }
    });
    Array.from(barSelectDoms).forEach(function (barSelectDom) {
        const barSelect = BarSelectAgent.getSelector(barSelectDom.id);
        let needRender = false;
        barSelect.options.filter(function (option) {
            return option.selected;
        }).forEach(function (option) {
            option.selected = false;
            needRender = true;
        });
        barSelect.updateDisplayValue();
    });
}

function queryItemInputAutoComplete() {
    if (!autocompleteMode) return;
    const queryItemInputArr = document.querySelectorAll('.v6QueryTextbox');
    const queryAutoCompleteList = document.querySelectorAll('.queryAutoCompleteList');
    queryItemInputArr.forEach(function (queryItemInput) {
        queryItemInput.onfocus = debouncedFn(500, createAutoComplete);
        queryItemInput.onkeyup = debouncedFn(500, createAutoComplete);
    });
    queryAutoCompleteList.forEach(function (div) {
        div.addEventListener('mousedown', function (e) {
            const target = e.target;
            div.parentNode.querySelector('.v6QueryTextbox').value = target.textContent;
        });
    });
    function createAutoComplete(e) {
        const target = e.target;
        const listDiv = target.nextSibling;
        const domainId = target.id.split('|')[0];
        const searchValue = encodeURIComponent(target.value);
        listDiv.textContent = '';
        if (!domainId || !searchValue) return;
        let promise;
        if (queryItemValueCache.hasOwnProperty(domainId + searchValue)) {
            promise = queryItemValueCache[domainId + searchValue];
        } else {
            promise = getPromise('/sims/webview/mod/getQueryItemValue.jsp', {
                'a': ap,
                'p': path,
                'si': sheetIndex,
                'dId': domainId,
                'val': searchValue
            }).then(function (res) {
                return JSON.parse(res)['result'];
            });
            queryItemValueCache[domainId + searchValue] = promise;
        }
        listDiv.innerHTML='<i class="fa fa-spinner fa-spin" style="margin:25px;"></i>';
        promise.then(function (dataArray) {
            listDiv.textContent = '';
            Array.from(dataArray).forEach(function (data) {
                const optionDiv = document.createElement('div');
                optionDiv.classList.add('queryAutoCompleteOption');
                optionDiv.textContent = data;
                listDiv.appendChild(optionDiv);
            });
        });
    }
}

function preFillValue() {
    const v6QueryItemInputs = Array.from(document.querySelectorAll('.v6QueryItemInput'));
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
        const targetField = v6QueryItemInputs.find(function (item) {
            return item.id.includes(obj.fieldId);
        });
        if (!targetField) {
            console.error('Not find: ' + obj.fieldId);
            return;
        }
        const values = obj.fieldValue.split('|');
        const select = targetField.querySelector('select');
        const input = targetField.querySelectorAll('input');
        if (select && select.length) {
            values.forEach(function(value) {
                const matchOption = Array.from(select.options).find(function (option) {
                    return option.textContent === value;
                });
                if (matchOption) matchOption.selected = true;
            });
        } else if (input && input.length) {
            values.forEach(function(value,index) {
                input[index].value = value;
            });
        }
    });
}

function viewSeqSet(seq) {
    const urlQuery = location.search;
    const params = urlQuery.substring(1).split('&');
    const index = params.findIndex(function (param) {
        return param.startsWith('viewSeq=');
    });
    if (index !== -1)  {
        params[index] = 'viewSeq=' + seq;
        location.href = location.href.replace(urlQuery, "?" + params.join('&'));
    } else location.href = location.href + "&viewSeq=" + seq;
}

function dateSetting(date) {
    const menuPanel = $(date).closest('[belongto]');
    if(!menuPanel) return;
    const v6QueryItemInput = $(menuPanel.getAttribute('belongto'));
    if (!v6QueryItemInput) return;
    let dateInputNum;
    if(date.startsWith('$NEXT-X') || date.startsWith('$PAST-X') || date.startsWith('$NEXTMIN-X')) {
        const parts = date.split('-');
        if(parts.length > 2) {
            date = parts.slice(0, parts.length -1).join('-');
            const dateNum = parseInt(parts[2]);
            dateInputNum = isNaN(dateNum) ? -1 : dateNum;
        }
        else date = parts.join('-');
    }
    const v6QueryItems = Array.from(v6QueryItemInput.querySelectorAll('[name="v6QueryItem"]:not(.specialSetter)'));
    const v6QueryItemWrapper = v6QueryItemInput.querySelector('.v6QueryItem-wrapper:not(.quickSettings)');
    const _quickSettingItemWrapper = v6QueryItemInput.querySelector('.v6QueryItem-wrapper.quickSettings');
    if (_quickSettingItemWrapper) v6QueryItemInput.removeChild(_quickSettingItemWrapper);
    if (date !== 'dsCancel') {
        v6QueryItems.forEach(function (element) {
            element.classList.toggle('hide', true);
        });
        v6QueryItemWrapper.style.display = 'none';
        const dateDiv = $(date);
        const xdateStr = dateDiv.dataset.xdate;
        const domainId = v6QueryItemInput.id.substr(7);
        const quickSettingItemWrapper = node('label');
        quickSettingItemWrapper.className = 'v6QueryItem-wrapper quickSettings';
        const dateFilterInput = node('input');
        dateFilterInput.dataset.type = 'dsdropdown';
        if(xdateStr) {
            const xdateStrParts = xdateStr.split('{0}');
            const strPart1 = node('span');
            const strPart2 = node('span');
            strPart1.className = 'dateFilter';
            strPart2.className = 'dateFilter';
            strPart1.textContent = xdateStrParts[0];
            strPart2.textContent = xdateStrParts[1];
            dateFilterInput.type = 'number';
            dateFilterInput.classList.add('xdateInput');
            dateFilterInput.dataset.time = date;
            if(dateInputNum !== undefined && dateInputNum > -1) {
                dateFilterInput.value = dateInputNum;
            }
            quickSettingItemWrapper.appendChild(strPart1);
            quickSettingItemWrapper.appendChild(dateFilterInput);
            quickSettingItemWrapper.appendChild(strPart2);
        } else {
            const dataSpan = node('span');
            dateFilterInput.style.display = 'none';
            dateFilterInput.value = date;
            dataSpan.classList.add('dateFilter');
            dataSpan.textContent = $(date).textContent;
            quickSettingItemWrapper.appendChild(dateFilterInput);
            quickSettingItemWrapper.appendChild(dataSpan);
        }
        dateFilterInput.id = domainId + '|9';
        dateFilterInput.classList.add('specialSetter');
        dateFilterInput.name = 'v6QueryItem';
        v6QueryItemInput.prepend(quickSettingItemWrapper);
        v6QueryItemInput.setAttribute('lock', '');
    } else {
        v6QueryItems.forEach(function (element) {
            element.classList.toggle('hide', false);
        });
        v6QueryItemWrapper.style.display = '';
        v6QueryItemInput.removeAttribute('lock');
    }
}

function userSetting(user) {
    const menuPanel = $(user).closest('[belongto]');
    const v6QueryItemInput = $(menuPanel.getAttribute('belongto'));
    if (!v6QueryItemInput) return;
    const v6QueryItems = Array.from(v6QueryItemInput.querySelectorAll('[name="v6QueryItem"]:not(.specialSetter)'));
    const v6QueryItemWrapper = v6QueryItemInput.querySelector('.v6QueryItem-wrapper:not(.quickSettings)');
    const _quickSettingItemWrapper = v6QueryItemInput.querySelector('.v6QueryItem-wrapper.quickSettings');
    if (_quickSettingItemWrapper) v6QueryItemInput.removeChild(_quickSettingItemWrapper);
    if (user !== 'usCancel') {
        v6QueryItems.forEach(function (element) {
            element.classList.toggle('hide', true);
        });
        v6QueryItemWrapper.style.display = 'none';
        const quickSettingItemWrapper = node('label');
        quickSettingItemWrapper.className = 'v6QueryItem-wrapper quickSettings';
        const userFilterInput = node('input');
        const userFilterSpan = node('span');
        const domainId = v6QueryItemInput.id.substr(7);
        userFilterInput.id = domainId + '|9';
        userFilterInput.className = 'specialSetter';
        userFilterInput.style.display = 'none';
        userFilterInput.name = "v6QueryItem";
        userFilterInput.value = user;
        userFilterInput.dataset.type = 'usdropdown';
        userFilterSpan.className = 'userFilter';
        userFilterSpan.textContent = $(user).textContent;
        quickSettingItemWrapper.appendChild(userFilterInput);
        quickSettingItemWrapper.appendChild(userFilterSpan);
        v6QueryItemInput.prepend(quickSettingItemWrapper);
        v6QueryItemInput.setAttribute('lock', '');
    } else {
        v6QueryItems.forEach(function (element) {
            element.classList.toggle('hide', false);
        });
        v6QueryItemWrapper.style.display = '';
        v6QueryItemInput.removeAttribute('lock');
    }
}

window.addEventListener('DOMContentLoaded', function loaded() {
    preFillValue();
    createQueryItemsBarSelect();
    cascadeProcess();
    queryItemInputAutoComplete();
    const backQuery = document.querySelector('.backQuery');
    if (backQuery) {
        backQuery.href = location.search.split('&').filter(function (str) {
            return str.indexOf('fv2=') !== -1;
        }).reduce(function (href, q) {
            return href + '&' + q;
        }, backQuery.href);
    }
    if (location.href.includes('search')) document.getElementById('embedSearch-btn').click();
    const loadingIcon = document.querySelector('.lds-ellipsis');
    if (!loadingIcon) return;
    const timeOutId = setTimeout(function () {
        loadingIcon.classList.remove('lds-ellipsis'); //when page loaded, remove loading animation.
        clearTimeout(timeOutId);
    }, 500);
});

function CascadeSubject(self) {
    Subject.call(this, self);
    const subject = this;
    const dom = self;
    dom.addEventListener('change', function (event) {
        const select = event.target;
        const values = Array.from(select.options).filter(function (option) {
            return option.selected;
        }).reduce(function (value, option) {
            if (value) value += '|';
            return value + option.textContent;
        }, '');
        subject.notifyObserver(values);
    });
}
CascadeSubject.prototype = Object.create(Subject.prototype);
CascadeSubject.prototype.notifyObserver = function (values) {
    this.observers.forEach(function (observer) {
        observer.update(values);
    });
};

function CascadeObserver(self) {
    Observer.call(this, self);
}
CascadeObserver.prototype = Object.create(Observer.prototype);
CascadeObserver.prototype.update = function (values) {
    const dom = this.self;
    const domainId = dom.id;
    const cascadedItem = cascadedRelation[domainId];
    const relation = cascadedItem.relation;
    const valueArray = values.split('|');
    const barSelect = BarSelectAgent.getSelector(dom.id + '_barSelect');
    dom.options.length = 0;
    cascadedItem.options.forEach(function (option) {
        const isShow = valueArray.some(function (value) {
            return relation[option.text].includes(value);
        });
        if (isShow) dom.appendChild(option);
    });
    barSelect.updateOptionsBySelect(dom);
};