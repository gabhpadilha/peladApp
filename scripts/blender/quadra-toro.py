import bpy, bmesh, math, sys, os, time, random, json
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ARGS = dict(a.split('=') for a in sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else {}
RES_X = int(ARGS.get('rx', 400)); RES_Y = int(ARGS.get('ry', 740)); SAMPLES = int(ARGS.get('samples', 24)); OUT = ARGS.get('out', '/tmp/q_out.png')
random.seed(5)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def mat(n): m = bpy.data.materials.new(n); m.use_nodes = True; return m
def emis(n, col, k):
    m = mat(n); nt = m.node_tree; nt.nodes.clear(); e = nt.nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = col; e.inputs['Strength'].default_value = k
    o = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(e.outputs[0], o.inputs[0]); return m

# ---- quadra (azul sintético molhado) com linhas brancas pintadas na textura
W, Ln = 15.0, 22.0       # largura x comprimento visível (meia quadra)
cm = mat('Quadra'); nt = cm.node_tree; b = nt.nodes['Principled BSDF']
# textura de linhas por coordenadas objeto (x,y): distância às linhas
tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
def lin(expr_nodes): pass
# usa um mapa de linhas desenhado em canvas -> imagem (precisão simples)
import tempfile
from PIL import Image, ImageDraw
S = 60  # px por metro
img = Image.new('RGB', (int(W * S), int(Ln * S)), (12, 62, 108)); d = ImageDraw.Draw(img)
def X(x): return (x + W / 2) * S
def Y(y): return (Ln - y) * S          # y=0 é a linha de fundo (gol)
lw = 0.12 * S
# área penal azul mais escura
d.rectangle([X(-5), Y(5.5), X(5), Y(0)], fill=(8, 48, 88))
d.arc([X(-5), Y(5.5) - 5 * S, X(5), Y(5.5) + 5 * S], 180, 360, fill=(235, 240, 245), width=int(lw))
d.rectangle([X(-W/2 + 0.04), Y(Ln - 0.04), X(W/2 - 0.04), Y(0.04)], outline=(238, 242, 247), width=int(lw))
d.line([X(-W/2), Y(Ln - 1.0), X(W/2), Y(Ln - 1.0)], fill=(238, 242, 247), width=int(lw))   # linha do meio
d.arc([X(-3), Y(Ln - 1.0) - 3 * S, X(3), Y(Ln - 1.0) + 3 * S], 0, 180, fill=(238, 242, 247), width=int(lw))
d.ellipse([X(-0.12), Y(6.0) - 0.12 * S, X(0.12), Y(6.0) + 0.12 * S], fill=(238, 242, 247))
img.save('/tmp/quadra_tex.png')
tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load('/tmp/quadra_tex.png'); tex.image.colorspace_settings.name = 'sRGB'
nt.links.new(tc.outputs['UV'], tex.inputs['Vector']); nt.links.new(tex.outputs['Color'], b.inputs['Base Color'])
# rugosidade: poças
n1 = nt.nodes.new('ShaderNodeTexNoise'); n1.inputs['Scale'].default_value = 1.1; n1.inputs['Detail'].default_value = 9
rp = nt.nodes.new('ShaderNodeValToRGB'); rp.color_ramp.elements[0].position = 0.5; rp.color_ramp.elements[0].color = (0.015, 0.015, 0.015, 1); rp.color_ramp.elements[1].position = 0.62; rp.color_ramp.elements[1].color = (0.5, 0.5, 0.5, 1)
tco = nt.nodes.new('ShaderNodeTexCoord'); nt.links.new(tco.outputs['Object'], n1.inputs['Vector']); nt.links.new(n1.outputs['Fac'], rp.inputs['Fac']); nt.links.new(rp.outputs[0], b.inputs['Roughness'])
bump = nt.nodes.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.05; bump.inputs['Distance'].default_value = 0.01
n2 = nt.nodes.new('ShaderNodeTexNoise'); n2.inputs['Scale'].default_value = 140; nt.links.new(tco.outputs['Object'], n2.inputs['Vector']); nt.links.new(n2.outputs['Fac'], bump.inputs['Height']); nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
b.inputs['Specular IOR Level'].default_value = 0.8
bpy.ops.mesh.primitive_plane_add(size=1, location=(0, Ln / 2, 0)); q = bpy.context.active_object; q.scale = (W, Ln, 1); q.data.materials.append(cm)
# piso escuro ao redor
om = mat('Ao redor'); ob = om.node_tree.nodes['Principled BSDF']; ob.inputs['Base Color'].default_value = (0.01, 0.012, 0.018, 1); ob.inputs['Roughness'].default_value = 0.2
bpy.ops.mesh.primitive_plane_add(size=120, location=(0, Ln / 2, -0.02)); bpy.context.active_object.data.materials.append(om)

# ---- balizas (gol) com rede
wh = mat('Trave'); wb = wh.node_tree.nodes['Principled BSDF']; wb.inputs['Base Color'].default_value = (0.95, 0.96, 1.0, 1); wb.inputs['Roughness'].default_value = 0.3
def cyl(p0, p1, r):
    p0, p1 = Vector(p0), Vector(p1); mid = (p0 + p1) / 2; dv = p1 - p0
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=dv.length, location=mid); o = bpy.context.active_object; o.rotation_euler = dv.to_track_quat('Z', 'Y').to_euler(); o.data.materials.append(wh); return o
cyl((-1.5, 0, 0), (-1.5, 0, 2.0), 0.045); cyl((1.5, 0, 0), (1.5, 0, 2.0), 0.045); cyl((-1.5, 0, 2.0), (1.5, 0, 2.0), 0.045)
cyl((-1.5, 0, 0), (-1.5, -1.0, 0), 0.03); cyl((1.5, 0, 0), (1.5, -1.0, 0), 0.03)
nm = mat('Rede'); nb = nm.node_tree.nodes['Principled BSDF']; nb.inputs['Base Color'].default_value = (0.9, 0.92, 1, 1)
def netpanel(loc, rot, size, subs):
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=subs[0], y_subdivisions=subs[1], size=1, location=loc, rotation=rot); n = bpy.context.active_object; n.scale = (size[0], size[1], 1)
    wf = n.modifiers.new('wf', 'WIREFRAME'); wf.thickness = 0.008; n.data.materials.append(nm)
