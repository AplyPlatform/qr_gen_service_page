const API_HANDLER = "https://aplx.link/qr/handler.php"

let qrCodeSmall;
let qrval_small_image_param = {
	width: 250,
	height: 250,
	image: null,
	type: "canvas",
	data: "",
	dotsOptions: {
		color: "#000000",
		type: "extra-rounded"
	},
	backgroundOptions: {
		color: "#ffffff",
	},
	imageOptions: {
		crossOrigin: "anonymous",        
		imageSize : 0.4,
		margin: 0,
		hideBackgroundDots : true
	},
	qrOptions: {
		errorCorrectionLevel: "L"   
	},
	cornersSquareOptions : {
		type: "extra-rounded"
	},
	cornersDotOptions : {
		type: "extra-rounded"
	}
};


let qrCodeBig;
let qrval_big_image_param = {
	width: 640,
	height: 640,
	image: null,
	type: "canvas",
	data: "",
	dotsOptions: {
		color: "#000000",
		type: "extra-rounded"
	},
	backgroundOptions: {
		color: "#ffffff",
	},
	imageOptions: {
		crossOrigin: "anonymous",        
		imageSize : 0.4,
		margin: 0,
		hideBackgroundDots : true
	},
	qrOptions: {
		errorCorrectionLevel: "L"   
	},
	cornersSquareOptions : {
		type: "extra-rounded"
	},
	cornersDotOptions : {
		type: "extra-rounded"
	}
};

var goToTop = function() {
	$('.js-gotop').on('click', function(event){
		event.preventDefault();

		$('html, body').animate({
			scrollTop: $('html').offset().top
		}, 500, 'easeInOutExpo');

		return false;
	});

	$(window).scroll(function(){
		var $win = $(window);
		if ($win.scrollTop() > 200) {
			$('.js-top').addClass('active');
		} else {
			$('.js-top').removeClass('active');
		}

	});
};

function showLoader() {
	$("#loading").show();
}

function hideLoader() {
	$("#loading").fadeOut(800);
}

function escape_string(string) {
	let to_escape = [';', ':'];	
	let output = "";
	for (var i=0; i<string.length; i++) {
		if($.inArray(string[i], to_escape) != -1) {
			output += '\\'+string[i];
		}
		else {
			output += string[i];
		}
	}		
	return output;
}

var utf8_encode = function (s) {
	return unescape(encodeURIComponent(s));
};

function generateWIFIData() {
	let ssid = $('#form_ssid').val();
	if(AAPI_isSet(ssid) == false || ssid == "") {		
		return "";
	}	

	let hidden = true; //$('#form_hidden').is(':checked');
	let enc = $('#form_enc').val();	
	let key = "";
	if (enc != 'nopass') {
		key = $('#form_password').val();		
	}

	var qrstring = 'WIFI:S:'+escape_string(utf8_encode(ssid))+';T:'+enc+';P:'+escape_string(key)+';';
	if (hidden) {
		qrstring += 'H:true';
	}
	qrstring += ';';
	return qrstring;
}

function checkIsExistProperty(data, field) {
    if (data == null) return false;
    if (!data.hasOwnProperty(field)) return false;
    if (data[field] == null) return false;

    return true;
}

const genQRCode = (qr_code_url) => {
	if (qr_code_url == "") {
		AAPI_showDialog("올바른 정보를 입력해 주세요.");
		return;
	}	

	qrCodeSmall.update({data : qr_code_url});
	qrCodeBig.update({data : qr_code_url});
	$("#resultArea").show();
}

