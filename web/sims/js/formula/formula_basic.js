/**
 * @return {number}
 */
function YEAR(arg) {
    let date = getDateFromFormulaObject(arg);
    return date.getFullYear();
}

/**
 * @return {number}
 */
function MONTH(arg) {
    let date = getDateFromFormulaObject(arg);
    return date.getMonth() + 1;
}

/**
 * @return {number}
 */
function DAY(arg) {
    let date = getDateFromFormulaObject(arg);
    return date.getDate();
}

/**
 * @return {number}
 */
function WEEKDAY(arg) {
    let date = getDateFromFormulaObject(arg);
    return date.getDay() + 1;
}

/**
 * @return {number}
 */
function DATE(arg1, arg2, arg3) {
    let month = parseInt(arg2) - 1;
    let date = new Date(arg1, month, arg3);
    return date.getTime() / DAY_MILLI;
}

/**
 * arg could be a number between 0 and 1. ex: HOUR(0.75) = 18
 * or the cellName object. ex: HOUR(A9)
 * @return {number}
 */
function HOUR(arg) {
    if(typeof arg == "number") {
        if(0 <= arg && arg <= 1) return 24 * arg % 24;
        throw new SyntaxError('If the argument is a nubmer, you\' should enter 0 ~ 1.');
    }
    let date = getDateTimeFromFormulaObject(arg);
    return date.getHours();
}

/**
 * arg could be a number between 0 and 1. ex: MINUTE(0.75) = 45
 * or the cellName object. ex: MINUTE(A9)
 * @return {number}
 */
function MINUTE(arg) {
    if(typeof arg == "number") {
        if(0 <= arg && arg <= 1) return 60 * arg % 60;
        throw new SyntaxError('If the argument is a nubmer, you\' should enter 0 ~ 1.');
    }
    let date = getDateTimeFromFormulaObject(arg);
    return date.getMinutes();
}

/**
 * arg could be a number between 0 and 1. ex: SECOND(0.75) = 45
 * or the cellName object. ex: SECOND(A9)
 * @return {number}
 */
function SECOND(arg) {
    if(typeof arg == "number") {
        if(0 <= arg && arg <= 1) return 60 * arg % 60;
        throw new SyntaxError('If the argument is a nubmer, you\' should enter 0 ~ 1.');
    }
    let date = getDateTimeFromFormulaObject(arg);
    return date.getSeconds();
}

/**
 * @return {number}
 */
function TODAY() {
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.getTime() / DAY_MILLI;
}

/**
 * @return {number}
 */
function NOW() {
    let d = new Date();
    return d.getTime() / DAY_MILLI;
}

/**
 * Same as TODAY in front-end
 * @return {number}
 */
function TODAYTZ() {
    return TODAY.apply(this, arguments);
}

/**
 * Same as NOW in front-end
 * @return {number}
 */
function NOWTZ() {
    return NOW.apply(this, arguments);
}

/**
 * @return {number}
 */
function SUM() {
    let result = 0;
    for (let i = 0; i < arguments.length; i++) {
        let num = parseFloat(arguments[i].toString());
        if (!isNaN(num)) {
            result += num;
        }
    }
    return result;
}

/**
 * @return {number}
 */
function AVERAGE() {
    let sum = 0, count = 0;
    for (let i = 0; i < arguments.length; i++) {
        let arg = arguments[i];
        let num = parseFloat(arg.toString());
        if (!isNaN(num)) {
            sum += num;
            //AVG shouldn't consider the empty value
            if(!Array.isArray(arg.SUM) && arg.RAW === "") continue;
            count += parseFloat(COUNTA(arg));
        }
    }
    return sum / count;
}

/**
 * @return {number}
 */
function AVG() {
    return AVERAGE.apply(this, arguments);
}

/**
 * @return {number}
 */
function MODE() {
    return MODE.SNGL.apply(this, arguments);
}

/**
 * @return {number}
 */
MODE.SNGL = function () {
    let result = MODE.MULT.apply(this, arguments);
    if (result.length) {
        return result[0];
    }
    return NaN;
};

/**
 * @return {Array}
 */
MODE.MULT = function () {
    let flatten = [];
    let i;
    for (i = 0; i < arguments.length; i++) {
        let arg = arguments[i];
        if (Array.isArray(arg)) {
            flatten = flatten.concat(arg);
        }
        else if (arg.SUM && Array.isArray(arg.SUM)) {
            flatten = flatten.concat(arg.SUM.filter(function(subObj){
                return subObj.value !== "";
            }).map(function (subObj) {
                return subObj.value;
            }));
        }
        else {
            flatten.push(arg + "");
        }
    }

    let counts = flatten.reduce(function (count, value) {
        // if (isNumeric(value)) {
        count[value] = count[value] ? count[value] + 1 : 1;
        // }
        return count;
    }, {});

    let toSort = [];
    for (let num in counts) {
        toSort.push({'value': num, 'count': counts[num]});
    }

    if (!toSort.length) return [];

    toSort.sort(function (a, b) {
        return b.count - a.count;
    });
    let result = [], maxCount = toSort[0].count;
    for (i = 0; i < toSort.length; i++) {
        if (toSort[i].count !== maxCount) break;
        result.push(toSort[i].value);
    }

    return result;
};


