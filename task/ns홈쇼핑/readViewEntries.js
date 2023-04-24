const config = require("../config.json");
const util = require("../lib/util.js");
const fs = require('fs');
const axios = require("axios");
const customX = require("../custom/readViewEntries.js");

const LOG_STEP_01 = 1, LOG_STEP_02 = 2, LOG_STEP_03 = 3;

const service = async (config, qObj, res) => {
    util.msgbox2(LOG_STEP_02, qObj.debug, "readViewEntries.js service : start... userinfo : " + qObj.userinfo);
    try {
        var ret = {};
        var selectJson = {};

        var query = qObj["query"]; //NoteView의 사용자가 정의한 Query
        if (util.isUndefined(query)) {
            util.writeSuccess(
                { result: false, descrioption: "Elastic 기본 query의 내용이 없습니다." },
                res
            );
            return;
        }

        //Elastic Query 생성
        selectJson = getSmartViewQuery(qObj);

        //custommize : 문서를 조회할때 특수하게 조회 조건 Query를 생성을 원하는경우 커스터마이즈 Source를 사용을 한다.
        var resultJson = customX.initializeCustom(qObj, selectJson);
        selectJson = resultJson;

        //Elastic Query DownFile 여부 수행
        if (!util.isUndefined(config.downloadfile)) {
            var today = new Date();
            var seconds = today.getSeconds();
            if (config.downloadfile == "1") {
                util.msgfile("readview_els_query_" + seconds + ".json", JSON.stringify(selectJson));
            } else {
                if (!util.isUndefined(qObj["isdown"])) {
                    if (qObj["isdown"] == "1") {
                        util.msgfile("readview_els_query_" + seconds + ".json", JSON.stringify(selectJson));
                    }
                }
            }
        }

        //Elastic 데이터 조회 후 데이터 Convert
        smartViewResult(config, qObj, res, selectJson);
        util.msgbox2(LOG_STEP_02, qObj.debug, "readViewEntries.js service : end... userinfo : " + qObj.userinfo);
    } catch (error) {
        console.log("[readViewEntries.js - service] " + error.message);
    }
};

function getSmartViewQuery(qObj) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "getSmartViewQuery : start");
    var selectJson = {};
    try {
        //NoteView의 사용자가 정의한 Query : 필수
        selectJson = JSON.parse(qObj["query"]);

        // 특정 파라미터에 따라서 조건 Query문 조정 : start
        // domadmin => 마이그레이션 + 신규문서의 모든 문서를 볼수 있는 권한으로 처리로 custom : start
        if (!util.isUndefined(qObj["domadmin"])) {
            selectJson["query"]["bool"]["filter"] = [];

            var migQueryObj = {};
            migQueryObj["bool"] = {};
            migQueryObj["bool"]["must"] = {};
            migQueryObj["bool"]["must"]["term"] = {};
            migQueryObj["bool"]["must"]["term"]["docstatus"] = "완료";
            selectJson["query"]["bool"]["filter"].push(migQueryObj);

            migQueryObj = {};
            migQueryObj["bool"] = {};
            migQueryObj["bool"]["must_not"] = {};
            migQueryObj["bool"]["must_not"]["term"] = {};
            migQueryObj["bool"]["must_not"]["term"]["received_app"] = "Y";
            selectJson["query"]["bool"]["filter"].push(migQueryObj);
        }
        // 마이그레이션 + 신규문서의 모든 문서를 볼수 있는 권한으로 처리로 custom : end

        // migration => Migration 문서만 표시하는 경우 따로 처리로 custom : start
        if (!util.isUndefined(qObj["migration"])) {
            selectJson["query"]["bool"]["filter"] = [];

            var migQueryObj = {};
            migQueryObj["bool"] = {};
            migQueryObj["bool"]["must"] = {};
            migQueryObj["bool"]["must"]["term"] = {};
            migQueryObj["bool"]["must"]["term"]["migration"] = "1";
            selectJson["query"]["bool"]["filter"].push(migQueryObj);

            migQueryObj = {};
            migQueryObj["bool"] = {};
            migQueryObj["bool"]["must"] = {};
            migQueryObj["bool"]["must"]["term"] = {};
            migQueryObj["bool"]["must"]["term"]["docstatus"] = "완료";
            selectJson["query"]["bool"]["filter"].push(migQueryObj);

            if (qObj["migration"] == "1") {
                // migration = "1" => 부서문서함 일자별 (이관문서)
                migQueryObj = {};
                migQueryObj["bool"] = {};
                migQueryObj["bool"]["must_not"] = {};
                migQueryObj["bool"]["must_not"]["term"] = {};
                migQueryObj["bool"]["must_not"]["term"]["received_app"] = "Y";
                selectJson["query"]["bool"]["filter"].push(migQueryObj);
            } else {
                // migration = "2" => 수신함 완료 (이관문서)
                migQueryObj = {};
                migQueryObj["bool"] = {};
                migQueryObj["bool"]["must"] = {};
                migQueryObj["bool"]["must"]["term"] = {};
                migQueryObj["bool"]["must"]["term"]["received_app"] = "Y";
                selectJson["query"]["bool"]["filter"].push(migQueryObj);
            }
        }
        // Migration 문서만 표시하는 경우 따로 처리로 custom : start

        // copnsa => 계약검토의뢰서의 양식만 조회되도록 Custom : start
        if (!util.isUndefined(qObj["copnsa"])) {
            selectJson["query"]["bool"]["filter"] = [];

            var migQueryObj = {};
            migQueryObj["bool"] = {};
            migQueryObj["bool"]["must"] = {};
            migQueryObj["bool"]["must"]["term"] = {};
            migQueryObj["bool"]["must"]["term"]["docstatus"] = "완료";
            selectJson["query"]["bool"]["filter"].push(migQueryObj);

            migQueryObj = {};
            migQueryObj["bool"] = {};
            migQueryObj["bool"]["must"] = {};
            migQueryObj["bool"]["must"]["term"] = {};
            migQueryObj["bool"]["must"]["term"]["form_id"] = "copnsa007";
            selectJson["query"]["bool"]["filter"].push(migQueryObj);
        }
        // 계약검토의뢰서의 양식만 조회되도록 Custom : start
        // 특정 파라미터에 따라서 조건 Query문 조정 : end

        //excludes(return 내용중에 배제하는 내용) : 필수

        var excludes = new Array();
        excludes.push("body");
        excludes.push("readers");

        for (var index = 1; index < 99; index++) {
            var strIndex = "0" + index;
            strIndex = strIndex.substr(strIndex.length - 2, strIndex.length);
            excludes.push("file" + strIndex);
        }

        if (util.isUndefined(selectJson["_source"])) {
            selectJson["_source"] = {};
        }

        if (util.isUndefined(selectJson["_source"]["excludes"])) {
            selectJson["_source"]["excludes"] = {};
        }

        selectJson["_source"]["excludes"] = excludes;

        //start, size, track_total_hits : 필수
        selectJson["from"] = qObj["from"];
        selectJson["size"] = qObj["size"];
        selectJson["track_total_hits"] = true;

        //readers(독서자 권한) : 필수
        setReadersQuery(qObj, selectJson);

        //SingleCategory(싱글카테고리 View) : 선택
        setCategoryQuery(qObj, selectJson);

        //Operator | Filter : 선택
        setFiltersQuery(qObj, selectJson);

        //Search Word(텍스트 검색) : 선택
        setSearchWordQuery(qObj, selectJson);

        //Search Date(기간 검색) : 선택
        setRangeQuery(qObj, selectJson);

        //Search Date(기간 검색) : 선택
        setOrderQuery(qObj, selectJson);

    } catch (error) {
        console.log("[readViewEntries.js - getSmartViewQuery ERR] ");
        console.log(error);
    }

    util.msgbox2(LOG_STEP_02, qObj.debug, "getSmartViewQuery : end");
    return selectJson;
}

