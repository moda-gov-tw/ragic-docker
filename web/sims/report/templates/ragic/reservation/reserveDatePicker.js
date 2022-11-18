const isIE = typeof setImmediate == "function";

function ReserveCalendar() {
    this.myDate = new Date();
    this.today = reserved_simpleFormatDate(this.myDate);
    this.lastFocusDateValue = null;
    this.focusDateValue = null;
    this.todayBackGroundColor = "#5e9cfb";
}
ReserveCalendar.prototype.addMonth = function (delta) {
    this.setMonth(this.myDate.getMonth() + delta);
};
ReserveCalendar.prototype.setNow = function () {
    this.myDate = new Date();
};
ReserveCalendar.prototype.setMonth = function (month) {
    this.myDate = new Date(this.myDate.getFullYear(), month, 1); // [Issue #9603] [Issue #9583] 12/31 + setMonth(2) = 02/31 = 03/03
};
ReserveCalendar.prototype.setYear = function (year) {
    this.myDate = new Date(year, this.myDate.getMonth(), this.myDate.getDate());
};
ReserveCalendar.prototype.reset = function () {
    this.myDate = new Date();
    this.today = reserved_simpleFormatDate(this.myDate);
};

//**********************************************************************************************************************

function ReserveMainDatePicker() {
    ReserveCalendar.call(this);
    this.statusCache = {};
    this.renderedTargetSelect = false;
    this.BOOKING_MODE = {START: 0, END: 1};  //Const
    this.bookingStart = null;
    this.bookingEnd = null;
    this.dateTimeFormat = "yyyy/MM/dd HH:mm:ss";
    this.dateTimeFormat2 = "yyyy/MM/dd HH:mm";
    this.timeFormat = "HH:mm";
    this.startModeHexColor = "#6ec0f8";
    this.endModeHexColor = "#ef5e5e";
    this.selfUser = false;
    this.setSelfUser = function (val, notChangeClass) {
        this.selfUser = val;

        if(!notChangeClass) {
            $$('.timeBlock', this.bookingDisplayedSchedule).forEach(function (timeBlock) {
                if(val) {
                    timeBlock.className = timeBlock.className.replace(/(bookedStart)/, "$1Self")
                        .replace(/(bookedInterval)/, "$1Self")
                        .replace(/(bookedEnd)/, "$1Self");
                }
                else {
                    timeBlock.className = timeBlock.className.replace(/(bookedStart)(Self)/, "$1")
                        .replace(/(bookedInterval)(Self)/, "$1")
                        .replace(/(bookedEnd)(Self)/, "$1");

                }
            });
        }
    };
}
ReserveMainDatePicker.prototype = Object.create(ReserveCalendar.prototype);
ReserveMainDatePicker.prototype.constructor = ReserveMainDatePicker;

ReserveMainDatePicker.prototype.init = function(config) {
    this.loadConfig(config);
    if (this.targetOptions.length > 0) {
        this.showMonth();
        this.renderReserveTimes();
    }
};

ReserveMainDatePicker.prototype.loadConfig = function (config) {
    if (config.hasOwnProperty("status")) {
        this.status = config.status;
    }
    if (config.hasOwnProperty("settings")) {
        this.increments = config.settings.increments;
        this.incrementsUnit = config.settings.incrementsUnit;

        let available = config.settings.available;
        this.availableType = available.type;
        if (this.availableType === 0) {
            this.availableDays = available.value.days;
            this.availableTimes = fixTimezoneOffset(available.value.times);
        }
        else {
            let customAvailableTimesCopy = deepCopy(available.value);
            this.availableDaysTimesMapping = Object.keys(customAvailableTimesCopy).reduce(function (mappingObj, key) {
                let timeInfo = customAvailableTimesCopy[key];
                timeInfo.value = fixTimezoneOffset(timeInfo.value);
                // timeInfo = Object.keys(timeInfo).reduce(function (obj , k) {
                //     if (k === "value") {
                //         obj[k] = fixTimezoneOffset(timeInfo[k]);
                //     }
                //     else {
                //         obj[k] = timeInfo[k];
                //     }
                //     return obj;
                // }, {});

                mappingObj[key] = timeInfo;
                return mappingObj;
            }, {});
            this.specificTimeDates = specificTimeDates;
        }
    }
    if (config.hasOwnProperty("targetOptions")) {
        this.targetOptions = config.targetOptions;
    }
    if (config.hasOwnProperty("focusDate")) {
        this.focusDateValue = config.focusDate;
    }
    if (config.hasOwnProperty("formInfo")) {
        this.apname = config.formInfo.apname;
        this.path = config.formInfo.path;
        this.sheetIndex = config.formInfo.sheetIndex;
    }
    if (config.hasOwnProperty("whoType")) {
        this.whoType = config.whoType;
    }
    if (config.hasOwnProperty("whoOptions")) {
        this.whoOptions = config.whoOptions;
    }
    if (config.hasOwnProperty("rightsDetails")) {
        this.rightsDetails = config.rightsDetails;
    }
    if (config.hasOwnProperty("canCreateData")) {
        this.canCreateData = config.canCreateData;
    }
    if (config.hasOwnProperty("fieldsName")) {
        this.fieldsName = config.fieldsName;
    }
};

ReserveMainDatePicker.prototype.addMonth = function (delta) {
    ReserveCalendar.prototype.addMonth.call(this, delta);
    this.showMonth();
};

ReserveMainDatePicker.prototype.showMonth = function() {
    let year = this.myDate.getFullYear();
    let month = this.myDate.getMonth();
    let firstMonthDay = new Date(year,month,1);
    let firstWeekDay = firstMonthDay.getDay();
    let newCursorDay = new Date(firstMonthDay.getTime());
    newCursorDay.setDate(firstMonthDay.getDate() - (firstWeekDay + 7 - firstDayOfAWeek) % 7);
    let cursorDay = newCursorDay;//new Date(firstMonthDay.getTime()-firstWeekDay*DAY_MILLI);
    let cursorDayValue = reserved_simpleFormatDate(cursorDay);
    let today = this.today;

    let div = node('div',null, 'datePickerRagic');

    //year month header
    let ymheader = node('table', null, 'ymheaderTable');
    let row,cell;
    row = ymheader.insertRow(-1);
    let monthSel = getMonthSelect(month, year);
    let prevMonth = node('span', null, 'btn-primary');prevMonth.innerHTML = '&nbsp;&lt;&nbsp;';
    let nextMonth = node('span', null, 'btn-primary');nextMonth.innerHTML = '&nbsp;&gt;&nbsp;';
//  let yearSel = getYearSel(this.myDate.getFullYear());yearSel.picker = this;yearSel.onchange = function(){this.picker.setYear(this.options[this.selectedIndex].value);};yearSel.onclick = function(){ctrl.dropWin = true;}
    cell = row.insertCell(-1);cell.appendChild(monthSel);
    cell = row.insertCell(-1);
    cell.style.textAlign = 'right';
    // cell.style.color = '#999';
    cell.appendChild(prevMonth);prevMonth.picker = this;prevMonth.onclick = function(){this.picker.addMonth(-1);};
    cell.appendChild(nextMonth);nextMonth.picker = this;nextMonth.onclick = function(){this.picker.addMonth(1);};

    if(firstMonthDay.getFullYear() === new Date(today).getFullYear() &&
        firstMonthDay.getMonth() === new Date(today).getMonth()) {
        prevMonth.classList.add('cannotSelect');
        prevMonth.onclick = null;
    }
//  cell = row.insertCell(-1);cell.appendChild(yearSel);
    div.appendChild(ymheader);

    //day table
    let table = node('table', null, 'calTable');
    div.appendChild(table);
    //weekday header
    row = table.insertRow(-1);
    let offsetDay = firstDayOfAWeek % 7;
    let weekdayArray = [];
    for(let i = 0; i < 7; i++){
        weekdayArray.push(lm["DAY_NAMES"][7+i]);
    }
    for(let i = 0; i < 7; i++){
        cell = row.insertCell(-1);
        cell.className = 'weekHeader';
        cell.innerHTML = weekdayArray[(i + offsetDay) % 7];
    }
    //start calendar
    let rowcount = 0,colcount = 0;
    let endThisMonth = false;
    let inThisMonth;

    while(!endThisMonth && rowcount < 6) {
        row = table.insertRow(-1);

        while(!endThisMonth && colcount < 7) {
            if(inThisMonth && cursorDay.getDate() === new Date(year, month+1, 0).getDate()) {  //this month's last date
                endThisMonth = true;
            }
            cell = row.insertCell(-1);
            cell.setAttribute('value',cursorDayValue);
            cell.pastDate = false;
            inThisMonth = cursorDay.getMonth() === month;

            //past date
            if(new Date(cursorDayValue).getTime() < new Date(today).getTime()) {
                cell.classList.add('cannotSelect');
                cell.pastDate = true;
            }
            if(inThisMonth) {  //in this month
                cell.innerHTML = cursorDay.getDate();  //only show dates in this month

                if(cursorDayValue === today) {
                    cell.style.backgroundColor = this.todayBackGroundColor;
                    cell.style.color = "white";
                }
                if(cursorDayValue === this.focusDateValue) cell.classList.add("focusDate");
                if(!cell.pastDate) {
                    if (this.isAvailable(cursorDay.getDay(), cursorDayValue)) {
                        this.loadTimeData(cursorDayValue);
                        if(this.fullUnAvailable(cursorDayValue)){
                            cell.classList.add('fullUnAvailable');
                        }
                        else{
                            cell.classList.add('available');
                        }
                        cell.onclick = this.datePickerFocusDate.bind(this, cell);
                    }
                }
            }
            //only show dates in this month
            else {
                cell.innerHTML = "";
                // cell.classList.add('notThisMonth');
            }

            newCursorDay = new Date(cursorDay.getTime());
            newCursorDay.setDate(cursorDay.getDate()+1);
            cursorDay = newCursorDay;//new Date(cursorDay.getTime()+DAY_MILLI);
            cursorDayValue = reserved_simpleFormatDate(cursorDay);
            colcount++;
        }
        rowcount++;
        colcount = 0;
    }

    let currentTime = createElement('p', {
        class: 'datePickerInfoText'
    });
    //IE doesn't support dateStyle and timeStyle
    resetTime(currentTime);
    div.appendChild(currentTime);

    let currentTimeZone = createElement('p', {
        class: 'datePickerInfoText',
        style: 'color: #9b9b9b; font-size: 12px;'
    }, [h('i', {class: ['fas', 'fa-globe-asia'], style: 'margin-right: 5px;'}),  reserveTimezone]);
    div.appendChild(currentTimeZone);

    let colorInfo = createElement('div', {
        attrs: {
            style: "display: flex; flex-wrap: wrap; padding: 10px; font-size: 14px; background-color: whitesmoke;"
        }
    });

    let colorInfo1 = node('div', null, 'colorInfoContainer');
    colorInfo1.innerHTML = "<div class='colorInfo' style='background-color: #5e9cfb;'></div> <span>" + lm['reserve_today'] + "</span>";

    let colorInfo2 = node('div', null, 'colorInfoContainer');
    colorInfo2.style.padding = '10px';
    colorInfo2.innerHTML = "<div class='colorInfo' style='border: 5px solid #365deb;'></div> <span>" + lm['reserve_focusDate'] + "</span>";

    let colorInfo3 = node('div', null, 'colorInfoContainer');
    colorInfo3.innerHTML = "<div class='colorInfo' style='background-color: #909090;'></div><span>" + lm['reserve_unAvailable'] + "</span>";

    colorInfo.appendChild(colorInfo1);
    colorInfo.appendChild(colorInfo2);
    colorInfo.appendChild(colorInfo3);

    div.appendChild(colorInfo);

    //add the div
    let reservationCalendar = $('reservationCalendar');
    reservationCalendar.innerHTML = '';
    reservationCalendar.appendChild(div);
};

