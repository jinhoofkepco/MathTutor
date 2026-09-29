import bpy, math, json, os, struct
from mathutils import Vector

ROOT=os.environ.get('MATHTUTOR_ASSET_DIR', os.path.abspath(os.path.join(os.path.dirname(__file__), '../../work/generated-assets')))
os.makedirs(ROOT,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
lib=bpy.context.scene;lib.name='E0_E1_Common_Assets'
lib.unit_settings.system='METRIC'

def linear_channel(x):
    return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def rgb(hexcode):
    return tuple(linear_channel(int(hexcode[i:i+2],16)/255) for i in (1,3,5))
def material(name,hexcode,alpha=1,rough=.72,emission=False):
    m=bpy.data.materials.new(name);m.use_nodes=True;m.diffuse_color=(*rgb(hexcode),alpha)
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*rgb(hexcode),1)
    p.inputs['Alpha'].default_value=alpha;p.inputs['Roughness'].default_value=rough
    p.inputs['Metallic'].default_value=0
    if emission:
        p.inputs['Emission Color'].default_value=(*rgb(hexcode),1)
        p.inputs['Emission Strength'].default_value=1
        p.inputs['Base Color'].default_value=(0,0,0,1)
    if alpha<1:
        m.surface_render_method='BLENDED';m.use_backface_culling=False
        m.use_transparency_overlap=False
    m['sRGBHex']=hexcode;m['opacity']=alpha
    return m

blue=material('Data blue-gray | #5B7A99','#5B7A99')
red=material('Average red | #E04A3F | alpha .45','#E04A3F',.45)
yellow=material('Total yellow | #F5D04C | alpha .50','#F5D04C',.5)
skin=material('Friend skin','#C5916B');hair=material('Friend hair','#3C332F')
shirt=material('Friend shirt','#778872');pants=material('Friend trousers','#626C77')
shoes=material('Friend shoes','#48515B');face=material('Friend facial marks','#343A40')

def active(o):
    bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
def finish(o,name,mat,bevel=0):
    active(o);o.name=name;o.data.name=name+'_Geometry'
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    if bevel:
        b=o.modifiers.new('Bevel','BEVEL');b.width=bevel;b.segments=3
        bpy.ops.object.modifier_apply(modifier=b.name)
        for p in o.data.polygons:p.use_smooth=True
        n=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');n.keep_sharp=True
        bpy.ops.object.modifier_apply(modifier=n.name)
    for p in o.data.polygons:p.use_smooth=True
    o.data.materials.clear();o.data.materials.append(mat)
    return o