function saveQRdata(kind, genStr) {
	showLoader();
	
	let fd = new FormData();
    fd.append("act", "set");
    fd.append("kind", kind);	
	fd.append("val", $("#form_data").val());
	fd.append("ssid", $("#form_ssid").val());
	fd.append("password", $("#form_password").val());
	fd.append("hidden", $('#form_hidden').is(':checked') ? "Y" : "N");
	fd.append("enc", $('#form_enc').val());
	fd.append("ref", document.referrer);

	callApi({
		data : fd,
		success : function(data) {
			genQRCode(genStr);

			if (checkIsExistProperty(data, "data") && checkIsExistProperty(data.data, "qr_id")) setSecretCodeBtn(data.data.qr_id);

			$("#form_kind").prop('disabled',true);
			$("#form_data").prop('disabled',true);
			$("#form_ssid").prop('disabled',true);
			$("#form_enc").prop('disabled',true);
			$("#form_password").prop('disabled',true);
			$("#warn_area").hide();
			$("#qr_button_area").hide();
			$("#checkUniqueCodeArea").hide();
			$("#new_make_qr_button_area").show();

			$("#newQRButton").click(function() {
				AAPI_GA_EVENT("newQRButton_click", "service", "click");
				location.href = "https://qr.aply.biz";
			});

			AAPI_showDialog("QR코드가 생성되었습니다.<br>스마트폰으로 촬영하여 동작을 확인해 보세요!");
			hideLoader();			
			$('html, body').animate({
				scrollTop: $("#resultArea").offset().top
			}, 500, 'easeInOutExpo');
			
		},
		error : function() {
			AAPI_showDialog("QR코드가 생성에 실패하였습니다. 잠시 후 다시 시도해 주세요.");
			hideLoader();			
		}
	});
}

const setQRKindArea = (kindStr) => {
	$("#normal_input_area").show();
	$("#wifi_input_area").hide();
	$("#resultArea").hide();
	$("#applyQRButton").show();
	$("#form_data").val("");
	$("#form_ssid").val("");
	$("#form_password").val("");
	$("#form_enc").val("WPA").prop("selected", true);
	$('#form_hidden').prop('checked',false);

	if (kindStr == "aqr") {
		window.open("https://aplx.link/register", "_blank");
		$("#form_kind").val("url").prop("selected", true);
		$("#form_input_label").text("인터넷 주소");
		return;
	}
	else if (kindStr == "wifi") {
		$("#normal_input_area").hide();
		$("#wifi_input_area").show();
		$("#form_data").prop("type", "text");
		return;
	}
	else if ($("#form_kind option:checked").val() == "url") {
		$("#form_data").prop("type", "url");
		$("#form_data").attr("placeHolder", "http://");
	}
	else if ($("#form_kind option:checked").val() == "email") {
		$("#form_data").prop("type", "email");
		$("#form_data").attr("placeHolder", "@");
	}
	else if ($("#form_kind option:checked").val() == "tel") {
		$("#form_data").prop("type", "tel");
		$("#form_data").attr("placeHolder", "'-' 없이 번호만 입력하세요");
	} 

	$("#form_input_label").text($("#form_kind option:checked").text());
}

