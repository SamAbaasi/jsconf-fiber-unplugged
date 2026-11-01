from PIL import Image
import math, json
IP={'1':(236,252,255),'2':(150,230,248),'3':(70,170,220),'4':(36,104,170)}
OUTC=(20,36,80)
def cone(angle_deg=19, L=44, wmax=7.5):
    a=math.radians(angle_deg); dx,dy=-math.cos(a),math.sin(a)   # points left and down
    # bounding box
    pts=[(0,0),(dx*L,dy*L)]
    nx,ny=-dy,dx
    ext=[(dx*L+nx*(wmax+2),dy*L+ny*(wmax+2)),(dx*L-nx*(wmax+2),dy*L-ny*(wmax+2)),(nx*2,ny*2),(-nx*2,-ny*2)]
    xs=[p[0] for p in pts+ext]; ys=[p[1] for p in pts+ext]
    minx,miny=math.floor(min(xs))-2,math.floor(min(ys))-2; W=math.ceil(max(xs))-minx+3; H=math.ceil(max(ys))-miny+3
    im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    for y in range(H):
        for x in range(W):
            X=x+0.5+minx; Y=y+0.5+miny
            t=X*dx+Y*dy; s=abs(X*nx+Y*ny)
            if t<0 or t>L: continue
            u=t/L; half=0.8+u*wmax
            jag=0.9*math.sin(t*1.4)+(1.3 if (int(t)%5==0 and u>0.25) else 0)
            if s<=half+jag*0.5:
                r=s/(half+0.01)
                c='1' if r<0.25 else ('2' if r<0.6 else ('3' if r<0.9 else '4'))
                p[x,y]=IP[c]+(255,)
    # outline
    o=im.copy(); po=o.load()
    for y in range(H):
        for x in range(W):
            if p[x,y][3]: continue
            if any(0<=x+ex<W and 0<=y+ey<H and p[x+ex,y+ey][3] for ex,ey in((1,0),(-1,0),(0,1),(0,-1))): po[x,y]=OUTC+(255,)
    return o,(-minx,-miny)   # anchor = mouth position inside the sprite
import sys
ANG=float(sys.argv[1]) if len(sys.argv)>1 else 19
LEN=float(sys.argv[2]) if len(sys.argv)>2 else 44
im,anchor=cone(ANG,LEN)
im.save('sprites/ice_breath_down.png')
json.dump({'anchor_mouth':anchor,'angle_deg':ANG,'length_cells':LEN},open('sprites/ice_breath_down.json','w'))
print(im.size,anchor)
