"""Shared E0/E1 closing animation, parameterized only by episode and height.

Run in Blender 4.5 with mean-common-v1.blend open, or call build_episode_seals
at the end of build_v1_assets.py. Existing asset meshes/materials are unchanged.
"""
import bpy,math,json,os
from mathutils import Vector

ROOT=os.environ.get('MATHTUTOR_ASSET_DIR', os.path.abspath(os.path.join(os.path.dirname(__file__), '../../work/generated-assets')))
os.makedirs(ROOT,exist_ok=True)
CAMERA_LOCATION=(0,-24,4)
CAMERA_TARGET=(0,0,4)
ORTHO_SCALE=18
FRAME_COUNT=150
FPS=30
TIMING={'flatHold':[1,40],'closeGaps':[41,100],'becomeRectangle':[101,124],'sealHold':[125,150]}

def ease(t):
    t=max(0,min(1,t));return t*t*(3-2*t)

def make_episode_seal(episode,height):
    name='Shared_Seal_'+episode+'_5s_1080p30'
    previous=bpy.data.scenes.get(name)
    if previous:
        for obj in list(previous.objects):
            bpy.data.objects.remove(obj,do_unlink=True)
        bpy.data.scenes.remove(previous)
    for suffix in ('_Seal_Blue','_Seal_Yellow'):
        old_material=bpy.data.materials.get(episode+suffix)
        if old_material:bpy.data.materials.remove(old_material,do_unlink=True)
    scene=bpy.data.scenes.new(name);bpy.context.window.scene=scene
    scene.frame_start=1;scene.frame_end=FRAME_COUNT;scene.render.fps=FPS;scene.render.fps_base=1
    scene.render.engine='BLENDER_EEVEE_NEXT';scene.eevee.taa_render_samples=32
    scene.render.resolution_x=1920;scene.render.resolution_y=1080;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
    scene.render.film_transparent=False
    scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
    scene.view_settings.exposure=0;scene.view_settings.gamma=1
    scene.world=bpy.data.worlds['Undecorated white-gray background']
    base_cube=bpy.data.objects['UnitCube'];base_plane=bpy.data.objects['TotalPlane']
    blue=base_cube.data.materials[0].copy();blue.name=episode+'_Seal_Blue'
    blue.surface_render_method='BLENDED';blue.use_transparency_overlap=False
    yellow=base_plane.data.materials[0].copy();yellow.name=episode+'_Seal_Yellow'
    yellow.surface_render_method='BLENDED';yellow.use_transparency_overlap=False
    p=yellow.node_tree.nodes['Principled BSDF']
    yellow_color=p.inputs['Base Color'].default_value[:]
    p.inputs['Base Color'].default_value=(0,0,0,1)
    p.inputs['Emission Color'].default_value=yellow_color;p.inputs['Emission Strength'].default_value=1
    x_initial=[-2.025,-.675,.675,2.025];x_final=[-1.5,-.5,.5,1.5]
    blocks=[]
    for column in range(4):
        for level in range(height):
            obj=bpy.data.objects.new(episode+'_Column_%d_Unit_%02d'%(column+1,level+1),base_cube.data.copy())
            scene.collection.objects.link(obj);obj.data.materials.clear();obj.data.materials.append(blue)
            obj['unitValue']=1;obj['column']=column+1;obj['level']=level+1
            blocks.append((obj,column,level))
    for frame in range(1,FRAME_COUNT+1):
        motion=ease((frame-40)/60)
        for obj,column,level in blocks:
            obj.location=(x_initial[column]+(x_final[column]-x_initial[column])*motion,0,level+.5)
            obj.keyframe_insert('location',frame=frame)
        alpha=1-ease((frame-100)/24)
        b=blue.node_tree.nodes['Principled BSDF'].inputs['Alpha'];b.default_value=alpha;b.keyframe_insert('default_value',frame=frame)
        y=yellow.node_tree.nodes['Principled BSDF'].inputs['Alpha'];y.default_value=.5*(1-alpha);y.keyframe_insert('default_value',frame=frame)
    rectangle=bpy.data.objects.new(episode+'_Total_Rectangle',base_plane.data.copy());scene.collection.objects.link(rectangle)
    rectangle.data.materials.clear();rectangle.data.materials.append(yellow)
    rectangle.scale=(4,1,height);rectangle.location=(0,-.515,height/2)
    rectangle['width']=4;rectangle['height']=height;rectangle['area']=4*height
    bpy.ops.object.camera_add(location=CAMERA_LOCATION)
    cam=bpy.context.object;cam.name=episode+'_Fixed_Orthographic_Camera'
    cam.rotation_euler=(Vector(CAMERA_TARGET)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO';cam.data.ortho_scale=ORTHO_SCALE;cam.data.lens=50;scene.camera=cam
    for label,location,energy,size in [('Key',(-4,-6,10),600,7),('Fill',(5,-5,4),150,7)]:
        bpy.ops.object.light_add(type='AREA',location=location);light=bpy.context.object
        light.name=episode+'_Soft_'+label;light.data.energy=energy;light.data.size=size
        light.rotation_euler=(Vector((0,0,4))-light.location).to_track_quat('-Z','Y').to_euler()
    scene['episode']=episode;scene['sharedAnimationFunction']='make_episode_seal(episode,height)'
    scene['initialHeights']=[height]*4;scene['finalHeights']=[height]*4
    scene['preservedUnitCount']=height*4;scene['timing']=TIMING
    scene['noTextOrNumbers']=True;scene['noAudio']=True
    scene['cameraSharedScale']=ORTHO_SCALE
    frame_dir=os.path.join(ROOT,'frames-'+episode);os.makedirs(frame_dir,exist_ok=True)
    scene.render.filepath=os.path.join(frame_dir,'frame_');scene.frame_set(1)
    return scene

def build_episode_seals():
    assert bpy.app.version[:2]==(4,5),bpy.app.version_string
    scenes={episode:make_episode_seal(episode,height) for episode,height in [('E0',8),('E1',6)]}
    report={}
    for episode,scene in scenes.items():
        bpy.context.window.scene=scene;scene.frame_set(1);bpy.context.view_layer.update()
        count=int(scene['preservedUnitCount']);height=int(scene['initialHeights'][0])
        blocks=[o for o in scene.objects if o.name.startswith(episode+'_Column_')]
        assert len(blocks)==count
        assert all(all(abs(d-1)<1e-7 for d in o.dimensions) for o in blocks)
        assert not any(o.type=='FONT' for o in scene.objects)
        samples={}
        for frame in (1,40,70,100,124,150):
            scene.frame_set(frame);bpy.context.view_layer.update()
            columns={str(c):[o for o in blocks if o['column']==c] for c in range(1,5)}
            column_report={}
            for c,objects in columns.items():
                z=sorted(round(o.location.z,6) for o in objects)
                assert z==[n+.5 for n in range(height)]
                column_report[c]={'units':len(objects),'center_x':round(objects[0].location.x,6),'center_heights':z}
            samples[str(frame)]={'columns':column_report,
                'blue_alpha':bpy.data.materials[episode+'_Seal_Blue'].node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value,
                'yellow_alpha':bpy.data.materials[episode+'_Seal_Yellow'].node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value}
        rectangle=bpy.data.objects[episode+'_Total_Rectangle']
        assert abs(rectangle.dimensions.x-4)<1e-7 and abs(rectangle.dimensions.z-height)<1e-7
        assert samples['150']['blue_alpha']==0 and samples['150']['yellow_alpha']==.5
        assert [samples['100']['columns'][str(c)]['center_x'] for c in range(1,5)]==[-1.5,-.5,.5,1.5]
        report[episode]={'scene':scene.name,'file':'seal-'+episode+'.mp4','column_count':4,'height':height,'unit_count':count,
            'initial_heights':[height]*4,'final_heights':[height]*4,'rectangle_dimensions_gltf_xyz':[4,height,0],
            'camera_blender_xyz':list(CAMERA_LOCATION),'camera_target_blender_xyz':list(CAMERA_TARGET),'ortho_scale':ORTHO_SCALE,
            'resolution':[1920,1080],'fps':FPS,'frame_count':FRAME_COUNT,'duration_seconds':5,'timing':TIMING,
            'unit_screen_pixels':1920/ORTHO_SCALE,'screen_baseline_y':540+4*1920/ORTHO_SCALE,
            'final_rectangle_screen_bounds_px':{'left':960-2*1920/ORTHO_SCALE,'right':960+2*1920/ORTHO_SCALE,
              'top':540+(4-height)*1920/ORTHO_SCALE,'bottom':540+4*1920/ORTHO_SCALE},'animation_samples':samples}
    c0=scenes['E0'].camera;c1=scenes['E1'].camera
    assert c0.location==c1.location and c0.rotation_euler==c1.rotation_euler and c0.data.ortho_scale==c1.data.ortho_scale
    bpy.context.window.scene=scenes['E0'];scenes['E0'].frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT,'mean-common-v1.blend'))
    with open(os.path.join(ROOT,'episode-seal-validation.json'),'w') as f:
        json.dump({'version':bpy.app.version_string,'shared_camera_verified':True,'result':'PASS','episodes':report},f,indent=2)
    path=os.path.join(ROOT,'assetmetadata.json')
    metadata=json.load(open(path));metadata['episode_seals']=report
    metadata['web_seal_files']={'E0':'seal-E0.mp4','E1':'seal-E1.mp4'}
    metadata['seal']['usage']='Legacy abstract demonstration only; use episode_seals for E0/E1 numeric overlays.'
    with open(path,'w') as f:json.dump(metadata,f,indent=2)
    print('EPISODE_SEALS_RESULT '+json.dumps({'version':bpy.app.version_string,'episodes':{k:{'units':v['unit_count'],'height':v['height']} for k,v in report.items()},'shared_camera':True}))

if __name__=='__main__':build_episode_seals()