const initQRCode = () => {
	showLoader();

	qrCodeSmall = new QRCodeStyling(qrval_small_image_param);	
	qrCodeSmall.append(document.getElementById("qr_sm_image_1"));

	qrCodeBig = new QRCodeStyling(qrval_big_image_param);	
	qrCodeBig.append(document.getElementById("qr_big_image_1"));
	
	let colorInputfg = document.querySelector('#color_fg');
	colorInputfg.addEventListener('input', () =>{	  
	  qrCodeSmall.update({dotsOptions : {color : colorInputfg.value}});
	  qrCodeBig.update({dotsOptions : {color : colorInputfg.value}});
	});
  
	let colorInputbg = document.querySelector('#color_bg');
	colorInputbg.addEventListener('input', () =>{
	  qrCodeSmall.update({backgroundOptions : {color : colorInputbg.value}});
	  qrCodeBig.update({backgroundOptions : {color : colorInputbg.value}});
	});

	$("#getQRButton").click(function() {
		let uniq_code = $("#form_uniq_code").val();
		if (uniq_code == "" || uniq_code.length > 10) {
			AAPI_showDialog("올바른 고유 코드를 입력해 주세요.");
			return;
		}

		AAPI_GA_EVENT("check_uniq_code", "service", uniq_code);
		reqQRIDdata(uniq_code);
	});

	$(".qrDownloadButton").click(function () {    
		let form_image_kind = $(this).attr("id_val");
		qrCodeBig.download({ name: "QR", extension: form_image_kind });

		$(".qrDownloadButton").hide();
		showLoader();
		setTimeout(() => {
		  $(".qrDownloadButton").show();
		  hideLoader();
		}, 5000);
	});

	$("#form_qr_shape").change(function() { 
	  let param = {
		dotsOptions : {type : this.value},
		cornersSquareOptions : {type : this.value},
		cornersDotOptions : {type : this.value}
	  };
  	  
	  qrCodeSmall.update(param);
	  qrCodeBig.update(param);
	});
  
	$("#qr_image_input").change(function(e){
	  var reader = new FileReader();
	  reader.readAsDataURL($('#qr_image_input')[0].files[0]);
	  reader.onload = function () {
		qrCodeSmall.update({image:reader.result});
		qrCodeBig.update({image:reader.result});
		$("#qr_image_input").hide();
		$("#cancelImageButton").show();
	  };
	  reader.onerror = function (error) {
		console.log('Error: ', error);
		$("#cancelImageButton").hide();
	  };
	});
  
	$("#cancelImageButton").click(function() {	  
	  qrCodeSmall.update({image:null});
	  qrCodeBig.update({image:null});
	  $("#qr_image_input").val("");
	  $("#qr_image_input").show();
	  $("#cancelImageButton").hide();
	});
  
	$("#resetButton").click(function() {
	  $("#form_url_data").val("");
	  $("#qr_image_input").val("");
	  $("#qr_image_input").show();
	  $("#cancelImageButton").hide();
	  $("#color_fg").val("#000000");
	  $("#color_bg").val("#ffffff");
	  $("#form_qr_shape").val("extra-rounded").prop("selected", true);
	  qrCodeSmall.update(qrval_small_image_param);
	  qrCodeBig.update(qrval_big_image_param);
	});

	$("#printButton").click(function() {
		AAPI_GA_EVENT("printButton", "service", "service");
		$("#printButton").hide();
		showLoader();
		$('#qr_code_image_area').printThis({
		  importCSS: false,
		  header: ""
		});
	
		setTimeout(() => {
		  $("#printButton").show();
		  hideLoader();
		}, 5000);
		return false;
	});

	$("#applyQRButton").click(function() {

		if ($("#agree_privacy").is(":checked") == false) {
			AAPI_showDialog("개인정보 처리방침에 동의해주세요.");			
			return false;
		}

		let genStr = "";
		let kind = $("#form_kind option:checked").val();

		if (kind == "wifi") {
			genStr = generateWIFIData();
			if (genStr == "") {
				AAPI_showDialog("올바른 WiFi 정보를 입력해 주세요.");
				return;
			}	
		}
		else {
			genStr = generateQRData();
			if (genStr == "") {
				AAPI_showDialog("올바른 " + $("#form_kind option:checked").text() + "을(를) 입력해 주세요.");
				return;
			}
		}
		
		AAPI_GA_EVENT("genQRClick", "service", genStr);
		saveQRdata(kind, genStr);
	});

	AAPI_setContactForm("qrcontact");
	goToTop();

	const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let qr_action = urlParams.get('kind');
	let qr_id = urlParams.get('id');

	if (AAPI_isSet(qr_id)) {
		reqQRIDdata(qr_id);
	}
	else if (AAPI_isSet(qr_action)) {
		$("#form_kind").val(qr_action).prop("selected", true);
		setQRKindArea(qr_action);
		hideLoader();
	}
	else {
		hideLoader();
	}

	$("#form_kind").change(function() {
		setQRKindArea($("#form_kind option:checked").val());
	});	
  }

  function setQRData(qr_id, data) {
	setQRKindArea(data.kind);

	$("#form_kind").val(data.kind).prop("selected", true);

	let qrData = "";
	switch(data.kind) {
		case "url":			
		case "tel":
		case "email":			
			$("#form_data").val(data.val);
			qrData = generateQRData();
			break;

		case "wifi":
			$("#form_ssid").val(data.ssid);
			$("#form_password").val(data.password);
			$("#form_enc").val(data.enc).prop("selected", true);
			if (data.hidden == "Y") $('#form_hidden').prop('checked',true);
			qrData = generateWIFIData();
			break;		
	}		

	setSecretCodeBtn(qr_id);
	genQRCode(qrData);
	
	$("#form_kind").prop('disabled',true);
	$("#form_data").prop('disabled',true);
	$("#form_ssid").prop('disabled',true);
	$("#form_enc").prop('disabled',true);
	$("#form_password").prop('disabled',true);
	$("#warn_area").hide();
	$("#qr_button_area").hide();
	$("#new_make_qr_button_area").show();

	$("#newQRButton").click(function() {
		AAPI_GA_EVENT("newQRButton_click", "service", "click");
		location.href = "https://qr.aply.biz";
	});
  }

  function setSecretCodeBtn(qr_id) {	
	$("#secretCodeButton").attr("data-clipboard-text", qr_id);	

	let copyDevToken = new ClipboardJS('#secretCodeButton');
    copyDevToken.on('success', function(e) {
        AAPI_GA_EVENT("successfully_sec_code_copied", "service", "click");
        AAPI_showDialog("고유 코드를 클립보드에 복사하였습니다.");
        e.clearSelection();
    });

    copyDevToken.on('error', function(e) {
        AAPI_GA_EVENT("failed_sec_code_copy", "service", "click");
        AAPI_showDialog("죄송합니다, 일시적인 오류가 발생하였습니다. 다시 시도 부탁드립니다.");
    });
  }

  function reqQRIDdata(qr_id) {
	let fd = new FormData();
    fd.append("act", "get");
    fd.append("qr_id", qr_id);
	fd.append("ref", document.referrer);

	callApi({
		data : fd,
		success : function(data) {
			if (checkIsExistProperty(data, "data")) {
				setQRData(qr_id, data.data);
				AAPI_showDialog("QR 코드 정보를 성공적으로 불러왔습니다.");
				$("#checkUniqueCodeArea").hide();
			}
			else {
				AAPI_showDialog("존재하지 않는 고유 코드입니다.");
			}

			hideLoader();			
		},
		error : function() {
			hideLoader();
			AAPI_showDialog("오류가 발생하였습니다. 잠시 후 다시 사용해 주세요.");
		}
	});	
  }

  function ValidateEmail(emailValue)
  {
	var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
	if(emailValue.match(mailformat)) return true;	
	return false;	
  }

  function isValidUrl(string) {
	try {
	  new URL(string);
	  return true;
	} catch (err) {
	  return false;
	}
  }

  function generateQRData() {
	let val = $("#form_data").val();
	if (val == "") return "";

	if ($("#form_kind option:checked").val() == "aqr") {
		window.open("https://aplx.link/register", "_blank");
		return "";
	}	
	else if ($("#form_kind option:checked").val() == "url") {
		if (isValidUrl(val) == false) return "";
		return val;
	}
	else if ($("#form_kind option:checked").val() == "email") {		
		if (ValidateEmail(val) == false) return "";
		return val;
	}
	else if ($("#form_kind option:checked").val() == "tel") {
		if ($("#form_data").val().indexOf("-") > -1) return "";		
		let phonnumber = $("#form_data").val().replace(/-/g, "");
		return "tel:" + phonnumber;
	}
  }

  (function($) {
	initQRCode();	
})(jQuery);

function callApi(cData) {
	let jSuccessCallback = cData.success;
    let jErrorCallback = cData.error;

    let callData = {
        url: API_HANDLER,
        type: "POST",		
        dataType: "json",  			
        enctype: 'multipart/form-data',
		processData: false,
		cache: false,
		contentType: false,
        success: function(response) {
            jSuccessCallback(response);    				
        },
        error: function(xhr) {
            jErrorCallback(JSON.stringify(xhr));
        }
    };

	AAPI_getCaptchaToken(function(token) {
		cData.data.append("form_token", token);	
		callData["data"] = cData.data;
		$.ajax(callData);
	});
}

function showPrivacyDialog() {
	$('#contact_privacy_body_content').load("privacy.html");
    $('#contactPrivacyDialog').modal({"show" : true});
}