netpanel((0, -1.0, 1.0), (math.pi / 2, 0, 0), (3.0, 2.0), (30, 20))
netpanel((0, -0.5, 2.0), (0, 0, 0), (3.0, 1.0), (30, 10))
netpanel((-1.5, -0.5, 1.0), (math.pi / 2, 0, math.pi / 2), (1.0, 2.0), (10, 20))
netpanel((1.5, -0.5, 1.0), (math.pi / 2, 0, math.pi / 2), (1.0, 2.0), (10, 20))
# ---- placas de LED nas laterais com a marca
led = emis('LED', (0.71, 0.95, 0.24, 1), 7.0)
for sx in (-1, 1):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * (W / 2 + 0.4), Ln / 2, 0.45)); bd = bpy.context.active_object; bd.scale = (0.16, Ln, 0.9)
    bm2 = mat('Placa'); bb = bm2.node_tree.nodes['Principled BSDF']; bb.inputs['Base Color'].default_value = (0.01, 0.012, 0.015, 1); bb.inputs['Roughness'].default_value = 0.25; bd.data.materials.append(bm2)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx * (W / 2 + 0.3), Ln / 2, 0.45)); st = bpy.context.active_object; st.scale = (0.02, Ln - 1, 0.14); st.data.materials.append(led)

# texto da marca nas placas
for sx in (-1, 1):
    for k in range(3):
        bpy.ops.object.text_add(location=(sx * (W / 2 + 0.31), 3.5 + k * 7.0, 0.38), rotation=(math.pi / 2, 0, math.radians(90 if sx < 0 else -90)))
        t = bpy.context.active_object; t.data.body = 'CANCHA CLUB'; t.data.size = 0.5; t.data.extrude = 0.01; t.data.align_x = 'CENTER'; t.data.materials.append(led)
# arquibancadas escuras com luzes de celulares
stm = mat('Arq'); sb = stm.node_tree.nodes['Principled BSDF']; sb.inputs['Base Color'].default_value = (0.004, 0.005, 0.007, 1); sb.inputs['Roughness'].default_value = 0.8
for sx in (-1, 1):
    me = bpy.data.meshes.new('Arq'); bm3 = bmesh.new()
    pts = [(0, 0), (6.0, 0), (6.0, 7.0), (0, 1.2)]
    vs_ = [bm3.verts.new((p[0], 0, p[1])) for p in pts]; vs2 = [bm3.verts.new((p[0], Ln + 8, p[1])) for p in pts]
    bm3.faces.new(vs_); bm3.faces.new(vs2[::-1])
    for i in range(4): bm3.faces.new((vs_[i], vs_[(i + 1) % 4], vs2[(i + 1) % 4], vs2[i]))
    bm3.to_mesh(me); bm3.free(); ob2 = bpy.data.objects.new('Arq', me); scene.collection.objects.link(ob2); ob2.location = (sx * (W / 2 + 1.0), -4, -0.02)
    if sx < 0: ob2.scale = (-1, 1, 1)
    me.materials.append(stm)
