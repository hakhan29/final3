const video = document.getElementById('video');
const expressionDiv = document.getElementById('expression');

// 모델 파일 로드
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('./models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('./models'),
    faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo);

function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => video.srcObject = stream)
        .catch(err => console.error(err));
}

video.addEventListener('play', () => {
    const canvas = faceapi.createCanvasFromMedia(video);
    document.body.append(canvas);

    // 사각형 캔버스 생성
    const rectCanvas = document.createElement('canvas');
    rectCanvas.width = 720; // 비디오와 동일한 너비
    rectCanvas.height = 100; // 사각형의 높이
    rectCanvas.style.position = 'absolute';
    rectCanvas.style.bottom = '0px';
    rectCanvas.style.left = '0px';
    document.body.append(rectCanvas);
    const rectContext = rectCanvas.getContext('2d');

    // 감정 텍스트를 보여줄 Div
    const expressionDiv = document.createElement('div');
    expressionDiv.style.position = 'absolute';
    expressionDiv.style.bottom = '110px'; // 사각형 위에 표시
    expressionDiv.style.width = '100%';
    expressionDiv.style.textAlign = 'center';
    expressionDiv.style.fontSize = '24px';
    expressionDiv.style.color = 'white';
    expressionDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    expressionDiv.style.padding = '10px';
    document.body.append(expressionDiv);

    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

        if (detections.length > 0) {
            const expressions = detections[0].expressions;

            // 감정을 비율로 정렬하여 가장 높은 두 개 선택
            const sortedExpressions = Object.entries(expressions)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 2); // 상위 두 개 감정 추출

            if (sortedExpressions.length === 2) {
                const [emotion1, value1] = sortedExpressions[0];
                const [emotion2, value2] = sortedExpressions[1];

                // 감정 이름 표시
                expressionDiv.innerText = `${emotion1.toUpperCase()} (${(value1 * 100).toFixed(1)}%) - ${emotion2.toUpperCase()} (${(value2 * 100).toFixed(1)}%)`;

                // 사각형 그라데이션 생성
                const gradient = rectContext.createLinearGradient(0, 0, rectCanvas.width, 0); // 좌에서 우로 그라데이션
                const colors = {
                    anger: 'rgba(255, 0, 0, 1)',        // 빨강
                    happy: 'rgba(255, 255, 0, 1)',      // 노랑
                    sad: 'rgba(0, 0, 255, 1)',          // 파랑
                    neutral: 'rgba(255, 255, 255, 1)',  // 흰색
                    surprised: 'rgba(255, 165, 0, 1)',  // 주황
                    fear: 'rgba(128, 0, 128, 1)'        // 보라
                };

                // 감정 비율에 따라 중간 지점 조정
                const stopMid = value1 / (value1 + value2); // 첫 번째 감정이 차지하는 비율
                gradient.addColorStop(0, colors[emotion1] || 'white');
                gradient.addColorStop(stopMid, colors[emotion1] || 'white');
                gradient.addColorStop(1, colors[emotion2] || 'white');

                // 캔버스 초기화 및 그라데이션 채우기
                rectContext.clearRect(0, 0, rectCanvas.width, rectCanvas.height);
                rectContext.fillStyle = gradient;
                rectContext.fillRect(0, 0, rectCanvas.width, rectCanvas.height);
            }
        } else {
            // 감정이 감지되지 않을 때 초기화
            expressionDiv.innerText = '감정 감지 중...';
            rectContext.clearRect(0, 0, rectCanvas.width, rectCanvas.height);
        }
    }, 100);
});
