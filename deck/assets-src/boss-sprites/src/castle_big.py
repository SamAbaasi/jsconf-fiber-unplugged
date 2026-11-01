from PIL import Image
import math, random
OUT=(26,16,48)
C={'1':(190,182,210),'2':(152,144,176),'m':(128,120,154),'3':(104,98,132),'4':(70,64,98),'s':(56,50,80),
   'k':(26,16,48),'W':(138,90,54),'w':(96,60,36),'b':(60,40,28)}
F={'r':(214,48,40),'o':(248,128,40),'y':(255,214,80),'w':(255,248,210)}
W,H=34,27
def solid(state):
    g=[[False]*W for _ in range(H)]
    def rect(x0,y0,x1,y1):
        for y in range(y0,y1+1):
            for x in range(x0,x1+1): g[y][x]=True
    rect(0,5,8,26); rect(25,5,33,26); rect(9,13,24,26)
    for x in (0,2,4,6,8): g[4][x]=True
    for x in (25,27,29,31,33): g[4][x]=True
    for x in range(9,25,2): g[12][x]=True
    if state=='burning':
        # right tower broken: jagged top
        tops={25:13,26:14,27:12,28:13,29:15,30:13,31:14,32:16,33:15}
        for x,t in tops.items():
            for y in range(0,t): g[y][x]=False
        for x in (13,15,17,19): g[12][x]=False
        for x in (14,16): 
            g[13][x]=False
    return g
def draw(state):
    g=solid(state); im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    for y in range(H):
        for x in range(W):
            if not g[y][x]: continue
            row=y%3; off=(y//3)%2
            c='2'
            if row==0: c='m'
            elif row==1 and (x+off*2)%4==0: c='m'
            elif row==1 and (x+off*2)%4==1: c='1'
            if y==0 or not g[y-1][x]: c='1'
            if x in (8,24,33) and g[y][x] and (x+1>=W or not g[y][x+1]): c='3'   # right edges shaded
            p[x,y]=C[c]+(255,)
    for (x,y) in [(4,9),(4,10),(4,16),(4,17),(29,9),(29,10),(29,16),(29,17),(12,17),(21,17)]:
        if g[y][x]: p[x,y]=C['k']+(255,)
    # gate with arch
    for y in range(19,27):
        for x in range(14,20):
            if y==19 and x in (14,19): continue
            p[x,y]=(C['W'] if (x in (14,19) or y in (19,20)) else C['w'])+(255,)
    for y in range(21,27): p[16,y]=C['b']+(255,); p[17,y]=C['b']+(255,)
    if state in ('cracked','burning'):
        cracks=[(6,7),(7,8),(6,9),(7,10),(2,19),(3,20),(2,21),(27,8),(28,9),(27,10),(30,20),(31,21),(10,16),(11,17),(10,18),(22,21),(23,22)]
        for (x,y) in cracks:
            if g[y][x]: p[x,y]=C['k']+(255,)
        for (x,y) in [(1,12),(32,7),(9,15),(24,19)]:
            if g[y][x]: p[x,y]=(0,0,0,0)
    if state=='burning':
        # scorch: darken stones near the fires
        for y in range(H):
            for x in range(W):
                if p[x,y][3] and ((x>=24 and y<20) or (y<9 and x<9) or (10<=x<=18 and y<16)):
                    r,gg,b,a=p[x,y]
                    if (r,gg,b)!=C['k']: p[x,y]=(int(r*0.6),int(gg*0.55),int(b*0.65),255)
    # outline
    o=Image.new('RGBA',(W,H),(0,0,0,0)); po=o.load()
    for y in range(H):
        for x in range(W):
            if p[x,y][3]: po[x,y]=p[x,y]
            elif any(0<=x+dx<W and 0<=y+dy<H and p[x+dx,y+dy][3] for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): po[x,y]=OUT+(255,)
    return o
def flame(h,w,seed,phase=0):
    random.seed(seed); im=Image.new('RGBA',(w,h),(0,0,0,0)); p=im.load()
    for y in range(h):
        for x in range(w):
            u=y/(h-1)             # 0 top .. 1 bottom
            cx=(w-1)/2+math.sin(u*5+phase)*0.8*(1-u)
            half=(w/2)*(u**0.6)
            dxa=abs(x-cx)
            if dxa<=half:
                r=dxa/(half+0.01)
                c='w' if (r<0.3 and u>0.6) else ('y' if r<0.55 else ('o' if r<0.85 else 'r'))
                p[x,y]=F[c]+(255,)
    return im
def burning_with_flames(phase):
    base=draw('burning'); Hh=H+8
    im=Image.new('RGBA',(W,Hh),(0,0,0,0)); im.alpha_composite(base,(0,8))
    for (x,y,h,w,s) in [(1,3,10,7,1),(26,13,11,8,2),(11,10,8,6,3),(19,12,7,5,4)]:
        f=flame(h,w,s,phase); im.alpha_composite(f,(x,y))
    # outline flames lightly in dark red
    return im
for st in ('intact','cracked'):
    im=draw(st); full=Image.new('RGBA',(W,H+8),(0,0,0,0)); full.alpha_composite(im,(0,8)); full.save(f'sprites/castle_{st}.png')
burning_with_flames(0).save('sprites/castle_burning.png')
burning_with_flames(1.6).save('sprites/castle_burning_f2.png')
draw('burning').save('sprites/castle_burning_noflames.png')
k=8; sheet=Image.new('RGBA',(W*k*4+50,(H+8)*k+20),(40,30,90,255))
for i,n in enumerate(['castle_intact','castle_cracked','castle_burning','castle_burning_f2']):
    im=Image.open(f'sprites/{n}.png'); sheet.alpha_composite(im.resize((im.size[0]*k,im.size[1]*k),Image.NEAREST),(10+i*(W*k+10),10))
sheet.convert('RGB').save('castle_sheet.png'); print('ok')
