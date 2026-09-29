import bpy, math, json, os, struct
from mathutils import Vector

ROOT='/Users/jhm/Documents/Codex/2026-09-28/chatgpt-conversation-6ab9c884-8458-83ee-86b7/work/blender-assets-v4'
bpy.ops.wm.read_factory_settings(use_empty=True)
library=bpy.context.scene; library.name='V4_Asset_Library'
library.unit_settings.system='METRIC'

def material(name,color,roughness=.68,metallic=0,alpha=1):
    m=bpy.data.materials.new(name); m.use_nodes=True
    m.diffuse_color=(*color,alpha)
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Alpha'].default_value=alpha
    p.inputs['Roughness'].default_value=roughness
    p.inputs['Metallic'].default_value=metallic
    if alpha<1:
        m.surface_render_method='BLENDED'
        m.use_backface_culling=False
        m.use_transparency_overlap=False
        p.inputs['IOR'].default_value=1.45
    return m

white=material('Colorable matte white',(.94,.94,.94))
glass=material('Clear wall | alpha 0.12',(.72,.86,.96),.18,alpha=.12)
brass=material('Warm brass',(.62,.39,.12),.33,.65)
floor_mat=material('Demonstration floor',(.75,.79,.81),.9)

def activate(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True); bpy.context.view_layer.objects.active=obj

def center(obj):
    lo=Vector(tuple(min(v.co[i] for v in obj.data.vertices) for i in range(3)))
    hi=Vector(tuple(max(v.co[i] for v in obj.data.vertices) for i in range(3)))
    c=(lo+hi)*.5
    for v in obj.data.vertices: v.co-=c
    obj.data.update()

def finish(obj,name,mat,bevel=0,center_origin=True,smooth=True):
    activate(obj); obj.name=name; obj.data.name=name+'_Geometry'
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if bevel:
        b=obj.modifiers.new('Small readable edge bevel','BEVEL'); b.width=bevel; b.segments=2
        bpy.ops.object.modifier_apply(modifier=b.name)
    for p in obj.data.polygons: p.use_smooth=smooth
    if bevel:
        n=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL'); n.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=n.name)
    obj.data.materials.clear(); obj.data.materials.append(mat)
    for p in obj.data.polygons: p.material_index=0
    if center_origin: center(obj)
    return obj

def box(name,dims,mat=white,bevel=.014,location=(0,0,0)):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    o=bpy.context.object; o.dimensions=dims
    return finish(o,name,mat,bevel)

def join(objects,name,mat):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objects: o.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join(); o=bpy.context.object
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    o.location=(0,0,0)
    return finish(o,name,mat)

def native_body(o,mass=1,shape='BOX',passive=False,friction=.62,restitution=.04):
    activate(o); bpy.ops.rigidbody.object_add()
    r=o.rigid_body; r.type='PASSIVE' if passive else 'ACTIVE'; r.mass=mass
    r.collision_shape=shape; r.friction=friction; r.restitution=restitution
    r.use_margin=True; r.collision_margin=.0005
    if not passive: r.linear_damping=.16; r.angular_damping=.25
    o['mass']=0 if passive else mass
    o['friction']=friction; o['restitution']=restitution; o['collider']=shape.lower()
    o['rigidBodyType']='passive' if passive else 'active'
    return o

# Crate front is glTF +Z, or Blender -Y. Raised framing is part of one mesh.
parts=[box('Crate_body',(.64,.470,.40),bevel=.022,location=(0,.005,0))]
for x in (-.235,.235):
    parts.append(box('Front_vertical_rib',(.036,.016,.306),bevel=.006,location=(x,-.232,0)))
for z in (-.135,.135):
    parts.append(box('Front_horizontal_rib',(.506,.016,.032),bevel=.005,location=(0,-.232,z)))
crate=native_body(join(parts,'Crate',white))
crate['frontAxis']='glTF +Z'; crate['stackStep']=.40

bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=.25)
ball=native_body(finish(bpy.context.object,'Ball',white),shape='SPHERE',friction=.45)
ball['radius']=.25; ball['stackStep']=.50

# Hollow circular guide. No end caps; rings only connect inner/outer surfaces.
N=64; verts=[]; faces=[]
profile=[(.270,-2),(.270,2),(.255,2),(.255,-2)]
for r,z in profile:
    for j in range(N):
        a=2*math.pi*j/N; verts.append((r*math.cos(a),r*math.sin(a),z))
for i in range(4):
    for j in range(N):
        faces.append((i*N+j,i*N+(j+1)%N,((i+1)%4)*N+(j+1)%N,((i+1)%4)*N+j))
