from PIL import Image
import random, math
W,H=155,64; GROW=57   # ground starts at row 57.5 (y=690 at x12)
random.seed(3)
bg=Image.new('RGBA',(W,H),(0,0,0,255)); p=bg.load()
sky=[(18,12,46),(24,18,62),(32,24,80),(42,32,98),(54,42,116)]
edges=[12,24,34,44]
for y in range(H):
    b=sum(1 for e in edges if y>=e)
    c=sky[b]
    for x in range(W):
        # dither 2 rows at each band edge
        if b>0 and y in (edges[b-1],edges[b-1]+1) and (x+y)%2==0: p[x,y]=sky[b-1]+(255,)
        else: p[x,y]=c+(255,)
# stars
for _ in range(22):
    x=random.randrange(W); y=random.randrange(0,34)
    p[x,y]=random.choice([(255,250,220),(200,210,255),(255,230,150)])+(255,)
for (x,y) in [(78,5)]:
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]: p[x+dx,y+dy]=(170,180,240,255)
    p[x,y]=(255,255,255,255)
# moon
mx,my,r=128,11,5
for y in range(my-r-1,my+r+2):
    for x in range(mx-r-1,mx+r+2):
        d=math.hypot(x-mx,y-my)
        if d<=r: p[x,y]=(250,240,200,255) if d<r-1.5 else (226,212,170,255)
for (x,y) in [(126,9),(130,13),(127,13)]: p[x,y]=(214,198,156,255)
# far mountains and near hills
def ridge(base,amp,col,seed,step):
    random.seed(seed); h=base
    for x in range(W):
        h+=random.choice([-1,0,0,1]); h=max(base-amp,min(base+2,h))
        for y in range(h,GROW+1): p[x,y]=col+(255,)
ridge(40,7,(46,36,104),11,1)
ridge(47,4,(36,28,82),12,1)
# ground
for y in range(GROW,H):
    for x in range(W):
        c=(96,196,96) if y==GROW else ((66,156,74) if y<GROW+3 else (48,120,60))
        if y==GROW+1 and (x*7)%5==0: c=(96,196,96)
        p[x,y]=c+(255,)
for x in range(2,W,6):
    p[x,GROW-1]=(96,196,96,255)
bg.save('sprites/arena_background.png')
# cave-mouth frame: rocky top band with stalactites + upper side walls (transparent middle)
fr=Image.new('RGBA',(W,H),(0,0,0,0)); q=fr.load()
rock=[(30,24,52),(44,36,74),(60,50,94)]
random.seed(9)
top=[3+random.choice([0,0,1,1,2]) for _ in range(W)]
for x in range(W):
    edge=min(x,W-1-x)
    depth=top[x]+max(0,10-edge)*2 if edge<10 else top[x]
    for y in range(0,depth):
        q[x,y]=(rock[2] if y==depth-1 else (rock[1] if (x+y)%5==0 else rock[0]))+(255,)
# stalactites
for sx in range(8,W-8,9):
    L=random.randint(2,5); d0=top[sx]
    for i in range(L):
        for w in range(-max(0,(L-i)//2),max(0,(L-i)//2)+1):
            if 0<=sx+w<W: q[sx+w,d0+i]=(rock[1] if w<0 else rock[0])+(255,)
# outline the rock
o=fr.copy(); qo=o.load()
for y in range(H):
    for x in range(W):
        if q[x,y][3]: continue
        if any(0<=x+dx<W and 0<=y+dy<H and q[x+dx,y+dy][3] for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): qo[x,y]=(14,10,30,255)
o.save('sprites/arena_frame.png')
