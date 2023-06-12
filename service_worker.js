self.addEventListener('push', function(event) {
  console.log('푸시 알림 수신:', event);

  var message = event.data.text();
  var options = {
      body: '영상 촬영이 시작됐습니다.',
      icon: '/path/to/notification-icon.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      data: {
      }
  };

  event.waitUntil(
      self.registration.showNotification('침입 감지', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('푸시 알림 클릭:', event);
  event.notification.close();
});

self.addEventListener('notificationclose', function(event) {
  console.log('푸시 알림 닫힘:', event);
});