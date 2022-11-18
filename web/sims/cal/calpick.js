function datePickerClick(obj){
  var picker=new DatePicker(obj);
  picker.showMonth();
  ctrl.datePickerInput=obj;
}
function node(name){
  return document.createElement(name);
}
function DatePicker(caltype){
  this.dateFormat='yyyy/MM/dd';
  this.myDate=new Date(getState('cursorDate'));
  this.caltype=caltype;
  caltype.datepicker=this;
}
DatePicker.prototype.addMonth = function (delta) {
  this.setMonth(this.myDate.getMonth() + delta);
};
DatePicker.prototype.setNow = function () {
  this.myDate = new Date();
  this.showMonth();
};
DatePicker.prototype.setMonth = function (month) {
  this.myDate = new Date(this.myDate.getFullYear(), month, 1); // [Issue #9603] [Issue #9583] 12/31 + setMonth(2) = 02/31 = 03/03
  this.showMonth();
};
DatePicker.prototype.setYear = function (year) {
  this.myDate = new Date(year, this.myDate.getMonth(), this.myDate.getDate());
  this.showMonth();
};
DatePicker.prototype.showMonth=function(){
  var year=this.myDate.getFullYear();
  var month=this.myDate.getMonth();
  var firstMonthDay=new Date(year,month,1);
  var firstWeekDay=firstMonthDay.getDay();
  var newCursorDay=new Date(firstMonthDay.getTime());
  newCursorDay.setDate(firstMonthDay.getDate()-firstWeekDay);
  var cursorDay=newCursorDay;//new Date(firstMonthDay.getTime()-firstWeekDay*DAY_MILLI);
  var cursorDayValue=simpleFormatDate(cursorDay);

  var div=node('div');div.className='datePickerRagic';

  //year month header
  var ymheader=node('table');ymheader.className='ymheaderTable';
  var row,cell;
  row=ymheader.insertRow(-1);
  var monthSel=getMonthSel(this.myDate.getMonth(),this.myDate.getFullYear());
  var prevMonth=node('span');prevMonth.innerHTML='&nbsp;&lt;&nbsp;';
  var nextMonth=node('span');nextMonth.innerHTML='&nbsp;&gt;&nbsp;';
//  var yearSel=getYearSel(this.myDate.getFullYear());yearSel.picker=this;yearSel.onchange=function(){this.picker.setYear(this.options[this.selectedIndex].value);};yearSel.onclick=function(){ctrl.dropWin=true;}
  cell=row.insertCell(-1);cell.appendChild(monthSel);
  cell=row.insertCell(-1);
  cell.style.textAlign='right';
  cell.style.color='#999';
  cell.appendChild(prevMonth);prevMonth.picker=this;prevMonth.onclick=function(){this.picker.addMonth(-1);};
  cell.appendChild(nextMonth);nextMonth.picker=this;nextMonth.onclick=function(){this.picker.addMonth(1);};
//  cell=row.insertCell(-1);cell.appendChild(yearSel);
  div.appendChild(ymheader);

  //day table
  var table=node('table');table.className='calTable';
  div.appendChild(table);
  //weekday header
  row=table.insertRow(-1);
  cell=row.insertCell(-1);cell.innerHTML='S';
  cell=row.insertCell(-1);cell.innerHTML='M';
  cell=row.insertCell(-1);cell.innerHTML='T';
  cell=row.insertCell(-1);cell.innerHTML='W';
  cell=row.insertCell(-1);cell.innerHTML='T';
  cell=row.insertCell(-1);cell.innerHTML='F';
  cell=row.insertCell(-1);cell.innerHTML='S';
  //start calendar
  var rowcount= 0,colcount=0;
  while(rowcount<6){
    row=table.insertRow(-1);
    while(colcount<7){
      cell=row.insertCell(-1);
      cell.innerHTML=cursorDay.getDate();
      cell.setAttribute('value',cursorDayValue);
      cell.onclick=datePickerDateClick;

      if(cursorDay.getMonth()!=month) cell.className='notThisMonth';
      if(cursorDayValue==simpleFormatDate(new Date())) cell.style.border='1px solid #555';
      if(this.cellDate && cursorDayValue==simpleFormatDate(this.cellDate)) cell.style.backgroundColor='#555555';
      if(this.caltype.ifInRange(cursorDay)) cell.style.backgroundColor='#efefef';
      if(bookings.getDailyBookingCount(cursorDay)>0) cell.style.fontWeight='bold';

      newCursorDay=new Date(cursorDay.getTime());
      newCursorDay.setDate(cursorDay.getDate()+1);
      cursorDay=newCursorDay;//new Date(cursorDay.getTime()+DAY_MILLI);
      cursorDayValue=simpleFormatDate(cursorDay);
      colcount++;
    }
    rowcount++;
    colcount=0;
  }

  //add the div
  document.getElementById('datepicker').innerHTML='';
  document.getElementById('datepicker').appendChild(div);
};








//utility
function simpleParseDateTime(date){
  try{
    //yyyy/MM/dd HH:mm:ss
    return new Date(
        parseInt(date.substr(0,4)),
        parseInt(date.substr(5,2))-1,
        parseInt(date.substr(8,2)),
        parseInt(date.substr(11,2)),
        parseInt(date.substr(14,2)),
        parseInt(date.substr(17,2)),
        0);
  }
  catch(e) {
    return null;
  }
}
function simpleFormatDate(date){
  if(!date) return '';
  var month=date.getMonth()+1;
  var day=date.getDate();
  if(month<10) month='0'+month.toString();
  if(day<10) day='0'+day.toString();
  return date.getFullYear()+'/'+month+'/'+day;
}
function simpleFormatDateTime(date){
  var hours=date.getHours();
  var min=date.getMinutes();
  var sec=date.getSeconds();
  if(hours<10) hours='0'+hours;
  if(min<10) min='0'+min;
  if(sec<10) sec='0'+sec;
  return simpleFormatDate(date)+' '+hours+':'+min+':'+sec;
}
function datePickerDateClick(){
  var dateString=this.getAttribute('value');
  bookings.caltype.setDate(dateString);
  initBooking();
}
function getMonthSel(thisMonth,thisYear){
  var o=node('div');
  o.style.whiteSpace='nowrap';
  switch(thisMonth){
    case 0:o.innerHTML='January '+thisYear;break;
    case 1:o.innerHTML='February '+thisYear;break;
    case 2:o.innerHTML='March '+thisYear;break;
    case 3:o.innerHTML='April '+thisYear;break;
    case 4:o.innerHTML='May '+thisYear;break;
    case 5:o.innerHTML='June '+thisYear;break;
    case 6:o.innerHTML='July '+thisYear;break;
    case 7:o.innerHTML='August '+thisYear;break;
    case 8:o.innerHTML='September '+thisYear;break;
    case 9:o.innerHTML='October '+thisYear;break;
    case 10:o.innerHTML='November '+thisYear;break;
    case 11:o.innerHTML='December '+thisYear;break;
  }
  return o;
}