/**
 * @return {number}
 */
function COUNT() {
    let count = 0;
    for (let i = 0; i < arguments.length; i++) {
        count += parseFloat(arguments[i].COUNT);
    }
    return count;
}

/**
 * @return {string}
 */
function LEFT(arg, num) {
    if (!arg || num <= 0) return '';
    num = num || 1;
    arg = arg.RAW || (arg + "");
    return newlineTranslate(arg).substring(0, num);
}

/**
 * @return {string}
 */
function RIGHT(arg, num) {
    if (!arg || num <= 0) return '';
    num = num || 1;
    arg = arg.RAW || (arg + "");
    let s = newlineTranslate(arg);
    return s.substring(s.length - num, s.length);
}

/**
 * @return {string}
 */
function MID(arg, num1, num2) {
    if (!arg || !arg.toString() && arg.toString() !== 0) return '';
    if (num1 < 0 || num2 < 0) return '';
    arg = arg.RAW || (arg + "");
    return newlineTranslate(arg).substr(num1, num2);
}

/**
 * @return {number}
 */
function LEN(arg) {
    if (!arg) return 0;
    arg = arg.RAW || (arg + "");
    return newlineTranslate(arg).length;
}

/**
 * @return {number}
 */
function LENB(arg) {
    if (!arg) return 0;
    return newlineTranslate(arg.RAW || (arg + '')).replace(/[^\x00-\xff]/g, "**").length;
}

/**
 * @return {number}
 */
function MIN() {
    let minArray = [], _min;
    for (let i = 0; i < arguments.length; i++) {
        _min = parseFloat(arguments[i].MIN === undefined ? arguments[i] : arguments[i].MIN);
        if (!isNaN(_min)) {
            minArray.push(_min);
        }
    }
    if (!minArray.length) {
        return NaN;
    }
    return Math.min.apply(null, minArray);
}

/**
 * @return {number}
 */
function MAX() {
    let maxArray = [], _max;
    for (let i = 0; i < arguments.length; i++) {
        _max = parseFloat(arguments[i].MAX === undefined ? arguments[i] : arguments[i].MAX);
        if (!isNaN(_max)) {
            maxArray.push(_max);
        }
    }
    if (!maxArray.length) {
        return NaN;
    }
    return Math.max.apply(null, maxArray);
}

function FIRST(arg) {
    return arg['FIRST'];
}

function FIRSTA(arg) {
    return arg['FIRSTA'];
}

function LAST(arg) {
    return arg['LAST'];
}

function LASTA(arg) {
    return arg['LASTA'];
}

/**
 * @return {string}
 */
function SUBTABLEROW(arg, y) {
    y = parseInt(y);
    if (Array.isArray(arg.SUM)) {
        let res = arg.SUM.find(function (element) {
            return element.subtableRowNum === y;
        });
        if (res) return res.value;
    }
    return "";
}

/**
 * @return {number}
 */
function COUNTA(arg) {
    if (Array.isArray(arg.SUM)) {
        return arg.SUM.filter(function (obj) {
            return obj.raw !== '';
        }).length;
    }
    return 1;
}

/**
 * @return {number}
 */
function MOD(num, divisor) {
    return num % divisor;
}

/**
 * @return {number}
 */
function GCD() {
    let al = arguments.length;
    try {
        if (al === 0) {
            return NaN;
        } else if (al === 1) {
            return arguments[0];
        } else if (al === 2) {
            return (arguments[1] === 0) ? arguments[0] : (GCD(arguments[1], arguments[0] % arguments[1]));
        } else if (al > 2) {
            let result = arguments[0];
            for (let i = 1; i < al; i++) {
                result = GCD(result, arguments[i]);
            }
            return result;
        }
    } catch (e) {
        return NaN;
    }
}

/**
 * @return {number}
 */
function LCM() {
    let al = arguments.length;
    try {
        if (al === 0) {
            return NaN;
        } else if (al === 1) {
            return arguments[0];
        } else {
            let result = arguments[0];
            for (let i = 1; i < al; i++) {
                let gcd = GCD(result, arguments[i]);
                result = result / gcd * arguments[i];
            }
            return result;
        }
    } catch (e) {
        return NaN;
    }
}

function IF(condition, ifTrue, ifFalse) {
    let argLen = arguments.length;
    if (argLen < 2) return NO_CHANGE_SIGNAL;
    if (argLen < 3) return UPDATEIF(condition, ifTrue);
    return condition ? ifTrue : ifFalse;
}

