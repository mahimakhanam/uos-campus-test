
    import * as THREE from "three";
    import {OrbitControls} from "three/addons/controls/OrbitControls.js";
    import {SVGLoader} from "three/addons/loaders/SVGLoader.js";

    // The SVG viewBox defines our shared coordinate reference.
    // Both the background image and extruded SVG paths must follow this mapping.
    const W=1512, H=4535;

    const names = {
    C1: "College of Sharia & Islamic Studies / Law",
    C2: "College of Arts, Humanities & Social Sciences / Public Policy",
    C3: "College of Arts, Humanities & Social Sciences",
    C4: "Dining Hall",
    C5: "Women's Students Center",
    C7: "Library",
    C9: "College of Computing & Informatics",
    C13: "College of Engineering"
};

    const colors = {
    C7: 0x396bc1,
    C5: 0x119579,
    C4: 0xc79639,
    C9: 0x396bc1
};

    const DISPLAY_HEIGHT=34; // Visual thickness only; NOT a real architectural measurement.
    const status=document.querySelector('#status');
    const stage=document.querySelector('#stage');
    const scene=new THREE.Scene();
    scene.background=new THREE.Color(0xe9eeeb);
    const camera=new THREE.PerspectiveCamera(45,1,1,12000);
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    stage.appendChild(renderer.domElement);

    const controls=new OrbitControls(camera,renderer.domElement);
    controls.enableDamping=true;
    controls.dampingFactor=.07;
    controls.minDistance=65;
    controls.maxDistance=6400;
    controls.maxPolarAngle=Math.PI/2-.07;

    // ONE coordinate system for the image AND 3D geometry:
    // SVG pixels: x increases right, y increases down.
    // Three.js ground: X right, Z down the image, Y is vertical.
    // Keeping Z = svgY - H/2 means the PDF is readable from our camera above +Z.
    const worldAt=(x,y)=>new THREE.Vector3(x-W/2,0,y-H/2);
    const home=worldAt(650,1835);
    function setView(mode,focus=home){
    controls.target.copy(focus);
    // A small +Z offset avoids looking straight down parallel to camera.up.
    if(mode==='top')camera.position.set(focus.x,focus.y+850,focus.z+4);
    else if(mode==='side')camera.position.set(focus.x+730,focus.y+160,focus.z+100);
    else camera.position.set(focus.x+435,focus.y+460,focus.z+475);
    camera.lookAt(focus);
    controls.update();
}
    setView('angle');
    document.getElementById('reset').onclick=()=>setView('angle');
    document.getElementById('top').onclick = () => setView('top', controls.target.clone());
    document.getElementById('angle').onclick = () => setView('angle', controls.target.clone());
    document.getElementById('side').onclick = () => setView('side', controls.target.clone());

    // Ground: the top edge of the SVG becomes world Z = -H/2.
    // A -90° X rotation faces the textured plane upward (+Y), so the map
    // reads upright from the default 3D camera and Top view.
    // Crucially, the SVG buildings below use the SAME Z = imageY - H/2 rule.
    const ground=new THREE.Mesh(
    new THREE.PlaneGeometry(W,H),
    new THREE.MeshBasicMaterial({color:0xffffff,side:THREE.DoubleSide})
    );
    ground.rotation.x=-Math.PI/2;
    ground.position.y=-.6;
    scene.add(ground);
    new THREE.TextureLoader().load('images/campus-map.svg',tex=>{
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    ground.material.map=tex;
    ground.material.needsUpdate=true;
},undefined,()=>status.textContent='Could not load images/campus-map.svg. Check project files.');
    scene.add(new THREE.HemisphereLight(0xffffff,0xbed0c8,2.6));
    const light=new THREE.DirectionalLight(0xffffff,1.7);
    light.position.set(-250,650,250);
    scene.add(light);

    // True building footprints: reuse named paths that already exist in the SVG.
    const groups=new Map();
    const svgLoader=new SVGLoader();
    function makeBuilding(svgDoc,id){
    const node=svgDoc.getElementById('building-'+id);
    if(!node)throw new Error('SVG path #building-'+id+' was not found');
    const isolated=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`+
    new XMLSerializer().serializeToString(node)+'</svg>';
    const parsed=svgLoader.parse(isolated);
    const collection=[];
    for(const path of parsed.paths){
    for(const shape of SVGLoader.createShapes(path)){
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:DISPLAY_HEIGHT,bevelEnabled:false,curveSegments:12});
    // SVG (x,y) -> (x-W/2, y-H/2) on the ground plane.
    // Rotating +90° maps SVG +Y to world +Z (down the image).
    // Extrusion points toward -worldY, so lift geometry by DISPLAY_HEIGHT:
    // its top cap is at +DISPLAY_HEIGHT and its base stays at ground level.
    geometry.rotateX(Math.PI/2);
    geometry.translate(-W/2,DISPLAY_HEIGHT,-H/2);
    const material = new THREE.MeshStandardMaterial({
    color: colors[id],
    roughness: 0.9,
    metalness: 0,
    flatShading: true
});
    const mesh=new THREE.Mesh(geometry,material);

    const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 35),
    new THREE.LineBasicMaterial({
    color: 0x1f3549,
    transparent: true,
    opacity: 0.28
})
    );

    mesh.add(edges);

    mesh.position.y=.5;
    mesh.userData.buildingId=id;
    scene.add(mesh);
    collection.push(mesh);
}
}
    if(!collection.length)throw new Error('No geometry for '+id);
    groups.set(id,collection);
}

    let chosen=null;
    let hovering=null;
    const allMeshes=()=>[...groups.values()].flat();
    function updateColors(){
    for(const [id,list] of groups){
    for(const m of list){
    m.material.color.set(id===chosen?0xf5ac42:colors[id]);
    m.material.emissive.set(id===hovering && id!==chosen?0x173b32:0x000000);
}
}
}
    function selectBuilding(id){
    if(!groups.has(id))return;
    chosen=id;
    updateColors();
    document.querySelectorAll('[data-building]').forEach(b=>b.classList.toggle('selected',b.dataset.building===id));
    document.querySelector('#details').textContent=`${id} · ${names[id]} — SVG building footprint with fixed illustrative 3D extrusion.`;
    const box=new THREE.Box3();
    for(const m of groups.get(id))box.expandByObject(m);
    const c=box.getCenter(new THREE.Vector3());
    controls.target.set(c.x,0,c.z);
    camera.position.set(c.x+220,200,c.z+250);
    controls.update();
}
    document.querySelectorAll('[data-building]').forEach(b=>b.addEventListener('click',()=>selectBuilding(b.dataset.building)));

    // Raycasting = determine which 3D shape the pointer is over.
    const raycaster=new THREE.Raycaster();
    const pointer=new THREE.Vector2();
    const tag=document.querySelector('#hoverTag');
    function findHit(e){
    const rect=renderer.domElement.getBoundingClientRect();
    pointer.set(2*(e.clientX-rect.left)/rect.width-1,1-2*(e.clientY-rect.top)/rect.height);
    raycaster.setFromCamera(pointer,camera);
    return raycaster.intersectObjects(allMeshes(),false)[0];
}
    let down=null;
    renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,button:e.button};});
    renderer.domElement.addEventListener('pointerup',e=>{
    if(!down)return;
    const click=down.button===0 && Math.hypot(e.clientX-down.x,e.clientY-down.y)<5;
    down=null;
    if(click){const hit=findHit(e);if(hit)selectBuilding(hit.object.userData.buildingId);}
});
    renderer.domElement.addEventListener('pointermove',e=>{
    if(e.buttons!==0){tag.style.display='none';return;}
    const hit=findHit(e);
    const id=hit?.object?.userData?.buildingId??null;
    if(id!==hovering){hovering=id;updateColors();}
    renderer.domElement.style.cursor=id?'pointer':'grab';
    if(id){
    const rect=document.querySelector('#canvasArea').getBoundingClientRect();
    tag.textContent=`${id} · ${names[id]}`;
    tag.style.left=(e.clientX-rect.left+12)+'px';
    tag.style.top=(e.clientY-rect.top+12)+'px';
    tag.style.display='block';
}else tag.style.display='none';
});
    renderer.domElement.addEventListener('pointerleave',()=>{hovering=null;updateColors();tag.style.display='none';});

    async function loadBuildings(){
    try{
    const res=await fetch('images/campus-map.svg');
    if(!res.ok)throw new Error('SVG request failed: '+res.status);
    const doc=new DOMParser().parseFromString(await res.text(),'image/svg+xml');
    if(doc.querySelector('parsererror'))throw new Error('Invalid SVG format');

    const buildingIds = [
    ...doc.querySelectorAll('[id^="building-"]')
    ].map(element => element.id.replace("building-", ""));

    console.log("Buildings found in SVG:", buildingIds);


    const campusBuildings = buildingIds.filter(
    id => id.startsWith("C")
    );

    for (const id of campusBuildings) {

    // Give new buildings a temporary name
    if (!names[id]) {
    names[id] = "Building " + id;
}

    // Give new buildings a default blue color
    if (!colors[id]) {
    colors[id] = 0x396bc1;
}

    // Convert the SVG outline into 3D
    makeBuilding(doc, id);
}

    console.log("3D models created:", [...groups.keys()]);


    const detailsPanel = document.getElementById("details");

// Remove the three old, manually created buttons
    document.querySelectorAll("aside .building").forEach(button => {
    button.remove();
});

// Create buttons for all successfully loaded 3D buildings
    for (const id of groups.keys()) {
    const button = document.createElement("button");
    button.className = "building";
    button.dataset.building = id;

    const label = document.createElement("span");
    label.textContent = id + " · " + names[id];

    const category = document.createElement("small");
    category.textContent = "Zone C";

    button.append(label, category);

    // Clicking the button selects the corresponding 3D building
    button.addEventListener("click", () => {
    selectBuilding(id);
});

    detailsPanel.before(button);
}

    status.textContent =
    groups.size + " buildings successfully loaded in 3D.";
}catch(err){
    status.textContent='Unable to load buildings: '+err.message+'. Run from IntelliJ local server.';
    console.error(err);
}
}
    function resize(){
    if(!stage.clientWidth||!stage.clientHeight)return;
    camera.aspect=stage.clientWidth/stage.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.clientWidth,stage.clientHeight,false);
}
    new ResizeObserver(resize).observe(stage);
    resize();
    function frame(){requestAnimationFrame(frame);controls.update();renderer.render(scene,camera);}
    loadBuildings();
    frame();

    document.getElementById('buildingSearch')
    .addEventListener('input', (event) => {

    const query = event.target.value
    .trim()
    .toLowerCase();

    document.querySelectorAll('aside .building')
    .forEach(button => {

    const name = button.textContent.toLowerCase();

    button.style.display =
    name.includes(query) ? '' : 'none';

});
});

    function zoomMap(factor) {
    const offset = camera.position.clone()
    .sub(controls.target);

    const distance = offset.length();

    const newDistance = THREE.MathUtils.clamp(
    distance * factor,
    Math.max(1, controls.minDistance),
    controls.maxDistance
    );

    if (distance === 0) return;

    camera.position.copy(controls.target)
    .addScaledVector(offset, newDistance / distance);

    controls.update();
}

    document.getElementById("zoomIn").onclick =
    () => zoomMap(0.8);

    document.getElementById("zoomOut").onclick =
    () => zoomMap(1.25);


    // Move the map in the direction of the screen arrows

    // Move the visible map in the arrow's direction
    const panRay = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(
        new THREE.Vector3(0, 1, 0), 0
    );

    function groundUnderScreen(x, y) {
        panRay.setFromCamera(new THREE.Vector2(x, y), camera);
        return panRay.ray.intersectPlane(
            groundPlane,
            new THREE.Vector3()
        );
    }

    function panMap(x, y) {
        if (!stage.clientWidth || !stage.clientHeight) return;

        const pixels = Math.max(
            24, Math.min(80, stage.clientHeight * 0.07)
        );

        camera.updateMatrixWorld();

        const center = groundUnderScreen(0, 0);
        const shifted = groundUnderScreen(
            x * pixels * 2 / stage.clientWidth,
            y * pixels * 2 / stage.clientHeight
        );

        if (!center || !shifted) return;

        const movement = center.sub(shifted);

        camera.position.add(movement);
        controls.target.add(movement);
        controls.update();
    }

    document.getElementById("panUp").onclick = () => panMap(0, -1);
    document.getElementById("panDown").onclick = () => panMap(0, 1);

    document.getElementById("panLeft").onclick =
    () => panMap(-1, 0);

    document.getElementById("panRight").onclick =
    () => panMap(1, 0);


    const toggleBuildingsButton =
        document.getElementById("toggleBuildings");

    let buildingsVisible = true;

    toggleBuildingsButton.addEventListener("click", () => {
        buildingsVisible = !buildingsVisible;

        for (const meshes of groups.values()) {
            for (const mesh of meshes) {
                mesh.visible = buildingsVisible;
            }
        }

        toggleBuildingsButton.textContent = buildingsVisible
            ? "Hide 3D Buildings"
            : "Show 3D Buildings";
    });
