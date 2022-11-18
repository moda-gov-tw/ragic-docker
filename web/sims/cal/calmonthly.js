function CalMonthly(){
}
CalMonthly.prototype.init=function(spaceConfig){
  this.resources=spaceConfig['resources'];
  this.fromTime=spaceConfig['fromTime'];
  this.toTime=spaceConfig['toTime'];
  this.cal=new Cal(this.resources.length);
  this.hourSplit=spaceConfig['hourSplit'];
  this.chosenDateObj=new Date(getState('cursorDate'));
  this.chosenDate=simpleFormatDate(this.chosenDateObj);
  this.deletedResources=new Array(this.resources.length);
};
CalMonthly.prototype.ifInRange=function(date1,date2){
  if(!date1) return false;
  if(!date2){
    return date1.getFullYear()==this.chosenDateObj.getFullYear() && date1.getMonth()==this.chosenDateObj.getMonth();
  }

  var chosenFrom=this.chosenDateObj;
  chosenFrom.setDate(1);chosenFrom.setHours(0);chosenFrom.setMinutes(0);chosenFrom.setSeconds(0);chosenFrom.setMilliseconds(0);
  var chosenTo=new Date(this.chosenDateObj);
  chosenTo.setDate(1);chosenTo.setHours(0);chosenTo.setMinutes(0);chosenTo.setSeconds(0);chosenTo.setMilliseconds(0);
  chosenTo.setMonth(this.chosenDateObj.getMonth()+1);

//  debug(date1+','+date2+','+simpleFormatDateTime(chosenFrom));
  date1=simpleParseDateTime(date1);
  date2=simpleParseDateTime(date2);

//  alert(simpleFormatDateTime(chosenFrom)+','+simpleFormatDateTime(chosenTo)+'VS'+simpleFormatDateTime(date1)+','+simpleFormatDateTime(date2));

  return date1.getTime()<chosenFrom.getTime() && date2.getTime()>chosenFrom.getTime() ||
      date1.getTime()>=chosenFrom.getTime() && date1.getTime()<chosenTo.getTime();
};




/*
  Date changing
 */
CalMonthly.prototype.pickerAdd=function(delta){
  if(delta){
    this.chosenDateObj.setMonth(this.chosenDateObj.getMonth()+delta);
    this.chosenDate=simpleFormatDate(this.chosenDateObj);
    setState('cursorDate',this.chosenDate);
    this.datepicker.addMonth(delta);
  }
  else{
    this.chosenDateObj=new Date();
    this.chosenDate=simpleFormatDate(this.chosenDateObj);
    setState('cursorDate',this.chosenDate);
    this.datepicker.setNow();
  }
};
CalMonthly.prototype.setDate=function(date){
  this.chosenDateObj=new Date(date);
  this.chosenDate=date;
  setState('cursorDate',this.chosenDate);
  this.datepicker.myDate=new Date(date);
};





CalMonthly.prototype.drawAll=function(){
  this.cal.drawAll();
};
CalMonthly.prototype.translateToCalIndexFrom=function(date){
  //  yyyy/mm/dd HH:mm:ss
  var day=parseInt(date.substring(8,10));
  return day;
};
CalMonthly.prototype.translateToCalIndexTo=function(date){
  //  yyyy/mm/dd HH:mm:ss
  var hours=date.substr(11,8);
  var day=parseInt(date.substring(8,10));
  if(hours=='00:00:00' && day==1) return this.getLastDayOfMonth()+1;
  else return day;
};
CalMonthly.prototype.translateIndexToTimeFrom=function(index){
  var yearmonth=this.chosenDate.substr(0,8);
  return yearmonth+(index<10?'0':'')+index+' 00:00:00';
};
CalMonthly.prototype.translateIndexToTimeTo=function(index){
  var datestring=this.chosenDate.substr(0,8)+(index-1);
  var date=new Date(datestring);
  date=new Date(date.getTime()+1000*60*60*24);
  return simpleFormatDate(date)+' 00:00:00';
};
CalMonthly.prototype.getTempBookingItem=function(whostring,whatstring,email,phone){
  var tempSec=this.cal.tempSec;
  if(!tempSec || tempSec.style.display=='none') return null;
  var booking={
    r:getResourceIndex(parseInt(tempSec.getAttribute('y')),this.deletedResources),
    start:this.translateIndexToTimeFrom(tempSec.getAttribute('x1')),
    end:this.translateIndexToTimeTo(parseInt(tempSec.getAttribute('x2'))),
    bookdate:simpleFormatDate(new Date())
  };
  if(whostring) booking['who']=whostring;
  if(whatstring) booking['what']=whatstring;
  if(email) booking['email']=email;
  if(phone) booking['phone']=phone;
  if(tempSec.getAttribute('state')==1) booking['invalid']=true;
  return booking;
};