function UPDATEIF(condition, ifTrue) {
    return IF(condition, ifTrue, NO_CHANGE_SIGNAL);
}

function IFS() {
    let argLen = arguments.length;
    if (argLen === 0 || argLen % 2 !== 0) throw new SyntaxError('You\'ve entered too few arguments for this function');
    for (let i = 0; i < argLen; i += 2) {
        if (!!arguments[i]) return arguments[i + 1];
    }

    return NO_CHANGE_SIGNAL;
}

/**
 * [issue：05069]
 * @return {string}
 */
function LARGE(arg, nth, arg2) {
    if (!arg || !Array.isArray(arg.SUM)) {
        return arg;
    }
    if (!Number.isInteger(nth) || typeof arg.SUM[nth - 1] === 'undefined') {
        return arg.RAW;
    }
    let m = arg.SUM.map(function (fObj, index) {
        return {"value": fObj.value, "i": index};
    });
    m.sort(function (x, y) {
        if (x === '') return 1;
        if (y === '') return -1;
        return y.value - x.value;
    });
    let indexOrder = m.map(function (o) {
        return o.i;
    });
    if (!arg2 || !Array.isArray(arg2.SUM)) {
        return arg.SUM[indexOrder[nth - 1]].raw;
    } else {
        return arg2.SUM[indexOrder[nth - 1]].raw;
    }
}

function LOOKUP(value, lookup, result) {
//http://www.techonthenet.com/excel/formulas/lookup.php
//• If the LOOKUP function can not find an exact match, it chooses the largest value in the lookup_range that is less than or equal to the value.
//• If the value is smaller than all of the values in the lookup_range, then the LOOKUP function will return #N/A.
    if (value === '') return ''; // if user clear data
    for (let i = 0; i < lookup.length; i++) {
        if (lookup[i] == value) {
            return result[i];
        }
    }
    for (let i = 0; i < lookup.length; i++) {
        if (lookup[i] > value) {
            if (i === 0) return NaN;
            else return result[i > 0 ? i - 1 : 0];
        }
    }
    return result[result.length - 1];
}

function VLOOKUP(value, queryField, returnField, approximateMatch, findMultiple) {
    if(arguments.length < 3) {
        throw new SyntaxError("Required arguments: value, queryField, returnField");
    }
    value = toRaw(value);
    if (approximateMatch === undefined) approximateMatch = true; // default false
    if (approximateMatch) value = value.trim();
    findMultiple = !!findMultiple; // default false

    //we should not use FMODE on queryField since FMODE means the type of the field on which applied VLOOKUP formula
    let isQueryModeString = queryField.FTYPE === fieldType.STRING,
        isQueryModeDate = queryField.FTYPE === fieldType.DATE,
        isQueryModeNumber = queryField.FTYPE === fieldType.NUMBER,
        isReturnModeNumber = returnField.FMODE === formulaMode.NUMBER;

    let arr = queryField.SUM
        .filter(function (sub) {
            if (isQueryModeString ||
                (isQueryModeDate && (isNaN(value) || value < 10000))) {
                if (approximateMatch) {
                    return sub.raw.includes(value);
                }
                return sub.raw === value;
            } else {
                if (isQueryModeNumber && approximateMatch) {
                    return sub.raw.includes(value);
                }
                return sub.value === parseFloat(value);
            }
        })
        .map(function (sub) {
            let compareVal = returnField.SUM.find(function (rSub) {
                return sub.y === rSub.y;
            });

            return isReturnModeNumber ? compareVal.value : compareVal.raw;
        });

    if (findMultiple) {
        return arr;
    }

    if (arr.length === 0) return "";
    return arr[0];
}

/**
 * @return {string}
 */
function TOUPPERCASE(arg) {
    return arg.toString().toUpperCase();
}

/**
 * @return {string}
 */
function UPPER() {
    return TOUPPERCASE.apply(this, arguments);
}

/**
 * @return {string}
 */
function TOLOWERCASE(arg) {
    return arg.toString().toLowerCase();
}

/**
 * @return {string}
 */
function LOWER() {
    return TOLOWERCASE.apply(this, arguments);
}

/**
 * @return {string}
 */
