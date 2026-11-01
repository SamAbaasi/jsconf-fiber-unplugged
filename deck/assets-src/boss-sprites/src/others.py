from PIL import Image
import json, math, random
OUT=(26,16,48)
def outline(img,col=OUT):
    W,H=img.size; src=img.load()
    o=Image.new('RGBA',(W+2,H+2),(0,0,0,0)); po=o.load()
    for y in range(H):
        for x in range(W):
            if src[x,y][3]: po[x+1,y+1]=src[x,y]
    for y in range(H+2):
        for x in range(W+2):
            if po[x,y][3]: continue
            if any(0<=x+dx<W+2 and 0<=y+dy<H+2 and po[x+dx,y+dy][3] and po[x+dx,y+dy][:3]!=col for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): po[x,y]=col+(255,)
    return o
def from_rows(rows,pal):
    H=len(rows); W=max(len(r) for r in rows)
    im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': p[x,y]=pal[ch]+(255,)
    return im
# ---------- goblin (faces LEFT) ----------
GP={'G':(132,204,78),'g':(88,156,56),'d':(52,100,42),'e':(255,232,96),'k':(26,16,48),'w':(250,250,250),
    'B':(150,100,58),'b':(98,62,36),'s':(214,218,232),'S':(150,154,176)}
gob={
'walk1':["G.......G",".gGGGGGg.","gGekGGGGg",".GwwkgGg.","..bBBBb..","s.gBBbbg.","..bBBBb..","..g...g.."],
'walk2':["G.......G",".gGGGGGg.","gGekGGGGg",".GwwkgGg.","..bBBBb..","s.gBBbbg.","..bBBBb..","...g.g..."],
'bite': ["G.......G",".gGGGGGg.","gGekGGGGg","GkkkkgGg.","GwwbBBb..","sgBBBbbg.","..bBBBb..",".g....g.."],
'dance':["Gg.....gG","gGGGGGGGg",".GekGekG.",".GkwwkGg.","..bBBBb..","..BBBbb..","..bBBBb..","..g...g.."],
'hit':  [".........","G.......G",".gGGGGGg.","gGkGkGGGg",".GGkkgGg.","..bBBBb..","..bBbbb..",".gg...gg."],
}
# ---------- castle (front view, no lights) ----------
CP={'1':(188,180,208),'2':(150,142,174),'m':(128,120,154),'3':(104,98,132),'4':(72,66,100),'k':(26,16,48),'W':(132,86,52),'w':(92,58,34),'.':None}
def castle(state):
    W,H=22,13
    grid=[['.']*W for _ in range(H)]
    def rect(x0,y0,x1,y1):
        for y in range(y0,y1+1):
            for x in range(x0,x1+1): grid[y][x]='s'
    rect(0,1,5,12); rect(16,1,21,12); rect(6,5,15,12)
    for x in (0,2,4): grid[0][x]='s'
    for x in (16,18,20): grid[0][x]='s'
    for x in (6,8,10,12,14): grid[4][x]='s'
    if state=='burning':
        for y in range(0,5):
            for x in range(16,22): grid[y][x]='.'
        for (x,y) in [(17,5),(19,5),(21,5),(16,6)]: grid[y][x]='.'
        for x in (7,9,13): grid[4][x]='.'; grid[5][x]='.'
    im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    for y in range(H):
        for x in range(W):
            if grid[y][x]!='s': continue
            # brick pattern: mortar every 3 rows, staggered every 3 cols
            row=y%3; off=(y//3)%2
            c='2'
            if row==0: c='m'
            elif (x+off*2)%4==0 and row==1: c='m'
            elif row==1 and (x+off*2)%4==1: c='1'
            if grid[y-1][x]!='s' if y>0 else True: c='1'
            p[x,y]=CP[c]+(255,)
    # window slits (dark, no light)
    for (x,y) in [(2,4),(2,5),(19,4),(19,5),(2,8),(19,8)]:
        if grid[y][x]=='s': p[x,y]=CP['k']+(255,)
    # gate
    for y in range(8,13):
        for x in range(9,13):
            p[x,y]=(CP['W'] if (x in (9,12) or y==8) else CP['w'])+(255,)
    p[9,8]=CP['k']+(255,); p[12,8]=CP['k']+(255,)
    if state in('cracked','burning'):
        for (x,y) in [(4,6),(5,7),(4,8),(14,6),(13,7),(14,8),(18,9),(17,10),(7,10),(8,11)]:
            if p[x,y][3]: p[x,y]=CP['k']+(255,)
        for (x,y) in [(1,2),(20,3),(6,6)]:
            if p[x,y][3]: p[x,y]=(0,0,0,0)
    if state=='burning':
        for (x,y) in [(16,6),(17,6),(18,6),(6,6),(7,7)]:
            if p[x,y][3]: p[x,y]=CP['4']+(255,)
    return outline(im)
# ---------- fire (2 frames) ----------
FP={'r':(214,48,40),'o':(248,128,40),'y':(255,214,80),'w':(255,248,200)}
fire={'fire1':["..r..",".ror.","royor","ryyyo","oywyo",".oyo."],
      'fire2':[".r...","ror.r","oyorr","oyyyo","oywyo",".oyo."]}
# ---------- shield ----------
SP={'1':(220,224,236),'2':(160,166,186),'3':(110,114,138),'t':(40,170,180),'T':(24,120,136),'w':(252,252,252)}
shield=["..1111..",".122221.","12tttt21","1twtwtT1","1twtwtT1","12tttT21",".3TTTT3.","..3333.."]
# ---------- ice breath cone (points LEFT; narrow end at the right = mouth) ----------
IP={'1':(236,252,255),'2':(150,230,248),'3':(70,170,220),'4':(36,104,170)}
def ice():
    W,H=40,18; im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load(); random.seed(7)
    cy=H/2
    for x in range(W):
        t=1-x/(W-1)            # 0 at mouth (right), 1 at far end (left)
        half=1+t*7.5
        for y in range(H):
            dy=abs(y+0.5-cy)
            jag=1.2*math.sin(x*1.3)+ (1.6 if (x%5==0 and t>0.2) else 0)
            if dy<=half+jag*0.5:
                r=dy/(half+0.01)
                c='1' if r<0.25 else ('2' if r<0.6 else ('3' if r<0.9 else '4'))
                p[x,y]=IP[c]+(255,)
    # crystal shards flying off the wide end
    for (x,y) in [(1,1),(3,0),(0,16),(2,17),(5,2),(4,15)]:
        p[x,y]=IP['2']+(255,)
    return outline(im,(20,36,80))
sheet_items=[]
for name,rows in gob.items():
    im=outline(from_rows(rows,GP)); im.save(f'sprites/goblin_{name}.png'); sheet_items.append(im)
for st in ('intact','cracked','burning'):
    im=castle(st); im.save(f'sprites/castle_{st}.png'); sheet_items.append(im)
for name,rows in fire.items():
    im=outline(from_rows(rows,FP),(90,20,20)); im.save(f'sprites/{name}.png'); sheet_items.append(im)
im=outline(from_rows(shield,SP)); im.save('sprites/shield_yield.png'); sheet_items.append(im)
im=ice(); im.save('sprites/ice_breath.png'); sheet_items.append(im)
# preview sheet at x8 (x12 is the deck scale)
k=8; pad=10
wsum=sum(i.size[0]*k+pad for i in sheet_items); hmax=max(i.size[1]*k for i in sheet_items)
rows=[sheet_items[:5],sheet_items[5:10],sheet_items[10:]]
rw=max(sum(i.size[0]*k+pad for i in r) for r in rows); rh=[max(i.size[1]*k for i in r)+pad for r in rows]
sheet=Image.new('RGBA',(rw+pad,sum(rh)+pad),(40,30,90,255)); y=pad
for r,h in zip(rows,rh):
    x=pad
    for i in r: sheet.alpha_composite(i.resize((i.size[0]*k,i.size[1]*k),Image.NEAREST),(x,y)); x+=i.size[0]*k+pad
    y+=h
sheet.convert('RGB').save('others_sheet.png'); print('ok', [i.size for i in sheet_items])