ReserveMainDatePicker.prototype.datePickerFocusDate = function(cell) {
    let dateString = cell.getAttribute('value');
    let lastDateValue = this.focusDateValue;
    if(lastDateValue === dateString) return;
    this.lastFocusDateValue = lastDateValue;
    this.focusDateValue = dateString;
    cell.classList.add("focusDate");

    if(lastDateValue) {
        let lastFocusDateCell = document.querySelector(".calTable td[value='" + lastDateValue + "']");
        if(lastFocusDateCell) lastFocusDateCell.classList.remove('focusDate');
    }
    this.renderReserveTimes();
};

ReserveMainDatePicker.prototype.isAvailable = function (weekDay, date) {
    if (this.availableType === 0) {
        return this.availableDays.indexOf(weekDay) !== -1;
    }
    else if (this.availableType === 1) {
        let foundObj = this.specificTimeDates.find(function (obj) {
            return obj.days.includes(date);
        });

        return !foundObj && this.availableDaysTimesMapping[weekDay].isAvailable ||
            foundObj && foundObj.times.length > 0;
    }
};

ReserveMainDatePicker.prototype.loadTimeData = function (currentDate) {
    let t = this;
    if(t.statusCache.hasOwnProperty(currentDate)) return;

    let timePoints = [];
    let availableTimes;
    let increments = t.increments;
    let incrementsUnit = t.incrementsUnit;
    let currentDayjs = dayjs();
    let endDayjs = dayjs();
    let allTargets = t.targetOptions.slice();  //all the targets
    let statusCache = t.statusCache[currentDate] = {};
    let reservedBGC = '#3a95f3';

    if(t.availableType === 0) {
        availableTimes = t.availableTimes;
    }
    else {
        //specific date override
        let specificTimes = t.getSpecificDateTimes(currentDate);
        if(Array.isArray(specificTimes)) availableTimes = specificTimes;  //當日有特定時間
        else{
            let customTimeInfo = t.availableDaysTimesMapping[new Date(currentDate).getDay()];
            availableTimes = customTimeInfo.isAvailable ? customTimeInfo.value : [];
        }
    }

    for (let j = 0; j < availableTimes.length; j++) {
        let timeSection = availableTimes[j];
        let startTime = timeSection[0];
        let endTime = timeSection[1];
        let timePoint = [];

        currentDayjs = currentDayjs.hour(startTime.hour).minute(startTime.minute);
        endDayjs = endDayjs.hour(endTime.hour).minute(endTime.minute);
        while (currentDayjs.isBefore(endDayjs)) {
            timePoint.unshift(currentDayjs.formatWithJDF("HH:mm"));
            currentDayjs = currentDayjs.add(increments, incrementsUnit);
        }

        timePoints.unshift(timePoint);
    }

    currentDayjs = dayjs();

    for (let i = 0; i < allTargets.length; i++) {
        let showedTarget = allTargets[i];
        let timeArrays = statusCache[showedTarget] = [];
        let reserved_arrDesc = [], reserved_arrAsc = [];

        for (let j = 0; j < timePoints.length; j++) {
            let timeArray = [];
            timeArrays.push(timeArray);

            let timePoint = timePoints[j];
            let prevIsReserved = false, isReserved = false;
            let maxEndTime =  dayjs(currentDate + " " + timePoint[0] + ":00").add(increments, incrementsUnit).formatWithJDF(t.dateTimeFormat); //last time

            for(let timeIdx = 0; timeIdx < timePoint.length; timeIdx++) {
                let timeBlockInfo = {};
                timeArray.push(timeBlockInfo);
                timeBlockInfo.value = timePoint[timeIdx];

                let fullDateStartTime = currentDate + " " + timePoint[timeIdx] + ":00",
                    fullDateEndTime;
                let fullDateStartDayJS = dayjs(fullDateStartTime),  fullDateEndDayJS;

                if(timeIdx > 0){
                    fullDateEndTime = currentDate + " " + timePoint[timeIdx-1] + ":00";
                    fullDateEndDayJS = dayjs(fullDateEndTime);
                }
                else {  //the last time point
                    fullDateEndDayJS = fullDateStartDayJS.add(increments, incrementsUnit);
                }

                let isFutureTime = fullDateStartDayJS.isAfter(currentDayjs.subtract(currentDayjs.utcOffset(), 'minute').add(companyTimeZoneOffset, 'millisecond'));
                let reserved_status = {};

                isReserved = t.status.some(function (status) {
                    if (status.target === showedTarget &&
                        fullDateEndDayJS.isAfter(dayjs(status.startTime)) && fullDateStartDayJS.isBefore(dayjs(status.endTime))
                    ) {
                        reserved_status = JSON.parse(JSON.stringify(status));
                        return true;
                    }
                });
                let canView = true;
                let canEdit = true;
                if(isReserved) {
                    reserved_arrDesc.push({
                        fullDateStartTime: fullDateStartTime,
                        nodeId: reserved_status.nodeId
                    });
                    canView = t.rightsDetails[reserved_status.nodeId].canView;
                    canEdit = t.rightsDetails[reserved_status.nodeId].canEdit;
                }

                if (prevIsReserved && !isReserved) {
                    maxEndTime = fullDateStartDayJS.add(increments, incrementsUnit).formatWithJDF(t.dateTimeFormat);
                }
                prevIsReserved = isReserved;

                timeBlockInfo.isFutureTime = isFutureTime;
                timeBlockInfo.canView = canView;
                timeBlockInfo.canEdit = canEdit;
                timeBlockInfo.fullDateStartTime = fullDateStartTime;
                timeBlockInfo.reservedStatus = reserved_status;
                timeBlockInfo.maxEndTime = maxEndTime;
                timeBlockInfo.nodeId = isReserved ? reserved_status.nodeId : -1;

                if(isReserved && reserved_status.who) {
                    timeBlockInfo.isReserved = true;
                    timeBlockInfo.reservedWho = reserved_status.who;
                    timeBlockInfo.reservedWhoEmail = reserved_status.whoEmail;

                    if(canView) {
                        let whoEmail = t.whoType === "USER" ? timeBlockInfo.reservedWhoEmail : timeBlockInfo.reservedWho;
                        if((t.whoType === "USER" || t.whoType === "EMAIL_TEXT") && whoEmail === user) {
                            reservedBGC = '#f33a3a';
                        }
                        else{
                            reservedBGC = '#3a95f3';
                        }
                        timeBlockInfo.reservedBGC = reservedBGC;
                    }
                }
            }
        }

        reserved_arrAsc = deepCopy(reserved_arrDesc).reverse();
        for (let j = 0; j < timeArrays.length; j++) {
            let timeArray = timeArrays[j];
            for(let timeIdx = 0; timeIdx < timeArray.length; timeIdx++) {
                let timeInfo = timeArray[timeIdx];
                let firstDateTime = reserved_arrAsc.find(function (time) {
                    return time.nodeId === timeInfo.nodeId;
                });
                let lastDateTime = reserved_arrDesc.find(function (time) {
                    return time.nodeId === timeInfo.nodeId;
                });

                if(firstDateTime) {
                    timeInfo.startDateTime = firstDateTime.fullDateStartTime;
                }
                if(lastDateTime) {
                    timeInfo.endDateTime = dayjs(lastDateTime.fullDateStartTime).add(t.increments, t.incrementsUnit).formatWithJDF(t.dateTimeFormat);
                }
            }
        }
    }
};