function PROPER(text) {
    return (text + "").replace(/[A-Za-z_]\S*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

/**
 * @return {string}
 */
function CHAR(number) {
    if (Number.isInteger(number)) {
        return String.fromCharCode(number);
    }
    return number;
}

/**
 * @return {number}
 */
function ABS(num) {
    return Math.abs(num);
}

/**
 * @return {number}
 */
function CEILING(num, significance) {
    if (significance === 0) {
        return 0;
    }
    if (significance === undefined) {
        significance = 1;
    }
    let number = getPrecisedFloat(num),
        precision = -Math.floor(Math.log(significance) / Math.log(10));
    if (number >= 0) {
        return ROUND(Math.ceil(number / significance) * significance, precision);
    } else {
        return -ROUND(Math.floor(Math.abs(number) / significance) * significance, precision);
    }
}

/**
 * @return {number}
 */
function FLOOR(num, significance) {
    significance = (significance === undefined) ? 1 : Math.abs(significance);
    if (significance === 0) {
        return 0;
    }
    let number = getPrecisedFloat(num),
        precision = -Math.floor(Math.log(significance) / Math.log(10));
    if (number >= 0) {
        return ROUND(Math.floor(number / significance) * significance, precision);
    } else {
        return -ROUND(Math.ceil(Math.abs(number) / significance), precision);
    }
}

/**
 * @return {number}
 */
function PI() {
    return Math.PI;
}

/**
 * @return {number}
 */
function POWER(num, power) {
    return Math.pow(num, power);
}

/**
 * @return {number}
 */
function RAND() {
    return Math.random();
}

/**
 * @return {number}
 */
function ROUND(number, digits) {
    digits = digits || 0;
    number = typeof number.toString() == "number" ? number.toString() : parseFloat(number);
    if (isNaN(number) || isNaN(digits)) return NaN;
    let result = Math.round(getPrecisedFloat(number * Math.pow(10, digits))) / Math.pow(10, digits);
    //JS Math.round(-10.5) == -10, the result isn't the same as Excel -11
    let negative0_5 = /^-[0-9]+(\.5)$/.test(number) && (digits === 0);
    if(negative0_5) result = parseFloat(number.toFixed());
    return result;
}

/**
 * @return {number}
 */
function ROUNDDOWN(number, digits) {
    if (isNaN(number) || isNaN(digits)) return NaN;
    let sign = (number > 0) ? 1 : -1;
    return sign * (Math.floor(getPrecisedFloat(Math.abs(number) * Math.pow(10, digits)))) / Math.pow(10, digits);
}

/**
 * @return {number}
 */
function ROUNDUP(number, digits) {
    if (isNaN(number) || isNaN(digits)) return NaN;
    let sign = (number > 0) ? 1 : -1;
    return sign * (Math.ceil(getPrecisedFloat(Math.abs(number) * Math.pow(10, digits)))) / Math.pow(10, digits);
}

/**
 * @return {number}
 */
function MROUND(number, multiple) {
    if (isNaN(number) || isNaN(multiple)) return NaN;
    if (number * multiple < 0) {
        return NaN;
    }
    return Math.round(getPrecisedFloat(number / multiple)) * multiple;
}

/**
 * @return {number}
 */
function SQRT(num) {
    return Math.sqrt(num);
}

/**
 * @return {string}
 */
function REPT(text, number_times) {
    if (!text) return "";
    return (text + "").repeat(number_times);
}

/**
 * @return {number}
 */
function ISOWEEKNUM(date) {
    date = getDateFromFormulaObject(date);
    date.setHours(0, 0, 0);
    date.setDate(date.getDate() + 4 - (date.getDay() || 7));
    const yearStart = new Date(date.getFullYear(), 0, 1);
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
}


/**
 * @return {number}
 */
function WEEKNUM(serial_number, return_type) {
    const date = getDateFromFormulaObject(serial_number);
    if (return_type === undefined) {
        return_type = 1;
    }
    if (return_type === 21) {
        return this.ISOWEEKNUM(date);
    }
    let WEEK_STARTS = [
        undefined,
        0,
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        1,
        2,
        3,
        4,
        5,
        6,
        0
    ];
    let increment = 0;
    // To avoid considering date year changing issue while calculating,
    // first we manually subtract a week from a date that may be in the week which containing next year's January 1,
    // and then use a variable "increment"  to add it back
    if (date.getMonth() === 11 && date.getDate() > 25) {
        date.setDate(date.getDate() - 7);
        increment += 1;
    }

    const weekStart = WEEK_STARTS[return_type];
    let yearStart = new Date(date.getFullYear(), 0, 1);
    if (yearStart.getDay() < weekStart && date.getDay() >= weekStart) increment += 1;
    yearStart -= Math.abs(yearStart.getDay() - weekStart) * 86400000;
    return Math.floor(((date - yearStart) / 86400000) / 7 + 1) + increment;
}

/**
 * @return {number}
 */
function EDATE(start_date, months) {
    let d = getDateFromFormulaObject(start_date);
    let _day_of_month = d.getDate();

    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    let lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    if (lastDay.getDate() < _day_of_month) {
        d.setDate(lastDay.getDate());
    } else {
        d.setDate(_day_of_month);
    }

    return (d.getTime()) / DAY_MILLI;
}

/**
 * @return {number}
 */
function EOMONTH(start_date, months) {
    let d = getDateFromFormulaObject(start_date);
    d.setDate(1);
    d.setMonth(d.getMonth() + months);
    let lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return (lastDay.getTime()) / DAY_MILLI;
}

/**
 * @return {number}
 */
function NETWORKDAYS(start_date, end_date, holidays, makeup_workdays) {
    return NETWORKDAYS.INTL(start_date, end_date, 1, holidays, makeup_workdays);
}

/**
 * @return {number}
 */
NETWORKDAYS.INTL = function (start_date, end_date, weekend, holidays, makeup_workdays) {
    let start = getDateFromFormulaObject(start_date),
        end = getDateFromFormulaObject(end_date),
        WEEKEND_TYPES = [
            [],
            [6, 0],
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 6],
            undefined,
            undefined,
            undefined, [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [5, 5],
            [6, 6]
        ];
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 0;
    }

    if (weekend === undefined) {
        weekend = WEEKEND_TYPES[1];
    } else {
        weekend = WEEKEND_TYPES[weekend];
    }
    if (!(weekend instanceof Array)) {
        return NaN;
    }

    if (!holidays) {
        holidays = [];
    }
    holidays = holidays.map(function (dateString) {
        return new Date(dateString);
    });
    if (!makeup_workdays) {
        makeup_workdays = [];
    }
    makeup_workdays = makeup_workdays.map(function (dateString) {
        return new Date(dateString);
    });

    let days = Math.floor(end_date - start_date + 1),
        total = days,
        processingDate = start,
        i;
    for (i = 0; i < days; i++) {
        let day = processingDate.getDay();
        let dec = false;
        if (day === weekend[0] || day === weekend[1]) {
            dec = true;
            if (makeup_workdays.length) {
                dec = makeup_workdays.every(function (makeup_workday) {
                    return makeup_workday.getDate() !== processingDate.getDate() ||
                        makeup_workday.getMonth() !== processingDate.getMonth() ||
                        makeup_workday.getFullYear() !== processingDate.getFullYear();
                });
            }
        }
        dec = dec || holidays.some(function (holiday) {
            return holiday.getDate() === processingDate.getDate() &&
                holiday.getMonth() === processingDate.getMonth() &&
                holiday.getFullYear() === processingDate.getFullYear();
        });
        if (dec) {
            total--;
        }
        processingDate.setDate(processingDate.getDate() + 1);
    }
    return total;
};

/**
 * @return {number}
 */
function WORKDAY(start_date, days, holidays, makeup_workdays) {
    return WORKDAY.INTL(start_date, days, 1, holidays, makeup_workdays);
}

/**
 * @return {number}
 */
WORKDAY.INTL = function (start_date, days, weekend, holidays, makeup_workdays) {
    let start = getDateFromFormulaObject(start_date),
        WEEKEND_TYPES = [
            [],
            [6, 0],
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4],
            [4, 5],
            [5, 6],
            undefined,
            undefined,
            undefined, [0, 0],
            [1, 1],
            [2, 2],
            [3, 3],
            [4, 4],
            [5, 5],
            [6, 6]
        ];
    if (isNaN(start.getTime())) {
        return start_date;
    }

    if (weekend === undefined) {
        weekend = WEEKEND_TYPES[1];
    } else {
        weekend = WEEKEND_TYPES[weekend];
    }

    if (!(weekend instanceof Array)) {
        return start_date;
    }

    if (!holidays) {
        holidays = [];
    }
    holidays = holidays.map(function (dateString) {
        return new Date(dateString);
    });
    if (!makeup_workdays) {
        makeup_workdays = [];
    }
    makeup_workdays = makeup_workdays.map(function (dateString) {
        return new Date(dateString);
    });

    let calUnit = 1;
    if (days < 0) {
        days = -1 * days;
        calUnit = -1;
    }

    let d = 0;
    while (d < days) {
        start.setDate(start.getDate() + calUnit);
        let day = start.getDay();
        let isExcludeDay = false;
        if (day === weekend[0] || day === weekend[1]) {
            isExcludeDay = true;
            if (makeup_workdays.length) {
                isExcludeDay = makeup_workdays.every(function (makeup_workday) {
                    return makeup_workday.getDate() !== start.getDate() ||
                        makeup_workday.getMonth() !== start.getMonth() ||
                        makeup_workday.getFullYear() !== start.getFullYear();
                });
            }
        }
        if (isExcludeDay) continue;
        if (holidays.some(function (holiday) {
            return holiday.getDate() === start.getDate() &&
                holiday.getMonth() === start.getMonth() &&
                holiday.getFullYear() === start.getFullYear();
        })) {
            d--;
        }
        d++;
    }
    return start.getTime() / DAY_MILLI;
};