function setReadersQuery(qObj, selectJson) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setReadersQuery - start");
    try {
        var readersValue = qObj["readers"];
        if (!util.isUndefined(readersValue)) {
            var readers_field = qObj["readers_field"];
            if (util.isUndefined(readers_field)) {
                readers_field = "readers";
            }

            var terms = {};
            var readers = {};
            var readersArr = [];
            var readersValueArray = readersValue.split(",");
            for (var index = 0; index < readersValueArray.length; index++) {
                readersArr.push(readersValueArray[index].toLowerCase());
            }
            readers[readers_field] = readersArr;
            terms["terms"] = readers;

            var operator = "must";
            var pushData = terms;

            try {
                var tmpArray = selectJson["query"]["bool"][operator];
                if (util.isUndefined(tmpArray)) {
                    selectJson["query"]["bool"][operator] = [];
                }

                if (operator.toLowerCase() == "should") {
                    selectJson["query"]["bool"]["minimum_should_match"] = 1;
                }
                selectJson["query"]["bool"][operator].push(pushData);
            } catch (error) {
                console.log("[readViewEntries.js - pushSelectJson] " + error.message);
            }
        }
    } catch (error) {
        console.log("[readViewEntries.js - setReadersQuery] " + error.message);
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "setReadersQuery - end");
}

function setCategoryQuery(qObj, selectJson) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setCategoryQuery - start");
    try {
        var category = qObj["category"];
        if (!util.isUndefined(category)) {
            var categoryfield = qObj["categoryfield"];
            if (!util.isUndefined(categoryfield)) {
                var singleCategory = {};
                singleCategory[categoryfield] = category;

                var singleCategoryTerm = {};
                singleCategoryTerm["term"] = singleCategory;

                var operator = "filter";
                var pushData = singleCategoryTerm;

                try {
                    var tmpArray = selectJson["query"]["bool"][operator];
                    if (util.isUndefined(tmpArray)) {
                        selectJson["query"]["bool"][operator] = [];
                    }

                    if (operator.toLowerCase() == "should") {
                        selectJson["query"]["bool"]["minimum_should_match"] = 1;
                    }
                    selectJson["query"]["bool"][operator].push(pushData);
                } catch (error) {
                    console.log("[readViewEntries.js - pushSelectJson] " + error.message);
                }
            }
        }
    } catch (error) {
        console.log("[readViewEntries.js - setCategoryQuery] " + error.message);
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "setCategoryQuery - end");
}

function setFiltersQuery(qObj, selectJson) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setFiltersQuery - start");
    try {
        for (var index = 1; index < 10; index++) {
            var filterStr = qObj["filter" + index];
            if (!util.isUndefined(filterStr)) {
                var isAndOperator = false;
                var operatorStr = qObj["operator" + index];
                if (util.isUndefined(operatorStr)) {
                    operatorStr = "and";
                }
                if (operatorStr == "and" || operatorStr == "not") {
                    isAndOperator = true
                }

                var filterKey = "";
                var filterValues = null;
                var filterArray = JSON.parse(filterStr);
                var operatorValue = "filter";
                /*
                filterArray = 
                filter1=[{"sabun":"209003"}]
                filter1=[{"sabun":["209003","209003"]}]
                filter1=[{"sabun":"209003"}, {"sabun":"123123"}]
                filter1=[{"sabun":["209003","209003"]}, {"sabun":["123123","123123"]}]
	
                filterObj = 
                {"sabun":"209003"}
                {"sabun":["209003","209003"]}
                */
                for (var objArrayKey in filterArray) {
                    var filterObj = filterArray[objArrayKey];
                    for (var objKey in filterObj) {
                        filterKey = objKey;
                        if (typeof (filterObj[objKey]) == typeof ("string")) {
                            if (filterValues == null) {
                                filterValues = [];
                            }
                            filterValues.push(filterObj[objKey]); //문자열인 경우
                        } else {
                            if (filterValues == null) {
                                filterValues = [];
                            }
                            filterValues = filterObj[objKey]; //ObjectArrary인 경우
                        }
                    }
                } //end filterArray

                var filterTerm = {};
                var filterTermObj = {};
                if (filterValues.length > 1) { //value 2개이상
                    filterTermObj[filterKey] = filterValues;
                    filterTerm["terms"] = filterTermObj;
                } else { //value 1개
                    filterTermObj[filterKey] = filterValues[0];
                    filterTerm["term"] = filterTermObj;
                }

                //selectJson Push
                if (!isAndOperator) {
                    var operator = "should";
                    var pushData = filterTerm;
                    try {
                        var tmpArray = selectJson["query"]["bool"][operator];
                        if (util.isUndefined(tmpArray)) {
                            selectJson["query"]["bool"][operator] = [];
                        }

                        if (operator.toLowerCase() == "should") {
                            selectJson["query"]["bool"]["minimum_should_match"] = 1;
                        }
                        selectJson["query"]["bool"][operator].push(pushData);
                    } catch (error) {
                        console.log("[readViewEntries.js - pushSelectJson] " + error.message);
                    }
                } else {
                    var mustValue = "must";
                    if (operatorStr == "not") {
                        mustValue = "must_not";
                    }
                    var mustObj = {};
                    mustObj[mustValue] = filterTerm;

                    var boolObj = {};
                    boolObj["bool"] = mustObj;

                    var operator = operatorValue;
                    var pushData = boolObj;
                    try {
                        var tmpArray = selectJson["query"]["bool"][operator];
                        if (util.isUndefined(tmpArray)) {
                            selectJson["query"]["bool"][operator] = [];
                        }

                        if (operator.toLowerCase() == "should") {
                            selectJson["query"]["bool"]["minimum_should_match"] = 1;
                        }
                        selectJson["query"]["bool"][operator].push(pushData);
                    } catch (error) {
                        console.log("[readViewEntries.js - pushSelectJson] " + error.message);
                    }
                }
            }
        } //end for
    } catch (error) {
        console.log("[readViewEntries.js - setFiltersQuery] " + error.message);
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "setFiltersQuery - end");
}

