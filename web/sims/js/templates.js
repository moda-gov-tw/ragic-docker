
function TemplateLibrary(json){
    this.json=json;
    this.selectedCategory=0;
    this.selectedTemplate=0;
}
TemplateLibrary.prototype.getJson=function(id) {
    var cats = this.json['cats'];
    var templateJson;
    for(var i = 0; i < cats.length ;i++) {
        var list = cats[i].list;
        if(list) {
            templateJson = cats[i].list.find(function(ele) {
                return ele.id === id;
            });
        }
        if(templateJson) return templateJson;
    }
    return null;
}
TemplateLibrary.prototype.search=function(){
    var result1=[],result2=[];
    var dev=window['user'] && window['user'].endsWith('@ragic.com');

    for(var i=0;i<this.json['cats'].length;i++){
        var cat=this.json['cats'][i];
        if(!cat['list'] || cat['list'].length==0) continue;

        var list=cat['list'];
        for(var j=0;j<list.length;j++){
            var listItem=list[j];
            if(listItem['status']=='Private' && !dev && window['licenseType']!='DEV' ) continue;
            if(listItem['name'] && listItem['name'].toUpperCase().indexOf(this.searchText.toUpperCase())!=-1){
                result1.push(listItem);
            }
            else if(listItem['desc'] && listItem['desc'].toUpperCase().indexOf(this.searchText.toUpperCase())!=-1){
                result2.push(listItem);
            }
        }
    }
    var result=result1.concat(result2);
    var cat={'list':result};

    return cat;
};
TemplateLibrary.prototype.checkIfCustomized=function(id, ifFirst, button){
    var cats = this.json['cats'];
    var templateJson;
    for(var i = 0; i < cats.length ;i++) {
        var list = cats[i].list;
        if(list) {
            templateJson = cats[i].list.find(function(ele) {
                return ele.id === id;
            });
        }
        if(templateJson) break;
    }
    var ifHomePage = document.getElementById('templateLibrary') && document.getElementById('templateLibrary').classList.contains('homeTemplateLibrary');

    if(templateJson && !ifHomePage) {
        var sheets = templateJson.installSheets.split("\n");
        var param = {};
        param.ap = ap;
        param.sheets = sheets;
        getPromise('/sims/checkCustomized.jsp' , param).then(JSON.parse).then(function(result) {
            if(result.ifCustomized === true) {
                var customizedSheets= result.sheetsInfo.filter(function(ele){return ele.ifCustomized;})
                    .map(function(ele){return ele.sheetName;}).join(",");
                floatWinConfirmV3(lm['updateCustomizedTemplateWaring'].replace('{0}', "<b>"+customizedSheets+"</b>"),
                    function () {tlib.install(id, ifFirst, button);}
                );
                $('floatingWin').style.zIndex=10000;
            } else {
                tlib.install(id, ifFirst, button);
            }
        });
    } else if(ifHomePage) {
        tlib.install(id, ifFirst,button);
    }
};
TemplateLibrary.prototype.render=function(templateItemsDivScrollTop) {
    var container=$('templateLibrary');
    if(!container) return;
    rm(container);

    var cat;
    //has search
    if(this.searchText){
        cat=this.search();
    }
    //decide current category
    if(!cat) cat=this.json['cats'][this.selectedCategory];
    if(!cat) {
        this.selectedCategory=0;
        cat=this.json['cats'][this.selectedCategory];
    }
    if(!cat){
        if(!ctrl.templateLoadRetryCounter) ctrl.templateLoadRetryCounter=1;
        else ctrl.templateLoadRetryCounter++;
        if(ctrl.templateLoadRetryCounter<5){
            initTemplateLibraryHome();
        }
        else{
            floatWinError('Error loading template, please e-mail support@ragic.com with a screenshot of current screen. Thank you!');
        }
        return;
    }
    var list=cat['list'];
    while(!list && this.selectedCategory+1<this.json['cats'].length) {
        cat=this.json['cats'][++this.selectedCategory];
        list=cat['list'];
    }

    //render left sidebar
    var sidebar=node('div');
    sidebar.className='templateLibrarySidebar';
    container.appendChild(sidebar);

    //render categories
    var i;
    for(i=0;i<this.json['cats'].length;i++){
        var cat=this.json['cats'][i];
        if(!cat['list'] || cat['list'].length==0) continue;

        var sidebarItem=node('div');
        sidebarItem.className='templateLibrarySidebarItem'+(i==this.selectedCategory && !this.searchText?'Selected':'');
        sidebarItem.setAttribute('id',i);
        sidebarItem.onclick=function(){
            tlib.searchText=null;
            tlib.selectedCategory=this.getAttribute('id');
            tlib.selectedTemplate=0;
            tlib.render();
        };
        sidebar.appendChild(sidebarItem);


        var sidebarItemText=node('a');
        sidebarItemText.href='javascript:void(0);';
        sidebarItemText.className='templateLibrarySidebarItemText';
        sidebarItemText.innerHTML=cat['name'];
        sidebarItem.appendChild(sidebarItemText);
    }

    //render search box
    var searchdiv=node('div');
    searchdiv.className='templateLibrarySidebarItem';
    searchdiv.innerHTML='<input type="text" id="templateSearchbox" title='+lm['accessibility_templateSearch']+' class="templateSearchbox" onblur="ctrl.templateSearchFocus=false;ctrl.outOfNUI=false;" onfocus="ctrl.templateSearchFocus=true;ctrl.outOfNUI=true;" value="'+(this.searchText?this.searchText:'')+'">' +
        '<div class="templateSearchbutton" onclick="templateSearch();"><i class="fa fa-search"></i></div>';
    sidebar.appendChild(searchdiv);

    //render templates under the category
    var templateItemsDiv=node('div');
    templateItemsDiv.className='templateItemsDiv';
    container.appendChild(templateItemsDiv);

    var dev=window['user'] && window['user'].endsWith('@ragic.com');
    for(i=0;i<list.length;i++){
        var listItem=list[i];
        if(listItem['status']=='Private' && !dev && window['licenseType']!='DEV' ) continue;

        if(listItem['Partner app']==='Yes' && window['licenseType']==='DISTR') continue;

        var templateItemDiv=node('div');
        templateItemDiv.className=this.selectedTemplate==i?' templateItemDivSelected':'templateItemDiv';
        templateItemDiv.setAttribute('id',i);
        templateItemDiv.onclick=function(){
            if(tlib.selectedTemplate !== this.getAttribute('id')) {
                tlib.selectedTemplate = this.getAttribute('id');
                tlib.render(templateItemsDiv.scrollTop);
            }
        };
        templateItemsDiv.appendChild(templateItemDiv);

        var templateItemIcon=node('div');
        templateItemIcon.className='templateItemIcon';
        templateItemIcon.innerHTML=listItem['icon'];
        templateItemIcon.querySelector("i").classList.add("fa-fw");
        templateItemDiv.appendChild(templateItemIcon);

        var templateItemText=node('div');
        templateItemText.className='templateItemText';
        templateItemText.innerHTML=listItem['name'];
        templateItemText.setAttribute('id',i);
        templateItemText.onclick=function(){
            if(tlib.selectedTemplate !== this.getAttribute('id')){
                tlib.selectedTemplate=this.getAttribute('id');
                tlib.render(templateItemsDiv.scrollTop);
                event.stopPropagation();
            }
        };
        templateItemDiv.appendChild(templateItemText);

        var templateItemButton=node('div');
        templateItemButton.className='templateItemButton';
        if(listItem['installed']) {
            templateItemButton.innerHTML='<span style="color:#aaaaaa;"><i class="fa fa-check" style="font-size:14px;"></i> '+lm['update']+'</span>';
        }
        else {
            templateItemButton.innerHTML=lm['get'];
        }
        templateItemButton.setAttribute('id',listItem['id']);
        templateItemButton.setAttribute('installed',''+listItem['installed']);
        if(listItem['wizardId']) templateItemButton.setAttribute('wizardId',listItem['wizardId']);
        templateItemButton.onmousedown=installTemplateButton;
        templateItemButton.ontouchstart=installTemplateButton;
        templateItemDiv.appendChild(templateItemButton);
    }
    if(templateItemsDivScrollTop) templateItemsDiv.scrollTop = templateItemsDivScrollTop;
    if(list.length==0){
        templateItemsDiv.innerHTML='<div style="margin:50px;">'+lm['noTemplateMatch']+' <b>'+$('templateSearchbox').value+'</b></div>';
    }

    //render template detail
    var templateDetailDiv=node('div');
    templateDetailDiv.className='templateDetailDiv';
    container.appendChild(templateDetailDiv);
    if(this.selectedTemplate < list.length){
        var currentTemplate=list[this.selectedTemplate];

        var templateItemName=node('div');
        templateItemName.className='templateItemName';
        templateItemName.innerHTML=currentTemplate['name'];

        var doc_url = currentTemplate['doc_url'];

        if(doc_url) {
            var templateHelpIconContent = node('DIV');

            templateHelpIconContent.onclick = function() {
                window.open(doc_url);
            };

            templateHelpIconContent.classList.add('templateHelpIconContent');

            templateHelpIconContent.appendChild(document.createTextNode(lm['templateIntro']));
            templateItemName.appendChild(templateHelpIconContent);
        }

        templateDetailDiv.appendChild(templateItemName);

        var templateItemButton2=node('span');
        templateItemButton2.className='templateItemButton2';

        templateItemButton2.setAttribute('installed',''+currentTemplate['installed']);
        templateItemButton2.setAttribute('id',currentTemplate['id']);
        if(currentTemplate['installed']) {
            templateItemButton2.style.background='#dbdbdb';
            templateItemButton2.innerHTML='<span><i class="fa fa-check" style="font-size:14px;"></i> '+lm['update']+'</span>';
        }
        else {
            templateItemButton2.innerHTML=lm['get'];
        }

        if(currentTemplate['wizardId']) templateItemButton2.setAttribute('wizardId',currentTemplate['wizardId']);
        templateItemButton2.onmousedown=installTemplateButton;
        templateItemButton2.ontouchstart=installTemplateButton;
        templateDetailDiv.appendChild(templateItemButton2);

        var templateItemDesc=node('div');
        templateItemDesc.className='templateItemDesc';
        templateItemDesc.innerHTML=currentTemplate['desc'];
        templateDetailDiv.appendChild(templateItemDesc);

        var templateItemSheets=node('div');
        templateItemSheets.className='templateItemSheets';
        templateItemSheets.innerHTML='<span>'+lm['includedSheets']+':</span><br>'+currentTemplate['sheets'];
        templateDetailDiv.appendChild(templateItemSheets);

        var templateScreenshotDivOuter=node('div');
        templateScreenshotDivOuter.className='templateScreenshotDivOuter';
        templateDetailDiv.appendChild(templateScreenshotDivOuter);
        var templateScreenshotDivInner=node('div');
        templateScreenshotDivInner.className='templateScreenshotDivInner';
        templateScreenshotDivOuter.appendChild(templateScreenshotDivInner);
        for(var i=1;i<=5;i++){
            if(currentTemplate['screenshot'+i]){
                var templateItemScreenshot=node('img');
                templateItemScreenshot.className='templateItemScreenshot';
                templateItemScreenshot.style.width='100%';
                templateItemScreenshot.src='https://www.ragic.com/sims/file.jsp?a=kb&f='+currentTemplate['screenshot'+i]+'&imageResize=335,600';
                templateItemScreenshot.srcFull='https://www.ragic.com/sims/file.jsp?a=kb&f='+currentTemplate['screenshot'+i];
                templateItemScreenshot.onclick=function(){
                    window.open(this.srcFull,'_blank');
                };
                templateScreenshotDivInner.appendChild(templateItemScreenshot);
            }
        }
    }

    container.style.display='';
};
function installTemplateButton(){
    //Precheck
    let id = this.getAttribute('id');
    let templateJo = tlib.getJson(id);

    if(window['edition'] && (window['edition'] ==='FREE2' || window['edition'] === 'LITE2') && templateJo['Paid app'] === 'Yes') {
        lightboxClose();
        quickPartnerTemplateBillChangePlan();
        return false;
    }



    this.innerHTML="<i class='fa fa-spinner fa-spin'></i>";
    if(ctrl.installTemplateRunning) {
        return;
    }
    ctrl.installTemplateRunning=true;
    if(this.getAttribute('installed')=='true' && !tutorial.enabled){
        if(this.getAttribute('wizardId')){
            location.href='/'+ap+'/apps/'+this.getAttribute('wizardId')+'/manage';
        }
        else{
            var updateId=this.getAttribute('id');
            floatWinConfirmV3(
                lm['updateTemplateWarning'],
                tlib.checkIfCustomized.bind(tlib,updateId, false, this)
            );
            $('floatingWin').style.zIndex=10000;
        }
    }
    else{
        if(this.getAttribute('wizardId')){
            var ifHomePage = this.closest('#templateLibrary').classList.contains('homeTemplateLibrary');

            if(ifHomePage) tlib.install(this.getAttribute('id'),true,this);
            else location.href='/'+ap+'/apps/'+this.getAttribute('wizardId')+'/index';
        }
        else{
            tlib.checkIfCustomized(this.getAttribute('id'),true,this);
        }
    }
}
TemplateLibrary.prototype.install=function(id,newInstall,button){
    if(button) button.innerHTML="<i class='fa fa-spinner fa-spin'></i>";
    if(!window['user']){
        location.href='/intl/'+window['langv5']+'/register?appId='+id;
        return;
    }
    //do ajax call to install
    newInstall=newInstall?'true':'false';
    ajaxget('/sims/install.jsp',{
        'id':id,
        'a':ap,
        'newInstall':newInstall,
        'msi':window['menuSetIndex']
    },function(text){
        //do UI update
        var jo=JSON.parse(text);
        //show error message
        if(jo['error']){
            floatWinError(jo['error']);
            return;
        }
        //function execution like prompting to upgrade
        else if(jo['exec']){
            eval(jo['exec']);
            $('floatingWin').style.zIndex=10000;
            return;
        }
        else if(jo['redirMenuSet'] || jo['redirMenuSet']===0){
            location.href='/'+ap+'/home/'+jo['redirMenuSet'];
            return;
        }
        //normal
        else{
            //setting install animation
            var animateJA=[];
            for(var path in jo){
                var pathObj=jo[path];
                var sheets=pathObj['sheets'];
                for(var i=0;i<sheets.length;i++){
                    var sheetObj=sheets[i];
                    animateJA.push(path+'/'+sheetObj['sheetIndex']);
                }
            }
            RagicStorage.localStorage.setItem('INSTALL_ANIMATE',JSON.stringify(animateJA));

            //clearing template cache
            clearTemplateLibraryCache();

            //reload the page to see result and animation
            location.reload();
        }
    });
};
function clearTemplateLibraryCache(){
    RagicStorage.localStorage.removeItem("loadTemplateServerStartTime");
    RagicStorage.localStorage.removeItem("templateJSON"+ap+lm['lang']);
    RagicStorage.localStorage.removeItem("templateJSONDate"+ap+lm['lang']);
}
function templateSearch(){
    if(!$('templateSearchbox').value) return;
    tlib.searchText=$('templateSearchbox').value;
    tlib.render();
}