def box(name,dims,mat,loc=(0,0,0),bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.dimensions=dims
    return finish(o,name,mat,bevel)
def sphere(name,radii,mat,loc=(0,0,0),segments=20,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=loc)
    o=bpy.context.object;o.scale=radii;return finish(o,name,mat)
def curve_mesh(name,points,radius,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=12;c.bevel_depth=radius;c.bevel_resolution=3
    s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
    for p,co in zip(s.bezier_points,points):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    o=bpy.data.objects.new(name,c);bpy.context.scene.collection.objects.link(o);active(o)
    bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,mat)

cube=box('UnitCube',(1,1,1),blue,bevel=.035)
cube['dimensionsGLTF']=[1,1,1];cube['bevelWidth']=.035;cube['sRGBHex']='#5B7A99';cube['unitValue']=1
cube['origin']='geometric center';cube['mass']=1;cube['collider']='box'
bpy.ops.mesh.primitive_plane_add(size=1)
average=finish(bpy.context.object,'AveragePlane',red)
average['dimensionsGLTF']=[1,0,1];average['sRGBHex']='#E04A3F';average['opacity']=.45
average['planeAxes']='XZ horizontal, Y-up';average['recommendedDepthWrite']=False
bpy.ops.mesh.primitive_plane_add(size=1)
total=bpy.context.object;total.rotation_euler.x=math.pi/2
finish(total,'TotalPlane',yellow)
total['dimensionsGLTF']=[1,1,0];total['sRGBHex']='#F5D04C';total['opacity']=.5
total['planeAxes']='XY upright, front +Z';total['recommendedDepthWrite']=False

def make_friend(name,surprised=False):
    parts=[]
    def add(o):parts.append(o);return o
    for x in (-.11,.11):
        add(box(name+'_Shoe',(.17,.28,.12),shoes,(x,-.04,.06),.035))
        add(box(name+'_Trouser',(.16,.19,.57),pants,(x,0,.405),.040))
    add(box(name+'_Sweater',(.47,.275,.49),shirt,(0,0,.925),.075))
    for x in (-.302,.302):
        add(box(name+'_Sleeve',(.14,.235,.225),shirt,(x,0,1.015),.045))
        add(box(name+'_Forearm',(.095,.10,.295),skin,(x,0,.795),.045))
        add(sphere(name+'_Hand',(.050,.049,.070),skin,(x,-.006,.640)))
    add(box(name+'_Neck',(.135,.12,.16),skin,(0,0,1.195),.035))
    add(sphere(name+'_Head',(.190,.155,.220),skin,(0,0,1.425),24,16))
    # A short, quiet hairstyle: scalp cap with a slightly lower hairline at back.
    verts=[];faces=[];N=28;R=10
    for i in range(R+1):
        for j in range(N):
            a=2*math.pi*j/N;theta=(i/R)*(1.38+.28*math.sin(a))
            verts.append((.203*math.sin(theta)*math.cos(a),.169*math.sin(theta)*math.sin(a),1.425+.235*math.cos(theta)))
    for i in range(R):
        for j in range(N):faces.append((i*N+j,(i+1)*N+j,(i+1)*N+(j+1)%N,i*N+(j+1)%N))
    m=bpy.data.meshes.new(name+'_Hair_Geometry');m.from_pydata(verts,[],faces);m.update()
    o=bpy.data.objects.new(name+'_Hair',m);lib.collection.objects.link(o);add(finish(o,name+'_Hair',hair))
    for x in (-.067,.067):
        add(sphere(name+'_Eye',(.014,.009,.023 if surprised else .017),face,(x,-.147,1.455),16,8))
        brow=add(box(name+'_Brow',(.059,.014,.010),face,(x,-.139,1.520 if surprised else 1.502),.004))
        brow.rotation_euler.y=(-.15 if x<0 else .15) if surprised else 0
    add(sphere(name+'_Nose',(.020,.019,.027),skin,(0,-.153,1.413),16,8))
    if surprised:
        bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,major_radius=.018,minor_radius=.005,location=(0,-.151,1.364))
        o=bpy.context.object;o.rotation_euler.x=math.pi/2;o.scale=(1,1.3,1)
        add(finish(o,name+'_Mouth',face))
    else:
        add(curve_mesh(name+'_Mouth',[(-.028,-.150,1.366),(0,-.157,1.363),(.028,-.150,1.366)],.006,face))
    root=bpy.data.objects.new(name,None);root.empty_display_type='PLAIN_AXES';lib.collection.objects.link(root)
    allcoords=[o.matrix_world@v.co for o in parts for v in o.data.vertices]
    # Force dependency update before using object transforms for assembled bounds.
    bpy.context.view_layer.update()
    allcoords=[o.matrix_world@v.co for o in parts for v in o.data.vertices]
    lo=Vector(tuple(min(v[i] for v in allcoords) for i in range(3)))
    hi=Vector(tuple(max(v[i] for v in allcoords) for i in range(3)))
    center=(lo+hi)*.5
    for o in parts:o.parent=root;o.location-=center
    root['expression']='surprised' if surprised else 'neutral'
    root['sameCharacter']=True;root['frontAxis']='glTF +Z';root['origin']='assembled bounds center'
    root['dimensionsGLTF']=[round(hi.x-lo.x,6),round(hi.z-lo.z,6),round(hi.y-lo.y,6)]
    root['noAnimation']=True;root['claimColor']='#778872'
    return root,parts

