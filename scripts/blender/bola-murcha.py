"""Bola Murcha: uma bola de futsal velha, meio vazia e amassada, entra quicando sem força, rola devagar, desliza e para
murcha num piso escuro, sob uma luz fria e apagada (zoeira da rodada, 3 s, 9:16, 30 fps). A carta entra por cima no app.

    python bola-murcha.py -- frames=1-90 rx=720 ry=1280 samples=24 out=/tmp/saida
"""
import bpy, bmesh, math, sys, os, time, random
from mathutils import Vector, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device

ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--') + 1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 270)); RES_Y = int(ARGS.get('ry', 480)); SAMPLES = int(ARGS.get('samples', 8)); OUT = ARGS.get('out', '/tmp/bm_out'); _fr = ARGS.get('frames', '1')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if '-' in _fr else [int(x) for x in _fr.split(',')])
random.seed(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene; scene.frame_start = 1; scene.frame_end = 90; scene.render.fps = 30
R = 0.105  # raio da bola de futsal (~21 cm)


def mat(n):
    m = bpy.data.materials.new(n); m.use_nodes = True; return m


# ---------- piso: quadra escura, gasta, com uma linha pintada apagada ----------
fm = mat('Piso'); nt = fm.node_tree; f = nt.nodes['Principled BSDF']
tc = nt.nodes.new('ShaderNodeTexCoord')
n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 6.0; n1.inputs['Detail'].default_value = 10
rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.35; rp.color_ramp.elements[0].color = (0.010, 0.011, 0.014, 1)
rp.color_ramp.elements[1].position = 0.75; rp.color_ramp.elements[1].color = (0.03, 0.032, 0.036, 1)
nt.links.new(tc.outputs['Object'], n1.inputs['Vector']); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac'])
# linha branca gasta (faixa em x = -0.55), misturada com o piso pelo ruído
sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
ab = nt.nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'
sub = nt.nodes.new('ShaderNodeMath'); sub.operation = 'ADD'; sub.inputs[1].default_value = -1.15
nt.links.new(sep.outputs['Y'], sub.inputs[0]); nt.links.new(sub.outputs[0], ab.inputs[0])
lt = nt.nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = 0.025; nt.links.new(ab.outputs[0], lt.inputs[0])
n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 22.0; n2.inputs['Detail'].default_value = 6; nt.links.new(tc.outputs['Object'], n2.inputs['Vector'])
gs = nt.nodes.new('ShaderNodeMath'); gs.operation = 'GREATER_THAN'; gs.inputs[1].default_value = 0.36; nt.links.new(n2.outputs['Fac'], gs.inputs[0])
ml = nt.nodes.new('ShaderNodeMath'); ml.operation = 'MULTIPLY'; ml.inputs[2].default_value = 0; nt.links.new(lt.outputs[0], ml.inputs[0]); nt.links.new(gs.outputs[0], ml.inputs[1])
mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.inputs[7].default_value = (0.075, 0.08, 0.085, 1)
nt.links.new(ml.outputs[0], mix.inputs['Factor']); nt.links.new(rp.outputs[0], mix.inputs[6]); 
# o piso some no escuro longe da bola (sem horizonte no quadro)
vl = nt.nodes.new('ShaderNodeVectorMath'); vl.operation = 'LENGTH'; nt.links.new(tc.outputs['Object'], vl.inputs[0])
fd = nt.nodes.new('ShaderNodeMapRange'); fd.inputs['From Min'].default_value = 0.9; fd.inputs['From Max'].default_value = 2.6; fd.inputs['To Min'].default_value = 1.0; fd.inputs['To Max'].default_value = 0.0
nt.links.new(vl.outputs['Value'], fd.inputs['Value'])
dk = nt.nodes.new('ShaderNodeMix'); dk.data_type = 'RGBA'; dk.inputs[6].default_value = (0.0, 0.0, 0.0, 1)
nt.links.new(fd.outputs[0], dk.inputs['Factor']); nt.links.new(mix.outputs[2], dk.inputs[7]); nt.links.new(dk.outputs[2], f.inputs['Base Color'])
nt.links.new(fd.outputs[0], f.inputs['Specular IOR Level'])
rr = nt.nodes.new('ShaderNodeMapRange'); rr.inputs['To Min'].default_value = 0.45; rr.inputs['To Max'].default_value = 0.85
nt.links.new(n1.outputs['Fac'], rr.inputs['Value']); nt.links.new(rr.outputs[0], f.inputs['Roughness'])
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0)); bpy.context.active_object.data.materials.append(fm)