var tabColorList;
function refreshTabColorList() {
    RagicStorage.localStorage.removeItem('tabColorListDate'+ap+lm['lang']);
    RagicStorage.localStorage.removeItem("tabColorList"+ap+lm['lang']);
}

function preInitTabColorList(callback){
    var todayString=formatDate(new Date(),'yyyy/MM/dd hh');
    //use cache if available
    if(ctrl.ifLocalStorage && todayString==RagicStorage.localStorage.getItem('tabColorListDate'+ap+lm['lang'])){
        var colorJson=RagicStorage.localStorage.getItem("tabColorList"+ap+lm['lang']);
        var json=JSON.parse(colorJson);
        tabColorList = json;
        if(callback) callback();
        return;
    }

    ajaxget('/sims/v5Module/colorList.jsp',{'a':ap},function(colorJson){
        var json=JSON.parse(colorJson);
        //cache result for an hour
        if(ctrl.ifLocalStorage){
            RagicStorage.localStorage.setItem("tabColorList"+ap+lm['lang'],colorJson);
            RagicStorage.localStorage.setItem("tabColorListDate"+ap+lm['lang'],todayString);
        }
        tabColorList = json;
        if(callback) callback();
    }, true);
}

var tlib;
function preInitTemplateLibrary(templateLang, locale) {
    var todayString = formatDate(new Date(), 'yyyy/MM/dd');
    var promise;
    templateLang = templateLang || lm['lang'];

    //use cache if available
    if (ctrl.ifLocalStorage && todayString === RagicStorage.localStorage.getItem('templateJSONDate' + ap + templateLang) && (licenseType !== 'DISTR' || startTime === RagicStorage.localStorage.getItem('loadTemplateServerStartTime'))) {
        var txt = RagicStorage.localStorage.getItem("templateJSON" + ap + templateLang);
        promise = Promise.resolve(txt);
    } else {
        let param = { 'a': ap };
        if (locale) param['locale'] = locale;
        promise = getPromise('/sims/v5Module/installTemplates.jsp', param)
            .then(function (txt) {
                //cache result for a day
                if (ctrl.ifLocalStorage) {
                    if(licenseType === 'DISTR') RagicStorage.localStorage.setItem("loadTemplateServerStartTime", startTime); // #14030
                    RagicStorage.localStorage.setItem("templateJSON" + ap + templateLang, txt);
                    RagicStorage.localStorage.setItem("templateJSONDate" + ap + templateLang, todayString);
                }
                return txt;
            });
    }

    var preInitTemplatePromise = promise
        .then(JSON.parse)
        .then(function (json) {
            tlib = new TemplateLibrary(json);

            if (window['preInitTemplatePromise']) {
                delete window['preInitTemplatePromise'];
            }
        });

    window['preInitTemplatePromise'] = preInitTemplatePromise;

    return preInitTemplatePromise;
}
function initRagicStore(appId, ifShowInstall) {
    var param = {};

    if(appId) param.appId = appId;

    // param.appId = '201903-001';
    getPromise("/sims/ragicAppStoreHome.jsp", param).then(JSON.parse).then(function(json) {
        var appStoreApname = 'rstore';

        document.body.innerHTML = "<div id='returnDiv'><button onclick=''><i class='far fa-angle-left'></i></button></div><div id='ragicAppStoreContainer' style='display:none;'></div>";
        var container = $('ragicAppStoreContainer');



        var titleRow = document.createElement("DIV");
        titleRow.style.marginTop = "20px";
        var logo = json.logo;
        var logoBlock = document.createElement("DIV");
        var logoImg = document.createElement("IMG");

        var basicInfoBlock = document.createElement("DIV");
        var appName = document.createElement("DIV");
        var developers = document.createElement("DIV");
        var developersIcon = document.createElement("I");
        var developerEmails = document.createElement("DIV");
        var developerEmailsIcon = document.createElement("I");

        var priceBlock = document.createElement("DIV");
        var pricePlan = document.createElement("DIV");
        var priceNumber = document.createElement("DIV");

        var installBlock = document.createElement("DIV");
        var installButton = document.createElement("DIV");
        var installIcon = document.createElement("I");
        var updateButton = document.createElement("DIV");
        var updateIcon = document.createElement("I");

        var descriptionSection = document.createElement("DIV");
        var descriptionTitle = document.createElement("DIV");
        var descriptionLine = document.createElement("DIV");
        var descriptionBlock = document.createElement("DIV");

        var previewSection = document.createElement("DIV");
        var previewTitle = document.createElement("DIV");
        var previewLine = document.createElement("DIV");
        var previewBlock = document.createElement("DIV");
        var previewImgArray = [json.image1, json.image2 , json.image3, json.image4, json.image5].filter(function(ele) {
            return !!ele;
        });

        var tutorialSection = document.createElement("DIV");
        var tutorialTitle = document.createElement("DIV");
        var tutorialLine = document.createElement("DIV");
        var flowChartBlock = document.createElement("DIV");
        var flowChart = document.createElement("IMG");


        var supportSection = document.createElement("DIV");
        var supportTitle = document.createElement("DIV");
        var supportLine = document.createElement("DIV");
        var supportBlock = document.createElement("DIV");
        var manualBlock = document.createElement("DIV");
        var manualIconBlock = document.createElement("DIV");
        var manualIcon = document.createElement("I");
        var manual = document.createElement("DIV");
        var supportMailBlock = document.createElement("DIV");
        var supportMailIconBlock = document.createElement("DIV");
        var supportMailIcon = document.createElement("I");
        var supportMail = document.createElement("DIV");
        var supportLinesBlock = document.createElement("DIV");
        var supportLinesIconBlock = document.createElement("DIV");
        var supportLinesIcon = document.createElement("I");
        var supportLines = document.createElement("DIV");


        logoImg.src = "/sims/file.jsp?a="+appStoreApname+"&f=" + logo;
        flowChart.src = "/sims/file.jsp?a="+appStoreApname+"&f=" + json.flowChart;

        logoBlock.classList.add('logoBlock');
        logoImg.classList.add('logoImg');
        appName.classList.add('appName');
        developers.classList.add('developers');
        developersIcon.classList.add('fa','fa-home');
        developerEmails.classList.add('developerEmails');
        developerEmailsIcon.classList.add('fa','fa-envelope');
        basicInfoBlock.classList.add('basicInfoBlock');
        priceBlock.classList.add('priceBlock');
        pricePlan.classList.add('pricePlan');
        priceNumber.classList.add('priceNumber');
        installBlock.classList.add('installBlock');
        installButton.classList.add('installButton');
        installIcon.classList.add('fas','fa-cloud-download-alt');
        updateButton.classList.add('updateButton');
        updateIcon.classList.add('fas','fa-arrow-circle-down');
        descriptionSection.classList.add('descriptionSection');
        descriptionTitle.classList.add('descriptionTitle');
        descriptionLine.classList.add('descriptionLine');
        descriptionBlock.classList.add('descriptionBlock');
        previewSection.classList.add('previewSection');
        previewTitle.classList.add('previewTitle');
        previewLine.classList.add('previewLine');
        previewBlock.classList.add('previewBlock');
        tutorialSection.classList.add('tutorialSection');
        flowChart.classList.add('flowChart');
        supportSection.classList.add('supportSection');
        supportTitle.classList.add('supportTitle');
        supportLine.classList.add('supportLine');
        supportBlock.classList.add('supportBlock');
        manualBlock.classList.add('manualBlock');
        manualIconBlock.classList.add('manualIconBlock');
        manualIcon.classList.add('fas','fa-book');
        manual.classList.add('manual');
        supportMailBlock.classList.add('supportMailBlock');
        supportMailIconBlock.classList.add('supportMailIconBlock');
        supportMailIcon.classList.add('fa','fa-envelope');
        supportMail.classList.add('supportMail');
        supportLinesBlock.classList.add('supportLinesBlock');
        supportLinesIconBlock.classList.add('supportLinesIconBlock');
        supportLinesIcon.classList.add('fas','fa-phone');
        supportLines.classList.add('supportLines');
        tutorialTitle.classList.add('tutorialTitle');
        tutorialLine.classList.add('tutorialLine');
        supportLine.classList.add('supportLine');
        flowChartBlock.classList.add('flowChartBlock');
        supportBlock.classList.add('supportBlock');

        logoBlock.appendChild(logoImg);
        titleRow.appendChild(logoBlock);

        appName.appendChild(document.createTextNode(json.appName));
        developers.appendChild(developersIcon);
        developers.appendChild(document.createTextNode(json.developers));
        developerEmails.appendChild(developerEmailsIcon);
        developerEmails.appendChild(document.createTextNode(json.developerEmails));
        basicInfoBlock.appendChild(appName);
        basicInfoBlock.appendChild(developers);
        basicInfoBlock.appendChild(developerEmails);
        titleRow.appendChild(basicInfoBlock);

        priceNumber.appendChild(document.createTextNode('US $' + json.price));
        pricePlan.appendChild(document.createTextNode(json.pricePlan));
        priceBlock.appendChild(priceNumber);
        priceBlock.appendChild(pricePlan);
        titleRow.appendChild(priceBlock);

        installButton.appendChild(installIcon);
        installButton.appendChild(document.createTextNode("Install"));
        updateButton.appendChild(updateIcon);
        updateButton.appendChild(document.createTextNode("Update"));
        installBlock.appendChild(installButton);

        if(!ifShowInstall) {
            installButton.style.display = 'none';
            updateButton.onclick = function () {
                updateButton.onclick = function () {};
                updateButton.replaceChild(document.createTextNode("Updating..."), updateButton.firstChild);
                floatWinLoading('Please wait until the app update finished...');
                document.getElementById("floatingWin").style['z-index'] = 10000;
                postPromise('/sims/installRagicStoreApp.jsp', {'appSourceUrl':json.accountUrl, 'action':'update', 'ap':ap})
                    .then(JSON.parse).then(function(json) {
                    if(json.result === 'success') {
                        startCheckAppStoreUpdateStatus();
                    } else {
                        floatWinError('<div>Oops...Something was wrong</div><div>'+json.msg+'</div>');
                    }
                });
            };
        } else {
            updateButton.style.display = 'none';
            installButton.onclick = function () {
                var lang = window['langv5'] ? window['langv5'] : "en";
                window.open('/intl/'+ lang +'/register?saas='+appId);
            };
        }


        installBlock.appendChild(document.createElement("DIV"));
        installBlock.appendChild(updateButton);
        titleRow.appendChild(installBlock);

        descriptionTitle.appendChild(document.createTextNode("Description"));
        descriptionBlock.appendChild(document.createTextNode(json.appIntro));
        descriptionSection.appendChild(descriptionTitle);
        descriptionSection.appendChild(descriptionLine);
        descriptionSection.appendChild(descriptionBlock);

        previewTitle.appendChild(document.createTextNode("Preview"));
        previewSection.appendChild(previewTitle);
        previewSection.appendChild(previewLine);
        previewSection.appendChild(previewBlock);

        tutorialTitle.appendChild(document.createTextNode('Tutorial'));
        tutorialSection.appendChild(tutorialTitle);
        tutorialSection.appendChild(tutorialLine);
        flowChartBlock.appendChild(flowChart);
        tutorialSection.appendChild(flowChartBlock);


        supportTitle.appendChild(document.createTextNode('Support'));
        var manualSpan = document.createElement("H3");
        manualSpan.appendChild(document.createTextNode("User Manual"));
        manual.appendChild(manualSpan);
        var manualUrl = document.createElement("A");
        manualUrl.href = json.manual;
        manualUrl.appendChild(document.createTextNode(json.manual));
        manual.appendChild(manualUrl);

        var supportMailSpan = document.createElement("H3");
        supportMailSpan.appendChild(document.createTextNode("Support Mail"));
        supportMail.appendChild(supportMailSpan);
        var mailPart = document.createElement("A");
        mailPart.href = "mailto:"+ json.supportMail;
        mailPart.appendChild(document.createTextNode(json.supportMail));
        supportMail.appendChild(mailPart);

        var supportLinesSpan = document.createElement("H3");
        supportLinesSpan.appendChild(document.createTextNode("Support Lines"));
        supportLines.appendChild(supportLinesSpan);
        var linePart = document.createElement("SPAN");
        linePart.appendChild(document.createTextNode(json.supportLines));
        supportLines.appendChild(linePart);

        manualIconBlock.appendChild(manualIcon);
        supportMailIconBlock.appendChild(supportMailIcon);
        supportLinesIconBlock.appendChild(supportLinesIcon);
        manualBlock.appendChild(manualIconBlock);
        manualBlock.appendChild(manual);
        supportMailBlock.appendChild(supportMailIconBlock);
        supportMailBlock.appendChild(supportMail);
        supportLinesBlock.appendChild(supportLinesIconBlock);
        supportLinesBlock.appendChild(supportLines);
        supportBlock.appendChild(manualBlock);
        supportBlock.appendChild(supportMailBlock);
        supportBlock.appendChild(supportLinesBlock);
        supportSection.appendChild(supportTitle);
        supportSection.appendChild(supportLine);
        supportSection.appendChild(supportBlock);


        container.appendChild(document.createElement("DIV"));
        container.appendChild(titleRow);
        container.appendChild(document.createElement("DIV"));
        container.appendChild(descriptionSection);
        container.appendChild(previewSection);
        container.appendChild(tutorialSection);
        container.appendChild(supportSection);

        container.style.display = '';


        currTransl.length = 0;
        for(let i=0; i< previewImgArray.length; i++){
            currTransl.push(-previewBlock.offsetWidth);
        }
        oldPreviewBlockWidth = previewBlock.offsetWidth;

        initRagicStorePreview(previewImgArray, appStoreApname);

        var debounceRefreshPreview = debouncedFn(300, initRagicStorePreview);

        var wrappedRefreshPreviewFunc = function() {
            offset = previewBlock.offsetWidth;
            //when an user resizes the window, clear all the intervals
            intervalArr.forEach(function (interval) {
                clearInterval(interval);
            })
            intervalArr.length = 0;

            if($('ragicAppStoreContainer')) {
                debounceRefreshPreview(previewImgArray, appStoreApname);
            } else {
                window.removeEventListener("resize", wrappedRefreshPreviewFunc);
            }
        };

        window.addEventListener("resize", wrappedRefreshPreviewFunc);
    });
}
function startCheckAppStoreUpdateStatus(){
    ajaxget('/sims/backupStatus.jsp', {'a' : ap, 'appStore':''}, eval);
    ctrl.timeout=setTimeout(startCheckAppStoreUpdateStatus,1000);
}
function initRagicStorePreviewArrow(length) {
    var previewBlock = document.querySelector(".previewBlock");

    if(!previewBlock.querySelector('.fa-angle-right')) {
        var arrowRight = document.createElement("I");
        arrowRight.classList.add('far','fa-angle-right');
        arrowRight.style.bottom = (previewBlock.offsetHeight / 2) - arrowRight.offsetHeight / 2 - 22 + 'px';
        arrowRight.style.right = '5%';
        var arrowLeft = document.createElement("I");
        arrowLeft.classList.add('far','fa-angle-left');
        arrowLeft.style.left = '5%';
        arrowLeft.style.bottom = (previewBlock.offsetHeight / 2) - arrowLeft.offsetHeight / 2 - 22 + 'px';

        var index = currentIndex, translationComplete = true;
        var imgDiv = previewBlock.querySelector(".imgDiv");
        var moveOffset = previewBlock.offsetWidth;
        var userClick = true, restartInterval = false;

        var previewCarousel = setInterval(function(){
            userClick = false;
            moveRight();
        }, 3000);

        intervalArr.push(previewCarousel);

        var translationCompleted = function () {
            translationComplete = true;
            if(restartInterval){   //let users restart the carousel's sliding automatically after users click the left/right button
                previewCarousel = setInterval(function(){
                    userClick = false;
                    moveRight();
                }, 3000);
                restartInterval = false;
            }
            userClick = true;
        }

        // prevent multiple click when transition
        for(let i=0; i<length; i++){
            let slideImg = document.querySelectorAll('.slide')[i];
            transitionEndListener(slideImg, translationCompleted);
        }

        arrowRight.addEventListener('click',moveRight);
        arrowLeft.addEventListener('click',moveLeft);

        imgDiv.querySelectorAll('video').forEach(function(video){
            //avoid from sliding automatically when the video is playing、enter into full screen、exit full screen
            video.onplay = function () {clearInterval(previewCarousel);};
            video.onpause = function () {
                previewCarousel = setInterval(function(){
                    userClick = false;
                    moveRight();
                }, 3000);
            };
            video.addEventListener("webkitfullscreenchange", function () { clearInterval(previewCarousel);});
            video.addEventListener("mozfullscreenchange", function () {clearInterval(previewCarousel);});
            video.addEventListener("fullscreenchange", function () {clearInterval(previewCarousel);});
        });

        function moveRight() {
            if(userClick) {
                clearInterval(previewCarousel);
                restartInterval = true;
            }
            if(translationComplete) {
                translationComplete = false;
                var prevIndicator = previewBlock.querySelector("#indic_" + index);
                var outerIndex = index;
                index = (index + 1 + length) % length;

                //move all the slideImg to left
                for(let j=0; j<length; j++){
                    let slideImg = imgDiv.querySelectorAll(".slide")[j];
                    let newCurrTransl = currTransl[j] - moveOffset;
                    slideImg.style.opacity = "1";
                    slideImg.style.transform = "translateX(" + newCurrTransl + "px)";
                    currTransl[j] = newCurrTransl;
                }
                //let the left outer slideImg can move to the right outer position
                var outerSlideImg = imgDiv.querySelectorAll(".slide")[outerIndex];
                var outerNewCurrTransl = currTransl[outerIndex] + moveOffset * length;
                outerSlideImg.style.transform = "translateX(" + outerNewCurrTransl + "px)";
                outerSlideImg.style.opacity = "0";
                currTransl[outerIndex] = outerNewCurrTransl;

                var currentIndicator = previewBlock.querySelector("#indic_" + index);

                prevIndicator.style.backgroundColor = "white";
                currentIndicator.style.backgroundColor = "#9b9c9b";

                currentIndex = index;
            }
        };

        function moveLeft() {
            if(userClick) {
                clearInterval(previewCarousel);
                restartInterval = true;
            }
            if(translationComplete) {
                translationComplete = false;
                var prevIndicator = previewBlock.querySelector("#indic_" + index);

                index = (index - 1 + length) % length;
                var outerIndex = index;
                //move all the slideImg to right
                for(let j=0; j<length; j++){
                    let slideImg = imgDiv.querySelectorAll(".slide")[j];
                    let newCurrTransl = currTransl[j] + moveOffset;
                    slideImg.style.opacity = "1";
                    slideImg.style.transform = "translateX(" + newCurrTransl + "px)";
                    currTransl[j] = newCurrTransl;
                }
                //let the right outer slideImg can move to the left outer position
                var outerSlideImg = imgDiv.querySelectorAll(".slide")[outerIndex];
                var outerNewCurrTransl = currTransl[outerIndex] - moveOffset * length;
                outerSlideImg.style.transform = "translateX(" + outerNewCurrTransl + "px)";
                outerSlideImg.style.opacity = "0";
                currTransl[outerIndex] = outerNewCurrTransl;

                var currentIndicator = previewBlock.querySelector("#indic_" + index);

                prevIndicator.style.backgroundColor = "white";
                currentIndicator.style.backgroundColor = "#9b9c9b";

                currentIndex = index;
            }
        };

        previewBlock.appendChild(arrowLeft);
        previewBlock.appendChild(arrowRight);
    }
}
var videoFullScreen = false, intervalArr = [], currTransl = [], currentIndex = 0, oldPreviewBlockWidth, newPreviewBlockWidth;

