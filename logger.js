const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const process = require('process');
const fs = require('fs');

// 이건 morgan 로그 시간이 현재 시간이랑 달라서 추가한 건데, 추가해도 그대로길래 일단 주석처리함
// 각자 로그에 뜨는 시간 동일한지 확인해봐
// const moment = require('moment');
// require('moment-timezone');
// moment.tz.setDefault('Asia/Seoul');
// const timestamp = () => moment().format('YYYY-MM-DD HH:mm:ss');

const { combine, timestamp, label, printf, colorize, simple } = winston.format;

const logDir = `${process.cwd()}/logs`;

const logFormat = printf(({ level, message, label, timestamp }) => {
   return `${timestamp} [${label}] ${level}: ${message}`;
});

if(!fs.existsSync(logDir)) {
   fs.mkdirSync(logDir);
}

const logger = winston.createLogger({
   // 로그 출력 형식 정의
   format: combine(
      label({ label: 'SECAM' }),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      logFormat // log 출력 포맷
      // format: combine() 에서 정의한 timestamp와 label 형식값이 logFormat에 들어가서 정의되게 된다. level이나 message는 콘솔에서 자동 정의
   ),

   // 실제 로그를 어떻게 기록을 한 것인가 정의
   transports: [
      // info 레벨 로그를 저장할 파일 설정 (info: 2 보다 높은 error: 0 와 warn: 1 로그들도 자동 포함해서 저장)
      new winstonDaily({
         level: 'info', // info 레벨에선
         datePattern: 'YYYY-MM-DD', // 파일 날짜 형식
         dirname: logDir, // 파일 경로
         filename: `%DATE%.log`, // 파일 이름
         maxFiles: 30, // 최근 30일치 로그 파일을 남김
         zippedArchive: true, // 아카이브된 로그 파일을 gzip으로 압축할지 여부
      }),

      // error 레벨 로그를 저장할 파일 설정 (info에 자동 포함되지만 일부러 따로 빼서 설정)
      new winstonDaily({
         level: 'error', // error 레벨에선
         datePattern: 'YYYY-MM-DD',
         dirname: logDir + '/error', // /logs/error 하위에 저장
         filename: `%DATE%.error.log`, // 에러 로그는 2020-05-28.error.log 형식으로 저장
         maxFiles: 30,
         zippedArchive: true,
      }),
   ],

   // uncaughtException 발생시 파일 설정
   exceptionHandlers: [
      new winstonDaily({
         level: 'error',
         datePattern: 'YYYY-MM-DD',
         dirname: logDir,
         filename: `%DATE%.exception.log`,
         maxFiles: 30,
         zippedArchive: true,
      }),
   ],
});

logger.stream = {
   // morgan winston 설정
   write: message => {
      logger.info(message);
   }
};

// Production 환경이 아닌, 개발 환경일 경우 파일 들어가서 일일히 로그 확인하기 번거로우니까 화면에서 바로 찍게 설정 (로그 파일은 여전히 생성됨)
if (process.env.NODE_ENV !== 'production') {
   logger.add(
      new winston.transports.Console({
         format: combine(
            colorize(), // 색깔 넣어서 출력
            simple(), // `${info.level}: ${info.message} JSON.stringify({ ...rest })` 포맷으로 출력
         ),
      }),
   );
}

module.exports = logger;