function CalDaily(){
}
CalDaily.prototype.init=function(spaceConfig){
  this.resources=spaceConfig['resources'];
  this.fromTime=bookings.rules.getFromTime();
  this.toTime=bookings.rules.getToTime();
  this.cal=new Cal(this.resources.length);
  this.hourSplit=bookings.rules.getHourSplit();
  this.chosenDateObj=new Date(getState('cursorDate'));
  this.chosenDate=simpleFormatDate(this.chosenDateObj);
  this.deletedResources=new Array(this.resources.length);
};
CalDaily.prototype.ifInRange=function(date1,date2){
  if(!date1) return false;
  if(!date2){
    return date1.getFullYear()==this.chosenDateObj.getFullYear() && date1.getMonth()==this.chosenDateObj.getMonth() && date1.getDate()==this.chosenDateObj.getDate();
  }

  var chosenFrom=this.chosenDateObj;
  chosenFrom.setHours(0);chosenFrom.setMinutes(0);chosenFrom.setSeconds(0);chosenFrom.setMilliseconds(0);
  var chosenTo=new Date(this.chosenDateObj);
  chosenTo.setHours(0);chosenTo.setMinutes(0);chosenTo.setSeconds(0);chosenTo.setMilliseconds(0);
  chosenTo.setDate(this.chosenDateObj.getDate()+1);

  date1=simpleParseDateTime(date1);
  date2=simpleParseDateTime(date2);

//  alert(simpleFormatDateTime(chosenFrom)+','+simpleFormatDateTime(chosenTo)+'VS'+simpleFormatDateTime(date1)+','+simpleFormatDateTime(date2));

  return date1.getTime()<chosenFrom.getTime() && date2.getTime()>chosenFrom.getTime() ||
         date1.getTime()>=chosenFrom.getTime() && date1.getTime()<chosenTo.getTime();
};





/*
 Date changing
 */
CalDaily.prototype.pickerAdd=function(delta){
  if(delta){
    this.chosenDateObj.setDate(this.chosenDateObj.getDate()+delta);
    this.chosenDate=simpleFormatDate(this.chosenDateObj);
  }
  else{
    this.chosenDateObj=new Date();
    this.chosenDate=simpleFormatDate(this.chosenDateObj);
  }
  setState('cursorDate',this.chosenDate);
  this.bookings.drawContainer();
  this.bookings.updateCal();
};
CalDaily.prototype.setDate=function(date){
  this.chosenDate=date;
  setState('cursorDate',this.chosenDate);
  this.chosenDateObj=new Date(date);
  this.datepicker.myDate=new Date(date);
};





