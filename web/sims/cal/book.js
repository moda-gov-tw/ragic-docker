function Bookings(spaceConfig,apname){
  this.spaceConfig=spaceConfig;
  this.apname=apname;
  this.ebookings=[];
  this.cbookings=null;
  this.dom=null;
  this.domhead=null;
  this.rules=new Rules(spaceConfig);
}
Bookings.prototype.setCalType=function(caltype){
  this.dom=null;
  this.domhead=null;
  this.caltype=caltype;
  caltype.init(this.spaceConfig);
  caltype.bookings=this;
  caltype.cal.bookings=this;
};
Bookings.prototype.drawContainer=function(){
  this.getBGHead();
  this.getBG();
};
Bookings.prototype.consolidateEvents=function(){
  this.cbookings=new Array();
  var cbooking;
  for(var i=0;i<this.ebookings.length;i++){
    var booking=this.ebookings[i];

    if(booking['ifDelete']){
      this.removeConsolidatedBooking(booking['mod']);
    }
    else if(booking['mod']){
      cbooking=this.getConsolidatedBooking(booking['mod']);
      if(cbooking){
        for(var key in booking){
          if(key=='mod') continue;
          cbooking[key]=booking[key];
        }
      }
    }
    else{
      this.cbookings.push(cloneObj(booking));
    }
  }
};
Bookings.prototype.removeConsolidatedBooking=function(id){
  var index=-1;
  for(var i=0;i<this.cbookings.length;i++){
    var booking=this.cbookings[i];
    if(booking['id']==id) {
      index=i;
    }
  }
  if(index>=0) this.cbookings.splice(index,1);
};
Bookings.prototype.getConsolidatedBooking=function(id){
  for(var i=0;i<this.cbookings.length;i++){
    var booking=this.cbookings[i];
    if(booking['id']==id) {
      return booking;
    }
  }
};


/*
 *   Data processing
 */
Bookings.prototype.loadBooking=function(bookingArray,nodraw){
  for(var i=0;i<bookingArray.length;i++){
    this.ebookings.push(bookingArray[i]);
  }
  this.consolidateEvents();

  //update calendar
  this.updateCal(nodraw);
};
Bookings.prototype.createBookingItem=function(whostring,whatstring,email,phone){
  var bookingItem=this.caltype.getTempBookingItem(whostring,whatstring,email,phone);
  if(!bookingItem) return;
  this.ebookings.push(bookingItem);

  //store it
  this.storeLocalBooking(bookingItem);
  this.consolidateEvents();

  //update calendar
  this.updateCal();
};
Bookings.prototype.getDailyBookingCount=function(date){
  if(!this.cbookings) this.consolidateEvents();
  var count=0;
  for(var i=0;i<this.cbookings.length;i++){
    var booking=this.cbookings[i];
    var startDateString=booking['start'].substr(0,10);
    var endDateString=booking['end'].substr(0,10);
    var start=new Date(startDateString);
    var end=new Date(endDateString);
    if(start.getTime()<=date.getTime() && end.getTime()>date.getTime()) count++;//the end time equals not included for full day events so that they won't be counted in the next day
    if(startDateString==endDateString && simpleFormatDate(date)==startDateString) count++;
  }
  return count;
};
Bookings.prototype.getBooking=function(bookingId){
  for(var i=0;i<this.cbookings.length;i++){
    var booking=this.cbookings[i];
    if(booking['id']==bookingId) {
      return booking;
    }
  }
  return null;
};
Bookings.prototype.updateBookingItem=function(id,whostring,whatstring,email,phone){
  var bookingItem=this.caltype.getTempBookingItem();

  //no booking from temp, meaning this is a content update from the info panel
  if(!bookingItem) {
    bookingItem={
      who:whostring,
      what:whatstring,
      email:email,
      phone:phone,
      bookdate:simpleFormatDate(new Date())
    };
  }
  if(bookingItem['invalid']){
    return;
  }


    bookingItem['mod']=id;
  this.ebookings.push(bookingItem);

  //store it
  this.storeLocalBooking(bookingItem);
  this.consolidateEvents();

  //update calendar
  this.updateCal();

};
Bookings.prototype.loadTestJSON=function(){
  this.loadBooking([
    {id:1,r:1,start:'2013/07/29 10:00:00',end:'2013/07/29 12:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'},
    {id:2,r:1,start:'2013/07/29 11:00:00',end:'2013/07/29 12:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'},
    {id:3,r:1,start:'2013/07/29 11:00:00',end:'2013/07/29 13:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'},
    {id:4,r:1,start:'2013/07/29 12:00:00',end:'2013/07/29 13:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'},
    {id:5,r:1,start:'2013/07/29 08:00:00',end:'2013/07/29 15:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'},
    {id:6,r:1,start:'2013/07/29 13:00:00',end:'2013/07/29 15:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'},
    {id:7,r:2,start:'2013/07/29 08:00:00',end:'2013/07/29 11:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'},
    {id:8,r:2,start:'2013/07/29 11:00:00',end:'2013/07/29 12:00:00',who:'Jeff Kuo',what:'Weekly meeting',email:'jeff@ragic.com',phone:'+886911010201',bookdate:'2013/07/29 08:08:08'}
  ]);
};

/*
 *   Server-side processing
 */