ReserveMainDatePicker.prototype.fullUnAvailable = function (currentDate) {
    let statusArray = Object.values(this.statusCache[currentDate]).flat(2);
    if(statusArray.length === 0) return false;
    return statusArray.every(function(timeInfo){
        return timeInfo.isReserved;
    });
};

ReserveMainDatePicker.prototype.renderReserveTimes = function () {
    let reservationTimePicker = $('reservationTimePicker');
    if(this.lastFocusDateValue === this.focusDateValue) {
        reservationTimePicker.innerHTML = lm['reserve_choose_a_date'];
        return;
    }
    let reserveSchedule;

    if (this.renderedTargetSelect) {
        $("reservationTimePicker").querySelector("div:first-of-type").innerHTML = intlFormatDate(this.focusDateValue, this.today);
        reserveSchedule = $("reserveSchedule");
        reserveSchedule.innerHTML = "";
    }
    else {
        reservationTimePicker.innerHTML = "";
        reserveSchedule = node('div', 'reserveSchedule');

        let focusDate = createElement('div', {
            attrs: {
                style: "margin-bottom: 20px; font-size: 30px;"
            },
            children: [intlFormatDate(this.focusDateValue, this.today)]
        });

        let targetSelect = node('select', "targetSelect");
        targetSelect.setAttribute("multiple", true);
        let targetOptions = this.targetOptions;
        let targets_to_show = JSON.parse(RagicStorage.localStorage.getItem("targets_to_show_" + reportKey));
        if(targets_to_show == null) {
            RagicStorage.localStorage.setItem("targets_to_show_" + reportKey, JSON.stringify(targetOptions));
            targets_to_show = targetOptions.slice();
        }

        targetOptions.forEach(function (targetOpt) {
            let selected = false;
            if(Array.isArray(targets_to_show)) {
                if(targets_to_show.includes(targetOpt)) selected = true;
            }
            else{
                selected = true;
            }
            targetSelect.add(new Option(targetOpt, targetOpt, false, selected));
        });

        let showAllBlock = node('div', "toggleAllReservedTargets");
        showAllBlock.style.display = "block";
        // showAllBlock.style.textAlign = "right";
        showAllBlock.style.fontSize = "12px";
        showAllBlock.innerHTML = "<a href='javascript:void(0);'></a>";


        let targetSelectContainer = createElement('div', {
            attrs: {
                style: "display: inline-block; margin-right: 50px;"
            },
            children: [showAllBlock, targetSelect]
        });

        let reserveScheduleContainer = node('div', 'reserveScheduleContainer');
        let bookingSchedule = node('div', 'bookingSchedule');
        let loadingContainer = createElement('div', {
            attrs: {
                class: 'loadingContainer',
                style: 'width: 800px; display: none;'
            },
            children: [node('div', null, 'loading')]
        })
        reserveScheduleContainer.style.height = "80%";
        reserveScheduleContainer.allSchedule = reserveSchedule;
        reserveScheduleContainer.bookingSchedule = bookingSchedule;
        reserveScheduleContainer.loading = loadingContainer;

        reserveScheduleContainer.appendChild(reserveSchedule);
        reserveScheduleContainer.appendChild(bookingSchedule);
        reserveScheduleContainer.appendChild(loadingContainer);

        reservationTimePicker.appendChild(focusDate);
        reservationTimePicker.appendChild(targetSelectContainer);
        reservationTimePicker.appendChild(reserveScheduleContainer);

        enableMultiSelectCombo($('targetSelect'));
    }
    this.renderedTargetSelect = true;


    if (!$('showSchedule')) {
        let showScheduleBtn = createElement('div', {
            attrs: {
                id: 'showSchedule',
                class: 'topButtonWhole',
                style: 'float: none;'
            },
            children: [lm["report_showSchedule"]]
        });
        showScheduleBtn.onclick = this.showSchedule.bind(this, true);
        reservationTimePicker.insertBefore(showScheduleBtn, reserveSchedule.parentNode);
    }

    this.showSchedule(true);
};

ReserveMainDatePicker.prototype.exitBooking = function () {
    this.bookingStart = null;
    this.bookingEnd = null;
    this.showingReserved = false;
};

ReserveMainDatePicker.prototype.resetBooking = function () {
    let t = this;
    t.exitBooking();
    t.createLightBoxes();
    t.renderPeriod();
    if(t.bookingMode === t.BOOKING_MODE.END) {
        t.toggleBookingMode();
    }
    t.resetTimePeriodBtn.style.visibility = "hidden";
};

ReserveMainDatePicker.prototype.showSchedule = function (init, ifClickBtn, statusInfo, bookingTarget) {
    let targetSelect = $("targetSelect");
    if(!targetSelect) return;

    let targets_to_show = [];
    let t = this;
    let displayedSchedule, hiddenSchedule;
    let reserveScheduleContainer = $('reserveScheduleContainer');
    let loading = reserveScheduleContainer.loading;
    let bookingStartDateTime, bookingEndDateTime, bookingMaxStartTime;
    let isBookingMode = statusInfo !== undefined && bookingTarget !== undefined;

    if(isBookingMode) {
        displayedSchedule = reserveScheduleContainer.bookingSchedule;
        hiddenSchedule = reserveScheduleContainer.allSchedule;
        bookingStartDateTime = statusInfo.startDateTime;
        bookingEndDateTime = statusInfo.endDateTime;
        bookingMaxStartTime = statusInfo.maxStartTime || statusInfo.startDateTime;
        t.bookingStart = dayjs(bookingStartDateTime);
        //only show this target when an user is going to make a reservation
        targets_to_show.push(bookingTarget);
    }
    else {
        displayedSchedule = reserveScheduleContainer.allSchedule;
        hiddenSchedule = reserveScheduleContainer.bookingSchedule;

        let multiComboFormElementDiv = targetSelect.querySelector(".multiComboFormElementDiv");
        if(multiComboFormElementDiv) {
            $$("input[type=checkbox]",multiComboFormElementDiv).forEach(function(e) {
                targets_to_show.push(e.value);
            });
        }

        RagicStorage.localStorage.setItem("targets_to_show_" + reportKey, JSON.stringify(targets_to_show));

        let toggleLink = document.querySelector("#toggleAllReservedTargets a");
        if(this.targetOptions.length !== targets_to_show.length) {
            toggleLink.innerHTML = getBundleString("showAllReservedTargets", [this.fieldsName["targetInfo"]]);
            toggleLink.onclick = toggleShowOrRemoveAllTargets.bind(toggleLink, true);
        }
        else {
            toggleLink.innerHTML = getBundleString("resetReservedTargets", [this.fieldsName["targetInfo"]]);
            toggleLink.onclick = toggleShowOrRemoveAllTargets.bind(toggleLink, false);
        }
    }

    if(targets_to_show.length === 0) {
        if(ifClickBtn) alert(lm['reserve_warning1']);
        else displayedSchedule.innerHTML = lm['reserve_warning1'];
    }
    else {
        if(reserveScheduleContainer.lastElementChild.id === 'unavailableTimesText') {
            reserveScheduleContainer.lastElementChild.style.display = 'none';
        }
        displayedSchedule.style.display = 'none';
        hiddenSchedule.style.display = 'none';
        loading.style.display = '';

        let displayFn = function() {
            displayedSchedule.style.display = 'flex';
            loading.style.display = 'none';
            if(!init && !isBookingMode) return;

            displayedSchedule.innerHTML = "";
            let timeBlockInfo = t.statusCache[t.focusDateValue];
            let timeBlockCount = 0;

            for (let i = 0; i < targets_to_show.length; i++) {
                let scheduleBlock = node('div');
                let scheduleBlockFragment = document.createDocumentFragment();
                let showedTarget = targets_to_show[i];

                if(!timeBlockInfo) break;
                let timePoints = deepCopy(timeBlockInfo[showedTarget]).reverse();

                let timePointParentContainer = isBookingMode ? createElement("div", {
                    attrs: {
                        id: "bookingTimeBlockParentContainer",
                        style: "height: 500px; overflow-y: auto; overflow-x: hidden; padding-right: " + (isIE || ctrl.isFF ? "30px;" : "10px;")
                    }
                }) : null;
                let timePointParent = isBookingMode ? createElement("div", {
                    attrs: {
                        id: "bookingTimeBlockParent",
                        style: "position: relative; padding: 10px; box-sizing: border-box; min-width: 200px;"
                    }
                }) : null;

                for (let j = 0; j < timePoints.length; j++) {
                    let timePoint = timePoints[j].reverse();
                    let prevIsReserved = false;
                    if (Array.isArray(timePoint) && timePoint.length === 0) continue;
                    let maxStartTime = dayjs(timePoint[0].fullDateStartTime).formatWithJDF(t.dateTimeFormat); //first start time

                    for(let timeIdx = 0; timeIdx < timePoint.length; timeIdx++) {
                        let timeInfo = timePoint[timeIdx];
                        let value = timeInfo.value;
                        let canView = timeInfo.canView;
                        let canEdit = timeInfo.canEdit;

                        let fullDateStartTime = timeInfo.fullDateStartTime;
                        let isReserved = !!(timeInfo.isReserved);
                        let reservedWho = timeInfo.reservedWho;
                        let reservedStatus = timeInfo.reservedStatus;

                        let maxEndTime = timeInfo.maxEndTime;
                        let nodeId = timeInfo.nodeId;
                        let reservedBGC = timeInfo.reservedBGC;
                        let isFutureTime = timeInfo.isFutureTime;
                        //only show the time in the future
                        if(!isFutureTime) continue;

                        if (prevIsReserved && !isReserved) {
                            maxStartTime = fullDateStartTime;
                        }
                        prevIsReserved = isReserved;

                        let timeBlock = createElement('div', {
                            attrs: {
                                style: (isReserved && reservedWho && canView) ? ('font-weight: 800; background-color: ' + reservedBGC + '') : '',
                                class: "timeBlock " + (isReserved && reservedWho ? (canView ? "reserved" : "cannotView") : fullDateStartTime === bookingStartDateTime ? "bookedStart" : ""),
                                "data-datetime": fullDateStartTime
                            },
                            children: [
                                        createElement('span', {
                                            attrs: {
                                                style: isReserved && reservedWho ? "margin-right:10px;" : ""
                                            },
                                            children: [value]
                                        }),
                                        isReserved && reservedWho ?
                                            (canView ?
                                                createElement('span', {
                                                    attrs: {
                                                        style: isBookingMode ? "" : "text-overflow: ellipsis; width: 50px; overflow-x: hidden; text-align: right;"
                                                    },
                                                    children: [reservedWho]
                                                }) : lm['reserve_isReserved']
                                            )
                                            : ""
                            ]
                        });

                        let info = {
                            apname: t.apname,
                            path: t.path,
                            sheetIndex: t.sheetIndex,
                            target: showedTarget,
                            status: JSON.stringify(reservedStatus),
                            isReserved: isReserved
                        };
                        timeBlock.onclick = isBookingMode && !isReserved ? t.booking.bind(t, timeBlock, info, canEdit) : t.showReservedDetail.bind(t, timeBlock, info, showedTarget, isBookingMode && isReserved, canView, canEdit);
                        timeBlock.dataset.maxEndTime = maxEndTime;
                        timeBlock.dataset.nodeId = nodeId;
                        if(timeInfo.startDateTime) {
                            timeBlock.dataset.startDateTime = timeInfo.startDateTime;
                        }
                        if(timeInfo.endDateTime) {
                            timeBlock.dataset.endDateTime = timeInfo.endDateTime;
                        }
                        if(isReserved && reservedWho) {
                            if(canView){
                                timeBlock.dataset.reservedColor = reservedBGC;
                            }
                        }
                        else {
                            timeBlock.dataset.maxStartTime = maxStartTime;
                        }

                        scheduleBlockFragment.appendChild(timeBlock);
                        timeBlockCount++;
                    }
                }
                if(isBookingMode) {
                    scheduleBlock.appendChild(timePointParentContainer);

                    if(timePointParent) {
                        timePointParent.appendChild(scheduleBlockFragment);
                        timePointParentContainer.appendChild(timePointParent);
                        Promise.resolve().then(function () {
                            timePointParent.appendChild(t.createLightBoxes(bookingMaxStartTime, bookingEndDateTime, true));
                        });
                    }
                    t.bookingDisplayedSchedule = scheduleBlock;
                }
                else {
                    scheduleBlock.appendChild(scheduleBlockFragment);
                }
                scheduleBlock.prepend(createElement('h3', {
                    attrs: {
                        style: "text-align: center;"
                    },
                    children: [showedTarget]
                }));

                displayedSchedule.appendChild(scheduleBlock);
            }

            //當日沒有可預約的時段時
            if(timeBlockCount === 0) {
                if(reserveScheduleContainer.lastElementChild.id === 'unavailableTimesText'){
                    reserveScheduleContainer.lastElementChild.style.display = '';
                }
                else{
                    reserveScheduleContainer.appendChild(createElement('h3', {
                        attrs: {
                            id: 'unavailableTimesText',
                            style: "text-align: center; color:grey; margin-top: 100px; letter-spacing: 2px;"
                        },
                        children: [lm['report_unavailable_daytimes']]
                    }));
                }
            }
        };

        if(bookingTarget !== void 0){
            displayFn();
        }
        else setTimeout(displayFn, 200);
    }
};

