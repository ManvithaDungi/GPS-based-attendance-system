User [icon: user, color: blue] {
  id string pk
  name string
  email string
  passwordHash string
  role Role
  status UserStatus
  deviceId string
  fcmToken string
  studentCode string
  deletedAt timestamp
  createdAt timestamp
  updatedAt timestamp
}

Premise [icon: map-pin, color: orange] {
  id string pk
  name string
  latitude float
  longitude float
  radiusMeters float
  deletedAt timestamp
  createdAt timestamp
  updatedAt timestamp
}

WorkingHours [icon: clock, color: grey] {
  id string pk
  premiseId string fk
  startTime string
  endTime string
  lateThresholdMins int
  minDurationHours float
  createdAt timestamp
  updatedAt timestamp
}

AttendanceLog [icon: check-square, color: green] {
  id string pk
  studentId string fk
  premiseId string fk
  date date
  checkInTime timestamp
  checkInLat float
  checkInLng float
  checkInDistanceM float
  checkInAccuracyM float
  checkOutTime timestamp
  checkOutLat float
  checkOutLng float
  checkOutDistanceM float
  checkOutAccuracyM float
  durationHours float
  status AttendanceStatus
  punctuality PunctualityStatus
  isAutoClosed boolean
  deletedAt timestamp
  createdAt timestamp
  updatedAt timestamp
}

Session [icon: key, color: purple] {
  id string pk
  userId string fk
  refreshToken string
  deviceId string
  ipAddress string
  expiresAt timestamp
  createdAt timestamp
}

FraudLog [icon: alert-triangle, color: red] {
  id string pk
  studentId string fk
  type string
  riskLevel FraudRiskLevel
  details json
  createdAt timestamp
}

Notification [icon: bell, color: yellow] {
  id string pk
  userId string fk
  type string
  title string
  body string
  read boolean
  createdAt timestamp
}

IdempotencyRecord [icon: shield, color: pink] {
  id string pk
  key string
  userId string fk
  endpoint string
  requestHash string
  responseData json
  createdAt timestamp
}

DailyStats [icon: bar-chart, color: teal] {
  id string pk
  date date
  premiseId string fk
  present int
  absent int
  late int
  createdAt timestamp
  updatedAt timestamp
}

ReportJob [icon: file-text, color: grey] {
  id string pk
  status ReportJobStatus
  format string
  filters json
  fileUrl string
  createdById string fk
  createdAt timestamp
  updatedAt timestamp
}

User.id < AttendanceLog.studentId
User.id < Session.userId
User.id < FraudLog.studentId
User.id < Notification.userId
User.id < IdempotencyRecord.userId
User.id < ReportJob.createdById
Premise.id - WorkingHours.premiseId
Premise.id < DailyStats.premiseId
Premise.id - AttendanceLog.premiseId