neutral,neutral_parts=make_friend('FriendNeutral')
surprised,surprised_parts=make_friend('FriendSurprised',True)
cube.location=(-3,0,.5);average.location=(-1.3,0,.15);total.location=(0,0,.5)
neutral.location=(1.6,0,.83);surprised.location=(2.7,0,.83)
export_objects=[cube,average,total,neutral,surprised]+neutral_parts+surprised_parts
bpy.ops.object.select_all(action='DESELECT')
for o in export_objects:o.select_set(True)
bpy.ops.export_scene.gltf(filepath=os.path.join(ROOT,'mean-common-v1.glb'),export_format='GLB',use_selection=True,
    export_extras=True,export_yup=True,export_apply=True,export_animations=False,export_cameras=False,export_lights=False)

# Shared seal, deliberately free of text, numbers, character, sound, and decoration.
scene=bpy.data.scenes.new('Shared_Seal_5s_1080p30');bpy.context.window.scene=scene
scene.frame_start=1;scene.frame_end=150;scene.render.fps=30;scene.render.fps_base=1
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.render.film_transparent=False
scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if False else 'None'
scene.view_settings.exposure=0;scene.view_settings.gamma=1
scene.eevee.taa_render_samples=32
world=bpy.data.worlds.new('Undecorated white-gray background');world.use_nodes=True
world.node_tree.nodes['Background'].inputs['Color'].default_value=(*rgb('#F2F3F3'),1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8;scene.world=world
video_blue=blue.copy();video_blue.name='Seal data blue-gray'
video_blue.surface_render_method='BLENDED';video_blue.use_transparency_overlap=False
video_yellow=material('Seal total yellow','#F5D04C',0,emission=True)
video_yellow.surface_render_method='BLENDED'

initial=[2,4,2,4];x_start=[-2.025,-.675,.675,2.025];x_final=[-1.5,-.5,.5,1.5]
blocks=[]
for c,height in enumerate(initial):
    for k in range(height):
        o=bpy.data.objects.new('Seal_Column_%d_Unit_%d'%(c+1,k+1),cube.data.copy());scene.collection.objects.link(o)
        o.data.materials.clear();o.data.materials.append(video_blue)
        blocks.append((o,c,k))

def ease(t):
    t=max(0,min(1,t));return t*t*(3-2*t)
for f in range(1,151):
    for o,c,k in blocks:
        destination=c;x=x_start[c];z=k+.5
        if c in (1,3) and k==3:
            destination=c-1;start=20 if c==1 else 47;end=47 if c==1 else 74
            t=ease((f-start)/(end-start))
            x=x_start[c]+(x_start[destination]-x_start[c])*t
            z=3.5-t+.9*math.sin(math.pi*t)
        if f>=86:
            t=ease((f-86)/25);x=x_start[destination]+(x_final[destination]-x_start[destination])*t
        o.location=(x,0,z);o.keyframe_insert(data_path='location',frame=f)
    alpha=1-ease((f-111)/18)
    video_blue.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=alpha
    video_blue.node_tree.nodes['Principled BSDF'].inputs['Alpha'].keyframe_insert('default_value',frame=f)
    video_yellow.node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value=.5*(1-alpha)
    video_yellow.node_tree.nodes['Principled BSDF'].inputs['Alpha'].keyframe_insert('default_value',frame=f)

rectangle=bpy.data.objects.new('Seal_Final_Total_Rectangle',total.data.copy());scene.collection.objects.link(rectangle)
rectangle.scale=(4,1,3);rectangle.location=(0,-.515,1.5)
rectangle.data.materials.clear();rectangle.data.materials.append(video_yellow)
bpy.ops.object.camera_add(location=(0,-20,1.9))
camera=bpy.context.object;camera.name='Seal_Orthographic_Camera'
camera.rotation_euler=(Vector((0,0,1.9))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=10.5;camera.data.lens=50;scene.camera=camera
bpy.ops.object.light_add(type='AREA',location=(-3,-5,7))
key=bpy.context.object;key.name='Soft neutral key';key.data.energy=420;key.data.size=5
key.rotation_euler=(Vector((0,0,1.8))-key.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.light_add(type='AREA',location=(4,-4,3))
fill=bpy.context.object;fill.name='Quiet fill';fill.data.energy=100;fill.data.size=6
fill.rotation_euler=(Vector((0,0,1.8))-fill.location).to_track_quat('-Z','Y').to_euler()
scene['purpose']='Identical five-second seal for every episode; labels belong in the web overlay.'
scene['initialHeights']=[2,4,2,4];scene['finalHeights']=[3,3,3,3];scene['preservedUnitCount']=12
scene['noTextOrNumbers']=True;scene['noAudio']=True
scene['timing']={'hold':[1,19],'level':[20,74],'levelHold':[75,85],'closeGaps':[86,111],'becomeRectangle':[112,129],'sealHold':[130,150]}
scene.frame_set(1);scene.render.filepath=os.path.join(ROOT,'frames','frame_')
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'mean-common-v1.blend'))

# Verify the actual GLB JSON, including exact unit dimensions and transparency.
binary=open(os.path.join(ROOT,'mean-common-v1.glb'),'rb').read();n=struct.unpack_from('<I',binary,12)[0]
gltf=json.loads(binary[20:20+n]);nodes={n['name']:n for n in gltf['nodes']}
top=[gltf['nodes'][i]['name'] for i in gltf['scenes'][gltf.get('scene',0)]['nodes']]
assert set(top)=={'UnitCube','AveragePlane','TotalPlane','FriendNeutral','FriendSurprised'},top
mesh=gltf['meshes'][nodes['UnitCube']['mesh']];a=gltf['accessors'][mesh['primitives'][0]['attributes']['POSITION']]
assert a['min']==[-.5,-.5,-.5] and a['max']==[.5,.5,.5]
assert len(mesh['primitives'])==1
materials={m['name']:m for m in gltf['materials']}
for m,opacity in ((red,.45),(yellow,.5)):
    value=materials[m.name];assert value['alphaMode']=='BLEND'
    assert abs(value['pbrMetallicRoughness']['baseColorFactor'][3]-opacity)<1e-6
report={'authoring_version':bpy.app.version_string,'coordinate_transform':'Blender (x,y,z) -> glTF (x,z,-y)',
    'up_axis':'Y','front_axis':'+Z','units':'metres','glb_bytes':len(binary),'top_level_nodes':top,
    'assets':{o.name:dict(o.items()) for o in [cube,average,total,neutral,surprised]},
    'gltf_materials':materials,'verified_unitcube_bounds':{'min':a['min'],'max':a['max']},
    'seal':{'resolution':[1920,1080],'fps':30,'frames':150,'duration_seconds':5,'audio':False,
      'camera':'orthographic, fixed, exact front view','text_objects':0,
      'initial_heights':initial,'leveled_heights':[3,3,3,3],'unit_total':12,
      'timing':dict(scene['timing'])}}
with open(os.path.join(ROOT,'assetmetadata.json'),'w') as f:json.dump(report,f,indent=2,default=lambda v:list(v))
print('ASSET_RESULT '+json.dumps({'version':bpy.app.version_string,'glb_bytes':len(binary),'top_level_nodes':top,'friend_dimensions':neutral['dimensionsGLTF'][:]}))

# Generate the quantity-correct E0/E1 variants with one shared closing function.
import importlib.util
spec=importlib.util.spec_from_file_location('episode_seals',os.path.join(os.path.dirname(__file__),'add_episode_seals.py'))
episode_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(episode_module)
episode_module.build_episode_seals()