# ---------- a bola: icosfera com gomos pretos, um amassado grande e rugas ----------
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=6, radius=R, location=(0, 0, 0)); ball = bpy.context.active_object; ball.name = 'Bola'
me = ball.data
PHI = (1 + 5 ** 0.5) / 2
ico = [Vector(v).normalized() for v in ((0, 1, PHI), (0, -1, PHI), (0, 1, -PHI), (0, -1, -PHI), (1, PHI, 0), (-1, PHI, 0), (1, -PHI, 0), (-1, -PHI, 0),
                                        (PHI, 0, 1), (-PHI, 0, 1), (PHI, 0, -1), (-PHI, 0, -1))]
# gomos pentagonais: dentro do pentágono em volta de cada vértice do icosaedro (as 5 arestas apontam para os vizinhos)
neigh = [[w for w in ico if 0.3 < c.dot(w) < 0.99] for c in ico]


PENT_IN = math.radians(16.1)  # raio interno do pentágono (icosaedro truncado)


def in_pentagon(d):
    c = max(range(12), key=lambda i: d.dot(ico[i]))
    v = ico[c]
    theta = math.acos(max(-1.0, min(1.0, d.dot(v))))
    if theta > math.radians(21):
        return False
    p = d - v * d.dot(v)
    if p.length < 1e-6:
        return True
    p.normalize()
    # os vértices do pentágono apontam para os vizinhos no icosaedro
    beta = min(math.acos(max(-1.0, min(1.0, p.dot((w - v * w.dot(v)).normalized())))) for w in neigh[c])
    return theta < PENT_IN / math.cos(math.radians(36) - beta)


DENT = Vector((0.35, -0.75, 0.55)).normalized()  # o amassado grande (fica virado para a câmera no fim)
DENT2 = Vector((-0.8, 0.2, -0.3)).normalized()
for v in me.vertices:
    n = v.co.normalized()
    k = 1.0
    t = n.dot(DENT)
    if t > 0.45:
        k -= 0.42 * ((t - 0.45) / 0.55) ** 1.3  # amassado côncavo
    t2 = n.dot(DENT2)
    if t2 > 0.6:
        k -= 0.16 * ((t2 - 0.6) / 0.4) ** 1.3
    k += 0.022 * noise.noise(n * 4.5) + 0.010 * noise.noise(n * 11.0)  # rugas da bola vazia
    v.co = n * R * k
bm = bmesh.new(); bm.from_mesh(me)
col = bm.loops.layers.color.new('Gomos')
for face in bm.faces:
    d = face.calc_center_median().normalized()
    dark = in_pentagon(d)
    for loop in face.loops:
        loop[col] = (1, 1, 1, 1) if dark else (0, 0, 0, 1)
bm.to_mesh(me); bm.free()
for p in me.polygons:
    p.use_smooth = True

