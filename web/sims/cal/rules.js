function Rules(spaceConfig){
  this.spaceConfig=spaceConfig;
}
Rules.prototype.getFromTime=function(){
  var openranges=this.spaceConfig['repeatingrules'][0]['day']['openranges'];
  return openranges[0]['from'];
};
Rules.prototype.getToTime=function(){
  var openranges=this.spaceConfig['repeatingrules'][0]['day']['openranges'];
  return openranges[openranges.length-1]['to'];
};
Rules.prototype.getHourSplit=function(){
  var dayRules=this.spaceConfig['repeatingrules'][0]['day'];
  return dayRules['hourSplit'];
};
Rules.prototype.ifDayAvailable=function(date){
  //default close, opened by repeating rules
  //open day rule
  //week => month => year
  //repeatingRule1 => repeatingRule2 => adhocRules...

  //week rules
  var available=false;

  var weekRules=this.spaceConfig['repeatingrules'][0]['week'];
  var opendays=weekRules['opendays'];
  if(opendays.indexOf(date.getDay())!=-1) available=true;


  //month rules
  var monthRules=this.spaceConfig['repeatingrules'][0]['month'];
  var closedays=monthRules['closedays'];
  opendays=monthRules['opendays'];
  if(opendays.indexOf(date.getDate())!=-1) available=true;
  if(closedays.indexOf(date.getDate())!=-1) available=false;

  //year rules
  var yearRules=this.spaceConfig['repeatingrules'][0]['year'];
  closedays=yearRules['closedays'];
  opendays=yearRules['opendays'];
  var todaystring=simpleFormatDate(date).substring(5);
  if(opendays.indexOf(todaystring)!=-1) available=true;
  if(closedays.indexOf(todaystring)!=-1) available=false;

  //general rules
  var generalRules=this.spaceConfig['repeatingrules'][0]['general'];
  closedays=generalRules['closedays'];
  opendays=generalRules['opendays'];
  todaystring=simpleFormatDate(date);
  if(opendays.indexOf(todaystring)!=-1) available=true;
  if(closedays.indexOf(todaystring)!=-1) available=false;

  return available;
};
Rules.prototype.ifTimeAvailable=function(hour,minutes){
  var dayRules=this.spaceConfig['repeatingrules'][0]['day'];
  var openranges=dayRules['openranges'];
  for(var i=0;i<openranges.length;i++){
    var slot=openranges[i];
    var slotFromHour=parseInt(slot['from'].substr(0,2));
    var slotFromMinute=parseInt(slot['from'].substr(3,2));
    var slotToHour=parseInt(slot['to'].substr(0,2));
    var slotToMinute=parseInt(slot['to'].substr(3,2));
    if((hour>slotFromHour || hour==slotFromHour && minutes>=slotFromMinute) &&
        hour<slotToHour || hour==slotToHour && minutes<slotToMinute) return true;
  }
  return false;
};



/*
 *  Rendering all config types
 */
