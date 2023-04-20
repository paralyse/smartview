const config = require("../config.json");
const util = require("../lib/util.js");
const fs = require("fs");
const spawn = require("child_process").spawn;
const req = require("request");
const https = require("https");
const http = require("http");
const ltpa = require("ltpa");

// service
const service = async (config, qObj, res) => {
	util.msgbox2(2, "attachToElastic.js service : Start");
	//util.msgfile("qObj.json", JSON.stringify(qObj));

	// 필수 파라미터 - qObj.attach_protocol
	if (util.isUndefined(qObj.attach_protocol)) {
		util.writeWithStatus(
			500,
			{ result: false, description: "qObj.attach_protocol Not Value" },
			res
		);
		return false;
	}
	util.msgbox2(3, "### qObj.attach_protocol : " + qObj.attach_protocol);

	// 필수 파라미터 - qObj.attach_server
	if (util.isUndefined(qObj.attach_server)) {
		util.writeWithStatus(
			500,
			{ result: false, description: "qObj.attach_server Not Value" },
			res
		);
		return false;
	}
	util.msgbox2(3, "### qObj.attach_server : " + qObj.attach_server);

	// 필수 파라미터 - qObj.attach_port
	if (util.isUndefined(qObj.attach_port)) {
		util.writeWithStatus(
			500,
			{ result: false, description: "qObj.attach_port Not Value" },
			res
		);
		return false;
	}
	util.msgbox2(3, "### qObj.attach_port : " + qObj.attach_port);

	//절대주소의 header 주소를 설정
	var downloadFileAbsolutePath =
		qObj.attach_protocol +
		"://" +
		qObj.attach_server +
		":" +
		qObj.attach_port;

	// 관리자 계정의 cookie값을 추출
	var cookie = getToken(
		downloadFileAbsolutePath,
		qObj.attach_user,
		qObj.attach_password
	);
	if (util.isUndefined(cookie)) {
		util.writeWithStatus(
			500,
			{ result: false, description: "getToken Not Value" },
			res
		);
		return false;
	}
	util.msgbox2(3, "### cookie : " + cookie);

	// 필수 환경필드 - synap_path 경로
	var SynapFilterPath = config.synap_path;
	if (SynapFilterPath == "") {
		console.log("Not Set Config.json - Synap_path.. Please Set Synap_path");
		util.writeWithStatus(
			500,
			{
				result: false,
				description:
					"Not Set Config.json - Synap_path.. Please Set Synap_path",
			},
			res
		);
		return false;
	}
	util.msgbox2(3, "### Synap_path : " + SynapFilterPath);

	// 필수 파라미터 - elasticurl
	var elasticUrl = qObj["elasticurl"];
	if (util.isUndefined(elasticUrl)) {
		elasticUrl = "";
		console.log("elasticUrl is Nothing");
		util.writeWithStatus(
			500,
			{ result: false, description: "elasticUrl is Nothing" },
			res
		);
		return false;
	}
	util.msgbox2(3, "### elasticUrl : " + elasticUrl);

	// 필수 파라미터 - download file의 상대 주소
	var arrUrl = [];
	var fileUrls = qObj["url"];
	if (util.isUndefined(fileUrls)) {
		console.log("fileUrls is Nothing");
		util.writeWithStatus(
			500,
			{ result: false, description: "fileUrls is Nothing" },
			res
		);
		return false;
	}
	util.msgbox2(3, "### fileUrls : " + fileUrls);
	arrUrl = fileUrls.split(",");

	// 첨부파일 색인대상 확장자 배열
	var filterExts = [];
	var filterExt = qObj["filterext"];
	if (util.isUndefined(filterExt)) {
		filterExt = "";
	} else {
		filterExts = filterExt.split(",");
	}
	util.msgbox2(3, "### filterExt : ", filterExt);

	try {
		var bodyObj = {};
		var jObj = {};

		// dir : /opt/smartview/synap/filter4-v4.24.0-linux_64bit_VC12/v4/download
		var dir = util.strLeftBack(SynapFilterPath, "/") + "/" + "download";
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}

		// arrUrl : 첨부파일 개인 파일의 다운로드 url
		var totalWorkCount = arrUrl.length;
		util.msgbox2(3, "### 첨부파일 총 개수 : ", totalWorkCount);

		var currentCount = 0;
		for (var index = 0; index < arrUrl.length; index++) {
			// "http://dswg60.saerom.co.kr/{arrUrl[index]};
			var fileUrl = downloadFileAbsolutePath + arrUrl[index];
			util.msgbox2(
				3,
				"### 총 개수 : ",
				totalWorkCount,
				" , 현재 순번 : " + index,
				" , 현재 파일 url : ",
				fileUrl
			);
			if (
				fileUrl.toLowerCase().indexOf("%3fopenelement") != -1 ||
				fileUrl.toLowerCase().indexOf("%24mime_part_") != -1
			) {
				continue;
			}

			// 첨부파일 색인대상 확장자 비교
			var allowExt = false;
			var ext_ = "";
			for (var idx = 0; idx < filterExts.length; idx++) {
				ext_ = filterExts[idx].toLowerCase().trim();
				if (fileUrl.toLowerCase().indexOf(ext_) != -1) {
					if (util.strRightBack(fileUrl.toLowerCase(), ext_) == "") {
						// 색인 대상 ok
						allowExt = true;
						break;
					}
				}
			}

			// allowExt = true => 색인 대상 true, allowExt = false => 색인 대상 false
			if (!allowExt) {
				console.log(
					"### 첨부파일 색인 제외 확장자이므로 추가 하지 않음. 확장자명 : " +
						ext_ +
						" , fileUrl : " +
						fileUrl
				);
				continue;
			}

			util.msgbox2(3, "### STEP1-GET URL : " + fileUrl);
			var fileName = util.strRightBack(fileUrl, "/");
			var fileExt = "";
			if (fileName.indexOf(".") != -1) {
				fileExt = util.strRightBack(fileName, ".", true);
			}

			fileName = util.getRandom() + fileExt; //0.945353.docx
			// outfilepath : /opt/smartview/synap/filter4-v4.24.0-linux_64bit_VC12/v4/download/{fileName}
			var outfilepath = dir + "/" + fileName;
			var requestOptions = {
				method: "GET",
				uri: fileUrl,
				headers: {
					"User-Agent": "Mozilla/5.0",
					Cookie: cookie,
				},
				encoding: null,
			};
			//(requestOptions).pipe(fs.createWriteStream(outfilepath)); //file download from URL
			util.msgbox2(3, "### STEP2-WRITE FILE:" + outfilepath);

			var fileStream = fs.createWriteStream(outfilepath);
			fileStream.on("close", function () {
				var outFilePath = this.path;
				util.msgbox2(3, "### file done:" + this.path);
				var options = ["-U8", outFilePath, outFilePath + ".txt"];
				//console.log("EXE Options:" + JSON.stringify(options));
				util.msgbox2(
					3,
					"### STEP3-SPAWN:" +
						SynapFilterPath +
						" " +
						JSON.stringify(options)
				);
				var child = spawn(SynapFilterPath, options, {
					stdio: ["ignore"],
					detached: true,
					shell: false,
					windowsHide: true,
				});
				child.stdout.once("data", function (data) {
					util.msgbox2(3, "process.stdout.once.data..." + data);
				});

				child.on("exit", function (code) {
					util.msgbox2(3, "### STEP4-END PROCESS:" + outFilePath);
					//read extracted text file : outfilepath + ".txt"
					fs.readFile(
						outFilePath + ".txt",
						"utf8",
						function (err, data) {
							currentCount++;
							var fileKey = "0" + currentCount;
							fileKey =
								"file" + fileKey.substring(fileKey.length - 2);

							jObj[fileKey] = data; //{"file01":"가나다라"}

							if (util.isUndefined(bodyObj["doc"])) {
								bodyObj["doc"] = {};
							}
							bodyObj["doc"] = jObj; // {"doc" : {"file01":"가나다라"}}

							util.msgbox2(
								3,
								"### totalWorkCount : " + totalWorkCount,
								"### currentCount : " + currentCount
							);
							if (currentCount >= totalWorkCount) {
								var postData = JSON.stringify(bodyObj);
								util.msgbox2(
									3,
									"[E.S Attach-bodyObj] " + postData
								);

								//whose UTF8 encoding is longer than the max length 32766
								if (postData.getBytes() > 32000) {
									postData =
										postData.getStringFromByteLength(32000);
								}
								
								util.msgfile2(
									"postData_" + fileKey + ".json",
									postData
								);

								util.msgbox2(3, "[E.S url] " + elasticUrl);
								req.post(
									{
										method: "POST",
										url: elasticUrl,
										headers: {
											"User-Agent": "Mozilla/5.0",
											Authorization:
												"Basic ZWxhc3RpYzoxMjMhQCNxd2U=",
										},
										body: bodyObj,
										json: true,
									},
									function (err, httpResponse, body) {
										util.msgbox2(
											4,
											"[httpResponse] " +
												JSON.stringify(httpResponse)
										);
										util.msgbox2(
											4,
											"[body] " + JSON.stringify(body)
										);

										var contentType =
											"application/json; charset=UTF-8";
										var ret = {};
										var isSuccess = false;
										if (
											util.isUndefined(
												httpResponse["statusCode"]
											)
										) {
											if (
												httpResponse["statusCode"] ==
												200
											) {
												isSuccess = true;
												ret["result"] = "success";
												ret["error"] = "";
											}
										}
										
										// http 통신 결과에서 200이 아닌경우 실패로 간주하고 error내용을 return
										if (!isSuccess) {
											ret["result"] = "fail";
											ret["error"] = JSON.stringify(body);
										}

										util.writeWithContentType(
											ret,
											res,
											contentType
										);
									}
								);
							}

							//Delete file
							util.msgbox2(
								3,
								"### deleting file: " + outFilePath
							);
							fs.unlink(outFilePath, function (err) {
								try {
									if (err) {
									}
								} catch (e) {
								} finally {
									util.msgbox2(
										3,
										"### Deletied original file: " +
											outFilePath
									);
									fs.unlink(
										outFilePath + ".txt",
										function (err) {
											try {
												if (err) {
												}
											} catch (e) {
											} finally {
												util.msgbox2(
													3,
													"### Deletied Text file: " +
														outFilePath +
														".txt"
												);
											}
										}
									);
								}
							});
						}
					);
				});
			});

			req(requestOptions).pipe(fileStream);
		}
	} catch (error) {
		console.log("### childProcess.exec Error...:" + error.message);
		util.writeWithStatus(
			500,
			{ result: false, description: error.message },
			res
		);
	}

	util.msgbox2(2, "attachToElastic.js service : End");
};