/**
 * @return {boolean}
 */
function AND() {
    for (let i = 0; i < arguments.length; i++) {
        if (!arguments[i]) return false;
    }
    return true;
}

/**
 * @return {boolean}
 */
function OR() {
    for (let i = 0; i < arguments.length; i++) {
        if (arguments[i]) return true;
    }
    return false;
}

/**
 * MATCHSUBTABLE(range, criteria_range1, criteria1, [criteria_range2, criteria2], ...)
 * FIND VALUES which match multiple criterias
 * @returns {Array}
 */
function MATCHSUBTABLE() {
    let targ = arguments,
        argLen = targ.length;
    if (argLen < 3 || (argLen - 1) % 2 !== 0) {
        throw new SyntaxError('You\'ve entered too few arguments for this function');
    }
    let range = arguments[0];

    return range.SUM
        .filter(function (el, index) {
            let res = true;
            for (let i = 1; i < argLen; i += 2) {
                let criteriaRange = targ[i],
                    criteria = targ[i + 1];
                if (!criteriaRange || !Array.isArray(criteriaRange.SUM)) return false;
                let singleCriteria = false;

                let cr = criteriaRange.SUM[index];
                try {
                    singleCriteria = executeFormula(cr.value + criteria);
                } catch (e) {
                    try {
                        singleCriteria = executeFormula("'" + cr.raw + "'" + criteria);
                    } catch (e) {
                        singleCriteria = -1;
                    }
                }
                if (typeof singleCriteria !== "boolean") {
                    let compareVal = criteria.RAW ? criteria.RAW : criteria;
                    singleCriteria = ((typeof compareVal === "string" ? cr.raw : cr.value) == compareVal);
                }

                if (!singleCriteria) {
                    res = false;
                    break;
                }
            }
            return res;
        });
}