function renderDailyConfig(){
  var dayRules=spaceConfig['repeatingrules'][0]['day'];

  //from time and to time
  var openRanges=dayRules['openranges'];
  var div='<div class="ruleSection">';

  for(var i=0;i<openRanges.length;i++){
    var range=openRanges[i];
    div+='<div class="ruleItem">';
    div+='From '+getTimeSelection('dailyRangeFrom'+i,range['from'])+' to '+getTimeSelection('dailyRangeTo'+i,range['to']);
    div+='<span class="smallX" onclick="deleteDailyRange('+i+');">✕</span>';
    div+='</div>';
  }
  div+='<div class="ruleItem"><a href="javascript:void(0);" onclick="moreDailyRange();">more</a></div>';

  div+='</div>';

  div+='<div class="ruleSection">';

  //time unit
  var hourSplit=dayRules['hourSplit'];
  var timeUnit=60 / hourSplit;
  div+='<div class="ruleItem">';
  div+='Time unit '+getTimeLengthSelection('timeUnit',timeUnit,2);
  div+='</div>';


  //min booking length
  var bookingMinUnit=dayRules['bookingMinUnit'];
  div+='<div class="ruleItem">';
  div+='Booking unit '+getTimeLengthSelection('bookingMinUnit',bookingMinUnit,12);
  div+='</div>';

  //max booking length
  var bookingMaxUnit=dayRules['bookingMaxUnit'];
  div+='<div class="ruleItem">';
  div+='Max booking length '+getTimeLengthSelection('bookingMaxUnit',bookingMaxUnit,12);
  div+='</div>';

  div+='</div>';

  $('configCanvas').innerHTML=div;
}
function renderWeeklyConfig(){
  var weekRules=spaceConfig['repeatingrules'][0]['week'];
  var div='';

  //open weekdays
  var opendays=weekRules['opendays'];
  div+='<div class="ruleSection">' +
      '<div class="ruleItem"><input type="checkbox" onchange="saveUIWeeklyConfig();" id="weeklyOpen0" '+(opendays.indexOf(0)!=-1?'checked':'')+' /> Sunday</div>'+
      '<div class="ruleItem"><input type="checkbox" onchange="saveUIWeeklyConfig();" id="weeklyOpen1" '+(opendays.indexOf(1)!=-1?'checked':'')+' /> Monday</div>'+
      '<div class="ruleItem"><input type="checkbox" onchange="saveUIWeeklyConfig();" id="weeklyOpen2" '+(opendays.indexOf(2)!=-1?'checked':'')+' /> Tuesday</div>'+
      '<div class="ruleItem"><input type="checkbox" onchange="saveUIWeeklyConfig();" id="weeklyOpen3" '+(opendays.indexOf(3)!=-1?'checked':'')+' /> Wednesday</div>'+
      '<div class="ruleItem"><input type="checkbox" onchange="saveUIWeeklyConfig();" id="weeklyOpen4" '+(opendays.indexOf(4)!=-1?'checked':'')+' /> Thursday</div>'+
      '<div class="ruleItem"><input type="checkbox" onchange="saveUIWeeklyConfig();" id="weeklyOpen5" '+(opendays.indexOf(5)!=-1?'checked':'')+' /> Friday</div>'+
      '<div class="ruleItem"><input type="checkbox" onchange="saveUIWeeklyConfig();" id="weeklyOpen6" '+(opendays.indexOf(6)!=-1?'checked':'')+' /> Saturday</div>'+
      '</div></div>';

  $('configCanvas').innerHTML=div;
}
function renderMonthlyConfig(){
  var monthRules=spaceConfig['repeatingrules'][0]['month'];
  var div='';

  //open month dates
  div+='<div class="ruleSection">';
  div+='<div class="ruleItem">';
  div+='Booking open for each ';
  for(var i=0;i<monthRules['opendays'].length;i++){
    var openday=monthRules['opendays'][i];
    div+=getMonthDateSelection('openMonthly'+i,openday);
    div+='<span class="smallX" onclick="deleteMonthlyOpenDate('+i+');">✕</span>';
  }
  if(monthRules['opendays'].length==0){
    div+=getMonthDateSelection('openMonthly0');
  }
  else{
    div+='<span class="fakelink" onclick="moreMonthlyOpenDate();">+</span>';
  }
  div+=' day of the month';
  div+='</div>';

  //close month dates
  div+='<div class="ruleItem">';
  div+='Booking closed for each ';
  for(var i=0;i<monthRules['closedays'].length;i++){
    var closeday=monthRules['closedays'][i];
    div+=getMonthDateSelection('closeMonthly'+i,closeday);
    div+='<span class="smallX" onclick="deleteMonthlyCloseDate('+i+');">✕</span>';
  }
  if(monthRules['closedays'].length==0){
    div+=getMonthDateSelection('closeMonthly0');
  }
  else{
    div+='<span class="fakelink" onclick="moreMonthlyCloseDate();">+</span>';
  }
  div+=' day of the month';
  div+='</div>';

  div+='</div>';

  $('configCanvas').innerHTML=div;
}
function renderYearlyConfig(){
  var yearRules=spaceConfig['repeatingrules'][0]['year'];
  var div='';

  div+='<div class="ruleSection">';
  //open month dates
  div+='<div class="ruleItem">';
  div+='Booking open for each ';
  for(var i=0;i<yearRules['opendays'].length;i++){
    var openday=yearRules['opendays'][i];
    div+=getYearDateSelection('openYearlyMonth'+i,'openYearlyDate'+i,openday);
    div+='<span class="smallX" onclick="deleteYearlyOpenDate('+i+');">✕</span>';
  }
  if(yearRules['opendays'].length==0){
    div+=getYearDateSelection('openYearlyMonth0','openYearlyDate0');
  }
  else{
    div+='<span class="fakelink" onclick="moreYearlyOpenDate();">+</span>';
  }
  div+=' of the year';
  div+='</div>';

  //close month dates
  div+='<div class="ruleItem">';
  div+='Booking closed for each ';
  for(var i=0;i<yearRules['closedays'].length;i++){
    var closeday=yearRules['closedays'][i];
    div+=getYearDateSelection('closeYearlyMonth'+i,'closeYearlyDate'+i,closeday);
    div+='<span class="smallX" onclick="deleteYearlyCloseDate('+i+');">✕</span>';
  }
  if(yearRules['closedays'].length==0){
    div+=getYearDateSelection('closeYearlyMonth0','closeYearlyDate0');
  }
  else{
    div+='<span class="fakelink" onclick="moreYearlyCloseDate();">+</span>';
  }
  div+=' of the year';
  div+='</div>';

  div+='</div>';

  $('configCanvas').innerHTML=div;
}
function renderGeneralConfig(){
  var generalRules=spaceConfig['repeatingrules'][0]['general'];

  var div='';

  div+='<div class="ruleSection">';
  //open special days
  div+='<div class="ruleItem">Booking opened for these dates: ';
  for(var i=0;i<generalRules['opendays'].length;i++){
    var openday=generalRules['opendays'][i];
    div+='<span>'+openday+'</span>';
  }
  div+='</div>';

  //close special days
  div+='<div class="ruleItem">Booking closed for these dates: ';
  for(var i=0;i<generalRules['closedays'].length;i++){
    var closeday=generalRules['closedays'][i];
    div+='<span>'+closeday+'</span>';
  }
  div+='</div>';

  div+='</div>';

  $('configCanvas').innerHTML=div;
}
/*
 *  Creating all types of selection element
 */