dm = emis('Cel', (1.0, 0.95, 0.85, 1), 55.0)
for k in range(380):
    sx = random.choice((-1, 1)); u = random.uniform(0.1, 5.8); y = random.uniform(-3.5, Ln + 3.0); z = 1.2 + (u / 6.0) * 5.6 + 0.1
    bpy.ops.mesh.primitive_uv_sphere_add(radius=random.uniform(0.04, 0.09), segments=6, ring_count=4, location=(sx * (W / 2 + 1.0 + u), y, z)); bpy.context.active_object.data.materials.append(dm)
# relâmpago distante (luz fria) atrás do gol
lg = bpy.data.lights.new('Relampago', 'AREA'); lg.energy = 9000; lg.size = 14; lg.color = (0.62, 0.76, 1.0); lo = bpy.data.objects.new('Relampago', lg); lo.location = (-9, -14, 9); lo.rotation_euler = (math.radians(70), 0, math.radians(-30)); scene.collection.objects.link(lo)
# ---- refletores nos cantos + feixes
for (x, y) in ((-W / 2 - 3, 2), (W / 2 + 3, 2), (-W / 2 - 3, Ln - 2), (W / 2 + 3, Ln - 2)):
    a = bpy.data.lights.new('Ref', 'SPOT'); a.energy = 42000; a.spot_size = math.radians(48); a.spot_blend = 0.7; a.color = (0.72, 0.84, 1.0)
    o = bpy.data.objects.new('Ref', a); o.location = (x, y, 11); tgt = Vector((0, Ln / 2, 0)); o.rotation_euler = (tgt - o.location).to_track_quat('-Z', 'Y').to_euler(); scene.collection.objects.link(o)
fl = bpy.data.lights.new('Fill', 'AREA'); fl.energy = 500; fl.size = 18; fl.color = (0.5, 0.45, 0.9); fo = bpy.data.objects.new('Fill', fl); fo.location = (0, Ln / 2, 14); fo.rotation_euler = (0, 0, 0); scene.collection.objects.link(fo)

# névoa
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, Ln / 2, 6)); vb = bpy.context.active_object; vb.scale = (60, 60, 14); vb.display_type = 'WIRE'
vm = mat('Neblina'); vn = vm.node_tree; vn.nodes.clear(); vs = vn.nodes.new('ShaderNodeVolumeScatter'); vs.inputs['Density'].default_value = 0.0065; vs.inputs['Anisotropy'].default_value = 0.5
vo = vn.nodes.new('ShaderNodeOutputMaterial'); vn.links.new(vs.outputs[0], vo.inputs['Volume']); vb.data.materials.append(vm)

# ---- chuva: riscos finos inclinados + ondas nas poças
rm = emis('Chuva', (0.7, 0.82, 1.0, 1), 1.6)
for k in range(300):
    x = random.uniform(-W / 2 - 4, W / 2 + 4); y = random.uniform(-3, Ln + 6); z = random.uniform(0.2, 12)
    bpy.ops.mesh.primitive_cylinder_add(radius=0.0035, depth=random.uniform(0.5, 1.0), location=(x, y, z), vertices=4); o = bpy.context.active_object; o.rotation_euler = (math.radians(random.uniform(-6, 6)), math.radians(random.uniform(-10, -4)), 0); o.data.materials.append(rm)
gl = mat('Onda'); gb = gl.node_tree.nodes['Principled BSDF']; gb.inputs['Base Color'].default_value = (0.8, 0.9, 1.0, 1); gb.inputs['Roughness'].default_value = 0.05; gb.inputs['Alpha'].default_value = 0.2
# ---- câmera: alta, olhando a meia quadra de trás do gol
cam = bpy.data.cameras.new('Cam'); cam.lens = 27; co = bpy.data.objects.new('Cam', cam); scene.collection.objects.link(co); scene.camera = co
co.location = (0, -7.2, 13.0); tg = Vector((0, 11.0, 0)); co.rotation_euler = (tg - co.location).to_track_quat('-Z', 'Y').to_euler()
cam.dof.use_dof = False
scene.render.engine = 'CYCLES'; cy = scene.cycles; cy.device = 'CPU'; cy.samples = SAMPLES; cy.use_denoising = True; cy.denoiser = 'OPENIMAGEDENOISE'; cy.max_bounces = 6; cy.volume_bounces = 1; cy.sample_clamp_indirect = 8.0
scene.render.resolution_x = RES_X; scene.render.resolution_y = RES_Y; scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'AgX'; scene.view_settings.exposure = -0.5
w = bpy.data.worlds.new('W'); scene.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.012, 0.016, 0.04, 1)
scene.frame_set(1)
# posições dos jogadores na tela (para o app encaixar as cartas)
print('camera ok')
t0 = time.time(); scene.render.filepath = OUT; bpy.ops.render.render(write_still=True); print('RENDER', round(time.time() - t0, 1))