function SUMIF(range, criteria, sum_range) {
    if (!range || (!criteria && criteria !== "") || !Array.isArray(range.SUM)) return;
    sum_range = sum_range || range;
    return SUMIFS(sum_range, range, criteria);
}

function SUMIFS() {
    let filteredRange = MATCHSUBTABLE.apply(this, arguments);
    let isModeString = arguments[0].FMODE === formulaMode.STRING,
        filteredSum = isModeString ? '' : 0;
    return filteredRange
        .filter(function (el) {
            return !(!isModeString && (isNaN(el.value) || typeof el.value === 'string'));
        })
        .reduce(function (accumulator, el) {
            return accumulator + el.value;
        }, filteredSum);
}

/**
 * @return {number}
 */
function COUNTIF(range, criteria) {
    return COUNTIFS(range, criteria);
}

/**
 * @return {number}
 */
function COUNTIFS() {
    let argsLen = arguments.length,
        targs = arguments;
    if (argsLen < 2 || argsLen % 2 !== 0) {
        throw new SyntaxError('You\'ve entered too few arguments for this function');
    }
    return arguments[0].SUM
        .filter(function (el, index) {
            let res = true;
            for (let i = 0; i < argsLen; i += 2) {
                let criteria_range = targs[i], criteria = targs[i + 1];
                if (!criteria_range || !criteria || !Array.isArray(criteria_range.SUM)) return false;
                let singleCriteria = false;

                let cr = criteria_range.SUM[index];
                try {
                    singleCriteria = executeFormula(cr.value + criteria);
                } catch (e) {
                    try {
                        singleCriteria = executeFormula("'" + cr.raw + "'" + criteria);
                    } catch (e) {
                        singleCriteria = -1;
                    }
                }
                if (typeof singleCriteria !== "boolean") {
                    let compareVal = criteria.RAW ? criteria.RAW : criteria;
                    singleCriteria = ((typeof compareVal === "string" ? cr.raw : cr.value) == compareVal);
                }

                if (!singleCriteria) {
                    res = false;
                    break;
                }
            }
            return res;
        }).length;
}

/**
 * @return {number}
 */
function MAXIFS() {
    let filteredRange = MATCHSUBTABLE.apply(this, arguments)
        .filter(function (el) { return isNumeric(el.value);})
        .map(function (el) { return parseFloat(el.value); });

    if (filteredRange.length === 0) return NaN;

    return Math.max.apply(Math, filteredRange);
}

/**
 * @return {number}
 */
function MINIFS() {
    let filteredRange = MATCHSUBTABLE.apply(this, arguments)
        .filter(function (el) { return isNumeric(el.value);})
        .map(function (el) { return parseFloat(el.value); });

    if (filteredRange.length === 0) return NaN;

    return Math.min.apply(Math, filteredRange);
}

/**
 * @return {number}
 */
function FIND(find_text, within_text, position) {
    position = (position === undefined) ? 0 : position;
    if (!within_text) return NaN;
    let source = within_text.RAW ? within_text.RAW : (within_text + "");
    let find = find_text.RAW ? find_text.RAW : (find_text + "");
    return source.replace(/\r/gm, '').indexOf(find, position - 1) + 1;
}

function TEXT(value, format) {
    if (!value || !format) {
        return value;
    }
    value = value.toString();
    format = format.toString();
    let formattedString;
    formattedString = ragic_date_format(value, format);
    if (!formattedString || formattedString === format) {
        formattedString = ragic_number_format(value, format);
    }
    return formattedString;
}

