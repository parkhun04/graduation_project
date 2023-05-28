const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const rtsp = require('rtsp-ffmpeg');
const morgan = require('morgan');
const fs = require('fs');
const logger = require("./logger");
const axios = require('axios');
const querystring = require('querystring');

const esp32CamIP = '192.168.0.119';
const servoUrl = `http://${esp32CamIP}/servo`;
let servo1Angle = 90; // 초기 각도 설정
let servo2Angle = 90; // 초기 각도 설정

// 서보모터 제어 요청 보내기
async function controlServo1() {
  try {
    // 서보1 제어
    let data1 = querystring.stringify({ servo1:servo1Angle });
    await axios.post(servoUrl, data1, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
      .then(response => {
        // 요청이 성공적으로 처리됨
        console.log('요청이 성공적으로 처리되었습니다.', response.data);
      })
      .catch(error => {
        // 요청이 실패함
        console.error('요청 실패:', error.message);
      });

    console.log('서보모터 제어 요청을 보냈습니다.');
  } catch (error) {
    console.error('서보모터 제어 요청 실패:', error.message);
  }
}

async function controlServo2() {
  try {
    // 서보2 제어
    let data2 = querystring.stringify({ servo2:servo2Angle });
    await axios.post(servoUrl, data2, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })
   .then(response => {
     // 요청이 성공적으로 처리됨
     console.log('요청이 성공적으로 처리되었습니다.', response.data);
   })
   .catch(error => {
     // 요청이 실패함
     console.error('요청 실패:', error.message);
   });

    console.log('서보모터 제어 요청을 보냈습니다.');
  } catch (error) {
    console.error('서보모터 제어 요청 실패:', error.message);
  }
}



// morgan 출력 형식 지정
if(process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // 배포환경이면
} else {
  app.use(morgan('dev')); // 개발환경이면
}

const uri = 'rtsp://192.168.0.119:8554/mjpeg/1';
const stream = new rtsp.FFMpeg({ 
  input: uri,
  timeout: 10
});

io.on('connection', function(socket) {
  console.log('client connected');
  logger.info("클라이언트 연결");
  controlServo1();
  controlServo2();

  let isFirstData = true;
  let timerId = null;
  
  const pipeStream = function(data) {
    socket.emit('data', Buffer.from(data).toString('base64'));
    if (isFirstData) {
      logger.info("rtsp 데이터 수신 시작");
      isFirstData = false;
    }
    if (timerId !== null) {
      clearTimeout(timerId);
    }
    timerId = setTimeout(function() {
      // 일정 시간동안 데이터가 없으면 연결을 끊습니다.
      socket.emit('close');
      socket.disconnect();
    }, 10000);
  };
  stream.on('data', pipeStream);

  socket.on('video', (data) => {
    const date = new Date();
    const fileName = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}_${date.getHours()}-${date.getMinutes()}-${date.getSeconds()}.mp4`;
    fs.writeFile(fileName, data, function (err) {
      if (err) throw err;
      console.log(`${fileName} saved`);
    });
  });
  
  socket.on('video-stop', () => {
    console.log('Recording stopped');
  });

  //영상 저장 로그
  socket.on('save', function () {
    logger.info("영상 저장 시도");
  })

  socket.on('camara_u', function () {
    servo1Angle += 10;
    controlServo1();
  })

  socket.on('camara_d', function () {
    servo1Angle -= 10;
    controlServo1();
  })

  socket.on('camara_l', function () {
    servo2Angle += 10;
    controlServo2();
  })

  socket.on('camara_r', function () {
    servo2Angle -= 10;
    controlServo2();
  })

  socket.on('disconnect', function() {
    console.log('client disconnected');
    logger.info("클라이언트 연결 끊김");
    stream.removeListener('data', pipeStream);
  });
});

app.get('/', function(req, res) {
  res.sendFile(__dirname + '/index.html');
});

server.listen(3000);