ReserveMainDatePicker.prototype.createLightBoxes = function(startDateTime, endDateTime, init) {
    let t = this;

    let lightBoxParent = node('div', "lightBox-mask");

    if(startDateTime !== undefined && endDateTime !== undefined) {
        endDateTime = dayjs(endDateTime).subtract(t.increments, t.incrementsUnit).formatWithJDF(t.dateTimeFormat);
        let bookingTimeBlockParent = $("bookingTimeBlockParent");
        let startBlock = bookingTimeBlockParent.querySelector("div.timeBlock[data-datetime='" + startDateTime + "']");

        //startBlock probably is null because maybe its a past time
        if(init) $("bookingTimeBlockParentContainer").scrollTop = startBlock ? startBlock.offsetTop - 10 : 0;

        $$("div.timeBlock", bookingTimeBlockParent).forEach(function (timeBlock) {
            timeBlock.style.zIndex = "";
            let dateTime = timeBlock.dataset.datetime;
            if(dayjs(dateTime).isSame(dayjs(startDateTime)) || dayjs(dateTime).isSame(dayjs(endDateTime)) || (dayjs(dateTime).isAfter(dayjs(startDateTime)) && dayjs(dateTime).isBefore(dayjs(endDateTime)))) {
                timeBlock.style.zIndex = "2";
            }

        });
    }
    else {  //multi light white box
        $$("div.timeBlock", $("bookingTimeBlockParent")).forEach(function (timeBlock) {
            if(!timeBlock.classList.contains("reserved")) timeBlock.style.zIndex = "2";
        });
    }

    return lightBoxParent;
}

ReserveMainDatePicker.prototype.booking = function (timeBlock, statusInfo, canEdit) {
    let t = this;
    if(!t.canCreateData) {
        floatWinWarning(lm["reserve_CannotCreateData"]);
        return;
    }
    let isSelfUser = t.selfUser;
    let isBookedStart = timeBlock.classList.contains(isSelfUser ? 'bookedStartSelf': 'bookedStart');
    let isBookedEnd = timeBlock.classList.contains(isSelfUser ? 'bookedEndSelf': 'bookedEnd');
    let currentTime = timeBlock.dataset.datetime;
    let maxStartTime = timeBlock.dataset.maxStartTime;
    let maxEndTime = timeBlock.dataset.maxEndTime;
    let scheduleBlock = t.bookingDisplayedSchedule;
    if(t.bookingMode === t.BOOKING_MODE.START) {
        if(isBookedStart) {  //取消這組開始時間~結束時間
            t.resetBooking();
            return;
        }
        else if(!t.bookingEnd || dayjs(currentTime).isBefore(t.bookingEnd)) {
            t.bookingStart = dayjs(currentTime);

            //支援自動切換
            if(!t.bookingEnd) {
                t.toggleBookingMode();
            }
            t.createLightBoxes(maxStartTime, maxEndTime);
            t.startEndModeSelect.style.visibility = "visible";
            t.resetTimePeriodBtn.style.visibility = "visible";
        }
        else {
            floatWinWarning(getBundleString('reserve_bookingMode_warning3', [t.bookingEnd.formatWithJDF(t.timeFormat)]));
            return;
        }
    }
    else {
        if(isBookedEnd) {  //只取消結束時間
            t.bookingEnd = null;
        }
        else {
            if(!t.bookingStart) {
                // t.bookingEnd = dayjs(currentTime);
                floatWinWarning(null, lm['reserve_bookingMode_warning5']);
            }
            else {
                let startDateTime = t.bookingStart.formatWithJDF(t.dateTimeFormat);
                let startTime = t.bookingStart.formatWithJDF(t.timeFormat);
                let maxEndTime = scheduleBlock.querySelector('div.timeBlock[data-datetime="' + startDateTime + '"]').dataset.maxEndTime;

                if(!dayjs(currentTime).isAfter(t.bookingStart) /* && !dayjs(currentTime).isSame(t.bookingStart) */) {
                    floatWinWarning(getBundleString('reserve_bookingMode_warning1', [startTime]));
                    return;
                }
                else if(!dayjs(currentTime).isBefore(maxEndTime)) {
                    t.cannotChooseTheTimeWarning(t.bookingStart, dayjs(maxStartTime), dayjs(currentTime));
                    return;
                }
                else
                    t.bookingEnd = dayjs(currentTime);
            }
        }
    }


    if(t.showingReserved) {
        statusInfo.startDateTime = currentTime;
        statusInfo.reportKey = reportKey;
        if(t.whoOptions) {
            statusInfo.whoOptions = t.whoOptions;
        }
        statusInfo.canEdit = canEdit;
        if(timeBlock.dataset.reservedColor) {
            statusInfo.reservedColor = timeBlock.dataset.reservedColor;
        }
        timeBlock.classList.add('bookedStartSelf');
        t._showReservedDetail(statusInfo, null, null, true);

        t.showingReserved = false;
    }
    else {
        t.renderPeriod();
    }
};

ReserveMainDatePicker.prototype.renderPeriod = function () {
    let t = this;
    let scheduleBlock = t.bookingDisplayedSchedule;
    let isSelfUser = t.selfUser;
    let bookingStart = dayjs(t.bookingStart),
        bookingEnd = dayjs(t.bookingEnd);

    let count = 0;
    $$('div.timeBlock', scheduleBlock).forEach(function(timeBlock) {
        let time = dayjs(timeBlock.dataset.datetime);
        timeBlock.classList.remove('bookedInterval', 'bookedStart', 'bookedEnd', 'bookedIntervalSelf', 'bookedStartSelf', 'bookedEndSelf');

        if(bookingStart.isValid() && bookingEnd.isValid() &&
            time.isAfter(bookingStart) && time.isBefore(bookingEnd)){
            timeBlock.classList.add(isSelfUser ? 'bookedIntervalSelf' : 'bookedInterval');
            count++;
        }
        else if(bookingStart.isValid() && time.isSame(bookingStart)){
            timeBlock.classList.add(isSelfUser ? 'bookedStartSelf' : 'bookedStart');
            count++;
        }
        else if(bookingEnd.isValid() && time.isSame(bookingEnd)){
            timeBlock.classList.add(isSelfUser ? 'bookedEndSelf' : 'bookedEnd');
            count++;
        }
    });

    t.bookingCount = count;
    t.changeStartEndTime();
}

