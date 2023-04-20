const util = require("../lib/util.js");
const fs = require('fs');

function initializeCustom(qObj, selectJson) {
    var resultJson = selectJson;
    try {
        var docuemnt = qObj["document"];
        if (util.isUndefined(docuemnt)) {
            console.log("### docuemnt is Nothing");
            return resultJson;
        } else {
            var docuemntObj = null;
            try {
                docuemntObj = JSON.parse(docuemnt);
            } catch (error) {
                docuemntObj = null;
            }

            // Custom Query : start
            if (docuemntObj != null) {
                // console.log("### docuemntObj: ", docuemntObj);
                var orgnumber = docuemntObj["orgnumber"];
                if (util.isUndefined(orgnumber)) {
                    console.log("### docuemnt - [orgnumber] is Nothing");
                    return resultJson;
                }
                var viewname = docuemntObj["viewname"];
                if (util.isUndefined(viewname)) {
                    viewname = docuemntObj["view"];
                    if (util.isUndefined(viewname)) {
                        viewname = docuemntObj["viewalias"];
                    }
                }

                if (util.isUndefined(viewname)) {
                    console.log("### docuemnt - [viewname or view or viewalias] is Nothing");
                    return resultJson;
                }

                // view186(기결함) : custom query build
                if (viewname.toLowerCase().indexOf("view186") != -1) {
                    var customArray = [];

                    var isSpecial = false;
                    // condition_1 - start
                    var customObj_child = {};
                    if (orgnumber.toLowerCase() == "E10201133".toLowerCase()) {
                        // console.log("### 특수 사용자 : 김창환 들어옴 , condition_1");
                        customObj_child["app_list"] = "E10890388";
                        isSpecial = true;
                    } else if (orgnumber.toLowerCase() == "E10890388".toLowerCase()) {
                        customObj_child["app_list"] = "E10200890";
                        isSpecial = true;
                    }

                    var customObj = {};
                    if (isSpecial) {
                        customObj = {};
                        customObj["term"] = customObj_child;
                        customArray.push(customObj);
                    }

                    // condition_1 - end

                    // condition_2 - start
                    customObj_child = {};
                    if (orgnumber.toLowerCase() == "E10201133".toLowerCase()) {
                        // console.log("### 특수 사용자 : 김창환 들어옴 , condition_2");
                        customObj_child["aud_list"] = "E10890388";
                        isSpecial = true;
                    } else if (orgnumber.toLowerCase() == "E10890388".toLowerCase()) {
                        customObj_child["aud_list"] = "E10200890";
                        isSpecial = true;
                    }

                    if (isSpecial) {
                        customObj = {};
                        customObj["term"] = customObj_child;
                        customArray.push(customObj);
                    } else {
                        return resultJson;
                    }
                    // condition_2 - end


                    // resultJson Add in condition : start
                    if (isSpecial) {
                        if (util.isUndefined(resultJson["query"]["bool"]["filter"])) {
                            console.log("### resultJson : {query.bool.filter} is nothing");
                        } else {
                            for (var index = 0; index < resultJson["query"]["bool"]["filter"].length; index++) {
                                var boolObj = resultJson["query"]["bool"]["filter"][index];

                                for (var subIndex in boolObj) {
                                    var subObj = boolObj[subIndex];

                                    for (var shoudIndex in subObj) {
                                        if (shoudIndex == "should") {
                                            if (util.isUndefined(customArray)) {
                                            } else {
                                                for (var customIndex in customArray) {
                                                    subObj[shoudIndex].push(customArray[customIndex]);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    // resultJson Add in condition : end
                }
            }
            // Custom Query : end
        }
    } catch (error) {
        console.log("[initializeCustom - ERR]");
        console.log(error);
    }

    /*
    if (qObj["isdown"] == "1") {
        var today = new Date();
        var seconds = today.getSeconds();
        util.msgfile("special_readview_els_query_" + seconds + ".json", JSON.stringify(resultJson));
    }
    */

    return resultJson;
}

module.exports = { initializeCustom };