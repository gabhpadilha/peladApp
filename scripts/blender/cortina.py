import bpy, bmesh, math, sys, os, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from render_device import setup_device

ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 270)); RES_Y = int(ARGS.get('ry', 480)); SAMPLES = int(ARGS.get('samples', 16))
OUT = ARGS.get('out', '/tmp/bl_out'); _fr = ARGS.get('frames')
FRAMES = (list(range(int(_fr.split('-')[0]), int(_fr.split('-')[1]) + 1)) if _fr and '-' in _fr else ([int(f) for f in _fr.split(',')] if _fr else None))
BAKE_ONLY = ARGS.get('bake') == '1'
# alpha=1: só a cortina, o varal e o bandô, com fundo transparente (o palco do app aparece pelo vão de verdade).
ALPHA = ARGS.get('alpha') == '1'

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start = 1; scene.frame_end = 150; scene.render.fps = 30

# ---------- pano (cortina) ----------
N, M = 72, 90            # colunas x linhas da malha
FAB_W, FAB_H = 6.2, 5.4  # largura do tecido (x ~1.9 de franzido) e altura
TOP_Y = 2.9
CLOSED_SPAN, OPEN_A, OPEN_B = 3.45, 1.55, 2.35

def make_panel(name, side):
    bm = bmesh.new()
    verts = []
    for j in range(M):
        row = []
        for i in range(N):
            x = side * FAB_W * i / (N - 1)
            z = TOP_Y - FAB_H * j / (M - 1)
            row.append(bm.verts.new((x, 0.0, z)))
        verts.append(row)
    for j in range(M - 1):
        for i in range(N - 1):
            if side > 0: bm.faces.new((verts[j][i], verts[j][i+1], verts[j+1][i+1], verts[j+1][i]))
            else: bm.faces.new((verts[j][i], verts[j+1][i], verts[j+1][i+1], verts[j][i+1]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scene.collection.objects.link(ob)
    # grupo de fixação: linha de cima
    vg = ob.vertex_groups.new(name='pin')
    vg.add([i for i in range(N)], 1.0, 'REPLACE')   # primeira linha = índices 0..N-1
    # shape keys: Basis (largo) / Closed (topo comprimido) / Open (topo reunido)
    ob.shape_key_add(name='Basis')
    closed = ob.shape_key_add(name='Closed'); closed.vertex_group = 'pin'
    opened = ob.shape_key_add(name='Open'); opened.vertex_group = 'pin'
    for i in range(N):
        t = i / (N - 1)
        closed.data[i].co.x = side * CLOSED_SPAN * t * (1.0 if side > 0 else 1.0)
        opened.data[i].co.x = side * (OPEN_A + (OPEN_B - OPEN_A) * t) if side else 0
    # abrir: o lado do centro (t=0) vai para OPEN_A, o de fora para OPEN_B
    for i in range(N):
        t = i / (N - 1)
        opened.data[i].co.x = side * (OPEN_A + (OPEN_B - OPEN_A) * t)
        closed.data[i].co.x = side * (0.02 + (CLOSED_SPAN - 0.02) * t)
    ob.shape_key_add  # noqa
    sk = ob.data.shape_keys
    sk.key_blocks['Closed'].value = 0.0; sk.key_blocks['Open'].value = 0.0
    return ob

panels = [make_panel('PanoE', -1), make_panel('PanoD', 1)]
coll = bpy.data.collections.new('Panos'); scene.collection.children.link(coll)
for _o in panels:
    scene.collection.objects.unlink(_o); coll.objects.link(_o)

def keyframe(ob, key, frame, value, interp='BEZIER'):
    kb = ob.data.shape_keys.key_blocks[key]; kb.value = value; kb.keyframe_insert('value', frame=frame)

for ob in panels:
    # 1-40: o tecido se junta para o varal (cria as dobras); 40-70 assenta; 70-110 abre; 110-150 respira
    keyframe(ob, 'Closed', 1, 0.0); keyframe(ob, 'Closed', 40, 1.0); keyframe(ob, 'Closed', 70, 1.0)
    keyframe(ob, 'Open', 1, 0.0); keyframe(ob, 'Open', 70, 0.0); keyframe(ob, 'Open', 112, 1.0)
    # com Open=1 e Closed=1 os dois valores se somam; zeramos o Closed na abertura
    keyframe(ob, 'Closed', 112, 0.0)
    for fc in ob.data.shape_keys.animation_data.action.fcurves if hasattr(ob.data.shape_keys.animation_data.action,'fcurves') else []:
        for kp in fc.keyframe_points: kp.interpolation = 'BEZIER'
    cl = ob.modifiers.new('Cloth', 'CLOTH'); s = cl.settings; c = cl.collision_settings
    s.quality = 7; s.mass = 0.45; s.tension_stiffness = 22; s.compression_stiffness = 22; s.shear_stiffness = 12; s.bending_stiffness = 0.9
    s.tension_damping = 6; s.compression_damping = 6; s.shear_damping = 4; s.bending_damping = 0.6; s.air_damping = 1.6
    s.vertex_group_mass = 'pin'; s.pin_stiffness = 1.0
    s.use_pressure = False
    s.shrink_min = 0.0
    c.use_collision = True; c.collection = coll; c.distance_min = 0.02; c.use_self_collision = True; c.self_distance_min = 0.012; c.self_friction = 5; c.collision_quality = 3
    s.rest_shape_key = ob.data.shape_keys.key_blocks['Basis']
    cl.point_cache.frame_start = 1; cl.point_cache.frame_end = 150
    sub = ob.modifiers.new('Sub', 'SUBSURF'); sub.levels = 1; sub.render_levels = 2
    for p in ob.data.polygons: p.use_smooth = True

# ---------- material: veludo ----------
def velvet():
    m = bpy.data.materials.new('Veludo'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (0.16, 0.004, 0.02, 1)
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Sheen Weight'].default_value = 1.0
    bsdf.inputs['Sheen Roughness'].default_value = 0.35
    bsdf.inputs['Sheen Tint'].default_value = (0.95, 0.18, 0.3, 1)
    bsdf.inputs['Coat Weight'].default_value = 0.0
    # trama: ruído fino de relevo
    tc = nt.nodes.new('ShaderNodeTexCoord'); noise = nt.nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 900; noise.inputs['Detail'].default_value = 6
    bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.08; bump.inputs['Distance'].default_value = 0.002
    nt.links.new(tc.outputs['Object'], noise.inputs['Vector']); nt.links.new(noise.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    # escurece as dobras profundas (oclusão) pela Ambient Occlusion do Cycles
    ao = nt.nodes.new('ShaderNodeAmbientOcclusion'); ao.inputs['Distance'].default_value = 0.25
    mix = nt.nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'; mix.inputs[0].default_value = 1.0
    nt.links.new(ao.outputs['Color'], mix.inputs[7]); mix.inputs[6].default_value = (0.16, 0.004, 0.02, 1)
    nt.links.new(mix.outputs[2], bsdf.inputs['Base Color'])
    nt.links.new(bsdf.outputs[0], out.inputs[0]); return m
vm = velvet()
for ob in panels: ob.data.materials.append(vm)

gold = bpy.data.materials.new('Ouro'); gold.use_nodes = True
g = gold.node_tree.nodes['Principled BSDF']; g.inputs['Base Color'].default_value = (0.9, 0.62, 0.18, 1); g.inputs['Metallic'].default_value = 1.0; g.inputs['Roughness'].default_value = 0.22
# varal + pontas
bpy.ops.mesh.primitive_cylinder_add(radius=0.05, depth=7.2, location=(0, -0.02, TOP_Y + 0.02), rotation=(0, math.pi/2, 0)); rod = bpy.context.active_object; rod.data.materials.append(gold)
for x in (-3.65, 3.65):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.12, location=(x, -0.02, TOP_Y + 0.02)); o = bpy.context.active_object; o.data.materials.append(gold)
# bandô (pano de cima)
bpy.ops.mesh.primitive_grid_add(x_subdivisions=200, y_subdivisions=14, size=1); pel = bpy.context.active_object
pel.scale = (7.4, 0.55, 1); pel.location = (0, -0.1, TOP_Y - 0.28); pel.rotation_euler = (math.pi/2, 0, 0)
bpy.ops.object.transform_apply(scale=True, rotation=True)
me = pel.data
for v in me.vertices:
    v.co.y += 0.045*math.sin(v.co.x*9.5) + 0.02*math.sin(v.co.x*23.0)   # profundidade (eixo Y local após rotação)
    v.co.z -= 0.05 * abs(math.sin(v.co.x*4.2))**0.6 * (0.28 - v.co.z + pel.location.z) if False else 0
me.update(); pel.data.materials.append(vm)
for p in me.polygons: p.use_smooth = True
bpy.ops.mesh.primitive_cylinder_add(radius=0.016, depth=7.4, location=(0, -0.16, TOP_Y - 0.56), rotation=(0, math.pi/2, 0)); fr = bpy.context.active_object; fr.data.materials.append(gold)

# ---------- palco ----------
fm = bpy.data.materials.new('Piso'); fm.use_nodes = True; f = fm.node_tree.nodes['Principled BSDF']; f.inputs['Base Color'].default_value = (0.012, 0.012, 0.02, 1); f.inputs['Roughness'].default_value = 0.14; f.inputs['Metallic'].default_value = 0.0
bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 8, -2.4)); fl = bpy.context.active_object; fl.data.materials.append(fm)
bm2 = bpy.data.materials.new('Fundo'); bm2.use_nodes = True; nt = bm2.node_tree; nt.nodes.clear()
em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = 1.0; out = nt.nodes.new('ShaderNodeOutputMaterial')
grad = nt.nodes.new('ShaderNodeTexGradient'); tcn = nt.nodes.new('ShaderNodeTexCoord'); ramp = nt.nodes.new('ShaderNodeValToRGB')
ramp.color_ramp.elements[0].color = (0.05, 0.03, 0.06, 1); ramp.color_ramp.elements[1].color = (0.003, 0.004, 0.012, 1)
mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Rotation'].default_value = (0, math.pi/2, 0)
nt.links.new(tcn.outputs['Generated'], mp.inputs['Vector']); nt.links.new(mp.outputs[0], grad.inputs['Vector']); nt.links.new(grad.outputs['Fac'], ramp.inputs['Fac']); nt.links.new(ramp.outputs[0], em.inputs['Color']); nt.links.new(em.outputs[0], out.inputs[0])
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 16, 5), rotation=(math.pi/2, 0, 0)); bk = bpy.context.active_object; bk.data.materials.append(bm2)

