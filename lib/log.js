const util = require("./util.js");
var info = function (para1, log_) {
    //DB에 저장
    if (
        typeof log_ == "undefined" ||
        typeof log_ == undefined ||
        log_ == null ||
        log_ == ""
    ) {
        console.log(util.getTimeStamp(), para1);        
    } else {
        console.log(util.getTimeStamp(), para1, log_);
    }
};
var log = function (para1, log_) {
    //DB에 저장
    if (
        typeof log_ == "undefined" ||
        typeof log_ == undefined ||
        log_ == null ||
        log_ == ""
    ) {
        console.log(util.getTimeStamp(), para1);
    } else {
        console.log(util.getTimeStamp(), para1, log_);
    }
};
var error = function (para1, log_) {
    if (
        typeof log_ == "undefined" ||
        typeof log_ == undefined ||
        log_ == null ||
        log_ == ""
    ) {
        console.error(util.getTimeStamp(), para1);
    } else {
        console.loerrorg(util.getTimeStamp(), para1, log_);
    }
};
var debug = function (para1, log_) {
    if (
        typeof log_ == "undefined" ||
        typeof log_ == undefined ||
        log_ == null ||
        log_ == ""
    ) {
        console.log(util.getTimeStamp(), para1);
    } else {
        console.log(util.getTimeStamp(), para1, log_);
    }
};
//===========================[String control Function]===================//
module.exports = { info, log,  error };