ReserveMainDatePicker.prototype.cannotChooseTheTimeWarning = function (startTime, maxStartTime, currentTime) {
    let t = this;
    let timeBlockDateTimes = $$('.timeBlock', t.bookingDisplayedSchedule).filter(function(timeBlock) {
        let timeDayjs = dayjs(timeBlock.dataset.datetime);
        return timeDayjs.isSame(startTime) || timeDayjs.isSame(currentTime) ||  timeDayjs.isAfter(startTime) && timeDayjs.isBefore(currentTime);
    }).map(function(timeBlock) {
        return dayjs(timeBlock.dataset.datetime);
    });
    let firstTime, loopCurrentTime;
    let unavailableTimePeriods = [];

    for(let i = 0; i < timeBlockDateTimes.length; i++) {
        loopCurrentTime = timeBlockDateTimes[i];
        if(i === 0) firstTime = loopCurrentTime.clone();
        else if(!firstTime.add(t.increments, t.incrementsUnit).isSame(loopCurrentTime)) {
            let loopCurrentTimeString = loopCurrentTime.formatWithJDF(t.timeFormat);
            let unavailableTimePeriod = firstTime.add(t.increments, t.incrementsUnit).formatWithJDF(t.timeFormat) + " ~ " + loopCurrentTimeString;
            unavailableTimePeriods.push(unavailableTimePeriod);
        }
        firstTime = loopCurrentTime.clone();
    }

    if(unavailableTimePeriods.length > 0) {
        floatWinErrorWithConfirm(
            getBundleString('reserve_bookingMode_warning2_1', [unavailableTimePeriods.join(", "), maxStartTime.formatWithJDF(t.timeFormat)]),
            floatWinClose,
            lm["reserve_know"],
            function(){reserveDatePicker.resetBooking(); floatWinClose();},
            lm["reserve_resetTimePeriod"],
            null
        );
    }
    else {
        floatWinErrorWithConfirm(
            getBundleString('reserve_bookingMode_warning2_2', [maxStartTime.formatWithJDF(t.timeFormat), startTime.formatWithJDF(t.timeFormat)]),
            floatWinClose,
            lm["reserve_know"],
            function(){reserveDatePicker.resetBooking(); floatWinClose();},
            lm["reserve_resetTimePeriod"],
            null
        );
    }
};

ReserveMainDatePicker.prototype.changeStartEndTime = function () {
    let t = this;
    let startTime = t.bookingStart;
    let endTime = t.bookingEnd;

    if(!startTime && endTime) {
        startTime = endTime.clone();
    }

    if(endTime) {
        //t.bookingEnd 並非真正的結束時間，還要再加上一個時間單位
        endTime = endTime.clone().add(t.increments, t.incrementsUnit);
    }
    else if(startTime) {
        endTime = startTime.clone().add(t.increments, t.incrementsUnit);
    }

    if(!startTime && !endTime) {
        t.startTimeText.innerHTML = lm['report_startTime_plsChoose'];
        t.endTimeText.innerHTML = lm['report_endTime_plsChoose'];
        t.durationText.innerHTML = "";
        t.startTimeInput.value = "";
        t.endTimeInput.value = "";
    }
    else{
        let displayStartDateTime = startTime.formatWithJDF(t.dateTimeFormat);
        let displayStartDateTimeWithoutSecond = startTime.formatWithJDF(t.dateTimeFormat2);
        let displayStartTime = startTime.formatWithJDF(t.timeFormat);

        let displayEndDateTime = endTime.formatWithJDF(t.dateTimeFormat);
        let displayEndDateTimeWithoutSecond = endTime.formatWithJDF(t.dateTimeFormat2);
        let displayEndTime = endTime.formatWithJDF(t.timeFormat);

        t.startTimeInput.value = displayStartDateTime;
        t.endTimeInput.value = displayEndDateTime;

        t.startTimeText.innerHTML = displayStartDateTimeWithoutSecond;
        t.endTimeText.innerHTML = displayEndDateTimeWithoutSecond;
        t.durationText.innerHTML = t.bookingCount + "&nbsp;&nbsp;&nbsp;( " + displayStartTime + "~" + displayEndTime + " )";
    }
};

ReserveMainDatePicker.prototype.insertMouseOverCSS = function () {
    let styleSheet = document.styleSheets[document.styleSheets.length - 1];
    let length = styleSheet.cssRules.length;
    let t = this;
    let bookingMode = t.bookingMode;

    for(let i = 0; i < length; i++){
        styleSheet.deleteRule(0);
    }
    styleSheet.insertRule(
        "div#bookingSchedule .timeBlock:hover{" +
        "border: 2px dashed " + (bookingMode === t.BOOKING_MODE.START ? t.startModeHexColor : t.endModeHexColor) + ";" +
        // "z-index: 2;" +
        "}", 0);
};

/**
 * 回傳這個日期特定的開放時間，如果沒有，回傳 null
 * @param day
 * @returns {null|*}
 */
ReserveMainDatePicker.prototype.getSpecificDateTimes = function (day) {
    let specificTimeDates = this.specificTimeDates;
    for(let i = 0; i < specificTimeDates.length; i++){
        if(specificTimeDates[i].days.includes(day)){
            return fixTimezoneOffset(specificTimeDates[i].times);
        }
    }
    return null;
};

ReserveMainDatePicker.prototype.showReservedDetail = function (timeBlock, statusInfo, showedTarget, reservedBookingMode, canView, canEdit) {
    let t = this;
    if(statusInfo.isReserved && !canView) {
        floatWinWarning(lm["reserve_CannotView"]);
        return;
    }
    let startBooking = false;

    //有預約的話就是 timeBlock.dataset.startDateTime；沒預約的就是 timeBlock.dataset.datetime
    statusInfo.startDateTime = timeBlock.dataset.startDateTime || timeBlock.dataset.datetime;
    //有預約的話 timeBlock.dataset.maxStartTime 的值為 undefined
    statusInfo.maxStartTime = timeBlock.dataset.maxStartTime;
    //有預約的話就是 timeBlock.dataset.endDateTime；沒預約的就是 timeBlock.dataset.maxEndTime
    statusInfo.endDateTime = timeBlock.dataset.endDateTime || timeBlock.dataset.maxEndTime;
    statusInfo.reportKey = reportKey;
    if(t.whoOptions) {
        statusInfo.whoOptions = t.whoOptions;
    }
    if (t.fieldsName) {
        for (let info in t.fieldsName) {
            statusInfo[info] = t.fieldsName[info];
        }
    }
    statusInfo.canEdit = canEdit;
    if(timeBlock.dataset.reservedColor) {
        statusInfo.reservedColor = timeBlock.dataset.reservedColor;
    }

    if(reservedBookingMode) {  //在 bookingMode 中查看已經預約的資料
        $$('div.timeBlock', t.bookingDisplayedSchedule).forEach(function(timeBlock) {
            timeBlock.classList.remove('bookedInterval', 'bookedStart', 'bookedEnd', 'bookedIntervalSelf', 'bookedStartSelf', 'bookedEndSelf');
        });
        t.exitBooking();
        if(t.bookingMode === t.BOOKING_MODE.END) t.toggleBookingMode();
        t.createLightBoxes(statusInfo.startDateTime, statusInfo.endDateTime);
        t.startEndModeSelect.style.visibility = "hidden";
        t.resetTimePeriodBtn.style.visibility = "hidden";
    }
    else if(!statusInfo.isReserved && !t.canCreateData) {  //無法新增資料 (無法預約)
        floatWinWarning(lm["reserve_CannotCreateData"]);
        return;
    }
    else {  //開始預約
        startBooking = true;
    }

    if(statusInfo.isReserved) {
        t.showingReserved = true;
    }

    if(startBooking) {
        let reserveScheduleContainer = $('reserveScheduleContainer');
        let displayedSchedule = reserveScheduleContainer.allSchedule;
        let loading = reserveScheduleContainer.loading;

        displayedSchedule.style.display = 'none';
        loading.style.display = '';
    }

    t._showReservedDetail(statusInfo, startBooking, showedTarget);
};

ReserveMainDatePicker.prototype._showReservedDetail = function (statusInfo, startBooking, showedTarget, notChangeClass) {
    // console.log(statusInfo);
    let t = this;
    let bookingUI = $('bookingUI');
    if(bookingUI) bookingUI.innerHTML = "";
    // setTimeout(function() {
    getPromise("/sims/report/templates/ragic/reservation/reserveInfo.jsp", statusInfo).then(function (res) {
        if(startBooking) {
            t.showSchedule(false, false, statusInfo, showedTarget);
            t.renderStartEndModeSelect(statusInfo.isReserved);
        }
        bookingUI = $('bookingUI');
        bookingUI.innerHTML = res;

        t.startTimeInput = $("reserveInfo").querySelector("input.fields[type=hidden][name=startTime]");
        t.endTimeInput = $("reserveInfo").querySelector("input.fields[type=hidden][name=endTime]");
        t.startTimeText = $("startTime").querySelector("span");
        t.endTimeText  = $("endTime").querySelector("span");
        t.durationText = $("duration").querySelector("span");
        t.remarksText = $("remarks");

        t.setSelfUser($("reserveInfo").querySelector("input.fields[type=hidden][name=who]").value === user, notChangeClass);
    });
    // }, 100);
};