function setSearchWordQuery(qObj, selectJson) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - start");
    var searchQuery = qObj["search"];
    util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - searchQuery : ", searchQuery);

    if (!util.isUndefined(searchQuery)) {
        var searchArray = null;
        var schemas = [];
        try {
            if (!util.isUndefined(qObj["search_schemas"])) {
                schemas = qObj["search_schemas"].split(","); //전체검색에 포함시키는 필드집합 문자열	
            }
        } catch (error) { }

        //전체검색에 첨부파일내용 포함 여부
        var isAttach = false;
        try {
            if (qObj["search_attach"] == "1") {
                isAttach = true;
            }
        } catch (error) { }

        //AND , Or Operator 조건
        var isOrOperator = false;
        try {
            if (qObj["search_orOperator"] == "1") {
                isOrOperator = true;
            }
        } catch (error) { }

        try {
            if (!util.IsNumeric(searchQuery)) {
                searchArray = JSON.parse(searchQuery);
            }
        } catch (error) {
            searchArray = null;
        }
        if (searchArray == null) {
            util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - searchArray 초기 값 : null");
        } else {
            util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - searchArray 초기 값 :", JSON.stringify(searchArray));
        }

        if (searchArray == null) {
            var searchWord = "";
            if (!util.isUndefined(qObj["searchword"])) {
                searchWord = qObj["searchword"];
            } else {
                searchWord = searchQuery;
            }
            util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - searchWord : ", searchWord);

            if (util.isUndefined(searchWord)) {
                //step02 - domino :
                util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - step02 - domino");

                //&search=(FIELD subject = "고기능" AND FIELD subject contains "판촉" AND [subject] = "판촉" AND [subject] contains "판촉")
                //&search=(고기능)
                var andSepa = " AND ";
                if (searchQuery.toLowerCase().indexOf(" or ") > -1) {
                    andSepa = " OR ";
                }
                var andStartIndex = searchQuery.toLowerCase().indexOf(andSepa.toLowerCase());
                if (util.isUndefined(andStartIndex)) {
                    andStartIndex = -1;
                }
                if (andStartIndex > -1) {
                    andSepa = searchQuery.substr(andStartIndex, andSepa.toLowerCase().length);
                }
                var arrQuery = searchQuery.split(andSepa);
                if (!util.isUndefined(arrQuery)) {
                    for (var index = 0; index < arrQuery.length; index++) {
                        var query = arrQuery[index];
                        var isFieldSearch = false;
                        var sepa = "";
                        if (query.toLowerCase().indexOf("=") > -1) {
                            sepa = "=";
                            isFieldSearch = true;
                        } else if (query.toLowerCase().indexOf("contains") > -1) {
                            sepa = " contains ";
                            if (query.toLowerCase().indexOf(sepa.toLowerCase()) > -1) {
                                sepa = query.substr(query.toLowerCase().indexOf(sepa.toLowerCase()), sepa.toLowerCase().length);
                                isFieldSearch = true;
                            }
                        }

                        var searchObj = {};
                        if (isFieldSearch) {
                            var fields = query.split(sepa); // '(0)= FIELD 필드명 (1)= 필드값 또는 (0)=[필드명] (1)=값
                            // [ '([AuthorName]', '박광순)' ]
                            var fildValue = fields[1].trim();
                            if (fildValue.indexOf("(") == 0) {
                                fildValue = util.strRight(fildValue, "(");
                            }
                            if (fildValue.indexOf('"') == 0) {
                                fildValue = util.strRight(fildValue, '"');
                            }
                            if (fildValue.indexOf(")") == fildValue.length - 1) {
                                fildValue = util.strLeftBack(fildValue, ")");
                            }
                            if (fildValue.indexOf('"') == fildValue.length - 1) {
                                fildValue = util.strLeftBack(fildValue, '"');
                            }

                            var fildName = fields[0].trim();
                            if (fildName.indexOf("(") == 0) {
                                fildName = util.strRight(fildName, "(");
                            }

                            if (fildName.indexOf("[") == 0 && fildName.indexOf("]") == fildName.length - 1) {
                                fildName = util.strRight(fildName, "[");
                                fildName = util.strLeft(fildName, "]");
                            } else {
                                var fieldNames = fildName.split(" ");
                                var fieldNameIndex = -1;
                                for (var idx = 0; idx < fieldNames.length; idx++) {
                                    if (fieldNameIndex > -1) {
                                        if (fieldName.trim() != "") {
                                            fildName = fildName.trim();
                                            return false;
                                        }
                                    }
                                    fieldNameIndex = fieldNameIndex + 1;
                                }
                            }

                            searchObj[fildName] = fildValue;
                            if (searchArray == null) {
                                searchArray = [];
                            }
                            searchArray.push(searchObj);
                        } else {
                            var searchWord = query;
                            if (searchWord.indexOf("(") == 0) {
                                searchWord = util.strRight(searchWord, "(");
                            }

                            if (searchWord.indexOf('"') == 0) {
                                searchWord = util.strRight(searchWord, '"');
                            }
                            if (searchWord.indexOf(")") == searchWord.length - 1) {
                                searchWord = util.strLeftBack(searchWord, ")");
                            }

                            if (searchWord.indexOf('"') == searchWord.length - 1) {
                                searchWord = util.strLeftBack(searchWord, '"');
                            }

                            searchObj["*"] = searchWord;
                            if (searchArray == null) {
                                searchArray = [];
                            }
                            searchArray.push(searchObj);
                        }
                    }
                }
            } else {
                //step03 - eMate package : &searchfield=xx&searchword=yy
                util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - step03 - eMate package");
                var searchFieldArray = null;
                var keyArray = null;
                var searchField = qObj["searchfield"];
                util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - searchField : ", searchField);

                if (searchField != "") {
                    keyArray = searchField.split(",");
                    for (var index = 0; index < keyArray.length; index++) {
                        if (searchFieldArray == null) {
                            searchFieldArray = []
                        }
                        searchFieldArray.push(keyArray[index]);
                    }
                } else {
                    if (searchFieldArray == null) {
                        searchFieldArray = {}
                    }
                    searchFieldArray["0"] = "*"
                }

                var searchWordArray = [];
                if (searchWord != "") {
                    var valueArray = searchWord.split(",");
                    for (var index = 0; index < valueArray.length; index++) {
                        searchWordArray.push(valueArray[index]);
                    }
                }

                var searchObj = null;
                for (var index = 0; index < keyArray.length; index++) {
                    if (searchObj == null) {
                        searchObj = {};
                    }
                    searchObj[searchFieldArray[index]] = searchWordArray[index];

                    if (searchArray == null) {
                        searchArray = [];
                    }
                    searchArray.push(searchObj);
                }
            }
        }

        // console.log("### searchArray: ", searchArray);

        //step01 - smartview : &search=[{"subject":"업무"},{"body":"신민재"}]
        // util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - step01 - smartview");		
        if (searchArray == null) {
            util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - searchArray 변형 후 : null");
        } else {
            util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - searchArray 변형 후 :", JSON.stringify(searchArray));
        }

        if (searchArray != null) {
            for (var objArrayKey in searchArray) {
                var searchObj = searchArray[objArrayKey];
                for (var objKey in searchObj) {
                    var allSearchArr = new Array();
                    var searchQuery = {};
                    var matchQuery = {};
                    var titleKey = "multi_match";
                    if (objKey.toLowerCase() == "" || objKey.toLowerCase() == "*" || objKey.toLowerCase() == "all") { //전체검색
                        if (schemas.length > 0) {
                            for (var schemasIndex = 0; schemasIndex < schemas.length; schemasIndex++) {
                                allSearchArr.push(schemas[schemasIndex].toLowerCase() + ".search");
                            }
                        }

                        if (isAttach) { //전체검색에 첨부파일명 포함
                            for (var index = 1; index < 99; index++) {
                                var strIndex = "0" + index;
                                strIndex = strIndex.substr(strIndex.length - 2, strIndex.length);
                                allSearchArr.push("file" + strIndex);
                            }
                        }
                        searchQuery["query"] = searchObj[objKey];
                        searchQuery["type"] = "phrase";
                        searchQuery["fields"] = allSearchArr;
                    } else if (objKey.toLowerCase() == "@attachments" || objKey.toLowerCase() == "@attachment") { //첨부파일 검색
                        for (var index = 1; index < 99; index++) {
                            var strIndex = "0" + index;
                            strIndex = strIndex.substr(strIndex.length - 2, strIndex.length);
                            allSearchArr.push("file" + strIndex);
                        }

                        searchQuery["query"] = searchObj[objKey];
                        searchQuery["type"] = "phrase";
                        searchQuery["fields"] = allSearchArr;
                    } else { //필드명 검색
                        var searchValue = {};
                        searchValue["query"] = searchObj[objKey];
                        searchQuery[objKey.toLowerCase() + ".search"] = searchValue;
                        titleKey = "match_phrase"
                    }

                    matchQuery[titleKey] = searchQuery;
                    var operatorValue = "must";
                    if (isOrOperator) {
                        operatorValue = "should";
                    }

                    var operator = operatorValue;
                    var pushData = matchQuery;
                    try {
                        var tmpArray = selectJson["query"]["bool"][operator];
                        if (util.isUndefined(tmpArray)) {
                            selectJson["query"]["bool"][operator] = [];
                        }

                        if (operator.toLowerCase() == "should") {
                            selectJson["query"]["bool"]["minimum_should_match"] = 1;
                        }
                        selectJson["query"]["bool"][operator].push(pushData);
                    } catch (error) {
                        console.log("[readViewEntries.js - pushSelectJson] " + error.message);
                    }
                }
            } //end filterArray
        }
    }

    util.msgbox2(LOG_STEP_02, qObj.debug, "setSearchWordQuery - end");
}