CalDaily.prototype.drawAll=function(){
  this.cal.drawAll();
};
CalDaily.prototype.translateToCalIndex=function(date){
  date=simpleParseDateTime(date);
  var hour=date.getHours();
  var minutes=date.getMinutes();

  var dayStart=new Date(this.chosenDateObj);
  var fromHour=parseInt(this.fromTime.substr(0,2));
  var fromMinutes=parseInt(this.fromTime.substr(3,2));
  var toHour=parseInt(this.toTime.substr(0,2));
  var toMinutes=parseInt(this.toTime.substr(3,2));
  dayStart.setHours(fromHour);dayStart.setMinutes(fromMinutes);dayStart.setSeconds(0);dayStart.setMilliseconds(0);
  var dayEnd=new Date(this.chosenDateObj);
  dayEnd.setHours(toHour);dayEnd.setMinutes(toMinutes-1);dayEnd.setSeconds(59);dayEnd.setMilliseconds(999);
//  debug(simpleFormatDateTime(dayEnd)+':'+simpleFormatDateTime(date));

  if(date.getTime()<dayStart.getTime()) return 1;
  else if(date.getTime()>dayEnd.getTime()) return this.cal.maxXIndex;


  var splitUnit=60/this.hourSplit;
  var minuteIndex=Math.floor(minutes/splitUnit);
  var fromMinutesOffset=fromMinutes/splitUnit;
  var index=(hour-fromHour)*this.hourSplit
      + minuteIndex + fromMinutesOffset;

  //check for boundaries
  if(index<1) index=0;
  if(index>this.cal.maxXIndex) index=this.cal.maxXIndex;

  return index;
};
CalDaily.prototype.translateIndexToTimeFrom=function(index){
//  index--;//column header

  //check for boundaries
  if(index<1) index=0;
  if(index>this.cal.maxXIndex) index=this.cal.maxXIndex;


  var fromHour=parseInt(this.fromTime.substr(0,2));
  var fromMinutes=parseInt(this.fromTime.substr(3,2));
  var fromMinutesOffset=fromMinutes/(60/this.hourSplit);

  var hour=Math.floor(fromHour+((index-fromMinutesOffset)/this.hourSplit));

  var minuteIndex=(index-fromMinutesOffset) % this.hourSplit;
  var minutes=minuteIndex*(60/this.hourSplit);

  if(hour<10) hour='0'+hour;
  if(minutes<10) minutes='0'+minutes;
  return this.chosenDate+' '+hour+':'+minutes+':00';
};
CalDaily.prototype.translateIndexToTimeTo=function(index){
//  index--;//column header

  //check for boundaries
  if(index<1) index=0;
  if(index>this.cal.maxXIndex) index=this.cal.maxXIndex;

  index--;//time to index is referring to the cell after this cell


  var fromHour=parseInt(this.fromTime.substr(0,2));
  var fromMinutes=parseInt(this.fromTime.substr(3,2));
  var fromMinutesOffset=fromMinutes/(60/this.hourSplit);

  var hour=Math.floor(fromHour+((index-fromMinutesOffset)/this.hourSplit));

  var minuteIndex=(index-fromMinutesOffset) % this.hourSplit;
  var minutes=minuteIndex*(60/this.hourSplit);

  if(hour<10) hour='0'+hour;
  if(minutes<10) minutes='0'+minutes;
  return this.chosenDate+' '+hour+':'+minutes+':00';
};
CalDaily.prototype.getTempBookingItem=function(whostring,whatstring,email,phone){
  var tempSec=this.cal.tempSec;
  if(!tempSec || tempSec.style.display=='none') return null;
  var booking={
    r:getResourceIndex(parseInt(tempSec.getAttribute('y')),this.deletedResources),
    start:this.translateIndexToTimeFrom(tempSec.getAttribute('x1')),
    end:this.translateIndexToTimeTo(parseInt(tempSec.getAttribute('x2'))+1),
    bookdate:simpleFormatDate(new Date())
  };
//  debug(JSON.stringify(booking));
  if(whostring) booking['who']=whostring;
  if(whatstring) booking['what']=whatstring;
  if(email) booking['email']=email;
  if(phone) booking['phone']=phone;
  if(tempSec.getAttribute('state')==1) booking['invalid']=true;
//  alert(JSON.stringify(booking));
  return booking;
};

//we can read booking as a JSONArray
//we only read the booking items that matches the date
CalDaily.prototype.readBookingJSON=function(bookings){
  this.cal.resetSecs();
  for(var i=0;i<bookings.length;i++){
    var booking=bookings[i];
    this.readSingleBooking(booking);
  }
};
CalDaily.prototype.readSingleBooking=function(booking){
  var bookingStart=booking['start'];
  var bookingEnd=booking['end'];
  var mod=booking['mod'];

  if(this.deletedResources[booking['r']]) return;

  //if this is a modify event
  if(mod){
    var targetEvent=this.cal.getFGSec(mod);
    if(targetEvent){
      if(booking['ifDelete']) this.cal.removeFGSec(targetEvent['id']);
      if(booking['who']) targetEvent['title']=booking['who'];
      if(booking['what']) targetEvent['text']=booking['who'];
      if(booking['start']) targetEvent['x1']=this.translateToCalIndex(booking['start']);
      if(booking['end']) targetEvent['x2']=this.translateToCalIndex(booking['end']);
      if(booking['r']) targetEvent['y']=getUIIndex(booking['r'],this.deletedResources);
    }
  }
  else if(this.ifInRange(bookingStart,bookingEnd)){
    var sec={
      id:booking['id'],
      title:booking['who'],
      text:booking['what'],
      x1:this.translateToCalIndex(bookingStart),
      x2:this.translateToCalIndex(bookingEnd),
      y:getUIIndex(booking['r'],this.deletedResources)
    };
    this.cal.addFGSec(sec);
  }
};





