var RagicEventGantt = (function () {
  "use strict";
  var QUARTER_HOUR = 0,
      HOUR = 1,
      DAY = 2,
      WEEK = 3,
      TWO_WEEKS = 4,
      MONTH = 5,
      YEAR = 6,
      do_not_render,
      path,
      sheetIndex,
      today_start_time,
      view_start_time,
      view_end_time,
      timeUnit,
      dateFormat,
      warningMsg = [],
      promptMsg = [],
      fontFamily = '',
      fontSizeScale = 1,
      boundaryMargin = '';
  var gantt = {
    events : {},
    headers : [],
    event_last_bar : [],
    labels_to_draw : [],
    categoryDomainId: -1,
    lang : {
      langv5: 'en',
      msg1: 'Please select a Start Date field and a End Date field.',
      m0: 'January',
      m1: 'February',
      m2: 'March',
      m3: 'April',
      m4: 'May',
      m5: 'June',
      m6: 'July',
      m7: 'August',
      m8: 'September',
      m9: 'October',
      m10: 'November',
      m11: 'December',
      year: '',
      month: ''
    }
  };

  gantt.requireEventData = function (eventData) {
    this.events = eventData;
  };

  gantt.requireHeaderData = function (chart_headers) {
    this.headers = chart_headers;
  };

  gantt.loadConfig = function (config) {
    if (config.hasOwnProperty("path")) {
      path = config.path;
    }
    if (config.hasOwnProperty("sheetIndex")) {
      sheetIndex = parseInt(config.sheetIndex) || -1;
    }
    if (config.hasOwnProperty("todayStartTime")) {
      today_start_time = parseInt(config.todayStartTime) || -1;
    }
    if (config.hasOwnProperty("viewStartTime")) {
      view_start_time = parseInt(config.viewStartTime) || -1;
    }
    if (config.hasOwnProperty("viewEndTime")) {
      view_end_time = parseInt(config.viewEndTime) || -1;
    }
    if (config.hasOwnProperty("timeUnit")) {
      timeUnit = parseInt(config.timeUnit);
    }
    if (config.hasOwnProperty("dateFormat")) {
      dateFormat = config.dateFormat;
    }
    if (config.hasOwnProperty("warningMsg")) {
      warningMsg = JSON.parse(config.warningMsg);
    }
    if (config.hasOwnProperty("promptMsg")) {
      promptMsg = JSON.parse(config.promptMsg);
    }
    if (config.hasOwnProperty("fontFamily")){
      fontFamily = config.fontFamily;
    }
    if (config.hasOwnProperty("fontSizeScale")){
      fontSizeScale = config.fontSizeScale;
    }
    if (config.hasOwnProperty("boundaryMargin")){
      boundaryMargin = config.boundaryMargin;
    }
    if (config.hasOwnProperty("categoryDomainId")){
      this.categoryDomainId = config.categoryDomainId;
    }
    if (config.hasOwnProperty("ifDisplayWeekday")){
      this.ifDisplayWeekday = config.ifDisplayWeekday;
    }
    if (config.hasOwnProperty("ifHighlightWeekend")){
      this.ifHighlightWeekend = config.ifHighlightWeekend;
    }
    if (config.hasOwnProperty("ifDisplayTodayLine")){
      this.ifDisplayTodayLine = config.ifDisplayTodayLine;
    }
  };

  gantt.loadLanguage = function (lang) {
    this.lang = lang;
  };

  gantt.render = function () {

    var ganttBox = document.createElement('DIV');

    if (warningMsg.length > 0) {
      var _div = document.createElement('DIV');
      _div.style.padding = '15px 25px';
      _div.style.fontSize = '14px';
      _div.classList.add('printHide');
      warningMsg.forEach(function(msg) {
        _div.appendChild(document.createTextNode(msg));
        _div.appendChild(document.createElement('BR'))
      });
      ganttBox.appendChild(_div);
      return ganttBox;
    }

    var ganttBody = new GanttView().render();
    return ganttBody;
  };

  gantt.renderTodayLine = function () {
    if (!this.ifDisplayTodayLine) return;

    const ganttBody = $('ganttBody'),
          ganttBodyRect = ganttBody.getBoundingClientRect(),
          todayLineAnchor = $('todayLineAnchor');
    if (!todayLineAnchor) return;
    const todayLineAnchorRect = todayLineAnchor.getBoundingClientRect(),
          todayLine = document.createElement('DIV'),
          proportion = Number(todayLineAnchor.dataset.todayline_proportion);
    if (isNaN(proportion)) return;

    todayLine.id = 'todayLine';
    todayLine.classList.add('ganttTodayLine');
    ganttBody.appendChild(todayLine);
    ganttBody.style.position = 'relative';

    todayLine.style.top = todayLineAnchorRect.bottom - ganttBodyRect.top + 'px';
    todayLine.style.left = todayLineAnchorRect.left - ganttBodyRect.left + todayLineAnchorRect.width * proportion - 1.5 + 'px';
    todayLine.style.height = ganttBodyRect.bottom - todayLineAnchorRect.bottom + 'px';
  }

  gantt.promptMessage = function () {
    if (promptMsg.length > 0) {
      floatWinAlert(promptMsg[0]);
    }
  }

  gantt.createBarSelectAll = function() {
    this.createBarSelect('startDate');
    this.createBarSelect('endDate');
    this.createBarSelect('timeUnit', true);
    this.createBarSelect('cat');
    this.createBarSelect('label');
    for (let i = 0; i < config.sortingRuleCount; i++) {
      this.createBarSelect('sorting' + (i + 1));
      this.createBarSelect('sortingType' + (i + 1), true);
    }
  }

  gantt.createBarSelect = function (key, hideSearchBar) {
    //capitalize first letter
    const keyStartCase = key.charAt(0).toUpperCase() + key.slice(1);

    const barSelectContainerId = 'gantt' + keyStartCase + 'BarSelectContainer',
          barSelectId = 'gantt' + keyStartCase + 'BarSelect',
          selectId = 'gantt' + keyStartCase + 'Select';

    const barSelectContainer = document.getElementById(barSelectContainerId),
          selectEle = document.getElementById(selectId);
    if (!barSelectContainer || !selectEle) return;
    
    const barSelect = BarSelectAgent.modifiedSelector(barSelectId, selectEle, barSelectContainer, {});
    barSelect.setAfterSelectOption(function(changedOption) {
      if (selectEle.multiple) {
        const targetOption = Array.from(selectEle.options).find(function (_option) {
          return _option.value === changedOption.value;
        });
        if (targetOption) {
          targetOption.selected = changedOption.selected;
        }
      }
      else {
        selectEle.value = changedOption.value;
      }
    });

    if (hideSearchBar) barSelect.setSearchMode(false);

    return barSelect;
  }

  function GanttView() {
  }

  GanttView.prototype.render = function () {
    var ganttWrapper = document.createElement("DIV"),
        ganttContent = document.createElement("TABLE");

    this.drawHeader(ganttContent);
    ganttWrapper.appendChild(ganttContent);

    ganttWrapper.id = 'ganttBody';
    ganttWrapper.classList.add("EventGantt_Body");
    //ganttContent.classList.add("reportTable");
    if(fontFamily) ganttContent.style.fontFamily = fontFamily;
    ganttContent.style.fontSize = Math.round(16*fontSizeScale) + "px";
    ganttContent.style.margin = boundaryMargin;

    this.drawEvents(ganttContent);
    this.drawLabels();

    return ganttWrapper;
  };

  GanttView.prototype.drawHeader = function (table) {
    var headerRow_bigUnit, cell,
        headerRow_unit, cell_2,
        headerRow_weekday, cell_weekday,
        bigUnit, runningUnit, bigUnitFormat, _dateFormat,
        cellcount = 0, big_unit_cell,
        i;

    if (timeUnit == YEAR) {
      bigUnitFormat = '';
      _dateFormat = 'yyyy';
    }
    else if (timeUnit == MONTH) {
      bigUnitFormat = 'yyyy';
      _dateFormat = 'MM';
    }
    else if (timeUnit == DAY || timeUnit == WEEK || timeUnit == TWO_WEEKS) {
      if (new RegExp(/y+.M+/g).test(dateFormat)) bigUnitFormat = dateFormat.match(/y+.M+/g) + '';  // yyyy/MM/dd
      else bigUnitFormat = dateFormat.match(/M+./g) + dateFormat.match(/y+/g) + ''; // MM/dd/yyyy
      _dateFormat = dateFormat.match(/d+/g) + '';
    }
    else {
      //if (new RegExp(/^y+.M+.d+/g).test(dateFormat)) bigUnitFormat = dateFormat.match(/^y+.M+.d+/g) + '';
      //else bigUnitFormat = dateFormat.match(/M+./g) + dateFormat.match(/y+/g) + '';
      var sec = dateFormat.split(' ');
      for (var i = 0; i < sec.length; i++) {
        if (sec[i].indexOf('y') != -1 && sec[i].indexOf('M') != -1 && sec[i].indexOf('d') != -1) {
          bigUnitFormat = sec[i];
          break;
        }
      }
      if (!bigUnitFormat) bigUnitFormat = 'yyyy/MM/dd';
      _dateFormat = dateFormat.match(/H+.m+/g) + '';
    }

    headerRow_bigUnit = table.insertRow(-1);
    headerRow_bigUnit.classList.add('EventGantt_Header');
    headerRow_bigUnit.classList.add('sticky');
    headerRow_bigUnit.style.zIndex = '11';
    
    headerRow_unit = table.insertRow(-1);
    headerRow_unit.classList.add('EventGantt_Header');
    headerRow_unit.classList.add('sticky');
    headerRow_unit.style.zIndex = '11';
    headerRow_unit.id = 'headerRow_unit';
    
    if (gantt.ifDisplayWeekday) {
      headerRow_weekday = table.insertRow(-1);
      headerRow_weekday.classList.add('EventGantt_Header');
      headerRow_weekday.classList.add('sticky');
      headerRow_weekday.style.zIndex = '11';
    }

    for (i = 0; i < gantt.headers.length; i++) {
      if (timeUnit !== YEAR) {
        cell = headerRow_bigUnit.insertCell(-1);
        cell.style.borderBottom = 'none';
        cell.classList.add('EventGantt_DescHeader');
        cell.classList.add('sticky');
        cell.style.zIndex = '12';
      }

      cell_2 = headerRow_unit.insertCell(-1);
      if (!gantt.ifDisplayWeekday) {
        let textContainer = document.createElement('DIV');
        textContainer.classList.add('textContainer');
        if (timeUnit !== YEAR) textContainer.style.transform = 'translateY(-75%)';
        textContainer.appendChild(document.createTextNode(gantt.headers[i].value));
        cell_2.appendChild(textContainer);
      }
      if (gantt.ifDisplayWeekday) cell_2.style.borderBottom = 'none';
      cell_2.classList.add('EventGantt_DescHeader');
      cell_2.classList.add('sticky');
      cell_2.style.zIndex = '12';

      if (gantt.ifDisplayWeekday) {
        cell_weekday = headerRow_weekday.insertCell(-1);
        let textContainer = document.createElement('DIV');
        textContainer.classList.add('textContainer');
        if (timeUnit !== YEAR) textContainer.style.transform = 'translateY(-150%)';
        else if (timeUnit === YEAR) textContainer.style.transform = 'translateY(-75%)';
        textContainer.appendChild(document.createTextNode(gantt.headers[i].value));
        cell_weekday.appendChild(textContainer);
        cell_weekday.classList.add('EventGantt_DescHeader');
        cell_weekday.classList.add('sticky');
        cell_weekday.style.zIndex = '12';
      }
    }

    var runningTime = view_start_time;

    while (runningTime < view_end_time) {
      bigUnit = formatBigUnit(runningTime, bigUnitFormat, timeUnit);
      if (bigUnit) {
        if (runningUnit != bigUnit) {
          if (big_unit_cell) big_unit_cell.colSpan = cellcount;
          cellcount = 0;

          cell = headerRow_bigUnit.insertCell(-1);
          cell.appendChild(document.createTextNode(bigUnit));
          big_unit_cell = cell;
          runningUnit = bigUnit;
        }
      }

      cell_2 = headerRow_unit.insertCell(-1);
      cell_2.appendChild(document.createTextNode(new Date(runningTime).toStr(_dateFormat)));
      cell_2.dataset.date = runningTime;
      const headercell_start = runningTime;
      const next_headercell_start = addPeriod(runningTime, timeUnit);
      const today_end_time = today_start_time + (24*60*60-1)*1000;
      if (today_end_time >= headercell_start && today_end_time < next_headercell_start) {
        cell_2.id = 'todayLineAnchor';

        const period = next_headercell_start - headercell_start;
        const proportion = (today_start_time + 24*60*60*1000 - headercell_start) / period;
        cell_2.dataset.todayline_proportion = proportion;
      }
      cellcount++;

      if (headerRow_weekday) {
        cell_weekday = headerRow_weekday.insertCell(-1);
        let weekday = new Date(runningTime).getDay();
        cell_weekday.appendChild(document.createTextNode(lang.weekdays[weekday]));
      }

      runningTime = addPeriod(runningTime, timeUnit);
    }

    if (big_unit_cell) big_unit_cell.colSpan = cellcount;

    function formatBigUnit(time, bigUnitFormat, timeUnit) {
      var bigUnit = '';
      var date = new Date(time);
      var month = date.getUTCMonth();
      var year = date.getUTCFullYear();
      if (timeUnit == DAY || timeUnit == WEEK || timeUnit == TWO_WEEKS) {
        if (lang.langv5 == 'zh-TW' || lang.langv5 == 'zh-CN') {
          bigUnit = year + lang.year + (month + 1) + lang.month;
          return bigUnit;
        }
        if (month == 0) return lang.m0 + ', ' + year;
        else if (month == 1) return lang.m1 + ', ' + year;
        else if (month == 2) return lang.m2 + ', ' + year;
        else if (month == 3) return lang.m3 + ', ' + year;
        else if (month == 4) return lang.m4 + ', ' + year;
        else if (month == 5) return lang.m5 + ', ' + year;
        else if (month == 6) return lang.m6 + ', ' + year;
        else if (month == 7) return lang.m7 + ', ' + year;
        else if (month == 8) return lang.m8 + ', ' + year;
        else if (month == 9) return lang.m9 + ', ' + year;
        else if (month == 10) return lang.m10 + ', ' + year;
        else if (month == 11) return lang.m11 + ', ' + year;
      }
      return new Date(time).toStr(bigUnitFormat);
    }

  };

  GanttView.prototype.drawEvents = function (table) {
    var category, eventsArray, event,
        headerRow = table.rows[1],
        headerCellSize = headerRow.cells.length,
        descCellSize = gantt.headers.length,
        i;

    for (category in gantt.events) {
      eventsArray = gantt.events[category];
      var sec = category.split('|');  //if category is user field, category=email+'|'+userName
      if (sec.length > 1) drawCategory(sec[1]);
      else drawCategory(category);

      for (i = 0; i < eventsArray.length; i++) {
        event = eventsArray[i];
        drawEvent(event);
      }
    }

    function drawCategory(category) {
      //category could be empty string
      if (category === null || typeof category === 'undefined' || gantt.categoryDomainId < 0) return;

      var i, row = table.insertRow(-1), cell;
      row.classList.add('EventGantt_Category');

      cell = row.insertCell(-1);
      cell.appendChild(document.createTextNode(category));
      cell.classList.add('sticky');
      cell.style.borderRight = 'none';
      for (i = 0; i < gantt.headers.length - 1; i++) {
        cell = row.insertCell(-1);
        cell.appendChild(document.createTextNode('\u00A0'));
        cell.classList.add('sticky');
        cell.style.borderRight = 'none';
      }
      cell = row.insertCell(-1);
      cell.colSpan = headerCellSize - descCellSize;
      cell.appendChild(document.createTextNode('\u00A0'));
    }

    function drawEvent(event) {
      var i, row = table.insertRow(-1), cell, headerCell,
          event_start = event.startTime,
          event_end = event.endTime,
          event_desc_fields = event.descFields,
          headercell_start, next_headercell_start,
          bar, transparentBar,
          period;
      
      for (i = 0; i < event_desc_fields.length; i++) {
        cell = row.insertCell(-1);
        cell.appendChild(document.createTextNode(event_desc_fields[i]));
        cell.classList.add('sticky');
        cell.classList.add('EventGantt_Desc');
      }

      for (i = descCellSize; i < headerCellSize; i++) {
        headerCell = headerRow.cells[i];
        headercell_start = parseInt(headerCell.dataset.date);
        next_headercell_start = addPeriod(headercell_start, timeUnit);
        period = next_headercell_start - headercell_start;
        cell = row.insertCell(-1);

        if (gantt.ifHighlightWeekend) {
          let weekday = new Date(headercell_start).getDay();
          if (weekday == 6 || weekday == 0) {
            cell.classList.add('ganttWeekendCell');
          }
        }
        
        if (event_end !== -1) {
          var proportion = (Math.min(event_end, next_headercell_start) - Math.max(event_start, headercell_start)) / period;
          var leftProportion = 0;

          if (event_start > headercell_start) {
            leftProportion = (event_start - headercell_start) / period;
            transparentBar = document.createElement('DIV');
            transparentBar.classList.add('rankbar');
            transparentBar.style.backgroundColor = 'transparent';
            transparentBar.style.width = leftProportion * 100 + '%';
            cell.appendChild(transparentBar);
          }

          if (proportion > 0) {
            bar = document.createElement('DIV');
            bar.classList.add('ganttbar');
            bar.classList.add('rankbar');
            bar.style.width = proportion * 100 + '%';
            bar.addEventListener('click', function () {
              showXHTMLMsg(ap + path + '/' + sheetIndex, event.nodeId);
            });
            cell.appendChild(bar);

            // last bar of each data
            if (event_end <= headercell_start + period) {
              cell.style.textAlign = 'left';
              //gantt.event_last_bar.push({'bar':bar, 'label_text':event.label});
              gantt.labels_to_draw.push({'cell':cell, 'labelText':event.label, 'labelLeft':(leftProportion + proportion) * 100});
            }
          }
        }
        else if (event_start - headercell_start >= 0 && event_start - headercell_start < period && event_end === -1) {
          var proportion = (event_start - headercell_start) / period;

          var milestone = document.createElement('DIV');
          milestone.classList.add('ganttMilestone');
          milestone.classList.add('tinyDiamond');
          milestone.style.top = 'calc(50% - 5px)';
          milestone.style.left = 'calc(' + (proportion * 100) + '% - 5px)';
          milestone.addEventListener('click', function () {
            showXHTMLMsg(ap + path + '/' + sheetIndex, event.nodeId);
          });
          cell.appendChild(milestone);
          cell.style.position = 'relative';

          gantt.labels_to_draw.push({'cell':cell, 'labelText':event.label, 'labelLeft':proportion * 100});
        }
        else {
          cell.appendChild(document.createTextNode('\u00A0'));
        }
      }
    }
  };

  GanttView.prototype.drawLabels = function () {
    var i, label, labelInfo, 
        labelList = gantt.labels_to_draw;
    for (i = 0; i < labelList.length; i++) {
      labelInfo = labelList[i];
      label = document.createElement('DIV');
      label.appendChild(document.createTextNode(labelInfo.labelText));
      label.style.position = 'absolute';
      label.style.top = '5px';
      label.style.left = 'calc(' + labelInfo.labelLeft + '% + 16px)';
      label.style.backgroundColor = '#fff';
      labelInfo.cell.appendChild(label);
      labelInfo.cell.style.position = 'relative';
    }
  };

  return gantt;
})();