function setRangeQuery(qObj, selectJson) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setRangeQuery - start");
    try {
        var rangeObj = {};
        var rangeFieldObj = {};
        var rangeValueObj = {};
        var rangeSearchObj = {};
        var operatorValue = "must";

        if (util.isUndefined(qObj["range"])) {
            if (!util.isUndefined(qObj["range_searchdatefield"])) { //searchdatefield, searchfrom, searchto 필드 확인
                try {
                    var searchField = "completedate";
                    try {
                        searchField = qObj["range_searchdatefield"];
                    } catch (error) { }

                    var searchfrom = qObj["range_searchfrom"];
                    searchfrom = util.replaceAll(searchfrom, "-", "");
                    searchfrom = util.replaceAll(searchfrom, ":", "");
                    searchfrom = util.replaceAll(searchfrom, " ", "");
                    if (searchfrom.toLowerCase().indexOf("t") < 0) {
                        if (searchfrom.length == 8) {
                            searchfrom = searchfrom + "T" + "000000"
                        } else {
                            searchfrom = searchfrom.substr(0, 8) + "T" + searchfrom.substr(8, searchfrom.length);
                        }
                    }

                    var searchto = qObj["range_searchto"];
                    searchto = util.replaceAll(searchto, "-", "");
                    searchto = util.replaceAll(searchto, ":", "");
                    searchto = util.replaceAll(searchto, " ", "");
                    if (searchto.toLowerCase().indexOf("t") < 0) {
                        if (searchto.length == 8) {
                            searchto = searchto + "T" + "235959"
                        } else {
                            searchto = searchto.substr(0, 8) + "T" + searchto.substr(8, searchto.length);
                        }
                    }
                    rangeValueObj["gte"] = searchfrom;
                    rangeValueObj["lte"] = searchto;
                    rangeFieldObj[searchField.toLowerCase()] = rangeValueObj;
                    rangeSearchObj["range"] = rangeFieldObj;

                    var operator = operatorValue;
                    var pushData = rangeSearchObj;
                    try {
                        var tmpArray = selectJson["query"]["bool"][operator];
                        if (util.isUndefined(tmpArray)) {
                            selectJson["query"]["bool"][operator] = [];
                        }

                        if (operator.toLowerCase() == "should") {
                            selectJson["query"]["bool"]["minimum_should_match"] = 1;
                        }
                        selectJson["query"]["bool"][operator].push(pushData);
                    } catch (error) {
                        console.log("[readViewEntries.js - pushSelectJson] " + error.message);
                    }
                } catch (error) {
                    console.log("[readViewEntries.js - setRangeQuery 01 - rangeObj] " + error.message);
                }
            }
        } else {
            try {
                rangeObj = JSON.parse(qObj["range"]);
                var searchField = qObj["range_searchdatefield"];
                if (util.isUndefined(searchField)) {
                    if (util.isUndefined(rangeObj["field"])) {
                        searchField = "scompletedate";
                    } else {
                        searchField = rangeObj["field"];
                    }
                }
                rangeValueObj["gte"] = rangeObj["from"];
                rangeValueObj["lte"] = rangeObj["to"];
                rangeFieldObj[searchField] = rangeValueObj;

                rangeSearchObj["range"] = rangeFieldObj;

                var operator = operatorValue;
                var pushData = rangeSearchObj;
                try {
                    var tmpArray = selectJson["query"]["bool"][operator];
                    if (util.isUndefined(tmpArray)) {
                        selectJson["query"]["bool"][operator] = [];
                    }

                    if (operator.toLowerCase() == "should") {
                        selectJson["query"]["bool"]["minimum_should_match"] = 1;
                    }
                    selectJson["query"]["bool"][operator].push(pushData);
                } catch (error) {
                    console.log("[readViewEntries.js - pushSelectJson] " + error.message);
                }
            } catch (error) {
                console.log("[readViewEntries.js - setRangeQuery 02 - rangeObj] " + error.message);
            }
        }
    } catch (error) {
        console.log("[readViewEntries.js - setRangeQuery] " + error.message);
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "setRangeQuery - end");
}

function setOrderQuery(qObj, selectJson) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setOrderQuery - start");
    try {
        var columnNameList = new Array(), orderArray = new Array();
        var sortColumn = "", sortOrder = "asc", orderField = "";
        var resortascending = "", resortdescending = "";
        var sortIndex = "", dominoDecIndex = 0, isDesc = false;
        var normalFieldArray = new Array(), normalFieldOrderArray = new Array();
        var convertType = "", convertindex = 9999, convertCheckIndex = 0;
        var viewAlias = qObj["order_viewalias"];
        //Not (View Colum Field) => Wan`t Normal Field Sorting
        if (!util.isUndefined(qObj["order_normalfield"])) {
            normalFieldArray = JSON.parse(qObj["order_normalfield"]);
        }

        //Not (View Colum Field) => Wan`t Normal Field Sorting
        if (!util.isUndefined(qObj["order_normalfieldorder"])) {
            normalFieldOrderArray = JSON.parse(qObj["order_normalfieldorder"]);
        }

        //Text Value : "1" => Number Value : 1 Sorting
        if (!util.isUndefined(qObj["order_sortconvert"])) {
            //convertType = JSON.parse(qObj["order_sortconvert"]);
            convertType = qObj["order_sortconvert"];
        }

        //Text Value : "1" => Number Value : 1 Sorting Of SortArray Index
        if (!util.isUndefined(qObj["order_sortconvertindex"])) {
            convertindex = Number(qObj["order_sortconvertindex"]) - 1;
        }

        //Sort of Param Analyer
        if (util.isUndefined(qObj["order_sortcolumn"])) {
            resortascending = qObj["order_resortascending"];
            resortdescending = qObj["order_resortdescending"];
            var useResorting = true;
            if (util.isUndefined(resortascending)) {
                if (util.isUndefined(resortdescending)) {
                    useResorting = false;
                }
            }

            if (useResorting) {
                //Domino Type
                sortIndex = resortdescending;
                if (util.isUndefined(sortIndex)) {
                    sortIndex = resortascending;
                    isDesc = false;
                } else {
                    isDesc = true;
                }

                if (!util.isUndefined(qObj["order_columnnames"])) {
                    columnNameList = qObj["order_columnnames"].split(";");
                    dominoDecIndex = parseInt(sortIndex);
                    sortColumn = columnNameList[dominoDecIndex];
                    if (isDesc) {
                        sortOrder = "desc";
                    }
                    orderField = "_vc_" + viewAlias.toLowerCase() + "_" + sortColumn.toLowerCase();
                    convertCheckIndex = 0;

                    //Order Field 값을 아래 Function을 통해서 orderArray에 추가
                    setOrderField(qObj, convertindex, convertCheckIndex, convertType, orderField, sortOrder, orderArray);

                    //Normal Field 있을경우 아래 Function을 통해서 orderArray에 추가
                    setNormalField(qObj, normalFieldArray, normalFieldOrderArray, convertindex, convertCheckIndex, convertType, orderArray);

                    selectJson["sort"] = orderArray;
                }
            } else {
                if (util.isUndefined(qObj["order_resort"])) {
                    //Default Type
                    if (!util.isUndefined(qObj["order_defaultsortcolumn"])) {
                        convertCheckIndex = -1;
                        var defaultsortArray = new Array();
                        defaultsortArray = JSON.parse(qObj["order_defaultsortcolumn"]);
                        for (var defaultsort in defaultsortArray) {
                            var defaultsortObj = defaultsortArray[defaultsort];
                            sortOrder = defaultsortObj["order"];
                            if (sortOrder.toLowerCase() == "desc" || sortOrder.toLowerCase() == "descending") {
                                sortOrder = "desc";
                            } else {
                                sortOrder = "asc";
                            }
                            convertCheckIndex = convertCheckIndex + 1;
                            orderField = "_vc_" + viewAlias.toLowerCase() + "_" + defaultsortObj["field"].toLowerCase();

                            //Order Field 값을 아래 Function을 통해서 orderArray에 추가
                            setOrderField(qObj, convertindex, convertCheckIndex, convertType, orderField, sortOrder, orderArray);
                        }
                        //Normal Field 있을경우 아래 Function을 통해서 orderArray에 추가
                        setNormalField(qObj, normalFieldArray, normalFieldOrderArray, convertindex, convertCheckIndex, convertType, orderArray);

                        selectJson["sort"] = orderArray;
                    }
                } else {
                    //eMate Type
                    var resortArray = new Array();
                    resortArray = JSON.parse(qObj["order_resort"]);
                    convertCheckIndex = -1;
                    for (var resortIndex = 0; resortIndex < resortArray.length; resortIndex++) {
                        sortIndex = resortArray[resortIndex];
                        convertCheckIndex = convertCheckIndex + 1

                        if (sortIndex.indexOf("_") > -1) {
                            if (util.strRight(sortIndex, "_") == "-1") {
                                isDesc = true;
                                sortOrder = "desc";
                            }
                        }

                        if (!util.isUndefined(qObj["order_columnnames"])) {
                            viewAlias = qObj["order_viewalias"];
                            columnNameList = qObj["order_columnnames"].split(";");
                            dominoDecIndex = parseInt(sortIndex);
                            sortColumn = columnNameList[dominoDecIndex];
                            orderField = "_vc_" + viewAlias.toLowerCase() + "_" + sortColumn.toLowerCase();

                            //Order Field 값을 아래 Function을 통해서 orderArray에 추가
                            setOrderField(qObj, convertindex, convertCheckIndex, convertType, orderField, sortOrder, orderArray);
                        }
                    }
                    //Normal Field 있을경우 아래 Function을 통해서 orderArray에 추가
                    setNormalField(qObj, normalFieldArray, normalFieldOrderArray, convertindex, convertCheckIndex, convertType, orderArray);

                    selectJson["sort"] = orderArray;
                }
            }
        } else {
            //DAS Type
            viewAlias = qObj["order_viewalias"];

            var sortColumnArray = JSON.parse(qObj["order_sortcolumn"]);
            var sortOrderArray = JSON.parse(qObj["order_sortorder"]);
            convertCheckIndex = -1;
            for (var sortColumnIndex = 0; sortColumnIndex < sortColumnArray.length; sortColumnIndex++) {
                var sortColumn = sortColumnArray[sortColumnIndex];
                var sortOrder = sortOrderArray[sortColumnIndex];
                if (sortOrder.toLowerCase() == "desc" || sortOrder.toLowerCase() == "descending") {
                    sortOrder = "desc";
                } else {
                    sortOrder = "asc";
                }
                convertCheckIndex = convertCheckIndex + 1;
                orderField = "_vc_" + viewAlias.toLowerCase() + "_" + sortColumn.toLowerCase();

                //Order Field 값을 아래 Function을 통해서 orderArray에 추가
                setOrderField(qObj, convertindex, convertCheckIndex, convertType, orderField, sortOrder, orderArray);
            }

            //Normal Field 있을경우 아래 Function을 통해서 orderArray에 추가
            setNormalField(qObj, normalFieldArray, normalFieldOrderArray, convertindex, convertCheckIndex, convertType, orderArray);

            selectJson["sort"] = orderArray;
        }
    } catch (error) {
        console.log("[readViewEntries.js - setOrderQuery ERR] ");
        console.log(error);
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "setOrderQuery - end");
}

