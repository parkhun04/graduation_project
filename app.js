const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const rtsp = require('rtsp-ffmpeg');
const morgan = require('morgan');
const fs = require('fs');
const logger = require("./logger");

// morgan 출력 형식 지정
if(process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // 배포환경이면
} else {
  app.use(morgan('dev')); // 개발환경이면
}

const uri = 'rtsp://203.234.75.58:8554/mjpeg/1';
const stream = new rtsp.FFMpeg({ 
  input: uri,
  timeout: 10
});

io.on('connection', function(socket) {
  console.log('client connected');
  logger.info("클라이언트 연결");

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
  socket.on('save', function (data) {
    if (data === '1') {
      logger.info("영상 저장 시도");
    }
    else {
      logger.error("영상 저장 실패");
    }
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