/**
 * ex: UNIQUE(A9, B6, delimeter)
 * delimeter should be non-alphanumeric
 * @returns {Array.<*>|Array}
 */
function UNIQUE() {
    let uniqueArr = [], delimeter = ",";
    for (let i = 0; i < arguments.length; i++) {
        let arg = arguments[i];
        if (Array.isArray(arg.SUM)) {
            uniqueArr = uniqueArr.concat(arg.SUM.map(function (sub) {
                return sub.raw;
            }));
        } else {
            if (arg.RAW) uniqueArr.push(arg.RAW);
            else if(i === arguments.length - 1 && typeof arg == "string" && arg.search(/\w/g) === -1) delimeter = arg;
            else uniqueArr.push(arg + "");
        }
    }

    uniqueArr = uniqueArr.filter(function (value, pos, arr) {
        return value.length && arr.indexOf(value) === pos;
    });
    uniqueArr.toString = function () {
        return this.join(delimeter);
    };
    return uniqueArr;
}

/**
 * @return {string}
 */
function SUBSTITUTE(text, old_text, new_text, Instance_num) {
    if(Instance_num !== undefined && (!Number.isInteger(Instance_num) || Instance_num <= 0)) throw new SyntaxError('Instance_num should be a positive number');
    if (text === undefined || old_text === undefined || new_text === undefined) {
        return text;
    }
    text = text.toString();
    old_text = old_text.toString();
    new_text = new_text.toString();
    if (Instance_num === undefined) {
        return text.replace(new RegExp(RegExp.quote(old_text), 'g'), new_text);
    } else {
        let index = 0, i = 0;
        while (text.indexOf(old_text, index) > 0) {
            index = text.indexOf(old_text, index + 1);
            i++;
            if (i === Instance_num) {
                return text.substring(0, index) + new_text + text.substring(index + old_text.length);
            }
        }
    }
}
/**
 * Convert string to a date time
 * NOTE: Server-side should use Encoder.parseDate instead of dayjs.
 * @return {number}
 */
function DATEVALUE(date_text, date_format) {
    date_text = date_text || "";
    let actualStr = date_text.RAW ? date_text.RAW : ("" + date_text);
    date_format = date_format || "yyyy/MM/dd";
    let d = getDateFromFormat(actualStr, date_format);
    if (!Number.isNaN(d)) {
        if (/^[^yMd]+$/.test(date_format)) return d / MINUTE_MILLI;
        else return d / DAY_MILLI;
    }
    return NaN;
}

/**
 * Translate Arabic numerals
 * @param number
 * @param lang
 * @param option
 * @returns {string}
 */
function SPELLNUMBER(number, lang, option) {
    return Number2Word(number, lang, option);
}

// not a recommended method.
function PREVIOUSROW(arg) {
    if (Array.isArray(arg.SUM)) {
        let key = arg.KEY,
            target = arg.SUM[0],
            runningTotal = target.value || 0,
            rowIndex = target.subtableRowNum,
            currentY = target.y;

        while (rowIndex > 1) {
            let vars = formulaBuilder.getFormulaVariables(arg.FMODE, --currentY);
            if (vars[key].SUM.length) runningTotal = (vars[key].SUM[0].value || 0) + runningTotal;
            rowIndex--;
        }

        return runningTotal;
    }
    return "";
}

/**
 * New name for PREVIOUSROW
 * @param arg
 */
function RUNNINGBALANCE(arg) {
    return PREVIOUSROW(arg);
}

/**
 * @param rate: Required. The interest rate of the loan.
 * @param nper:  Required. The total amount of periods for the loan.
 * @param pv: Required. The present value.
 * @param fv: Optional. The future value.
 * @param type: Optional. The number 0 (zero) or 1 and indicates when payments are due.
 * @return {number}
 * @see https://support.microsoft.com/en-us/office/pmt-function-0214da64-9a63-4996-bc20-214433fa6441?ui=en-us&rs=en-us&ad=us
 */
function PMT(rate, nper, pv, fv, type) {
    if(arguments.length < 3) throw new SyntaxError('You\'ve entered too few arguments for this function');
    fv = fv || 0;
    type = type || 0;
    rate = parseFloat(rate.toString());
    nper = parseInt(nper.toString());
    pv = parseFloat(pv.toString());
    let pvif = Math.pow(1 + rate, nper);
    let result = pv * rate * (pvif + fv) / (pvif - 1);
    if (type === 1) result /= (1 + rate);
    return result;
}

/**
 * hour, minute, second should be Integer , not float number
 * @return {number}
 */
