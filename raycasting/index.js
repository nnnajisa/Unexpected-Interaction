/*
This example uses the OrbitControls addon by importing it separately from the main THREE codebase.
*/
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
//import { HDRLoader } from "three/addons/loaders/HDRLoader.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

let scene, camera, renderer;
let mouse;

function init() {
  // create a scene in which all other objects will exist
  scene = new THREE.Scene();

  // create a camera and position it in space
  let aspect = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
  camera.position.set(0, 20, 20);
  camera.lookAt(0, 0, 0);

  // the renderer will actually show the camera view within our <canvas>
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.style.margin = "0";
  document.body.style.overflow = "hidden";
  document.body.appendChild(renderer.domElement);

  // paper
  let theground = new THREE.Mesh(
    new THREE.BoxGeometry(60, 0.001, 60),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.4,
      roughness: 1,
      metalness: 0
    })
  );
  theground.position.y = -0.1;
  scene.add(theground);
  const light = new THREE.DirectionalLight(0xffffff, 1.2);
  light.position.set(5, 10, 5);
  scene.add(light);

  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambient);

  // add orbit controls
  let controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);

  controls.enableRotate = true;
  controls.enablePan = false;
  controls.enableZoom = true;

  controls.enableDamping = true;
  controls.dampingFactor = 0.08;

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: null
  };

  controls.update();

  // custom cursor
  let cursor = document.createElement("div");
  cursor.style.position = "fixed";
  cursor.style.left = "0px";
  cursor.style.top = "0px";
  cursor.style.width = "28px";
  cursor.style.height = "40px";
  cursor.style.pointerEvents = "none";
  cursor.style.zIndex = "9999";
  cursor.style.transform = "translate(-50%, -50%)";
  cursor.innerHTML = `
    <div style="position:relative;width:100%;height:100%;">
      <div style="position:absolute;left:50%;top:2px;transform:translateX(-50%);width:4px;height:36px;background:#d9d9d9;border-radius:2px;"></div>
      <div style="position:absolute;left:50%;top:0;transform:translateX(-50%);width:22px;height:4px;background:#d9d9d9;border-radius:2px;"></div>
      <div style="position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:22px;height:4px;background:#d9d9d9;border-radius:2px;"></div>
    </div>
  `;
  document.body.appendChild(cursor);
  document.body.style.cursor = "none";

  let raycaster = new THREE.Raycaster();
  let fontLoader = new FontLoader();
  let loadedFont;

  let letters = [];
  let hoveredLetter = null;
  let selectedLetter = null;
  let draggingLetter = false;
  let dragOffsetX = 0;
  let dragOffsetZ = 0;

  const defaultColor = 0x000000;
  const hoverColor = 0x666666;
  const normalScale = 1;
  const hoverScale = 1.08;

  fontLoader.load(
    "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
    function (font) {
      loadedFont = font;
      console.log("font loaded!");
    }
  );

  // add a raycast on move
  mouse = new THREE.Vector2(0, 0);
  document.addEventListener(
    "mousemove",
    (ev) => {
      mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;

      cursor.style.left = `${ev.clientX}px`;
      cursor.style.top = `${ev.clientY}px`;

      raycaster.setFromCamera(mouse, camera);

      // reset all letters first
      hoveredLetter = null;
      for (let i = 0; i < letters.length; i++) {
        if (!letters[i].userData.flying) {
          letters[i].material.color.set(defaultColor);
          letters[i].scale.set(normalScale, normalScale, normalScale);
        }
      }

      // keep selected letter selected state
      if (selectedLetter && !selectedLetter.userData.flying) {
        selectedLetter.material.color.set(hoverColor);
        selectedLetter.scale.set(normalScale, normalScale, normalScale);
      }

      // check letter hover first
      let hoverCandidates = letters.filter(letter => !letter.userData.flying);
      let letterIntersections = raycaster.intersectObjects(hoverCandidates);

      if (letterIntersections[0]) {
        hoveredLetter = letterIntersections[0].object;

        if (hoveredLetter !== selectedLetter) {
          hoveredLetter.material.color.set(hoverColor);
          hoveredLetter.scale.set(hoverScale, hoverScale, hoverScale);
        }
      }

      // drag selected letter
      if (draggingLetter && selectedLetter && !selectedLetter.userData.flying) {
        let intersections = raycaster.intersectObject(theground);
        if (intersections[0]) {
          let pointInSpace = intersections[0].point;
          selectedLetter.position.x = pointInSpace.x + dragOffsetX;
          selectedLetter.position.z = pointInSpace.z + dragOffsetZ;
        }
      }
    },
    false
  );

  // click
  document.addEventListener("pointerdown", () => {
    raycaster.setFromCamera(mouse, camera);

    let clickableLetters = letters.filter(letter => !letter.userData.flying);
    let letterIntersections = raycaster.intersectObjects(clickableLetters);

    // clicked a letter
    if (letterIntersections[0]) {
      let clickedLetter = letterIntersections[0].object;

      // clicked the currently selected letter -> keep selection
      if (selectedLetter === clickedLetter) {
        let groundIntersections = raycaster.intersectObject(theground);
        if (groundIntersections[0]) {
          let pointInSpace = groundIntersections[0].point;
          dragOffsetX = selectedLetter.position.x - pointInSpace.x;
          dragOffsetZ = selectedLetter.position.z - pointInSpace.z;
        }

        draggingLetter = true;
        controls.enabled = false;
        return;
      }

      // clicked a different letter -> select the new one
      if (selectedLetter) {
        selectedLetter.material.color.set(defaultColor);
        selectedLetter.scale.set(normalScale, normalScale, normalScale);
      }

      selectedLetter = clickedLetter;
      selectedLetter.material.color.set(hoverColor);
      selectedLetter.scale.set(normalScale, normalScale, normalScale);

      let groundIntersections = raycaster.intersectObject(theground);
      if (groundIntersections[0]) {
        let pointInSpace = groundIntersections[0].point;
        dragOffsetX = selectedLetter.position.x - pointInSpace.x;
        dragOffsetZ = selectedLetter.position.z - pointInSpace.z;
      }

      draggingLetter = true;
      controls.enabled = false;
      return;
    }

    // clicked empty paper -> deselect current letter
    if (selectedLetter) {
      selectedLetter.material.color.set(defaultColor);
      selectedLetter.scale.set(normalScale, normalScale, normalScale);
      selectedLetter = null;
    }
  });

  document.addEventListener("pointerup", () => {
    draggingLetter = false;
    controls.enabled = true;
  });

  // double click -> fly away
  document.addEventListener("dblclick", () => {
    raycaster.setFromCamera(mouse, camera);

    let clickableLetters = letters.filter(letter => !letter.userData.flying);
    let letterIntersections = raycaster.intersectObjects(clickableLetters);

    if (letterIntersections[0]) {
      let clickedLetter = letterIntersections[0].object;
      clickedLetter.userData.flying = true;

      if (selectedLetter === clickedLetter) {
        selectedLetter = null;
      }
    }
  });

  // keyboard
  document.addEventListener("keydown", (ev) => {
    // delete selected letter
    if ((ev.key === "Delete" || ev.key === "Backspace") && selectedLetter) {
      scene.remove(selectedLetter);
      letters = letters.filter(letter => letter !== selectedLetter);
      selectedLetter = null;
      return;
    }

    // place letter
    if (/^[a-zA-Z]$/.test(ev.key) && loadedFont) {
      raycaster.setFromCamera(mouse, camera);
      let intersections = raycaster.intersectObject(theground);

      if (intersections[0]) {
        let pointInSpace = intersections[0].point;

        let textGeo = new TextGeometry(ev.key.toUpperCase(), {
          font: loadedFont,
          size: 1.8,
          depth: 0.18,
          bevelEnabled: true,
          bevelThickness: 0.03,
          bevelSize: 0.02,
          bevelSegments: 2
        });

        textGeo.computeBoundingBox();
        let bbox = textGeo.boundingBox;
        let xSize = bbox.max.x - bbox.min.x;
        let ySize = bbox.max.y - bbox.min.y;
        let zSize = bbox.max.z - bbox.min.z;
        textGeo.translate(-xSize / 2, -ySize / 2, -zSize / 2);

        let mesh = new THREE.Mesh(
          textGeo,
          new THREE.MeshStandardMaterial({ color: defaultColor })
        );

        mesh.position.set(pointInSpace.x, pointInSpace.y + 0.2, pointInSpace.z);

        // lay the letter flat on the paper
        mesh.rotation.x = -Math.PI / 2;

        // use current camera direction for the newly placed letter
        let dx = camera.position.x - controls.target.x;
        let dz = camera.position.z - controls.target.z;
        let angle = Math.atan2(dx, dz);
        mesh.rotation.z = angle;

        mesh.userData.flying = false;

        scene.add(mesh);
        letters.push(mesh);
      }
    }
  });

  // resize
  window.addEventListener("resize", () => {
    let aspect = window.innerWidth / window.innerHeight;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  loop();

  function loop() {
    // simple fly-away animation
    for (let i = letters.length - 1; i >= 0; i--) {
      let letter = letters[i];

      if (letter.userData.flying) {
        letter.position.y += 0.5;
        letter.scale.multiplyScalar(0.98);
        letter.rotation.z += 0.05;

        if (letter.position.y > 30) {
          scene.remove(letter);
          letters.splice(i, 1);
        }
      }
    }

    controls.update();
    renderer.render(scene, camera);
    window.requestAnimationFrame(loop);
  }
}

init();