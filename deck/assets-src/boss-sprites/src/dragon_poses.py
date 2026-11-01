from PIL import Image, ImageDraw
import math, json
S=10; W,H=66,46; XS=30
import sys
TILT=float(sys.argv[1]) if len(sys.argv)>1 else 18
P={'out':(26,16,48),'r1':(246,108,86),'r2':(208,54,66),'r3':(142,32,54),'r4':(100,20,44),
   'w0':(240,112,110),'w1':(210,70,84),'w2':(176,48,70),'wf':(120,24,52),'f':(96,18,42),'fh':(160,40,64),
   'far2':(150,34,56),'far3':(108,20,44),
   'b1':(252,232,188),'b2':(222,188,138),'b3':(184,146,104),'h1':(252,242,218),'h2':(206,184,144),'h3':(158,134,100),
   'eye':(255,220,72),'shine':(255,250,214),'r2h':(222,70,76),'selr':(104,24,48),'cl':(252,252,252),'ice1':(232,252,255),'ice2':(140,226,246),'ice3':(60,160,214)}
def bez(p0,p1,p2,n=16):
    return [((1-t)**2*p0[0]+2*(1-t)*t*p1[0]+t*t*p2[0],(1-t)**2*p0[1]+2*(1-t)*t*p1[1]+t*t*p2[1]) for t in [i/n for i in range(n+1)]]