function setOrderField(qObj, convertindex, convertCheckIndex, convertType, orderField, sortOrder, orderArray) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setOrderQuery - setOrderField Start");
    var sortObj = {}, orderObj = {};
    var isConvert = false;
    try {
        if (convertindex == convertCheckIndex) {
            if (convertType.toLowerCase() == "number") {
                isConvert = true;
                var scriptObj = {};
                scriptObj["lang"] = "painless";
                scriptObj["source"] = "Integer.parseInt(doc['" + orderField + "'].value)";

                var _scriptObj = {};
                _scriptObj["type"] = "Number";
                _scriptObj["order"] = sortOrder;
                _scriptObj["script"] = scriptObj;

                sortObj["_script"] = _scriptObj;
            }
        }

        if (!isConvert) {
            orderObj["order"] = sortOrder;
            sortObj[orderField] = orderObj;
        }

        orderArray.push(sortObj);
    } catch (error) {
        console.log("[readViewEntries.js - setOrderField] " + error.message);
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "setOrderQuery - setOrderField End");
}

function setNormalField(qObj, normalFieldArray, normalFieldOrderArray, convertindex, convertCheckIndex, convertType, orderArray) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setOrderQuery - setNormalField Start");
    var sortObj = {}, orderObj = {};
    var normalField = "", normalFieldOrder = "", orderField = "";
    var isConvert = false;
    try {
        if (normalFieldArray.length > 0) {
            for (var normalFieldIndex = 0; normalFieldIndex < normalFieldArray.length; normalFieldIndex++) {
                normalField = normalFieldArray[normalFieldIndex];
                normalFieldOrder = normalFieldOrderArray[normalFieldIndex];
                if (normalFieldOrder.toLowerCase() == "desending" || normalFieldOrder.toLowerCase() == "desc") {
                    normalFieldOrder = "desc";
                } else {
                    normalFieldOrder = "asc";
                }
                convertCheckIndex = convertCheckIndex + 1;
                sortObj = {}, orderObj = {};

                orderField = normalField.toLowerCase();
                if (convertindex == convertCheckIndex) {
                    if (convertType.toLowerCase() == "number") {
                        isConvert = true;
                        var scriptObj = {};
                        scriptObj["lang"] = "painless";
                        scriptObj["source"] = "Integer.parseInt(doc['" + orderField + "'].value)";

                        var _scriptObj = {};
                        _scriptObj["type"] = "Number";
                        _scriptObj["order"] = normalFieldOrder;
                        _scriptObj["script"] = scriptObj;

                        sortObj["_script"] = _scriptObj;
                    }
                }

                if (!isConvert) {
                    orderObj["order"] = normalFieldOrder;
                    sortObj[orderField] = orderObj;
                }
                orderArray.push(sortObj);
            }
        }
    } catch (error) {
        console.log("[readViewEntries.js - setNormalField] " + error.message);
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "setOrderQuery - setNormalField End");
}

const smartViewResult = async (config, qObj, res, selectJson) => {
    util.msgbox2(LOG_STEP_02, qObj.debug, "smartViewResult : start : userinfo : " + qObj.userinfo);
    try {
        var url = qObj["elastic_address"];
        util.msgbox2(LOG_STEP_03, qObj.debug, "### Elastic url : ", url);

        const id = qObj["elastic_id"] + ":" + qObj["elastic_pw"];
        var authorization = Buffer.from(id, "utf8").toString("base64");
        axios({
            method: "post",
            url: url,
            data: JSON.stringify(selectJson),
            headers: {
                Authorization: "Basic " + authorization,
                "Content-Type": "application/json",
            },
        })
            .then((response) => {
                util.msgbox2(LOG_STEP_02, qObj.debug, "*************** E.S 조회 완료 ***************** userinfo : " + qObj.userinfo);
                qObj["data"] = JSON.stringify(response.data);
                elasticToConvert(config, qObj, res)
            })
            .catch((error) => {
                //qObj["elastic_address"] = "http://121.141.70.37:19200/approcomplete/_search";
                //smartViewResult(config, qObj, res, selectJson);
                console.log(error);
            });
    } catch (error) {
        console.error(error);
        util.writeWithStatus(
            500,
            {
                result: false,
                description: error.message,
            },
            res
        );
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "smartViewResult : end : userinfo : " + qObj.userinfo);
}

