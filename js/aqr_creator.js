const API_HANDLER = "https://aplx.link/qr/handler.php"

let qrCodeSmall;
let qrval_small_image_param = {
	width: 250,
	height: 250,
	image: null,
	type: "canvas",
	data: "",
	dotsOptions: {
		color: "#158b7e",
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
		errorCorrectionLevel: "Q"   
	},
	cornersSquareOptions : {
		type: "extra-rounded"
	},
	cornersDotOptions : {
		type: "dot"
	}
};


let qrCodeBig;
let qrval_big_image_param = {
	width: 2048,
	height: 2048,
	image: null,
	type: "canvas",
	data: "",
	dotsOptions: {
		color: "#158b7e",
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
		errorCorrectionLevel: "Q"   
	},
	cornersSquareOptions : {
		type: "extra-rounded"
	},
	cornersDotOptions : {
		type: "dot"
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

function checkIsExistProperty(data, field) {
    if (data == null) return false;
    if (!data.hasOwnProperty(field)) return false;
    if (data[field] == null) return false;

    return true;
}

const genQRCode = () => {
	let qr_code_url = $("#form_data").val();
	if (qr_code_url.length < 10) return;

	let customColor = $("#form_custom_shape").val();
	let value = "#158b7e";
	if (customColor == "green") { 
		value = "#158b7e";
	}
	else if (customColor == "white") {
		value = "#ffffff";
	}
	else if (customColor == "pink") {
		value = "#f69388";
	}

	qrCodeSmall.update({data : qr_code_url, dotsOptions : {color : value}});
	qrCodeBig.update({data : qr_code_url, dotsOptions : {color : value}});
	$("#resultArea").show();
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

	$("#form_data").on("change keyup paste", function() {		
		genQRCode();
	});

	$("#form_custom_shape").change(function() {		
		genQRCode();
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
	  
	  let cdoOption = "square";
	  if (this.value == "dots") cdoOption = "dot";
	  else cdoOption = this.value;
	  
	  param.cornersSquareOptions.type = cdoOption;
	  
	  if (this.value == "extra-rounded") cdoOption = "dot";
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
	
	goToTop();
	
	hideLoader();
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
	
	if (isValidUrl(val) == false) return "";
	return val;	
  }

  (function($) {
	initQRCode();	
})(jQuery);