# ---------- luzes ----------
def area(name, loc, rot, energy, size, color, shape='RECTANGLE'):
    d = bpy.data.lights.new(name, 'AREA'); d.energy = energy; d.size = size; d.color = color; d.shape = shape
    o = bpy.data.objects.new(name, d); o.location = loc; o.rotation_euler = rot; scene.collection.objects.link(o); return o
area('Chave', (2.2, -7.0, 5.5), (math.radians(62), 0, math.radians(18)), 900, 4.5, (1.0, 0.82, 0.62))
area('Preenche', (-3.5, -6.0, 1.0), (math.radians(80), 0, math.radians(-25)), 110, 5.0, (0.55, 0.65, 1.0))
area('Contra', (0, 3.0, 5.0), (math.radians(-100), 0, 0), 900, 6.0, (1.0, 0.9, 0.75))   # luz de trás (palco aceso ao abrir)
sp = []
for k, x in enumerate((-1.2, 1.2)):
    d = bpy.data.lights.new(f'Spot{k}', 'SPOT'); d.energy = 7000; d.spot_size = math.radians(24); d.spot_blend = 0.55; d.color = (0.85, 0.9, 1.0) if k == 0 else (1.0, 0.86, 0.66)
    o = bpy.data.objects.new(f'Spot{k}', d); o.location = (x*1.9, 3.5, 6.0); o.rotation_euler = (math.radians(168), 0, math.radians(8 if k == 0 else -8)); scene.collection.objects.link(o); sp.append(o)
    d.use_shadow = True