//we can read booking as a JSONArray
//we only read the booking items that matches the date
CalMonthly.prototype.readBookingJSON=function(bookings){
  this.cal.resetSecs();
  for(var i=0;i<bookings.length;i++){
    var booking=bookings[i];
    this.readSingleBooking(booking);
  }
};
CalMonthly.prototype.readSingleBooking=function(booking){
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
      if(booking['start']) targetEvent['x1']=this.translateToCalIndexFrom(booking['start']);
      if(booking['end']) targetEvent['x2']=this.translateToCalIndexTo(booking['end']);
      if(booking['r']) targetEvent['y']=getUIIndex(booking['r'],this.deletedResources);
    }
  }
  else if(this.ifInRange(bookingStart,bookingEnd)){
    var sec={
      id:booking['id'],
      title:booking['who'],
      text:booking['what'],
      x1:this.translateToCalIndexFrom(bookingStart),
      x2:this.translateToCalIndexTo(bookingEnd),
      y:getUIIndex(booking['r'],this.deletedResources)
    };
    this.cal.addFGSec(sec);
  }
};





CalMonthly.prototype.getBGHead=function(){
  document.getElementById('thisRange').innerHTML=this.chosenDateObj.getFullYear()+'/'+(this.chosenDateObj.getMonth()+1);
  var table=document.createElement('table'),row,cell, i, j,k;


  //header
  row=table.insertRow(-1);
  cell=row.insertCell(-1);
  cell.style.width='120px';

  var year=this.chosenDateObj.getFullYear();
  var month=this.chosenDateObj.getMonth();
  var cursorDay=new Date(year,month,1);
  while(cursorDay.getMonth()==month){
    cell=row.insertCell(-1);
    cell.colSpan=this.hourSplit;
    cell.className='headerTop';
    cell.style.textAlign='center';
    if(cursorDay.getDate()==1){
      cell.innerHTML=(cursorDay.getMonth()+1)+'/'+cursorDay.getDate();
    }
    else{
      cell.innerHTML=cursorDay.getDate();
    }
    cursorDay.setDate(cursorDay.getDate()+1);
  }

  var calheadElement=document.getElementById('calhead');
  calheadElement.innerHTML='';
  calheadElement.appendChild(table);

  return table;
};
CalMonthly.prototype.getBG=function(){
  var table=document.createElement('table'),row,cell, i, j,k;
  table.id='caltable';
  var datepicker=new DatePicker(this);
  datepicker.showMonth();
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
    cell.innerHTML='<input type=text class="editable" onchange="resouceRename('+i+',this.value);" value="'+res['name']+'"><div class="resqty">('+res['qty']+')</div>';

    var year=this.chosenDateObj.getFullYear();
    var month=this.chosenDateObj.getMonth();
    var cursorDay=new Date(year,month,1);
    var count=1;
    while(cursorDay.getMonth()==month){
      cell=row.insertCell(-1);
      var monthDay=cursorDay.getDate();
      var y=getUIIndex(i,this.deletedResources);
      cell.id='_sl_'+monthDay+'_'+i;
      cell.setAttribute('y',y);
      cell.setAttribute('x',monthDay);
      cell.className='cell2';
      if(!bookings.rules.ifDayAvailable(cursorDay)) {
        cell.style.background='#f2f2f2';
        this.cal.ruleDisabledSlots.push({x:monthDay,y:y});
      }
//      cell.innerHTML=cursorDay.getMonth()+'/'+cursorDay.getDate();
      cursorDay.setDate(monthDay+1);
      count++;
    }
  }
  this.cal.maxXIndex=count;

  //append
  var calElement=document.getElementById('cal');
  calElement.innerHTML='<div id="calsec"></div>';
  calElement.appendChild(table);
  this.cal.initCalElement(table);

  //calc
  this.cal._calcGrid();

  //create now line
  var todayString=simpleFormatDate(new Date());
  if(todayString.substr(0,7)==this.chosenDate.substr(0,7)){
    var index=parseInt(todayString.substr(8,2));
    var hour=new Date().getHours();
    if(index && index<this.cal.maxXIndex){
      var line=document.createElement('div');line.className='nowline';
      line.innerHTML='';
      var left=this.cal.xMarks[index];
      var cellWidth=this.cal.xMarks[index+1]-this.cal.xMarks[index];
      left=left+(cellWidth*hour/24);
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

CalMonthly.prototype.getLastDayOfMonth=function(){
  var d = this.chosenDateObj;
  d.setFullYear(d.getFullYear(), d.getMonth()+1, 0);
  return d.getDate();
};
