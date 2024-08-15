const W_WIDTH = window.innerWidth;
const W_HEIGHT = window.innerHeight;
const W_ASPECT = window.innerWidth / window.innerHeight;
const W_RATIO = window.devicePixelRatio;

let camera, scene, renderer, earth, controls;
const tokyoLat = 35.6895;
const tokyoLon = 139.6917;

const cameraPosition = { x: 0, y: 0, z: 400 }; // 初期カメラ位置
const targetPosition = { x: 0, y: 0, z: 400 }; // 目標カメラ位置（東京）

// カメラをスムーズに移動するアニメーション関数
function animateCameraTransition(duration) {
    const start = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const end = { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z };
    const startTime = performance.now();

    function updateCamera(time) {
        const elapsed = (time - startTime) / duration;
        const t = Math.min(elapsed, 1);

        camera.position.x = start.x + (end.x - start.x) * t;
        camera.position.y = start.y + (end.y - start.y) * t;
        camera.position.z = start.z + (end.z - start.z) * t;
        camera.lookAt(tokyoLat, tokyoLon, 0);

        if (t < 1) {
            requestAnimationFrame(updateCamera);
        }
    }

    requestAnimationFrame(updateCamera);
}

function setCameraToTokyo() {
    targetPosition.x = latLongToVector3(tokyoLat, tokyoLon, 100).x * 4;
    targetPosition.y = latLongToVector3(tokyoLat, tokyoLon, 100).y * 4;
    targetPosition.z = latLongToVector3(tokyoLat, tokyoLon, 100).z * 4;
    animateCameraTransition(1000); // アニメーションの長さをミリ秒で指定
}

window.onload = () => {
    // カメラを作成
    camera = new THREE.PerspectiveCamera(50, W_ASPECT, 1, 1000);
    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z); // 初期位置を設定

    // シーンを作成
    scene = new THREE.Scene();

    // 星のパーティクルシステムを作成
    const starCount = 10000; // 星の数
    const starGeometry = new THREE.BufferGeometry();
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.5 // 星のサイズ
    });

    // 星の位置をランダムに設定
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
        positions[i * 3] = Math.random() * 2000 - 1000; // X座標
        positions[i * 3 + 1] = Math.random() * 2000 - 1000; // Y座標
        positions[i * 3 + 2] = Math.random() * 2000 - 1000; // Z座標
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // ライトを追加
    let ambLight = new THREE.AmbientLight(0xffffff, 1); // 全体を均等に明るくする
    scene.add(ambLight);

    // ディレクショナルライトを追加
    let dirLight = new THREE.DirectionalLight(0xffffff, 0.5); // 光の強さを調整
    dirLight.position.set(1, 1, 1).normalize(); // 光の方向を設定
    scene.add(dirLight);

    // レンダラーを作成
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(W_RATIO);
    renderer.setSize(W_WIDTH, W_HEIGHT);

    // レンダラーをHTMLに追加
    let div = document.getElementById("three");
    div.appendChild(renderer.domElement);

    // 地球儀のテクスチャを読み込む
    let txLoader = new THREE.TextureLoader();
    let normalMap = txLoader.load("./assets/earth_tx.png");

    // 地球儀のジオメトリとマテリアルを作成
    let geometry = new THREE.SphereBufferGeometry(100, 30, 30);
    let material = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        map: normalMap
    });

    // 地球儀をメッシュとして作成し、シーンに追加
    earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // OrbitControlsを初期化
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enablePan = false;
    controls.minDistance = 100;
    controls.maxDistance = 600;

    // 東京にピンを追加
    addPin(tokyoLat, tokyoLon);

    // カメラの位置を調整して東京が真ん中に来るようにする
    setCameraToTokyo();

    // アニメーションを開始
    animate();

    // 「Back to Huddle」ボタンのクリックイベントリスナーを追加
    document.getElementById('backToHuddle').addEventListener('click', setCameraToTokyo);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// 緯度経度を3Dベクトルに変換する関数
function latLongToVector3(lat, lon, radius) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);

    const x = -((radius) * Math.sin(phi) * Math.cos(theta));
    const z = ((radius) * Math.sin(phi) * Math.sin(theta));
    const y = ((radius) * Math.cos(phi));

    return new THREE.Vector3(x, y, z);
}

// ピンを地球儀に追加する関数
function addPin(lat, lon) {
    const radius = 100;
    const pinGeometry = new THREE.SphereGeometry(2, 16, 16);
    const pinMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const pinMesh = new THREE.Mesh(pinGeometry, pinMaterial);

    const pinPosition = latLongToVector3(lat, lon, radius);
    pinMesh.position.copy(pinPosition);

    scene.add(pinMesh);
}

// ピンがクリックされたときの処理
function onPinClick(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects(scene.children);
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log("ピンがクリックされました");
    }
}

window.addEventListener('click', onPinClick, false);