function getTimeSelection(id,time){
  var result='<select id="'+id+'" onchange="saveUIDailyConfig();">';
  result+='<option value=""></option>';
  for(var i=0;i<24;i++){
    var time1=(i<10?'0':'')+i+':00';
    var time2=(i<10?'0':'')+i+':30';
    result+='<option value="'+time1+'" '+(time==time1?'selected':'')+'>'+time1+'</option>';
    result+='<option value="'+time2+'" '+(time==time2?'selected':'')+'>'+time2+'</option>';
  }
  result+='</select>';
  return result;
}
function getTimeLengthSelection(id,time,iMax){
  var result='<select id="'+id+'" onchange="saveUIDailyConfig();">';
  for(var i=1;i<=iMax;i++){
    var value=i*30;
    var text=Math.floor(value/60)+(value%60==30?'.5':'')+' hr'+(i<=2?'':'s');
    result+='<option value="'+value+'" '+(time==value?'selected':'')+'>'+text+'</option>';
  }
  result+='</select>';
  return result;

}
function getMonthDateSelection(id,monthDate){
  var result='<select id="'+id+'" onchange="saveUIMonthlyConfig();">';
  result+='<option value=""></option>';
  for(var i=1;i<=31;i++){
    result+='<option value='+i+' '+(i==monthDate?'selected':'')+'>'+i+'</option>'
  }
  result+='</select>';
  return result;
}
function getYearDateSelection(monthId,dateId,date){
  var month=0;
  var monthDate=0;
  if(date){
    month=parseInt(date.substr(0,2));
    monthDate=parseInt(date.substr(3,2));
  }

  var result='<select id="'+monthId+'" onchange="saveUIYearlyConfig();">'
        +'<option value=""></option>'
        +'<option value=1 '+(1==month?'selected':'')+'>January</option>'
        +'<option value=2 '+(2==month?'selected':'')+'>February</option>'
        +'<option value=3 '+(3==month?'selected':'')+'>March</option>'
        +'<option value=4 '+(4==month?'selected':'')+'>April</option>'
        +'<option value=5 '+(5==month?'selected':'')+'>May</option>'
        +'<option value=6 '+(6==month?'selected':'')+'>June</option>'
        +'<option value=7 '+(7==month?'selected':'')+'>July</option>'
        +'<option value=8 '+(8==month?'selected':'')+'>August</option>'
        +'<option value=9 '+(9==month?'selected':'')+'>September</option>'
        +'<option value=10 '+(10==month?'selected':'')+'>October</option>'
        +'<option value=11 '+(11==month?'selected':'')+'>November</option>'
        +'<option value=12 '+(12==month?'selected':'')+'>December</option>'
        +'</select>';

//  result+='/';

  result+='<select id="'+dateId+'" onchange="saveUIYearlyConfig();">';
  result+='<option value=""></option>';
  for(var i=1;i<=31;i++){
    result+='<option value='+i+' '+(i==monthDate?'selected':'')+'>'+i+'</option>'
  }
  result+='</select>';


  return result;
}