const elasticToConvert = async (config, qObj, res) => {
    util.msgbox2(LOG_STEP_02, qObj.debug, "elasticToConvert : start");
    try {
        var outputformat = qObj["outputformat"];
        if (util.isUndefined(outputformat)) {
            outputformat = "";
        }

        var viewname = qObj["viewname"];
        if (util.isUndefined(viewname)) {
            viewname = "";
        }

        var columnHeaders = qObj["columnheaders"];
        if (util.isUndefined(columnHeaders)) {
            columnHeaders = "";
        }

        var categoryview = qObj["categoryview"];
        if (util.isUndefined(categoryview)) {
            categoryview = "";
        }

        var posStart = qObj["posstart"];
        if (util.isUndefined(posStart)) {
            posStart = "";
        }

        var default_checkbox_gridview = config["default_checkbox_for_gridview"];
        var checkview = qObj["checkview"];
        if (util.isUndefined(checkview)) {
            if (util.isUndefined(default_checkbox_gridview)) {
                checkview = "0";
            } else {
                // DHTMLX-GRID 데이터 변환 시 '&checkview' 가 '0'이 아니면 무조건 체크박스를 위한 VIEW 데이터로 생성하려면 '1'	
                checkview = default_checkbox_gridview;
            }
        }

        var textJson = qObj["data"];
        if (util.isUndefined(textJson)) {
            textJson = "";
        }

        viewname = viewname.toLowerCase();
        util.msgbox2(LOG_STEP_03, qObj.debug, "======================================================================");
        util.msgbox2(LOG_STEP_03, qObj.debug, " - [HTTP-REQ] OUTPUTFORAMT : " + outputformat);
        util.msgbox2(LOG_STEP_03, qObj.debug, " - [HTTP-REQ] VIEWNAME : " + viewname);
        util.msgbox2(LOG_STEP_03, qObj.debug, " - [HTTP-REQ] VIEW_COLUMN_HEADER_NAME : " + columnHeaders);
        util.msgbox2(LOG_STEP_03, qObj.debug, " - [HTTP-REQ] CATEGORY VIEW : " + categoryview);
        util.msgbox2(LOG_STEP_03, qObj.debug, " - [HTTP-REQ] CHECKBOX VIEW : " + checkview);
        util.msgbox2(LOG_STEP_03, qObj.debug, "======================================================================");

        var originObjData = null;
        try {
            originObjData = JSON.parse(textJson);
            util.msgbox2(LOG_STEP_02, qObj.debug, "[JSON-PARSING] " + "Parsed data..");
        } catch (error) {
            console.log("[JSON-PARSING] " + "Err : Parsed data - " + e.message);
            console.log("[JSON-PARSING] " + "textJson to TextFile down...");

            util.msgfile("textJson.txt", textJson);
        }

        var ret = "";
        if (originObjData == null) {
            if (outputformat == "json") {
                ret = "{}";
            } else if (outputformat == "das") {
                ret = "[]";
            } else if (outputformat == "grid") {
                ret = "<rows></rows>";
            } else {
                ret = "<viewentries></viewentries>";
            }
        } else {
            //ver7.X : hits.total.value
            //ver6.X : hits.total
            var total = originObjData['hits']['total']['value'];
            if (util.isUndefined(total)) {
                total = originObjData['hits']['total'];
            }

            total = Number(total);
            if (total > 0) {
                if (outputformat == "json") {
                    // for json
                    originObjData = convertToJSONData(qObj, originObjData, viewname, columnHeaders);
                    if (originObjData != null) {
                        ret = JSON.stringify(originObjData);
                    }
                } else if (outputformat == "das") {
                    // for das
                    originObjData = convertToDASData(qObj, originObjData, viewname, columnHeaders);
                    if (originObjData != null) {
                        ret = JSON.stringify(originObjData);
                    }
                } else if (outputformat == "grid") {
                    // for grid
                    ret = convertToXGRIData(qObj, originObjData, viewname, columnHeaders, posStart, checkview);
                } else {
                    // xml
                    ret = convertToXMLData(qObj, originObjData, viewname, columnHeaders);
                }
                util.msgbox2(2, "[JSON-PARSING] " + "Converted..");
            } else {
                if (outputformat == "json") {
                    ret = "{}";
                } else if (outputformat == "das") {
                    ret = "[]";
                } else if (outputformat == "grid") {
                    ret = "<rows></rows>";
                } else {
                    ret = '<viewentries toplevelentries="0"></viewentries>';
                }
            }
        }

        var contentType = "";
        var contentLength = "";
        var addHeader = null;
        if (outputformat.toLowerCase().trim() == "das" || outputformat.toLowerCase().trim() == "json") {
            contentType = 'application/json; charset=UTF-8';
        } else {
            contentType = 'text/xml; charset=UTF-8';
        }

        contentLength = Buffer.byteLength(ret) + "";
        addHeader = { 'Server': 'SmartView', 'Company': 'Searom', 'Brand': 'eMate', 'Content-Length': contentLength };
        util.msgbox2(LOG_STEP_02, qObj.debug, "[HTTP-RES] WRITING CONTENT....");

        //util.writeSuccess(ret, res, contentType, addHeader);
        util.writeWithContentType(ret, res, contentType);
        util.msgbox2(LOG_STEP_02, qObj.debug, "[HTTP-RES] END. userinfo : " + qObj.userinfo);
    } catch (error) {
        console.error(error);
        util.writeWithStatus(
            500,
            {
                result: false,
                description: error.message,
            },
            res
        );
    }
    util.msgbox2(LOG_STEP_02, qObj.debug, "elasticToConvert : end");
};

// outputformat=json
function convertToJSONData(qObj, originObjData, viewname, columnNamesText) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToJSONData : start");
    var retObjData = null; //result Object
    if (originObjData == null) {
        return originObjData;
    }
    var rootView = new Object();
    var viewEntries = new Array(); //배열

    //7.X : hits.total.value
    //6.X : hits.total
    var totalCount = originObjData['hits']['total']['value'];
    if (util.isUndefined(totalCount)) {
        totalCount = originObjData['hits']['total'];
    }

    var position = 0;
    var columnNames = columnNamesText.split(";");

    var jdc = originObjData.hits.hits;
    for (var idx = 0; idx < jdc.length; idx++) {
        try {
            var _this = jdc[idx];
            position++;
            var unid = "";
            if (!util.isUndefined(_this._source["_universalid"])) {
                unid = _this._source["_universalid"];
            }

            var noteid = "";
            if (!util.isUndefined(_this._source["_noteid"])) {
                noteid = _this._source["_noteid"];
            }

            var viewEntry = new Object();
            viewEntry["@position"] = position + "";
            viewEntry["@unid"] = unid;
            viewEntry["@noteid"] = noteid;
            viewEntry["@siblings"] = totalCount;

            var entryDatas = new Array(); //배열
            var columnName = "";
            var columnValues = "";
            for (var columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
                columnName = columnNames[columnIndex].toLowerCase();
                var isColumnArray = false;
                try {

                    columnValues = _this._source["_vc_" + viewname + "_" + columnName];
                    if (columnValues == null) {
                        columnValues = "";
                    }
                    if (typeof (columnValues) == "object") {
                        isColumnArray = true;
                    }
                } catch (error) {
                    console.log("convertToJSONData - Err 01 : " + error.message);
                    columnValues = "";
                }

                var entryData = new Object();
                entryData["@name"] = columnName;
                entryData["@columnnumber"] = columnIndex.toString();

                if (!isColumnArray) {
                    //Date Type value change
                    if (columnValues != "") {
                        if (util.IsNumeric(columnValues)) {
                            columnValues = columnValues + "";
                        } else {
                            if (columnValues.toUpperCase().indexOf("T") == 8 && columnValues.length == 15) {
                                //20180430T110925 ==> 20200123T154233+09:00
                                var _year = columnValues.substr(0, 4);
                                var _month = columnValues.substr(4, 2);
                                var _day = columnValues.substr(6, 2);

                                var _hour = columnValues.substr(9, 2);
                                var _min = columnValues.substr(11, 2);
                                var _sec = columnValues.substr(13, 2);

                                if (isDatetime(_year + "-" + _month + "-" + _day + " " + _hour + ":" + _min + ":" + _sec)) {
                                    var localeDateTime = getLocaleDateTimeString(_year, _month, _day, _hour, _min, _sec);
                                    if (localeDateTime != "") {
                                        columnValues = localeDateTime;
                                    }
                                }
                            }
                        }
                    }

                    var objVal = new Object();
                    objVal["0"] = columnValues;
                    entryData["text"] = objVal;
                } else {
                    var textArray = null;
                    for (var i = 0; i < columnValues.length; i++) {
                        var tmpObj = new Object();
                        tmpObj["0"] = columnValues[i];

                        if (textArray == null) {
                            textArray = new Array();
                        }
                        textArray.push(tmpObj);
                    }
                    var textObj = new Object();
                    textObj["text"] = textArray;
                    entryData["textlist"] = textObj;
                }
                entryDatas.push(entryData);
            }
            viewEntry["entrydata"] = entryDatas;
            viewEntries.push(viewEntry);
        } catch (error) {
            console.log("convertToJSONData - Err 02 : " + error.message);
        }
    }

    var today = new Date();
    var year = today.getFullYear(); // 년도
    var month = today.getMonth() + 1;  // 월
    var date = today.getDate();  // 날짜
    var hours = today.getHours(); // 시
    var minutes = today.getMinutes();  // 분
    var seconds = today.getSeconds();  // 초
    var milliseconds = today.getMilliseconds(); // 밀리초
    var timestamp = year.toString();

    timestamp += month < 10 ? "0" + month.toString() : month.toString();
    timestamp += date < 10 ? "0" + date.toString() : date.toString();
    timestamp += "T";
    timestamp += hours < 10 ? "0" + hours.toString() : hours.toString();
    timestamp += minutes < 10 ? "0" + minutes.toString() : minutes.toString();
    timestamp += seconds < 10 ? "0" + seconds.toString() : seconds.toString();
    timestamp += ',';
    timestamp += milliseconds.toString() + "Z";

    rootView["@timestamp"] = timestamp;
    rootView["@toplevelentries"] = totalCount;
    rootView["viewentry"] = viewEntries;

    retObjData = rootView;

    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToJSONData : end");
    return retObjData;
}