function initRagicStorePreviewIndicators(length) {
    var previewBlock = document.querySelector(".previewBlock");

    if(!previewBlock.querySelector('.indicators')) {
        var indicatorBlock = document.createElement("DIV");
        indicatorBlock.classList.add("indicatorBlock");
        var indicatorsPromiseArray = [];
        for(var i=0; i<length; i++){
            var p = new Promise(function(resolve){
                let indicator = document.createElement("DIV");
                indicator.style.width = previewBlock.offsetWidth / (4 * length) + 'px';
                indicator.id = "indic_" + i;
                resolve(indicator);
            });
            indicatorsPromiseArray.push(p);
        }
        Promise.all(indicatorsPromiseArray).then(function(indicators){
            indicators.forEach(function (indicator, index) {
                indicator.classList.add("indicators");
                if(index === currentIndex) {
                    indicator.style.backgroundColor = "#9b9c9b";
                }else{
                    indicator.style.backgroundColor = "white";
                }

                indicatorBlock.appendChild(indicator);
            })
        })

        previewBlock.appendChild(indicatorBlock);
    }
}

function initRagicStorePreview(imgArray, appStoreApname) {
    if(!videoFullScreen) {
        var length = imgArray.length;
        var ragicAppStoreContainer = $('ragicAppStoreContainer');
        if (!ragicAppStoreContainer) return;

        var previewBlock = ragicAppStoreContainer.querySelector(".previewBlock");
        var totalWidth = previewBlock.offsetWidth * length;

        if (previewBlock.querySelector(".imgDiv")) {
            previewBlock.removeChild(previewBlock.querySelector(".imgDiv"));
            if (previewBlock.querySelector(".far")) {
                previewBlock.removeChild(previewBlock.querySelector(".fa-angle-left"));
                previewBlock.removeChild(previewBlock.querySelector(".fa-angle-right"));
            }
        }

        if (previewBlock.querySelector(".indicatorBlock")) {
            previewBlock.removeChild(previewBlock.querySelector(".indicatorBlock"));
        }

        var imgPromiseArray = [];
        newPreviewBlockWidth = previewBlock.offsetWidth;


        var imgDiv = document.createElement("DIV");
        imgDiv.style.width = totalWidth + 'px';
        imgDiv.style.position = 'relative';
        imgDiv.style.left = '0px';
        imgDiv.classList.add('imgDiv');
        imgDiv.style.display = "flex";
        imgDiv.style.alignItems = "center";

        imgArray.forEach(function (url) {
            var p = new Promise(function (resolve) {
                if (url.endsWith(".wmv") || url.endsWith(".ogg") || url.endsWith(".mp4")) {
                    var video = document.createElement("VIDEO");
                    var videoSource = document.createElement("SOURCE");
                    videoSource.src = "/sims/file.jsp?a=" + appStoreApname + "&f=" + url;

                    // video.setAttribute('autoplay' ,'');
                    video.setAttribute('controls', '');
                    video.setAttribute('muted', '');
                    // video.setAttribute('loop','');

                    video.appendChild(videoSource);

                    video.addEventListener("loadstart", function () {
                        resolve(video);
                    })
                } else {
                    var img = new Image();
                    img.addEventListener('load', function () {
                        resolve(img);
                    });
                    img.src = "/sims/file.jsp?a=" + appStoreApname + "&f=" + url;
                }
            });

            imgPromiseArray.push(p);
        });

        var resizeRate = newPreviewBlockWidth / oldPreviewBlockWidth;

        var tempArr=[];
        //change the values of imgs' translate when an user resizes the window
        for(let i=0; i< currTransl.length; i++) {
            currTransl[i] *= resizeRate;
        }
        //Because the order of imgPromiseArray's element is different from the actual order of img in imgDiv,
        //we need to reoder its array of translateX properties
        for(let i=0; i< currTransl.length; i++){
            tempArr[i] =currTransl[(i+1) % currTransl.length];
        }

        Promise.all(imgPromiseArray).then(function (imgs) {
            imgs.forEach(function (img, i) {
                img.style.width = previewBlock.offsetWidth;
                img.classList.add("slide", "animate");
                img.style.transform = "translateX(" + tempArr[i] + "px)";
                if (img.tagName === "VIDEO") {
                    img.addEventListener("webkitfullscreenchange", function () {
                        var state = document.webkitIsFullScreen;
                        if(state) {
                            videoFullScreen = true;
                        } else {
                            //Because it triggers the window resize event when exit video's fullscreen, therefore
                            // it triggers initRagicStorePreview(), we should prevent it from being triggered
                            videoFullScreen = true;
                            setTimeout(function () {
                                videoFullScreen = false;  //let it triggers initRagicStorePreview() when an user resizes the window as usual
                            }, 500);
                        }
                    });
                    img.addEventListener("mozfullscreenchange", function () {
                        var state = document.mozFullScreen;
                        if(state) {
                            videoFullScreen = true;
                        } else {
                            videoFullScreen = true;
                            setTimeout(function () {
                                videoFullScreen = false;
                            }, 500);
                        }
                    });
                    img.addEventListener("fullscreenchange", function () {
                        var state = document.fullScreen;
                        if(state) {
                            videoFullScreen = true;
                        } else {
                            videoFullScreen = true;
                            setTimeout(function () {
                                videoFullScreen = false;
                            }, 500);
                        }
                    });
                }
                imgDiv.appendChild(img);
            });
            imgDiv.insertBefore(imgDiv.children[imgs.length - 1], imgDiv.children[0]);
            previewBlock.appendChild(imgDiv);
            initRagicStorePreviewArrow(length);
            initRagicStorePreviewIndicators(length);
        });

        oldPreviewBlockWidth = newPreviewBlockWidth;
    }
}
function initTemplateLibrary() {
    var promise;
    if (!tlib) {
        promise = window['preInitTemplatePromise'];
        if (!promise) {
            promise = preInitTemplateLibrary();
        }
    } else {
        promise = Promise.resolve('');
    }

    document.body.style.overflowY='hidden';
    return promise.then(function () {
        lightboxJS("<div id='templateLibrary' style='display:none;'></div>");
        tlib.render();
    })
}
function initTemplateLibraryHome(){
    ajaxget('/sims/v5Module/installTemplates.jsp',{},function(txt){
        var json=JSON.parse(txt);
        tlib=new TemplateLibrary(json);
        tlib.selectedCategory="3";
        tlib.render();
    });
}
