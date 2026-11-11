import bpy, bmesh, math, sys, os, time, random
from mathutils import Vector
ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 270)); RES_Y = int(ARGS.get('ry', 480)); SAMPLES = int(ARGS.get('samples', 12)); OUT = ARGS.get('out', '/tmp/pk_out')
TIER = ARGS.get('tier', 'A'); MODE = ARGS.get('mode', 'anim'); _fr = ARGS.get('frames', '1')
TEXDIR = ARGS.get('texdir', '/tmp/claude-0/-home-user-peladApp/6e7ba169-6d28-5298-a24b-d3d6b3295bff/scratchpad/pk')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if '-' in _fr else [int(x) for x in _fr.split(',')])
TIER_RGB = {'A': (1.0, 0.82, 0.3), 'B': (0.72, 0.95, 0.24), 'C': (0.49, 0.83, 0.99), 'D': (0.83, 0.83, 0.85)}[TIER]
random.seed(3)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = 120; scene.render.fps = 30
def mat(n): m = bpy.data.materials.new(n); m.use_nodes = True; return m
def emis(n, col, k):
    m = mat(n); nt = m.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = k
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m, e

W, H, C, B = 2.1, 3.2, 0.26, 0.30          # largura, altura, faixa da solda, barriga
YT = H - C * 1.05                           # linha do rasgo
NX, NYB, NYS = 64, 96, 10
def jag(x):                                 # linha do rasgo irregular (a mesma no corpo e na tira)
    return 0.022 * math.sin(x * 23.0 + 0.7) + 0.014 * math.sin(x * 57.0 + 2.1) + 0.008 * math.sin(x * 131.0)