CalDaily.prototype.getBGHead=function(){
  document.getElementById('thisRange').innerHTML=this.chosenDate;
  var table=document.createElement('table'),row,cell, i, j,k;
  //header
  row=table.insertRow(-1);
  cell=row.insertCell(-1);
  cell.style.width='120px';
  var fromHour=parseInt(this.fromTime.substr(0,2));
  if(fromHour<0) fromHour=0;
//  var fromMinutes=parseInt(this.fromTime.substr(3,2));
  var toHour=parseInt(this.toTime.substr(0,2));
//  var toMinutes=parseInt(this.toTime.substr(3,2));
  for(j=fromHour;j<=toHour;j++){
    cell=row.insertCell(-1);
    cell.colSpan=this.hourSplit;
    cell.className='headerTop';
    var text;
    if(j>12) text=(j-12)+'pm';
    else text=j+'am';
    cell.innerHTML=text;
  }

  var calheadElement=document.getElementById('calhead');
  calheadElement.innerHTML='';
  calheadElement.appendChild(table);

  return table;
};
CalDaily.prototype.getBG=function(){
  var table=document.createElement('table'),row,cell, i, j,k;
  table.id='caltable';
  var datepicker=new DatePicker(this);
  datepicker.showMonth();
  var fromHour=parseInt(this.fromTime.substr(0,2));
  if(fromHour<0) fromHour=0;
  var fromMinutes=parseInt(this.fromTime.substr(3,2));
  var toHour=parseInt(this.toTime.substr(0,2));
  var toMinutes=parseInt(this.toTime.substr(3,2));


  //resources
  for(i=0;i<this.resources.length;i++){
    var res=this.resources[i];
    if(res['delete']) {
      this.deletedResources[i]=true;
      continue;
    }

    row=table.insertRow(-1);
    cell=row.insertCell(-1);
    cell.className='headerLeft';
    cell.innerHTML='<div class="delResource" onclick="delResouce('+i+');">✕</div>' +
        '<input type=text class="editable" onchange="resouceRename('+i+',this.value);" value="'+res['name']+'">' +
        '<div class="resqty" onclick="updateResouceQty('+i+','+res['qty']+');">('+res['qty']+')</div>';
    var count=1;
    var y;
    for(j=fromHour;j<=toHour;j++){

      for(k=0;k<this.hourSplit;k++){
        cell=row.insertCell(-1);
        cell.id='_sl_'+count+'_'+i;
        y=getDeleteShift(i,this.deletedResources);
        cell.setAttribute('y',y);
        cell.setAttribute('x',count);
        if(k==this.hourSplit-1) cell.className='cell1';
        else cell.className='cell2';

        if(!bookings.rules.ifDayAvailable(this.chosenDateObj) || !bookings.rules.ifTimeAvailable(j,k*(60/this.hourSplit))) {
          cell.style.background='#f2f2f2';
          this.cal.ruleDisabledSlots.push({x:count,y:y});
        }

        cell.innerHTML=count;
        count++;
      }
    }
  }
  this.cal.maxXIndex=count;

  //append
  var calElement=document.getElementById('cal');
  calElement.style.overflowY='scroll';//put the scrollbar there first so that the cal width calculation will be correct, or the nowline will be a little bit off
  calElement.innerHTML='<div id="calsec"></div>';
  calElement.appendChild(table);
  this.cal.initCalElement(table);


  //calc
  this.cal._calcGrid();

  //create now line
  var today=new Date();
  var todayString=simpleFormatDate(today);
  var todayTimeString=simpleFormatDateTime(today);
  if(todayString==this.chosenDate){
    var index=this.translateToCalIndex(todayTimeString);
    if(index && index<this.cal.maxXIndex){
      var minutes=today.getMinutes();
      var line=document.createElement('div');line.className='nowline';
      line.innerHTML='';
      var left=this.cal.xMarks[index];
      var cellWidth=this.cal.xMarks[index+1]-this.cal.xMarks[index];
      var timeUnit=60/this.hourSplit;
      left=left+(cellWidth*(minutes % timeUnit)/timeUnit);
      line.style.left=left+'px';
      line.style.height=document.getElementById('caltable').clientHeight+'px';
      document.getElementById('cal').appendChild(line);
    }
  }

  //the add resouce button
  cell=table.insertRow(-1).insertCell(-1);
  cell.style.textAlign='right';
  cell.style.padding='8px 8px';
  cell.innerHTML='<div class="button" onclick="addResource();">+</div>';

//  return table;
};

