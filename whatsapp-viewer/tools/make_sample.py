#!/usr/bin/env python3
"""Generate fake WhatsApp chat exports (.zip) to try the viewer without real data.

    python3 make_sample.py [out_dir] [--days 365] [--per-day 40]

Writes sample-iphone.zip (iPhone format: [d/m/y, h:m:s] ..., <attached: ...>)
and sample-android.zip (Android format: m/d/yy, h:mm PM - ..., "(file attached)").
Uses only the Python standard library; if ffmpeg is installed, a few videos and
voice notes are added too.
"""
import argparse, datetime as dt, os, random, shutil, struct, subprocess, tempfile, zipfile, zlib

WORDS = ("ok sure maybe tomorrow tonight coffee dinner movie work meeting late soon home train "
         "weekend beach rain sunny tired happy lol haha really wow nice cool great call later "
         "remember book song picture photo cat dog pizza sushi lunch gym run walk park").split()
HEBREW = ["מה שלומך?", "בוקר טוב ☀️", "אני בדרך", "נדבר אחר כך", "תודה רבה!", "יאללה, נתראה", "איזה כיף"]
EMOJI = ["😂", "❤️", "👍", "🙈", "🎉", "😴", "🍕", "☕"]


def png(path, w, h, seed):
    r = random.Random(seed)
    c1 = [r.randrange(256) for _ in range(3)]
    c2 = [r.randrange(256) for _ in range(3)]
    rows = bytearray()
    for y in range(h):
        rows.append(0)
        t = y / max(1, h - 1)
        px = bytes(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))
        rows += px * w
    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0))
                + chunk(b"IDAT", zlib.compress(bytes(rows), 6)) + chunk(b"IEND", b""))


def sentence(r):
    if r.random() < 0.08:
        return r.choice(HEBREW)
    s = " ".join(r.choice(WORDS) for _ in range(r.randint(1, 14)))
    if r.random() < 0.15:
        s += " " + r.choice(EMOJI)
    if r.random() < 0.03:
        s += "\nand another line\n*bold* _italic_ ~strike~"
    if r.random() < 0.01:
        s += " https://example.com/page?id=%d" % r.randrange(1000)
    return s[0].upper() + s[1:]


def generate(style, out_zip, days, per_day, ffmpeg):
    r = random.Random(42 if style == "iphone" else 7)
    people = ["Alex", "Noa Cohen"]
    tmp = tempfile.mkdtemp()
    lines, files = [], []
    start = dt.datetime(2025, 1, 1, 8, 0)
    n_img = n_vid = n_aud = 0

    def stamp(t):
        if style == "iphone":
            return "[%d/%d/%d, %02d:%02d:%02d]" % (t.day, t.month, t.year, t.hour, t.minute, t.second)
        h12 = t.hour % 12 or 12
        return "%d/%d/%02d, %d:%02d %s -" % (t.month, t.day, t.year % 100, h12, t.minute, "AM" if t.hour < 12 else "PM")

    if style == "iphone":
        lines.append("%s %s: ‎Messages and calls are end-to-end encrypted. Only people in this chat can read them." % (stamp(start), people[1]))
    else:
        lines.append("%s Messages and calls are end-to-end encrypted. No one outside of this chat can read them." % stamp(start))

    for d in range(days):
        day = start + dt.timedelta(days=d)
        if r.random() < 0.12:
            continue
        t = day.replace(hour=7) + dt.timedelta(minutes=r.randrange(120))
        for _ in range(max(1, int(r.gauss(per_day, per_day / 3)))):
            t += dt.timedelta(seconds=r.randrange(20, 1800))
            if t.date() != day.date():
                break
            who = people[r.random() < 0.5]
            roll = r.random()
            if roll < 0.04:
                n_img += 1
                name = ("%08d-PHOTO-%s.jpg" % (n_img, t.strftime("%Y-%m-%d-%H-%M-%S"))) if style == "iphone" \
                    else "IMG-%s-WA%04d.jpg" % (t.strftime("%Y%m%d"), n_img)
                name = name[:-4] + ".png"
                png(os.path.join(tmp, name), r.choice([320, 480, 240]), r.choice([320, 480, 640]), n_img)
                files.append(name)
                cap = ("\n" + sentence(r)) if r.random() < 0.3 else ""
                body = ("‎<attached: %s>" % name if style == "iphone" else "%s (file attached)" % name) + cap
            elif roll < 0.047 and ffmpeg:
                n_vid += 1
                name = "%08d-VIDEO-%s.mp4" % (n_vid, t.strftime("%Y-%m-%d-%H-%M-%S")) if style == "iphone" else "VID-%s-WA%04d.mp4" % (t.strftime("%Y%m%d"), n_vid)
                subprocess.run([ffmpeg, "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=320x240:rate=10:duration=2",
                                "-pix_fmt", "yuv420p", "-y", os.path.join(tmp, name)], check=True)
                files.append(name)
                body = "‎<attached: %s>" % name if style == "iphone" else "%s (file attached)" % name
            elif roll < 0.055 and ffmpeg:
                n_aud += 1
                name = "%08d-AUDIO-%s.opus" % (n_aud, t.strftime("%Y-%m-%d-%H-%M-%S")) if style == "iphone" else "PTT-%s-WA%04d.opus" % (t.strftime("%Y%m%d"), n_aud)
                subprocess.run([ffmpeg, "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=%d:duration=2" % r.randrange(300, 900),
                                "-c:a", "libopus", "-y", os.path.join(tmp, name)], check=True)
                files.append(name)
                body = "‎<attached: %s>" % name if style == "iphone" else "%s (file attached)" % name
            elif roll < 0.057:
                body = "‎image omitted" if style == "iphone" else "<Media omitted>"
            elif roll < 0.06:
                body = "‎This message was deleted." if style == "iphone" else "This message was deleted"
            elif roll < 0.065:
                body = sentence(r) + (" ‎<This message was edited>" if style == "iphone" else " <This message was edited>")
            else:
                body = sentence(r)
            lines.append("%s %s: %s" % (stamp(t), who, body))

    doc = "Trip plan.pdf"
    with open(os.path.join(tmp, doc), "wb") as f:
        f.write(b"%PDF-1.1\n% sample\n")
    files.append(doc)
    lines.append("%s %s: %s" % (stamp(t + dt.timedelta(minutes=1)), people[0],
                                "‎<attached: %s>" % doc if style == "iphone" else "%s (file attached)" % doc))

    chat_name = "_chat.txt" if style == "iphone" else "WhatsApp Chat with Noa Cohen.txt"
    with open(os.path.join(tmp, chat_name), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(os.path.join(tmp, chat_name), chat_name)
        for name in files:
            # Android stores media uncompressed; iPhone deflates everything. Exercise both paths.
            z.write(os.path.join(tmp, name), name, zipfile.ZIP_DEFLATED if style == "iphone" else zipfile.ZIP_STORED)
    shutil.rmtree(tmp)
    print("%s: %d messages, %d media files" % (out_zip, len(lines), len(files)))


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir", nargs="?", default=".")
    ap.add_argument("--days", type=int, default=365)
    ap.add_argument("--per-day", type=int, default=40)
    a = ap.parse_args()
    os.makedirs(a.out_dir, exist_ok=True)
    ff = shutil.which("ffmpeg")
    generate("iphone", os.path.join(a.out_dir, "WhatsApp Chat - Noa Cohen.zip"), a.days, a.per_day, ff)
    generate("android", os.path.join(a.out_dir, "sample-android.zip"), a.days, a.per_day, ff)