// outputformat=das
function convertToDASData(qObj, originObjData, viewname, columnNamesText) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToDASData : start");
    var viewEntries = null; //result Object
    if (originObjData == null) {
        return originObjData;
    }

    //7.X : hits.total.value
    //6.X : hits.total
    var totalCount = originObjData['hits']['total']['value'];
    if (util.isUndefined(totalCount)) {
        totalCount = originObjData['hits']['total'];
    }

    var position = 0;
    var columnNames = columnNamesText.split(";");

    var jdc = originObjData.hits.hits;
    for (var idx = 0; idx < jdc.length; idx++) {
        position++;
        var _this = jdc[idx];
        var unid = "";
        if (!util.isUndefined(_this._source["_universalid"])) {
            unid = _this._source["_universalid"];
        }

        var noteid = "";
        if (!util.isUndefined(_this._source["_noteid"])) {
            noteid = _this._source["_noteid"];
        }

        var _filepath = "";
        if (!util.isUndefined(_this._source["_filepath"])) {
            _filepath = _this._source["_filepath"];
        }

        var _viewname = "";
        if (util.isUndefined(_this._source["_viewname"])) {
            _viewname = viewname;
        } else {
            _viewname = _this._source["_viewname"];
        }
        _viewname = _viewname.toLowerCase();

        var _form = "";
        if (!util.isUndefined(_this._source["_form"])) {
            _form = _this._source["_form"];
        }

        var href = _filepath.toLowerCase() + "/api/data/collections/name/" + _viewname + "/unid/" + unid;
        var viewEntry = new Object();
        viewEntry["@href"] = href;

        var link = new Object();
        link["rel"] = "document";
        href = _filepath.toLowerCase() + "/api/data/documents/unid/" + unid;
        link["href"] = href;
        viewEntry["@link"] = link;

        viewEntry["@entryid"] = position + "-" + unid;
        viewEntry["@unid"] = unid;
        viewEntry["@noteid"] = noteid;
        viewEntry["@position"] = position + "";
        viewEntry["@read"] = true;
        viewEntry["@form"] = _form.toLowerCase();
        viewEntry["@siblings"] = totalCount;

        for (var columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
            columnName = columnNames[columnIndex].toLowerCase();
            var isColumnArray = false;
            try {
                columnValues = _this._source["_vc_" + viewname + "_" + columnName];
                if (columnValues == null) {
                    columnValues = "";
                }
                if (typeof (columnValues) == "object") {
                    isColumnArray = true;
                }
            } catch (error) {
                console.log("Err - convertToDASData 01 : " + error.message);
                columnValues = "";
            }

            if (!isColumnArray) {
                //Date Type value change
                if (columnValues != "") {
                    if (util.IsNumeric(columnValues)) {
                        columnValues = columnValues + "";
                    } else {
                        if (columnValues.toUpperCase().indexOf("T") == 8 && columnValues.length == 15) {
                            //20180430T110925 ==> 20200123T154233+09:00
                            var _year = columnValues.substr(0, 4);
                            var _month = columnValues.substr(4, 2);
                            var _day = columnValues.substr(6, 2);

                            var _hour = columnValues.substr(9, 2);
                            var _min = columnValues.substr(11, 2);
                            var _sec = columnValues.substr(13, 2);

                            if (isDatetime(_year + "-" + _month + "-" + _day + " " + _hour + ":" + _min + ":" + _sec)) {
                                var localeDateTime = getLocaleDateTimeString(_year, _month, _day, _hour, _min, _sec);
                                if (localeDateTime != "") {
                                    columnValues = localeDateTime;
                                }
                            }
                        }
                    }
                }
            } else {
                var tmpValues = columnValues.join("&");
                columnValues = tmpValues;
            }

            viewEntry[columnName] = columnValues;
        }
        if (viewEntries == null) {
            viewEntries = new Array(); //배열
        }

        // NS홈쇼핑 모바일 전용 핃드 추가함 20230320 by shin min jae
        if (util.isUndefined(viewEntry["openurl"])) {
            viewEntry["openurl"] = "/" + _filepath.toLowerCase() + "/0/" + unid + "?opendocument";
        }
        if (util.isUndefined(viewEntry["attach"])) {
            viewEntry["attach"] = false;
            if (_this._source["attname"] != "") {
                viewEntry["attach"] = true;
            }
        }

        viewEntries.push(viewEntry);
    }

    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToDASData : end");
    return viewEntries;
}

// outputformat=grid
function convertToXGRIData(qObj, originObjData, viewname, columnNamesText, posStart, checkview) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToXGRIData : start");
    var xml = null;
    if (originObjData == null) {
        return originObjData;
    }

    //7.X : hits.total.value
    //6.X : hits.total
    var totalCount = originObjData['hits']['total']['value'];
    if (util.isUndefined(totalCount)) {
        totalCount = originObjData['hits']['total'];
    }

    var viewEntry = ''; //result Object
    var position = posStart;
    position *= 1;
    var nPosStart = posStart * 1;
    var columnNames = columnNamesText.split(";");

    var jdc = originObjData.hits.hits;
    for (var idx = 0; idx < jdc.length; idx++) {
        position++;
        var _this = jdc[idx];

        var unid = "";
        if (!util.isUndefined(_this._source["_universalid"])) {
            unid = _this._source["_universalid"];
        }

        var noteid = "";
        if (!util.isUndefined(_this._source["_noteid"])) {
            noteid = _this._source["_noteid"];
        }

        viewEntry += '<row id="' + unid + "_" + position + '">';

        var columnName = "", columnValues = "";
        if (checkview == 1) {
            viewEntry += '<cell name="$check">0</cell>';
        }

        for (var columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
            //for (var columnIndex = columnNames.length-1; columnIndex >= 0; columnIndex--) {
            columnName = columnNames[columnIndex].toLowerCase();
            var isColumnArray = false;
            try {
                columnValues = _this._source["_vc_" + viewname + "_" + columnName];
                if (columnValues == null) {
                    columnValues = "";
                }
                if (typeof (columnValues) == "object") {
                    isColumnArray = true;
                }
            } catch (error) {
                console.log("Err - convertToXGRIData : " + error.message);
                columnValues = "";
            }
            if (!isColumnArray) {
                //Date Type value change
                if (columnValues != "") {
                    if (util.IsNumeric(columnValues)) {
                        columnValues = columnValues + "";
                    } else {
                        if (columnValues.toUpperCase().indexOf("T") == 8 && columnValues.length == 15) {
                            //20180430T110925 ==> 20200123T154233+09:00
                            var _year = columnValues.substr(0, 4);
                            var _month = columnValues.substr(4, 2);
                            var _day = columnValues.substr(6, 2);

                            var _hour = columnValues.substr(9, 2);
                            var _min = columnValues.substr(11, 2);
                            var _sec = columnValues.substr(13, 2);

                            if (isDatetime(_year + "-" + _month + "-" + _day + " " + _hour + ":" + _min + ":" + _sec)) {
                                var localeDateTime = getLocaleDateTimeString(_year, _month, _day, _hour, _min, _sec);
                                if (localeDateTime != "") {
                                    columnValues = localeDateTime;
                                }
                            }
                        }
                    }
                }
            } else {
                var tmpValues = columnValues.join("&");
                columnValues = tmpValues;
            }

            util.msgbox2(LOG_STEP_02, qObj.debug, "convertToXGRIData - columnName : ", columnName);

            if (columnName.toLowerCase() == "$rev" || columnName.toLowerCase() == "rev") {
                viewEntry += '<userdata name="' + columnName + '"><![CDATA[ ' + columnValues + ' ]]></userdata>';
            } else {
                // 하림 전용 커스텀 : start
                if (columnName.toLowerCase() == "$att") {
                    if (_this._source["attname"] != "") {
                        viewEntry += '<cell name="' + columnName + '"><![CDATA[ <span tmpid="attach" title=""><img tmpid="opinion" src="/icons/vwicn005.gif" border="0" alt=""></span>' + columnValues + ' ]]></cell>';
                    } else {
                        viewEntry += '<cell name="' + columnName + '"><![CDATA[ ' + columnValues + ' ]]></cell>';
                    }
                } else if (columnName.toLowerCase().indexOf("secret_sel") != -1) {
                    if (columnValues == "1") {
                        columnValues = "일반";
                    } else if (columnValues == "2") {
                        columnValues = "대내비";
                    }

                    // util.msgbox2(LOG_STEP_02, qObj.debug, "convertToXGRIData - columnName - " + columnName + " typeof : ", typeof columnName);
                    // util.msgbox2(LOG_STEP_02, qObj.debug, "convertToXGRIData - columnName - " + columnName + " - columnValues : ", columnValues);
                    viewEntry += '<cell name="' + columnName + '"><![CDATA[ ' + columnValues + ' ]]></cell>';
                } else if (columnName.toLowerCase() == "docunid") {
                    viewEntry += '<userdata name="' + columnName + '"><![CDATA[ ' + columnValues + ' ]]></userdata>';
                } else if (columnName.toLowerCase() == "subject") {
                    viewEntry += '<userdata name="' + columnName + '"><![CDATA[ ' + columnValues + ' ]]></userdata>';
                    viewEntry += '<cell name="' + columnName + '"><![CDATA[ ' + columnValues + ' ]]></cell>';
                } else if (columnName.toLowerCase() == "$keepterm") {
                    var keepterm = columnValues;
                    if (keepterm.toLowerCase() == "z") {
                        keepterm = "영구";
                    }
                    viewEntry += '<cell name="' + columnName + '"><![CDATA[ ' + keepterm + ' ]]></cell>';
                } else {
                    viewEntry += '<cell name="' + columnName + '"><![CDATA[ ' + columnValues + ' ]]></cell>';
                }
                // 하림 전용 커스텀 : end
            }
        }

        //lastposition
        viewEntry += '<userdata name="lastposition"><![CDATA[ ' + posStart + ' ]]></userdata>';

        //dbpath
        viewEntry += '<userdata name="dbpath"><![CDATA[' + _this._source["_filepath"] + ']]></userdata>';

        //unid
        viewEntry += '<userdata name="unid"><![CDATA[' + _this._source["_universalid"] + ']]></userdata>';

        viewEntry += '</row>';
    }
    viewEntries = '<?xml version="1.0" encoding="UTF-8"?>';
    var displayTotalCount = totalCount;
    if (displayTotalCount >= 969696) {
        displayTotalCount = 969696;
    }
    if (nPosStart > 0) {
        //2page 이상
        viewEntries += '<rows total_count="" pos="' + nPosStart + '">';
        viewEntries += '<userdata name="toplevelentries">' + totalCount + '</userdata>';
    } else {
        //1page
        viewEntries += '<rows total_count="' + displayTotalCount + '" pos="0">';
        viewEntries += '<userdata name="toplevelentries">' + totalCount + '</userdata>';
    }

    viewEntries += viewEntry;
    viewEntries += '</rows>';

    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToXGRIData : end");
    return viewEntries;
}

