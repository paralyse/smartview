const config = require("../config.json");
const fs = require("fs");
const cookie = require("cookie");
function writeSuccess(ret, res) {
    try {
        res.statusCode = 200;
        if (typeof ret == "object") {
            res.setHeader("Content-type", "application/json; charset=UTF-8");
            res.end(JSON.stringify(ret));
        } else {
            res.setHeader("Content-type", "text/html; charset=UTF-8");
            res.end(ret);
        }
    } catch (error) {
        writeWithStatus(400, { result: false, description: error.message }, res);
    }
}

function writeError(ret, res) {
    res.statusCode = 500;
    if (typeof ret == "object") {
        res.setHeader("Content-type", "application/json; charset=UTF-8");
        res.end(JSON.stringify(ret));
    } else {
        res.setHeader("Content-type", "text/html; charset=UTF-8");
        res.end(ret);
    }
}

function writeWithStatus(statusCode, ret, res) {
    res.statusCode = statusCode;
    if (typeof ret == "object") {
        res.setHeader("Content-type", "application/json; charset=UTF-8");
        res.end(JSON.stringify(ret));
    } else {
        res.setHeader("Content-type", "text/html; charset=UTF-8");
        res.end(ret);
    }
}

function writeWithContentType(ret, res, contentType) {
    try {
        res.statusCode = 200;
        if (typeof ret == "object") {
            res.setHeader("Content-type", contentType);
            res.end(JSON.stringify(ret));
        } else {
            res.setHeader("Content-type", contentType);
            res.end(ret);
        }
    } catch (error) {
        writeWithStatus(400, { result: false, description: error.message }, res);
    }
}

function isUndefined(name) {
    var ret = true;
    if (typeof name == undefined || typeof name == "undefined" || name == null || name == "") {
        if (name == "") {
            if (IsNumeric(name)) {
                ret = false;
            }
        }
    } else {
        ret = false;
    }

    return ret;
}

function isEmptyObj(obj) {
    var ret = false;
    try {
        if (obj.constructor === Object && Object.keys(obj).length === 0) {
            ret = true;
        }
    } catch (e) {
        ret = true;
    }
    return ret;
}

function setDebug(qObj) {
    if (!isUndefined(qObj.debug)) {
        if (!IsNumeric(qObj.debug)) {
            qObj.debug = 1;
        } else {
            if (typeof qObj.debug == "string") {
                qObj.debug = Number(qObj.debug);
            }
        }
    } else {
        if (!isUndefined(config.debugging_level)) {
            if (!IsNumeric(config.debugging_level)) {
                qObj.debug = 1;
            } else {
                if (typeof config.debugging_level == "string") {
                    qObj.debug = Number(config.debugging_level);
                } else {
                    qObj.debug = config.debugging_level;
                }
            }
        } else {
            qObj.debug = 1;
        }
    }

    return qObj;
}

function getDir(qObj) {
    dirname = qObj.dirname;
    var dirPath = dirname + "/output";
    var hasDir = false;
    try {
        dirPath = qObj.outputdirpath;
        if (isUndefined(dirPath)) {
        } else {
            hasDir = true;
        }
    } catch (e) {
        dirPath = dirname + "/output";
    }

    if (hasDir) {
    } else {
        dirPath = dirname + "/output";
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        var date = new Date();
        var year = date.getFullYear();
        dirPath = dirPath + "/" + year;
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        var month = date.getMonth() + 1;
        month = (month > 9 ? "" : "0") + month;
        dirPath = dirPath + "/" + month;
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        var day = date.getDate();
        day = (day > 9 ? "" : "0") + day;
        dirPath = dirPath + "/" + day;
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }

        var hour = date.getHours();
        hour = (hour > 9 ? "" : "0") + hour;
        dirPath = dirPath + "/" + hour;
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
        }
    }
    return dirPath;
}

function getUrl(qObj) {
    var url = qObj.url;
    if (isUndefined(url)) {
        url = qObj.documenturl;
    }

    msgbox2(1, "get url===>" + url);
    url = decodeURIComponent(url);
    url = url.replace(/%26/gi, "&");
    return url;
}