Bookings.prototype.getUnsaved=function(){
  try{
    var unsaved=JSON.parse(RagicStorage.localStorage.getItem('NBU|'+this.apname));
    if(!unsaved){
      unsaved=[];
      RagicStorage.localStorage.setItem('NBU|'+this.apname,JSON.stringify(unsaved));
    }
    return unsaved;
  }
  catch(e){
    return [];
  }
};
Bookings.prototype.getSaved=function(){
  try{
    var saved=JSON.parse(RagicStorage.localStorage.getItem('NB|'+this.apname));
    if(!saved){
      saved=[];
      RagicStorage.localStorage.setItem('NB|'+this.apname,JSON.stringify(saved));
    }
    return saved;
  }
  catch(e){
    return [];
  }
};
Bookings.prototype.storeLocalBooking=function(bookingItem){
  var unsaved=this.getUnsaved();
  unsaved.push(bookingItem);
  bookingItem['id']='U'+unsaved.length;
  RagicStorage.localStorage.setItem('NBU|'+this.apname,JSON.stringify(unsaved));
};
Bookings.prototype.loadLocalBookings=function(){
  this.loadBooking(this.getSaved(),true);
  this.loadBooking(this.getUnsaved());
};

/*
*   Interaction UI
*/
Bookings.prototype.updateCal=function(nodraw,noread){
  if(!noread) {
    if(!this.cbookings) this.consolidateEvents();
    this.caltype.readBookingJSON(this.cbookings);
  }
  if(!nodraw) {
    this.caltype.drawAll();
    this.caltype.datepicker.showMonth();
  }
};
Bookings.prototype.showAddInfo=function(sec){
  var info=document.getElementById('info');
  var calsec=document.getElementById('cal');
  if(!sec) {
    sec=this.caltype.cal.tempSec;
    if(!sec) return;
    if(sec.getAttribute('state')==1) {
      sec.style.display='none';
      return;
    }
  }
  var pos=findPos(sec);
  info.style.display='';

  //too low, put on top
  if(pos[1]+info.offsetHeight+5>ctrl.bodyHeight) info.style.top=pos[1]-info.offsetHeight-5-calsec.scrollTop+'px';
  //normal, put at bottom
  else info.style.top=pos[1]+sec.offsetHeight+5-calsec.scrollTop+'px';

  if(pos[0]+info.offsetWidth>ctrl.bodyWidth) info.style.right=0;
  else info.style.left=pos[0]+"px";

  //load event info
  var tempSec=this.caltype.cal.tempSec;
  if(!tempSec || tempSec.style.display=='none'){
    var booking=bookings.getBooking(sec.getAttribute('sid'));
    drag.updatingSid=sec.getAttribute('sid');
    if(booking){
      document.getElementById('infowho').value=booking['who'] || '';
      document.getElementById('infowhat').value=booking['what'] || '';
      document.getElementById('infoemail').value=booking['email'] || '';
      document.getElementById('infophone').value=booking['phone'] || '';
    }
    else{
      alert('cannot find booking:'+sec.getAttribute('sid'));
    }
  }
};
Bookings.prototype.doAddInfo=function(){
  var info=document.getElementById('info');
  if(this.caltype.cal.tempSec && this.caltype.cal.tempSec.style.display==''){
    this.createBookingItem(
        document.getElementById('infowho').value,
        document.getElementById('infowhat').value,
        document.getElementById('infoemail').value,
        document.getElementById('infophone').value
    );
  }
  else{
    this.updateBookingItem(drag.updatingSid,
        document.getElementById('infowho').value,
        document.getElementById('infowhat').value,
        document.getElementById('infoemail').value,
        document.getElementById('infophone').value
    );
  }
  this.closeInfo();
};
Bookings.prototype.deleteBooking=function(sid){
  if(!sid) return;
  var bookingItem={
    ifDelete:true
  };

  bookingItem['mod']=sid;
  this.ebookings.push(bookingItem);
//  debug(JSON.stringify(bookingItem));

  //store it
  this.storeLocalBooking(bookingItem);
  this.consolidateEvents();

  //update calendar
  this.updateCal();

  this.closeInfo();
};
Bookings.prototype.closeInfo=function(){
  var info=document.getElementById('info');
  if(this.caltype.cal.tempSec && this.caltype.cal.tempSec.style.display=='') {
    this.caltype.cal.tempSec.style.display='none';
  }
  info.style.display='none';
};



/*
 *   Init with DOM
 */
Bookings.prototype.getBG=function(){
  this.caltype.getBG();
};
Bookings.prototype.getBGHead=function(){
  this.caltype.getBGHead();
};





function initBooking(){
  //setup the calendar ui
  bookings=new Bookings(spaceConfig,apname);


  //resetting the display
  var formatList=document.getElementById('dateformat');
  for(var i=0;i<formatList.childNodes.length;i++){
    formatList.childNodes[i].className='button';
  }

  //set format
  if(getState('format')=='formatDaily') {
    bookings.setCalType(new CalDaily());
    $('formatDaily').className+=' selected';
  }
  else if(getState('format')=='formatMonthly') {
    bookings.setCalType(new CalMonthly());
    $('formatMonthly').className+=' selected';
  }


  bookings.drawContainer();
  bookings.loadLocalBookings();
  bookings.caltype.setDate(getState('cursorDate'));
  bookings.caltype.datepicker.showMonth();
  bookings.updateCal();
  updateBodySize();
}

