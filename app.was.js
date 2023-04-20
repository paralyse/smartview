const url = require("url");
const express = require("express");
const config = require("./config.json");
const util = require("./lib/util.js");
var pathList = config.pathList;

const LOG_STEP_01 = 1, LOG_STEP_02 = 2, LOG_STEP_03 = 3;

var PORT = process.argv[2] || process.env.PORT; // this http service port || ecosystem env PORT 값
if (typeof PORT == undefined || typeof PORT == "undefined" || PORT == null || PORT == "") {
    if (config.port) {
        PORT = config.port;
    } else {
        console.log("환경 파일--config.json 에 port 키가 없습니다.");
    }
}
PORT *= 1;

var app = express();

// get
app.get(pathList, async (req, res) => {
    var qObj = {};
    qObj = util.setDebug(qObj);
    console.log()
    util.msgbox2(LOG_STEP_02, qObj.debug, "app.get : start");
    setQObj(req, res, qObj);
});

// post
app.post(pathList, async (req, res) => {
    var qObj = {};
    qObj = util.setDebug(qObj);
    util.msgbox2(LOG_STEP_02, qObj.debug, "app.post : start");
    setQObj(req, res, qObj);
});

// put
app.put(pathList, async (req, res) => {
    var qObj = {};
    qObj = util.setDebug(qObj);
    util.msgbox2(LOG_STEP_02, qObj.debug, "app.put : start");
    setQObj(req, res, qObj);
});

// delete
app.delete(pathList, async (req, res) => {
    var qObj = {};
    qObj = util.setDebug(qObj);
    util.msgbox2(LOG_STEP_02, qObj.debug, "app.delete : start");
    setQObj(req, res, qObj);
});