bmm = mat('Couro'); nt = bmm.node_tree; b = nt.nodes['Principled BSDF']
at = nt.nodes.new('ShaderNodeVertexColor'); at.layer_name = 'Gomos'
tcb = nt.nodes.new('ShaderNodeTexCoord')
dn = nt.nodes.new('ShaderNodeTexNoise'); dn.inputs['Scale'].default_value = 28.0; dn.inputs['Detail'].default_value = 8
nt.links.new(tcb.outputs['Object'], dn.inputs['Vector'])
dirt = nt.nodes.new('ShaderNodeValToRGB'); dirt.color_ramp.elements[0].position = 0.4; dirt.color_ramp.elements[0].color = (0.30, 0.27, 0.22, 1)
dirt.color_ramp.elements[1].position = 0.7; dirt.color_ramp.elements[1].color = (0.52, 0.50, 0.45, 1)
nt.links.new(dn.outputs['Fac'], dirt.inputs['Fac'])
mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[7].default_value = (0.035, 0.035, 0.038, 1)
nt.links.new(at.outputs['Color'], mx.inputs['Factor']); nt.links.new(dirt.outputs[0], mx.inputs[6]); nt.links.new(mx.outputs[2], b.inputs['Base Color'])
b.inputs['Roughness'].default_value = 0.62
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.25; bump.inputs['Distance'].default_value = 0.002
nt.links.new(dn.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
me.materials.append(bmm)

# hierarquia: Pos (desloca e quica) -> Amasso (achata no mundo, não gira) -> Bola (gira)
pos = bpy.data.objects.new('Pos', None); scene.collection.objects.link(pos)
sq = bpy.data.objects.new('Amasso', None); scene.collection.objects.link(sq); sq.parent = pos
ball.parent = sq; ball.location = (0, 0, R * 0.93)

# ---------- movimento ----------
# x (da direita para o centro), altura do chão, achatamento (z do Amasso), giro acumulado
KEYS = [  # quadro, x, z, amasso
    (1, 0.62, 0.26, 1.00),
    (11, 0.40, 0.00, 0.76),
    (13, 0.375, 0.00, 0.88),
    (21, 0.27, 0.06, 0.97),
    (28, 0.19, 0.00, 0.80),
    (30, 0.175, 0.00, 0.90),
    (35, 0.135, 0.013, 0.95),
    (40, 0.10, 0.00, 0.85),
    (43, 0.085, 0.00, 0.90),
]
for fr_, x, z, s in KEYS:
    pos.location = (x, 0, z); pos.keyframe_insert('location', frame=fr_)
    sq.scale = (1 + (1 - s) * 0.55, 1 + (1 - s) * 0.55, s); sq.keyframe_insert('scale', frame=fr_)
# rola cada vez mais devagar e desliza no fim (o giro para antes do deslocamento)
for fr_, x in ((52, 0.045), (62, 0.018), (72, 0.005), (80, 0.0)):
    pos.location = (x, 0, 0); pos.keyframe_insert('location', frame=fr_)
# murcha de vez: arria e espalha no chão, com um balanço que morre
for fr_, s in ((52, 0.88), (60, 0.81), (66, 0.75), (71, 0.78), (77, 0.735), (83, 0.745), (90, 0.74)):
    sq.scale = (1 + (1 - s) * 0.55, 1 + (1 - s) * 0.55, s); sq.keyframe_insert('scale', frame=fr_)

# giro: ângulo = distância / raio (gira em torno de y, rolando para a esquerda); o fim desliza: giro de ~70% do caminho
ROT = {}
for fr_ in range(1, 91):
    scene.frame_set(fr_); ROT[fr_] = pos.matrix_world.translation.x
x0 = ROT[1]
for fr_ in range(1, 91, 2):
    dist = x0 - ROT[fr_]
    slide = min(1.0, max(0.0, (fr_ - 50) / 30.0))
    ball.rotation_euler = (0.25 * math.sin(fr_ * 0.21) * (1 - slide), -(dist / R) * (1 - 0.25 * slide) + 0.0, 0.0)
    ball.keyframe_insert('rotation_euler', frame=fr_)
# o amassado termina virado para a câmera: gira a malha (não a animação) para isso
want = Vector((0.15, -0.8, 0.58)).normalized()
scene.frame_set(90); r_end = ball.rotation_euler.to_matrix()
q = DENT.rotation_difference((r_end.inverted() @ want).normalized())
me.transform(q.to_matrix().to_4x4()); me.update()

# ---------- luz fria e apagada ----------
def area(n, loc, e, size, col, aim=(0, 0, 0)):
    a = bpy.data.lights.new(n, 'AREA'); a.energy = e; a.size = size; a.color = col
    o = bpy.data.objects.new(n, a); o.location = loc; scene.collection.objects.link(o)
    o.rotation_euler = (Vector(aim) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); return a, o


sp = bpy.data.lights.new('Lampada', 'SPOT'); sp.spot_size = math.radians(42); sp.spot_blend = 0.9; sp.color = (0.72, 0.84, 1.0); sp.shadow_soft_size = 0.25
spo = bpy.data.objects.new('Lampada', sp); spo.location = (0.05, 0.25, 2.6); scene.collection.objects.link(spo)
spo.rotation_euler = (Vector((0.05, 0, 0)) - spo.location).to_track_quat('-Z', 'Y').to_euler()
# lâmpada cansada: tremelica e fica um pouco mais fraca quando a bola para
for fr_, v in ((1, 150.0), (20, 150.0), (21, 95.0), (22, 150.0), (60, 145.0), (74, 145.0), (75, 70.0), (76, 130.0), (77, 85.0), (80, 120.0), (90, 120.0)):
    sp.energy = v; sp.keyframe_insert('energy', frame=fr_)
fill, _ = area('Preench', (-1.6, -1.4, 0.9), 6.0, 2.5, (0.55, 0.62, 0.8), (0, 0, 0.1))
rim, rimo = area('Contra', (0.6, 1.8, 0.6), 9.0, 1.5, (0.6, 0.75, 1.0), (0, 0, 0.1))
# preenchimento e contraluz só iluminam a bola (light linking): no piso, só a poça da lâmpada, sem horizonte claro
so_ball = bpy.data.collections.new('SoBola'); so_ball.objects.link(ball)
for o in (bpy.data.objects['Preench'], rimo):
    o.light_linking.receiver_collection = so_ball

# ---------- câmera: baixa, perto do chão, olhando a bola parar ----------
cam = bpy.data.cameras.new('Cam'); cam.lens = 50; cam.dof.use_dof = True; cam.dof.aperture_fstop = 2.8; cam.sensor_fit = 'VERTICAL'; cam.sensor_height = 36
co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
cam.shift_y = float(ARGS.get('shift', 0.18))
tgt = Vector((0.0, 0, 0.06))
for fr_ in range(1, 91, 3):
    t = (fr_ - 1) / 89.0; e = 1 - (1 - t) ** 3
    co.location = Vector((0.03 * (1 - e), -1.55 + 0.12 * e, 0.92 - 0.06 * e))
    co.rotation_euler = (tgt - co.location).to_track_quat('-Z', 'Y').to_euler(); co.keyframe_insert('location', frame=fr_); co.keyframe_insert('rotation_euler', frame=fr_)
cam.dof.focus_object = ball

# ---------- render ----------
scene.render.engine = 'CYCLES'; cy = scene.cycles; setup_device(scene, ARGS); cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.max_bounces = 4; cy.sample_clamp_indirect = 6.0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.image_settings.file_format = 'PNG'
scene.render.use_motion_blur = True; scene.render.motion_blur_shutter = 0.4
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'AgX - Base Contrast'; scene.view_settings.exposure = 0.0
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.005, 0.008, 1)
os.makedirs(OUT, exist_ok=True)
for fr_ in FRAMES:
    p = f'{OUT}/b_{fr_:04d}.png'
    if os.path.exists(p) and ARGS.get('skip', '1') == '1':
        continue
    scene.frame_set(fr_); scene.render.filepath = p; t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', fr_, round(time.time() - t1, 1), flush=True)
