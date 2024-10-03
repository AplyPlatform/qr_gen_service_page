const API_HANDLER = "https://aplx.link/qr/handler.php"

let isRecaptchaInit = false;

let qrCodeSmall;
let qrval_small_image_param = {
	width: 250,
	height: 250,
	image: null,
	type: "canvas",
	data: "",
	dotsOptions: {
		color: "#000000",
		type: "square"
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
		type: "square"
	},
	cornersDotOptions : {
		type: "square"
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
		type: "square"
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
		type: "square"
	},
	cornersDotOptions : {
		type: "square"
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
	if(isSet(ssid) == false || ssid == "") {		
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
		showDialog("올바른 정보를 입력해 주세요.");
		return;
	}

	GA_EVENT("genQRClick", "service", qr_code_url);

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

			showDialog("QR코드가 생성되었습니다.<br>스마트폰으로 촬영하여 동작을 확인해 보세요!");
			hideLoader();			
			$('html, body').animate({
				scrollTop: $("#resultArea").offset().top
			}, 500, 'easeInOutExpo');
			
		},
		error : function() {
			showDialog("QR코드가 생성에 실패하였습니다. 잠시 후 다시 시도해 주세요.");
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
		$("#form_input_label").text("인터넷 주소 입력");
		return;
	}
	else if (kindStr == "wifi") {
		$("#normal_input_area").hide();
		$("#wifi_input_area").show();
		return;
	}
	else if ($("#form_kind option:checked").val() == "url") $("#form_data").attr("placeHolder", "http://");
	else if ($("#form_kind option:checked").val() == "email") $("#form_data").attr("placeHolder", "@");
	else if ($("#form_kind option:checked").val() == "tel") $("#form_data").attr("placeHolder", "000-000-0000");

	$("#form_input_label").text($("#form_kind option:checked").text() + " 입력");
}

const initQRCode = () => {
	showLoader();

	grecaptcha.ready(function () {
		isRecaptchaInit = true;			
	});	

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

	$(".qrDownloadButton").click(function () {    
		let form_image_kind = $(this).attr("id_val");
		//qrCodeSmall.download({ name: "QR", extension: form_image_kind });
		qrCodeBig.download({ name: "QR", extension: form_image_kind });
	});

	$("#form_qr_shape").change(function() { 
	  let param = {
		dotsOptions : {type : this.value},
		cornersSquareOptions : {type : this.value},
		cornersDotOptions : {type : this.value}
	  };    
	  
	  let cdoOption = "square";
	  if (this.value == "dots") cdoOption = "dot";
	  else cdoOption = this.value;
	  
	  param.cornersSquareOptions.type = cdoOption;
	  
	  if (this.value == "extra_rounded") cdoOption = "dot";
	  param.cornersDotOptions.type = cdoOption;
  	  
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
	  $("#form_qr_shape").val("square").prop("selected", true);	  
	  qrCodeSmall.update(qrval_small_image_param);
	  qrCodeBig.update(qrval_big_image_param);
	});

	$("#printButton").click(function() {
		GA_EVENT("printButton", "service", "service");
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
			showDialog("개인정보 처리방침에 동의해주세요.");			
			return false;
		}

		let genStr = "";
		let kind = $("#form_kind option:checked").val();

		if (kind == "wifi") {
			genStr = generateWIFIData();
			if (genStr == "") {
				showDialog("올바른 WiFi 정보를 입력해 주세요.");
				return;
			}	
		}
		else {
			genStr = generateQRData();
			if (genStr == "") {
				showDialog("올바른 " + $("#form_kind option:checked").text() + "을(를) 입력해 주세요.");
				return;
			}
		}
		
		saveQRdata(kind, genStr);
	});

	setSubmitHandler("email_up");
	goToTop();

	const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    let qr_action = urlParams.get('kind');
	let qr_id = urlParams.get('id');

	if (isSet(qr_id)) {
		reqQRIDdata(qr_id);
	}
	else if (isSet(qr_action)) {
		$("#form_kind").val(qr_action).prop("selected", true);
		setQRKindArea(qr_action);
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
	
  }

  function setSecretCodeBtn(qr_id) {	
	$("#secretCodeButton").attr("data-clipboard-text", qr_id);	

	let copyDevToken = new ClipboardJS('#secretCodeButton');
    copyDevToken.on('success', function(e) {
        GA_EVENT("successfully_sec_code_copied", "service", "click");
        showDialog("고유 코드를 클립보드에 복사하였습니다.");
        e.clearSelection();
    });

    copyDevToken.on('error', function(e) {
        GA_EVENT("failed_sec_code_copy", "service", "click");
        showDialog("죄송합니다, 일시적인 오류가 발생하였습니다. 다시 시도 부탁드립니다.");
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
				showDialog("QR 코드 정보를 성공적으로 불러왔습니다.");
			}
			else {
				showDialog("존재하지 않는 고유 코드입니다.");
			}

			hideLoader();			
		},
		error : function() {
			hideLoader();
			showDialog("오류가 발생하였습니다. 잠시 후 다시 사용해 주세요.");
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
		return "tel:" + $("#form_data").val();
	}
  }

  (function($) {
	initQRCode();	
})(jQuery);


function setSubmitHandler(form_p_id) {
	var form_id = "#" + form_p_id;

	$(form_id + "_send").on("click", function(e) {
		e.preventDefault();

		if (appSent == true) {
			if (confirm('이미 전송한 내용이 있습니다. 다시 진행 하시겠습니까?')) {	}
			else {
			  return;
			}
		}

		showLoader();

		sendApplicationData(form_id);				
	});

	$('[name^=form_phone]').keypress(validateNumber);
}