ReserveMainDatePicker.prototype.renderStartEndModeSelect = function(useStartModeAsDefault) {
    let t = this;
    t.bookingMode = useStartModeAsDefault ? t.BOOKING_MODE.START : t.BOOKING_MODE.END;
    let color = useStartModeAsDefault ? t.startModeHexColor : t.endModeHexColor;
    let startEndModeSelect = node('select', 'startEndMode');

    startEndModeSelect.attr({
        fontSize: '12px',
        padding: '5px',
        backgroundColor: color,
        color: 'white',
        transition: 'background-color 0.3s',
        border: 'none'
    });
    startEndModeSelect.add(new Option(lm['reserve_bookingMode_start'], '0', useStartModeAsDefault, useStartModeAsDefault));
    startEndModeSelect.add(new Option(lm['reserve_bookingMode_end'], '1', !useStartModeAsDefault, !useStartModeAsDefault));
    startEndModeSelect.onchange = t.toggleBookingMode.bind(t, startEndModeSelect);
    startEndModeSelect.style.visibility = useStartModeAsDefault ? "hidden" : "visible";
    t.startEndModeSelect = startEndModeSelect;

    let resetTimePeriodBtn = node('button', 'reserve_resetTimePeriod', 'topButtonWhole');
    resetTimePeriodBtn.attr({
        marginLeft: "20px",
        float : "none",
    });
    resetTimePeriodBtn.innerHTML = lm['reserve_resetTimePeriod'];
    resetTimePeriodBtn.onclick = t.resetBooking.bind(t);
    resetTimePeriodBtn.style.visibility = useStartModeAsDefault ? "hidden" : "visible";
    t.resetTimePeriodBtn = resetTimePeriodBtn;

    const startEndModeContainer = createElement("div", {
        attrs: {
          style: 'padding: 20px 0;'
        },
        children: [startEndModeSelect, resetTimePeriodBtn]
    });
    const bookingUI = node('div','bookingUI');
    const bookingInfoContainer = createElement("div", {
        // attrs: {
        //   style: "flex: 2"
        // },
        children: [startEndModeContainer, bookingUI]
    });
    $("bookingSchedule").appendChild(bookingInfoContainer);
    this.insertMouseOverCSS();
};

ReserveMainDatePicker.prototype.toggleBookingMode = function() {
    let t = this;
    let startEndMode = t.startEndModeSelect;
    t.bookingMode = (t.bookingMode + 1) % 2;
    startEndMode.value = t.bookingMode + "";
    startEndMode.style.backgroundColor = t.bookingMode === t.BOOKING_MODE.START ? t.startModeHexColor : t.endModeHexColor;
    t.insertMouseOverCSS();
};

//**********************************************************************************************************************

function ReserveCustomDatePicker() {
    ReserveCalendar.call(this);
}
ReserveCustomDatePicker.prototype = Object.create(ReserveCalendar.prototype);
ReserveCustomDatePicker.prototype.constructor = ReserveCustomDatePicker;

ReserveCustomDatePicker.SPECIFIC_AVAILABLE = 0;
ReserveCustomDatePicker.SPECIFIC_UNAVAILABLE = 1;

ReserveCustomDatePicker.prototype.init = function (startDay, endDay) {
    this.specificTimeDatesNotSaved = parseSpecificDates(specificTimeDates);
    // this.initCustomDatePicker = true;
    this.startDay = startDay;
    this.endDay = endDay;
    this.renderedSpecificTimes = false;
    this.focusDateValue = [];  //multi-date
    this.specificTimes = [reservationReportParamsDefault.availableTimes.slice()];  //default one value:  09:00 ~ 18:00
    this.specificType = ReserveCustomDatePicker.SPECIFIC_AVAILABLE;
    if (!startDay && !endDay) this.reset();
    else {
        this.setMonth(new Date(startDay).getMonth());
    }
    this.showFloatWin();
};

ReserveCustomDatePicker.prototype.addMonth = function (delta) {
    ReserveCalendar.prototype.addMonth.call(this, delta);
    this.showMonth();
};

ReserveCustomDatePicker.prototype.showMonth = function() {
    let t = this;
    let year = t.myDate.getFullYear();
    let month = t.myDate.getMonth();
    let firstMonthDay = new Date(year,month,1);
    let firstWeekDay = firstMonthDay.getDay();
    let newCursorDay = new Date(firstMonthDay.getTime());
    newCursorDay.setDate(firstMonthDay.getDate() - (firstWeekDay + 7 - firstDayOfAWeek) % 7);
    let cursorDay = newCursorDay;//new Date(firstMonthDay.getTime()-firstWeekDay*DAY_MILLI);
    let cursorDayValue = reserved_simpleFormatDate(cursorDay);
    let today = this.today;

    let div = node('div',null, 'datePickerRagic');

    //year month header
    let ymheader = node('table', null, 'ymheaderTable');
    let row,cell;
    row = ymheader.insertRow(-1);
    let monthSel = getMonthSelect(month, year);
    let prevMonth = node('span', null, 'btn-primary');prevMonth.innerHTML = '&nbsp;&lt;&nbsp;';
    let nextMonth = node('span', null, 'btn-primary');nextMonth.innerHTML = '&nbsp;&gt;&nbsp;';
//  let yearSel = getYearSel(t.myDate.getFullYear());yearSel.picker = t;yearSel.onchange = function(){t.picker.setYear(t.options[t.selectedIndex].value);};yearSel.onclick = function(){ctrl.dropWin = true;}
    cell = row.insertCell(-1);cell.appendChild(monthSel);
    cell = row.insertCell(-1);
    cell.style.textAlign = 'right';
    // cell.style.color = '#999';
    cell.appendChild(prevMonth);prevMonth.picker = t;prevMonth.onclick = function(){this.picker.addMonth(-1);};
    cell.appendChild(nextMonth);nextMonth.picker = t;nextMonth.onclick = function(){this.picker.addMonth(1);};

    if(firstMonthDay.getMonth() === new Date(today).getMonth()){
        prevMonth.classList.add('cannotSelect');
        prevMonth.onclick = null;
    }
//  cell = row.insertCell(-1);cell.appendChild(yearSel);
    div.appendChild(ymheader);

    //day table
    let table = node('table', null, 'calTable');
    div.appendChild(table);
    //weekday header
    row = table.insertRow(-1);
    let offsetDay = firstDayOfAWeek % 7;
    let weekdayArray = [];
    for(let i = 0; i < 7; i++){
        weekdayArray.push(lm["DAY_NAMES"][7+i]);
    }
    for(let i = 0; i < 7; i++){
        cell = row.insertCell(-1);
        cell.className = 'weekHeader';
        cell.innerHTML = weekdayArray[(i + offsetDay) % 7];
    }
    //start calendar
    let rowcount = 0,colcount = 0;
    let endThisMonth = false;
    let inThisMonth;
    let startDay = t.startDay;
    let endDay = t.endDay;

    while(!endThisMonth && rowcount < 6) {
        row = table.insertRow(-1);

        while(!endThisMonth && colcount < 7) {
            if(inThisMonth && cursorDay.getDate() === new Date(year, month+1, 0).getDate()) {  //this month's last date
                endThisMonth = true;
            }
            cell = row.insertCell(-1);
            cell.setAttribute('value',cursorDayValue);
            cell.pastDate = false;
            inThisMonth = cursorDay.getMonth() === month;

            //past date
            if(new Date(cursorDayValue).getTime() < new Date(today).getTime()) {
                cell.classList.add('cannotSelect');
                cell.pastDate = true;
            }
            if(inThisMonth) {
                cell.innerHTML = cursorDay.getDate();  //only show dates in this month

                if(cursorDayValue === today) {
                    cell.style.backgroundColor = this.todayBackGroundColor;
                    cell.style.color = "white";
                }
                if(!cell.pastDate) {
                    cell.classList.add('available');
                    cell.onclick = this.datePickerFocusDate.bind(this, cell);

                    if(startDay && endDay &&
                        (dayjs(cursorDayValue).isSame(dayjs(startDay)) || dayjs(cursorDayValue).isSame(dayjs(endDay)) ||
                            dayjs(cursorDayValue).isAfter(dayjs(startDay)) && dayjs(cursorDayValue).isBefore(dayjs(endDay)))) {
                        cell.classList.add("focusDate");
                        t.focusDateValue.push(cursorDayValue);
                    }
                }
            }
            //only show dates in this month
            else {
                cell.innerHTML = "";
                // cell.classList.add('notThisMonth');
            }

            newCursorDay = new Date(cursorDay.getTime());
            newCursorDay.setDate(cursorDay.getDate()+1);
            cursorDay = newCursorDay;
            cursorDayValue = reserved_simpleFormatDate(cursorDay);
            colcount++;
        }
        rowcount++;
        colcount = 0;
    }

    let container = $("specificDatePickerContainer");
    if (container) {
        rm(container)
        container.appendChild(div);
    }
    return div;
};

ReserveCustomDatePicker.prototype.showFloatWin = function() {
    let t = this;
    t.focusDateValue.length = 0;

    let datePicker = t.showMonth();
    let divContainer = createElement('div', {
        attrs: {
            style: "display: flex; align-items: center; flex-direction: column; width: 100%;"
        },
        children: [
            createElement('h3', {
                children: [lm['report_addDayOverridesHeader']]
            })
        ]
    });
    let timeDiv = node("div", "specificTimesDiv", "divRow");

    let cancelBtn = createElement("button", {
        attrs: {
            class: 'thebuttonCancel'
        },
        children: [lm['cancel']]
    });
    cancelBtn.onclick = floatWinClose;

    let applyBtn = createElement("button", {
        attrs: {
            class: 'thebuttonApply'
        },
        children: [lm['apply']]
    });
    applyBtn.onclick = t.applySpecificDate.bind(t);

    let footer = createElement("div", {
        attrs: {
            class: 'thebuttonContainer'
        },
        children: [applyBtn, cancelBtn]
    });

    let datePickerContainer = node("div", 'specificDatePickerContainer');
    datePickerContainer.appendChild(datePicker);

    divContainer.appendChild(datePickerContainer);
    divContainer.appendChild(timeDiv);
    divContainer.appendChild(footer);

    //add the div
    floatWin(t.focusDateValue.length > 0 ? t.renderSpecificTimes.bind(t) : null, divContainer, lm['report_addDayOverridesHeader'], true);
};

