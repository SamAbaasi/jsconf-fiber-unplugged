from PIL import Image
OUT=(26,16,48)
GP={'G':(140,210,84),'g':(96,164,60),'d':(56,108,44),'e':(255,232,96),'k':(26,16,48),'w':(250,250,250),'p':(232,110,130),
    'B':(160,108,62),'b':(108,68,40),'l':(70,44,30),'s':(220,224,236),'S':(150,154,176),'h':(120,80,40)}
gob={
'walk1':["....dGGGd...","...GGGGGGG..","GGdGkeGkeGdG",".dGGgGGgGGd.","..GgwkwkwG..","...GGGGGG...","...bBBBBb...","s.GbBBBBbGg.","shGlllllldg.","s..bBBBBb...","...bB..Bb...","...gg..gg...","..ddd..ddd.."],
'walk2':["....dGGGd...","...GGGGGGG..","GGdGkeGkeGdG",".dGGgGGgGGd.","..GgwkwkwG..","...GGGGGG...","...bBBBBb...","s.GbBBBBbGg.","shGlllllldg.","s..bBBBBb...","...bB..Bb...","..gg....gg..",".ddd....ddd."],
'bite': ["....dGGGd...","...GGGGGGG..","GGdGkeGkeGdG",".dGGgGGgGGd.","..GwwwwwwG..","s..kkpkkk...","sh.GGGGGG...","s.GbBBBBbGg.","..GlllllldG.","...bBBBBb...","...bB..Bb...","..gg....gg..",".ddd....ddd."],
'dance':["G...dGGGd..G","G..GGGGGGG.G","GGdGkkGkkGdG",".dGGgGGgGGd.","G.GkwwwwkG.G","g..GGGGGG..g",".g.bBBBBb.g.","..gbBBBBbg..","...llllll...","...bBBBBb...","...bB..Bb...","..gg....gg..",".ddd....ddd."],
'hit':  ["............","............","....dGGGd...","...GGGGGGG..","GGdGkGGkGGdG",".dGGgGGgGGd.","..GGkkkkGG..","...GGpGGG...","..GbBBBBbG..","..gllllllg..","..gbBBBBbg..",".gg......gg.","ddd......ddd"],
}
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
def from_rows(rows):
    H=len(rows); W=max(len(r) for r in rows); im=Image.new('RGBA',(W,H),(0,0,0,0)); p=im.load()
    for y,r in enumerate(rows):
        for x,ch in enumerate(r):
            if ch!='.': p[x,y]=GP[ch]+(255,)
    return im
k=10; ims=[]
for n,rows in gob.items():
    assert all(len(r)==12 for r in rows) and len(rows)==13, n
    im=outline(from_rows(rows)); im.save(f'sprites/goblin_{n}.png'); ims.append(im)
sheet=Image.new('RGBA',(len(ims)*(14*k+10)+10,15*k+20),(40,30,90,255))
for i,im in enumerate(ims): sheet.alpha_composite(im.resize((im.size[0]*k,im.size[1]*k),Image.NEAREST),(10+i*(14*k+10),10))
sheet.convert('RGB').save('goblin_sheet.png'); print('ok')