Date.prototype.toStr = function(y) {
  //x.setUTCHours(x.getUTCHours() + 8);
  var x = new Date(this.valueOf());
  
  var z = {
    M: x.getUTCMonth() + 1,
    d: x.getUTCDate(),
    H: x.getUTCHours(),
    m: x.getUTCMinutes(),
    s: x.getUTCSeconds()
  };
  
  y = y.replace(/(M+|d+|H+|m+|s+)/g, function(v) {
    return ((v.length > 1 ? "0" : "") + eval('z.' + v.slice(-1))).slice(-2)
  });

  return y.replace(/(y+)/g, function(v) {
    return x.getUTCFullYear().toString().slice(-v.length)
  });
};

function addPeriod(time, timeUnit) {
  var date = new Date(time);
  if (timeUnit == 0) {  //15 MINS
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes() + 15, date.getSeconds()).getTime();
  } else if (timeUnit == 1) {  //HOUR
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours() + 1, date.getMinutes(), date.getSeconds()).getTime();
  } else if (timeUnit == 2) {  //DAY
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, date.getHours(), date.getMinutes(), date.getSeconds()).getTime();
  } else if (timeUnit == 3) {  //WEEK
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7, date.getHours(), date.getMinutes(), date.getSeconds()).getTime();
  } else if (timeUnit == 4) {  //2 WEEKS
    return new Date(date.getFullYear(), date.getMonth(), date.getDate() + 14, date.getHours(), date.getMinutes(), date.getSeconds()).getTime();
  } else if (timeUnit == 5) {  //MONTH
    return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()).getTime();
  } else if (timeUnit == 6) {  //YEAR
    return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()).getTime();
  } 
}

function _findPos(obj) {
  if(!obj) return null;
  var curleft=obj.offsetLeft;
  var curtop=obj.offsetTop;
  var firstObj = obj;
  var lastObj=obj;
  while (obj = obj.offsetParent){//assignment operator, not mistake
    if (obj.id == 'eventGantt') break;
    lastObj=obj;
    curleft += obj.offsetLeft;
    curtop += obj.offsetTop;
  }
  
  return [curleft,curtop];
}