ReserveCustomDatePicker.prototype.datePickerFocusDate = function(cell) {
    let dateString = cell.getAttribute('value');
    let t = this;

    let addCustomDate = !cell.classList.contains("focusDate");
    if (addCustomDate) {
        cell.classList.add("focusDate");
        t.focusDateValue.push(dateString);
        t.focusDateValue.sort(ascDate);
    }
    else {
        cell.classList.remove("focusDate");
        t.focusDateValue.splice(t.focusDateValue.indexOf(dateString), 1);
    }

    t.setSpecific(addCustomDate, dateString);

    if (!t.renderedSpecificTimes) t.renderSpecificTimes();
    else if (t.focusDateValue.length === 0) {
        let specificTimesDiv = $('specificTimesDiv');
        rm(specificTimesDiv);
        t.renderedSpecificTimes = false;
        specificTimesDiv.style.padding = 0;

    }
};

ReserveCustomDatePicker.prototype.setSpecific = function(addCustomDate, dateString) {
    let t = this;
    let timesReadyToBeset = t.specificType === ReserveCustomDatePicker.SPECIFIC_UNAVAILABLE ? [] :t.specificTimes;
    let timeInfoIdx = t.specificTimeDatesNotSaved.findIndex(function(obj){ return obj.day === dateString });

    // 將這個特定時間套用在其他不存在的特定日期
    if (timeInfoIdx < 0) {
        t.specificTimeDatesNotSaved.push({
            day: dateString,
            times: timesReadyToBeset
        });
        t.specificTimeDatesNotSaved.sort(ascDate);
    }
    // 將這個特定時間套用在其他已存在的特定日期
    else if (addCustomDate) {
        t.specificTimeDatesNotSaved[timeInfoIdx].times = timesReadyToBeset;
    }
    // 刪除這個特定日期 (只有在透過點選特定日期打開的 customDatePicker，才能這樣做)
    else if (t.startDay && t.endDay) {
        t.specificTimeDatesNotSaved.splice(timeInfoIdx, 1);
    }
    // 使用原本舊值，如果沒有就刪掉
    else {
        let savedTimes = t.getSpecificTimesInSavedDates(dateString);
        if (savedTimes) t.specificTimeDatesNotSaved[timeInfoIdx].times = savedTimes;
        else t.specificTimeDatesNotSaved.splice(timeInfoIdx, 1);
    }
};

ReserveCustomDatePicker.prototype.applySpecificDate = function() {
    if (errorMsg) {
        alert(errorMsg);
        return;
    }
    let oldSpecificTimeDatesString = JSON.stringify(specificTimeDates);
    specificTimeDates = formatSpecificDates(this.specificTimeDatesNotSaved);
    this.specificTimeDatesNotSaved = [];
    //render specific time datas again only if there are some changes in specificTimeDates
    if (JSON.stringify(specificTimeDates) !== oldSpecificTimeDatesString) {
        this.renderSpecificTimeDates();
    }
    floatWinClose();
};

// ReserveCustomDatePicker.prototype.getSpecificTimes = function() {
//     return this.specificTimes;
//     if(this.focusDateValue.length === 0) return [];
//     let focusDateValue = this.focusDateValue;
//     return this.specificTimeDatesNotSaved.find(function(obj) {
//         return obj.day === focusDateValue[0];
//     }).times.slice();
// };

ReserveCustomDatePicker.prototype.setSpecificTimes = function(timesArray, notUpdateSpecificTimes) {
    let focusDateValue = this.focusDateValue;
    if (!notUpdateSpecificTimes) this.specificTimes = timesArray;

    let objs = this.specificTimeDatesNotSaved.filter(function(obj) {
        return focusDateValue.includes(obj.day);
    });

    objs.forEach(function (obj) {
        obj.times = timesArray;
    })
};

ReserveCustomDatePicker.prototype.getSpecificTimesInSavedDates = function(dateString) {
    let foundTimesObj = specificTimeDates.find(function(obj) {
        return obj.days.includes(dateString);
    });

    if (foundTimesObj) return deepCopy(foundTimesObj.times);
    return null;
};

/**
 * 在特定日期的 floatWin 最下方繪製時間區段
 */
ReserveCustomDatePicker.prototype.renderSpecificTimes = function () {
    let specificTimesDiv = $('specificTimesDiv');
    specificTimesDiv.style.padding = "30px 30px 15px 30px";

    let timesContainer = node("div", "specificTimes");
    rm(specificTimesDiv);
    let t = this;

    t.renderedSpecificTimes = true;
    // 載入已存好的特定日期時間。 當點選那格，就要載入那格的特定時間
    if(t.focusDateValue.length > 0) {
        let foundDate = t.specificTimeDatesNotSaved.find(function (obj) {
            return obj.day === t.focusDateValue[0];
        });
        if(foundDate) t.specificTimes = foundDate.times;
    }

    t.specificType = t.specificTimes.length === 0 ? ReserveCustomDatePicker.SPECIFIC_UNAVAILABLE : ReserveCustomDatePicker.SPECIFIC_AVAILABLE;

    let availableChanged = function (type) {
        $$('input[type=radio]', $('specificTimesDiv')).forEach(function (input) {
            input.classList.remove("checked");
        });
        this.classList.toggle("checked");
        if (this.checked) t.specificType = type;
        /*
            切換成「無法預約」不會將 t.specificTimes 清空，只會將 t.specificTimeDatesNotSaved 內的 times array 清空
            這個做的目的是，如果切換回「可預約」，要能呈現剛剛設定的時間 (t.specificTimes)
         */
        if (t.specificType === ReserveCustomDatePicker.SPECIFIC_UNAVAILABLE) {
            timesContainer.style.display = "none";
            addContainer.style.display = "none";
            t.setSpecificTimes([], true);
        }
        else {
            timesContainer.style.display = "";
            addContainer.style.display = "";
            t.setSpecificTimes(t.specificTimes, true);
        }
    };

    let radioAvailable = h("input", {
        id: "radioAvailable",
        attrs: {
            type: "radio",
            name: "specific-type"
        },
        callback: function (elem) {
            elem.onchange = availableChanged.bind(elem, ReserveCustomDatePicker.SPECIFIC_AVAILABLE);
        }
    });

    let radioUnAvailable = h("input", {
        id: "radioUnavailable",
        attrs: {
            type: "radio",
            name: "specific-type"
        },
        callback: function (elem) {
            elem.onchange = availableChanged.bind(elem, ReserveCustomDatePicker.SPECIFIC_UNAVAILABLE);
        }
    });

    if (t.specificType === ReserveCustomDatePicker.SPECIFIC_AVAILABLE) {
        radioAvailable.checked = true;
        radioAvailable.classList.add("checked");
        radioUnAvailable.classList.remove("checked");
    }
    else {
        radioUnAvailable.checked = true;
        radioAvailable.classList.remove("checked");
        radioUnAvailable.classList.add("checked");
        //將 specificTimes 設定成預設的時間，這樣切換回可預約時才能顯示
        t.specificTimes = [reservationReportParamsDefault.availableTimes.slice()];
    }

    let radioParent = h("div", {
        style: "padding: 10px 0;"
    }, [
        radioAvailable,
        h("label", {
            id: "radioAvailable",
            class: 'label-margin',
            attrs: {
                for: "radioAvailable"
            }
        }, lm["reserve_radio_available"]),
        radioUnAvailable,
        h("label", {
            id: "radioAvailable",
            class: 'label-margin',
            attrs: {
                for: "radioUnavailable"
            }
        }, lm["reserve_radio_unavailable"])
    ]);

    let addContainer = h('div', {
        class: "add",
        callback: function (elem) {
            elem.onclick = addAvailableTimesSelect.bind(elem, elem);
        }
    }, [h("i", {
        style: "font-size:16px;color:#336699;",
        class: "fa fa-plus-square"
    })]);

    t._renderSpecificTime(timesContainer, addContainer);

    specificTimesDiv.appendChild(radioParent);
    specificTimesDiv.appendChild(timesContainer);
    specificTimesDiv.appendChild(addContainer);
};

ReserveCustomDatePicker.prototype._renderSpecificTime = function (timesContainer, addContainer) {
    rm(timesContainer);
    let t = this;

    if (t.specificType === ReserveCustomDatePicker.SPECIFIC_UNAVAILABLE) {
        timesContainer.style.display = "none";
        addContainer.style.display = "none";
    }
    else {
        timesContainer.style.display = "";
        addContainer.style.display = "";
    }

    for(let i = 0; i < t.specificTimes.length; i++) {
        let timepair = t.specificTimes[i];
        let timeSectionContainer = node("div", null, 'timeSectionContainer');
        let timeSection = node("div", null, 'timeSection');
        let error = node("span", null, 'availableTimes-error');
        let deleteBtn = createElement("div", {
            attrs: {
                class: "removeTimes"
            },
            children: [
                createElement("i", {
                    attrs: {
                        class: "fa fa-times",
                        style: "color:#555;cursor:pointer;"
                    }
                })
            ]
        });
        deleteBtn.onclick = removeSelect.bind(deleteBtn, deleteBtn);

        for(let k = 0; k < timepair.length; k++) {
            let select = node("select");
            let startEndTime = timepair[k];

            select.onchange = availableTimesChange.bind(select, select);
            for(let j = 0; j < 25; j++) {
                let hour = (j < 10 ? "0" : "") + j;
                let isHour = j === (startEndTime.hour + reserveFixTimezoneHoursOffset);
                let onHourOption = new Option(hour+":00", hour+":00", false, isHour && startEndTime.minute === 0);
                onHourOption.setAttribute("style","background-color: #d4d4d4;");
                select.add(onHourOption);
                if(j < 24) {
                    select.add(new Option(hour+":15", hour+":15", false, isHour && startEndTime.minute === 15));
                    select.add(new Option(hour+":30", hour+":30", false, isHour && startEndTime.minute === 30));
                    select.add(new Option(hour+":45", hour+":45", false, isHour && startEndTime.minute === 45));
                }
            }
            timeSection.appendChild(select);

            if(k === 0){
                let span = createElement('span', {
                    attrs: {
                        style: 'margin: 0 20px; font-weight: 700;'
                    },
                    children: ["-"]
                });

                timeSection.appendChild(span);
            }
        }
        timeSection.appendChild(error);
        timeSectionContainer.appendChild(timeSection);
        timeSectionContainer.appendChild(deleteBtn);

        timesContainer.appendChild(timeSectionContainer);
    }
};