def build(pose):
    OY=8
    hd={'idle':(0,0),'anticipation':(26,-14),'breath':(-6,30),'hurt':(30,-6),'kneel':(-6,118),'defeated':(0,0)}[pose]
    drop={'kneel':40}.get(pose,0)
    parts=[]
    def add(name,kind):
        im=Image.new('L',(W*S,H*S),0); d=ImageDraw.Draw(im); parts.append((name,kind,im)); return d
    tilt={'breath':-TILT}.get(pose,0)
    def T(p,head=False,dy=0):
        x,y=p
        if head:
            x+=hd[0]; y+=hd[1]
            if tilt:
                px0,py0=170+hd[0],104+hd[1]; a=math.radians(tilt)
                rx,ry=x-px0,y-py0
                x=px0+rx*math.cos(a)-ry*math.sin(a); y=py0+rx*math.sin(a)+ry*math.cos(a)
        return (x+XS,y+OY+dy)
    def thick(d,pts,w0,w1,**k):
        pts=[T(p,**k) for p in pts]; n=len(pts)-1
        for i in range(n):
            (x0,y0),(x1,y1)=pts[i],pts[i+1]
            for t in range(21):
                u=t/20; x=x0+(x1-x0)*u; y=y0+(y1-y0)*u; w=w0+(w1-w0)*((i+u)/n)
                d.ellipse([x-w,y-w,x+w,y+w],fill=255)
    def poly(d,pts,**k): d.polygon([T(p,**k) for p in pts],fill=255)
    def ell(d,b,**k):
        a=T((b[0],b[1]),**k); c=T((b[2],b[3]),**k); d.ellipse([a[0],a[1],c[0],c[1]],fill=255)
    if pose=='defeated':
        d=add('farwing','wfar'); poly(d,[(262,286),(300,214),(352,196),(330,292)])
        d=add('tail','r'); thick(d,bez((410,340),(520,392),(586,350)),26,9)
        d=add('spade','r'); poly(d,[(572,334),(600,300),(612,352),(588,348)])
        d=add('body','r'); ell(d,[176,262,436,378])
        d=add('farleg_h','far'); ell(d,[380,350,440,392])
        d=add('neck','r'); thick(d,bez((236,300),(170,336),(120,352)),34,28)
        d=add('belly','b'); thick(d,bez((214,350),(160,372),(120,382)),12,10); ell(d,[200,356,420,384])
        d=add('haunch','l'); ell(d,[330,300,420,384]); poly(d,[(352,376),(312,382),(310,392),(360,392)])
        d=add('frontleg','l'); ell(d,[214,346,268,392]); poly(d,[(226,380),(186,384),(184,392),(232,392)])
        d=add('head','r'); ell(d,[60,312,180,390]); poly(d,[(80,330),(8,344),(6,378),(70,392)])
        d=add('jaw','j'); poly(d,[(10,380),(70,384),(130,390),(20,392)])
        d=add('horn','h'); poly(d,[(150,322),(176,290),(236,272),(200,300),(170,332)]); poly(d,[(120,318),(130,292),(160,280),(146,304),(136,324)])
        d=add('wing','w'); poly(d,[(262,292),(300,206),(360,180),(470,230),(450,262),(486,300),(446,312),(470,360),(400,330),(340,318)])
        d=add('bone','f'); thick(d,[(270,290),(300,206),(360,182)],10,7)
        for tip in [(470,230),(486,300),(470,360)]: thick(d,[(360,184),tip],6,4)
        return parts,hd,OY
    d=add('farwing','wfar')
    if pose=='kneel': poly(d,[(232,222),(220,140),(250,100),(292,222)])
    else: poly(d,[(232,182),(236,72),(276,30),(292,182)])
    if pose!='kneel':
        d=add('farleg_f','far'); thick(d,[(268,290),(276,346),(262,378)],20,14); poly(d,[(266,372),(236,380),(234,392),(272,392)])
    else:
        d=add('farleg_f','far'); thick(d,[(276,330),(250,370),(222,384)],20,14)
    d=add('farleg_h','far'); thick(d,[(398,300+drop//2),(418,350),(400,378)],18,13); poly(d,[(404,372),(374,380),(372,392),(408,392)])
    d=add('tail','r'); thick(d,bez((380,300+drop),(522,356),(522,240+drop)),30,9)
    d=add('spade','r'); poly(d,[(506,256),(528,192),(556,250),(524,240)],dy=drop)
    d=add('body','r'); ell(d,[150,175,405,332],dy=drop)
    # neck: base fixed (moves with drop), top follows head offset
    nb=(232,236+drop); nt=(150+hd[0],118+hd[1]); nc=(150+hd[0]*0.3,212+drop*0.5+hd[1]*0.3)
    d=add('neck','r'); thick(d,bez(nb,nc,nt),42,34)
    d=add('haunch','l'); ell(d,[296,228,406,330],dy=drop)
    if pose=='kneel':
        thick(d,[(370,350),(392,372),(366,386)],22,15); poly(d,[(370,378),(330,382),(328,392),(374,392)])
    else:
        thick(d,[(366,318),(384,354),(364,380)],22,15); poly(d,[(368,372),(326,380),(324,392),(374,392)])
    d=add('frontleg','l')
    if pose=='kneel':
        thick(d,[(222,300),(206,356),(176,382)],26,16); poly(d,[(180,376),(140,382),(138,392),(186,392)])
    else:
        thick(d,[(222,262),(234,318)],28,20); thick(d,[(234,318),(214,360)],20,16); thick(d,[(214,360),(208,380)],16,13); poly(d,[(212,372),(172,380),(170,392),(218,392)])
    d=add('belly','b'); thick(d,bez((112+hd[0],134+hd[1]),(146+hd[0]*0.3,240+drop*0.5),(236,318+drop)),17,14); ell(d,[200,302,330,334],dy=drop)
    jaw_open={'anticipation':22,'breath':44,'hurt':14}.get(pose,0)
    d=add('head','r'); ell(d,[62,46,200,142],head=True); poly(d,[(84,72),(8,84),(6,112),(30,116),(60,120),(120,130)],head=True)
    if jaw_open:
        d=add('mouth','m'); poly(d,[(6,110),(118,128),(10,112+jaw_open)],head=True)
    d=add('jaw','j'); poly(d,[(12,116+jaw_open),(60,124+jaw_open*0.55),(120,136),(118,148),(52,140+jaw_open*0.55),(16,130+jaw_open)],head=True)
    d=add('horn','h'); poly(d,[(152,70),(166,40),(200,14),(256,2),(222,24),(196,46),(182,76)],head=True); poly(d,[(118,60),(122,36),(146,16),(176,8),(150,30),(138,64)],head=True)
    d=add('wing','w')
    if pose=='kneel':
        poly(d,[(250,226),(262,150),(320,110),(500,170),(470,200),(490,236),(440,236),(450,276),(390,252),(372,246)])
    else:
        poly(d,[(250,186),(268,72),(330,18),(534,38),(494,80),(524,120),(460,126),(480,174),(410,156),(372,206)])
    d=add('bone','f')
    if pose=='kneel':
        for tip in [(500,170),(490,236),(450,276)]: thick(d,[(320,112),tip],7,5)
        thick(d,[(254,224),(262,150),(320,112)],11,8)
    else:
        for tip in [(534,38),(524,120),(480,174)]: thick(d,[(330,20),tip],7,5)
        thick(d,[(254,184),(268,72),(330,20)],11,8)
    return parts,hd,OY
def render(pose):
    parts,hd,OY=build(pose)
    G={n:[[sum(im.getpixel((x*S+sx,y*S+sy))>0 for sx in (2,5,8) for sy in (2,5,8))>=5 for x in range(W)] for y in range(H)] for n,k,im in parts}
    canvas=[[None]*W for _ in range(H)]; owner=[[None]*W for _ in range(H)]
    for n,k,im in parts:
        for y in range(H):
            for x in range(W):
                if not G[n][y][x]: continue
                if n=='belly' and not (G['body'][y][x] or G.get('neck',[[0]*W]*H)[y][x]): continue
                if n=='bone' and not G['wing'][y][x]: continue
                
                canvas[y][x]=k; owner[y][x]=n
    def own(x,y): return owner[y][x] if 0<=x<W and 0<=y<H else None
    def kd(x,y): return canvas[y][x] if 0<=x<W and 0<=y<H else None
    out=Image.new('RGBA',(W,H),(0,0,0,0)); px=out.load(); band={}
    for y in range(H):
        for x in range(W):
            k=canvas[y][x]
            if not k:
                if any(kd(x+dx,y+dy) for dx,dy in((1,0),(-1,0),(0,1),(0,-1))):
                    below=kd(x,y+1); side=[kd(x+dx,y) for dx in(-1,1)]
                    px[x,y]=(P['selr'] if (below in('r','l','w','s') and all(sd in(None,'r','l','w','s') for sd in side)) else P['out'])+(255,)
                continue
            up=kd(x,y-1)==k; dn=kd(x,y+1)==k
            n=owner[y][x]
            if n not in band:
                band[n]={}
            if x not in band[n]:
                ys=[yy for yy in range(H) if owner[yy][x]==n]; band[n][x]=(min(ys),max(ys))
            t0,t1=band[n][x]; v=(y-t0)/max(1,(t1-t0))
            if k in('r','l'):
                c=P['r1'] if (not up or v<0.18) else (P['r2'] if v<0.58 else P['r3'])
                if not dn: c=P['r4'] if k=='r' else P['r3']
                if c==P['r2'] and (x*3+y*5)%13==0: c=P['r2h']
            elif k=='j': c=P['r3'] if dn else P['r4']
            elif k=='m': c=(P['ice1'] if (kd(x,y-1)=='m' and kd(x,y+1)=='m') else P['ice2']) if pose in('anticipation','breath') else P['r4']
            elif k=='far': c=P['far2'] if not up else P['far3']
            elif k=='b': c=P['b3'] if (y%3==0) else (P['b2'] if not dn else P['b1'])
            elif k=='h': c=P['h1'] if (not up or v<0.34) else (P['h3'] if not dn else P['h2'])
            elif k=='w':
                c=P['w0'] if (not up or v<0.3) else (P['w1'] if v<0.68 else P['w2'])
            elif k=='wfar': c=P['wf']
            elif k=='f': c=P['fh'] if not up else P['f']
            px[x,y]=c+(255,)
    front_over={'haunch':{'body','tail','belly','farleg_h'},'frontleg':{'body','belly','neck','farleg_f'},
                'wing':{'body','neck','tail','farwing','haunch'},'head':{'neck','belly'},'jaw':{'neck','belly'},
                'horn':{'head','neck'},'farleg_f':{'body'},'farleg_h':{'body','tail'}}
    for y in range(H):
        for x in range(W):
            n=owner[y][x]
            if n in front_over and any(own(x+dx,y+dy) in front_over[n] for dx,dy in((1,0),(-1,0),(0,1),(0,-1))):
                px[x,y]=P['out' if n in('wing','horn') else ('r3' if n in('frontleg','haunch','farleg_f','farleg_h') else 'r4')]+(255,)
    # face (relative to the head offset)
    gx=lambda x: x+round((hd[0]+XS)/10)-1
    gy=lambda y: y+round((hd[1]+OY)/10)
    eye=pose not in('hurt','defeated')
    if pose=='defeated':
        hp=[(x,y) for y in range(H) for x in range(W) if owner[y][x]=='head']
        ex=min(x for x,y in hp)+7; ey=min(y for x,y in hp if x==ex)+3
        for x in (ex,ex+1,ex+2): px[x,ey]=P['out']+(255,)          # closed eye
        px[ex-1,ey-1]=P['r4']+(255,)
        # dizzy stars above the head
        for (sx,sy) in [(ex-4,ey-7),(ex+2,ey-9),(ex+7,ey-6)]:
            for (dx,dy) in [(0,0),(1,0),(-1,0),(0,1),(0,-1)]:
                if 0<=sx+dx<W and 0<=sy+dy<H: px[sx+dx,sy+dy]=((255,226,90) if (dx,dy)!=(0,0) else (255,250,214))+(255,)
    elif pose=='breath':
        # find the head bbox and put the eye near the upper back of the snout
        hp=[(x,y) for y in range(H) for x in range(W) if owner[y][x]=='head']
        cx=min(x for x,y in hp)+9; top=min(y for x,y in hp if x==cx)
        px[cx,top+3]=P['eye']+(255,); px[cx+1,top+3]=P['eye']+(255,); px[cx+2,top+3]=P['out']+(255,)
        for x in range(cx-1,cx+3): px[x,top+2]=P['r4']+(255,)
    else:
        for x in (9,10,11,12): px[gx(x),gy(8)]=P['r4']+(255,)
        if eye: px[gx(10),gy(9)]=P['shine']+(255,); px[gx(11),gy(9)]=P['eye']+(255,); px[gx(12),gy(9)]=P['out']+(255,)
        else:
            for x in (10,11,12): px[gx(x),gy(9)]=P['out']+(255,)
        px[gx(1),gy(9)]=P['out']+(255,)
        if not {'anticipation':1,'breath':1,'hurt':1}.get(pose):
            for x in range(2,11): px[gx(x),gy(12)]=P['out']+(255,)
        for x in (3,6,9): px[gx(x),gy(13)]=P['cl']+(255,)
    # claws
    feet=[(x,y) for y in range(H) for x in range(W) if canvas[y][x] in ('l','far')]
    if feet:
        bottom=max(y for x,y in feet); x=0
        while x<W:
            if canvas[bottom][x] in ('l','far'):
                x0=x
                while x<W and canvas[bottom][x] in ('l','far'): x+=1
                for cx in (x0,x0+2):
                    if cx<x: px[cx,bottom]=P['cl']+(255,)
            x+=1
    # mouth anchor (leftmost mouth/jaw pixel) for the breath origin
    mouth=[(x,y) for y in range(H) for x in range(W) if owner[y][x] in('mouth',)]
    anchor=(min(mouth)[0],round(sum(y for x,y in mouth)/len(mouth))) if mouth else None
    ground=max(y for y in range(H) for x in range(W) if px[x,y][3] and px[x,y][:3]!=P['out'])
    return out,anchor,ground
meta={}
sheet=Image.new('RGBA',(W*3*6,H*2*6),(40,30,90,255))
for i,pose in enumerate(['idle','anticipation','breath','hurt','kneel','defeated']):
    img,anchor,ground=render(pose)
    img.save(f'sprites/dragon_{pose}.png'); meta[pose]={'mouth':anchor,'baseline_row':ground}
    sheet.alpha_composite(img.resize((W*6,H*6),Image.NEAREST),((i%3)*W*6,(i//3)*H*6))
sheet.convert('RGB').save('dragon_poses_sheet.png')
json.dump({'grid':[W,H],'scale':12,'poses':meta},open('sprites/dragon.json','w'),indent=1)
print(json.dumps(meta))