m=bpy.data.meshes.new('Tube_Geometry');m.from_pydata(verts,[],faces);m.update()
tube=bpy.data.objects.new('Tube',m);library.collection.objects.link(tube)
finish(tube,'Tube',glass)
for p in tube.data.polygons: p.use_smooth=(p.index//N in (0,2))
native_body(tube,shape='MESH',passive=True,friction=.05,restitution=.02)
tube['innerDiameter']=.510;tube['outerDiameter']=.540;tube['height']=4
tube['openTop']=True;tube['openBottom']=True;tube['recommendedDepthWrite']=False
tube['recommendedOpacity']=.12;tube['heightScaling']='Set scale.y; local geometry is Y-up and centered.'

# Tank: four thin walls + bottom, single mesh. Interior height includes no base.
wall=.016; parts=[]
for x in (-.368,.368):
    parts.append(box('Tank_side',(.016,.492,4),glass,.0015,(x,0,.008)))
for y in (-.238,.238):
    parts.append(box('Tank_front_back',(.720,.016,4),glass,.0015,(0,y,.008)))
parts.append(box('Tank_floor',(.752,.492,.016),glass,.0015,(0,0,-2)))
tank=native_body(join(parts,'Tank',glass),shape='MESH',passive=True,friction=.05)
tank['innerDimensions']=[.72,4,.46];tank['wallThickness']=wall;tank['openTop']=True
tank['recommendedOpacity']=.12;tank['recommendedDepthWrite']=False
tank['interiorFloorY']=-1.992;tank['interiorTopY']=2.008

rod=native_body(box('Rod',(.52,.28,1),white,.015))
rod['heightScaling']='Set scale.y; original height is 1 metre.'

# A shallow, physically modeled one-slot recess to locate a crate column.
parts=[box('Pedestal_base',(.84,.72,.11),white,.012,(0,0,-.015))]
for x in (-.38,.38):parts.append(box('Pedestal_side',(.08,.72,.03),white,.007,(x,0,.055)))
for y in (-.315,.315):parts.append(box('Pedestal_lip',(.68,.09,.03),white,.007,(0,y,.055)))
pedestal=native_body(join(parts,'Pedestal',white),shape='MESH',passive=True)
pedestal['slotCount']=1;pedestal['slotInnerDimensions']=[.68,.03,.54]
pedestal['slotFloorY']=.04

# Scalloped brass control knob, with its stem/front axis along glTF Z.
N=48;verts=[];faces=[]
for z in (-.0425,.0425):
    for j in range(N):
        a=2*math.pi*j/N;r=.155+.010*math.cos(a*8)
        verts.append((r*math.cos(a),r*math.sin(a),z))
for j in range(N):faces.append((j,(j+1)%N,N+(j+1)%N,N+j))
faces.extend([tuple(reversed(range(N))),tuple(range(N,2*N))])
m=bpy.data.meshes.new('Valve_grip');m.from_pydata(verts,[],faces);m.update()
grip=bpy.data.objects.new('Valve_grip',m);library.collection.objects.link(grip)
finish(grip,'Valve_grip',brass,.008)
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.058,depth=.11,location=(0,0,-.085))
stem=finish(bpy.context.object,'Valve_stem',brass,.008)
valve=join([grip,stem],'Valve',brass)
valve.rotation_euler.x=math.pi/2;finish(valve,'Valve',brass)
native_body(valve,shape='CONVEX_HULL',passive=True)
valve['frontAxis']='glTF +Z'

assets=[crate,ball,tube,tank,rod,pedestal,valve]
metadata={}
for i,o in enumerate(assets):
    o.location=(i*1.5,0,max(v.co.z for v in o.data.vertices))
    dims=[round(o.dimensions.x,6),round(o.dimensions.z,6),round(o.dimensions.y,6)]
    o['gltfDimensions']=dims;o['units']='metres / kilograms';o['authoring']='Blender 5.2 native mesh'
    metadata[o.name]={'dimensions_gltf_xyz':dims,'dimensions_blender_xyz':[round(v,6) for v in o.dimensions],
        'vertices':len(o.data.vertices),'polygons':len(o.data.polygons),
        'material':o.data.materials[0].name,'extras':dict(o.items()),
        'local_origin':'geometric bounding-box center','applied_scale':[1,1,1]}
bpy.ops.object.select_all(action='DESELECT')
for o in assets:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'mean-physics-kit-v4.glb'),export_format='GLB',
    use_selection=True,export_extras=True,export_yup=True,export_apply=True,
    export_animations=False,export_cameras=False,export_lights=False)

# Independent native simulation with four spheres in the exported circular guide
# and three crates in a separate correctly-sized rectangular guide.
demo=bpy.data.scenes.new('V4_Guided_Drop_Demonstration');bpy.context.window.scene=demo
demo.unit_settings.system='METRIC';demo.render.fps=60;demo.frame_start=1;demo.frame_end=180
demo.gravity=(0,0,-9.81)
floor=box('Demo_floor',(5,2,.20),floor_mat,.01,(0,0,-.10));native_body(floor,passive=True)

def copy_mesh(source,name,location,mass=1,shape='BOX',passive=False):
    o=bpy.data.objects.new(name,source.data.copy());demo.collection.objects.link(o)
    o.location=location;native_body(o,mass,shape,passive)
    return o

guide=copy_mesh(tube,'Demo_Sphere_Guide',(-1,0,2),shape='MESH',passive=True)
guide.rigid_body.friction=.05
balls=[];crates=[]
for i in range(4):
    balls.append(copy_mesh(ball,'Demo_Ball_%02d'%(i+1),(-1+(.001 if i%2 else -.001),0,.6+i*.69),shape='SPHERE'))