function getLanguageCode(req, qObj) {
    var ret = "ko";
    try {
        var language = qObj.language;
        var langArr = ["DWP_LANG", "language"];
        if (language == undefined || language == 'undefined' || language == null || language == '') {
            var cookies = req.headers.cookie;
            var languageArr = cookies.split(";");
            var lang = "";
            for (i = 0; i < languageArr.length; i++) {
                var cookie = languageArr[i].trim();
                var cookie2 = cookie.split("=");
                for (var x = 0; x < cookie2.length; x++) {
                    for (var y = 0; y < langArr.length; y++) {
                        if (cookie2[0].trim().toLowerCase() == langArr[y].toLowerCase()) {
                            language = cookie2[1];
                            break;
                        }
                    }
                    if (language == undefined || language == 'undefined' || language == null || language == '') {
                    } else {
                        break;
                    }
                }
                if (language == undefined || language == 'undefined' || language == null || language == '') {
                } else {
                    break;
                }
            }
        }
    } catch (e) {

    }
    if (language == undefined || language == 'undefined' || language == null || language == '') {
        language = 'ko';
    }
    ret = language;
    return ret;

}

//첨부파일
function writeAttachSuccess(ret, res, fileName, fileSize) {
    console.log(ret);
    res.setHeader("Content-type", "application/x-download;");
    res.setHeader("Content-Encoding", "gzip");
    res.setHeader("Content-Disposition", "attachment;filename=" + fileName + "");
    // res.setHeader("Content-Length", fileSize);

    res.end(ret);
}

var msgbox = function (param1, param2, param3, param4, param5) {
    if (param5) {
        console.log(getTimeStamp() + " " + param1, param2, param3, param4, param5);
    } else if (param4) {
        console.log(getTimeStamp() + " " + param1, param2, param3, param4);
    } else if (param3) {
        console.log(getTimeStamp() + " " + param1, param2, param3);
    } else if (param2) {
        console.log(getTimeStamp() + " " + param1, param2);
    } else {
        console.log(getTimeStamp() + " " + param1);
    }
};

var msgbox2 = function (debugging_level, request_level, param1, param2, param3, param4, param5) {
    if (config.debugging) {
        msgbox(param1, param2, param3, param4, param5);
    } else {
        if (!isUndefined(request_level)) {
            if (IsNumeric(request_level)) {
                if (IsNumeric(debugging_level)) {
                    if (debugging_level <= request_level) {
                        msgbox(param1, param2, param3, param4, param5);
                    }
                }
            }
        }
    }
};

var msgfile = function (fileName, contents) {
    //if (config.debugging) {
    var fullDir = __dirname.replace(/\\/gi, "/");
    var filePath = strLeft(fullDir, "/lib");
    if (!fs.existsSync(filePath + "/logs")) {
        fs.mkdirSync(filePath + "/logs", { recursive: true });
    }
    filePath += "/logs/" + fileName;
    //msgbox2("로그기록=>", filePath);
    console.log("로그기록=>", filePath);

    fs.writeFile(filePath, contents, "utf8", function (error) {
        if (error) return console.log(error);
    });
    //}
};

var msgfile2 = function (debugging_level, request_level, fileName, contents) {
    if (config.debugging) {
        msgfile(fileName, contents);
    } else {
        if (!isUndefined(request_level)) {
            if (IsNumeric(request_level)) {
                if (IsNumeric(debugging_level)) {
                    if (debugging_level <= request_level) {
                        msgfile(fileName, contents);
                    }
                }
            }
        }
    }
}

var format = function (number, formatStr) {
    return new Intl.NumberFormat("en-IN", {
        maximumSignificantDigits: 3,
    }).format(number);
};

var getTimeStampNoSepa = function () {
    var d = new Date();

    var s =
        leadingZeros(d.getHours(), 2) +
        leadingZeros(d.getMinutes(), 2) +
        leadingZeros(d.getSeconds(), 2) +
        leadingZeros(d.getMilliseconds(), 3) +
        "";

    return s;
};

var leadingZeros = function (n, digits) {
    var zero = "";
    n = n.toString();

    if (n.length < digits) {
        for (i = 0; i < digits - n.length; i++) zero += "0";
    }
    return zero + n;
};
var getTimeStamp = function () {
    var d = new Date();

    var s =
        leadingZeros(d.getHours(), 2) +
        ":" +
        leadingZeros(d.getMinutes(), 2) +
        ":" +
        leadingZeros(d.getSeconds(), 2) +
        "." +
        leadingZeros(d.getMilliseconds(), 3) +
        " ";

    return s;
};

function getCookie(qObj) {
    var cookies = cookie.parse(qObj["cookie"]);
    return cookies;
}

// OS의 따른 상대경로 구분자 값 추출
function getPathSeparator() {
    var myGlobals = { isWin: false, isOsX: false, isNix: false };
    if (/^win/.test(process.platform)) {
        myGlobals.isWin = true;
    } else if (process.platform === "darwin") {
        myGlobals.isOsX = true;
    } else if (process.platform === "linux") {
        myGlobals.isNix = true;
    }
    if (myGlobals.isWin) {
        return "\\";
    } else if (myGlobals.isOsx || myGlobals.isNix) {
        return "/";
    }

    // default to *nix system.
    return "/";
}

