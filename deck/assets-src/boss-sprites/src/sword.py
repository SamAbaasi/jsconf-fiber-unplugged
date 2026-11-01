from PIL import Image
import math, json
OUT=(26,16,48)
C={'b1':(246,248,255),'b2':(196,204,224),'b3':(136,144,172),'g1':(255,214,90),'g2':(204,150,40),'h':(130,82,44),'hd':(90,54,30),'p':(255,214,90)}
def outline(im):
    W,H=im.size; p=im.load(); o=Image.new('RGBA',(W+2,H+2),(0,0,0,0)); q=o.load()
    for y in range(H):
        for x in range(W):
            if p[x,y][3]: q[x+1,y+1]=p[x,y]
    for y in range(H+2):
        for x in range(W+2):
            if q[x,y][3]: continue
            if any(0<=x+dx<W+2 and 0<=y+dy<H+2 and q[x+dx,y+dy][3] and q[x+dx,y+dy][:3]!=OUT for dx,dy in((1,0),(-1,0),(0,1),(0,-1))): q[x,y]=OUT+(255,)
    return o
def sword(angle_deg, blade=10):
    # hilt at origin, blade goes along angle (0 = right, 90 = up); pixel art via stepping
    a=math.radians(angle_deg); ux,uy=math.cos(a),-math.sin(a); nx,ny=-uy,ux
    pts={}
    def put(fx,fy,c):
        x,y=round(fx),round(fy); pts[(x,y)]=c
    for i in range(-3,0): put(i*ux,i*uy,'h' if i>-3 else 'p')          # grip + pommel
    for w in (-2,-1,0,1,2): put(w*nx,w*ny,'g1' if abs(w)<2 else 'g2')   # guard
    for i in range(1,blade+1):
        put(i*ux,i*uy,'b2'); put(i*ux+nx*0.9,i*uy+ny*0.9,'b1' if i<blade else 'b2')
    put((blade+1)*ux,(blade+1)*uy,'b1')
    xs=[x for x,y in pts]; ys=[y for x,y in pts]; mx,my=min(xs),min(ys)
    im=Image.new('RGBA',(max(xs)-mx+1,max(ys)-my+1),(0,0,0,0)); p=im.load()
    for (x,y),c in pts.items(): p[x-mx,y-my]=C[c]+(255,)
    return outline(im),(-mx+1,-my+1)   # anchor = hilt/guard centre (in the outlined sprite)
def slash(r=9,a0=-60,a1=70):
    W=H=2*r+5; im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load(); cx=cy=r+2
    for y in range(H):
        for x in range(W):
            d=math.hypot(x-cx,y-cy); ang=math.degrees(math.atan2(cy-y,x-cx))
            if a0<=ang<=a1:
                t=(ang-a0)/(a1-a0)
                th=0.6+2.2*math.sin(t*math.pi)
                if r-th<=d<=r: p[x,y]=((255,255,255) if d>r-th*0.45 else (150,230,250))+(255,)
    return outline(im),(cx+1,cy+1)
meta={}
for name,ang in [('sword_ready',45),('sword_up',85),('sword_strike',-15)]:
    im,anc=sword(ang); im.save(f'sprites/{name}.png'); meta[name]={'anchor_hilt':anc,'angle_deg':ang}
im,anc=slash(); im.save('sprites/slash_arc.png'); meta['slash_arc']={'anchor_centre':anc}
json.dump(meta,open('sprites/sword.json','w'),indent=1); print(meta)