// setQObj
function setQObj(req, res, qObj) {
    util.msgbox2(LOG_STEP_02, qObj.debug, "setQObj : start");
    try {
        if (req.method === "GET" || req.method === "DELETE") {
            if (!util.isEmptyObj(req.query)) {
                qObj.params = {}
                for (var dataIndex in req.query) {
                    qObj[dataIndex] = req.query[dataIndex];
                    qObj.params[dataIndex] = req.query[dataIndex];
                }
            }
            // request의 querystring(get), postdata(post)의 parameter를 qObj에 추가 : end
            util.msgbox2(LOG_STEP_02, qObj.debug, "setQObj : end");

            callTask(req, res, qObj);
            return;
        }

        if (req.body) {
            if (!util.isEmptyObj(req.query)) {
                qObj.params = {}
                for (var dataIndex in req.query) {
                    qObj[dataIndex] = req.query[dataIndex];
                    qObj.params[dataIndex] = req.query[dataIndex];
                }
            }

            qObj["body"] = {};
            for (var dataIndex in req.body) {
                // qObj[dataIndex] = req.body[dataIndex];
                qObj["body"][dataIndex] = req.body[dataIndex];
            }
            util.msgbox2(LOG_STEP_02, qObj.debug, "setQObj : end");

            callTask(req, res, qObj);
            return;
        } else {
            let body = [];
            req.on("error", function (err) {
                console.log("req.on error catch");
                console.log("[REQUEST_BODY-ERROR] " + err);
            })
                .on("data", function (chunk) {
                    //chunk : postdata
                    body.push(chunk);
                })
                .on("end", function () {
                    // request의 querystring(get), postdata(post)의 parameter를 qObj에 추가 : start
                    if (!util.isEmptyObj(req.query)) {
                        qObj.params = {}
                        for (var dataIndex in req.query) {
                            qObj[dataIndex] = req.query[dataIndex];
                            qObj.params[dataIndex] = req.query[dataIndex];
                        }
                    }

                    if (req.body) {
                        qObj["body"] = {};
                        for (var dataIndex in req.body) {
                            // qObj[dataIndex] = req.body[dataIndex];
                            qObj["body"][dataIndex] = req.body[dataIndex];
                        }
                    }

                    var postData = body.join("");
                    if (postData != "") {
                        util.msgbox2(LOG_STEP_03, qObj.debug, "POST 원본 데이타 => ", postData);
                        postData = util.replaceAll(postData, "&quout;", '"');
                        postData = util.replaceAll(postData, "\t", " ");

                        req.rawBody = postData;
                        var isParseError = false;
                        try {
                            var postDataObj = JSON.parse(postData);
                        } catch (e) {
                            util.msgbox2(LOG_STEP_03, qObj.debug, "POST DATA is NOT JSON Format." + postData, "->JSON으로 변환시도...");
                            isParseError = true;
                        }
                        if (!isParseError) {
                            for (var dataObj in postDataObj) {
                                qObj[dataObj] = postDataObj[dataObj];
                            }
                        } else {
                            var arr = postData.split("&");
                            // x=1&y=2&z=3 => [0] x=1 [1] y=2 [2] z=3
                            for (var index = 0; index < arr.length; index++) {
                                if (arr[index].indexOf("=") > 0) {
                                    var key = util.strLeft(arr[index], "=");
                                    var val = util.strRight(arr[index], "=");
                                    val = val.replace(/%20/gi, "&");
                                    var decordingText = "";
                                    if (val.indexOf(";") != -1) {
                                        //for array
                                        var arr = val.split(";");
                                        var newArr = [];
                                        for (var index = 0; index < arr.length; index++) {
                                            newArr.push(arr[index].trim());
                                        }

                                        qObj[key] = newArr;
                                    } else {
                                        try {
                                            decordingText = decodeURIComponent(val);
                                        } catch (error) {
                                            decordingText = unescape(val);
                                        }
                                        qObj[key] = decordingText;
                                    }
                                } else {
                                    var key = arr[index];
                                    qObj[key] = "";
                                }
                            }
                            util.msgbox2(LOG_STEP_03, qObj.debug, "POST DATA is NOT JSON Format." + postData, "->JSON으로 변환결과:", qObj);
                        }
                    }
                    // request의 querystring(get), postdata(post)의 parameter를 qObj에 추가 : end
                    util.msgbox2(LOG_STEP_02, qObj.debug, "setQObj : end");

                    callTask(req, res, qObj);
                    return;
                });
        }
    } catch (error) {
        console.error(error);
    }
}

const callTask = async (req, res, qObj) => {
    // qObj.debug 재설정
    qObj = util.setDebug(qObj);
    util.msgbox2(LOG_STEP_03, qObj.debug, "### qObj 전체 값 : ", JSON.stringify(qObj));

    util.msgbox2(LOG_STEP_02, qObj.debug, "### " + __filename + " : callTask : start");
    try {
        var reqFunction = req.url.replace("/", "");
        reqFunction = reqFunction.toLowerCase();
        util.msgbox2(LOG_STEP_03, qObj.debug, "=======================================");
        if (reqFunction == "_readviewentries") {
            try {
                if (util.isUndefined(qObj.userinfo)) {
                    qObj.userinfo = "";
                }
                util.msgbox("### readViewEntries... start : userinfo : " + qObj.userinfo);
                util.msgbox2(LOG_STEP_02, qObj.debug, "### call readViewEntries.service");
                var readViewEntries = require("./task/readViewEntries.js");
                readViewEntries.service(config, qObj, res);
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
        } else {
            try {
                util.msgbox("### attachToElastic... start");
                util.msgbox2(LOG_STEP_02, qObj.debug, "### call attachToElastic.service");
                var attachToElastic = require("./task/attachToElastic.js");
                attachToElastic.service(config, qObj, res);
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
        }
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

    util.msgbox2(LOG_STEP_02, qObj.debug, "### " + __filename + " : callTask : end");
};

//---------------------------------------------------------------------------------------------
var server = app.listen(PORT, function () {
    util.msgbox("SmartView server has started on port " + PORT);
});