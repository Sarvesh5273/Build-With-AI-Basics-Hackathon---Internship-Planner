"""Cuts the recorded live journey into a < 3 minute demo video.

Inputs (generated-artifacts/, ignored by git):
  demo/raw-footage.webm, demo/markers.json   from record-demo-footage.mjs
  demo-audio/line1.mp3, line2.mp3            learner-written narration (TTS)
  demo-audio/music.mp3                       instrumental bed
Output: generated-artifacts/demo/internship-planner-demo.mp4

Waiting periods (live search, source preparation) are shortened and labelled
on screen; nothing is re-ordered or staged.
"""
import json, subprocess, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[3] / 'generated-artifacts'
DEMO, AUDIO = ROOT / 'demo', ROOT / 'demo-audio'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

markers = json.loads((DEMO / 'markers.json').read_text())['markers']
def at(prefix):
    for m in markers:
        if m['label'].startswith(prefix):
            return m['at']
    raise SystemExit(f'missing marker: {prefix}')
def dur(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)]))

raw_end = dur(DEMO / 'raw-footage.webm')
taste, direction, prefs = at('Taste test intro'), at('Direction result'), at('Preferences')
search, results, elig = at('Live discovery started'), at('Discovery results'), at('Eligibility')
prepared, ready, result = at('Sources prepared'), at('Readiness interview'), at('Readiness result')
timetable, roadmap, end = at('Timetable'), at('Roadmap overview'), min(at('End') + 1.5, raw_end)

# (start, end, speed, label shown during the segment or None)
segments = [
    (taste, direction, 1.0, None),
    (direction, prefs, 1.0, None),
    (prefs, search + 5, 1.0, None),
    (results - 2, elig + 13, 1.0, 'Live search finished (wait shortened)'),
    (prepared - 2, ready, 1.0, 'Official sources read (wait shortened)'),
    (ready, min(result, ready + 20), 1.2, None),
    (result - 1, timetable, 1.0, 'Answers assessed (wait shortened)' if result - ready > 22 else None),
    (timetable, roadmap, 1.0, None),
    (roadmap, end, 1.0, None),
]
# Drop the label from the source-preparation cut if preparation was instant.
if prepared - (elig + 13) < 3:
    segments[4] = (elig + 13, ready, 1.0, None)

parts, labels, t = [], [], 0.0
for i, (s, e, speed, label) in enumerate(segments):
    if e <= s:
        continue
    parts.append(f'[0:v]trim={s:.2f}:{e:.2f},setpts=(PTS-STARTPTS)/{speed},fps=30,scale=1280:800,setsar=1[v{i}]')
    length = (e - s) / speed
    if label:
        labels.append((label, t, t + min(3.5, length)))
    t += length
ids = ''.join(f'[v{i}]' for i, (s, e, *_ ) in enumerate(segments) if e > s)
n = ids.count('[')
body_len = t
END_CARD = 4.0
total = body_len + END_CARD

(DEMO / 'cap1.txt').write_text("I didn't know where to look or what to search for,\nand on YouTube the information was scattered.")
(DEMO / 'cap2.txt').write_text("I didn't know about any website for abroad internships.")
(DEMO / 'end1.txt').write_text('Internship Planner')
(DEMO / 'end2.txt').write_text('Build With AI: Basics  ·  live sources, recorded end to end')
l1, l2 = dur(AUDIO / 'line1.mp3'), dur(AUDIO / 'line2.mp3')
v1, v2 = 0.6, 0.6 + l1 + 0.5

box = 'box=1:boxcolor=0x1d1d2b@0.86:boxborderw=18:fontcolor=white'
draw = [
    f"drawtext=fontfile={BOLD}:textfile={DEMO/'cap1.txt'}:fontsize=30:line_spacing=10:x=(w-text_w)/2:y=h-150:{box}:enable='between(t,{v1:.2f},{v1+l1+0.2:.2f})'",
    f"drawtext=fontfile={BOLD}:textfile={DEMO/'cap2.txt'}:fontsize=30:x=(w-text_w)/2:y=h-120:{box}:enable='between(t,{v2:.2f},{v2+l2+0.4:.2f})'",
]
for k, (label, a, b) in enumerate(labels):
    (DEMO / f'label{k}.txt').write_text(label)
    draw.append(f"drawtext=fontfile={BOLD}:textfile={DEMO/f'label{k}.txt'}:fontsize=22:x=w-text_w-36:y=h-70:box=1:boxcolor=0xdcf23c@0.95:boxborderw=12:fontcolor=0x1d1d2b:enable='between(t,{a:.2f},{b:.2f})'")

filt = ';'.join(parts) + f';{ids}concat=n={n}:v=1:a=0[body]'
filt += f';color=c=0xf6f1e3:s=1280x800:d={END_CARD}:r=30,setsar=1[card0]'
filt += (f";[card0]drawtext=fontfile={BOLD}:textfile={DEMO/'end1.txt'}:fontsize=64:fontcolor=0x1d1d2b:x=(w-text_w)/2:y=(h/2)-70,"
         f"drawtext=fontfile={FONT}:textfile={DEMO/'end2.txt'}:fontsize=26:fontcolor=0x1d1d2b:x=(w-text_w)/2:y=(h/2)+20[card]")
filt += f";[body][card]concat=n=2:v=1:a=0,{','.join(draw)},fade=t=in:st=0:d=0.4,fade=t=out:st={total-0.6:.2f}:d=0.6[v]"
# Audio: narration on top of a quiet music bed; bed dips while Raj speaks.
duck = f"volume='if(between(t,{v1-0.2:.2f},{v2+l2+0.3:.2f}),0.07,0.16)':eval=frame"
filt += (f';[1:a]adelay={int(v1*1000)}:all=1[n1];[2:a]adelay={int(v2*1000)}:all=1[n2]'
         f';[3:a]atrim=0:{total:.2f},{duck},afade=t=in:d=1,afade=t=out:st={total-2:.2f}:d=2[bed]'
         f';[n1][n2][bed]amix=inputs=3:normalize=0:duration=longest,atrim=0:{total:.2f},loudnorm=I=-16:TP=-1.5[a]')

out = DEMO / 'internship-planner-demo.mp4'
cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(DEMO / 'raw-footage.webm'), '-i', str(AUDIO / 'line1.mp3'),
       '-i', str(AUDIO / 'line2.mp3'), '-i', str(AUDIO / 'music.mp3'), '-filter_complex', filt,
       '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(out)]
subprocess.run(cmd, check=True)
print(json.dumps({'output': str(out), 'seconds': round(dur(out), 1), 'labels': labels}))