function TIME(hour, minute, second) {
    hour = parseInt(hour.toString());
    minute = parseInt(minute.toString());
    second = parseInt(second.toString());

    if (arguments.length !== 3) throw new SyntaxError('You should enter three arguments for this function');
    if (!isNumeric(hour) || !isNumeric(minute) || !isNumeric(second)) throw new SyntaxError('Arguments should be number!');
    if (hour < 0 || hour > 32767) throw new SyntaxError('The hour\'s range is 0 ~ 32767');
    if (minute < 0 || minute > 32767) throw new SyntaxError('The minute\'s range is 0 ~ 32767');
    if (second < 0 || second > 32767) throw new SyntaxError('The second\'s range is 0 ~ 32767');

    let UNIT = 1 / 86400, HOUR_SECOND = 3600, MINUTE_SECOND = 60;

    if (hour > 23) {
        return TIME(hour % 24, minute, second);
    } else if(minute > 59) {
        return TIME(hour + Math.floor(minute / MINUTE_SECOND), minute % MINUTE_SECOND, second);
    } else if(second > 59) {
        return TIME(hour, minute + Math.floor(second / MINUTE_SECOND), second % MINUTE_SECOND);
    }
    return (hour * HOUR_SECOND + minute * MINUTE_SECOND + second) * UNIT;
}

function ISBLANK(arg) {
    return arg === "" || arg.RAW === "";
}

/**
 * Multiply multiple subtable numeric fields or the same row of subtable numeric fields.
 * Work mostly the same way as normal math multiplication `*`, the only difference is that when there's an empty or non-numeric value, it isn't regarded as 0, PRODUCT will just ignore it instead.
 *
 * Ex1:  A1, B1, and C1 are all subtable fields, `PRODUCT(A1, B1, C1)` is applied on a field in the same subtable.
 * When A1 is 5, B1 is 3, C1 is empty, PRODUCT(A1, B1, C1) == 15 same as 5 * 3,  but A1 * B1 * C1 == 0
 * When A1 is 5, B1 is 3, C1 is "test", PRODUCT(A1, B1, C1) == 15 same as 5 * 3,  but A1 * B1 * C1 == 0
 *
 *
 * Ex2:  A1 and B1 are subtable fields,
 * A1 has these values in three rows: 3, 4, 5
 * B1 has no value in three rows
 *
 * PRODUCT(A1) == 60
 * PRODUCT(B1) == 0
 * PRODUCT(A1, B1) == 60
 * PRODUCT(A1, B1, 10) == 600
 * PRODUCT(A1, B1, 'hello') == ""  (throw Error)
 * PRODUCT(B1, 15) == 15
 *
 * @return {number}
 * @constructor
 */
//注意: 後端沒有 Number.isNaN，壓縮時要改成 isNaN
function PRODUCT() {
    if(arguments.length === 0) throw new SyntaxError('You should enter at least one argument for this function');
    let result = 1, arg;
    let hasValue = false;

    for(let i = 0, argLen = arguments.length; i < argLen; i++) {
        arg = arguments[i];
        // number or not number
        if (arg.SUM === undefined) {
            arg = parseInt(arg);
            if(Number.isNaN(arg) && mode !== BUILDER) {
                throw new SyntaxError('The argument should be a number');
            }
            else {
                hasValue = true;
                result *= arg;
            }
        }
        // not subtable field
        else if (!Array.isArray(arg.SUM)) {
            arg = parseInt(arg.RAW);

            //maybe the value is empty, then we ignore it
            if(!Number.isNaN(arg)) {
                hasValue = true;
                result *= arg;
            }
        }
        // subtable field
        else {
            result *= arg.SUM.reduce(function (acc, subObj) {
                if (isNumeric(subObj.value)) {
                    if(!hasValue) {
                        hasValue = true;
                    }
                    return acc * (subObj.value);
                }
                return acc;
            }, 1);
        }
    }

    //ex: PRODUCT(A1, B1), when A1, and B1 subtable field's values are all empty, the result is 0 same as Excel
    if(!hasValue) {
        result = 0;
    }

    return result;
}

/**
 *  Remove leading and trailing spaces, keep one of the space in the consecutive spaces in the middle of the string.
 *  The space here means 半形、全形 , we don't handle "html &nbsp;".
 */
function TRIM(str) {
    // let htmlNBSP = String.fromCodePoint(0xA0);  // html &nbsp;
    // let space = String.fromCodePoint(0x20);  //半形空格
    // let IdeographicSpace = String.fromCodePoint(0x3000);  //全形空格
    str = str.toString();
    str = str.replace(/^([\u0020\u3000])*|([\u0020\u3000])*$/g, "");  //去掉頭尾的全部半形、全形空格
    str = str.replace(/(\u0020)+(\u3000)*/g, "$1");  //對於中間的連續多個半形、全形空格，只保留一個，如果半形在最前面，變成一個半形空格
    str = str.replace(/(\u3000)+(\u0020)*/g, "$1");  //對於中間的連續多個半形、全形空格，只保留一個，如果全形在最前面，變成一個全形空格
    return str;
}