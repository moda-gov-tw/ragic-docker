function dailyFormulaRecalculate(pathSheet){
    var pageSize = 1000; //read 1000 entries at a time
    var qMain = db.getAPIQuery(pathSheet);
    qMain.setUpdateMode();

    var mainAr = null, mainOffset = 0;

    while(mainAr==null || mainAr.hasMore()){

        qMain.resetData();
        qMain.setLimitSize(pageSize);
        qMain.setLimitFrom(mainOffset);
        mainAr = qMain.getAPIResults();

        var iterator = mainAr.iterator();
        while(iterator.hasNext()){
            var entry = iterator.next(); 
            entry.recalculateAllFormulas();
            entry.save();    
        }

        mainOffset += mainAr.getData().size();
    }
}