for x in (.65,1.35):
    native_body(box('Demo_Crate_Guide_Side',(.020,.56,2.8),glass,.002,(x,0,1.4)),shape='BOX',passive=True)
for y in (-.270,.270):
    native_body(box('Demo_Crate_Guide_FrontBack',(.68,.020,2.8),glass,.002,(1,y,1.4)),shape='BOX',passive=True)
for i in range(3):crates.append(copy_mesh(crate,'Demo_Crate_%02d'%(i+1),(1,0,.55+i*.70)))
world=demo.rigidbody_world;world.substeps_per_frame=12;world.solver_iterations=100
world.point_cache.frame_start=1;world.point_cache.frame_end=180;world.point_cache.use_disk_cache=False
trace=[]
for f in range(1,181):
    demo.frame_set(f);deps=bpy.context.evaluated_depsgraph_get();deps.update()
    if f in (1,5,10,20,30,45,60,90,120,180):
        trace.append({'frame':f,'seconds':round((f-1)/60,4),
          'centers_blender_xyz':{o.name:[round(float(v),6) for v in o.evaluated_get(deps).matrix_world.translation] for o in balls+crates}})
initial=trace[0]['centers_blender_xyz'];final=trace[-1]['centers_blender_xyz']
for o in balls+crates:assert final[o.name][2]<initial[o.name][2]-.1
ball_z=[final[o.name][2] for o in balls];crate_z=[final[o.name][2] for o in crates]
assert all(abs(z-(.25+i*.5))<.035 for i,z in enumerate(ball_z)),ball_z
assert all(abs(z-(.2+i*.4))<.035 for i,z in enumerate(crate_z)),crate_z
bpy.ops.object.camera_add(location=(4,-8,4))
cam=bpy.context.object;cam.name='Native_Demonstration_Camera'
cam.rotation_euler=(Vector((0,0,1.4))-cam.location).to_track_quat('-Z','Y').to_euler()
cam.data.type='ORTHO';cam.data.ortho_scale=6;demo.camera=cam
bpy.ops.object.light_add(type='AREA',location=(1,-3,6))
bpy.context.object.data.energy=700;bpy.context.object.data.size=5
demo.world=bpy.data.worlds.new('Demo_World');demo.world.color=(.3,.3,.3)
demo.frame_set(1);bpy.ops.ptcache.bake_all(bake=True);demo.frame_set(180)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'mean-physics-lab-v4.blend'))

glbpath=os.path.join(ROOT,'mean-physics-kit-v4.glb');binary=open(glbpath,'rb').read()
n=struct.unpack_from('<I',binary,12)[0];gltf=json.loads(binary[20:20+n])
assert len(binary)<300000
assert sorted(n['name'] for n in gltf['nodes'])==sorted(o.name for o in assets)
assert all(len(m['primitives'])==1 for m in gltf['meshes'])
glass_json=next(m for m in gltf['materials'] if m['name']==glass.name)
assert glass_json.get('alphaMode')=='BLEND',glass_json
assert abs(glass_json['pbrMetallicRoughness']['baseColorFactor'][3]-.12)<1e-6
for mesh in gltf['meshes']:
    a=gltf['accessors'][mesh['primitives'][0]['attributes']['POSITION']]
    assert all(abs(x+y)<1e-6 for x,y in zip(a['min'],a['max'])),(mesh['name'],a)
report={'blender_version':bpy.app.version_string,'transport':'isolated headless factory startup',
  'units':'metres and kilograms','coordinate_transform':'Blender (x,y,z) -> glTF (x,z,-y)',
  'gltf_up_axis':'Y','gltf_front_axis':'+Z','glb_bytes':len(binary),'assets':metadata,
  'gltf_verification':{'flat_named_nodes':True,'single_primitive_meshes':True,'centered_bounds':True,
    'alpha_mode':glass_json['alphaMode'],'glass_alpha':glass_json['pbrMetallicRoughness']['baseColorFactor'][3]},
  'native_simulation':{'engine':'Blender Bullet rigid bodies','frames':[1,180],'fps':60,
    'substeps_per_frame':12,'solver_iterations':100,'gravity_blender_xyz':[0,0,-9.81],
    'active_bodies':7,'demo':'4 equal balls in hollow Tube; 3 equal crates in rectangular guides',
    'equal_mass_kg':1,'baked':world.point_cache.is_baked,
    'ball_final_heights':ball_z,'crate_final_heights':crate_z,
    'validation':'PASS: all seven fell under gravity and settled in their vertical guides', 'trace':trace}}
with open(os.path.join(ROOT,'asset-specifications-v4.json'),'w') as f:
    json.dump(report,f,indent=2,default=lambda x:list(x))
__result__={'root':ROOT,'glb_bytes':len(binary),'native_baked':world.point_cache.is_baked,
    'ball_final_heights':ball_z,'crate_final_heights':crate_z,
    'glass':glass_json,'dimensions':{k:v['dimensions_gltf_xyz'] for k,v in metadata.items()}}