// outputformat=xml
function convertToXMLData(qObj, originObjData, viewname, columnNamesText) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToXMLData : start");
    var xml = null;
    if (originObjData == null) {
        return originObjData;
    }
    //7.X : hits.total.value
    //6.X : hits.total
    var totalCount = originObjData['hits']['total']['value'];
    if (util.isUndefined(totalCount)) {
        totalCount = originObjData['hits']['total'];
    }

    var viewEntry = ''; //result Object
    var position = 0;
    var columnNames = columnNamesText.split(";");

    var jdc = originObjData.hits.hits;
    for (var idx = 0; idx < jdc.length; idx++) {
        position++;
        var unid = ""
        var _this = jdc[idx];

        if (!util.isUndefined(_this._source["_universalid"])) {
            unid = _this._source["_universalid"];
        }

        var noteid = "";
        if (!util.isUndefined(_this._source["_noteid"])) {
            noteid = _this._source["_noteid"];
        }

        viewEntry += '<viewentry position="' + position + '" unid="' + unid + '" noteid="' + noteid + '" siblings="' + totalCount + '">';

        var columnName = "";
        var columnValues = "";
        for (var columnIndex = 0; columnIndex < columnNames.length; columnIndex++) {
            columnName = columnNames[columnIndex].toLowerCase();
            var isColumnArray = false;
            try {
                columnValues = _this._source["_vc_" + viewname + "_" + columnName];
                if (columnValues == null) {
                    columnValues = "";
                }
                if (typeof (columnValues) == "object") {
                    isColumnArray = true;
                }
            } catch (error) {
                console.log("Err - convertToXMLData : " + error.message);
                columnValues = "";
            }

            if (!isColumnArray) {
                //Date Type value change
                if (columnValues != "") {
                    if (util.IsNumeric(columnValues)) {
                        columnValues = columnValues + "";
                    } else {
                        if (columnValues.toUpperCase().indexOf("T") == 8 && columnValues.length == 15) {
                            //20180430T110925 ==> 20200123T154233+09:00
                            var _year = columnValues.substr(0, 4);
                            var _month = columnValues.substr(4, 2);
                            var _day = columnValues.substr(6, 2);

                            var _hour = columnValues.substr(9, 2);
                            var _min = columnValues.substr(11, 2);
                            var _sec = columnValues.substr(13, 2);

                            if (isDatetime(_year + "-" + _month + "-" + _day + " " + _hour + ":" + _min + ":" + _sec)) {
                                var localeDateTime = getLocaleDateTimeString(_year, _month, _day, _hour, _min, _sec);
                                if (localeDateTime != "") {
                                    columnValues = localeDateTime;
                                }
                            }
                        }
                    }
                }
            } else {
                var tmpValues = columnValues.join("&");
                columnValues = tmpValues;
            }

            viewEntry += '<entrydata columnnumber="' + columnIndex + '" name="' + columnName + '">';
            viewEntry += '<text><![CDATA[ ' + columnValues + ' ]]></text>';
            viewEntry += '</entrydata>';
        }
        viewEntry += '</viewentry>';
    }

    var today = new Date();
    var year = today.getFullYear(); // 년도
    var month = today.getMonth() + 1;  // 월
    var date = today.getDate();  // 날짜
    var hours = today.getHours(); // 시
    var minutes = today.getMinutes();  // 분
    var seconds = today.getSeconds();  // 초
    var milliseconds = today.getMilliseconds(); // 밀리초
    var timestamp = year.toString();

    timestamp += month < 10 ? "0" + month.toString() : month.toString();
    timestamp += date < 10 ? "0" + date.toString() : date.toString();
    timestamp += "T";
    timestamp += hours < 10 ? "0" + hours.toString() : hours.toString();
    timestamp += minutes < 10 ? "0" + minutes.toString() : minutes.toString();
    timestamp += seconds < 10 ? "0" + seconds.toString() : seconds.toString();
    timestamp += ',';
    timestamp += milliseconds.toString() + "Z";

    viewEntries = '<?xml version="1.0" encoding="UTF-8"?><viewentries timestamp="' + timestamp + '" toplevelentries="' + totalCount + '">';
    viewEntries += viewEntry;
    viewEntries += '</viewentries>';

    //xml = jQuery.parseXML(viewEntries);
    //xml = $.parseXML(viewEntries);
    util.msgbox2(LOG_STEP_02, qObj.debug, "[function] convertToXMLData : end");
    return viewEntries;
}

function isDatetime(d) {
    var re = /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]/;
    //         yyyy -       MM      -       dd           hh     :   mm  :   ss
    return re.test(d);
}

//GMT시간을 현재시간으로 convert
function getLocaleDateTimeString(year, month, day, h, M, s) {
    var ret = "";
    var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var nMonth;
    //IE 5.0 patch
    if (month.indexOf("0") == 0) {
        //01,02.....09까지의 앞 '0'을 제거해야 함
        nMonth = parseInt(month.replace(/0/gi, "")) - 1;
    } else {
        nMonth = parseInt(month) - 1;
    }
    var monthName = monthNames[nMonth];
    var timeStr = h + ":" + M + ":" + s;
    var serverTime = new Date(Date.parse(day + ' ' + monthName + ' ' + year + ' ' + timeStr + ' UTC'));

    var offset = new Date().getTimezoneOffset();
    var offsetFromGMT = ((offset / 60) * -1) + "";

    var tzDigit = offsetFromGMT;
    var sign = "+";
    if (tzDigit.indexOf("-") != -1) {
        sign = "-";
    }

    tzDigit = tzDigit.replace(sign, ''); //-9 -> 9
    tzDigit = (tzDigit > 9 ? '' : '0') + tzDigit; //9 -> 09
    tzDigit = "00" + sign + tzDigit; // 09 -> 00+09 or 00-09

    //20200205T235503 변환
    var mm = serverTime.getMonth() + 1;
    var dd = serverTime.getDate();
    var ymd = [serverTime.getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd].join('');

    var hh = serverTime.getHours();
    var min = serverTime.getMinutes();
    var sec = serverTime.getSeconds();
    var hms = [(hh > 9 ? '' : '0') + hh, (min > 9 ? '' : '0') + min, (sec > 9 ? '' : '0') + sec].join('');
    var ret = ymd + "T" + hms + "," + tzDigit;

    return ret;
}

//===========================[String control Function]===================//
module.exports = { service };