# volume (poeira iluminada)
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 5.5, 1.5)); vb = bpy.context.active_object; vb.scale = (16, 14, 12); vb.display_type = 'WIRE'
vmat = bpy.data.materials.new('Poeira'); vmat.use_nodes = True; nt = vmat.node_tree; nt.nodes.clear()
vs = nt.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = 0.035; vs.inputs['Anisotropy'].default_value = 0.55
o2 = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(vs.outputs[0], o2.inputs['Volume']); vb.data.materials.append(vmat)

bpy.ops.object.effector_add(type='WIND', location=(0, -4, 0.5), rotation=(math.radians(-90), 0, 0)); wind = bpy.context.active_object
wind.field.strength = 0.0; wind.field.noise = 1.0; wind.field.flow = 0.0
for fr_, st in ((1, 0.0), (45, 1.6), (70, 1.6), (112, 0.5), (150, 0.0)): wind.field.strength = st; wind.field.keyframe_insert('strength', frame=fr_)
# luzes do palco acendem ao abrir
for o_ in [x for x in scene.objects if x.type == 'LIGHT' and x.name.startswith(('Contra', 'Spot'))]:
    e = o_.data.energy
    for fr_, k in ((1, 0.08), (70, 0.12), (112, 1.0), (150, 1.0)): o_.data.energy = e * k; o_.data.keyframe_insert('energy', frame=fr_)
