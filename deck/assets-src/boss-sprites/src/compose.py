from PIL import Image, ImageDraw
import json
K=12; AW,AH,GY=1860,760,690; FKX=600
meta=json.load(open('sprites/dragon.json'))
def load(n): return Image.open(f'sprites/{n}.png').convert('RGBA')
def up(im): return im.resize((im.size[0]*K,im.size[1]*K),Image.NEAREST)
def scene(pose,ice=False,castle='intact',gob='walk1',fname='x'):
    a=up(load('arena_background')).crop((0,0,AW,AH)); d=ImageDraw.Draw(a)
    c=up(load('castle_'+castle)); a.alpha_composite(c,(20,GY-c.size[1]))
    # Fiber-kun placeholder (192x192 at x12)
    fkx=FKX; fk=Image.open('fiberkun_ref.png').convert('RGBA'); fk=fk.resize((fk.size[0]*K,fk.size[1]*K),Image.NEAREST); a.alpha_composite(fk,(fkx+6,GY-fk.size[1]))
    ctop=GY-c.size[1]
    G=lambda n: up(load('goblin_'+n))
    if castle=='burning':
        spots=[(10,GY,'dance'),(140,GY,'dance'),(270,GY,'dance'),(400,GY,'bite'),(20+12*K,ctop+21*K,'dance')]
    elif gob:
        spots=[(440,GY,gob),(830,GY,'walk2'),(960,GY,'walk1')]
    else: spots=[]
    for gx,gy,gn in spots:
        g=G(gn); a.alpha_composite(g,(gx,gy-g.size[1]+K))
    # Fiber-kun + pixel sword in his right hand
    sw={'idle':'sword_ready','breath':'sword_ready','kneel':'sword_strike','defeated':'sword_up'}[pose]
    sm=json.load(open('sprites/sword.json'))[sw]['anchor_hilt']
    s_im=up(load(sw)); hx=fkx+6+12*K; hy=GY-fk.size[1]+10*K
    a.alpha_composite(s_im,(hx-sm[0]*K,hy-sm[1]*K))
    dr=up(load('dragon_'+pose)); base=meta['poses'][pose]['baseline_row']
    dx=AW-dr.size[0]-10; dy=GY-(base+1)*K
    a.alpha_composite(dr,(dx,dy))
    if ice:
        m=meta['poses'][pose]['mouth']; mx=dx+m[0]*K; my=dy+m[1]*K
        ic=up(load('ice_breath_down')); an=json.load(open('sprites/ice_breath_down.json'))['anchor_mouth']
        a.alpha_composite(ic,(mx-an[0]*K, my-an[1]*K))
        pass
    a.alpha_composite(up(load('arena_frame')).crop((0,0,AW,AH)))
    a.convert('RGB').resize((AW//2,AH//2),Image.NEAREST).save(fname)
    return dx
dx=scene('idle',fname='scene_idle.png')
scene('breath',ice=True,castle='cracked',gob='bite',fname='scene_breath.png')
scene('kneel',castle='burning',gob='dance',fname='scene_fail.png')
scene('defeated',gob=None,fname='scene_win.png')
m=meta['poses']['breath']['mouth']; base=meta['poses']['breath']['baseline_row']
import math
dr=up(load('dragon_breath')); dx=AW-dr.size[0]-10; dy=GY-(base+1)*K
mx=dx+m[0]*K; my=dy+m[1]*K; tx=FKX+96; ty=GY-96
print('angle',round(math.degrees(math.atan2(ty-my,mx-tx)),1),'len_cells',round(math.hypot(mx-tx,ty-my)/K,1))