/*
 *   Config manipulation
 */
function saveUIDailyConfig(){
  var newRange=[];

  for(var i=0;$('dailyRangeFrom'+i);i++){
    var fromElement=$('dailyRangeFrom'+i);
    var toElement=$('dailyRangeTo'+i);
    newRange.push({from:fromElement.options[fromElement.selectedIndex].value,to:toElement.options[toElement.selectedIndex].value});
  }
  spaceConfig['repeatingrules'][0]['day']['openranges']=newRange;

  var timeUnitValue=$('timeUnit').options[$('timeUnit').selectedIndex].value;
  spaceConfig['repeatingrules'][0]['day']['hourSplit']=60/timeUnitValue;

  var bookingMaxUnit=$('timeUnit').options[$('timeUnit').selectedIndex].value;
  spaceConfig['repeatingrules'][0]['day']['bookingMaxUnit']=bookingMaxUnit;

  var bookingMinUnit=$('bookingMinUnit').options[$('bookingMinUnit').selectedIndex].value;
  spaceConfig['repeatingrules'][0]['day']['bookingMinUnit']=bookingMinUnit;


}
function saveUIWeeklyConfig(){
  var opendays=[];
  for(var i=0;i<=6;i++){
    if($('weeklyOpen'+i).checked) opendays.push(i);
  }
  spaceConfig['repeatingrules'][0]['week']['opendays']=opendays;
}
function saveUIMonthlyConfig(){
  var opendays=[];
  for(var i=0;$('openMonthly'+i);i++){
    var openMonthly=$('openMonthly'+i);
    opendays.push(openMonthly.options[openMonthly.selectedIndex].value);
  }
  spaceConfig['repeatingrules'][0]['month']['opendays']=opendays;

  var closedays=[];
  for(var i=0;$('closeMonthly'+i);i++){
    var closeMonthly=$('closeMonthly'+i);
    closedays.push(closeMonthly.options[closeMonthly.selectedIndex].value);
  }
  spaceConfig['repeatingrules'][0]['month']['closedays']=closedays;

//  alert(JSON.stringify(spaceConfig,null,2));
}
function saveUIYearlyConfig(){
  var opendays=[];
  for(var i=0;$('openYearlyMonth'+i);i++){
    var openYearlyMonth=$('openYearlyMonth'+i);
    var openYearlyMonthValue=openYearlyMonth.options[openYearlyMonth.selectedIndex].value;
    if(openYearlyMonthValue<10) openYearlyMonthValue='0'+openYearlyMonthValue;
    var openYearlyDate=$('openYearlyDate'+i);
    var openYearlyDateValue=openYearlyDate.options[openYearlyDate.selectedIndex].value;
    if(openYearlyDateValue<10) openYearlyDateValue='0'+openYearlyDateValue;
    opendays.push(openYearlyMonthValue+'/'+openYearlyDateValue);
  }
  spaceConfig['repeatingrules'][0]['year']['opendays']=opendays;

  var closedays=[];
  for(var i=0;$('closeYearlyMonth'+i);i++){
    var closeYearlyMonth=$('closeYearlyMonth'+i);
    var closeYearlyMonthValue=closeYearlyMonth.options[closeYearlyMonth.selectedIndex].value;
    if(closeYearlyMonthValue<10) closeYearlyMonthValue='0'+closeYearlyMonthValue;
    var closeYearlyDate=$('closeYearlyDate'+i);
    var closeYearlyDateValue=closeYearlyDate.options[closeYearlyDate.selectedIndex].value;
    if(closeYearlyDateValue<10) closeYearlyDateValue='0'+closeYearlyDateValue;
    closedays.push(closeYearlyMonthValue+'/'+closeYearlyDateValue);
  }
  spaceConfig['repeatingrules'][0]['year']['closedays']=closedays;
}
function saveUIGeneralConfig(){

}
function moreDailyRange(){
  spaceConfig['repeatingrules'][0]['day']['openranges'].push({from:null,to:null});
  renderDailyConfig();
  saveUIDailyConfig();
}
function deleteDailyRange(index){
  spaceConfig['repeatingrules'][0]['day']['openranges'].splice(index,1);
  renderDailyConfig();
  saveUIDailyConfig();
}
function moreMonthlyOpenDate(){
  spaceConfig['repeatingrules'][0]['month']['opendays'].push(0);
  renderMonthlyConfig();
  saveUIMonthlyConfig();
}
function deleteMonthlyOpenDate(index){
  spaceConfig['repeatingrules'][0]['month']['opendays'].splice(index,1);
  renderMonthlyConfig();
  saveUIMonthlyConfig();
}
function deleteMonthlyCloseDate(index){
  spaceConfig['repeatingrules'][0]['month']['closedays'].splice(index,1);
  renderMonthlyConfig();
  saveUIMonthlyConfig();
}
function deleteYearlyOpenDate(index){
  spaceConfig['repeatingrules'][0]['year']['opendays'].splice(index,1);
  renderYearlyConfig();
  saveUIYearlyConfig();
}
function deleteYearlyCloseDate(index){
  spaceConfig['repeatingrules'][0]['year']['closedays'].splice(index,1);
  renderYearlyConfig();
  saveUIYearlyConfig();
}
function moreMonthlyCloseDate(){
  spaceConfig['repeatingrules'][0]['month']['closedays'].push(0);
  renderMonthlyConfig();
  saveUIMonthlyConfig();
}
function moreYearlyOpenDate(){
  spaceConfig['repeatingrules'][0]['year']['opendays'].push('');
  renderYearlyConfig();
  saveUIYearlyConfig();
}
function moreYearlyCloseDate(){
  spaceConfig['repeatingrules'][0]['year']['closedays'].push('');
  renderYearlyConfig();
  saveUIYearlyConfig();
}






