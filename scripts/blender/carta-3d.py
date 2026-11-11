"""Carta Destino em 3D (teste): a carta como objeto de verdade, com as artes do Gemini como textura.

Placa de ferro com espessura (fundo da Destino na frente), moldura em relevo tirada da arte `premium-destino-vaza`
(o alfa vira altura, as runas verdes viram luz), cachos de esmeralda em vidro 3D nos cantos de cima, círculo arcano
atrás, runas de pedra em prisma hexagonal e cacos de esmeralda flutuando, poeira verde, névoa leve e luz de estúdio
em 4 pontos. Capuz 3D de pano no lugar do pintado.

    python carta-3d.py -- rx=1080 ry=1512 samples=128 view=34 out=/tmp/saida
`view`: 34 (três quartos, padrão), front (de frente) ou low (de baixo, mais dramático). `fog=0` desliga a névoa.
`info=0` deixa só o design (modo "pure"); com `info=1` (padrão) entram nome, OVR, patente e as 3 estatísticas de exemplo.
Sai `<out>/destino-<view>.png` com fundo transparente.
"""
import bpy, bmesh, math, os, sys, random
import numpy as np
from mathutils import Vector, Euler
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device

ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
RX = int(ARGS.get('rx', 360)); RY = int(ARGS.get('ry', 504)); SAMPLES = int(ARGS.get('samples', 16))
OUT = ARGS.get('out', '/tmp/carta3d'); VIEW = ARGS.get('view', '34'); FOG = ARGS.get('fog', '1') == '1'
INFO = ARGS.get('info', '1') == '1'
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ART = os.path.join(ROOT, 'public', 'cartas', 'fundos')
os.makedirs(OUT, exist_ok=True)
random.seed(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- utilidades de material ----------
def img(name):
    return bpy.data.images.load(os.path.join(ART, name), check_existing=True)

def new_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs[0], out.inputs[0])
    return m, nt, bsdf

def green_mask(nt, color_socket, gain=6.0):
    """Quanto o pixel é verde-esmeralda (G acima de R e B): vira a força da luz das runas."""
    sep = nt.nodes.new('ShaderNodeSeparateColor'); nt.links.new(color_socket, sep.inputs[0])
    mx = nt.nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'
    nt.links.new(sep.outputs[0], mx.inputs[0]); nt.links.new(sep.outputs[2], mx.inputs[1])
    sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'SUBTRACT'
    nt.links.new(sep.outputs[1], sub.inputs[0]); nt.links.new(mx.outputs[0], sub.inputs[1])
    mul = nt.nodes.new('ShaderNodeMath'); mul.operation = 'MULTIPLY'; mul.use_clamp = True
    nt.links.new(sub.outputs[0], mul.inputs[0]); mul.inputs[1].default_value = gain
    return mul.outputs[0]

def art_material(name, image, metallic=0.85, rough=0.38, glow=4.0, bump=0.25, use_alpha=True):
    """Arte do Gemini como cor; o verde vira emissão; o brilho vira relevo fino."""
    m, nt, bsdf = new_mat(name)
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = image; tex.interpolation = 'Cubic'; tex.extension = 'CLIP'
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if use_alpha:
        nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    g = green_mask(nt, tex.outputs['Color'])
    inv = nt.nodes.new('ShaderNodeMath'); inv.operation = 'SUBTRACT'; inv.inputs[0].default_value = metallic
    nt.links.new(g, inv.inputs[1]); inv.use_clamp = True
    nt.links.new(inv.outputs[0], bsdf.inputs['Metallic'])
    bsdf.inputs['Roughness'].default_value = rough
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Emission Color'])
    em = nt.nodes.new('ShaderNodeMath'); em.operation = 'MULTIPLY'; em.inputs[1].default_value = glow
    nt.links.new(g, em.inputs[0]); nt.links.new(em.outputs[0], bsdf.inputs['Emission Strength'])
    bw = nt.nodes.new('ShaderNodeRGBToBW'); nt.links.new(tex.outputs['Color'], bw.inputs[0])
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = bump; bp.inputs['Distance'].default_value = 0.004
    nt.links.new(bw.outputs[0], bp.inputs['Height']); nt.links.new(bp.outputs[0], bsdf.inputs['Normal'])
    return m

def glass_mat(name, col, emit=0.25):
    m, nt, b = new_mat(name)
    b.inputs['Base Color'].default_value = (*col, 1)
    b.inputs['Transmission Weight'].default_value = 1.0
    b.inputs['IOR'].default_value = 1.58
    b.inputs['Roughness'].default_value = 0.04
    b.inputs['Emission Color'].default_value = (*col, 1); b.inputs['Emission Strength'].default_value = emit
    return m

