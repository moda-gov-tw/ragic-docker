//todo: 整合至 database.js
const queryItemValueCache = {};

function moreFilter(more, queryString) {
    read(function (o) {
        const queryItemBarDiv = $("v6QueryItemBar");
        queryItemBarDiv.innerHTML = o.responseText;
        postSize();
        transSelectFunc();
    }, '/sims/webview/mod/queryItems.jsp' + '?' + (more ? 'more&' : '') + 'a=' + ap + '&p=' + encodeURIComponent(path) + '&n=' + encodeURIComponent(sheet) + (queryString ? queryString : ''));
}

function createFilterString() {
    const v6QueryItems = document.getElementsByName("v6QueryItem");
    let str = '';
    for (let i = 0, len = v6QueryItems.length; i < len; i++) {
        const e = v6QueryItems[i];
        const _eid = e.id;
        let _e_value = e.value;
        const useRegex = _e_value.toLowerCase().startsWith('regex:');
        const exactMatch = e.className === 'v6QueryTextbox' && $('tExact' + _eid.replace("|8", "")).checked && !autocompleteMode;
        const specialSetter = e.tagName === 'DIV';
        const isPercentNumber = e.dataset.numbertype === 'percent';

        if (!e.value && !exactMatch) continue;
        str += '&fv2=';
        if (exactMatch || exactSearchMode) str += _eid.replace("|8", "|1");
        else str += _eid;
        if (isPercentNumber && isNumeric(_e_value)) _e_value = (_e_value / 100);
        //for date and number field
        if (e.classList.contains('v6QueryDatebox') || e.classList.contains('v6QueryNumber')) {
            str += '|' + _e_value;
        } else if (_e_value || exactMatch) {
            if (!useRegex && !exactMatch && !specialSetter && !exactSearchMode) {
                _e_value = "\\Q" + _e_value + "\\E";
            } else if (useRegex) {
                //set as Java Patter.quote
                _e_value = _e_value.slice(6);
            }
            str += '|' + encodeURIComponent(_e_value);
        }
    }
    const multiCombos = document.querySelectorAll('.multiComboBox');
    for (let i = 0, len = multiCombos.length; i < len; i++) {
        const comboElement = multiCombos[i], combo = MultiSelectComboAgent.getMultiSelectCombo(comboElement.id);
        const selectedValues = combo.getValues();
        if (comboElement.parentNode.style.display === 'none') continue;
        selectedValues.forEach(function (selectedValue) {
            str += '&fv2=' + selectedValue;
        });
    }
    if (str.length === 0) str = '&fv2';
    //form_update will receive params with character "," "|" encoding in web ascii code
    return str.replace(new RegExp("%2C", "g"), "%26%2344%3B").replace(new RegExp("%7C", "g"), "%26%23124%3B");
}

function removeFilterField() {
    const v6QueryItems = document.getElementsByName("v6QueryItem");
    const multiComboBoxAll = document.querySelectorAll('.multiComboBox');
    Array.from(v6QueryItems).forEach(function (ele) {
        ele.value = '';
    });
    Array.from(multiComboBoxAll).forEach(function (multiComboBox) {
        const combo = MultiSelectComboAgent.getMultiSelectCombo(multiComboBox.id);
        let needRender = false;
        combo.options.filter(function (opt) {
            return opt.selected === true;
        }).forEach(function (opt) {
            needRender = true;
            opt.selected = false;
        });
        if (needRender) combo.render();
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
        const selector = targetField.querySelectorAll('li[data-value]');
        const input = targetField.querySelectorAll('input');
        if (selector && selector.length) {
            values.forEach(function(val) {
                const opt = Array.from(selector).find(function(li) {
                    return li.textContent === val;
                });
                if (opt) opt.click();
            });
        } else if (input && input.length) {
            values.forEach(function(val,index) {
                input[index].value = val;
            });
        }
    });
}

window.addEventListener('DOMContentLoaded', function loaded(event) {
    queryItemInputAutoComplete();
    preFillValue();
    if (location.href.includes('search')) document.getElementById('embedSearch-btn').click();
    const loadingIcon = document.querySelector('.lds-ellipsis');
    if (!loadingIcon) return;
    const timeOutId = setTimeout(function () {
        loadingIcon.classList.remove('lds-ellipsis'); //when page loaded, remove loading animation.
        clearTimeout(timeOutId);
    }, 500);
});