// getToken
function getToken(downloadFileAbsolutePath, user_username, user_password) {
	util.msgbox2(2, "attachToElastic.js getToken : Start");
	var ret = "";
	var isSSo = false;
	if (!util.isUndefined(config.sso.use)) {
		// config.sso.use: true 인 경우
		if (config.sso.use) {
			isSSo = true;
		}
	}

	if (isSSo) {
		var ssoDomain = config.sso.sso_domain;
		var secretKey = config.sso.ltpa_domino_secret;
		var uid = config.sso.uid;

		var ssoparam = {};
		ssoparam[ssoDomain] = secretKey;
		ltpa.setSecrets(ssoparam);

		//세션 유지시간 설정 => inotes 설정만 할것이므로 짧게 설정함
		if (!util.isUndefined(config.sso.validTime)) {
			util.msgbox2(
				3,
				"사용자 inotes 설정을 위한 SSO 세션 유지시간(초)=>",
				config.sso.validTime
			);
			ltpa.setValidity(config.sso.validTime); //기본 30초 , 43200초 => 12시간,
		} else {
			//기본은 90분: 1시간 30분
		}

		//세션 유예시간 설정
		if (!util.isUndefined(config.sso.periodTime)) {
			util.msgbox2(
				3,
				"사용자 inotes 설정을 위한 SSO 세션 종료 후 일정 유예시간(초)=>",
				qObj.appConfig.usersso.periodTime
			);
			ltpa.setGracePeriod(config.sso.periodTime); //기본 0초, 43200 => 12시간,
		} else {
			//기본은 5분
		}

		util.msgbox2(2, "사용자 SSO 토큰 발행 for ", uid);
		let userNameBuf = ltpa.generateUserNameBuf(uid);
		let backendToken = ltpa.generate(userNameBuf, ssoDomain);
		let cookieText = config.sso.ltpaKey + "=" + backendToken;
		cookieText += "; language=ko; DWP_LANG=ko";
		ret = cookieText;
	} else {
		var requester = null;
		//var loginUrl = "http://dswg60.saerom.co.kr/names.nsf?Login&username=parking7&password=passw0rd";
		var loginUrl = downloadFileAbsolutePath + "/names.nsf?Login";
		loginUrl = loginUrl + "&username=" + user_username;
		loginUrl = loginUrl + "&password=" + user_password;

		if (loginUrl.toLowerCase().indexOf("https") == 0) {
			requester = https;
		} else {
			requester = http;
		}

		util.msgbox2(3, "loginUrl : ", loginUrl);
		requester
			.get(loginUrl, (response) => {
				// console.log(response.headers);
				for (var index in response.headers) {
					if (index.trim().toLowerCase() == "set-cookie") {
						var tmp = response.headers[index];
						if (typeof tmp == typeof []) {
							ret = tmp[0];
						} else {
							ret = tmp;
						}

						break;
					}
				}
			})
			.on("error", (e) => {
				console.error(e);
			});
	}

	util.msgbox2(2, "attachToElastic.js getToken : End");
	return ret;
}

String.prototype.getBytes = function () {
	const contents = this;
	let str_character;
	let int_char_count = 0;
	let int_contents_length = contents.length;

	for (k = 0; k < int_contents_length; k++) {
		str_character = contents.charAt(k);
		if (escape(str_character).length > 4) int_char_count += 2;
		else int_char_count++;
	}

	return int_char_count;
};

String.prototype.getStringFromByteLength = function (length) {
	const contents = this;
	let str_character;
	let int_char_count = 0;
	let int_contents_length = contents.length;

	let returnValue = "";

	for (k = 0; k < int_contents_length; k++) {
		str_character = contents.charAt(k);
		if (escape(str_character).length > 4) int_char_count += 2;
		else int_char_count++;

		if (int_char_count > length) {
			break;
		}
		returnValue += str_character;
	}
	return returnValue;
};

//===========================[String control Function]===================//
module.exports = { service };