def ss(a, b, x):
    t = min(1.0, max(0.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def bulge(x, y):
    bx = max(0.0, 1 - (2 * x / W) ** 2) ** 0.75; by = max(0.0, 1 - (2 * (y - H / 2) / H) ** 2) ** 0.6
    return B * bx * by * ss(C * 0.5, C * 2.2, y) * ss(C * 0.5, C * 2.2, H - y)
def ridge(y):                                # solda com sulcos horizontais
    if y < C or y > H - C:
        e = min(y, H - y); return 0.011 * math.sin(2 * math.pi * y / 0.042) * ss(0.0, 0.05, e)
    return 0.0

class Panel:
    def __init__(self, name, kind, side):    # kind: 'body'|'strip'; side: +1 frente, -1 costas
        self.name, self.kind, self.side = name, kind, side
        self.ny = NYB if kind == 'body' else NYS
        self.base = []                       # (x, y) originais
        me = bpy.data.meshes.new(name); self.me = me
        verts = []; faces = []
        for j in range(self.ny):
            for i in range(NX):
                x = -W / 2 + W * i / (NX - 1); jt = YT + jag(x)
                y = jt * j / (self.ny - 1) if kind == 'body' else jt + (H - jt) * j / (self.ny - 1)
                self.base.append((x, y)); verts.append((x, y, 0.0))
        for j in range(self.ny - 1):
            for i in range(NX - 1):
                a = j * NX + i; faces.append((a, a + 1, a + 1 + NX, a + NX) if side > 0 else (a, a + NX, a + 1 + NX, a + 1))
        me.from_pydata(verts, [], faces); me.update()
        uv = me.uv_layers.new(name='UV')
        for poly in me.polygons:
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index; x, y = self.base[vi]; uv.data[li].uv = ((x + W / 2) / W, y / H)
        for p in me.polygons: p.use_smooth = True
        self.ob = bpy.data.objects.new(name, me); scene.collection.objects.link(self.ob)
    def update(self, tear_x, strip_t, mouth):
        co = []
        for (x, y) in self.base:
            if self.kind == 'body':
                z = bulge(x, y) + ridge(y) * 0.6
                # a boca abre depois do rasgo: o ar infla as duas faces perto do topo
                top = ss(YT - 0.9, YT, y)
                z += mouth * 0.17 * top * max(0.0, 1 - (2 * x / W) ** 2) ** 0.5
                px, py, pz = x, y, self.side * z
            else:
                z = 0.014 + bulge(x, y) * 0.0 + ridge(y)
                px, py, pz = x, y, self.side * z
                d = tear_x - x
                if d > 0.0 and strip_t < 0.5:         # parte já rasgada: gira em volta da frente do rasgo e sobe
                    ang = min(1.35, 0.32 + d * 0.95) * ss(0.0, 1.0, tear_progress)
                    hx = tear_x; px = hx - d * math.cos(ang); pz = self.side * z + d * math.sin(ang) * 0.9; py = y + d * 0.12 * ss(0, 1, tear_progress)
                    py += (y - YT) * 0.0
            co.extend((px, py, pz))
        self.me.vertices.foreach_set('co', co); self.me.update()

panels = [Panel('CorpoF', 'body', 1), Panel('CorpoT', 'body', -1), Panel('TiraF', 'strip', 1), Panel('TiraT', 'strip', -1)]
root = bpy.data.objects.new('Pacote', None); scene.collection.objects.link(root); wld = bpy.data.objects.new('Mundo', None); scene.collection.objects.link(wld)
for p in panels: p.ob.parent = root

# ---- materiais: papel metalizado impresso (frente) e folha lisa (costas)
def foil_front():
    m = mat('FolhaFrente'); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(f'{TEXDIR}/tex_{TIER}.png'); tex.image.colorspace_settings.name = 'sRGB'
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 9.0; nz.inputs['Detail'].default_value = 8.0; nz.inputs['Roughness'].default_value = 0.65
    nz2 = nt.nodes.new('ShaderNodeTexNoise'); nz2.inputs['Scale'].default_value = 160.0; nz2.inputs['Detail'].default_value = 3.0
    tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['Object'], nz.inputs['Vector']); nt.links.new(tc.outputs['Object'], nz2.inputs['Vector'])
    comb = nt.nodes.new('ShaderNodeMath'); comb.operation = 'ADD'; nt.links.new(nz.outputs['Fac'], comb.inputs[0]); nt.links.new(nz2.outputs['Fac'], comb.inputs[1]); comb.inputs[1].default_value = 0.0
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.35; bump.inputs['Distance'].default_value = 0.02
    mulb = nt.nodes.new('ShaderNodeMath'); mulb.operation = 'MULTIPLY'; mulb.inputs[1].default_value = 0.5; nt.links.new(nz.outputs['Fac'], mulb.inputs[0])
    nt.links.new(mulb.outputs[0], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Metallic'].default_value = 0.72; b.inputs['Roughness'].default_value = 0.26
    b.inputs['Coat Weight'].default_value = 0.5; b.inputs['Coat Roughness'].default_value = 0.08
    return m
def foil_back():
    m = mat('FolhaCostas'); nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (TIER_RGB[0] * 0.55, TIER_RGB[1] * 0.55, TIER_RGB[2] * 0.55, 1); b.inputs['Metallic'].default_value = 0.95; b.inputs['Roughness'].default_value = 0.22
    nz = nt.nodes.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 12.0; nz.inputs['Detail'].default_value = 8.0
    tc = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tc.outputs['Object'], nz.inputs['Vector'])
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.4; bump.inputs['Distance'].default_value = 0.02
    nt.links.new(nz.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal']); return m
mf, mb = foil_front(), foil_back()
for p in panels: p.ob.data.materials.append(mf if p.side > 0 else mb)

# ---- interior (luz saindo da boca) e as cartas
gm, ge = emis('Brilho', (*TIER_RGB, 1.0), 0.0)
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0, 3.4)); glow = bpy.context.active_object; glow.scale = (W * 0.85, 0.5, 1); glow.data.materials.append(gm); glow.parent = wld; glow.visible_camera = False
cm = mat('CartaCosta'); cb = cm.node_tree.nodes['Principled BSDF']; cb.inputs['Base Color'].default_value = (0.02, 0.03, 0.08, 1); cb.inputs['Roughness'].default_value = 0.2; cb.inputs['Metallic'].default_value = 0.4
bm_ = mat('CartaBorda'); bb = bm_.node_tree.nodes['Principled BSDF']; bb.inputs['Base Color'].default_value = (*TIER_RGB, 1.0); bb.inputs['Metallic'].default_value = 1.0; bb.inputs['Roughness'].default_value = 0.2
cards = []
for k in range(4):
    bpy.ops.mesh.primitive_cube_add(size=1); cd = bpy.context.active_object; cd.scale = (1.5, 0.018, 2.1); cd.data.materials.append(cm)
    bpy.ops.mesh.primitive_cube_add(size=1); br = bpy.context.active_object; br.scale = (1.58, 0.012, 2.18); br.data.materials.append(bm_)
    cd.parent = wld; br.parent = wld; cards.append((cd, br))

# ---- estúdio: piso de espelho escuro, softboxes e luz de contorno
fm = mat('Piso'); fb = fm.node_tree.nodes['Principled BSDF']; fb.inputs['Base Color'].default_value = (0.012, 0.013, 0.02, 1); fb.inputs['Roughness'].default_value = 0.13
bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, -0.02)); fl = bpy.context.active_object; fl.data.materials.append(fm)
if MODE == 'still': fl.is_shadow_catcher = True
def area(n, loc, tgt, e, size, col, shape='RECTANGLE', sy=None):
    a = bpy.data.lights.new(n, 'AREA'); a.energy = e; a.size = size; a.color = col; a.shape = shape
    if sy: a.size_y = sy
    o = bpy.data.objects.new(n, a); o.location = loc; o.rotation_euler = (Vector(tgt) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); scene.collection.objects.link(o); return a, o
area('Chave', (-4.0, -5.0, 5.0), (0, 0, 1.8), 1100, 3.5, (1.0, 0.93, 0.82), sy=5.0)
area('Rim', (4.5, 3.5, 3.0), (0, 0, 1.6), 900, 2.0, (0.6, 0.75, 1.0), sy=4.5)
area('Topo', (0, -1.5, 7.0), (0, 0, 1.6), 600, 4.0, (1.0, 1.0, 1.0))
inner_l = bpy.data.lights.new('Interior', 'POINT'); inner_l.energy = 0; inner_l.color = TIER_RGB; inner_l.shadow_soft_size = 0.3
io = bpy.data.objects.new('Interior', inner_l); io.location = (0, 0.0, 3.3); scene.collection.objects.link(io); io.parent = wld

bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 4, 3)); vb = bpy.context.active_object; vb.scale = (14, 14, 9); vb.display_type = 'WIRE'
vm = mat('Neblina'); vn = vm.node_tree; vn.nodes.clear(); vs = vn.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = 0.006; vs.inputs['Anisotropy'].default_value = 0.5
vo = vn.nodes.new('ShaderNodeOutputMaterial'); vn.links.new(vs.outputs[0], vo.inputs['Volume']); vb.data.materials.append(vm)

cam = bpy.data.cameras.new('Cam'); cam.lens = 55; cam.dof.use_dof = True; cam.dof.aperture_fstop = 4.0
co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
CAM_TGT = Vector((0, 0, 1.75))

tear_progress = 0.0
def state(f):
    """Linha do tempo do pacote (quadros de 1 a 120)."""
    global tear_progress
    t = {}
    t['tear_p'] = ss(22, 58, f)                         # o rasgo corre da esquerda para a direita
    tear_progress = ss(14, 40, f)
    t['tear_x'] = -W / 2 - 0.05 + (W + 0.1) * t['tear_p']
    t['strip_free'] = ss(64, 66, f)                      # a tira solta voa
    t['mouth'] = ss(40, 70, f) * (1 + 0.15 * math.sin(f * 0.5)) if f > 40 else 0.0
    t['cards'] = ss(66, 108, f)
    t['glow'] = ss(52, 76, f)
    return t

def apply(f):
    s = state(f)
    for p in panels:
        if p.kind == 'strip' and s['strip_free'] > 0:
            # solta: translação/rotação rígida a partir do estado quase todo rasgado
            p.update(W, 0.0, 0.0)
            q = s['strip_free']; tt = (f - 64) / 34.0
            p.ob.location = (0.8 * tt * 4.0, 0.0 + 1.6 * tt + (-3.0) * tt * tt * 0.5, 1.2 * tt * 3.0)
            p.ob.rotation_euler = (0.5 * tt * 6.0, 0.4 * tt * 5.0, 0.9 * tt * 7.0)
            p.ob.hide_render = tt > 1.1
        else:
            p.ob.location = (0, 0, 0); p.ob.rotation_euler = (0, 0, 0); p.ob.hide_render = False
            p.update(s['tear_x'], 0.0, s['mouth'] if p.kind == 'body' else 0.0)
    ge.inputs['Strength'].default_value = 90.0 * s['glow'] if MODE != 'still' else 0.0
    inner_l.energy = 2600.0 * s['glow'] if MODE != 'still' else 0.0
    rise = s['cards']
    for k, (cd, br) in enumerate(cards):
        y = YT - 1.6 + (0.65 + 0.07 * k) * rise * 2.0 + k * 0.0; x = 0.0; z = -0.05 + k * 0.035 - 0.07
        cd.location = (x, z, y + 1.05); br.location = (x, z + 0.014, y + 1.05)
        cd.hide_render = br.hide_render = rise <= 0.001
    # pairar/balançar do pacote
    if MODE == 'still': root.rotation_euler = (math.pi / 2, 0, math.radians(-14)); root.location = (0, 0, 0.12)
    else:
        sh = (math.sin(f * 1.9) * 0.012 * ss(22, 40, f) * (1 - ss(58, 66, f)))
        root.rotation_euler = (math.pi / 2 + 0.04 * math.sin(f * 0.04) + sh, 0.0, math.radians(-4 + 3 * math.sin(f * 0.03))); root.location = (0, 0, 0.15 + 0.03 * math.sin(f * 0.07) + sh)
    # câmera (empurra para perto no rasgo)
    k = ss(1, 70, f)
    co.location = (0.2 * math.sin(f * 0.02), -(8.6 - 1.6 * k), 2.1 - 0.15 * k); co.rotation_euler = (CAM_TGT - co.location).to_track_quat('-Z', 'Y').to_euler()
    cam.dof.focus_distance = (CAM_TGT - co.location).length

if MODE == 'still':
    co.location = (0, -9.0, 2.2); co.rotation_euler = (CAM_TGT - co.location).to_track_quat('-Z', 'Y').to_euler(); cam.dof.use_dof = False; cam.lens = 50
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03
cy.max_bounces = 7; cy.volume_bounces = 1; cy.sample_clamp_indirect = 10.0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.image_settings.file_format = 'PNG'
if MODE == 'still': scene.render.film_transparent = True; scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.exposure = -0.3
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.005, 0.012, 1)
os.makedirs(OUT, exist_ok=True)
for f in FRAMES:
    apply(f); scene.frame_set(f); scene.render.filepath = f'{OUT}/p_{f:04d}.png'; t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', f, round(time.time() - t1, 1), flush=True)