# ---------- câmera ----------
cam = bpy.data.cameras.new('Cam'); cam.lens = 55; cam.sensor_width = 36; co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
def cam_at(frame):
    t = (frame - 1) / 149.0
    co.location = (0.06*math.sin(frame*0.045), -9.2 + 0.9*t, 0.35 + 0.02*math.sin(frame*0.07))
    tgt = Vector((0, 0, 0.25)); d = tgt - co.location; co.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    co.keyframe_insert('location', frame=frame); co.keyframe_insert('rotation_euler', frame=frame)
for fr_ in range(1, 151, 3): cam_at(fr_)

# ---------- render ----------
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'; setup_device(scene, ARGS); cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'
cy.use_adaptive_sampling = True; cy.adaptive_threshold = 0.03; cy.max_bounces = 6; cy.volume_bounces = 1; cy.volume_step_rate = 2.0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'; scene.render.film_transparent = ALPHA
if ALPHA:
    scene.render.image_settings.color_mode = 'RGBA'
    for o_ in (fl, bk, vb): o_.hide_render = True
scene.view_settings.view_transform = 'AgX'; scene.view_settings.look = 'None'
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; bg = w.node_tree.nodes['Background']; bg.inputs['Color'].default_value = (0.004, 0.005, 0.012, 1); bg.inputs['Strength'].default_value = 1.0

os.makedirs(OUT, exist_ok=True)
t0 = time.time()
# assa o cloth (simula do quadro 1 até o último necessário)
last = max(FRAMES) if FRAMES else 150
for fr_ in range(1, last + 1):
    scene.frame_set(fr_)
print('SIM_TIME', round(time.time() - t0, 1)); sys.stdout.flush()
if not BAKE_ONLY:
    for fr_ in (FRAMES or range(70, 151)):
        scene.frame_set(fr_); scene.render.filepath = f'{OUT}/f_{fr_:04d}.png'
        t1 = time.time(); bpy.ops.render.render(write_still=True); print('FRAME', fr_, round(time.time() - t1, 1), flush=True)