def stone_mat(name):
    m, nt, b = new_mat(name)
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 18; nz.inputs['Detail'].default_value = 8
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = (0.035, 0.038, 0.04, 1); ramp.color_ramp.elements[1].color = (0.16, 0.17, 0.17, 1)
    nt.links.new(nz.outputs['Fac'], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.85
    bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.6
    nt.links.new(nz.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
    return m

def emit_mat(name, col, k):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*col, 1); e.inputs['Strength'].default_value = k
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m

def link(ob, parent=None):
    scene.collection.objects.link(ob)
    if parent: ob.parent = parent
    return ob

# ---------- medidas: carta 5:7, a caixa da carta dentro da arte de moldura ----------
W, H, T = 2.0, 2.8, 0.06          # largura, altura, espessura da placa
R = 0.15                          # raio do canto
VAZA_PX = (1000, 1400); BOX = (79, 118, 919, 1293)   # lado de fora da moldura na arte (medido pelo alfa)
px2u = W / (BOX[2] - BOX[0])
FW, FH = VAZA_PX[0] * px2u, VAZA_PX[1] * px2u
FCX = (VAZA_PX[0] / 2 - (BOX[0] + BOX[2]) / 2) * px2u
FCY = -(VAZA_PX[1] / 2 - (BOX[1] + BOX[3]) / 2) * px2u
def vaza_xy(px, py):
    return ((px - (BOX[0] + BOX[2]) / 2) * px2u, -(py - (BOX[1] + BOX[3]) / 2) * px2u)

rig = bpy.data.objects.new('carta', None); link(rig)

# ---------- placa de ferro (frente = fundo da Destino) ----------
def rounded_rect(w, h, r, seg=10):
    pts = []
    for cx, cy, a0 in ((w/2 - r, h/2 - r, 0), (-w/2 + r, h/2 - r, 90), (-w/2 + r, -h/2 + r, 180), (w/2 - r, -h/2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg); pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

me = bpy.data.meshes.new('placa'); bm = bmesh.new()
pts = rounded_rect(W * 0.985, H * 0.99, R)
front = bm.faces.new([bm.verts.new((x, y, T / 2)) for x, y in pts])
ext = bmesh.ops.extrude_face_region(bm, geom=[front])
for v in [e for e in ext['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z = -T / 2
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
uv = bm.loops.layers.uv.new()
for f in bm.faces:
    f.material_index = 0 if f.normal.z > 0.9 else 1
    for l in f.loops: l[uv].uv = ((l.vert.co.x + W / 2) / W, (l.vert.co.y + H / 2) / H)
bm.to_mesh(me); bm.free()
placa = link(bpy.data.objects.new('placa', me), rig)
bev = placa.modifiers.new('bev', 'BEVEL'); bev.width = 0.012; bev.segments = 3; bev.limit_method = 'ANGLE'
placa.data.materials.append(art_material('fundo', img('premium-destino.webp'), metallic=0.55, rough=0.45, glow=5.0, bump=0.35, use_alpha=False))
_, nt, b = new_mat('ferro'); b.inputs['Base Color'].default_value = (0.05, 0.055, 0.06, 1); b.inputs['Metallic'].default_value = 1; b.inputs['Roughness'].default_value = 0.42
placa.data.materials.append(bpy.data.materials['ferro'])
for p in placa.data.polygons: p.use_smooth = False

# ---------- moldura em relevo: o alfa da arte vira altura ----------
from PIL import Image, ImageFilter
va = Image.open(os.path.join(ART, 'premium-destino-vaza.webp')).convert('RGBA')
# o capuz pintado sai da arte (o miolo dele é vazado e ficava chapado): entra um capuz 3D de pano no lugar
HOOD_PX = (376, 0, 624, 214)
va_np = np.array(va); va_np[HOOD_PX[1]:HOOD_PX[3], HOOD_PX[0]:HOOD_PX[2], 3] = 0; va = Image.fromarray(va_np)
VAZA_PATH = os.path.join(OUT, '_moldura-sem-capuz.png'); va.save(VAZA_PATH)
a = np.asarray(va.split()[3].filter(ImageFilter.GaussianBlur(4)), dtype=np.float32) / 255.0
lum = np.asarray(va.convert('L').filter(ImageFilter.GaussianBlur(1.2)), dtype=np.float32) / 255.0
hmap = np.clip(a ** 0.7 * 0.8 + lum * a * 0.2, 0, 1)
hpath = os.path.join(OUT, '_altura-moldura.png'); Image.fromarray((hmap * 255).astype(np.uint8)).save(hpath)

bpy.ops.mesh.primitive_grid_add(x_subdivisions=460, y_subdivisions=644, size=1)
mold = bpy.context.active_object; mold.name = 'moldura'
mold.scale = (FW, FH, 1); mold.location = (FCX, FCY, T / 2 + 0.002)
bpy.ops.object.transform_apply(scale=True)
mold.parent = rig
htex = bpy.data.textures.new('altura', 'IMAGE'); htex.image = bpy.data.images.load(hpath); htex.extension = 'EXTEND'
dsp = mold.modifiers.new('relevo', 'DISPLACE'); dsp.texture = htex; dsp.texture_coords = 'UV'; dsp.strength = 0.07; dsp.mid_level = 0.0
mold.modifiers.new('suave', 'SMOOTH').factor = 0.4
bpy.ops.object.shade_smooth()
mold.data.materials.append(art_material('moldura', bpy.data.images.load(VAZA_PATH), metallic=0.9, rough=0.3, glow=6.0, bump=0.5))

# ---------- capuz 3D de pano verde-musgo no meio do topo ----------
def hood_mesh(a=0.215, b=0.2, c=0.19, nu=72, nv=40):
    """Casca de capuz: abre para a frente (+z) em arco; a ponta sobe um pouco para trás e a barra se abre embaixo."""
    me = bpy.data.meshes.new('capuz'); bm = bmesh.new(); grid = []
    for j in range(nv):
        v = j / (nv - 1); row = []
        beta = math.radians(-70 + 160 * v)                       # de baixo do queixo até passar do topo
        amax = math.pi * (0.62 + 0.30 * v ** 1.5)                        # abertura em arco: mais fechada em cima
        for i in range(nu):
            u = -1 + 2 * i / (nu - 1); al = u * amax
            r = math.cos(beta) if beta >= 0 else 1 + 0.75 * (-beta / math.radians(70)) ** 1.4   # embaixo a capa se abre sobre os ombros      # a barra se abre sobre os ombros
            x = a * r * math.sin(al); z = -c * r * math.cos(al)
            y = b * math.sin(beta) * (1.5 if beta < 0 else 1.0)
            y += 0.07 * max(0.0, v - 0.55) ** 2 / 0.2 * math.cos(al / 2) ** 2      # ponta do capuz
            z -= 0.04 * max(0.0, v - 0.6) * math.cos(al / 2) ** 2
            rim = max(0.0, abs(u) - 0.86) / 0.14                  # dobra da borda da abertura, virada para fora
            x *= 1 + 0.06 * rim; z += 0.025 * rim
            row.append(bm.verts.new((x, y, z)))
        grid.append(row)
    for j in range(nv - 1):
        for i in range(nu - 1):
            bm.faces.new([grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free(); return me

hood_x, hood_y = vaza_xy(500, 118)
hood = link(bpy.data.objects.new('capuz', hood_mesh()), rig)
hood.location = (hood_x, hood_y + 0.07, 0.15); hood.rotation_euler = (math.radians(-24), 0, 0); hood.scale = (1.12, 1.12, 1.12)
sol = hood.modifiers.new('espessura', 'SOLIDIFY'); sol.thickness = 0.016; sol.offset = 1
wr = bpy.data.textures.new('rugas', 'CLOUDS'); wr.noise_scale = 0.06; wr.noise_depth = 3
dw = hood.modifiers.new('rugas', 'DISPLACE'); dw.texture = wr; dw.strength = 0.012; dw.mid_level = 0.5
hood.modifiers.new('suave', 'SUBSURF').levels = 1
for p in hood.data.polygons: p.use_smooth = True
m, nt, b = new_mat('pano')
b.inputs['Base Color'].default_value = (0.026, 0.058, 0.036, 1); b.inputs['Roughness'].default_value = 0.88
b.inputs['Sheen Weight'].default_value = 0.8; b.inputs['Sheen Tint'].default_value = (0.55, 0.9, 0.65, 1); b.inputs['Sheen Roughness'].default_value = 0.4
wv = nt.nodes.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 260; wv.inputs['Distortion'].default_value = 2
bp = nt.nodes.new('ShaderNodeBump'); bp.inputs['Strength'].default_value = 0.25
nt.links.new(wv.outputs['Fac'], bp.inputs['Height']); nt.links.new(bp.outputs[0], b.inputs['Normal'])
hood.data.materials.append(m)
# o vazio de dentro: escuro, com um brilho verde fraco lá no fundo
bpy.ops.mesh.primitive_uv_sphere_add(radius=1, location=(0, -0.06, -0.08)); void = bpy.context.active_object
void.scale = (0.15, 0.2, 0.1); void.parent = hood
vm, nt, vb = new_mat('vazio'); vb.inputs['Base Color'].default_value = (0.0, 0.0, 0.0, 1); vb.inputs['Roughness'].default_value = 1
vb.inputs['Emission Color'].default_value = (0.1, 1.0, 0.45, 1); vb.inputs['Emission Strength'].default_value = 0.0; vb.inputs['Specular IOR Level'].default_value = 0.0
void.data.materials.append(vm)
il = bpy.data.lights.new('dentro-capuz', 'POINT'); il.energy = 0.6; il.color = (0.3, 1.0, 0.55); il.shadow_soft_size = 0.05
link(bpy.data.objects.new('dentro-capuz', il), hood).location = (0, 0.02, 0.02)

# ---------- informações do atleta (como o app desenha a CanchaCard da Destino; dados de exemplo, sem foto) ----------
if INFO:
    from PIL import ImageDraw, ImageFont
    FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fontes')
    def font(name, size): return ImageFont.truetype(os.path.join(FONTS, name), size)
    def geist(size, weight):
        f = font('Geist.ttf', size)
        try: f.set_variation_by_axes([weight])
        except Exception: pass
        return f
    S = 2                                            # 1 cqw = 10 px x S
    CW, CH = 1000 * S, 1400 * S; cq = 10 * S
    ACC, MUTED, BAR = (201, 168, 92), (185, 232, 200), (6, 16, 11)
    info = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); d = ImageDraw.Draw(info)
    wx, wy = 1.43 * cq, 1.02 * cq; wl, wt, wr_, wb = wx, wy, CW - wx, CH - wy; ww, wh = wr_ - wl, wb - wt
    pad = 6.25 * cq; lift = 5          # statsLift 5, como nas outras lendárias (a barra de baixo da moldura cobria os rótulos)
    def spaced(x, y, text, f, fill, track, anchor_center=False):
        widths = [d.textlength(ch, font=f) for ch in text]; total = sum(widths) + track * (len(text) - 1)
        cx = x - total / 2 if anchor_center else x
        for ch, w_ in zip(text, widths): d.text((cx, y), ch, font=f, fill=fill); cx += w_ + track
    # clarão atrás da cabeça (luz da roupa 120 255 170)
    glow = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); yy, xx = np.mgrid[0:CH, 0:CW]
    g = np.clip(1 - np.sqrt(((xx - CW / 2) / (0.34 * ww)) ** 2 + ((yy - (wt + 0.30 * wh)) / (0.24 * wh)) ** 2) / 0.75 * 1.0, 0, 1)
    ga = np.zeros((CH, CW, 4), np.uint8); ga[..., 0], ga[..., 1], ga[..., 2] = 120, 255, 170; ga[..., 3] = (g * 0.2 * 255).astype(np.uint8)
    info.alpha_composite(Image.fromarray(ga))
    # foto: sem foto, o app mostra as iniciais grandes a 30%
    ini = font('BarlowCondensed-ExtraBold.ttf', int(34 * cq)); photo_bottom = wb - (22.6 - 1.02 * 1.4 + lift) * cq
    d.text((CW / 2, photo_bottom - 6 * cq), 'JE', font=ini, fill=(255, 255, 255, 77), anchor='ms')
    # degradê escuro até a faixa de estatísticas
    bar_h = 0.12 * wh + (6.25 - 0.8 + lift) * cq; fade_bottom = wb - bar_h; fade_top = fade_bottom - 0.25 * wh
    fa = np.zeros((CH, CW, 4), np.uint8); fa[..., 0], fa[..., 1], fa[..., 2] = BAR
    t = np.clip((yy - fade_top) / (fade_bottom - fade_top), 0, 1); fa[..., 3] = (t * 255 * ((yy < fade_bottom))).astype(np.uint8)
    info.alpha_composite(Image.fromarray(fa)); d = ImageDraw.Draw(info)
    # barra do nome: degradê preto 80% -> 40% e fio na cor do acento
    name_h = 0.16 * wh + pad + 1.4 * cq        # +1,4 cqw: o nome desce um pouco por causa do relevo da moldura
    na = np.zeros((CH, CW, 4), np.uint8); tt = np.clip((yy - wt) / name_h, 0, 1)
    na[..., 3] = (((0.8 - 0.4 * tt) * 255) * ((yy >= wt) & (yy < wt + name_h))).astype(np.uint8)
    info.alpha_composite(Image.fromarray(na)); d = ImageDraw.Draw(info)
    d.rectangle((wl, wt + name_h - 0.6 * cq, wr_, wt + name_h), fill=ACC)
    nx = wl + (8 + 6.25) * cq; ny = wt + (2.6 + 6.25) * cq
    ntop = ny + ((name_h - (2.6 + 6.25) * cq) - 15.3 * cq) / 2      # coluna centrada como no flex do app
    ntop += 1.4 * cq                 # o relevo da barra de cima cobria o topo do nome
    d.text((nx, ntop + 0.6 * cq), 'Craque', font=font('BarlowCondensed-ExtraBold.ttf', int(10.5 * cq)), fill='white', anchor='lt')
    spaced(nx, ntop + 11.5 * cq, 'ALA · NÍVEL 10', font('BarlowCondensed-Bold.ttf', int(3.8 * cq)), MUTED, 0.2 * 3.8 * cq)
    # faixa da patente
    spaced(CW / 2, wb - (0.135 * wh + (6.25 - 0.8 + lift) * cq) - 4.6 * cq, 'LENDA', font('BarlowCondensed-ExtraBold.ttf', int(3.9 * cq)), ACC, 0.35 * 3.9 * cq, anchor_center=True)
    # faixa das 3 estatísticas
    STATS_TOP = wb - bar_h
    d.rectangle((wl, STATS_TOP, wr_, wb), fill=BAR); d.rectangle((wl, STATS_TOP, wr_, STATS_TOP + 0.6 * cq), fill=ACC)
    inner_l, inner_r = wl + pad, wr_ - pad; colw = (inner_r - inner_l) / 3
    for k, (lab, val) in enumerate((('ATAQUE', 94), ('CRIAÇÃO', 87), ('DEFESA', 60))):
        cx = inner_l + colw * (k + 0.5); mid = STATS_TOP + (bar_h - (1 + lift) * cq) / 2
        if k: d.rectangle((inner_l + colw * k - 0.2 * cq, mid - 4.5 * cq, inner_l + colw * k + 0.2 * cq, mid + 4.5 * cq), fill=(255, 255, 255, 38))
        d.text((cx, mid + 2.2 * cq), str(val), font=font('BarlowCondensed-ExtraBold.ttf', int(7.6 * cq)), fill='white', anchor='ms')
        spaced(cx, mid + 3.0 * cq, lab, geist(int(2.7 * cq), 600), MUTED, 0.04 * 2.7 * cq, anchor_center=True)
    # selo do OVR (patente Lenda): pentágono com o degradê da Lenda, número e coroa
    sw, sh = 19 * cq, 24 * cq; sx1 = wr_ - (5.5 + 6.25) * cq; sx0 = sx1 - sw; sy0 = wt + (5 + 6.25) * cq
    CREST = (sx0, sy0, sw, sh)
    crest = np.zeros((int(sh), int(sw), 4), np.uint8); cy_, cx_ = np.mgrid[0:int(sh), 0:int(sw)]
    tg = np.clip((cx_ / sw * math.cos(math.radians(70)) + cy_ / sh * math.sin(math.radians(70))), 0, 1)
    stops = [(0, (255, 255, 255)), (0.4, (246, 183, 255)), (0.75, (159, 231, 255)), (1, (255, 244, 176))]
    for ch in range(3): crest[..., ch] = np.interp(tg, [s for s, _ in stops], [c[ch] for _, c in stops])
    inside = (cy_ <= 0.76 * sh) | (np.abs(cx_ - sw / 2) <= (sh - cy_) / (0.24 * sh) * sw / 2)
    crest[..., 3] = inside * 255
    ci = Image.fromarray(crest); cd = ImageDraw.Draw(ci)
    cd.text((sw / 2, 2.3 * cq + 7.3 * cq), '88', font=font('BarlowCondensed-ExtraBold.ttf', int(9 * cq)), fill=(11, 19, 15), anchor='ms')
    k0 = 2.3 * cq + 9.3 * cq; kw = 7 * cq; kx = sw / 2 - kw / 2
    cd.polygon([(kx, k0 + 3.2 * cq), (kx, k0), (kx + kw * 0.25, k0 + 1.6 * cq), (kx + kw / 2, k0 - 0.4 * cq), (kx + kw * 0.75, k0 + 1.6 * cq), (kx + kw, k0), (kx + kw, k0 + 3.2 * cq)], fill=(11, 19, 15))
    info.alpha_composite(ci, (int(sx0), int(sy0)))
    INFO_PATH = os.path.join(OUT, '_info.png'); info.save(INFO_PATH)

    def info_mat(name, emit=0.35, metal=0.0, rough=0.5):
        m, nt, b = new_mat(name)
        tx = nt.nodes.new('ShaderNodeTexImage'); tx.image = bpy.data.images.load(INFO_PATH, check_existing=True); tx.extension = 'CLIP'; tx.interpolation = 'Cubic'
        nt.links.new(tx.outputs['Color'], b.inputs['Base Color']); nt.links.new(tx.outputs['Alpha'], b.inputs['Alpha'])
        nt.links.new(tx.outputs['Color'], b.inputs['Emission Color']); b.inputs['Emission Strength'].default_value = emit
        b.inputs['Metallic'].default_value = metal; b.inputs['Roughness'].default_value = rough
        return m
    def card_uv(me):
        uvl = me.uv_layers.new(name='UV')
        for poly in me.polygons:
            for li in poly.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co; uvl.data[li].uv = ((co.x + W / 2) / W, (co.y + H / 2) / H)
    def cpx(px, py): return (px / S / 1000 * W - W / 2, H / 2 - py / S / 1400 * H)
    # camada plana (clarão, iniciais, degradê, barra do nome, patente) logo acima do fundo
    me = bpy.data.meshes.new('info'); x0, y0 = cpx(0, CH); x1, y1 = cpx(CW, 0)
    me.from_pydata([(x0, y0, 0), (x1, y0, 0), (x1, y1, 0), (x0, y1, 0)], [], [(0, 1, 2, 3)]); card_uv(me)
    lay = link(bpy.data.objects.new('info', me), rig); lay.location.z = T / 2 + 0.0015; me.materials.append(info_mat('info'))
    def slab(name, px0, py0, px1, py1, depth, mat, side_mat, outline=None):
        me = bpy.data.meshes.new(name); bm = bmesh.new()
        pts = outline or [(px0, py1), (px1, py1), (px1, py0), (px0, py0)]
        top = bm.faces.new([bm.verts.new((*cpx(px, py), depth)) for px, py in pts])
        ex = bmesh.ops.extrude_face_region(bm, geom=[top])
        for v in [e for e in ex['geom'] if isinstance(e, bmesh.types.BMVert)]: v.co.z = 0
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces: f.material_index = 0 if f.normal.z > 0.9 else 1
        bm.to_mesh(me); bm.free(); card_uv(me)
        ob = link(bpy.data.objects.new(name, me), rig); ob.location.z = T / 2 + 0.002
        me.materials.append(mat); me.materials.append(side_mat)
        bv = ob.modifiers.new('b', 'BEVEL'); bv.width = 0.004; bv.segments = 2; bv.limit_method = 'ANGLE'
        return ob
    gold_m, nt, gb = new_mat('ouro-velho'); gb.inputs['Base Color'].default_value = (0.79, 0.62, 0.32, 1); gb.inputs['Metallic'].default_value = 1; gb.inputs['Roughness'].default_value = 0.3
    # a faixa das estatísticas vira uma placa um pouco acima do fundo
    slab('estatisticas', wl, STATS_TOP, wr_, wb, 0.012, info_mat('info-placa', emit=0.45), gold_m)
    # o selo do OVR vira uma peça de metal com espessura (a moldura passa por cima de tudo, como no app)
    o = [(sx0, sy0), (sx0 + sw, sy0), (sx0 + sw, sy0 + 0.76 * sh), (sx0 + sw / 2, sy0 + sh), (sx0, sy0 + 0.76 * sh)]
    slab('selo-ovr', 0, 0, 0, 0, 0.035, info_mat('info-selo', emit=0.2, metal=0.55, rough=0.22), gold_m, outline=list(reversed(o)))

# ---------- cachos de esmeralda em 3D nos cantos de cima (vazam da carta) ----------
def crystal(length, radius, sides=6):
    me = bpy.data.meshes.new('cristal'); bm = bmesh.new()
    base = [bm.verts.new((radius * math.cos(2 * math.pi * i / sides), 0, radius * math.sin(2 * math.pi * i / sides))) for i in range(sides)]
    mid = [bm.verts.new((radius * 1.05 * math.cos(2 * math.pi * i / sides), length * 0.72, radius * 1.05 * math.sin(2 * math.pi * i / sides))) for i in range(sides)]
    tip = bm.verts.new((radius * 0.1, length, 0))
    bm.faces.new(list(reversed(base)))
    for i in range(sides):
        j = (i + 1) % sides
        bm.faces.new([base[i], base[j], mid[j], mid[i]]); bm.faces.new([mid[i], mid[j], tip])
    bm.to_mesh(me); bm.free(); return me

EMER = glass_mat('esmeralda', (0.01, 0.62, 0.2), emit=0.6)
def cluster(cx, cy, side, parent, n=7):
    hub = link(bpy.data.objects.new('cacho', None), parent); hub.location = (cx, cy, 0.09)
    for i in range(n):
        L = random.uniform(0.22, 0.48) * (1.2 if i == 0 else 1.0); r = L * random.uniform(0.16, 0.22)
        ob = link(bpy.data.objects.new('cristal', crystal(L, r)), hub)
        ob.data.materials.append(EMER)
        ang = math.radians(side * random.uniform(-10, 70) + (0 if side > 0 else 0))
        ob.rotation_euler = Euler((random.uniform(-0.5, 0.6), random.uniform(0, 6.28), -side * random.uniform(0.0, 1.1)), 'XYZ')
        ob.location = (random.uniform(-0.07, 0.07), random.uniform(-0.05, 0.05), random.uniform(-0.03, 0.05))
        ob.modifiers.new('b', 'BEVEL').width = 0.004
for side, px in ((-1, 95), (1, 905)):
    x, y = vaza_xy(px, 150); cluster(x, y, side, rig)

# ---------- círculo arcano atrás da carta ----------
bpy.ops.mesh.primitive_plane_add(size=1)
circ = bpy.context.active_object; circ.name = 'circulo'; circ.scale = (3.5, 3.5, 1); circ.location = (0, 0.05, -0.7)
bpy.ops.object.transform_apply(scale=True); circ.parent = rig
circ.data.materials.append(art_material('circulo', img('destino-circulo.webp'), metallic=0.8, rough=0.3, glow=7.0, bump=0.4))
for rr in (1.71, 1.255):
    bpy.ops.mesh.primitive_torus_add(major_radius=rr, minor_radius=0.022, major_segments=160, minor_segments=12, location=(0, 0.05, -0.71))
    t = bpy.context.active_object; t.parent = rig
    _, nt, b = new_mat('ouro'); b.inputs['Base Color'].default_value = (0.85, 0.62, 0.3, 1); b.inputs['Metallic'].default_value = 1; b.inputs['Roughness'].default_value = 0.25
    t.data.materials.append(bpy.data.materials[-1])
circ_spin = Euler((math.radians(-8), math.radians(14), 0), 'XYZ')

# ---------- runas de pedra (prisma hexagonal + a arte na frente) ----------
STONE = stone_mat('pedra'); RUNE = art_material('runa', img('destino-runa.webp'), metallic=0.1, rough=0.7, glow=8.0, bump=0.6)
def rune(x, y, z, size, rot):
    hub = link(bpy.data.objects.new('runa', None), rig); hub.location = (x, y, z); hub.rotation_euler = rot
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=size * 0.44, depth=size * 0.16, rotation=(0, 0, math.radians(90)))
    pr = bpy.context.active_object; pr.parent = hub; pr.data.materials.append(STONE)
    pr.modifiers.new('b', 'BEVEL').width = size * 0.02
    bpy.ops.mesh.primitive_plane_add(size=size, location=(0, 0, size * 0.081))
    fc = bpy.context.active_object; fc.parent = hub; fc.data.materials.append(RUNE)

def card_xy(fx, fy):           # posições em % da caixa da carta, como nos floaters do app
    return ((fx / 100 - 0.5) * W, (0.5 - fy / 100) * H)
for fx, fy, sz, z, rz in ((-9, 30, 0.58, 0.55, -8), (109, 60, 0.5, 0.35, 10), (-7, 84, 0.42, 0.25, 6), (107, 12, 0.4, 0.6, -12)):
    x, y = card_xy(fx, fy)
    rune(x, y, z, sz, Euler((math.radians(random.uniform(-15, 15)), math.radians(random.uniform(-25, 25)), math.radians(rz)), 'XYZ'))

# ---------- cacos de esmeralda soltos ----------
def shard(x, y, z, s):
    me = bpy.data.meshes.new('caco'); bm = bmesh.new()
    pts = [Vector((random.gauss(0, 0.5), random.gauss(0, 1.0), random.gauss(0, 0.35))) for _ in range(14)]
    for p in pts: bm.verts.new(p * s)
    bmesh.ops.convex_hull(bm, input=bm.verts); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new('caco', me), rig); ob.location = (x, y, z)
    ob.rotation_euler = (random.uniform(0, 6.3), random.uniform(0, 6.3), random.uniform(0, 6.3)); ob.data.materials.append(EMER)
for fx, fy, z, s in ((112, 86, 0.4, 0.09), (-14, 54, 0.3, 0.07), (50, -6, -0.2, 0.07), (-12, 8, -0.1, 0.05), (118, 36, -0.2, 0.05), (20, 104, 0.5, 0.05)):
    x, y = card_xy(fx, fy); shard(x, y, z, s)

# ---------- poeira verde ----------
DUST = emit_mat('poeira', (0.25, 1.0, 0.55), 18)
for _ in range(70):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(0.004, 0.011),
        location=(random.uniform(-2.0, 2.0), random.uniform(-2.2, 2.4), random.uniform(-0.9, 0.9)))
    d = bpy.context.active_object; d.data.materials.append(DUST); d.parent = rig

# ---------- pose da carta e câmera ----------
POSES = {'34': (math.radians(6), math.radians(-24), math.radians(2)),
         'front': (0, 0, 0),
         'low': (math.radians(-14), math.radians(18), math.radians(-3))}
rig.rotation_euler = POSES.get(VIEW, POSES['34'])
cam_data = bpy.data.cameras.new('cam'); cam_data.lens = 80
cam = link(bpy.data.objects.new('cam', cam_data)); cam.location = (0, 0.05, 10.2); scene.camera = cam
if 'zoom' in ARGS:                       # close para conferir detalhes: zoom=3 foca=x,y
    cam_data.lens *= float(ARGS['zoom']); fx, fy = (float(t) for t in ARGS.get('foca', '0,1.35').split(','))
    cam.location = (fx, fy, 10.2)
cam_data.dof.use_dof = True; cam_data.dof.focus_distance = 10.2; cam_data.dof.aperture_fstop = 2.2

# ---------- luz de estúdio em 4 pontos ----------
def area(name, loc, power, size, col, target=(0, 0, 0)):
    L = bpy.data.lights.new(name, 'AREA'); L.energy = power; L.size = size; L.color = col
    ob = link(bpy.data.objects.new(name, L)); ob.location = loc
    d = Vector(target) - Vector(loc); ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    ob.visible_camera = False
    return ob
area('principal', (-4.5, 3.5, 6.0), 1400, 2.5, (1.0, 0.96, 0.9))
area('preenchimento', (5.0, -1.0, 5.0), 260, 4.0, (0.75, 0.9, 1.0))
area('contraluz', (0.5, 4.5, -4.0), 1500, 2.5, (0.35, 1.0, 0.6))
area('rebote', (0.0, -5.0, 2.0), 180, 4.0, (0.4, 1.0, 0.65))
gl = bpy.data.lights.new('brilho', 'POINT'); gl.energy = 350; gl.color = (0.2, 1.0, 0.5); gl.shadow_soft_size = 0.6
link(bpy.data.objects.new('brilho', gl)).location = (0, 0.3, -1.2)

world = bpy.data.worlds.new('mundo'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.008, 0.006, 1)
if FOG:
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0)); fog = bpy.context.active_object; fog.scale = (9, 9, 6)
    m = bpy.data.materials.new('nevoa'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    v = nt.nodes.new('ShaderNodeVolumePrincipled'); v.inputs['Density'].default_value = 0.008; v.inputs['Color'].default_value = (0.7, 0.95, 0.8, 1); v.inputs['Anisotropy'].default_value = 0.4
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(v.outputs[0], o.inputs['Volume']); fog.data.materials.append(m)

# ---------- render ----------
r = scene.render; r.engine = 'CYCLES'; r.resolution_x = RX; r.resolution_y = RY; r.film_transparent = True
r.image_settings.file_format = 'PNG'; r.image_settings.color_mode = 'RGBA'
cy = scene.cycles; cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.max_bounces = 10; cy.transmission_bounces = 10; cy.volume_bounces = 1; cy.caustics_reflective = False; cy.caustics_refractive = False
setup_device(scene, ARGS)
scene.view_settings.view_transform = 'AgX'
try: scene.view_settings.look = 'AgX - Medium High Contrast'
except TypeError: pass
r.filepath = os.path.join(OUT, f'destino-{VIEW}.png')
bpy.ops.render.render(write_still=True)
print('ok', r.filepath, flush=True)