var appSent = false;
function sendApplicationData(form_id, token)
{
	let min_type = "";
	if ($(form_id).find('input[name="min_type_1"]').is(":checked")) {
		min_type = "/서비스문의";
	}

	if ($(form_id).find('input[name="min_type_2"]').is(":checked")) {
		min_type = min_type + "/제휴및광고";
	}

	if ($(form_id).find('input[name="min_type_3"]').is(":checked")) {
		min_type = min_type + "/SW개발";
	}

	if ($(form_id).find('input[name="min_type_4"]').is(":checked")) {
		min_type = min_type + "/기타문의";
	}

	if (min_type == "") {
		showDialog("문의 종류를 선택해 주세요.");
		hideLoader();
		return false;
	}

	let form_content = $("#form_content").val();
	if (form_content == "") {
		showDialog("문의 내용을 입력해 주세요.");
		hideLoader();
		return false;
	}

	let form_phone = $(form_id).find('input[name="form_phone"]').val();
	if (form_phone == "") {
		showDialog("전화번호를 입력해 주세요.");
		hideLoader();
		return false;
	}

	let form_email = $(form_id).find('input[name="form_email"]').val();
	if (form_email == "") {
		showDialog("이메일을 입력해 주세요.");
		hideLoader();
		return false;
	}

	if ($(form_id).find("#agree_1").length > 0 && $(form_id).find("#agree_1").is(":checked") == false) {
		showDialog("개인정보 처리방침에 동의해주세요.");
		hideLoader();
		return false;
	}	
	
	let ref = $('<input type="hidden" value="' + document.referrer + '" name="ref">');	
	$(form_id).append(ref);	
	ref = $('<input type="hidden" value="' + min_type + '" name="min_type">');	
	$(form_id).append(ref);	
	ref = $('<input type="hidden" value="qrcontact" name="form_kind">');	
	$(form_id).append(ref);

	if (isRecaptchaInit == false) {
		grecaptcha.ready(function() {
			isRecaptchaInit = true;

			grecaptcha.execute('6LfPn_UUAAAAAN-EHnm2kRY9dUT8aTvIcfrvxGy7', {action: 'homepage'}).then(function(token) {
				$(form_id).find('input[name="form_token"]').val(token);
				let fed = new FormData($(form_id)[0]);
				ajaxRequestForContact(form_id, fed);
			});
		});
	}
	else {
		grecaptcha.execute('6LfPn_UUAAAAAN-EHnm2kRY9dUT8aTvIcfrvxGy7', {action: 'homepage'}).then(function(token) {
			$(form_id).find('input[name="form_token"]').val(token);
			let fed = new FormData($(form_id)[0]);
			ajaxRequestForContact(form_id, fed);
		});
	}	
}

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

	if (isRecaptchaInit == false) {
		grecaptcha.ready(function() {
			isRecaptchaInit = true;

			grecaptcha.execute('6LfPn_UUAAAAAN-EHnm2kRY9dUT8aTvIcfrvxGy7', {action: 'homepage'}).then(function(token) {
				cData.data.append("form_token", token);	
				callData["data"] = cData.data;
				realCallApi(callData);
			});
		});
	}
	else {
		grecaptcha.execute('6LfPn_UUAAAAAN-EHnm2kRY9dUT8aTvIcfrvxGy7', {action: 'homepage'}).then(function(token) {
				cData.data.append("form_token", token);
				callData["data"] = cData.data;
				realCallApi(callData);
		});
	}    	
}

function realCallApi(data) {
	$.ajax(data);
}

function validateNumber(event) {
    var key = window.event ? event.keyCode : event.which;
    if (event.keyCode === 8 || event.keyCode === 46) {
        return true;
    } else if ( key < 48 || key > 57 ) {
        return false;
    } else {
        return true;
    }
}

function ajaxRequestForContact(form_id, fed) {
	$.ajax({
		type: "POST",
		url: 'https://aply.biz/contact/handler.php',
		crossDomain: true,
		dataType: "json",
		data:fed,
		enctype: 'multipart/form-data', // 필수
		processData: false,
		contentType: false,
		cache: false,
		success: function (data) {
			hideLoader();
			if (data.result == "success") {
				$(form_id + " input").last().remove();
				showDialog("전송이 완료되었습니다. APLY가 연락 드리겠습니다.", function() {
					location.href="/index.html";
				});
				return;
			}
			else {				
				showDialog("오류가 발생하였습니다. 잠시 후 다시 시도해 주세요.");
				return;
			}
		},
		error: function(jqXHR, text, error){
			showDialog("죄송합니다, 일시적인 오류가 발생하였습니다. 다시 시도 부탁드립니다.");
			hideLoader();
		}
	});
}

function GA_EVENT(event_name, category, label = "") {    
    gtag(
        'event', event_name, {
        'event_category': category,
        'event_label': label        
    }
    );
}

function showDialog(msg, callback = null) {
	$('#askModalContent').html(msg);
	$('#askModal').modal('show');

	if (callback == null) return;

	$('#askModalOKButton').off('click');
	$('#askModalOKButton').click(function () {
			$('#askModal').modal('hide');
			callback();
	});
}


function isSet(value) {
    if (typeof (value) === 'number')
        return true;
    if (value == "" || value == null || value == "undefined" || value == undefined)
        return false;
    return true;
}

function showPrivacyForContactDialog() {	
	$('#modal_title_content').text("APLY 개인정보처리방침");
    $('#modal_body_content').load("privacy_for_email.html");
    $('#modal-3').modal('show');
}

function showPrivacyDialog() {	
	$('#modal_title_content').text("APLY 개인정보처리방침");
    $('#modal_body_content').load("privacy.html");
    $('#modal-3').modal('show');
}