//===========================[String control Function]===================//
var URLQueryString = function (sSource, sSeparator1) {
    var sRight = "";
    var sLeft = "";
    var sReturn = "";
    //var specialChars = '`~!@#$%^*()_+-{}[]|\':";<>?,/';
    var arr = sSource.split("&");
    var foundKey = false;
    var tmpKey;
    var arrChar = [];
    arrChar.push("~");
    arrChar.push("`");
    arrChar.push("!");
    arrChar.push("@");
    arrChar.push("#");
    arrChar.push("$");
    arrChar.push("%");
    arrChar.push("^");
    arrChar.push("*");
    arrChar.push("(");
    arrChar.push(")");
    arrChar.push("-");
    arrChar.push("+");
    arrChar.push("{");
    arrChar.push("}");
    arrChar.push("[");
    arrChar.push("]");
    arrChar.push(":");
    arrChar.push(";");
    arrChar.push('"');
    arrChar.push("'");
    arrChar.push("<");
    arrChar.push(">");
    arrChar.push(",");
    arrChar.push("?");
    arrChar.push("/");
    var foundSpecialChar = false;
    // x=1&y=2&z=3 => [0] x=1 [1] y=2 [2] z=3
    for (var index = 0; index < arr.length; index++) {
        if (foundKey) {
            if (arr[index].indexOf("=") > 0) {
                tmpKey = strLeft(arr[index], "=");
                foundSpecialChar = false;
                for (var idx = 0; idx < arrChar.length; idx++) {
                    if (tmpKey.indexOf(arrChar[idx]) != -1) {
                        foundSpecialChar = true;
                        break;
                    }
                }
                if (foundSpecialChar) {
                    sReturn += "&" + arr[index];
                } else {
                    break;
                }
            } else {
                sReturn += "&" + arr[index];
            }
        }
        if (
            arr[index].toLowerCase().indexOf(sSeparator1.toLowerCase() + "=") ==
            0
        ) {
            foundKey = true;
            sReturn = strRight(arr[index], "=");
        }
        if (index >= arr.length - 1) {
            break;
        }
    }
    return sReturn;
};

var strLeft = function (str, sKey, ContainsKey) {
    if (!ContainsKey) ContainsKey = false;

    var nIndex;
    var sRet = "";

    nIndex = str.indexOf(sKey);

    if (nIndex != -1) {
        sRet = str.substr(0, nIndex);
        if (ContainsKey) sRet += sKey;
    }
    return sRet;
};

var strLeftBack = function (str, sKey, ContainsKey) {
    if (!ContainsKey) ContainsKey = false;

    var nIndex;
    var sRet = "";

    nIndex = str.lastIndexOf(sKey);
    if (nIndex != -1) {
        sRet = str.substr(0, nIndex);
        if (ContainsKey) sRet += sKey;
    }
    return sRet;
};

var strRight = function (str, sKey, ContainsKey) {
    if (!ContainsKey) ContainsKey = false;

    var nIndex;
    var sRet = "";

    nIndex = str.indexOf(sKey);
    if (nIndex != -1) {
        if (ContainsKey) {
            sRet = str.substr(nIndex, str.length);
        } else {
            sRet = str.substr(nIndex + sKey.length, str.length);
        }
    }
    return sRet;
};

var strRightBack = function (str, sKey, ContainsKey) {
    if (!ContainsKey) ContainsKey = false;

    var nIndex;
    var sRet = "";

    nIndex = str.lastIndexOf(sKey);
    if (nIndex != -1) {
        if (ContainsKey) {
            sRet = str.substr(nIndex, str.length);
        } else {
            sRet = str.substr(nIndex + sKey.length, str.length);
        }
    }
    return sRet;
};

var strMid = function (str, sKey1, sKey2, ContainsLeftKey, ContainsRightKey) {
    if (!ContainsLeftKey) ContainsLeftKey = false;
    if (!ContainsRightKey) ContainsRightKey = false;

    var sRight, sLeft;
    var sRet = "";

    sRight = strRight(str, sKey1);
    if (
        typeof sKey2 == "undefined" ||
        typeof sKey2 == undefined ||
        sKey2 == null
    ) {
        console.log("strMid::second key is undefined!");
        sLeft = "";
    } else {
        sLeft = strLeft(sRight, sKey2);
    }
    if (sLeft != "") {
        sRet = sLeft;
        //좌측 검색어를 포함하는 경우
        if (ContainsLeftKey) {
            sRet = sKey1 + sLeft;
        }
        //우측 검색어를 포함하는 경우
        if (ContainsRightKey) {
            sRet += sKey2;
        }
    } else {
        //두번째 키가 없으면 첫번째 키로부터 끝까지
        sRet = sRight;
    }

    return sRet;
};

