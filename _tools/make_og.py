"""공유 미리보기(OG) 이미지 생성 — images/og_qr.png (1200x630)

    python _tools/make_og.py

필요: Pillow, qrcode (pip install pillow qrcode), Windows 맑은 고딕 글꼴.
배지 문구는 화면·FAQ와 같은 사실만 쓴다 (_content/site.json 의 faq 참고).
"""
import os
from PIL import Image, ImageDraw, ImageFont
import qrcode

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "images", "og_qr.png")
FONT_DIR = "C:/Windows/Fonts/"

W, H = 1200, 630
TOP, BOTTOM = (26, 26, 46), (15, 52, 96)        # css/style.css 의 배경 그라데이션과 같은 색
TEAL = (17, 137, 125)                           # 사이트 강조색 #11897D
CARD = 300

TITLE = "무료 QR 코드 만들기"
SUBTITLE = "인터넷 주소 · WiFi · 전화번호 · 이메일"
PILLS = ["회원가입 없음", "유효기간 없음", "상업적 이용 가능"]


def font(face, size):
    return ImageFont.truetype(FONT_DIR + face, size)


def main():
    grad = Image.linear_gradient("L").resize((W, H))
    img = Image.composite(Image.new("RGB", (W, H), BOTTOM), Image.new("RGB", (W, H), TOP), grad)
    d = ImageDraw.Draw(img)

    card_x = W - CARD - 80
    max_w = card_x - 80 - 50

    def fit(text, face, size):
        while d.textlength(text, font=font(face, size)) > max_w:
            size -= 2
        return font(face, size)

    d.text((80, 140), TITLE, font=fit(TITLE, "malgunbd.ttf", 72), fill="white")
    d.text((82, 250), SUBTITLE, font=fit(SUBTITLE, "malgun.ttf", 34), fill=(220, 226, 240))

    size = 26
    while sum(d.textlength(s, font=font("malgunbd.ttf", size)) + 32 for s in PILLS) + 24 > max_w:
        size -= 1
    fs = font("malgunbd.ttf", size)
    x = 82
    for s in PILLS:
        w = d.textlength(s, font=fs) + 32
        d.rounded_rectangle((x, 330, x + w, 330 + size + 22), radius=(size + 22) // 2, fill=TEAL)
        d.text((x + 16, 338), s, font=fs, fill="white")
        x += w + 12

    d.text((82, 500), "qr.aply.biz", font=font("malgun.ttf", 32), fill=(200, 210, 230))
    d.text((82, 543), "APLY Inc.", font=font("malgun.ttf", 22), fill=(150, 160, 190))

    q = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=2)
    q.add_data("https://qr.aply.biz/")
    q.make(fit=True)
    qr_img = q.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((CARD - 36, CARD - 36), Image.NEAREST)

    card = Image.new("RGB", (CARD, CARD), "white")
    card.paste(qr_img, (18, 18))
    mask = Image.new("L", (CARD, CARD), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, CARD - 1, CARD - 1), radius=24, fill=255)
    img.paste(card, (card_x, (H - CARD) // 2), mask)

    img.save(OUT, optimize=True)
    print(OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
