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
spans = []  # (src_start, src_end, out_start, speed)
for i, (s, e, speed, label) in enumerate(segments):
    if e <= s:
        continue
    spans.append((s, e, t, speed))
    parts.append(f'[0:v]trim={s:.2f}:{e:.2f},setpts=(PTS-STARTPTS)/{speed},fps=30,scale=1280:800,setsar=1[v{i}]')
    length = (e - s) / speed
    if label:
        labels.append((label, t, t + min(3.5, length)))
    t += length
ids = ''.join(f'[v{i}]' for i, (s, e, *_ ) in enumerate(segments) if e > s)
n = ids.count('[')
body_len = t
END_CARD = 6.0
total = body_len + END_CARD

def out_time(src):
    """Output-timeline position of a raw-footage timestamp (must lie in a kept span)."""
    for a, b, o, speed in spans:
        if a <= src <= b:
            return o + (src - a) / speed
    raise SystemExit(f'source time {src} was cut')

import textwrap
narration_text = json.loads((AUDIO / 'narration.json').read_text())
# (audio file, output start). Each line is placed on the screen it describes.
cues = [
    ('line1', 0.6), ('line2', 0.6 + dur(AUDIO / 'line1.mp3') + 0.5),
    ('n_pitch', 9.6),
    ('n_prefs', out_time(prefs + 4)),
    ('n_sources', out_time(results + 0.5)),
    ('n_choose', out_time(at('Selected Research') - 1.5)),
    ('n_elig', out_time(elig + 0.8)),
    ('n_ready', out_time(ready + 0.6)),
    ('n_time', out_time(timetable + 0.4)),
    ('n_road', out_time(roadmap + 0.6)),
    ('n_week', out_time(at('Research timeline') + 0.8)),
    ('n_close', body_len + 0.6),
]
captions = {'line1': "I didn't know where to look or what to search for, and on YouTube the information was scattered.",
            'line2': "I didn't know about any website for abroad internships.", **narration_text}
voice = []
for k, (name, start) in enumerate(cues):
    length = dur(AUDIO / f'{name}.mp3')
    if k and start < voice[-1][2] + 0.3:
        start = voice[-1][2] + 0.3  # never overlap two lines
    voice.append((name, start, start + length))

(DEMO / 'end1.txt').write_text('Internship Planner')
(DEMO / 'end2.txt').write_text('Build With AI: Basics  ·  live sources, recorded end to end')
box = 'box=1:boxcolor=0x1d1d2b@0.86:boxborderw=16:fontcolor=white'
draw = []
for name, a, b in voice:
    if name == 'n_close':
        continue  # spoken over the end card, shown there instead
    (DEMO / f'cap_{name}.txt').write_text('\n'.join(textwrap.wrap(captions[name], 62)))
    draw.append(f"drawtext=fontfile={BOLD}:textfile={DEMO/f'cap_{name}.txt'}:fontsize=27:line_spacing=9:x=(w-text_w)/2:y=h-text_h-110:{box}:enable='between(t,{a:.2f},{b+0.25:.2f})'")
(DEMO / 'end3.txt').write_text('"' + captions['n_close'] + '"')
for k, (label, a, b) in enumerate(labels):
    (DEMO / f'label{k}.txt').write_text(label)
    draw.append(f"drawtext=fontfile={BOLD}:textfile={DEMO/f'label{k}.txt'}:fontsize=22:x=w-text_w-36:y=h-70:box=1:boxcolor=0xdcf23c@0.95:boxborderw=12:fontcolor=0x1d1d2b:enable='between(t,{a:.2f},{b:.2f})'")

filt = ';'.join(parts) + f';{ids}concat=n={n}:v=1:a=0[body]'
filt += f';color=c=0xf6f1e3:s=1280x800:d={END_CARD}:r=30,setsar=1[card0]'
filt += (f";[card0]drawtext=fontfile={BOLD}:textfile={DEMO/'end1.txt'}:fontsize=64:fontcolor=0x1d1d2b:x=(w-text_w)/2:y=(h/2)-70,"
         f"drawtext=fontfile={FONT}:textfile={DEMO/'end2.txt'}:fontsize=26:fontcolor=0x1d1d2b:x=(w-text_w)/2:y=(h/2)+20,"
         f"drawtext=fontfile={FONT}:textfile={DEMO/'end3.txt'}:fontsize=24:fontcolor=0x55556a:x=(w-text_w)/2:y=(h/2)+90[card]")
filt += f";[body][card]concat=n=2:v=1:a=0,{','.join(draw)},fade=t=in:st=0:d=0.4,fade=t=out:st={total-0.6:.2f}:d=0.6[v]"
# Audio: every narration line on a quiet music bed that dips while Raj speaks.
speaking = '+'.join(f'between(t,{a-0.2:.2f},{b+0.3:.2f})' for _, a, b in voice)
filt += ''.join(f';[{i+4}:a]adelay={int(a*1000)}:all=1[n{i}]' for i, (_, a, _b) in enumerate(voice))
filt += (f";[3:a]atrim=0:{total:.2f},volume='if({speaking},0.05,0.12)':eval=frame,afade=t=in:d=1,afade=t=out:st={total-2:.2f}:d=2[bed]"
         f";{''.join(f'[n{i}]' for i in range(len(voice)))}[bed]amix=inputs={len(voice)+1}:normalize=0:duration=longest,atrim=0:{total:.2f},loudnorm=I=-16:TP=-1.5[a]")
out = DEMO / 'internship-planner-demo.mp4'
cmd = ['ffmpeg', '-v', 'error', '-y', '-i', str(DEMO / 'raw-footage.webm'), '-i', str(AUDIO / 'line1.mp3'),
       '-i', str(AUDIO / 'line2.mp3'), '-i', str(AUDIO / 'music.mp3'),
       *[x for name, _, _ in voice for x in ('-i', str(AUDIO / f'{name}.mp3'))], '-filter_complex', filt,
       '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
       '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', str(out)]
subprocess.run(cmd, check=True)
print(json.dumps({'output': str(out), 'seconds': round(dur(out), 1), 'voice': [(n, round(a, 1), round(b, 1)) for n, a, b in voice]}))