var isDatetime = function (d) {
    var re =
        /[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1]) (2[0-3]|[01][0-9]):[0-5][0-9]/;
    //         yyyy -       MM      -       dd           hh     :   mm  :   ss
    return re.test(d);
};

//GMT시간을 현재시간으로 convert
var getLocaleDateTimeString = function (year, month, day, h, M, s) {
    var ret = "";
    var monthNames = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
    ];
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
    var serverTime = new Date(
        Date.parse(day + " " + monthName + " " + year + " " + timeStr + " UTC")
    );

    var offset = new Date().getTimezoneOffset();
    var offsetFromGMT = (offset / 60) * -1 + "";

    var tzDigit = offsetFromGMT;
    var sign = "+";
    if (tzDigit.indexOf("-") != -1) {
        sign = "-";
    }

    tzDigit = tzDigit.replace(sign, ""); //-9 -> 9
    tzDigit = (tzDigit > 9 ? "" : "0") + tzDigit; //9 -> 09
    tzDigit = "00" + sign + tzDigit; // 09 -> 00+09 or 00-09

    //20200205T235503 변환
    var mm = serverTime.getMonth() + 1;
    var dd = serverTime.getDate();
    var ymd = [
        serverTime.getFullYear(),
        (mm > 9 ? "" : "0") + mm,
        (dd > 9 ? "" : "0") + dd,
    ].join("");

    var hh = serverTime.getHours();
    var min = serverTime.getMinutes();
    var sec = serverTime.getSeconds();
    var hms = [
        (hh > 9 ? "" : "0") + hh,
        (min > 9 ? "" : "0") + min,
        (sec > 9 ? "" : "0") + sec,
    ].join("");
    var ret = ymd + "T" + hms + "," + tzDigit;

    return ret;
};

var getRandom = function () {
    var rnd = Math.random();
    var ret = "";
    ret = rnd + "";

    ret = ret.replace(/0./g, "");

    return ret;
};

var base64encode = function (obj) {
    var plaintext = obj;
    if (typeof plaintext == "object") {
        plaintext = JSON.stringify(obj);
    }
    return Buffer.from(plaintext, "utf8").toString("base64");
};

var base64decode = function (text) {
    return Buffer.from(text, "base64").toString("utf8");
};

var fileToBase64String = function (file) {
    //파일을 읽어서 내용을 base64로 변경
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(bitmap).toString("base64");
};

var base64StringToFile = function (encodedCont, path, fileName) {
    //콘텐를 디코딩하여 파일에 쓰기
    var bitmap = new Buffer(base64str, "base64");
    // write buffer to file
    var file = path + "/" + fileName;
    fs.writeFileSync(file, bitmap);
};

function IsNumeric(data) {
    return parseFloat(data) == data;
}

function replaceAll(str, searchStr, replaceStr) {
    return str.split(searchStr).join(replaceStr);
}

function getProperCase(str) {
    return str
        .split(" ")
        .map((w) => w[0].toUpperCase() + w.substr(1).toLowerCase())
        .join(" ");
}

function getElasticAuthorization() {
    var ret = "";
    try {
        const auth = config.org.elasticsearchId + ":" + config.org.elasticsearchPassword;
        ret = Buffer.from(auth, "utf8").toString("base64");
    } catch (error) {
        console.log(error.message);
    }

    return ret;
}
//===========================[String control Function]===================//
module.exports = {
    msgbox,
    msgbox2,
    msgfile,
    msgfile2,
    writeSuccess,
    writeAttachSuccess,
    writeError,
    writeWithStatus,
    writeWithContentType,
    format,
    getTimeStampNoSepa,
    leadingZeros,
    getTimeStamp,
    getCookie,
    URLQueryString,
    strLeft,
    strLeftBack,
    strRight,
    strRightBack,
    strMid,
    isDatetime,
    getLocaleDateTimeString,
    getRandom,
    base64encode,
    base64decode,
    fileToBase64String,
    base64StringToFile,
    isUndefined,
    getDir,
    getUrl,
    getLanguageCode,
    IsNumeric,
    isEmptyObj,
    replaceAll,
    getProperCase,
    getPathSeparator,
    getElasticAuthorization,
    setDebug
};