/**
 * 在「新增特定日期」區塊繪製特定的日期時間區段
 */
ReserveCustomDatePicker.prototype.renderSpecificTimeDates = function () {
    const specificDateTimeArea = $("specificDateTimeArea");
    rm(specificDateTimeArea);

    const fragment = document.createDocumentFragment();

    for(let i = 0; i < specificTimeDates.length; i++) {
        let dateTimesMapping = specificTimeDates[i];
        let days = dateTimesMapping.days,
            times = dateTimesMapping.times;
        let divRowChildrens = [];
        let dayBlockChildrens = [];
        let timeBlockChildrens = [];

        if (times.length === 0) {
            timeBlockChildrens.push(h('span', { class: 'unavailableText' }, lm["reserve_radio_unavailable"]));
        }
        for(let j = 0, len = times.length; j < len; j++) {
            let timeArr = times[j];
            const timeSectionContainer = createElement("div", {
                attrs: {
                    class: "timeSectionContainer",
                    style: j === 0 ? "margin-top: 10px;" : ""
                },
                children: [node("span", null, null, showStartToEndTime(timeArr))]
            })

            timeBlockChildrens.push(timeSectionContainer);
        }

        dayBlockChildrens.push(node("span", null, null, days[0]));
        if(days.length > 1){
            dayBlockChildrens.push(node("span", null, null, " - "));
            dayBlockChildrens.push(node("span", null, null, days[days.length-1]));
        }

        const daysBlock = createElement("div", {
            attrs: {
                class: "divCell",
                style: "padding-top: 18px;"
            },
            children: dayBlockChildrens
        });

        const timesBlock = createElement("div", {
            attrs: {
                class: "divCell"
            },
            children: timeBlockChildrens
        });

        const removeTimesBtn = createElement("div", {
            attrs: {
                class: "removeTimes"
            },
            children: [createElement("i", {
                attrs: {
                    class: "fa fa-times",
                    style: "color:#555;cursor:pointer;"
                }
            })]
        });
        removeTimesBtn.onclick = removeSelect.bind(removeTimesBtn,removeTimesBtn,true);

        divRowChildrens.push(daysBlock);
        divRowChildrens.push(timesBlock);
        divRowChildrens.push(removeTimesBtn);

        let divRow = createElement("div", {
            attrs: {
                class: "divRow specificDaysTimes"
            },
            children: divRowChildrens
        });

        divRow.onclick = function() {
            customDatePicker.init(days[0], days[days.length-1]);
        };

        fragment.appendChild(divRow);
    }

    specificDateTimeArea.appendChild(fragment);
};


//###############################################################################
//Utility
function showTime(time) {
    let hour = time.hour + reserveFixTimezoneHoursOffset;
    let minute = time.minute;
    return (hour < 10 ? "0" : "") + hour + ":" + (minute < 10 ? "0" : "") + minute;
}

function showStartToEndTime(timeArr) {
    return showTime(timeArr[0]) + " - " + showTime(timeArr[1]);
}

function resetTime(time) {
    let newTime = new Intl.DateTimeFormat(lang, isIE?{}:{dateStyle: "full", timeStyle:"short"}).format(new Date());
    if(newTime !== time.innerHTML) time.innerHTML = newTime;  //prevent overrendering

    requestAnimationFrame(resetTime.bind(null, time));
}

//To add companyTimezoneoffset on the time
function fixTimezoneOffset(arr) {
    if (reserveFixTimezoneHoursOffset === 0) return arr; //already local, then don't need to add timezone offset
    return arr.reduce(function (timepairArr, timepair) {
        timepairArr.push(
            timepair.reduce(function (timeUnitArr, timeUnit) {
                timeUnitArr.push({
                    hour: timeUnit.hour + reserveFixTimezoneHoursOffset,
                    minute: timeUnit.minute,
                });

                return timeUnitArr;
            }, [])
        );
        return timepairArr;
    }, []);
}

function reserved_simpleFormatDate(date) {
    if(!date) return '';
    let month = date.getMonth()+1;
    let day = date.getDate();
    if(month<10) month = '0'+month.toString();
    if(day<10) day = '0'+day.toString();
    return date.getFullYear()+'/'+month+'/'+day;
}

function reserved_simpleFormatDateTime(date) {
    let hours = date.getHours();
    let min = date.getMinutes();
    let sec = date.getSeconds();
    if(hours<10) hours = '0'+hours;
    if(min<10) min = '0'+min;
    if(sec<10) sec = '0'+sec;
    return reserved_simpleFormatDate(date)+' '+hours+':'+min+':'+sec;
}

function reserved_simpleFormatTime(date) {
    let hours = date.getHours();
    let min = date.getMinutes();
    if(hours<10) hours = '0'+hours;
    if(min<10) min = '0'+min;
    return hours+':'+min;
}

function getMonthSelect(thisMonth,thisYear) {
    let o = node('div');
    o.style.whiteSpace = 'nowrap';
    o.style.textAlign = 'left';
    o.style.fontSize = '20px';
    switch(thisMonth){
        case 0:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[12];break;
        case 1:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[13];break;
        case 2:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[14];break;
        case 3:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[15];break;
        case 4:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[16];break;
        case 5:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[17];break;
        case 6:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[18];break;
        case 7:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[19];break;
        case 8:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[20];break;
        case 9:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[21];break;
        case 10:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[22];break;
        case 11:o.innerHTML = getBundleString("YEAR_MONTH_NAMES", [thisYear])[23];break;
    }
    return o;
}

function ascDate(date1, date2) {
    if(typeof date1 === 'object') date1 = date1.day;
    if(typeof date2 === 'object') date2 = date2.day;
    if(typeof date1 !== 'string' || date1 === "" || typeof date2 !== 'string' || date2 === "") {
        console.warn("Wrong type of arguments");
        return 0;
    }
    let dayJS1 = dayjs(date1);
    let dayJS2 = dayjs(date2);
    return dayJS1.isSame(dayJS2) || dayJS1.isBefore(dayJS2) ? -1 : 1;
}

/**
 * Parse specificTimeDates (an Array) to specificTimeDatesNotSaved (an day-splitted Array)
 * @return Array
 * */
function parseSpecificDates(datesArray) {
    return datesArray.reduce(function(result, timeDateObj) {
        let times = timeDateObj.times;
        timeDateObj.days.forEach(function (day) {
            result.push({
                day: day,
                times: deepCopy(times)
            });
        });
        return result;
    }, []);
}

/**
 * Format specificTimeDatesNotSaved (an day-splitted Array) to specificTimeDates (an Array)
 * @return Array
 * */
function formatSpecificDates(datesArray) {
    let result = [];
    let currentDayArray;
    let prevDate, prevTimeArray, currentDate, currentTimeArray;
    let pushNew;
    let dateArrayLen = datesArray.length;
    let dateInfo, prevDateInfo;

    for(let i = 0; i < dateArrayLen; i++) {
        dateInfo = datesArray[i];
        currentDate = dateInfo.day;
        currentTimeArray = deepCopy(dateInfo.times);
        pushNew = false;

        if(i > 0) {
            prevDateInfo = datesArray[i-1];
            prevDate = prevDateInfo.day;
            prevTimeArray = prevDateInfo.times;
            if(isAdjacent(currentDate, prevDate) && sameTimes(currentTimeArray, prevTimeArray)){
                currentDayArray.push(currentDate);
            }
            else
                pushNew = true;
        }
        else
            pushNew = true;


        if(pushNew) {
            currentDayArray = Array.of(currentDate);
            result.push({
                days: currentDayArray,
                times: currentTimeArray
            });
        }
    }

    function isAdjacent(date1, date2) {
        let date1Milli = dayjs(date1).toDate().getTime();
        let date2Milli = dayjs(date2).toDate().getTime();
        return Math.abs(date1Milli - date2Milli) / DAY_MILLI === 1;
    }

    function sameTimes(timeArr1, timeArr2){
        return JSON.stringify(timeArr1) === JSON.stringify(timeArr2);
    }

    return result;
}

function intlFormatDate(dateString, todayString) {
    return new Intl.DateTimeFormat(lang, isIE ? {} : {dateStyle: "full"}).format(new Date(dateString)) + (dateString === todayString ? " (" + lm["today"] + ")" : "");
}

function toggleShowOrRemoveAllTargets(ifShowAll) {
    if (ifShowAll) {
        RagicStorage.localStorage.removeItem("targets_to_show_" + reportKey);
    }
    else {
        RagicStorage.localStorage.setItem("targets_to_show_" + reportKey, '[]');
    }
    reserveDatePicker.renderedTargetSelect = false;
    reserveDatePicker.renderReserveTimes();
}