var spaceConfig;
//load the config when page load
loadConfig();
function loadConfig(){
  var spaceConfigString=RagicStorage.localStorage.getItem('ragic_config_'+apname);
  if(spaceConfigString){
    spaceConfig=JSON.parse(spaceConfigString);
  }
  else{
    spaceConfig={
      name:'Ragic meeting room booking',
      admins:[],//only admin see booking details

      //default close, opened by repeating rules
      //open day rule
      //week => month => year
      //repeatingRule1 => repeatingRule2 => repeatingRule3...
      repeatingrules:[{
        condition:{
          resources:'*',
          period:{}
        },
        day:{
          openranges:[
            {from:'08:30',to:'12:30'},{from:'13:00',to:'19:30'}
          ],
          bookingMinUnit:30,
          bookingMaxUnit:180,
          hourSplit:2
        },
        week:{
          opendays:[1,2,3,4,5]
        },
        month:{
          opendays:[],
          closedays:[1]
        },
        year:{
          opendays:[],
          closedays:['08/08']
        },
        general:{
          opendays:[],
          closedays:['2013/08/08']
        }
      }],
      resources:[
        {name:'101',qty:1},
        {name:'102',qty:1},
        {name:'103',qty:1}
      ]
    };
  }
}
function saveConfig(){
  RagicStorage.localStorage.setItem('ragic_config_'+apname,JSON.stringify(spaceConfig));
}



function resouceRename(index,value){
  spaceConfig['resources'][index]['name']=value;
  saveConfig();
}






