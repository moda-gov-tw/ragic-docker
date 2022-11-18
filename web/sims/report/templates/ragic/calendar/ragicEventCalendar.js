// Polyfill for IE
Number.isInteger = Number.isInteger || function (value) {
    return typeof value === "number" &&
        isFinite(value) &&
        Math.floor(value) === value;
};

function cancelEventBubble(event) {
    event.preventDefault();
    event.stopPropagation();
}

var RagicEventCalendar = (function () {
    "use strict";

    // Set up private variables
    var focusDateTime = new Date(),
        timeSplit = 0.5, // per o.5 hour as a time section.
        time_view_init_time = 6,
        time_view_end_time = 20,
        time_div_height = 30, // same as the CSS setting.
        am_suffix = "AM",
        pm_suffix = "PM",
        UNIT_MONTH = "M",
        UNIT_WEEK = "W",
        UNIT_DAY = "D",
        DIRECTION_NEXT = "N",
        DIRECTION_PREV = "P",
        CHOSEN_DATE='C',
        focusTimeUnit = UNIT_MONTH,
        fontSizeScale,
        showTimelines,
        calendarView,
        enableTimeFormatChange=false,
        clockHour=12;
    var calendar = {
        view: null,
        registeredActions: {},
        title: document.createElement('DIV'),
        events: {},
        eventRenderFunc: null,
        eventMoreFunc: null,
        lang: {
            today: 'Today',
            focus: 'chosenDate',

            month: 'month',
            week: 'week',
            day: 'day',

            all_day: 'All day',

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

            d0: 'Sunday',
            d1: 'Monday',
            d2: 'Tuesday',
            d3: 'Wednesday',
            d4: 'Thursday',
            d5: 'Friday',
            d6: 'Saturday'
        }
    };

    calendar.changeFocusDateTime = function (date) {
        this.focusDateTime=date;
    };
    calendar.getFocusDateTime = function () {
        return this.focusDateTime;
    };

    calendar.getFocusDateTimeText = function(){
        const y=this.focusDateTime.getFullYear();
        const m=this.focusDateTime.getMonth();
        const d=this.focusDateTime.getDate();
        return y+'/'+m+'/'+d;
    }
    calendar.loadView = function (view) {
        this.view = view;
    };

    calendar.requireEventData = function (eventData) {
        this.events = {}; // will classify by month

        var i = 0, len = eventData.length;
        for (; i < len; i++) {
            var calendarEvent = new CalendarEvent(eventData[i]),
                initDate = calendarEvent.date_init,
                initDateProp = initDate.getFullYear() + "/" + initDate.getMonth();

            if (!this.events.hasOwnProperty(initDateProp)) {
                this.events[initDateProp] = [];
            }
            this.events[initDateProp].push(calendarEvent);

            if (calendarEvent.date_end) {
                var _init = new Date(calendarEvent.date_init.getFullYear(), calendarEvent.date_init.getMonth() + 1, 1),
                    _end = new Date(calendarEvent.date_end.getFullYear(), calendarEvent.date_end.getMonth(), 1);

                while (_init <= _end) {
                    var _prop = _init.getFullYear() + "/" + _init.getMonth();

                    if (!this.events.hasOwnProperty(_prop)) {
                        this.events[_prop] = [];
                    }
                    this.events[_prop].push(calendarEvent);

                    _init.setMonth(_init.getMonth() + 1);
                }
            }
        }
    };
    //設定繪圖方法
    calendar.setEventRenderFunction = function (eventRenderFunc) {
        this.eventRenderFunc = eventRenderFunc;
    };

    //設定其他方法
    calendar.setEventMoreFunction = function (eventMoreFunc) {
        this.eventMoreFunc = eventMoreFunc;
    };

    //設定語言
    calendar.loadLanguage = function (lang) {
        this.lang = lang;
    };

    //設定參數
    calendar.loadConfig = function (config) {
        if (config.hasOwnProperty("defaultView")) {
            focusTimeUnit = config.defaultView;
        }
        if (config.hasOwnProperty("focusDateTime")) {
            focusDateTime = config.focusDateTime;
        }
        if (config.hasOwnProperty("timeViewInitTime")) {
            time_view_init_time = parseFloat(config.timeViewInitTime);
        }
        if (config.hasOwnProperty("timeViewEndTime")) {
            time_view_end_time = parseFloat(config.timeViewEndTime);
        }
        if (config.hasOwnProperty("timeSplit")) {
            timeSplit = parseFloat(config.timeSplit);
        }
        if (config.hasOwnProperty("fontSizeScale")) {
            fontSizeScale = parseFloat(config.fontSizeScale);
        }
        if (config.hasOwnProperty("showTimelines")) {
            showTimelines = config.showTimelines;
        }
        if (config.hasOwnProperty("calendarView")) {
            calendarView = config.calendarView;
        }
        if (config.hasOwnProperty("enableTimeFormatChange")) {
            enableTimeFormatChange= config.enableTimeFormatChange;
        }
    };

    calendar.registerAction = function (domId, event, action) {
        var _action = {'event': event, 'action': action};
        if (this.registeredActions.hasOwnProperty(domId)) {
            this.registeredActions.domId.push(_action);
        } else {
            this.registeredActions[domId] = [];
            this.registeredActions[domId].push(_action);
        }
    };

    calendar.render = function () {
        var calendarBox = document.createElement('DIV'),
            calendarToolbar = document.createElement('DIV');

        calendarBox.appendChild(calendarToolbar);
        if (!this.view) {
            if (focusTimeUnit === UNIT_MONTH) {
                this.loadView(CALENDAR_MONTH_VIEW);
            } else if (focusTimeUnit === UNIT_WEEK) {
                this.loadView(CALENDAR_WEEK_VIEW);
            } else if (focusTimeUnit === UNIT_DAY) {
                this.loadView(CALENDAR_DAY_VIEW);
            }
        }

        // draw toolbar
        calendarToolbar.id = "EventCalendarToolbar";
        var leftTool = document.createElement('DIV'),
            rightTool = document.createElement('DIV'),
            mainRightTool=document.createElement('DIV'),//include hourclock+right

            prevBtn = document.createElement('BUTTON'),
            todayBtn = document.createElement('BUTTON'),
            nextBtn = document.createElement('BUTTON'),

            monthViewBtn = document.createElement('BUTTON'),
            weekViewBtn = document.createElement('BUTTON'),
            dayViewBtn = document.createElement('BUTTON'),

            hourClockSwitch=document.createElement('DIV');

        this.title = document.createElement('DIV');



        //左側工具列
        leftTool.classList.add("EventCalendar_ToolGroup");
        leftTool.appendChild(prevBtn);
        prevBtn.appendChild(document.createTextNode("<"));
        prevBtn.classList.add("EventCalendar_btn", "printHide");
        prevBtn.dataset.direction = DIRECTION_PREV;
        prevBtn.id = "EventCalendar_Btn_Prev";
        leftTool.appendChild(todayBtn);
        todayBtn.appendChild(document.createTextNode(this.lang['today']));
        todayBtn.classList.add("EventCalendar_btn", "printHide");
        todayBtn.id = "EventCalendar_Btn_Today";
        leftTool.appendChild(nextBtn);
        nextBtn.appendChild(document.createTextNode(">"));
        nextBtn.classList.add("EventCalendar_btn", "printHide");
        nextBtn.dataset.direction = DIRECTION_NEXT;
        nextBtn.id = "EventCalendar_Btn_Next";
        leftTool.appendChild(this.title);
        this.title.classList.add("EventCalendar_title_txt");
        this.title.style.fontSize = Math.round(20*fontSizeScale) + "px";
        prevBtn.addEventListener('click', this.changeDateTime);
        nextBtn.addEventListener('click', this.changeDateTime);
        todayBtn.addEventListener('click', this.findToday);

        //中間工具列(switch)
        if(enableTimeFormatChange){
            hourClockSwitch.classList.add("EventCalendar_switch");
            const switchInput=document.createElement('INPUT');
            switchInput.type="checkbox";
            switchInput.name="EventCalendar_switch";
            switchInput.classList.add("EventCalendar_switch_checkbox");
            switchInput.id="EventCalendar_switch";
            switchInput.checked=true;
            const switchLabel=document.createElement('LABEL');
            switchLabel.htmlFor="EventCalendar_switch";
            switchLabel.classList.add("EventCalendar_switch_label");
            const textSpan1=document.createElement('SPAN');
            textSpan1.classList.add("EventCalendar_switch_inner");
            const textSpan2=document.createElement('SPAN');
            textSpan2.classList.add("EventCalendar_switch_switch");
            switchLabel.appendChild(textSpan1);
            switchLabel.appendChild(textSpan2);
            hourClockSwitch.appendChild(switchInput);
            hourClockSwitch.appendChild(switchLabel);
            switchInput.addEventListener('change',this.changeClockHour);
        }


        //右側工具列(年月日)
        rightTool.classList.add("EventCalendar_ToolGroup", "printHide");
        rightTool.appendChild(monthViewBtn);
        monthViewBtn.appendChild(document.createTextNode(this.lang['month']));
        monthViewBtn.classList.add("EventCalendar_btn");
        monthViewBtn.dataset.timeUnit = UNIT_MONTH;
        monthViewBtn.id = "EventCalendar_Btn_Month";
        monthViewBtn.style.border = calendarView==="M"?"2px solid grey":"";
        rightTool.appendChild(weekViewBtn);
        weekViewBtn.appendChild(document.createTextNode(this.lang['week']));
        weekViewBtn.classList.add("EventCalendar_btn");
        weekViewBtn.dataset.timeUnit = UNIT_WEEK;
        weekViewBtn.id = "EventCalendar_Btn_Week";
        weekViewBtn.style.border = calendarView==="W"?"2px solid grey":"";
        rightTool.appendChild(dayViewBtn);
        dayViewBtn.appendChild(document.createTextNode(this.lang['day']));
        dayViewBtn.classList.add("EventCalendar_btn");
        dayViewBtn.dataset.timeUnit = UNIT_DAY;
        dayViewBtn.id = "EventCalendar_Btn_Day";
        dayViewBtn.style.border = calendarView==="D"?"2px solid grey":"";
        monthViewBtn.addEventListener('click', this.changeView);
        weekViewBtn.addEventListener('click', this.changeView);
        dayViewBtn.addEventListener('click', this.changeView);

        // draw main view
        var calendarBody = this.view.render();

        // assembling virtual DOM component here to reduce view reflow.
        calendarBox.appendChild(calendarBody);
        calendarToolbar.appendChild(leftTool);
        mainRightTool.classList.add("EventCalendar_mainRightTool");
        mainRightTool.appendChild(hourClockSwitch);
        mainRightTool.appendChild(rightTool);
        calendarToolbar.appendChild(mainRightTool);

        calendarToolbar.classList.add("EventCalendar_EventCalendarToolbar");
        // rebind events to toolbar
        var _domId;
        for (_domId in this.registeredActions) {
            if (this.registeredActions.hasOwnProperty(_domId)) {
                var qo = calendarToolbar.querySelector('#' + _domId);
                if (qo) {
                    var _actions = this.registeredActions[_domId], _action, i, len;
                    for (i = 0, len = _actions.length; i < len; i++) {
                        _action = _actions[i];
                        qo.addEventListener(_action.event, _action.action);
                    }
                }
            }
        }

        return calendarBox;
    };

    calendar.updateTitle = function (text) {
        this.title.textContent = text;
    };

    calendar.changeDateTime = function (event) {
        cancelEventBubble(event);

        var direction = this.dataset.direction;

        if (direction === DIRECTION_PREV) {
            if (focusTimeUnit === UNIT_MONTH) {
                const daysOfPrevMonth=  new Date(focusDateTime.getFullYear(), focusDateTime.getMonth()-2, 0).getDate();
                if(focusDateTime.getDate()>daysOfPrevMonth) focusDateTime.setDate(daysOfPrevMonth);
                focusDateTime.setMonth(focusDateTime.getMonth() - 1);
            } else if (focusTimeUnit === UNIT_WEEK) {
                focusDateTime.setDate(focusDateTime.getDate() - 7);
            } else if (focusTimeUnit === UNIT_DAY) {
                focusDateTime.setDate(focusDateTime.getDate() - 1);
            }
        } else if (direction === DIRECTION_NEXT) {
            if (focusTimeUnit === UNIT_MONTH) {
                const daysOfNextMonth=  new Date(focusDateTime.getFullYear(), focusDateTime.getMonth()+2, 0).getDate();
                if(focusDateTime.getDate()>daysOfNextMonth) focusDateTime.setDate(daysOfNextMonth);
                focusDateTime.setMonth(focusDateTime.getMonth() + 1);
            } else if (focusTimeUnit === UNIT_WEEK) {
                focusDateTime.setDate(focusDateTime.getDate() + 7);
            } else if (focusTimeUnit === UNIT_DAY) {
                focusDateTime.setDate(focusDateTime.getDate() + 1);
            }
        }else if (direction === CHOSEN_DATE){
            var fDate=RagicStorage.localStorage.getItem("chosenDate");
            if(fDate&&new Date(fDate).toString()!=='Invalid Date'){
                focusDateTime=new Date(RagicStorage.localStorage.getItem("chosenDate"));
            }

        }
        RagicStorage.localStorage.setItem("FocusDateTime", (focusDateTime.getFullYear()+'/'+(focusDateTime.getMonth()+1)+'/'+focusDateTime.getDate()));
        calendar.view.render();
    };

    calendar.changeView = function (event) {
        cancelEventBubble(event);

        focusTimeUnit = this.dataset.timeUnit;
        if (focusTimeUnit === UNIT_MONTH) {
            calendar.loadView(CALENDAR_MONTH_VIEW);
        } else if (focusTimeUnit === UNIT_WEEK) {
            calendar.loadView(CALENDAR_WEEK_VIEW);
        } else if (focusTimeUnit === UNIT_DAY) {
            calendar.loadView(CALENDAR_DAY_VIEW);
        }

        calendar.view.render();
    };

    calendar.changeClockHour = function (event) {
        cancelEventBubble(event);
        if(this.checked)clockHour=12;
        else clockHour=24;
        calendar.view.render();
    };

    calendar.findToday = function (event) {
        cancelEventBubble(event);
        focusDateTime = new Date();
        calendar.view.render();
    };

    /**
     * Base class of calendar view
     * @constructor
     */
    function CalendarView() {
    }

    CalendarView.prototype.render = function () {
        var calendarWrapper = document.createElement("DIV"),
            calendarHeader = document.createElement("TABLE"),
            calendarContent = document.createElement("TABLE");
        let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;

        this.drawHeader(calendarHeader);
        this.drawTimeSection(calendarContent);
        calendarWrapper.appendChild(calendarHeader);
        calendarWrapper.appendChild(calendarContent);

        calendarWrapper.classList.add("EventCalendar_Body");
        calendarHeader.classList.add("EventCalendar_Header");
        calendarHeader.style.fontSize = Math.round(16 * fontSizeRate) + "px";


        if (document.querySelector(".EventCalendar_Body")) {
            var oldNode = document.querySelector(".EventCalendar_Body");
            oldNode.parentNode.replaceChild(calendarWrapper, oldNode);
        }

        calendar.updateTitle(this.createTitle());
        this.drawEvents(calendarContent);

        // rebind events to calendar
        var _domId;
        for (_domId in calendar.registeredActions) {
            if (calendar.registeredActions.hasOwnProperty(_domId)) {
                var qo = calendarWrapper.querySelector('#' + _domId);
                if (qo) {
                    var _actions = this.registeredActions[_domId], _action, i, len;
                    for (i = 0, len = _actions.length; i < len; i++) {
                        _action = _actions[i];
                        qo.addEventListener(_action.event, _action.action);
                    }
                }
            }
        }

        return calendarWrapper;
    };

    function CalendarMonthView() {
        CalendarView.call(this);
        this.drawHeader = function (table) {
            var headerRow = table.insertRow(-1), cell;

            cell = headerRow.insertCell(-1);
            cell.appendChild(document.createTextNode(calendar.lang.d0));
            cell = headerRow.insertCell(-1);
            cell.appendChild(document.createTextNode(calendar.lang.d1));
            cell = headerRow.insertCell(-1);
            cell.appendChild(document.createTextNode(calendar.lang.d2));
            cell = headerRow.insertCell(-1);
            cell.appendChild(document.createTextNode(calendar.lang.d3));
            cell = headerRow.insertCell(-1);
            cell.appendChild(document.createTextNode(calendar.lang.d4));
            cell = headerRow.insertCell(-1);
            cell.appendChild(document.createTextNode(calendar.lang.d5));
            cell = headerRow.insertCell(-1);
            cell.appendChild(document.createTextNode(calendar.lang.d6));
        };
        this.drawTimeSection = function (contentTable) {
            var row,
                firstDay = new Date(focusDateTime.getFullYear(), focusDateTime.getMonth(), 1),
                lastDay = new Date(focusDateTime.getFullYear(), focusDateTime.getMonth() + 1, 0),
                operatorDate = new Date(focusDateTime.getFullYear(), focusDateTime.getMonth(), 1),
                currentDate = 1,
                lastDate = lastDay.getDate(),
                _day;

            while (currentDate <= lastDate) {
                operatorDate.setDate(currentDate);
                _day = operatorDate.getDay();
                if (currentDate === 1 || _day === 0) {
                    row = contentTable.insertRow(-1);
                    var i = 0;
                    for (; i < 7; i++) {
                        row.insertCell(-1);
                    }
                }
                row.cells[_day].appendChild(addCalendarDay(operatorDate));

                currentDate++;
            }

            // fill the rest cells with days from other months.
            if (firstDay.getDay() > 0) {
                row = contentTable.rows[0];
                operatorDate = new Date(focusDateTime.getFullYear(), focusDateTime.getMonth(), 0);

                do {
                    _day = operatorDate.getDay();

                    row.cells[_day].appendChild(addCalendarDay(operatorDate));
                    operatorDate.setDate(operatorDate.getDate() - 1);
                } while (_day > 0)
            }
            if (lastDay.getDay() < 6) {
                row = contentTable.rows[contentTable.rows.length - 1];
                operatorDate = new Date(focusDateTime.getFullYear(), focusDateTime.getMonth() + 1, 1);

                while ((_day = operatorDate.getDay()) > 0) {
                    row.cells[_day].appendChild(addCalendarDay(operatorDate));
                    operatorDate.setDate(operatorDate.getDate() + 1);
                }
            }
        };
        this.createTitle = function () {
            return calendar.lang["m" + focusDateTime.getMonth()] + " " + focusDateTime.getFullYear();
        };
        this.drawEvents = function (calendarContent) {

            var rowSize = calendarContent.rows.length,
                cellSize = calendarContent.rows[0].cells.length,
                i, j, k, row, cell, _date, _dateEvents, classifyProp,
                moreOptionsLimit = 6, meetLimit, eventBox, eventDiv,
                orderEventDivArray, orderEventDivArrayLen, longEventIndexRecord, fillIndex, indexToBeDel,
                firstCell = calendarContent.rows[0].cells[0];
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;

            for (i = 0; i < rowSize; i++) {
                row = calendarContent.rows[i];
                longEventIndexRecord = {};

                for (j = 0; j < cellSize; j++) {
                    cell = row.cells[j];

                    _date = new Date(parseInt(cell.firstChild.dataset.date));
                    classifyProp = _date.getFullYear() + "/" + _date.getMonth();
                    if (calendar.events.hasOwnProperty(classifyProp)) {

                        _dateEvents = calendar.events[classifyProp].filter(function (evt) {
                            return evt.isEventDate(_date);
                        });

                        if (_dateEvents.length) {
                            eventBox = cell.querySelector(".EventCalendar_Day_Events");
                            orderEventDivArray = [];
                            indexToBeDel = [];

                            _dateEvents.forEach(function (evt) {
                                eventDiv = evt.render();
                                eventDiv.classList.add("EventCalendar_Evt_Day");
                                eventDiv.style.fontSize = Math.round(12 * fontSizeRate) + "px";

                                if (!evt.is_one_day_event && _date.toDateString() !== evt.date_init.toDateString() && cell !== firstCell) {
                                    eventDiv.appendChild(document.createTextNode('\u00A0'));
                                } else {
                                    appendEventContent(eventDiv, evt.createContentText(clockHour));
                                    if (!evt.is_one_day_event) {
                                        eventDiv.style.overflowX = "visible";
                                    }
                                }

                                var found = false;
                                if (!evt.is_one_day_event) {
                                    var _index, recordedId;
                                    for (_index in longEventIndexRecord) {
                                        recordedId = longEventIndexRecord[_index];
                                        if (recordedId === evt.eventId) {
                                            found = true;
                                            fillIndex = parseInt(_index);
                                            break;
                                        }
                                    }
                                }


                                if (!found) {
                                    fillIndex = 0;
                                    while (longEventIndexRecord.hasOwnProperty(fillIndex + "")) {
                                        fillIndex++;
                                    }
                                }

                                if (!evt.is_one_day_event) {
                                    if (evt.date_end.getDate() === _date.getDate() &&
                                        evt.date_end.getMonth() === _date.getMonth() &&
                                        evt.date_end.getFullYear() === _date.getFullYear()) {
                                        indexToBeDel.push(fillIndex);
                                    } else {
                                        longEventIndexRecord[fillIndex + ""] = evt.eventId;
                                    }
                                } else {
                                    longEventIndexRecord[fillIndex + ""] = evt.eventId;
                                    indexToBeDel.push(fillIndex);
                                }

                                orderEventDivArray[fillIndex] = eventDiv;
                            });

                            indexToBeDel.forEach(function (delIndex) {
                                delete longEventIndexRecord[delIndex + ""];
                            });

                            meetLimit = orderEventDivArray.length > moreOptionsLimit;
                            for (k = 0, orderEventDivArrayLen = orderEventDivArray.length; k < orderEventDivArrayLen; k++) {
                                eventDiv = orderEventDivArray[k];
                                if (!eventDiv) {
                                    eventDiv = document.createElement('DIV');
                                    eventDiv.appendChild(document.createTextNode('\u00A0'));
                                    eventDiv.classList.add("EventCalendar_Evt_Filler");
                                    eventDiv.style.fontSize = Math.round(12 * fontSizeRate) + "px";
                                }
                                eventBox.appendChild(eventDiv);
                                if (meetLimit && k + 1 >= moreOptionsLimit) {
                                    eventDiv.classList.add("EventCalendar_Evt_Hide");
                                }
                            }
                            if (meetLimit) {
                                eventBox.appendChild(createAddMore(_date));
                            }
                        }

                    }

                }

            }
        };

        /**
         * @param date
         * @returns {Element} to describe day and day events.
         */
        function addCalendarDay(date) {
            var contentBox = document.createElement('DIV'),
                topBar = document.createElement('DIV'),
                eventContent = document.createElement('DIV');
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;

            contentBox.classList.add("EventCalendar_Day");
            topBar.classList.add("EventCalendar_Day_Top_Bar");
            topBar.style.fontSize = Math.round(12*parseFloat(fontSizeRate)) + "px";
            eventContent.classList.add("EventCalendar_Day_Events");


            contentBox.dataset.date = date.getTime();

            contentBox.appendChild(topBar);
            contentBox.appendChild(eventContent);

            if (date.getMonth() !== focusDateTime.getMonth()) {
                contentBox.classList.add("EventCalendar_Day_Out_Focus");
            }
            var now = new Date();
            if (date.getDate() === now.getDate() &&
                date.getMonth() === now.getMonth() &&
                date.getFullYear() === now.getFullYear()) {
                contentBox.classList.add("EventCalendar_Day_Today");
            }

            contentBox.id = "EventCalendar" + date.getMonth() + date.getDate();
            topBar.appendChild(document.createTextNode(date.getDate()));

            return contentBox;
        }

        function createAddMore(dateTime) {
            var moreOption = document.createElement('DIV');
            moreOption.appendChild(document.createTextNode('more'));
            moreOption.classList.add("EventCalendar_Evt_more");
            moreOption.classList.add("printHide");
            moreOption.dataset.date = dateTime.getTime();
            moreOption.addEventListener('click', showMoreEvents);
            return moreOption;
        }

        /**
         * Call custom function to display all CalendarEvents in a chosen date.
         * @param event
         */
        function showMoreEvents(event) {
            cancelEventBubble(event);

            var date_more = new Date(parseInt(this.dataset.date)),
                dateProp = date_more.getFullYear() + "/" + date_more.getMonth();

            if (calendar.events.hasOwnProperty(dateProp) && calendar.eventMoreFunc) {
                var _monthEvents = calendar.events[dateProp];
                calendar.eventMoreFunc(_monthEvents.filter(function (evt) {
                    return evt.isEventDate(date_more);
                }));
            }
        }
    }


    CalendarMonthView.prototype = Object.create(CalendarView.prototype);
    CalendarMonthView.prototype.constructor = CalendarMonthView;
    var CALENDAR_MONTH_VIEW = new CalendarMonthView();

    function CalendarWeekView() {
        CalendarView.call(this);
        //周_日期
        this.drawHeader = function (table) {
            var headerRow = table.insertRow(-1),
                cell = headerRow.insertCell(-1);
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;

            cell.classList.add('EventCalendar_Corner_Cell');
            cell.style.fontSize = Math.round(16*fontSizeRate) + "px";

            var firstDay = focusDateTime.getDate() - focusDateTime.getDay(),
                adder = 0;
            for (; adder < 7; adder++) {
                var day = new Date(focusDateTime.getTime());
                day.setDate(firstDay + adder);
                cell = headerRow.insertCell(-1);
                cell.appendChild(document.createTextNode(
                    (day.getMonth() + 1) + '/' + day.getDate() + " " + calendar.lang[('d' + adder)]));
            }
        };
        //時間
        this.drawTimeSection = function (contentTable) {
            var rowIndex = 0, timeSectionSize = (time_view_end_time - time_view_init_time) / timeSplit,
                operateTime = time_view_init_time, usedSuffix = am_suffix, row, cell, timeDiv,
                now = new Date(), _time,
                firstDay = focusDateTime.getDate() - focusDateTime.getDay(), dayIndex;
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;


            // draw all day sections
            row = contentTable.insertRow(-1);
            // draw all day section left side unit indicator
            cell = row.insertCell(-1);
            cell.classList.add("EventCalendar_DayTime_Indicator");
            cell.style.fontSize = Math.round(16*fontSizeRate) + "px";
            cell.appendChild(document.createTextNode(calendar.lang.all_day));
            // draw rest all day section
            for (dayIndex = 0; dayIndex < 7; dayIndex++) {
                cell = row.insertCell(-1);
                timeDiv = document.createElement('DIV');
                cell.appendChild(timeDiv);

                _time = new Date(focusDateTime.getTime()); // setDate may cross the month, so reset _time is required.
                _time.setDate(firstDay + dayIndex);

                timeDiv.classList.add("EventCalendar_Time_All_Day");
                timeDiv.dataset.date = _time.getTime();
                timeDiv.id = "EventCalendar" + _time.getMonth() + _time.getDate();

                if (_time.getDate() === now.getDate() &&
                    _time.getMonth() === now.getMonth() &&
                    _time.getFullYear() === now.getFullYear()) {
                    cell.classList.add("EventCalendar_Time_Today");
                }
            }

            for (; rowIndex < timeSectionSize; rowIndex++) {
                // draw left side unit indicator
                row = contentTable.insertRow(-1);
                cell = row.insertCell(-1);
                cell.classList.add("EventCalendar_DayTime_Indicator");
                cell.style.fontSize = Math.round(16*fontSizeRate) + "px";
                if (Number.isInteger(operateTime)) {
                    if(showTimelines && timeSplit!==1) row.style.borderTop = "2px dashed rgba(193, 193, 193, 0.7)";

                    if(clockHour==12){
                        cell.appendChild(document.createTextNode(parseInt(operateTime > 12 ? operateTime - 12 : operateTime) + usedSuffix));
                    }else{
                        cell.appendChild(document.createTextNode(parseInt(operateTime )));
                    }
                } else {
                    cell.appendChild(document.createTextNode('\u00A0'));
                }


                // draw data table
                for (dayIndex = 0; dayIndex < 7; dayIndex++) {
                    cell = row.insertCell(-1);
                    timeDiv = document.createElement('DIV');
                    cell.appendChild(timeDiv);

                    _time = new Date(focusDateTime.getTime());
                    _time.setDate(firstDay + dayIndex);
                    _time.setHours(Math.floor(operateTime));
                    _time.setMinutes(60 * (operateTime % 1));

                    timeDiv.classList.add("EventCalendar_Time");
                    timeDiv.dataset.date = _time.getTime();
                    timeDiv.id = "EventCalendar" + _time.getMonth() + _time.getDate() +
                        _time.getHours() + _time.getMinutes();


                    if (_time.getDate() === now.getDate() && _time.getMonth() === now.getMonth() &&
                        _time.getFullYear() === now.getFullYear()) {
                        cell.classList.add("EventCalendar_Time_Today");
                    }
                }

                operateTime += timeSplit;
                if (operateTime > 12) usedSuffix = pm_suffix;
            }


        };
        this.createTitle = function () {
            var firstDay = focusDateTime.getDate() - focusDateTime.getDay(),
                lastDay = firstDay + 6,
                _firstDate = new Date(focusDateTime.getTime()),
                _lastDate = new Date(focusDateTime.getTime());
            _firstDate.setDate(firstDay);
            _lastDate.setDate(lastDay);

            return focusDateTime.getFullYear() + " " +
                calendar.lang["m" + _firstDate.getMonth()] + _firstDate.getDate() + " — " +
                (_firstDate.getMonth() === _lastDate.getMonth() ? "" : calendar.lang["m" + _lastDate.getMonth()]) +
                _lastDate.getDate();
        };
        this.drawEvents = function (calendarContent) {
            var firstDay = focusDateTime.getDate() - focusDateTime.getDay(),
                lastDay = firstDay + 6,
                _date = new Date(focusDateTime.getTime()),
                _lastDate = new Date(focusDateTime.getTime()),
                classifyProp, _dateEvents;
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;
            _date.setDate(firstDay);
            _date.setHours(0, 0, 0, 0);
            _lastDate.setDate(lastDay + 1);
            _lastDate.setHours(0, 0, 0, 0);

            while (_date.getTime() < _lastDate.getTime()) {
                classifyProp = _date.getFullYear() + "/" + _date.getMonth();
                if (calendar.events.hasOwnProperty(classifyProp)) {
                    _dateEvents = calendar.events[classifyProp].filter(function (evt) {
                        return evt.isEventDate(_date);
                    });
                    _dateEvents.forEach(function (evt) {
                        if (!evt.is_one_day_event || (evt.is_one_day_event && !evt.date_end) ||
                            (evt.date_end && ((evt.date_end.getHours() + evt.date_end.getMinutes() / 60) <= time_view_init_time ||
                                evt.date_init.getHours() >= time_view_end_time))) {

                            // all day event
                            var dayEvent = evt.render(),
                                _dayText = evt.date_end ? evt.content : evt.createContentText(clockHour),
                                allDayContainer = calendarContent.rows[0].cells[_date.getDay() + 1].firstChild;
                            if (allDayContainer) {
                                allDayContainer.appendChild(dayEvent);
                                appendEventContent(dayEvent, _dayText);
                                dayEvent.classList.add('EventCalendar_Evt_Time_All_Day');
                                dayEvent.style.fontSize = Math.round(14 * fontSizeRate) + "px";
                            }
                        } else {
                            var eventInitTimeSection = Math.max(evt.date_init.getHours() + evt.date_init.getMinutes() / 60, time_view_init_time),
                                eventEndTimeSection = Math.min(evt.date_end.getHours() + evt.date_end.getMinutes() / 60, time_view_end_time),
                                timeEvent = evt.render(),
                                crossHeight = (Math.ceil(eventEndTimeSection / timeSplit) * timeSplit -
                                    (eventInitTimeSection - eventInitTimeSection % timeSplit)) / timeSplit * time_div_height,
                                container = calendarContent.querySelector("#EventCalendar" + evt.date_init.getMonth() +
                                    evt.date_init.getDate() + parseInt(eventInitTimeSection) + (evt.date_init.getMinutes() - evt.date_init.getMinutes() % (60 * timeSplit)));

                            if (container) {
                                var eventTable = container.querySelector('.EventCalendar_Evt_Time_Table');
                                if (!eventTable) {
                                    eventTable = document.createElement('TABLE');
                                    eventTable.classList.add('EventCalendar_Evt_Time_Table');
                                    container.appendChild(eventTable);
                                    eventTable.insertRow(-1);
                                }

                                if (eventTable.rows[0].cells.length === 1) {
                                    var firstDiv = eventTable.rows[0].cells[0].querySelector('DIV');
                                    firstDiv.style.width = "";
                                }

                                timeEvent.style.height = crossHeight + "px";
                                timeEvent.style.zIndex = eventInitTimeSection * 2;
                                if (eventTable.rows[0].cells.length === 0) {
                                    timeEvent.style.width = "65%";
                                }
                                appendEventContent(timeEvent, evt.createContentText(clockHour));
                                timeEvent.classList.add('EventCalendar_Evt_Time');
                                timeEvent.style.fontSize = Math.round(14*fontSizeRate) + "px";
                                var cell = eventTable.rows[0].insertCell(-1);
                                cell.appendChild(timeEvent);
                            }
                        }
                    });
                }

                _date.setDate(_date.getDate() + 1);
            }
        };
    }

    CalendarWeekView.prototype = Object.create(CalendarView.prototype);
    CalendarWeekView.prototype.constructor = CalendarWeekView;
    var CALENDAR_WEEK_VIEW = new CalendarWeekView();

    function CalendarDayView() {
        CalendarView.call(this);
        this.drawHeader = function (table) {
            var headerRow = table.insertRow(-1),
                firstCell = headerRow.insertCell(-1),
                DayCell = headerRow.insertCell(-1);
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;
            firstCell.classList.add('EventCalendar_Corner_Cell');
            firstCell.style.fontSize = Math.round(16*fontSizeRate) + "px";
            DayCell.appendChild(document.createTextNode((focusDateTime.getMonth() + 1) + "/" + focusDateTime.getDate() +
                " " + calendar.lang[('d' + focusDateTime.getDay())]));

        };
        this.drawTimeSection = function (contentTable) {
            var rowIndex = 0, timeSectionSize = (time_view_end_time - time_view_init_time) / timeSplit,
                operateTime = time_view_init_time, usedSuffix = am_suffix, row, cell, timeDiv,
                now = new Date(), _time = new Date(focusDateTime.getTime());
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;

            var isToday = false;
            if (_time.getDate() === now.getDate() && _time.getMonth() === now.getMonth() &&
                _time.getFullYear() === now.getFullYear()) {
                isToday = true;
            }

            // draw all day sections
            row = contentTable.insertRow(-1);
            // draw all day section left side unit indicator
            cell = row.insertCell(-1);
            cell.classList.add("EventCalendar_DayTime_Indicator");
            cell.style.fontSize = Math.round(16*fontSizeRate) + "px";
            cell.appendChild(document.createTextNode(calendar.lang.all_day));
            // draw rest all day section
            cell = row.insertCell(-1);
            timeDiv = document.createElement('DIV');
            cell.appendChild(timeDiv);
            timeDiv.classList.add("EventCalendar_Time_All_Day");
            timeDiv.dataset.date = _time.getTime();
            timeDiv.id = "EventCalendar" + _time.getMonth() + _time.getDate();
            if (isToday) {
                cell.classList.add("EventCalendar_Time_Today");
            }

            for (; rowIndex < timeSectionSize; rowIndex++) {
                // draw left side unit indicator
                row = contentTable.insertRow(-1);
                cell = row.insertCell(-1);
                cell.classList.add("EventCalendar_DayTime_Indicator");
                cell.style.fontSize = Math.round(16*fontSizeRate) + "px";
                if (Number.isInteger(operateTime)) {
                    if(showTimelines) row.style.borderTop = "2px dashed rgba(193, 193, 193, 0.7)";
                    if(clockHour==12){
                        cell.appendChild(document.createTextNode(parseInt(operateTime > 12 ? operateTime - 12 : operateTime) + usedSuffix));
                    }else{
                        cell.appendChild(document.createTextNode(parseInt(operateTime )));
                    }
                } else {
                    cell.appendChild(document.createTextNode('\u00A0'));
                }


                // draw data cell
                cell = row.insertCell(-1);
                timeDiv = document.createElement('DIV');
                cell.appendChild(timeDiv);
                timeDiv.classList.add("EventCalendar_Time");
                if (isToday) {
                    cell.classList.add("EventCalendar_Time_Today");
                }
                _time.setHours(Math.floor(operateTime));
                _time.setMinutes(60 * (operateTime % 1));

                timeDiv.dataset.date = _time.getTime();
                timeDiv.id = "EventCalendar" + _time.getMonth() + _time.getDate() +
                    _time.getHours() + _time.getMinutes();


                operateTime += timeSplit;
                if (operateTime > 12) usedSuffix = pm_suffix;
            }
        };
        this.createTitle = function () {
            return focusDateTime.getFullYear() + "/" + (focusDateTime.getMonth() + 1) + "/" + focusDateTime.getDate() +
                " (" + calendar.lang[('d' + focusDateTime.getDay())] + ")";
        };
        this.drawEvents = function (calendarContent) {
            var _date = new Date(focusDateTime.getTime()), classifyProp, _dateEvents;
            let fontSizeRate = $('cnt_reportFontSize')?parseFloat($('cnt_reportFontSize').value):fontSizeScale;
            _date.setHours(0, 0, 0, 0);

            classifyProp = _date.getFullYear() + "/" + _date.getMonth();
            if (calendar.events.hasOwnProperty(classifyProp)) {
                _dateEvents = calendar.events[classifyProp].filter(function (evt) {
                    return evt.isEventDate(_date);
                });
                _dateEvents.forEach(function (evt) {
                    if (!evt.is_one_day_event || (evt.is_one_day_event && !evt.date_end) ||
                        (evt.date_end && ((evt.date_end.getHours() + evt.date_end.getMinutes() / 60) <= time_view_init_time ||
                            evt.date_init.getHours() >= time_view_end_time))) {

                        // all day event
                        var dayEvent = evt.render(),
                            _dayText = evt.date_end ? evt.content : evt.createContentText(clockHour),
                            allDayContainer = calendarContent.rows[0].cells[1].firstChild;
                        if (allDayContainer) {
                            allDayContainer.appendChild(dayEvent);
                            appendEventContent(dayEvent, _dayText);
                            dayEvent.classList.add('EventCalendar_Evt_Time_All_Day');
                            dayEvent.style.fontSize = Math.round(14*fontSizeRate)+ "px";
                        }
                    } else {
                        var eventInitTimeSection = Math.max(evt.date_init.getHours() + evt.date_init.getMinutes() / 60, time_view_init_time),
                            eventEndTimeSection = Math.min(evt.date_end.getHours() + evt.date_end.getMinutes() / 60, time_view_end_time),
                            timeEvent = evt.render(),
                            crossHeight = (Math.ceil(eventEndTimeSection / timeSplit) * timeSplit -
                                (eventInitTimeSection - eventInitTimeSection % timeSplit)) / timeSplit * time_div_height,
                            container = calendarContent.querySelector("#EventCalendar" + evt.date_init.getMonth() +
                                evt.date_init.getDate() + parseInt(eventInitTimeSection) + (evt.date_init.getMinutes() - evt.date_init.getMinutes() % (60 * timeSplit)));

                        if (container) {
                            var eventTable = container.querySelector('.EventCalendar_Evt_Time_Table');
                            if (!eventTable) {
                                eventTable = document.createElement('TABLE');
                                eventTable.classList.add('EventCalendar_Evt_Time_Table');
                                container.appendChild(eventTable);
                                eventTable.insertRow(-1);
                            }

                            if (eventTable.rows[0].cells.length === 1) {
                                var firstDiv = eventTable.rows[0].cells[0].querySelector('DIV');
                                firstDiv.style.width = "";
                            }

                            timeEvent.style.height = crossHeight + "px";
                            timeEvent.style.zIndex = eventInitTimeSection * 2;
                            timeEvent.style.fontSize = Math.round(14*fontSizeRate) + "px";
                            if (eventTable.rows[0].cells.length === 0) {
                                timeEvent.style.width = "65%";
                            }
                            appendEventContent(timeEvent, evt.createContentText(clockHour));
                            timeEvent.classList.add('EventCalendar_Evt_Time');
                            var cell = eventTable.rows[0].insertCell(-1);
                            cell.appendChild(timeEvent);
                        }
                    }
                });
            }
        };
    }

    CalendarDayView.prototype = Object.create(CalendarView.prototype);
    CalendarDayView.prototype.constructor = CalendarDayView;
    var CALENDAR_DAY_VIEW = new CalendarDayView();


    var _eventId = 0;

    function CalendarEvent(arg) {
        this.content = typeof arg.content === 'string' && arg.content.length ? arg.content : '\u00A0';
        this.date_init = new Date(arg.date_init);
        this.date_init_format_date_only = typeof arg.date_init === 'string' && arg.date_init.indexOf(":") === -1;
        this.date_end = arg.date_end ? new Date(arg.date_end) : null;
        this.date_end_format_date_only = false;
        this.is_one_day_event = true;
        if (this.date_end) {
            if (this.date_end.getTime() <= this.date_init.getTime()) {// invalid end date
                this.date_end = null;
            } else {
                this.date_end_format_date_only = typeof arg.date_end === 'string' && arg.date_end.indexOf(":") === -1;
                this.is_one_day_event = this.date_end.toDateString() === this.date_init.toDateString();
            }
        }
        this.eventId = _eventId++;

        this.path = arg.path;
        this.sheetIndex = arg.sheetIndex;
        this.nodeId = arg.nodeId;
        this.optional = arg.optional;
        if (!this.optional) this.optional = {};
    }

    CalendarEvent.prototype.render = function () {
        var contentBox = document.createElement('DIV');

        if (calendar.eventRenderFunc) {
            calendar.eventRenderFunc(contentBox, this);
        }
        if (this.optional.hasOwnProperty('eventColor')) {
            contentBox.style.backgroundColor = this.optional.eventColor;
        }
        if (this.optional.hasOwnProperty('eventFontColor')) {
            contentBox.style.color = this.optional.eventFontColor;
        }

        return contentBox;
    };

    CalendarEvent.prototype.isEventDate = function (datetime, compareTimePart) {
        var _init = this.date_init, _end = this.date_end;
        if (compareTimePart) {
            if (this.date_end) {
                if (this.date_end_format_date_only) {
                    _end = new Date(this.date_end.getTime());
                    _end.setDate(_end.getDate() + 1);
                    _end.setHours(0, 0, 0, 0);
                    return datetime.getTime() >= _init.getTime() &&
                        datetime.getTime() < _end.getTime();
                } else {
                    return datetime.getTime() >= _init.getTime() &&
                        datetime.getTime() <= _end.getTime();
                }
            } else {
                return datetime.getTime() === _init.getTime();
            }
        } else {
            datetime.setHours(0, 0, 0, 0);
            if (_end) {
                if (!this.date_init_format_date_only || !this.date_end_format_date_only) {
                    _init = new Date(this.date_init.getTime());
                    _end = new Date(this.date_end.getTime());
                    _init.setHours(0, 0, 0, 0);
                    _end.setHours(0, 0, 0, 0);
                }

                return datetime.getTime() >= _init.getTime() &&
                    datetime.getTime() <= _end.getTime();
            } else {
                if (!this.date_init_format_date_only) {
                    _init = new Date(this.date_init.getTime());
                    _init.setHours(0, 0, 0, 0);
                }
                return datetime.getTime() === _init.getTime();
            }
        }
    };

    //行事曆事件文字內容
    CalendarEvent.prototype.createContentText = function (clockHour) {
        var initHours = this.date_init.getHours(),
            minutes = this.date_init.getMinutes(),
            timeText;
        if (initHours >= 0&&!this.date_init_format_date_only) {
            if(clockHour==12){
                if(initHours==0){
                    timeText = am_suffix + "12";
                }else if(initHours == 12){
                    timeText = pm_suffix + (initHours);
                } else if (initHours > 12) {
                    timeText = pm_suffix + (initHours - 12);
                }else {
                    timeText = am_suffix + initHours;
                }
                timeText += ':' + (minutes < 10 ? '0' + minutes : minutes);
                return '(' + timeText + ') ' + this.content;
            }else if(clockHour==24){
                timeText =initHours+ ':' + (minutes < 10 ? '0' + minutes : minutes);
                return '[' + timeText + ']' + this.content;
            }else{
                return  this.content;
            }

        } else {
            return this.content;
        }
    };

    /**
     * Allow to insert new lines from content with line separators
     * @param contentDiv
     * @param text
     */
    function appendEventContent(contentDiv, text) {
        text.match(/[^\r\n]+/g).reduce(function (div, text, index) {
            if (index > 0) {
                div.appendChild(document.createElement("BR"));
            }
            div.appendChild(document.createTextNode(text));
            return div;
        }, contentDiv);
    }

    return calendar;
})();